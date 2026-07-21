<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DocumentManagementIntegrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_users_can_access_document_management_page(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('documents'));

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('DocumentManagement')
            ->has('documents', 5)
        );
    }

    public function test_unauthenticated_users_are_redirected_to_login(): void
    {
        $response = $this->get(route('documents'));

        $response->assertRedirect(route('login'));
    }

    public function test_mock_data_includes_both_label_types(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('documents'));

        $response->assertInertia(fn ($page) => $page
            ->component('DocumentManagement')
            ->where('documents', fn ($documents) => 
                collect($documents)->contains('label', 'forms') &&
                collect($documents)->contains('label', 'uploadable')
            )
        );
    }

    public function test_mock_data_has_required_fields(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get(route('documents'));

        $response->assertInertia(fn ($page) => $page
            ->component('DocumentManagement')
            ->where('documents.0', fn ($document) => 
                isset($document['id']) &&
                isset($document['name']) &&
                isset($document['label']) &&
                isset($document['uploadedAt']) &&
                isset($document['size'])
            )
        );
    }

    public function test_route_is_named_documents(): void
    {
        $this->assertTrue(route('documents') !== null);
    }
}
