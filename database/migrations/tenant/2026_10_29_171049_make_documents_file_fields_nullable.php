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
        Schema::table('documents', function (Blueprint $table) {
            $table->string('file_path')->nullable()->change();
            $table->string('file_type')->nullable()->change();
            $table->string('storage_driver')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('file_path')->nullable(false)->change();
            $table->string('file_type')->nullable(false)->change();
            $table->string('storage_driver')->nullable(false)->change();
        });
    }
};
