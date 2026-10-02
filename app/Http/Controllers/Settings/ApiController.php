<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AdminApiConfig;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class ApiController extends Controller
{
    public function edit(Request $request): Response
    {
        abort_unless($request->user()->role === 'admin', 403);

        $config = AdminApiConfig::query()->first();

        return Inertia::render('settings/api', [
            'iloveApiConfigured' => [
                'publicKey' => filled($config?->ilove_public_key),
                'secretKey' => filled($config?->ilove_secret_key),
            ],
            'apiTest' => $request->session()->get('apiTest'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $validated = $request->validate([
            'ilove_public_key' => ['nullable', 'string', 'max:255'],
            'ilove_secret_key' => ['nullable', 'string', 'max:255'],
        ]);

        $config = AdminApiConfig::query()->firstOrNew();

        foreach (['ilove_public_key', 'ilove_secret_key'] as $key) {
            if (filled($validated[$key] ?? null)) {
                $config->{$key} = $validated[$key];
            }
        }

        $config->save();

        return to_route('api.edit');
    }

    public function test(Request $request): RedirectResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $config = AdminApiConfig::query()->first();

        if (! $config?->ilove_public_key || ! $config->ilove_secret_key) {
            return to_route('api.edit')->with('apiTest', [
                'status' => 'error',
                'message' => 'Save both iLovePDF keys before testing the connection.',
            ]);
        }

        try {
            $token = $this->createToken($config->ilove_public_key, $config->ilove_secret_key);
            $response = Http::acceptJson()
                ->withToken($token)
                ->timeout(15)
                ->get('https://api.ilovepdf.com/v1/start/compress/eu');

            if ($response->failed()) {
                $message = $response->json('error.message')
                    ?? $response->json('message')
                    ?? 'iLovePDF rejected the credentials.';

                throw new \RuntimeException((string) $message);
            }

            return to_route('api.edit')->with('apiTest', [
                'status' => 'success',
                'message' => 'iLovePDF connection verified successfully.',
            ]);
        } catch (\Throwable $exception) {
            return to_route('api.edit')->with('apiTest', [
                'status' => 'error',
                'message' => 'iLovePDF connection failed: '.$exception->getMessage(),
            ]);
        }
    }

    private function createToken(string $publicKey, string $secretKey): string
    {
        $header = $this->base64UrlEncode(json_encode(['typ' => 'JWT', 'alg' => 'HS256'], JSON_THROW_ON_ERROR));
        $payload = $this->base64UrlEncode(json_encode([
            'iss' => $publicKey,
            'aud' => 'api.ilovepdf.com',
            'iat' => now()->timestamp,
            'exp' => now()->addMinutes(5)->timestamp,
        ], JSON_THROW_ON_ERROR));
        $signature = hash_hmac('sha256', $header.'.'.$payload, $secretKey, true);

        return $header.'.'.$payload.'.'.$this->base64UrlEncode($signature);
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

}