<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePaymentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'billing_account_id' => ['required', 'integer', Rule::exists('billing_accounts', 'id')],
            'amount_cents' => ['required', 'integer', 'min:1'],
            'paid_on' => ['required', 'date', 'before_or_equal:today'],
            'backdate_reason' => ['nullable', 'string', 'min:10', 'max:1000', 'required_unless:paid_on,'.today('Asia/Manila')->toDateString()],
            'duplicate_override_reason' => ['nullable', 'string', 'min:10', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'notification_channels' => ['nullable', 'array', 'min:1'],
            'notification_channels.*' => ['string', 'distinct', Rule::in(['email', 'sms'])],
        ];
    }
}
