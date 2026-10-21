<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('actions', function (Blueprint $table) {
            $table->foreignId('approve_action_id')->nullable()->constrained('actions')->nullOnDelete();
            $table->foreignId('deny_action_id')->nullable()->constrained('actions')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('actions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('approve_action_id');
            $table->dropConstrainedForeignId('deny_action_id');
        });
    }
};
