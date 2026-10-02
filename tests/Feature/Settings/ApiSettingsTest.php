<?php

use App\Models\AdminApiConfig;
use App\Models\User;
use App\Services\IlovePdfService;
use Illuminate\Http\UploadedFile;
use Mockery\MockInterface;

test('an administrator can detect forms in a PDF through iLovePDF', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    AdminApiConfig::query()->create([
        'ilove_public_key' => 'public-key',
        'ilove_secret_key' => 'secret-key',
    ]);
    $this->mock(IlovePdfService::class, function (MockInterface $mock): void {
        $mock->shouldReceive('detectForms')
            ->once()
            ->withArgs(fn (string $filePath, string $publicKey, string $secretKey): bool => is_string($filePath)
                && str_ends_with($filePath, 'ilovepdf-forms.pdf')
                && $publicKey === 'public-key'
                && $secretKey === 'secret-key')
            ->andReturn('%PDF-detected');
    });

    $response = $this
        ->actingAs($admin)
        ->post(route('api.forms-detect'), [
            'pdf' => UploadedFile::fake()->create('input.pdf', 10, 'application/pdf'),
        ]);

    $response
        ->assertOk()
        ->assertDownload('forms-detected.pdf');
});
