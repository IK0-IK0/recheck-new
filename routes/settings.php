<?php

use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use App\Http\Controllers\Settings\SetupController;
use App\Http\Controllers\Settings\StorageController;
use Illuminate\Auth\Middleware\RequirePassword;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/institution');

    Route::get('settings/institution', [SetupController::class, 'edit'])->name('institution.edit');
    Route::patch('settings/institution', [SetupController::class, 'update'])->name('institution.update');

    Route::get('settings/database', [SetupController::class, 'edit'])->name('database.edit');
    Route::post('settings/database', [SetupController::class, 'storeDatabase'])->name('database.store');
    Route::post('settings/database/migrate', [SetupController::class, 'migrate'])->name('database.migrate');

    Route::get('settings/storage', [StorageController::class, 'edit'])->name('storage.edit');
    Route::post('settings/storage', [StorageController::class, 'store'])->name('storage.store');
    Route::post('settings/storage/buckets/list', [StorageController::class, 'listBuckets'])->name('storage.buckets.list');
    Route::post('settings/storage/buckets/create', [StorageController::class, 'createBucket'])->name('storage.buckets.create');

    Route::inertia('settings/notifications', 'settings/notifications')->name('notifications.edit');
    Route::inertia('settings/subscription', 'settings/subscription')->name('subscription.edit');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])
        ->middleware(RequirePassword::class)
        ->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');
});
