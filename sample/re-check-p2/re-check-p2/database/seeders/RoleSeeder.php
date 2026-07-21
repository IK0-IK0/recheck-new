<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Admin role with all permissions
        $adminRole = Role::firstOrCreate(
            ['name' => 'Admin'],
            [
                'description' => 'System administrator with full access to all features',
            ]
        );
        $adminRole->is_protected = 1;
        $adminRole->save();

        // Assign all permissions to Admin
        $allPermissions = Permission::all()->pluck('id');
        $adminRole->permissions()->sync($allPermissions);

        // Create User role with basic permissions
        $userRole = Role::firstOrCreate(
            ['name' => 'User'],
            [
                'description' => 'Basic user with limited access',
            ]
        );
        $userRole->is_protected = 1;
        $userRole->save();

        // Assign basic permissions to User role
        $userPermissions = Permission::whereIn('name', [
            'view_dashboard',
            'view_processes',
        ])->pluck('id');
        $userRole->permissions()->sync($userPermissions);

        // Create Process Manager role
        $processManagerRole = Role::firstOrCreate(
            ['name' => 'Process Manager'],
            [
                'description' => 'Can manage all processes but not users or roles',
            ]
        );
        $processManagerRole->is_protected = 0;
        $processManagerRole->save();

        // Assign process management permissions
        $processManagerPermissions = Permission::whereIn('name', [
            'view_dashboard',
            'view_processes',
            'create_processes',
            'edit_processes',
            'delete_processes',
            'view_reports',
            'export_data',
        ])->pluck('id');
        $processManagerRole->permissions()->sync($processManagerPermissions);

        $this->command->info('Roles seeded successfully!');
    }
}
