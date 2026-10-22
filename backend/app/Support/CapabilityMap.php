<?php

namespace App\Support;

use App\UserRole;

class CapabilityMap
{
    /** @var array<string, list<string>> */
    private const ByRole = [
        'admin' => ['users.manage', 'settings.system', 'security.events.view', 'backups.manage', 'payments.view', 'void.view', 'closeout.view'],
        'cashier' => ['students.manage', 'accounts.manage', 'payments.record', 'payments.view', 'receipts.reprint', 'void.request', 'void.view', 'followup.manage', 'closeout.submit', 'closeout.view'],
        'accounting' => ['financial-policies.manage', 'transactions.view', 'payments.view', 'receipts.reprint', 'void.view', 'void.approve', 'closeout.signoff', 'closeout.view', 'reports.view'],
        'auditor' => ['audit.review', 'payments.view', 'void.view', 'closeout.view'],
        'registrar' => ['clearance.view', 'permits.print'],
    ];

    public static function allows(UserRole $role, string $capability): bool
    {
        return in_array($capability, self::ByRole[$role->value], true);
    }

    /** @return list<string> */
    public static function for(UserRole $role): array
    {
        return self::ByRole[$role->value];
    }
}
