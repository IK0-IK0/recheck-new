<?php

namespace Database\Factories;

use App\Models\Phase;
use App\Models\Process;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Phase>
 */
class PhaseFactory extends Factory
{
    /**
     * The model the factory corresponds to.
     *
     * @var class-string<Phase>
     */
    protected $model = Phase::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'process_id' => Process::factory(),
            'name' => fake()->sentence(2),
            'order' => fake()->numberBetween(0, 100),
        ];
    }
}
