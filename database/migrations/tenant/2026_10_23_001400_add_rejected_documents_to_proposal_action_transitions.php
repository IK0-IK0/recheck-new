<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proposal_action_transitions', function (Blueprint $table) {
            $table->json('rejected_documents')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('proposal_action_transitions', function (Blueprint $table) {
            $table->dropColumn('rejected_documents');
        });
    }
};
