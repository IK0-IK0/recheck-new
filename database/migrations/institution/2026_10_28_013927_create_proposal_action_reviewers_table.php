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
        Schema::create('proposal_action_reviewers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('proposal_id')->constrained()->cascadeOnDelete();
            $table->foreignId('action_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('round');
            $table->unsignedBigInteger('user_id');
            $table->string('user_type');
            $table->unsignedBigInteger('assigned_by_user_id');
            $table->string('assigned_by_user_type');
            $table->string('decision')->nullable();
            $table->text('comment')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();
            $table->unique(
                ['proposal_id', 'action_id', 'round', 'user_id', 'user_type'],
                'proposal_action_reviewers_unique_assignment',
            );
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('proposal_action_reviewers');
    }
};
