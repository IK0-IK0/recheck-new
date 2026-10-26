<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_tenant_user', function (Blueprint $table): void {
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->unsignedBigInteger('tenant_user_id');
            $table->primary(['role_id', 'tenant_user_id']);
            $table->unique('tenant_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_tenant_user');
    }
};
