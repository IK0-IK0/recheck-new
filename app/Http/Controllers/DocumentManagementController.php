<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentManagementController extends Controller
{
    /**
     * Display all document records.
     */
    public function index(): Response
    {
        $documents = Document::all();

        return Inertia::render('DocumentManagement', [
            'documents' => $documents,
        ]);
    }

    /**
     * Store a newly uploaded document file and create a Document record.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file'],
            'label' => ['required', 'in:form,doc'],
        ]);

        $uploadedFile = $request->file('file');
        $filePath = $uploadedFile->store('documents');

        Document::create([
            'name' => $uploadedFile->getClientOriginalName(),
            'file_path' => $filePath,
            'file_type' => $uploadedFile->getMimeType(),
            'label' => $request->input('label'),
        ]);

        return redirect()->back();
    }

    /**
     * Serve the document file as a download response.
     *
     * Returns HTTP 404 if the file no longer exists on the filesystem.
     */
    public function download(Document $document): StreamedResponse
    {
        if (! Storage::disk('local')->exists($document->file_path)) {
            abort(404);
        }

        return Storage::disk('local')->download($document->file_path, $document->name);
    }

    /**
     * Delete the document file from the filesystem and remove the record.
     */
    public function destroy(Document $document): RedirectResponse
    {
        Storage::disk('local')->delete($document->file_path);
        $document->delete();

        return redirect()->back();
    }
}
