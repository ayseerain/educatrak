<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Installment;
use App\Models\NotificationLog;
use App\Services\AuditLogger;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class ReminderDeliveryController extends Controller
{
    public function send(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $data = $request->validate([
            'idempotency_key' => ['required', 'uuid'],
            'installment_ids' => ['required', 'array', 'min:1', 'max:50'],
            'installment_ids.*' => ['required', 'integer', 'distinct', 'exists:installments,id'],
            'channels' => ['required', 'array', 'min:1'],
            'channels.*' => ['required', 'string', 'in:email,sms'],
        ]);

        $installments = Installment::query()
            ->with(['billingAccount.student:id,student_no,full_name', 'billingAccount.student.guardians'])
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
            if ($student === null) continue;
            $guardians = $student->guardians;
            foreach ($channels as $channel) {
                if ($guardians->isEmpty()) {
                    $log = $this->createLog($installment, null, $channel, $data['idempotency_key'], 'not_sent', 'No guardian contact is on file.');
                    if ($log->wasRecentlyCreated) $createdLogs[] = $log;
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
                        $data['idempotency_key'] . ':' . $guardian->id,
                        $isEligible ? 'queued' : 'not_sent',
                        $isEligible ? null : 'No eligible ' . strtoupper($channel) . ' contact is on file.',
                    );
                    if ($log->wasRecentlyCreated) $createdLogs[] = $log;
                    if ($isEligible && $log->wasRecentlyCreated) {
                        $this->deliver($log, $installment, $channel);
                    }
                    $rows[] = $log->fresh();
                }
            }
        }

        foreach ($createdLogs as $log) {
            $fresh = $log->fresh();
            $auditLogger->record($request, 'reminder.' . $fresh->status, $fresh, null, [
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
        if ($notificationLog->kind !== 'reminder' || $notificationLog->status !== 'failed' || $notificationLog->installment_id === null) {
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
        $notificationLog->forceFill(['status' => 'queued', 'failure_reason' => null])->save();
        $this->deliver($notificationLog, $installment, $notificationLog->channel);
        $auditLogger->record($request, 'reminder.retried', $notificationLog, null, [
            'channel' => $notificationLog->channel,
            'status' => $notificationLog->fresh()->status,
        ]);

        return response()->json(['data' => $this->result($notificationLog->fresh())], 202);
    }

    public function twilioStatus(Request $request, NotificationLog $notificationLog): JsonResponse
    {
        $token = (string) config('services.twilio.auth_token');
        $provided = (string) $request->header('X-Twilio-Signature', '');
        $signed = $request->fullUrl();
        $parameters = $request->all();
        ksort($parameters);
        foreach ($parameters as $key => $value) $signed .= $key . (is_array($value) ? implode('', $value) : (string) $value);
        $expected = base64_encode(hash_hmac('sha1', $signed, $token, true));
        if ($token === '' || $provided === '' || ! hash_equals($expected, $provided)) abort(403);
        if ($notificationLog->channel !== 'sms' || $notificationLog->kind !== 'reminder') abort(404);

        $status = (string) $request->input('MessageStatus', '');
        $sid = (string) $request->input('MessageSid', '');
        if ((string) $request->input('AccountSid', '') !== (string) config('services.twilio.account_sid')) abort(403);
        if ($notificationLog->provider_message_sid !== null && ! hash_equals($notificationLog->provider_message_sid, $sid)) abort(403);
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
        $deliveryKey = hash('sha256', $key . ':' . $installment->id . ':' . $channel);
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

    private function deliver(NotificationLog $log, Installment $installment, string $channel): void
    {
        $message = 'Mendez Christian Academy: A school billing installment is due on ' . $installment->due_date->format('F j, Y') . '. Please contact the school office for details.';
        try {
            if ($channel === 'email') {
                Mail::raw($message, function ($mail) use ($log): void {
                    $mail->to((string) $log->guardian_email)->subject('Mendez Christian Academy billing reminder');
                });
            } else {
                $this->sendTwilioSms($log, (string) $log->guardian_mobile, $message);
            }
            // Provider acceptance is queued, not proof of delivery. A delivery callback may update status later.
            $current = $log->fresh();
            $current->forceFill([
                'failure_reason' => $current->status === 'queued' ? null : $current->failure_reason,
                'attempts' => $current->attempts + 1,
            ])->save();
        } catch (ConnectionException $exception) {
            report($exception);
            // A timeout can happen after provider acceptance. Keep this pending and non-retriable
            // until a provider callback or manual reconciliation resolves the delivery state.
            $current = $log->fresh();
            $current->forceFill([
                'status' => 'queued',
                'failure_reason' => 'Provider response is unconfirmed. Reconcile the provider status before retrying.',
                'attempts' => $current->attempts + 1,
            ])->save();
        } catch (\Throwable $exception) {
            report($exception);
            $log->forceFill([
                'status' => 'failed',
                'failure_reason' => $channel === 'sms' && ! config('services.twilio.account_sid')
                    ? 'Twilio is not configured on this server.'
                    : 'The ' . strtoupper($channel) . ' provider rejected or could not accept this reminder.',
                'attempts' => $log->attempts + 1,
            ])->save();
        }
    }

    private function sendTwilioSms(NotificationLog $log, string $recipient, string $message): void
    {
        $accountSid = (string) config('services.twilio.account_sid');
        $authToken = (string) config('services.twilio.auth_token');
        $messageServiceSid = (string) config('services.twilio.messaging_service_sid');
        $from = (string) config('services.twilio.from');
        if ($accountSid === '' || $authToken === '' || ($messageServiceSid === '' && $from === '')) {
            throw new \RuntimeException('Twilio is not configured.');
        }
        $payload = ['To' => $recipient, 'Body' => $message];
        if ($messageServiceSid !== '') $payload['MessagingServiceSid'] = $messageServiceSid;
        else $payload['From'] = $from;

        $callback = rtrim((string) config('app.url'), '/') . '/api/webhooks/twilio/messages/' . $log->id;
        $response = Http::asForm()->withBasicAuth($accountSid, $authToken)->timeout(12)
            ->post('https://api.twilio.com/2010-04-01/Accounts/' . rawurlencode($accountSid) . '/Messages.json', [...$payload, 'StatusCallback' => $callback]);
        if (! $response->successful()) throw new \RuntimeException('Twilio rejected the message.');
        $log->forceFill(['provider_message_sid' => $response->json('sid')])->save();
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
