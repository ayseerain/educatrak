<?php

namespace Tests\Unit;

use App\Support\CapabilityMap;
use App\UserRole;
use App\Http\Middleware\EnsureCapability;
use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\EnsurePasswordChanged;
use Illuminate\Auth\Middleware\Authenticate;
use PHPUnit\Framework\Attributes\DataProvider;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class CapabilityMapTest extends TestCase
{
    public function test_every_operational_api_route_has_auth_password_and_capability_middleware(): void
    {
        $operationalRoutes = collect(Route::getRoutes())
            // Twilio's unauthenticated status callback is authenticated with its request signature instead.
            ->filter(fn ($route): bool => str_starts_with($route->uri(), 'api/')
                && ! str_starts_with($route->uri(), 'api/auth/')
                && ! str_starts_with($route->uri(), 'api/webhooks/twilio/'));

        $this->assertGreaterThan(0, $operationalRoutes->count());

        foreach ($operationalRoutes as $route) {
            $middleware = app('router')->gatherRouteMiddleware($route);
            $label = implode(' ', $route->methods()) . ' /' . $route->uri();

            $this->assertContains(Authenticate::class . ':sanctum', $middleware, $label . ' must require an authenticated session');
            $this->assertContains(EnsurePasswordChanged::class, $middleware, $label . ' must enforce first-login password change');
            $this->assertContains(EnsureActiveUser::class, $middleware, $label . ' must revalidate active account status');
            $this->assertTrue(
                collect($middleware)->contains(fn (string $item): bool => str_starts_with($item, EnsureCapability::class . ':')),
                $label . ' must enforce a role capability',
            );
        }
    }

    #[DataProvider('settingsAccessCases')]
    public function test_settings_read_and_manage_capabilities_follow_the_approved_role_matrix(
        UserRole $role,
        string $capability,
        bool $allowed,
    ): void {
        $this->assertSame($allowed, CapabilityMap::allows($role, $capability));
    }

    public static function settingsAccessCases(): array
    {
        return [
            'super admin has user administration and audit oversight' => [UserRole::SuperAdmin, 'users.manage', true],
            'super admin can read security events' => [UserRole::SuperAdmin, 'security.events.view', true],
            'super admin has no payment recording permission' => [UserRole::SuperAdmin, 'payments.record', false],
            'super admin has no finance settings permission' => [UserRole::SuperAdmin, 'settings.finance.manage', false],
            'accounting manages finance settings' => [UserRole::Accounting, 'settings.finance.manage', true],
            'accounting reads system settings' => [UserRole::Accounting, 'settings.system.view', true],
            'accounting cannot manage system settings' => [UserRole::Accounting, 'settings.system.manage', false],
            'administrator cannot read finance settings' => [UserRole::Admin, 'settings.finance.view', false],
            'administrator cannot manage finance settings' => [UserRole::Admin, 'settings.finance.manage', false],
            'administrator manages system settings' => [UserRole::Admin, 'settings.system.manage', true],
            'auditor cannot read finance settings separately from audit review' => [UserRole::Auditor, 'settings.finance.view', false],
            'auditor cannot read system settings separately from audit review' => [UserRole::Auditor, 'settings.system.view', false],
            'auditor cannot manage finance settings' => [UserRole::Auditor, 'settings.finance.manage', false],
            'auditor cannot manage system settings' => [UserRole::Auditor, 'settings.system.manage', false],
            'auditor has no standalone report capability' => [UserRole::Auditor, 'reports.view', false],
            'cashier cannot read settings' => [UserRole::Cashier, 'settings.finance.view', false],
            'registrar cannot read settings' => [UserRole::Registrar, 'settings.system.view', false],
            'administrator cannot view guardian contact' => [UserRole::Admin, 'guardianContact.view', false],
            'cashier views guardian contact' => [UserRole::Cashier, 'guardianContact.view', true],
            'accounting views guardian contact' => [UserRole::Accounting, 'guardianContact.view', true],
            'auditor cannot view guardian contacts' => [UserRole::Auditor, 'guardianContact.view', false],
            'registrar cannot view guardian contact' => [UserRole::Registrar, 'guardianContact.view', false],
        ];
    }

    #[DataProvider('approvedOperationalReadCases')]
    public function test_operational_read_capabilities_follow_approved_role_ownership(
        UserRole $role,
        string $capability,
        bool $allowed,
    ): void {
        $this->assertSame($allowed, CapabilityMap::allows($role, $capability));
    }

    public static function approvedOperationalReadCases(): array
    {
        return [
            'administrator cannot review financial void history' => [UserRole::Admin, 'void.view', false],
            'administrator cannot view close-out history' => [UserRole::Admin, 'closeout.view', false],
            'accounting can reprint receipts' => [UserRole::Accounting, 'receipts.reprint', true],
            'accounting cannot open the auditor workspace' => [UserRole::Accounting, 'audit.view', false],
            'auditor can open the auditor workspace' => [UserRole::Auditor, 'audit.view', true],
            'auditor cannot open a separate void-history page' => [UserRole::Auditor, 'void.view', false],
            'auditor cannot open a separate close-out-history page' => [UserRole::Auditor, 'closeout.view', false],
            'cashier can view close-out history' => [UserRole::Cashier, 'closeout.view', true],
            'registrar cannot view close-out history' => [UserRole::Registrar, 'closeout.view', false],
            'administrator cannot view clearance' => [UserRole::Admin, 'clearance.view', false],
            'cashier cannot open clearance lookup' => [UserRole::Cashier, 'clearance.view', false],
            'cashier cannot print permits' => [UserRole::Cashier, 'permits.print', false],
            'accounting cannot open clearance lookup' => [UserRole::Accounting, 'clearance.view', false],
            'auditor cannot open clearance lookup' => [UserRole::Auditor, 'clearance.view', false],
            'registrar can view clearance and print permits' => [UserRole::Registrar, 'clearance.view', true],
            'administrator cannot print permits' => [UserRole::Admin, 'permits.print', false],
            'accounting cannot print permits' => [UserRole::Accounting, 'permits.print', false],
            'auditor cannot print permits' => [UserRole::Auditor, 'permits.print', false],
        ];
    }

    #[DataProvider('clearanceLookupCases')]
    public function test_registrar_clearance_search_is_separate_from_student_profile_access(
        UserRole $role,
        string $capability,
        bool $allowed,
    ): void {
        $this->assertSame($allowed, CapabilityMap::allows($role, $capability));
    }

    public static function clearanceLookupCases(): array
    {
        return [
            'registrar can search limited clearance identity' => [UserRole::Registrar, 'clearance.lookup', true],
            'registrar has no general student-profile access' => [UserRole::Registrar, 'students.view', false],
            'cashier cannot use registrar-only clearance search' => [UserRole::Cashier, 'clearance.lookup', false],
        ];
    }

    #[DataProvider('reminderBatchAccessCases')]
    public function test_reminder_batch_capability_follows_the_documented_role_matrix(
        UserRole $role,
        bool $allowed,
    ): void {
        $this->assertSame($allowed, CapabilityMap::allows($role, 'followup.manage'));
    }

    public static function reminderBatchAccessCases(): array
    {
        return [
            'super admin cannot send reminder batches' => [UserRole::SuperAdmin, false],
            'cashier can send reminder batches' => [UserRole::Cashier, true],
            'accounting can send reminder batches' => [UserRole::Accounting, true],
            'administrator cannot send reminder batches' => [UserRole::Admin, false],
            'auditor cannot send reminder batches' => [UserRole::Auditor, false],
            'registrar cannot send reminder batches' => [UserRole::Registrar, false],
        ];
    }

    #[DataProvider('notificationRetryAccessCases')]
    public function test_notification_retry_capability_follows_the_documented_role_matrix(
        UserRole $role,
        bool $allowed,
    ): void {
        $this->assertSame($allowed, CapabilityMap::allows($role, 'notification.retry'));
    }

    public static function notificationRetryAccessCases(): array
    {
        return [
            'super admin cannot retry failed notifications' => [UserRole::SuperAdmin, false],
            'administrator does not retry cashier notifications' => [UserRole::Admin, false],
            'cashier can retry failed notifications' => [UserRole::Cashier, true],
            'accounting cannot retry failed notifications' => [UserRole::Accounting, false],
            'auditor cannot retry failed notifications' => [UserRole::Auditor, false],
            'registrar cannot retry failed notifications' => [UserRole::Registrar, false],
        ];
    }

    #[DataProvider('ledgerImportAccessCases')]
    public function test_ledger_import_capability_follows_the_documented_role_matrix(
        UserRole $role,
        bool $allowed,
    ): void {
        $this->assertSame($allowed, CapabilityMap::allows($role, 'import.run'));
    }

    public static function ledgerImportAccessCases(): array
    {
        return [
            'administrator cannot run cashier ledger import' => [UserRole::Admin, false],
            'cashier cannot run ledger import' => [UserRole::Cashier, false],
            'accounting cannot run ledger import' => [UserRole::Accounting, false],
            'auditor cannot run ledger import' => [UserRole::Auditor, false],
            'registrar cannot run ledger import' => [UserRole::Registrar, false],
        ];
    }
}
