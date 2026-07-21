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
        Schema::create('actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('phase_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // upload_documents, fill_forms, check_documents, make_decision, sign_documents
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('assigned_role');
            $table->json('config')->nullable(); // Stores documents, formFields, checkOptions, options, etc.
            $table->integer('order')->default(0); // For ordering actions
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('actions');
    }
};
