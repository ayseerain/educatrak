<?php

namespace Tests\Feature;

use App\Models\AuditEntry;
use App\Models\User;
use App\UserRole;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SuperAdminBootstrapTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_trusted_console_bootstraps_one_protected_super_admin_without_printing_the_password(): void
    {
        $password = 'fictional-long-password';
        $this->artisan('educatrak:bootstrap-super-admin')
            ->expectsQuestion('Full name', 'Morgan Super Administrator (sample)')
            ->expectsQuestion('Username', 'fictional.root')
            ->expectsQuestion('Email (optional)', 'root@example.test')
            ->expectsQuestion('Password (minimum 12 characters)', $password)
            ->expectsQuestion('Confirm password', $password)
            ->expectsOutput('Protected Super Admin account created. The password was not displayed.')
            ->assertExitCode(0);

        $user = User::query()->where('username', 'fictional.root')->sole();
        $this->assertSame(UserRole::SuperAdmin, $user->role);
        $this->assertTrue($user->is_protected);
        $this->assertFalse($user->must_change_password);
        $this->assertTrue(Hash::check($password, $user->password));
        $this->assertDatabaseHas('audit_entries', [
            'user_id' => null,
            'action' => 'user.super_admin_bootstrapped',
            'entity_id' => (string) $user->id,
        ]);
    }

    public function test_bootstrap_cannot_create_a_second_super_admin(): void
    {
        User::factory()->create(['role' => UserRole::SuperAdmin]);

        $this->artisan('educatrak:bootstrap-super-admin')
            ->expectsOutput('A Super Admin account already exists; bootstrap can only run once.')
            ->assertExitCode(1);

        $this->assertSame(1, User::query()->where('role', UserRole::SuperAdmin->value)->count());
    }
}
