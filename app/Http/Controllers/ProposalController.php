<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\Proposal;
use App\Models\StorageConfig;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ProposalController extends Controller
{
    /**
     * Get the currently active storage disk.
     */
    private function getStorageDisk(): string
    {
        $activeConfig = StorageConfig::activeForCurrentUser();

        if (! $activeConfig) {
            return 'local'; // Fallback to local if no config
        }

        $diskConfig = $activeConfig->toFilesystemConfig();

        return $diskConfig['driver']; // Returns 'local', 's3', or 'supabase'
    }

    public function index(): Response
    {
        $proposals = Proposal::with(['process', 'currentPhase'])->latest()->get();

        return Inertia::render('Tenant/Proposals/Index', [
            'proposals' => $proposals,
        ]);
    }

    /**
     * Store a new proposal.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $proposal = Proposal::create([
            'title' => $validated['title'],
            'user_id' => $request->user()->id,
        ]);

        // Default assign to first available process if one exists
        $firstProcess = \App\Models\Process::first();
        if ($firstProcess) {
            $proposal->update(['process_id' => $firstProcess->id]);
        }

        return redirect()->route('tenant.proposals.show', $proposal);
    }

    /**
     * Display the proposal and its document management page.
     */
    public function show(Proposal $proposal): Response
    {
        $proposal->load(['process.phases', 'currentPhase', 'documents']);

        // Format phases for the status tracker
        $phases = [];
        if ($proposal->process) {
            $phases = $proposal->process->phases()->orderBy('order')->get();
        }

        return Inertia::render('Tenant/Proposals/Show', [
            'proposal' => $proposal,
            'phases' => $phases,
            'currentStorageDriver' => $this->getStorageDisk(),
        ]);
    }

    /**
     * Store a newly uploaded document and attach it to the proposal.
     */
    public function storeDocument(Request $request, Proposal $proposal): RedirectResponse
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'], // 10MB max
            'label' => ['nullable', 'in:form,doc'],
        ]);

        $uploadedFile = $request->file('file');
        $label = $validated['label'] ?? 'doc';
        $storageDriver = 'unknown';

        try {
            $storageDriver = $this->getStorageDisk();

            if ($uploadedFile) {
                $filePath = $uploadedFile->store('proposals/'.$proposal->id.'/documents', $storageDriver);

                if (! is_string($filePath)) {
                    throw new \RuntimeException('The storage disk did not return a file path after upload.');
                }

                $document = Document::create([
                    'name' => $uploadedFile->getClientOriginalName(),
                    'file_path' => $filePath,
                    'file_type' => $uploadedFile->getMimeType(),
                    'label' => $label,
                    'storage_driver' => $storageDriver,
                ]);

                // Attach to proposal
                $proposal->documents()->attach($document->id);

                return redirect()->back();
            }

            return redirect()->back()->withErrors(['file' => 'File upload failed.']);
        } catch (Throwable $exception) {
            report($exception);

            $reference = (string) Str::uuid();
            Log::error('proposal_document_upload_failed', [
                'proposal_id' => $proposal->id,
                'reference' => $reference,
                'storage_driver' => $storageDriver,
                'file_name' => $uploadedFile?->getClientOriginalName(),
                'exception' => $exception::class,
                'exception_message' => $exception->getMessage(),
            ]);

            return redirect()->back()->withErrors([
                'storage' => "Storage service could not save the file. (Reference: {$reference})",
            ]);
        }
    }

    /**
     * Delete a document from a proposal.
     */
    public function destroyDocument(Proposal $proposal, Document $document): RedirectResponse
    {
        // Check if the document belongs to this proposal
        if ($proposal->documents()->where('document_id', $document->id)->exists()) {
            $proposal->documents()->detach($document->id);

            // Optionally, delete the actual file and document record if it's not used elsewhere
            if ($document->proposals()->count() === 0 && $document->actions()->count() === 0) {
                $disk = Storage::disk($document->storage_driver ?? 'local');
                $disk->delete($document->file_path);
                $document->delete();
            }
        }

        return redirect()->back();
    }

    /**
     * Submit the proposal and advance its workflow.
     */
    public function submit(Request $request, Proposal $proposal): RedirectResponse
    {
        if (! $proposal->process) {
            return redirect()->back()->withErrors(['process' => 'No workflow process is assigned to this proposal.']);
        }

        $phases = $proposal->process->phases()->orderBy('order')->get();

        if ($phases->isEmpty()) {
            return redirect()->back()->withErrors(['process' => 'The assigned workflow process has no phases.']);
        }

        if (! $proposal->current_phase_id) {
            // Move to the first phase
            $proposal->update([
                'current_phase_id' => $phases->first()->id,
            ]);
        } else {
            // Find current phase and move to the next one
            $currentPhaseIndex = $phases->search(fn ($phase) => $phase->id === $proposal->current_phase_id);

            if ($currentPhaseIndex !== false && isset($phases[$currentPhaseIndex + 1])) {
                $proposal->update([
                    'current_phase_id' => $phases[$currentPhaseIndex + 1]->id,
                ]);
            }
        }

        return redirect()->back()->with('success', 'Proposal submitted successfully.');
    }
}
