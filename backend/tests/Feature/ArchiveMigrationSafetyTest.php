<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use LogicException;
use Tests\TestCase;

class ArchiveMigrationSafetyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('school_years', function (Blueprint $table): void {
            $table->id();
            $table->string('label');
        });
        Schema::create('sections', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->boolean('active');
        });
        DB::table('school_years')->insert(['id' => 11, 'label' => 'SY fictional']);
        DB::table('sections')->insert(['id' => 17, 'name' => 'Fictional Section', 'active' => false]);
    }

    protected function tearDown(): void
    {
        Schema::dropIfExists('sections');
        Schema::dropIfExists('school_years');
        parent::tearDown();
    }

    public function test_clean_migration_preserves_existing_rows_and_adds_nullable_indexed_state(): void
    {
        $this->migration()->up();

        $this->assertArchiveSchema();
        $this->assertDatabaseHas('school_years', ['id' => 11, 'label' => 'SY fictional', 'archived_at' => null]);
        $this->assertDatabaseHas('sections', ['id' => 17, 'name' => 'Fictional Section', 'active' => false, 'archived_at' => null]);
        $this->assertDatabaseCount('school_years', 1);
        $this->assertDatabaseCount('sections', 1);
    }

    public function test_retry_completes_a_missing_index_after_a_partial_column_add(): void
    {
        Schema::table('school_years', function (Blueprint $table): void {
            $table->timestamp('archived_at')->nullable();
        });

        $this->migration()->up();

        $this->assertArchiveSchema();
        $this->assertDatabaseHas('school_years', ['id' => 11, 'archived_at' => null]);
        $this->assertDatabaseHas('sections', ['id' => 17, 'active' => false, 'archived_at' => null]);
    }

    public function test_repeat_execution_keeps_columns_indexes_and_rows_unchanged(): void
    {
        $migration = $this->migration();
        $migration->up();
        $before = [Schema::getColumns('school_years'), Schema::getIndexes('school_years'), Schema::getColumns('sections'), Schema::getIndexes('sections')];

        $migration->up();

        $this->assertSame($before, [Schema::getColumns('school_years'), Schema::getIndexes('school_years'), Schema::getColumns('sections'), Schema::getIndexes('sections')]);
        $this->assertDatabaseCount('school_years', 1);
        $this->assertDatabaseCount('sections', 1);
    }

    public function test_conflicting_named_index_is_rejected_instead_of_marked_compatible(): void
    {
        Schema::table('school_years', function (Blueprint $table): void {
            $table->index('id', 'school_years_archived_at_index');
        });

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('school_years_archived_at_index does not match the archive-state index.');
        $this->migration()->up();
    }

    private function migration(): object
    {
        return require database_path('migrations/2026_11_26_175138_add_archive_state_to_school_years_and_sections.php');
    }

    private function assertArchiveSchema(): void
    {
        foreach (['school_years', 'sections'] as $table) {
            $this->assertTrue(Schema::hasColumn($table, 'archived_at'));
            $this->assertTrue(Schema::getColumn($table, 'archived_at')['nullable']);
            $this->assertTrue(Schema::hasIndex($table, "{$table}_archived_at_index"));
            $index = collect(Schema::getIndexes($table))->firstWhere('name', "{$table}_archived_at_index");
            $this->assertSame(['archived_at'], $index['columns']);
            $this->assertFalse($index['unique']);
        }
    }
}
