<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_database_configs', function (Blueprint $table): void {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            $table->index(['tenant_id', 'is_active']);
        });

        Schema::table('tenant_storage_configs', function (Blueprint $table): void {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            $table->index(['tenant_id', 'is_active']);
        });

        DB::table('tenant_database_configs')->update(['tenant_id' => 1]);
        DB::table('tenant_storage_configs')->update(['tenant_id' => 1]);
    }

    public function down(): void
    {
        Schema::table('tenant_storage_configs', function (Blueprint $table): void {
            $table->dropForeign(['tenant_id']);
            $table->dropIndex(['tenant_id', 'is_active']);
            $table->dropColumn('tenant_id');
        });

        Schema::table('tenant_database_configs', function (Blueprint $table): void {
            $table->dropForeign(['tenant_id']);
            $table->dropIndex(['tenant_id', 'is_active']);
            $table->dropColumn('tenant_id');
        });
    }
};
