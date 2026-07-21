<?php

namespace Database\Seeders;

use App\Models\Document;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DocumentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get the first user or create one if none exists
        $user = User::first() ?? User::factory()->create();

        // Create sample documents
        Document::factory()->create([
            'user_id' => $user->id,
            'name' => 'Application Form',
            'label' => 'forms',
            'file_size' => 2400000, // 2.4 MB
            'file_type' => 'application/pdf',
        ]);

        Document::factory()->create([
            'user_id' => $user->id,
            'name' => 'Identity Document',
            'label' => 'docs',
            'file_size' => 1800000, // 1.8 MB
            'file_type' => 'image/jpeg',
        ]);

        Document::factory()->create([
            'user_id' => $user->id,
            'name' => 'Tax Form 2024',
            'label' => 'forms',
            'file_size' => 3200000, // 3.2 MB
            'file_type' => 'application/pdf',
        ]);

        Document::factory()->create([
            'user_id' => $user->id,
            'name' => 'Passport Scan',
            'label' => 'docs',
            'file_size' => 4100000, // 4.1 MB
            'file_type' => 'image/png',
        ]);

        Document::factory()->create([
            'user_id' => $user->id,
            'name' => 'Registration Form',
            'label' => 'forms',
            'file_size' => 1500000, // 1.5 MB
            'file_type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]);

        // Create additional random documents
        Document::factory(10)->create(['user_id' => $user->id]);
    }
}
