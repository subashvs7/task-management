<?php

namespace Database\Seeders;

use App\Models\Company;
use Illuminate\Database\Seeder;

class CompanySeeder extends Seeder
{
    public function run(): void
    {
        Company::firstOrCreate(
            ['slug' => 'zazu-technologies'],
            [
                'name' => 'Zazu Technologies',
                'slug' => 'zazu-technologies',
                'website' => 'https://zazu.com',
                'description' => 'Zazu Technologies Company',
                'is_active' => true,
            ]
        );
    }
}