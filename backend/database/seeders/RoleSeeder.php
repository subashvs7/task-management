<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'view-company-stats',
            'manage-companies',
            'manage-users',
            'manage-roles',
            'view-all-projects',
            'create-project',
            'edit-project',
            'delete-project',
            'manage-project-members',
            'view-project',
            'create-task',
            'edit-task',
            'delete-task',
            'assign-task',
            'view-task',
            'create-sprint',
            'manage-sprint',
            'view-reports',
            'export-reports',
            'manage-hr',
            'view-hr-data',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $roles = [
            'admin' => $permissions,
            'manager' => [
                'view-company-stats',
                'view-all-projects',
                'create-project',
                'edit-project',
                'manage-project-members',
                'view-project',
                'create-task',
                'edit-task',
                'assign-task',
                'view-task',
                'create-sprint',
                'manage-sprint',
                'view-reports',
                'export-reports',
            ],
            'team_leader' => [
                'view-project',
                'create-task',
                'edit-task',
                'assign-task',
                'view-task',
                'create-sprint',
                'manage-sprint',
                'view-reports',
            ],
            'developer' => [
                'view-project',
                'create-task',
                'edit-task',
                'view-task',
            ],
            'designer' => [
                'view-project',
                'create-task',
                'edit-task',
                'view-task',
            ],
            'tester' => [
                'view-project',
                'view-task',
                'create-task',
                'edit-task',
            ],
            'hr' => [
                'manage-hr',
                'view-hr-data',
                'manage-users',
            ],
        ];

        foreach ($roles as $roleName => $rolePermissions) {
            $role = Role::firstOrCreate(['name' => $roleName]);
            $role->syncPermissions($rolePermissions);
        }
    }
}