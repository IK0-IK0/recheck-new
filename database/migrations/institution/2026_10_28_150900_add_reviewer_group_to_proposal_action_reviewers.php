<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proposal_action_reviewers', function (Blueprint $table): void {
            $table->string('reviewer_group_id')->nullable()->after('round');
            $table->dropUnique('proposal_action_reviewers_unique_assignment');
            $table->unique(
                ['proposal_id', 'action_id', 'round', 'reviewer_group_id'],
                'proposal_action_reviewers_group_assignment_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::table('proposal_action_reviewers', function (Blueprint $table): void {
            $table->dropUnique('proposal_action_reviewers_group_assignment_unique');
            $table->unique(
                ['proposal_id', 'action_id', 'round', 'user_id', 'user_type'],
                'proposal_action_reviewers_unique_assignment',
            );
            $table->dropColumn('reviewer_group_id');
        });
    }
};
