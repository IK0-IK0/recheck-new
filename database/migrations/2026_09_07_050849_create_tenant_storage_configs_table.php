<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tenant_storage_configs', function (Blueprint $table) {
            $table->id();
            $table->string('driver')->default('local');
            $table->string('root')->nullable();
            $table->text('endpoint')->nullable();
            $table->string('region')->nullable();
            $table->string('bucket')->nullable();
            $table->text('access_key')->nullable();
            $table->text('secret_key')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenant_storage_configs');
    }
};
