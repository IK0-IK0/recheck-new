<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'ilove_public_key')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn(['ilove_public_key', 'ilove_secret_key']);
            });
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->text('ilove_public_key')->nullable()->after('role');
            $table->text('ilove_secret_key')->nullable()->after('ilove_public_key');
        });
    }
};
