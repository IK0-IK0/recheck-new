<?php

namespace Database\Factories;

use App\Models\Document;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Document>
 */
class DocumentFactory extends Factory
{
    /**
     * The model the factory corresponds to.
     *
     * @var class-string<Document>
     */
    protected $model = Document::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $filename = fake()->slug(3) . '.' . fake()->randomElement(['pdf', 'docx', 'xlsx', 'txt']);

        return [
            'name' => $filename,
            'file_path' => 'documents/' . $filename,
            'file_type' => fake()->mimeType(),
            'label' => fake()->randomElement(['form', 'doc']),
        ];
    }
}
