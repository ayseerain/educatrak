<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoDataSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_demo_seeder_creates_only_fictional_workflow_records(): void
    {
        $this->seed();

        $this->assertDatabaseCount('users', 5);
        $this->assertDatabaseCount('students', 3);
        $this->assertDatabaseCount('billing_accounts', 3);
        $this->assertDatabaseCount('installments', 12);
        $this->assertDatabaseHas('users', [
            'username' => 'sample.cashier',
            'full_name' => 'Casey Cashier (sample)',
            'role' => 'cashier',
        ]);
        $this->assertDatabaseHas('students', [
            'lrn' => '000000000001',
            'full_name' => 'Amara Villanueva (sample)',
        ]);
    }
}
