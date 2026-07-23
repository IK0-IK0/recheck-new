<?php

/**
 * Integration tests for DocumentManagementController.
 *
 * Feature: port-sample-to-reccheck, Task 6.1
 *
 * Validates: Requirements 5.1–5.5
 */

use App\Http\Controllers\DocumentManagementController;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;

// ---------------------------------------------------------------------------
// Integration: upload creates a Document record and stores the file on disk
// Validates: Requirements 5.1, 5.7
// ---------------------------------------------------------------------------
test('store creates a Document record and stores the file on the local disk', function (): void {
    Storage::fake('local');

    $file = UploadedFile::fake()->create('report.pdf', 100, 'application/pdf');

    $request = Request::create('/documents', 'POST', ['label' => 'doc']);
    $request->files->set('file', $file);

    $controller = new DocumentManagementController;
    $controller->store($request);

    // Record created in tenant DB
    $document = Document::first();
    expect($document)->not->toBeNull();
    expect($document->name)->toBe('report.pdf');
    expect($document->file_type)->toBe('application/pdf');
    expect($document->label)->toBe('doc');

    // File stored under the documents/ directory on the local disk
    Storage::disk('local')->assertExists($document->file_path);
    expect($document->file_path)->toStartWith('documents/');
});

// ---------------------------------------------------------------------------
// Integration: download returns the file content as a streamed response
// Validates: Requirement 5.3
// ---------------------------------------------------------------------------
test('download returns the stored file as a download response', function (): void {
    Storage::fake('local');

    $fileContents = 'Hello document content';
    $filePath = 'documents/test-file.txt';
    Storage::disk('local')->put($filePath, $fileContents);

    $document = Document::factory()->create([
        'file_path' => $filePath,
        'name' => 'test-file.txt',
        'file_type' => 'text/plain',
    ]);

    $controller = new DocumentManagementController;
    $response = $controller->download($document);

    expect($response->getStatusCode())->toBe(200);
    expect($response->headers->get('content-disposition'))->toContain('test-file.txt');
});

// ---------------------------------------------------------------------------
// Integration: download returns 404 when the file is missing from the filesystem
// Validates: Requirement 5.4
// ---------------------------------------------------------------------------
test('download aborts with 404 when the file does not exist on disk', function (): void {
    Storage::fake('local');

    $document = Document::factory()->create([
        'file_path' => 'documents/missing-file.pdf',
        'name' => 'missing-file.pdf',
    ]);

    $controller = new DocumentManagementController;
    $controller->download($document);
})->throws(HttpException::class);

// ---------------------------------------------------------------------------
// Integration: destroy removes the file from disk and the record from the DB
// Validates: Requirement 5.5
// ---------------------------------------------------------------------------
test('destroy deletes the file from disk and removes the Document record', function (): void {
    Storage::fake('local');

    $filePath = 'documents/to-delete.txt';
    Storage::disk('local')->put($filePath, 'some content');

    $document = Document::factory()->create([
        'file_path' => $filePath,
        'name' => 'to-delete.txt',
    ]);

    $documentId = $document->id;

    $controller = new DocumentManagementController;

    $request = Request::create("/documents/{$documentId}", 'DELETE');
    $controller->destroy($document);

    // Record gone from DB
    expect(Document::find($documentId))->toBeNull();

    // File gone from disk
    Storage::disk('local')->assertMissing($filePath);
});

// ---------------------------------------------------------------------------
// Integration: store with label 'form' also works correctly
// Validates: Requirement 5.6
// ---------------------------------------------------------------------------
test('store accepts the form label value', function (): void {
    Storage::fake('local');

    $file = UploadedFile::fake()->create('template.docx', 50, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    $request = Request::create('/documents', 'POST', ['label' => 'form']);
    $request->files->set('file', $file);

    $controller = new DocumentManagementController;
    $controller->store($request);

    $document = Document::first();
    expect($document)->not->toBeNull();
    expect($document->label)->toBe('form');
});
