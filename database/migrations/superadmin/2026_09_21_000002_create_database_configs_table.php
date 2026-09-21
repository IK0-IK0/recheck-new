<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('database_configs', function (Blueprint $table): void {
            $table->id();
            $table->string('driver')->default('sqlite');
            $table->text('host')->nullable();
            $table->string('port')->nullable();
            $table->text('database')->nullable();
            $table->text('username')->nullable();
            $table->text('password')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('database_configs');
    }
};