<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('actions', function (Blueprint $table): void {
            $table->json('review_decision_document_sets')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('actions', function (Blueprint $table): void {
            $table->dropColumn('review_decision_document_sets');
        });
    }
};
