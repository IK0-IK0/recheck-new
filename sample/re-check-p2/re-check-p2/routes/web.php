<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProcessManagementController;
use App\Http\Controllers\DocumentManagementController;
use App\Http\Controllers\RoleManagementController;
use App\Http\Controllers\UserManagementController;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'auth' => ['user' => auth()->user()],
        'laravelVersion' => \Illuminate\Foundation\Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/login', function () {
    return Inertia::render('Auth/Login');
})->name('login');

Route::get('/register', function () {
    return Inertia::render('Auth/Register');
})->name('register');

Route::post('/login', [App\Http\Controllers\Auth\AuthenticatedSessionController::class, 'store']);
Route::post('/register', [App\Http\Controllers\Auth\RegisteredUserController::class, 'store']);

Route::post('/logout', [App\Http\Controllers\Auth\AuthenticatedSessionController::class, 'destroy'])
    ->name('logout')
    ->middleware('auth');

Route::middleware('auth')->group(function () {
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');
    
    Route::get('/processes', [ProcessManagementController::class, 'index'])->name('processes');
    
    Route::get('/documents', [DocumentManagementController::class, 'index'])->name('documents');
    
    // Document API routes
    Route::post('/api/documents', [DocumentManagementController::class, 'store'])->name('documents.store');
    Route::patch('/api/documents/{document}', [DocumentManagementController::class, 'update'])->name('documents.update');
    Route::delete('/api/documents/{document}', [DocumentManagementController::class, 'destroy'])->name('documents.destroy');
    Route::get('/api/documents/workflow', [DocumentManagementController::class, 'getForWorkflow'])->name('documents.workflow');
    
    // Test Supabase storage connection
    Route::get('/api/test-storage', [DocumentManagementController::class, 'testStorage'])->name('test.storage');
    
    // Process API routes
    Route::post('/api/processes', [ProcessManagementController::class, 'storeProcess']);
    Route::patch('/api/processes/{process}', [ProcessManagementController::class, 'updateProcess']);
    Route::delete('/api/processes/{process}', [ProcessManagementController::class, 'deleteProcess']);
    
    // Phase API routes
    Route::post('/api/phases', [ProcessManagementController::class, 'storePhase']);
    Route::patch('/api/phases/{phase}', [ProcessManagementController::class, 'updatePhase']);
    Route::post('/api/phases/reorder', [ProcessManagementController::class, 'reorderPhases']);
    Route::delete('/api/phases/{phase}', [ProcessManagementController::class, 'deletePhase']);
    
    // Action API routes
    Route::post('/api/actions', [ProcessManagementController::class, 'storeAction']);
    Route::patch('/api/actions/{action}', [ProcessManagementController::class, 'updateAction']);
    Route::post('/api/actions/reorder', [ProcessManagementController::class, 'reorderActions']);
    Route::delete('/api/actions/{action}', [ProcessManagementController::class, 'deleteAction']);
    
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Admin Routes - Role Management
    Route::get('/admin/roles', [RoleManagementController::class, 'index'])->name('roles.index')->middleware('permission:view_roles');
    Route::get('/admin/roles/create', [RoleManagementController::class, 'create'])->name('roles.create')->middleware('permission:create_roles');
    Route::post('/admin/roles', [RoleManagementController::class, 'store'])->name('roles.store')->middleware('permission:create_roles');
    Route::get('/admin/roles/{role}/edit', [RoleManagementController::class, 'edit'])->name('roles.edit')->middleware('permission:edit_roles');
    Route::patch('/admin/roles/{role}', [RoleManagementController::class, 'update'])->name('roles.update')->middleware('permission:edit_roles');
    Route::delete('/admin/roles/{role}', [RoleManagementController::class, 'destroy'])->name('roles.destroy')->middleware('permission:delete_roles');
    Route::get('/admin/roles/{role}/users', [RoleManagementController::class, 'getUsersForReassignment'])->name('roles.users')->middleware('permission:delete_roles');
    Route::post('/admin/roles/{role}/reassign-and-delete', [RoleManagementController::class, 'reassignAndDelete'])->name('roles.reassign-delete')->middleware('permission:delete_roles');

    // Admin Routes - User Management
    Route::get('/admin/users', [UserManagementController::class, 'index'])->name('users.index')->middleware('permission:view_users');
    Route::get('/admin/users/create', [UserManagementController::class, 'create'])->name('users.create')->middleware('permission:create_users');
    Route::post('/admin/users', [UserManagementController::class, 'store'])->name('users.store')->middleware('permission:create_users');
    Route::get('/admin/users/{user}/edit', [UserManagementController::class, 'edit'])->name('users.edit')->middleware('permission:edit_users');
    Route::patch('/admin/users/{user}', [UserManagementController::class, 'update'])->name('users.update')->middleware('permission:edit_users');
    Route::delete('/admin/users/{user}', [UserManagementController::class, 'destroy'])->name('users.destroy')->middleware('permission:delete_users');
});

Route::patch('/profile/update-theme', [ProfileController::class, 'updateTheme'])->name('profile.update-theme');