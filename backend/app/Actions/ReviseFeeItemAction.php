<?php

namespace App\Actions;

use App\Models\FeeItem;
use Illuminate\Validation\ValidationException;

class ReviseFeeItemAction
{
    /** @param array{name: string, category: string, amount_cents: int, required: bool} $changes */
    public function handle(FeeItem $feeItem, array $changes): FeeItem
    {
        $current = FeeItem::query()->whereKey($feeItem->id)->lockForUpdate()->firstOrFail();

        if (! $current->active) {
            throw ValidationException::withMessages(['fee_item' => 'Only an active fee item can be revised.']);
        }

        $current->forceFill(['active' => false])->save();

        return FeeItem::query()->create([
            'fee_schedule_id' => $current->fee_schedule_id,
            ...$changes,
            'sort_order' => $current->sort_order,
            'active' => true,
            'version' => $current->version + 1,
            'previous_version_id' => $current->id,
        ]);
    }
}
