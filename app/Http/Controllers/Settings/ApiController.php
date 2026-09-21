<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AdminApiConfig;
use App\Services\IlovePdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

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

    public function formsDetect(Request $request, IlovePdfService $ilovePdfService): SymfonyResponse|JsonResponse
    {
        abort_unless($request->user()->role === 'admin', 403);

        $config = AdminApiConfig::query()->first();

        if (! $config?->ilove_public_key || ! $config->ilove_secret_key) {
            return response()->json(['message' => 'Save both iLovePDF keys before testing the connection.'], 422);
        }

        $validated = $request->validate([
            'pdf' => ['required', 'file', 'mimes:pdf', 'max:10240'],
        ]);

        $renamedFiles = [];

        try {
            $temporaryPath = $validated['pdf']->getRealPath();
            $pdfPath = dirname($temporaryPath).DIRECTORY_SEPARATOR.'ilovepdf-forms.pdf';

            if (! rename($temporaryPath, $pdfPath)) {
                throw new \RuntimeException('Unable to prepare the uploaded PDF for iLovePDF.');
            }
            $renamedFiles[$pdfPath] = $temporaryPath;

            $detectedFormsPdf = $ilovePdfService->detectForms(
                $pdfPath,
                $config->ilove_public_key,
                $config->ilove_secret_key,
            );

            return response($detectedFormsPdf, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="forms-detected.pdf"',
            ]);
        } catch (\Throwable $exception) {
            return response()->json(['message' => 'iLovePDF form detection failed: '.$exception->getMessage()], 502);
        } finally {
            foreach ($renamedFiles as $pdfPath => $temporaryPath) {
                if (is_file($pdfPath)) {
                    rename($pdfPath, $temporaryPath);
                }
            }
        }
    }
}
