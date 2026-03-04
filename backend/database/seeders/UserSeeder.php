<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::where('slug', 'acme-corp')->first();

        $users = [
            ['name' => 'Admin User', 'email' => 'admin@example.com', 'role' => 'admin'],
            ['name' => 'Manager User', 'email' => 'manager@example.com', 'role' => 'manager'],
            ['name' => 'Team Leader', 'email' => 'teamleader@example.com', 'role' => 'team_leader'],
            ['name' => 'Developer User', 'email' => 'developer@example.com', 'role' => 'developer'],
            ['name' => 'Designer User', 'email' => 'designer@example.com', 'role' => 'designer'],
            ['name' => 'Tester User', 'email' => 'tester@example.com', 'role' => 'tester'],
            ['name' => 'HR User', 'email' => 'hr@example.com', 'role' => 'hr'],
        ];

        foreach ($users as $userData) {
            $user = User::firstOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'email' => $userData['email'],
                    'password' => Hash::make('password'),
                    'company_id' => $company?->id,
                    'is_active' => true,
                ]
            );
            $user->assignRole($userData['role']);
        }
    }
}