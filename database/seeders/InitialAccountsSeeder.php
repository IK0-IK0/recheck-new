<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use InvalidArgumentException;

class InitialAccountsSeeder extends Seeder
{
    /**
     * Create the configured initial admin and institution accounts.
     */
    public function run(): void
    {
        $adminPassword = config('services.initial_accounts.admin_password');
        $institutionPassword = config('services.initial_accounts.institution_password');

        if (! is_string($adminPassword) || $adminPassword === '' ||
            ! is_string($institutionPassword) || $institutionPassword === '') {
            throw new InvalidArgumentException(
                'Set BOOTSTRAP_ADMIN_PASSWORD and BOOTSTRAP_INSTITUTION_PASSWORD before starting the application.',
            );
        }

        $this->ensureAccount(
            name: 'Francis Neil',
            email: 'franzilator9@gmail.com',
            role: 'admin',
            password: $adminPassword,
        );

        $this->ensureAccount(
            name: 'University of the Immaculate Conception',
            email: 'albarracincuadra@gmail.com',
            role: 'institution',
            password: $institutionPassword,
        );
    }

    private function ensureAccount(string $name, string $email, string $role, string $password): void
    {
        $user = User::query()->firstOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'role' => $role,
                'password' => $password,
                'email_verified_at' => now(),
            ],
        );

        if (! $user->wasRecentlyCreated) {
            $user->forceFill([
                'name' => $name,
                'role' => $role,
            ])->save();
        }
    }
}
