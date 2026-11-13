<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\DeliverNotification;
use App\Models\Installment;
use App\Models\NotificationLog;
use App\Services\AuditLogger;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReminderDeliveryController extends Controller
{
    public function send(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        abort_unless(
            config('services.reminders.enabled') === true || config('services.reminders.enabled') === 'true',
            503,
            'Reminder delivery is unavailable until its provider and delivery policies are approved.',
        );

        $data = $request->validate([
            'idempotency_key' => ['required', 'uuid'],
            'installment_ids' => ['required', 'array', 'min:1', 'max:50'],
            'installment_ids.*' => ['required', 'integer', 'distinct', 'exists:installments,id'],
            'channels' => ['required', 'array', 'min:1'],
            'channels.*' => ['required', 'string', 'in:email,sms'],
        ]);

        $installments = Installment::query()
            ->with(['billingAccount.student:id,lrn,full_name', 'billingAccount.student.guardians'])
            ->whereIn('id', $data['installment_ids'])
            ->whereColumn('paid_cents', '<', 'amount_cents')
            ->where(function ($query): void {
                $today = CarbonImmutable::now('Asia/Manila')->toDateString();
                $query->where('status', 'due_soon')->orWhereDate('due_date', '<', $today);
            })
            ->get()->keyBy('id');
        if ($installments->count() !== count($data['installment_ids'])) {
            throw ValidationException::withMessages(['installment_ids' => 'One or more selected installments are no longer eligible for reminders. Refresh the list and try again.']);
        }

        $channels = array_values(array_unique($data['channels']));
        $rows = [];
        $createdLogs = [];
        foreach ($installments as $installment) {
            $student = $installment->billingAccount?->student;
            if ($student === null) {
                continue;
            }
            $guardians = $student->guardians;
            foreach ($channels as $channel) {
                if ($guardians->isEmpty()) {
                    $log = $this->createLog($installment, null, $channel, $data['idempotency_key'], 'not_sent', 'No guardian contact is on file.');
                    if ($log->wasRecentlyCreated) {
                        $createdLogs[] = $log;
                    }
                    $rows[] = $log->fresh();

                    continue;
                }
                foreach ($guardians as $guardian) {
                    $recipient = $channel === 'email' ? $guardian->email : $guardian->mobile;
                    $isEligible = is_string($recipient) && trim($recipient) !== ''
                        && ($channel !== 'email' || in_array($guardian->email_status, ['verified', 'ok'], true));
                    $log = $this->createLog(
                        $installment,
                        $isEligible ? trim($recipient) : null,
                        $channel,
                        $data['idempotency_key'].':'.$guardian->id,
                        $isEligible ? 'queued' : 'not_sent',
                        $isEligible ? null : 'No eligible '.strtoupper($channel).' contact is on file.',
                    );
                    if ($log->wasRecentlyCreated) {
                        $createdLogs[] = $log;
                    }
                    if ($isEligible && $log->wasRecentlyCreated) {
                        DeliverNotification::dispatch($log->id)->afterCommit();
                    }
                    $rows[] = $log->fresh();
                }
            }
        }

        foreach ($createdLogs as $log) {
            $fresh = $log->fresh();
            $auditLogger->record($request, 'reminder.'.$fresh->status, $fresh, null, [
                'installment_id' => $fresh->installment_id === null ? null : (string) $fresh->installment_id,
                'channel' => $fresh->channel,
                'status' => $fresh->status,
            ]);
        }

        return response()->json([
            'data' => array_map(fn (NotificationLog $log): array => $this->result($log), $rows),
            'summary' => [
                'queued' => collect($rows)->where('status', 'queued')->count(),
                'failed' => collect($rows)->where('status', 'failed')->count(),
                'notSent' => collect($rows)->where('status', 'not_sent')->count(),
            ],
        ], 202);
    }

    public function retry(Request $request, NotificationLog $notificationLog, AuditLogger $auditLogger): JsonResponse
    {
        return DB::transaction(function () use ($request, $notificationLog, $auditLogger): JsonResponse {
            $notificationLog = NotificationLog::query()->lockForUpdate()->findOrFail($notificationLog->id);

            if ($notificationLog->kind === 'reminder') {
                abort_unless(
                    config('services.reminders.enabled') === true || config('services.reminders.enabled') === 'true',
                    503,
                    'Reminder retry is unavailable until its provider and delivery policies are approved.',
                );

                if ($notificationLog->status !== 'failed' || $notificationLog->installment_id === null) {
                    throw ValidationException::withMessages(['notification' => 'Only failed reminder attempts can be retried.']);
                }
                $notificationLog->load('installment.billingAccount.student');
                $installment = $notificationLog->installment;
                $student = $installment?->billingAccount?->student;
                $today = CarbonImmutable::now('Asia/Manila')->toDateString();
                if ($installment === null || $student === null || (int) $installment->amount_cents <= (int) $installment->paid_cents
                    || ($installment->status !== 'due_soon' && $installment->due_date->toDateString() >= $today)) {
                    throw ValidationException::withMessages(['notification' => 'This installment is no longer eligible for a reminder.']);
                }

                $action = 'reminder.retried';
            } elseif ($notificationLog->kind === 'payment_confirmation' && $notificationLog->channel === 'email'
                && $notificationLog->status === 'failed' && $notificationLog->payment_id !== null) {
                $action = 'notification.retried';
            } else {
                throw ValidationException::withMessages(['notification' => 'Only failed email confirmation or reminder attempts can be retried.']);
            }

            $notificationLog->forceFill(['status' => 'queued', 'failure_reason' => null])->save();
            DeliverNotification::dispatch($notificationLog->id)->afterCommit();
            $auditLogger->record($request, $action, $notificationLog, null, [
                'channel' => $notificationLog->channel,
                'status' => $notificationLog->fresh()->status,
            ]);

            return response()->json(['data' => $this->result($notificationLog->fresh())], 202);
        });
    }

    public function twilioStatus(Request $request, NotificationLog $notificationLog): JsonResponse
    {
        $token = (string) config('services.twilio.auth_token');
        $provided = (string) $request->header('X-Twilio-Signature', '');
        $signed = $request->fullUrl();
        $parameters = $request->all();
        ksort($parameters);
        foreach ($parameters as $key => $value) {
            $signed .= $key.(is_array($value) ? implode('', $value) : (string) $value);
        }
        $expected = base64_encode(hash_hmac('sha1', $signed, $token, true));
        if ($token === '' || $provided === '' || ! hash_equals($expected, $provided)) {
            abort(403);
        }
        if ($notificationLog->channel !== 'sms' || $notificationLog->kind !== 'reminder') {
            abort(404);
        }

        $status = (string) $request->input('MessageStatus', '');
        $sid = (string) $request->input('MessageSid', '');
        if ((string) $request->input('AccountSid', '') !== (string) config('services.twilio.account_sid')) {
            abort(403);
        }
        if ($notificationLog->provider_message_sid !== null && ! hash_equals($notificationLog->provider_message_sid, $sid)) {
            abort(403);
        }
        $notificationLog->forceFill([
            'provider_message_sid' => $sid !== '' ? $sid : $notificationLog->provider_message_sid,
            'status' => $status === 'delivered' ? 'sent' : (in_array($status, ['failed', 'undelivered'], true) ? 'failed' : 'queued'),
            'failure_reason' => in_array($status, ['failed', 'undelivered'], true) ? 'Twilio reported message delivery failure.' : null,
            'sent_at' => $status === 'delivered' ? now() : $notificationLog->sent_at,
        ])->save();

        return response()->json(['ok' => true]);
    }

    private function createLog(Installment $installment, ?string $recipient, string $channel, string $key, string $status, ?string $reason): NotificationLog
    {
        $deliveryKey = hash('sha256', $key.':'.$installment->id.':'.$channel);
        $log = NotificationLog::query()->firstOrCreate(['delivery_key' => $deliveryKey], [
            'student_id' => $installment->billingAccount?->student_id,
            'installment_id' => $installment->id,
            'guardian_email' => $channel === 'email' ? $recipient : null,
            'guardian_mobile' => $channel === 'sms' ? $recipient : null,
            'channel' => $channel,
            'load_fee_cents' => $channel === 'sms' && config('services.sms.load_fee_cents') !== null && config('services.sms.load_fee_cents') !== '' ? (int) config('services.sms.load_fee_cents') : null,
            'kind' => 'reminder',
            'status' => $status,
            'failure_reason' => $reason,
        ]);

        return $log;
    }

    /** @return array<string, mixed> */
    private function result(NotificationLog $log): array
    {
        return [
            'id' => (string) $log->id,
            'installmentId' => (string) $log->installment_id,
            'channel' => $log->channel,
            'recipient' => $log->guardian_email ?? $log->guardian_mobile,
            'status' => $log->status,
            'failureReason' => $log->failure_reason,
        ];
    }
}
