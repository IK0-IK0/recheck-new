<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proposal_form_responses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proposal_id')->constrained()->cascadeOnDelete();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            $table->foreignId('action_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('round')->default(1);
            $table->unsignedBigInteger('user_id');
            $table->string('user_type', 191);
            $table->json('answers');
            $table->timestamps();

            $table->unique(
                ['proposal_id', 'document_id', 'action_id', 'round', 'user_id', 'user_type'],
                'proposal_form_responses_unique_actor',
            );
        });

        Schema::table('proposal_documents', function (Blueprint $table) {
            $table->string('form_field_id')->nullable();
            $table->unsignedBigInteger('form_uploader_id')->nullable();
            $table->string('form_uploader_type', 191)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('proposal_documents', function (Blueprint $table) {
            $table->dropColumn(['form_field_id', 'form_uploader_id', 'form_uploader_type']);
        });

        Schema::dropIfExists('proposal_form_responses');
    }
};
