<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_storage_configs', function (Blueprint $table): void {
            $table->string('driver')->default('local')->after('id');
            $table->string('root')->nullable()->after('driver');
            $table->text('endpoint')->nullable()->after('root');
            $table->string('region')->nullable()->after('endpoint');
            $table->string('bucket')->nullable()->after('region');
            $table->text('access_key')->nullable()->after('bucket');
            $table->text('secret_key')->nullable()->after('access_key');
            $table->boolean('is_active')->default(false)->after('secret_key');
        });
    }

    public function down(): void
    {
        Schema::table('tenant_storage_configs', function (Blueprint $table): void {
            $table->dropColumn([
                'driver',
                'root',
                'endpoint',
                'region',
                'bucket',
                'access_key',
                'secret_key',
                'is_active',
            ]);
        });
    }
};