<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_api_configs', function (Blueprint $table): void {
            $table->id();
            $table->text('ilove_public_key')->nullable();
            $table->text('ilove_secret_key')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_api_configs');
    }
};
