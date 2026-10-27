<?php

use App\Models\User;
use Database\Seeders\InitialAccountsSeeder;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

test('initial accounts are created with their roles and seeding does not reset passwords', function (): void {
    $application = require dirname(__DIR__, 2).'/bootstrap/app.php';
    $application->make(Kernel::class)->bootstrap();

    Config::set('database.connections.sqlite.database', ':memory:');
    DB::purge('sqlite');

    Schema::connection('sqlite')->create('users', function (Blueprint $table): void {
        $table->id();
        $table->string('name');
        $table->string('email')->unique();
        $table->timestamp('email_verified_at')->nullable();
        $table->string('password');
        $table->string('role')->default('institution');
        $table->rememberToken();
        $table->timestamps();
    });

    Config::set('services.initial_accounts', [
        'admin_password' => 'admin-initial-password',
        'institution_password' => 'institution-initial-password',
    ]);

    $seeder = new InitialAccountsSeeder;
    $seeder->run();

    $admin = User::query()->where('email', 'franzilator9@gmail.com')->firstOrFail();
    $institution = User::query()->where('email', 'albarracincuadra@gmail.com')->firstOrFail();

    expect($admin->name)->toBe('Francis Neil')
        ->and($admin->role)->toBe('admin')
        ->and(Hash::check('admin-initial-password', $admin->password))->toBeTrue()
        ->and($institution->name)->toBe('University of the Immaculate Conception')
        ->and($institution->role)->toBe('institution')
        ->and(Hash::check('institution-initial-password', $institution->password))->toBeTrue();

    Config::set('services.initial_accounts.admin_password', 'rotated-admin-password');
    Config::set('services.initial_accounts.institution_password', 'rotated-institution-password');
    $seeder->run();

    expect(Hash::check('admin-initial-password', $admin->fresh()->password))->toBeTrue()
        ->and(Hash::check('institution-initial-password', $institution->fresh()->password))->toBeTrue();
});
