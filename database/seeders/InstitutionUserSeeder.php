<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class InstitutionUserSeeder extends Seeder
{
    /**
     * Seed the superadmin database with tenant user for institution.
     */
    public function run(): void
    {
        // Check if user already exists
        $existingUser = DB::table('tenant_users')
            ->where('email', 'user123@gmail.com')
            ->first();

        if ($existingUser) {
            DB::table('tenant_users')
                ->where('id', $existingUser->id)
                ->update(['institution_id' => 1]);
            $this->command->warn('⚠ Tenant user already exists');
            $this->command->info('  - Tenant User ID: '.$existingUser->id);
            $this->command->info('  - Email: '.$existingUser->email);

            return;
        }

        // Create the tenant user in the superadmin database
        $tenantUserId = DB::table('tenant_users')->insertGetId([
            'name' => 'user',
            'institution_id' => 1,
            'email' => 'user123@gmail.com',
            'password' => Hash::make('user123'),
            'email_verified_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->command->info('✓ Created tenant user in superadmin database');
        $this->command->info('  - Name: user');
        $this->command->info('  - Email: user123@gmail.com');
        $this->command->info('  - Password: user123');
        $this->command->info('  - Tenant User ID: '.$tenantUserId);
        $this->command->info('  - Assigned to institution user ID: 1');
        $this->command->info('');
        $this->command->info('This user is stored in the superadmin.tenant_users table');
    }
}
