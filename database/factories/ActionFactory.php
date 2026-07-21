<?php

namespace Database\Factories;

use App\Models\Action;
use App\Models\Phase;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Action>
 */
class ActionFactory extends Factory
{
    /**
     * The model the factory corresponds to.
     *
     * @var class-string<Action>
     */
    protected $model = Action::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'phase_id' => Phase::factory(),
            'name' => fake()->sentence(2),
            'description' => fake()->optional()->paragraph(),
            'order' => fake()->numberBetween(0, 100),
        ];
    }
}
