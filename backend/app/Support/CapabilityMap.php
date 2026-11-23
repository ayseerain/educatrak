<?php

namespace App\Support;

use App\UserRole;

class CapabilityMap
{
    /** @var array<string, list<string>> */
    private const ByRole = [
        // Governance only: no student, billing, payment, or finance capabilities.
        'super_admin' => ['dashboard.view', 'users.manage', 'security.events.view', 'audit.view'],
        'admin' => ['dashboard.view', 'users.manage', 'settings.system.view', 'settings.system.manage', 'security.events.view', 'backup.manage'],
        'cashier' => ['dashboard.view', 'students.view', 'students.financial.view', 'guardianContact.view', 'accounts.view', 'accounts.manage', 'payments.record', 'payments.view', 'receipts.reprint', 'void.request', 'void.view', 'notification.view', 'notification.retry', 'followup.view', 'followup.manage', 'closeout.submit', 'closeout.view'],
        'accounting' => ['dashboard.view', 'settings.finance.view', 'settings.finance.manage', 'settings.system.view', 'guardianContact.view', 'notification.view', 'students.view', 'students.financial.view', 'accounts.view', 'payments.view', 'receipts.reprint', 'void.view', 'void.approve', 'followup.view', 'followup.manage', 'closeout.signoff', 'closeout.view', 'reports.view'],
        'auditor' => ['dashboard.view', 'audit.view'],
        'registrar' => ['dashboard.view', 'students.view', 'students.manage', 'students.financial.view', 'guardianContact.view', 'guardians.manage'],
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
