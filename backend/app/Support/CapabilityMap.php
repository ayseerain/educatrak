<?php

namespace App\Support;

use App\UserRole;

class CapabilityMap
{
    /** @var array<string, list<string>> */
    private const ByRole = [
        'admin' => ['users.manage', 'students.view', 'settings.view', 'audit.view', 'backups.manage'],
        'cashier' => ['students.view', 'accounts.view', 'payments.record', 'payments.view', 'void.request', 'followup.manage'],
        'accounting' => ['students.view', 'accounts.manage', 'payments.view', 'void.approve', 'reports.view', 'settings.manage', 'closeout.signoff'],
        'auditor' => ['students.view', 'accounts.view', 'payments.view', 'void.view', 'reports.view', 'settings.view', 'audit.view'],
        'registrar' => ['students.manage', 'clearance.view', 'permits.print'],
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
