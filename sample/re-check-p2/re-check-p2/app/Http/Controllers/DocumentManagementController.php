<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class DocumentManagementController extends Controller
{
    use AuthorizesRequests;
    /**
     * Show the document management page with user's documents.
     */
    public function index(Request $request)
    {
        $query = $request->user()->documents()->latest();

        // Apply search filter
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        // Apply label filter
        if ($request->filled('filter') && $request->filter !== 'all') {
            $query->ofLabel($request->filter);
        }

        // Paginate results
        $perPage = min(max((int) $request->get('per_page', 20), 10), 50); // Between 10-50
        $documents = $query->paginate($perPage)->withQueryString();

        // Transform documents for frontend
        $transformedDocuments = $documents->through(function ($document) {
            return [
                'id' => $document->id,
                'name' => $document->name,
                'label' => $document->label,
                'uploadedAt' => $document->upload_date,
                'size' => $document->formatted_size,
                'file_type' => $document->file_type,
                'file_path' => $document->file_path,
                'file_size' => $document->file_size,
                'config' => $document->config,
                'created_at' => $document->created_at,
            ];
        });

        return Inertia::render('DocumentManagement', [
            'documents' => $transformedDocuments,
            'filters' => [
                'search' => $request->search,
                'filter' => $request->filter ?? 'all',
                'per_page' => $perPage,
            ],
        ]);
    }

    /**
     * Store a new document.
     */
    public function store(Request $request)
    {
        \Log::info('Store method called', $request->all());
        
        $request->validate([
            'name' => 'required|string|max:255',
            'label' => 'required|in:forms,docs',
            'file_path' => 'required|string',
            'file_size' => 'required|integer',
            'file_type' => 'required|string',
            'public_url' => 'required|string',
        ]);

        \Log::info('Validation passed');

        $document = $request->user()->documents()->create([
            'name' => $request->name,
            'label' => $request->label,
            'file_path' => $request->file_path,
            'file_size' => $request->file_size,
            'file_type' => $request->file_type,
            'config' => [
                'public_url' => $request->public_url,
                'storage_disk' => 'supabase',
            ],
        ]);

        \Log::info('Document created', ['id' => $document->id]);

        return redirect()->back()->with('success', 'Document uploaded successfully.');
    }

    /**
     * Update an existing document.
     */
    public function update(Request $request, Document $document)
    {
        // Ensure user owns the document
        $this->authorize('update', $document);

        $request->validate([
            'name' => 'required|string|max:255',
            'label' => 'required|in:forms,docs',
            'file_path' => 'nullable|string',
            'file_size' => 'nullable|integer',
            'file_type' => 'nullable|string',
            'public_url' => 'nullable|string',
        ]);

        $updateData = [
            'name' => $request->name,
            'label' => $request->label,
        ];

        // If new file metadata is provided, update it
        if ($request->filled('file_path')) {
            $updateData['file_path'] = $request->file_path;
            $updateData['file_size'] = $request->file_size;
            $updateData['file_type'] = $request->file_type;
            $updateData['config'] = array_merge($document->config ?? [], [
                'public_url' => $request->public_url,
                'storage_disk' => 'supabase',
            ]);
        }

        $document->update($updateData);

        return redirect()->back()->with('success', 'Document updated successfully.');
    }

    /**
     * Test Supabase storage connection.
     */
    public function testStorage()
    {
        try {
            // Test basic connection
            $disk = Storage::disk('supabase');
            
            // Log configuration
            \Log::info('Testing Supabase storage', [
                'bucket' => config('filesystems.disks.supabase.bucket'),
                'endpoint' => config('filesystems.disks.supabase.endpoint'),
                'region' => config('filesystems.disks.supabase.region'),
                'has_key' => !empty(config('filesystems.disks.supabase.key')),
                'has_secret' => !empty(config('filesystems.disks.supabase.secret')),
            ]);
            
            // Try to create a test file
            $testContent = 'Test file created at ' . now();
            $testPath = 'test/connection-test-' . time() . '.txt';
            
            \Log::info('Attempting to upload test file', ['path' => $testPath]);
            
            $result = $disk->put($testPath, $testContent);
            
            if ($result) {
                // Check if file exists
                $exists = $disk->exists($testPath);
                
                \Log::info('Upload result', [
                    'success' => true,
                    'exists' => $exists,
                    'path' => $testPath
                ]);
                
                // Try to read the file
                $content = $disk->get($testPath);
                
                // Clean up test file
                $disk->delete($testPath);
                
                return response()->json([
                    'status' => 'success',
                    'message' => 'Supabase storage connection working',
                    'test_file_path' => $testPath,
                    'file_exists' => $exists,
                    'content_matches' => $content === $testContent,
                    'config' => [
                        'bucket' => config('filesystems.disks.supabase.bucket'),
                        'endpoint' => config('filesystems.disks.supabase.endpoint'),
                        'region' => config('filesystems.disks.supabase.region'),
                    ]
                ]);
            } else {
                \Log::error('Upload returned false');
                
                return response()->json([
                    'status' => 'error',
                    'message' => 'Failed to create test file - upload returned false',
                    'config' => [
                        'bucket' => config('filesystems.disks.supabase.bucket'),
                        'endpoint' => config('filesystems.disks.supabase.endpoint'),
                    ]
                ], 500);
            }
            
        } catch (\Exception $e) {
            \Log::error('Supabase storage test failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'status' => 'error',
                'message' => 'Supabase storage connection failed',
                'error' => $e->getMessage(),
                'error_class' => get_class($e),
                'config' => [
                    'bucket' => config('filesystems.disks.supabase.bucket'),
                    'endpoint' => config('filesystems.disks.supabase.endpoint'),
                    'region' => config('filesystems.disks.supabase.region'),
                    'has_key' => !empty(config('filesystems.disks.supabase.key')),
                    'has_secret' => !empty(config('filesystems.disks.supabase.secret')),
                ]
            ], 500);
        }
    }

    /**
     * Get documents for workflow actions.
     */
    public function getForWorkflow(Request $request)
    {
        $documents = $request->user()->documents()
            ->latest()
            ->get()
            ->map(function ($document) {
                return [
                    'id' => (string) $document->id,
                    'name' => $document->name,
                    'type' => $document->label === 'forms' ? 'fillable' : 'uploadable',
                    'label' => $document->label,
                ];
            });

        return response()->json($documents);
    }

    /**
     * Delete a document.
     */
    public function destroy(Document $document)
    {
        // Ensure user owns the document
        $this->authorize('delete', $document);

        // Note: File deletion from Supabase is handled by the frontend
        // or can be done via a cleanup job

        $document->delete();

        return redirect()->back()->with('success', 'Document deleted successfully.');
    }
}
