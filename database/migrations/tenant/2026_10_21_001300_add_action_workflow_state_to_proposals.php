<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proposals', function (Blueprint $table) {
            $table->foreignId('current_action_id')->nullable()->constrained('actions')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
        });

        Schema::table('proposal_documents', function (Blueprint $table) {
            $table->foreignId('action_id')->nullable()->constrained('actions')->nullOnDelete();
        });

        Schema::create('proposal_action_transitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proposal_id')->constrained()->cascadeOnDelete();
            $table->foreignId('action_id')->constrained('actions')->cascadeOnDelete();
            $table->string('decision')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('user_type')->nullable();
            $table->timestamps();
        });

        DB::table('proposals')
            ->whereNull('current_action_id')
            ->whereNotNull('process_id')
            ->orderBy('id')
            ->chunkById(100, function ($proposals): void {
                foreach ($proposals as $proposal) {
                    $phases = DB::table('phases')
                        ->where('process_id', $proposal->process_id)
                        ->orderBy('order')
                        ->orderBy('id')
                        ->get(['id']);
                    $phaseIds = $phases->pluck('id')->map(fn ($id): int => (int) $id)->all();
                    $currentPhaseIndex = array_search((int) $proposal->current_phase_id, $phaseIds, true);
                    $startIndex = $currentPhaseIndex === false ? 0 : $currentPhaseIndex;

                    foreach (array_slice($phaseIds, $startIndex) as $phaseId) {
                        $action = DB::table('actions')
                            ->where('phase_id', $phaseId)
                            ->orderBy('order')
                            ->orderBy('id')
                            ->first(['id']);

                        if ($action) {
                            DB::table('proposals')
                                ->where('id', $proposal->id)
                                ->update([
                                    'current_phase_id' => $phaseId,
                                    'current_action_id' => $action->id,
                                ]);
                            break;
                        }
                    }
                }
            });

        DB::table('proposal_documents')
            ->whereNull('action_id')
            ->whereNotNull('phase_id')
            ->whereNotNull('required_document_id')
            ->orderBy('id')
            ->chunkById(100, function ($proposalDocuments): void {
                foreach ($proposalDocuments as $proposalDocument) {
                    $actionIds = DB::table('action_document as action_documents')
                        ->join('actions', 'actions.id', '=', 'action_documents.action_id')
                        ->where('actions.phase_id', $proposalDocument->phase_id)
                        ->where('action_documents.document_id', $proposalDocument->required_document_id)
                        ->pluck('actions.id')
                        ->unique();

                    if ($actionIds->count() === 1) {
                        DB::table('proposal_documents')
                            ->where('id', $proposalDocument->id)
                            ->update(['action_id' => $actionIds->first()]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('proposal_action_transitions');

        Schema::table('proposal_documents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('action_id');
        });

        Schema::table('proposals', function (Blueprint $table) {
            $table->dropConstrainedForeignId('current_action_id');
            $table->dropColumn('completed_at');
        });
    }
};
