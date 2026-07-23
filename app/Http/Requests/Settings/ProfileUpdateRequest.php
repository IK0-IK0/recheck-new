<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * The 13 valid theme color options.
     *
     * @var list<string>
     */
    public const THEME_COLORS = [
        'zinc', 'slate', 'stone', 'gray', 'neutral',
        'red', 'rose', 'orange', 'amber', 'yellow',
        'lime', 'green', 'teal',
    ];

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return $this->profileRules($this->user()->id);
    }
}
