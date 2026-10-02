<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class TenantPermissionSeeder extends Seeder
{
    /**
     * Seed the default permissions for an institution tenant.
     */
    public function run(): void
    {
        $permissions = [
            'proposal.view.all',
            'proposal.view.assigned',
            'proposal.view.own',
            'proposal.submit',
            'proposal.request_changes',
            'file.upload',
            'file.download',
            'file.delete',
            'file.version',
            'review.comment',
            'review.submit',
            'review.recommend',
            'decision.issue',
            'user.manage',
            'role.manage',
            'workflow.manage',
            'audit.view',
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name]);
        }
    }
}
