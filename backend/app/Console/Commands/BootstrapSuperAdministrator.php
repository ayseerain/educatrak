<?php

namespace App\Console\Commands;

use App\Models\AuditEntry;
use App\Models\User;
use App\UserRole;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BootstrapSuperAdministrator extends Command
{
    protected $signature = 'educatrak:bootstrap-super-admin';

    protected $description = 'Create the one-time protected Super Admin account from a trusted server console';

    public function handle(): int
    {
        if (User::query()->where('role', UserRole::SuperAdmin->value)->exists()) {
            $this->error('A Super Admin account already exists; bootstrap can only run once.');

            return self::FAILURE;
        }

        $fullName = trim((string) $this->ask('Full name'));
        $username = trim((string) $this->ask('Username'));
        $email = trim((string) $this->ask('Email (optional)'));
        $password = (string) $this->secret('Password (minimum 12 characters)');
        $confirmation = (string) $this->secret('Confirm password');

        if ($fullName === '' || ! preg_match('/^[A-Za-z0-9._-]{1,100}$/', $username)) {
            $this->error('A full name and valid username are required.');

            return self::FAILURE;
        }
        if (strlen($password) < 12 || ! hash_equals($password, $confirmation)) {
            $this->error('The password must contain at least 12 characters and match its confirmation.');

            return self::FAILURE;
        }
        if (($email !== '' && ! filter_var($email, FILTER_VALIDATE_EMAIL)) || User::query()->where('username', $username)->exists() || ($email !== '' && User::query()->where('email', $email)->exists())) {
            $this->error('The username or email is already in use.');

            return self::FAILURE;
        }

        DB::transaction(function () use ($fullName, $username, $email, $password): void {
            $user = User::query()->create([
                'username' => $username,
                'full_name' => $fullName,
                'email' => $email !== '' ? $email : null,
                'role' => UserRole::SuperAdmin,
                'active' => true,
                'is_protected' => true,
                'must_change_password' => false,
                'password' => $password,
            ]);

            AuditEntry::query()->forceCreate([
                'user_id' => null,
                'action' => 'user.super_admin_bootstrapped',
                'entity_type' => $user->getMorphClass(),
                'entity_id' => (string) $user->id,
                'before' => null,
                'after' => ['username' => $username, 'role' => UserRole::SuperAdmin->value, 'protected' => true],
                'ip_address' => null,
                'user_agent' => 'trusted-console',
                'occurred_at' => now(),
            ]);
        });

        $this->info('Protected Super Admin account created. The password was not displayed.');

        return self::SUCCESS;
    }
}
