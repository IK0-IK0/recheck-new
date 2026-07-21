<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            // User Management
            [
                'name' => 'view_users',
                'display_name' => 'View Users',
                'description' => 'Can view user list and details',
                'category' => 'user_management',
            ],
            [
                'name' => 'create_users',
                'display_name' => 'Create Users',
                'description' => 'Can create new users',
                'category' => 'user_management',
            ],
            [
                'name' => 'edit_users',
                'display_name' => 'Edit Users',
                'description' => 'Can edit existing users',
                'category' => 'user_management',
            ],
            [
                'name' => 'delete_users',
                'display_name' => 'Delete Users',
                'description' => 'Can delete users',
                'category' => 'user_management',
            ],
            [
                'name' => 'assign_roles',
                'display_name' => 'Assign Roles',
                'description' => 'Can assign roles to users',
                'category' => 'user_management',
            ],

            // Role Management
            [
                'name' => 'view_roles',
                'display_name' => 'View Roles',
                'description' => 'Can view role list and details',
                'category' => 'role_management',
            ],
            [
                'name' => 'create_roles',
                'display_name' => 'Create Roles',
                'description' => 'Can create new roles',
                'category' => 'role_management',
            ],
            [
                'name' => 'edit_roles',
                'display_name' => 'Edit Roles',
                'description' => 'Can edit existing roles',
                'category' => 'role_management',
            ],
            [
                'name' => 'delete_roles',
                'display_name' => 'Delete Roles',
                'description' => 'Can delete roles',
                'category' => 'role_management',
            ],
            [
                'name' => 'manage_permissions',
                'display_name' => 'Manage Permissions',
                'description' => 'Can assign permissions to roles',
                'category' => 'role_management',
            ],

            // Process Management
            [
                'name' => 'view_processes',
                'display_name' => 'View Processes',
                'description' => 'Can view process list and details',
                'category' => 'process_management',
            ],
            [
                'name' => 'create_processes',
                'display_name' => 'Create Processes',
                'description' => 'Can create new processes',
                'category' => 'process_management',
            ],
            [
                'name' => 'edit_processes',
                'display_name' => 'Edit Processes',
                'description' => 'Can edit existing processes',
                'category' => 'process_management',
            ],
            [
                'name' => 'delete_processes',
                'display_name' => 'Delete Processes',
                'description' => 'Can delete processes',
                'category' => 'process_management',
            ],

            // Dashboard & Reports
            [
                'name' => 'view_dashboard',
                'display_name' => 'View Dashboard',
                'description' => 'Can access dashboard',
                'category' => 'general',
            ],
            [
                'name' => 'view_reports',
                'display_name' => 'View Reports',
                'description' => 'Can view reports and analytics',
                'category' => 'general',
            ],
            [
                'name' => 'export_data',
                'display_name' => 'Export Data',
                'description' => 'Can export data to various formats',
                'category' => 'general',
            ],

            // System Settings
            [
                'name' => 'manage_settings',
                'display_name' => 'Manage Settings',
                'description' => 'Can manage system settings',
                'category' => 'system',
            ],
            [
                'name' => 'view_logs',
                'display_name' => 'View Logs',
                'description' => 'Can view system logs',
                'category' => 'system',
            ],
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission['name']],
                $permission
            );
        }

        $this->command->info('Permissions seeded successfully!');
    }
}
