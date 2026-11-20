<?php

namespace Tests\Feature;

use Illuminate\Database\Connection;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Engine-level proof for the row locks and unique keys that the financial actions rely on
 * (RecordPaymentAction, DecideVoidRequestAction, ApplyBillingAdjustmentAction, CreateBillingAccountAction).
 * SQLite cannot prove InnoDB row locking, so this test runs only against MySQL.
 *
 * It uses two real connections and commits its own fictional fixture, so it does not use RefreshDatabase.
 */
class MySqlRowLockTest extends TestCase
{
    private Connection $holder;

    private Connection $contender;

    protected function setUp(): void
    {
        parent::setUp();

        if (DB::getDriverName() !== 'mysql') {
            $this->markTestSkipped('Row-lock proof needs MySQL/InnoDB.');
        }

        Artisan::call('migrate', ['--force' => true]);

        $config = config('database.connections.mysql');
        config(['database.connections.lock_holder' => $config, 'database.connections.lock_contender' => $config]);
        $this->holder = DB::connection('lock_holder');
        $this->contender = DB::connection('lock_contender');
        $this->contender->statement('SET SESSION innodb_lock_wait_timeout = 1');
    }

    protected function tearDown(): void
    {
        if (isset($this->holder)) {
            $this->holder->rollBack(0);
            $this->contender->table('payment_idempotency_keys')->where('key', 'like', 'lock-test-%')->delete();
            $this->contender->table('billing_accounts')->where('id', 990_001)->delete();
            $this->contender->table('students')->where('id', 990_001)->delete();
            $this->contender->table('school_years')->where('id', 990_001)->delete();
            $this->contender->table('users')->where('id', 990_001)->delete();
            DB::purge('lock_holder');
            DB::purge('lock_contender');
        }

        parent::tearDown();
    }

    public function test_locked_receipt_sequence_and_billing_account_block_a_second_transaction(): void
    {
        $this->seedCommittedAccount();

        $this->holder->beginTransaction();
        $this->assertNotNull($this->holder->table('receipt_sequences')->where('id', 1)->lockForUpdate()->first());
        $this->assertNotNull($this->holder->table('billing_accounts')->where('id', 990_001)->lockForUpdate()->first());

        $this->assertLockWaitTimeout(fn () => $this->contender->table('receipt_sequences')->where('id', 1)->lockForUpdate()->first());
        $this->assertLockWaitTimeout(fn () => $this->contender->table('billing_accounts')->where('id', 990_001)->update(['balance_cents' => 1]));

        $this->holder->rollBack();

        $this->contender->transaction(function (): void {
            $this->assertNotNull($this->contender->table('billing_accounts')->where('id', 990_001)->lockForUpdate()->first());
        });
        $this->assertSame(200_000, (int) $this->contender->table('billing_accounts')->where('id', 990_001)->value('balance_cents'));
    }

    public function test_duplicate_payment_idempotency_key_is_rejected_by_the_unique_index(): void
    {
        $this->seedCommittedAccount();
        $row = ['user_id' => 990_001, 'key' => 'lock-test-key', 'request_hash' => str_repeat('a', 64), 'created_at' => now(), 'updated_at' => now()];
        $this->contender->table('payment_idempotency_keys')->insert($row);

        try {
            $this->contender->table('payment_idempotency_keys')->insert($row);
            $this->fail('A duplicate (user_id, key) must be rejected.');
        } catch (QueryException $exception) {
            $this->assertSame('23000', $exception->getCode());
        }

        $this->assertSame(1, $this->contender->table('payment_idempotency_keys')->where('key', 'lock-test-key')->count());
    }

    private function assertLockWaitTimeout(callable $statement): void
    {
        try {
            $statement();
            $this->fail('The second transaction must wait for the held row lock.');
        } catch (QueryException $exception) {
            $this->assertSame(1205, $exception->errorInfo[1] ?? null, $exception->getMessage());
        }
    }

    private function seedCommittedAccount(): void
    {
        $now = now();
        $this->contender->table('users')->insert(['id' => 990_001, 'username' => 'lock.cashier.sample', 'full_name' => 'Lock Cashier (sample)', 'role' => 'cashier', 'password' => 'not-a-real-hash', 'created_at' => $now, 'updated_at' => $now]);
        $this->contender->table('school_years')->insert(['id' => 990_001, 'label' => 'SY lock test (sample)', 'is_current' => false, 'starts_on' => '2026-06-01', 'ends_on' => '2027-05-31', 'created_at' => $now, 'updated_at' => $now]);
        $this->contender->table('students')->insert(['id' => 990_001, 'lrn' => '000000990001', 'full_name' => 'Lock Student (sample)', 'status' => 'enrolled', 'created_at' => $now, 'updated_at' => $now]);
        $this->contender->table('billing_accounts')->insert(['id' => 990_001, 'student_id' => 990_001, 'school_year_id' => 990_001, 'status' => 'current', 'total_due_cents' => 200_000, 'balance_cents' => 200_000, 'created_by' => 990_001, 'created_at' => $now, 'updated_at' => $now]);
    }
}
