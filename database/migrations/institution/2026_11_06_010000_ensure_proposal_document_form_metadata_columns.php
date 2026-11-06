<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proposal_documents', function (Blueprint $table): void {
            if (! Schema::hasColumn('proposal_documents', 'form_field_id')) {
                $table->string('form_field_id')->nullable();
            }

            if (! Schema::hasColumn('proposal_documents', 'form_uploader_id')) {
                $table->unsignedBigInteger('form_uploader_id')->nullable();
            }

            if (! Schema::hasColumn('proposal_documents', 'form_uploader_type')) {
                $table->string('form_uploader_type', 191)->nullable();
            }
        });
    }

    public function down(): void
    {
        // Keep repaired columns to avoid dropping metadata from existing uploads.
    }
};
