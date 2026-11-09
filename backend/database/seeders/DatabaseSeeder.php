<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // This repository is still in its mock-integration phase. Every record
        // seeded here is fictional and exists only to exercise the workflows.
        $this->call(DemoDataSeeder::class);
    }
}
