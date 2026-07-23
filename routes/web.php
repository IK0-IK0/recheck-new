<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\DocumentManagementController;
use App\Http\Controllers\ProcessManagementController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function (): void {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Process Management
    Route::controller(ProcessManagementController::class)->group(function (): void {
        Route::get('/processes', 'index')->name('processes.index');
        Route::post('/processes', 'storeProcess')->name('processes.store');
        Route::put('/processes/{process}', 'updateProcess')->name('processes.update');
        Route::delete('/processes/{process}', 'destroyProcess')->name('processes.destroy');
        Route::post('/processes/{process}/phases', 'storePhase')->name('phases.store');
        Route::put('/phases/{phase}', 'updatePhase')->name('phases.update');
        Route::delete('/phases/{phase}', 'destroyPhase')->name('phases.destroy');
        Route::post('/processes/{process}/phases/reorder', 'reorderPhases')->name('phases.reorder');
        Route::post('/phases/{phase}/actions', 'storeAction')->name('actions.store');
        Route::put('/actions/{action}', 'updateAction')->name('actions.update');
        Route::delete('/actions/{action}', 'destroyAction')->name('actions.destroy');
        Route::post('/phases/{phase}/actions/reorder', 'reorderActions')->name('actions.reorder');
    });

    // Document Management
    Route::controller(DocumentManagementController::class)->group(function (): void {
        Route::get('/documents', 'index')->name('documents.index');
        Route::post('/documents', 'store')->name('documents.store');
        Route::get('/documents/{document}/download', 'download')->name('documents.download');
        Route::delete('/documents/{document}', 'destroy')->name('documents.destroy');
    });

    // Admin (permission-gated)
    Route::middleware('permission:admin')->prefix('admin')->group(function (): void {
        Route::resource('users', Admin\UserManagementController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::resource('roles', Admin\RoleManagementController::class)->only(['index', 'store', 'update', 'destroy']);
    });
});

require __DIR__.'/settings.php';
