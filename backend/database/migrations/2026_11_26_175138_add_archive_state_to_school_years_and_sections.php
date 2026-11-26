<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->ensureArchiveState('school_years');
        $this->ensureArchiveState('sections');
    }

    private function ensureArchiveState(string $tableName): void
    {
        if (! Schema::hasColumn($tableName, 'archived_at')) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->timestamp('archived_at')->nullable();
            });
        }

        $column = Schema::getColumn($tableName, 'archived_at');
        if (! ($column['nullable'] ?? false) || ! in_array($column['type_name'] ?? null, ['timestamp', 'datetime'], true)) {
            throw new LogicException("{$tableName}.archived_at is not a nullable timestamp column.");
        }

        $indexName = "{$tableName}_archived_at_index";
        $index = collect(Schema::getIndexes($tableName))->firstWhere('name', $indexName);
        if ($index !== null) {
            if ($index['columns'] !== ['archived_at'] || $index['unique'] || $index['primary']) {
                throw new LogicException("{$indexName} does not match the archive-state index.");
            }

            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($indexName): void {
            $table->index('archived_at', $indexName);
        });
    }

    public function down(): void
    {
        throw new LogicException('Archive metadata must be retained. Restore a verified backup before considering schema reversal.');
    }
};
