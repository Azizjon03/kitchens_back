<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Validatsiya xabarlari o'zbekcha (#9). Production: APP_LOCALE=uz. */
class UzbekValidationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app->setLocale('uz');
    }

    public function test_required_fields_are_reported_in_uzbek_with_field_names(): void
    {
        $this->postJson('/api/v1/auth/login', [])
            ->assertStatus(422)
            ->assertJsonPath('errors.phone.0', 'Telefon raqam kiritilishi shart.')
            ->assertJsonPath('errors.password.0', 'Parol kiritilishi shart.');
    }

    public function test_every_validation_rule_used_by_the_app_has_an_uzbek_message(): void
    {
        $rules = [
            'required', 'string', 'max', 'min', 'unique', 'exists', 'in',
            'numeric', 'gt', 'integer', 'array', 'boolean', 'regex', 'confirmed',
        ];

        foreach ($rules as $rule) {
            $this->assertNotSame(
                "validation.{$rule}",
                trans("validation.{$rule}", [], 'uz'),
                "validation.{$rule} uchun o'zbekcha xabar yo'q",
            );
            $this->assertNotEquals(
                trans("validation.{$rule}", [], 'en'),
                trans("validation.{$rule}", [], 'uz'),
                "validation.{$rule} hali inglizcha",
            );
        }
    }
}
