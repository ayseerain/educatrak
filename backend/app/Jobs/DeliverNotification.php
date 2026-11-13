<?php

namespace App\Jobs;

use App\Models\NotificationLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

class DeliverNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(public int $notificationLogId) {}

    public function handle(): void
    {
        $log = NotificationLog::query()
            ->with(['installment.billingAccount.student', 'payment.billingAccount', 'payment.receipt'])
            ->find($this->notificationLogId);

        if ($log === null || $log->status !== 'queued') {
            return;
        }

        if ($log->kind === 'reminder' && ! $this->remindersEnabled()) {
            $this->markFailed($log, 'Reminder delivery is disabled.');

            return;
        }

        $message = $this->message($log);
        if ($message === null) {
            $this->markFailed($log, 'The notification no longer has the records required for delivery.');

            return;
        }

        try {
            if ($log->channel === 'email') {
                Mail::raw($message, function ($mail) use ($log): void {
                    $mail->to((string) $log->guardian_email)->subject($this->subject($log));
                });
            } elseif ($log->channel === 'sms') {
                $this->sendTwilioSms($log, (string) $log->guardian_mobile, $message);
            } else {
                $this->markFailed($log, 'The notification channel is not supported.');

                return;
            }

            $current = $log->fresh();
            if ($current === null) {
                return;
            }

            $current->forceFill([
                'failure_reason' => $current->status === 'queued' ? null : $current->failure_reason,
                'attempts' => $current->attempts + 1,
            ])->save();
        } catch (ConnectionException $exception) {
            report($exception);
            $current = $log->fresh();
            if ($current === null) {
                return;
            }

            $current->forceFill([
                'status' => 'queued',
                'failure_reason' => 'Provider response is unconfirmed. Reconcile the provider status before retrying.',
                'attempts' => $current->attempts + 1,
            ])->save();
        } catch (\Throwable $exception) {
            report($exception);
            $this->markFailed(
                $log,
                $log->channel === 'sms' && ! config('services.twilio.account_sid')
                    ? 'Twilio is not configured on this server.'
                    : 'The '.strtoupper($log->channel).' provider rejected or could not accept this notification.',
            );
        }
    }

    private function remindersEnabled(): bool
    {
        return config('services.reminders.enabled') === true || config('services.reminders.enabled') === 'true';
    }

    private function message(NotificationLog $log): ?string
    {
        if ($log->kind === 'reminder') {
            $installment = $log->installment;
            if ($installment === null) {
                return null;
            }

            return 'Mendez Christian Academy: A school billing installment is due on '.$installment->due_date->format('F j, Y').'. Please contact the school office for details.';
        }

        if ($log->kind === 'payment_confirmation') {
            $payment = $log->payment;
            if ($payment === null || $payment->receipt === null || $payment->billingAccount === null) {
                return null;
            }

            return sprintf(
                'Mendez Christian Academy payment confirmation: amount ₱%s, remaining balance ₱%s, receipt %s, payment date %s.',
                number_format($payment->amount_cents / 100, 2),
                number_format($payment->balance_after_cents / 100, 2),
                $payment->receipt->receipt_no,
                $payment->paid_on->format('F j, Y'),
            );
        }

        return null;
    }

    private function subject(NotificationLog $log): string
    {
        return $log->kind === 'payment_confirmation'
            ? 'Mendez Christian Academy payment confirmation'
            : 'Mendez Christian Academy billing reminder';
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
        if ($messageServiceSid !== '') {
            $payload['MessagingServiceSid'] = $messageServiceSid;
        } else {
            $payload['From'] = $from;
        }

        $callback = rtrim((string) config('app.url'), '/').'/api/webhooks/twilio/messages/'.$log->id;
        $response = Http::asForm()
            ->withBasicAuth($accountSid, $authToken)
            ->timeout(12)
            ->post('https://api.twilio.com/2010-04-01/Accounts/'.rawurlencode($accountSid).'/Messages.json', [...$payload, 'StatusCallback' => $callback]);

        if (! $response->successful()) {
            throw new \RuntimeException('Twilio rejected the message.');
        }

        $log->forceFill(['provider_message_sid' => $response->json('sid')])->save();
    }

    private function markFailed(NotificationLog $log, string $reason): void
    {
        $current = $log->fresh();
        if ($current === null) {
            return;
        }

        $current->forceFill([
            'status' => 'failed',
            'failure_reason' => $reason,
            'attempts' => $current->attempts + 1,
        ])->save();
    }
}
