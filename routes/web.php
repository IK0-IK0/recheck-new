<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\DocumentManagementController;
use App\Http\Controllers\ProcessManagementController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function (): void {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::inertia('test', 'test')->name('test');

    // Tenant-scoped management area for all authenticated users.
    Route::prefix('tenant')->group(function (): void {
        Route::controller(ProcessManagementController::class)->group(function (): void {
            Route::get('/processes', 'index')->name('tenant.processes.index');
            Route::post('/processes', 'storeProcess')->name('tenant.processes.store');
            Route::put('/processes/{process}', 'updateProcess')->name('tenant.processes.update');
            Route::delete('/processes/{process}', 'destroyProcess')->name('tenant.processes.destroy');
            Route::post('/processes/{process}/phases', 'storePhase')->name('tenant.phases.store');
            Route::put('/phases/{phase}', 'updatePhase')->name('tenant.phases.update');
            Route::delete('/phases/{phase}', 'destroyPhase')->name('tenant.phases.destroy');
            Route::post('/processes/{process}/phases/reorder', 'reorderPhases')->name('tenant.phases.reorder');
            Route::post('/phases/{phase}/actions', 'storeAction')->name('tenant.actions.store');
            Route::put('/actions/{action}', 'updateAction')->name('tenant.actions.update');
            Route::delete('/actions/{action}', 'destroyAction')->name('tenant.actions.destroy');
            Route::post('/phases/{phase}/actions/reorder', 'reorderActions')->name('tenant.actions.reorder');
        });

        Route::controller(DocumentManagementController::class)->group(function (): void {
            Route::get('/documents', 'index')->name('tenant.documents.index');
            Route::post('/documents', 'store')->name('tenant.documents.store');
            Route::post('/documents/direct-upload-url', 'directUploadUrl')->name('tenant.documents.direct-upload-url');
            Route::post('/documents/complete-direct-upload', 'completeDirectUpload')->name('tenant.documents.complete-direct-upload');
            Route::get('/documents/{document}/download', 'download')->name('tenant.documents.download');
            Route::get('/documents/{document}/view', 'view')->name('tenant.documents.view');
            Route::delete('/documents/{document}', 'destroy')->name('tenant.documents.destroy');
        });

        Route::resource('users', Admin\UserManagementController::class)->only(['index', 'update', 'destroy']);
        Route::resource('roles', Admin\RoleManagementController::class)->only(['index', 'store', 'update', 'destroy']);
    });
});

require __DIR__.'/settings.php';
