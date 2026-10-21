<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\TenantUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class TenantUserSeeder extends Seeder
{
    /**
     * Seed the tenant database with initial user and institution role.
     */
    public function run(): void
    {
        // Ensure we're using the tenant connection
        DB::setDefaultConnection('tenant');

        // Create institution role if it doesn't exist
        $institutionRole = Role::firstOrCreate(
            ['name' => 'institution'],
            ['name' => 'institution']
        );

        // Create the user if it doesn't exist
        $user = TenantUser::firstOrCreate(
            ['email' => 'user123@gmail.com'],
            [
                'name' => 'user',
                'email' => 'user123@gmail.com',
                'password' => Hash::make('user123'),
            ]
        );

        // Attach institution role to the user if not already attached
        if (! $user->roles()->where('role_id', $institutionRole->id)->exists()) {
            $user->roles()->attach($institutionRole->id);
        }

        // Create institution metadata entry
        DB::connection('tenant')->table('institution_metadata')->updateOrInsert(
            ['institution_id' => 1],
            [
                'name' => 'University of the Immaculate Conception',
                'email' => 'admin@uic.edu.ph',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        $this->command->info('✓ Created institution role');
        $this->command->info('✓ Created user: user123@gmail.com');
        $this->command->info('✓ Assigned institution role to user');
        $this->command->info('✓ Created institution metadata: University of the Immaculate Conception');

        // Reset to default connection
        DB::setDefaultConnection(config('database.default'));
    }
}
