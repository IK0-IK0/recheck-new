<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First check if column exists (it might on production)
        if (! Schema::hasColumn('documents', 'storage_driver')) {
            Schema::table('documents', function (Blueprint $table) {
                $table->string('storage_driver')->nullable()->after('label');
            });
        } else {
            // Column exists but might not be nullable, make it nullable
            DB::statement('ALTER TABLE documents ALTER COLUMN storage_driver DROP NOT NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('documents', 'storage_driver')) {
            Schema::table('documents', function (Blueprint $table) {
                $table->dropColumn('storage_driver');
            });
        }
    }
};
