<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\StorageConfig;
use Aws\S3\S3Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class DocumentManagementController extends Controller
{
    /**
     * Get the currently active storage disk.
     */
    private function getStorageDisk(): string
    {
        $activeConfig = StorageConfig::where('is_active', true)->first();

        if (! $activeConfig) {
            return 'local'; // Fallback to local if no config
        }

        $diskConfig = $activeConfig->toFilesystemConfig();

        return $diskConfig['driver']; // Returns 'local', 's3', or 'supabase'
    }

    /**
     * Display all document records.
     */
    public function index(): Response
    {
        $documents = Document::all();
        $currentStorageDriver = $this->getStorageDisk();

        return Inertia::render('Tenant/DocumentManagement', [
            'documents' => $documents,
            'currentStorageDriver' => $currentStorageDriver,
        ]);
    }

    /**
     * Store a newly uploaded document file and create a Document record.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'label' => ['required', 'in:form,doc'],
            'file' => ['nullable', 'file', 'max:10240'], // 10MB max
        ]);

        $uploadedFile = $request->file('file');
        $fileType = $validated['label'] === 'form' ? 'Form' : 'Document';
        $storageDriver = 'unknown';

        try {
            $storageDriver = $this->getStorageDisk();

            if ($uploadedFile) {
                $filePath = $uploadedFile->store('documents', $storageDriver);

                if (! is_string($filePath)) {
                    throw new \RuntimeException('The storage disk did not return a file path after upload.');
                }

                Document::create([
                    'name' => $uploadedFile->getClientOriginalName(),
                    'file_path' => $filePath,
                    'file_type' => $uploadedFile->getMimeType(),
                    'label' => $validated['label'],
                    'storage_driver' => $storageDriver,
                ]);

                return redirect()->back();
            }

            $filePath = 'documents/'.Str::slug($validated['name']).'.txt';
            $stored = Storage::disk($storageDriver)->put($filePath, '');

            if (! $stored) {
                throw new \RuntimeException('The storage disk did not accept the document.');
            }

            Document::create([
                'name' => $validated['name'],
                'file_path' => $filePath,
                'file_type' => $fileType,
                'label' => $validated['label'],
                'storage_driver' => $storageDriver,
            ]);

            return redirect()->back();
        } catch (Throwable $exception) {
            report($exception);

            $reference = (string) Str::uuid();
            Log::error('document_upload_failed', [
                'reference' => $reference,
                'storage_driver' => $storageDriver,
                'file_name' => $uploadedFile?->getClientOriginalName(),
                'file_size' => $uploadedFile?->getSize(),
                'exception' => $exception::class,
                'exception_message' => $exception->getMessage(),
                'previous_exception' => $exception->getPrevious()?->getMessage(),
            ]);

            return redirect()->back()->withErrors([
                'storage' => $this->storageErrorMessage($storageDriver, $exception, $reference),
            ]);
        }
    }

    public function directUploadUrl(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'label' => ['required', 'in:form,doc'],
            'file_name' => ['required', 'string', 'max:255'],
            'content_type' => ['required', 'string', 'max:255'],
        ]);

        $storageDriver = 's3';
        $reference = (string) Str::uuid();

        try {
            $config = StorageConfig::where('is_active', true)->first();

            if (! $config) {
                return response()->json(['error' => 'No active storage configuration was found.'], 422);
            }

            if ($config->driver !== 's3') {
                return response()->json(['error' => 'Direct uploads require S3-compatible storage.'], 422);
            }

            $extension = pathinfo($validated['file_name'], PATHINFO_EXTENSION);
            $path = 'documents/'.$reference.($extension ? '.'.$extension : '');
            $client = new S3Client([
                'version' => 'latest',
                'region' => $config->region ?? 'us-east-1',
                'endpoint' => $config->endpoint,
                'credentials' => ['key' => $config->access_key, 'secret' => $config->secret_key],
                'use_path_style_endpoint' => true,
            ]);
            $command = $client->getCommand('PutObject', [
                'Bucket' => $config->bucket,
                'Key' => $path,
                'ContentType' => $validated['content_type'],
            ]);

            return response()->json([
                'url' => (string) $client->createPresignedRequest($command, '+10 minutes')->getUri(),
                'path' => $path,
                'reference' => $reference,
            ]);
        } catch (Throwable $exception) {
            report($exception);
            Log::error('document_direct_upload_url_failed', [
                'reference' => $reference,
                'exception' => $exception::class,
                'exception_message' => $exception->getMessage(),
            ]);

            return response()->json([
                'error' => $this->storageErrorMessage($storageDriver, $exception, $reference),
            ], 500);
        }
    }

    public function completeDirectUpload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'label' => ['required', 'in:form,doc'],
            'file_type' => ['required', 'string', 'max:255'],
            'path' => ['required', 'string', 'starts_with:documents/'],
            'reference' => ['required', 'uuid'],
        ]);

        $storageDriver = 's3';
        $reference = $validated['reference'];

        try {
            $config = StorageConfig::where('is_active', true)->first();

            if (! $config) {
                return response()->json(['error' => 'No active storage configuration was found.'], 422);
            }

            $storageDriver = $config->driver;
            $disk = Storage::build($config->toFilesystemConfig());

            if (! $disk->exists($validated['path'])) {
                return response()->json(['error' => 'The direct upload was not found in storage.'], 404);
            }

                $document = Document::create([
                'name' => $validated['name'],
                'file_path' => $validated['path'],
                'file_type' => $validated['file_type'],
                'label' => $validated['label'],
                'storage_driver' => $config->driver,
            ]);

                return response()->json([
                    'message' => 'Document saved.',
                    'document' => $document,
                ]);
        } catch (Throwable $exception) {
            report($exception);
            Log::error('document_direct_upload_completion_failed', [
                'reference' => $reference,
                'path' => $validated['path'],
                'exception' => $exception::class,
                'exception_message' => $exception->getMessage(),
            ]);

            return response()->json([
                'error' => $this->storageErrorMessage($storageDriver, $exception, $reference),
            ], 500);
        }
    }

    private function storageErrorMessage(string $storageDriver, Throwable $exception, string $reference): string
    {
        $details = $this->exceptionDetails($exception);
        $message = strtolower($details);
        $driverName = $storageDriver === 'supabase' ? 'Supabase Storage' : strtoupper($storageDriver).' storage';

        if (str_contains($message, 'could not resolve host') || str_contains($message, 'connection refused') || str_contains($message, 'timed out')) {
            return "Could not connect to {$driverName}. Check the configured endpoint URL and network access. (Reference: {$reference})";
        }

        if (str_contains($message, '403') || str_contains($message, 'forbidden') || str_contains($message, 'accessdenied') || str_contains($message, 'invalidaccesskeyid') || str_contains($message, 'credentials')) {
            return "{$driverName} rejected the upload. Check the access key, secret key, and bucket permissions. (Reference: {$reference})";
        }

        if (str_contains($message, '404') || str_contains($message, 'nosuchbucket') || str_contains($message, 'not found')) {
            return "The configured {$driverName} bucket was not found. Verify the bucket name in Storage Settings. (Reference: {$reference})";
        }

        return "{$driverName} could not save the file. {$details} (Reference: {$reference})";
    }

    private function exceptionDetails(Throwable $exception): string
    {
        $messages = [];

        for ($current = $exception; $current; $current = $current->getPrevious()) {
            $message = trim($current->getMessage());

            if ($message !== '' && ! in_array($message, $messages, true)) {
                $messages[] = $message;
            }
        }

        return implode(' | ', $messages) ?: 'The storage service returned an unspecified error.';
    }

    /**
     * Serve the document file as a download response.
     *
     * Returns HTTP 404 if the file no longer exists on the filesystem.
     */
    public function download(Document $document): StreamedResponse
    {
        // Use the storage driver that was used to upload the file
        $disk = Storage::disk($document->storage_driver ?? 'local');

        if (! $disk->exists($document->file_path)) {
            abort(404);
        }

        $extension = pathinfo($document->file_path, PATHINFO_EXTENSION);
        $downloadName = pathinfo($document->name, PATHINFO_FILENAME).($extension ? '.'.$extension : '');

        return $disk->download($document->file_path, $downloadName);
    }

    public function view(Document $document): StreamedResponse
    {
        $disk = Storage::disk($document->storage_driver ?? 'local');

        if (! $disk->exists($document->file_path)) {
            abort(404);
        }

        $stream = $disk->readStream($document->file_path);
        $extension = pathinfo($document->file_path, PATHINFO_EXTENSION);
        $viewName = pathinfo($document->name, PATHINFO_FILENAME).($extension ? '.'.$extension : '');

        return response()->stream(function () use ($stream): void {
            fpassthru($stream);
            fclose($stream);
        }, 200, [
            'Content-Type' => $document->file_type,
            'Content-Disposition' => 'inline; filename="'.addslashes($viewName).'"',
        ]);
    }

    /**
     * Delete the document file from the filesystem and remove the record.
     */
    public function destroy(Document $document): RedirectResponse
    {
        // Use the storage driver that was used to upload the file
        $disk = Storage::disk($document->storage_driver ?? 'local');
        $disk->delete($document->file_path);

        $document->delete();

        return redirect()->back();
    }
}
