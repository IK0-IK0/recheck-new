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
        Schema::table('proposal_documents', function (Blueprint $table) {
            $table->foreignId('required_document_id')->nullable()->constrained('documents')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('proposal_documents', 'required_document_id')) {
            Schema::table('proposal_documents', function (Blueprint $table) {
                $table->dropConstrainedForeignId('required_document_id');
            });
        }
    }
};
