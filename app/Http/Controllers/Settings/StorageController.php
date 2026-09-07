<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\StorageConfig;
use Aws\S3\S3Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class StorageController extends Controller
{
    /**
     * Display the storage settings page.
     */
    public function edit(Request $request): Response
    {
        $activeConfig = StorageConfig::where('is_active', true)->first();

        return Inertia::render('settings/storage', [
            'currentConfig' => $activeConfig,
        ]);
    }

    /**
     * Store or update the storage configuration.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'driver' => ['required', 'string', Rule::in(['local', 's3'])],
            'root' => ['nullable', 'string', 'required_if:driver,local'],
            'endpoint' => ['nullable', 'string', 'required_if:driver,s3'],
            'region' => ['nullable', 'string'],
            'bucket' => ['nullable', 'string', 'required_if:driver,s3'],
            'access_key' => ['nullable', 'string', 'required_if:driver,s3'],
            'secret_key' => ['nullable', 'string', 'required_if:driver,s3'],
        ]);

        // Deactivate all existing configs
        StorageConfig::query()->update(['is_active' => false]);

        // Create new active config
        $config = StorageConfig::create([
            'driver' => $validated['driver'],
            'root' => $validated['root'] ?? null,
            'endpoint' => $validated['endpoint'] ?? null,
            'region' => $validated['region'] ?? 'us-east-1',
            'bucket' => $validated['bucket'] ?? null,
            'access_key' => $validated['access_key'] ?? null,
            'secret_key' => $validated['secret_key'] ?? null,
            'is_active' => true,
        ]);

        // Test the connection
        try {
            $this->testConnection($config);
        } catch (\Exception $e) {
            $config->delete();

            return redirect()->back()->withErrors([
                'connection' => 'Failed to connect to storage: '.$e->getMessage(),
            ]);
        }

        // Apply the configuration to the runtime
        $this->applyStorageConfig($config);

        return redirect()->back();
    }

    /**
     * Test the storage connection.
     */
    private function testConnection(StorageConfig $config): void
    {
        $diskConfig = $config->toFilesystemConfig();

        // Check if this is Supabase
        $isSupabase = $diskConfig['driver'] === 'supabase';

        // Build the disk dynamically
        $testDisk = Storage::build($diskConfig);

        // Try to write and read a test file
        $testContent = 'test-'.now()->timestamp;
        $testFileName = 'test-'.now()->timestamp.'.txt';

        try {
            // Write the test file
            $putOptions = [];
            if ($isSupabase) {
                $putOptions = ['mimetype' => 'text/plain'];
            }

            $putResult = $testDisk->put($testFileName, $testContent, $putOptions);

            if ($putResult === false) {
                throw new \Exception('Failed to write test file to storage');
            }

            // Try to read it back
            $readContent = $testDisk->get($testFileName);

            // Clean up
            $testDisk->delete($testFileName);

            // Verify content matches
            if (trim($readContent) !== trim($testContent)) {
                throw new \Exception('Storage test failed: content mismatch');
            }
        } catch (\Exception $e) {
            $message = $e->getMessage();

            if (str_contains($message, 'NoSuchBucket') || str_contains($message, '404') || str_contains($message, 'not found')) {
                throw new \Exception('Bucket does not exist. Please select a valid bucket from the list.');
            }

            if (str_contains($message, 'credentials') || str_contains($message, '403') || str_contains($message, 'Forbidden') || str_contains($message, 'InvalidAccessKeyId') || str_contains($message, 'access denied')) {
                throw new \Exception('Invalid credentials. Please check your access key and secret key.');
            }

            if (str_contains($message, 'Could not resolve host') || str_contains($message, 'Connection refused')) {
                throw new \Exception('Cannot connect to storage endpoint. Please verify the endpoint URL.');
            }

            throw new \Exception('Storage test failed: '.$message);
        }
    }

    /**
     * List available buckets from S3-compatible storage.
     */
    public function listBuckets(Request $request)
    {
        $validated = $request->validate([
            'endpoint' => ['required', 'string'],
            'region' => ['nullable', 'string'],
            'access_key' => ['required', 'string'],
            'secret_key' => ['required', 'string'],
        ]);

        try {
            $buckets = $this->fetchS3Buckets(
                $validated['endpoint'],
                $validated['region'] ?? 'us-east-1',
                $validated['access_key'],
                $validated['secret_key']
            );

            return response()->json(['buckets' => $buckets]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch buckets: '.$e->getMessage(),
            ], 400);
        }
    }

    /**
     * Create a new bucket in S3-compatible storage.
     */
    public function createBucket(Request $request)
    {
        $validated = $request->validate([
            'endpoint' => ['required', 'string'],
            'region' => ['nullable', 'string'],
            'access_key' => ['required', 'string'],
            'secret_key' => ['required', 'string'],
            'bucket_name' => ['required', 'string', 'max:63', 'regex:/^[a-z0-9][a-z0-9-]*[a-z0-9]$/'],
            'public' => ['boolean'],
        ]);

        try {
            $result = $this->createS3Bucket(
                $validated['endpoint'],
                $validated['region'] ?? 'us-east-1',
                $validated['access_key'],
                $validated['secret_key'],
                $validated['bucket_name']
            );

            return response()->json([
                'message' => 'Bucket created successfully',
                'bucket' => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create bucket: '.$e->getMessage(),
            ], 400);
        }
    }

    /**
     * Apply storage configuration to the runtime.
     */
    private function applyStorageConfig(StorageConfig $config): void
    {
        $diskConfig = $config->toFilesystemConfig();

        Config::set('filesystems.default', $config->driver);
        Config::set('filesystems.disks.'.$config->driver, $diskConfig);
    }

    /**
     * Fetch buckets from S3-compatible storage using AWS SDK.
     */
    private function fetchS3Buckets(string $endpoint, string $region, string $accessKey, string $secretKey): array
    {
        $s3Client = new S3Client([
            'version' => 'latest',
            'region' => $region,
            'endpoint' => $endpoint,
            'use_path_style_endpoint' => true,
            'credentials' => [
                'key' => $accessKey,
                'secret' => $secretKey,
            ],
        ]);

        $result = $s3Client->listBuckets();
        $buckets = [];

        foreach ($result['Buckets'] as $bucket) {
            $buckets[] = [
                'id' => $bucket['Name'],
                'name' => $bucket['Name'],
                'public' => false, // S3 doesn't provide this info in list
            ];
        }

        return $buckets;
    }

    /**
     * Create a new bucket in S3-compatible storage.
     */
    private function createS3Bucket(string $endpoint, string $region, string $accessKey, string $secretKey, string $bucketName): array
    {
        $s3Client = new S3Client([
            'version' => 'latest',
            'region' => $region,
            'endpoint' => $endpoint,
            'use_path_style_endpoint' => true,
            'credentials' => [
                'key' => $accessKey,
                'secret' => $secretKey,
            ],
        ]);

        $s3Client->createBucket([
            'Bucket' => $bucketName,
        ]);

        return [
            'id' => $bucketName,
            'name' => $bucketName,
        ];
    }
}
