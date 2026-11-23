<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Services\AuditLogger;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Administrator-managed school, receipt and email settings (M9.5, M9.6) stored as system_settings keys.
 * Values are configuration only: they are not wired into mail transport, and the next receipt number is read-only.
 */
class SystemSettingsController extends Controller
{
    /** @var array<string, string> request field => system_settings key */
    private const Keys = [
        'school_name' => 'school.name',
        'school_address' => 'school.address',
        'receipt_title' => 'receipt.title',
        'paper_size' => 'receipt.paper_size',
        'email_sender_name' => 'email.sender_name',
        'email_sender_address' => 'email.sender_address',
        'email_daily_send_limit' => 'email.daily_send_limit',
    ];

    public function show(): JsonResponse
    {
        return response()->json(['data' => $this->settingsData()]);
    }

    public function update(Request $request, AuditLogger $auditLogger): JsonResponse
    {
        $validated = $request->validate([
            'school_name' => ['sometimes', 'nullable', 'string', 'max:160'],
            'school_address' => ['sometimes', 'nullable', 'string', 'max:500'],
            'receipt_title' => ['sometimes', 'required', 'string', 'in:Acknowledgment Receipt'],
            'paper_size' => ['sometimes', 'required', 'string', 'in:Letter,A4'],
            'email_sender_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'email_sender_address' => ['sometimes', 'nullable', 'email', 'max:255'],
            'email_daily_send_limit' => ['sometimes', 'required', 'integer', 'min:0'],
            'next_receipt_number' => ['prohibited'],
            'next_receipt_sequence' => ['prohibited'],
        ]);

        DB::transaction(function () use ($request, $auditLogger, $validated): void {
            $current = SystemSetting::query()
                ->whereIn('key', array_values(self::Keys))
                ->lockForUpdate()
                ->get()
                ->keyBy('key');
            $before = [];
            $after = [];

            foreach (self::Keys as $field => $key) {
                if (! array_key_exists($field, $validated)) {
                    continue;
                }
                $value = is_string($validated[$field]) ? trim($validated[$field]) : $validated[$field];
                $previous = $current->get($key)?->value;
                if ($previous === $value) {
                    continue;
                }

                SystemSetting::query()->updateOrCreate(['key' => $key], ['value' => $value, 'updated_by' => $request->user()->id]);
                $before[$key] = $previous;
                $after[$key] = $value;
            }

            if ($after !== []) {
                $auditLogger->record($request, 'system_settings.updated', null, $before, $after);
            }
        });

        return response()->json(['data' => $this->settingsData()]);
    }

    /** @return array<string, mixed> */
    private function settingsData(): array
    {
        $values = SystemSetting::query()->whereIn('key', array_values(self::Keys))->pluck('value', 'key');
        $lastSequence = DB::table('receipt_sequences')->where('id', 1)->value('last_sequence');
        $nextSequence = $lastSequence === null ? null : (int) $lastSequence + 1;

        return [
            'schoolName' => $values->get('school.name'),
            'schoolAddress' => $values->get('school.address'),
            'receiptTitle' => $values->get('receipt.title', 'Acknowledgment Receipt'),
            'paperSize' => $values->get('receipt.paper_size'),
            'emailSenderName' => $values->get('email.sender_name'),
            'emailSenderAddress' => $values->get('email.sender_address'),
            'emailDailySendLimit' => $values->get('email.daily_send_limit'),
            'nextReceiptSequence' => $nextSequence,
            'nextReceiptNumber' => $nextSequence === null
                ? null
                : sprintf('OR-%d-%06d', CarbonImmutable::now('Asia/Manila')->year, $nextSequence),
        ];
    }
}
