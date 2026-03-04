<?php

namespace Database\Seeders;

use App\Models\Company;
use Illuminate\Database\Seeder;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        Company::firstOrCreate(
            ['slug' => 'acme-corp'],
            [
                'name' => 'Acme Corporation',
                'slug' => 'acme-corp',
                'website' => 'https://acme.example.com',
                'description' => 'A sample company for testing',
                'is_active' => true,
            ]
        );
    }
}