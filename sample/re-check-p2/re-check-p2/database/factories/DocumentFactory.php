<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Document>
 */
class DocumentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $fileTypes = ['pdf', 'doc', 'docx', 'jpg', 'png'];
        $fileType = $this->faker->randomElement($fileTypes);
        
        return [
            'user_id' => User::factory(),
            'name' => $this->faker->words(3, true),
            'label' => $this->faker->randomElement(['forms', 'docs']),
            'file_path' => 'documents/' . $this->faker->uuid() . '.' . $fileType,
            'file_size' => $this->faker->numberBetween(1024, 50 * 1024 * 1024), // 1KB to 50MB
            'file_type' => 'application/' . $fileType,
            'config' => [
                'original_name' => $this->faker->words(2, true) . '.' . $fileType,
                'uploaded_by' => $this->faker->name(),
            ],
        ];
    }

    /**
     * Indicate that the document is a form.
     */
    public function form(): static
    {
        return $this->state(fn (array $attributes) => [
            'label' => 'forms',
        ]);
    }

    /**
     * Indicate that the document is a doc.
     */
    public function doc(): static
    {
        return $this->state(fn (array $attributes) => [
            'label' => 'docs',
        ]);
    }
}
