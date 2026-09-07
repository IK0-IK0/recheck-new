<?php

namespace App\Storage;

use Illuminate\Support\Facades\Http;
use League\Flysystem\Config;
use League\Flysystem\FileAttributes;
use League\Flysystem\FilesystemAdapter;
use League\Flysystem\UnableToCheckFileExistence;
use League\Flysystem\UnableToDeleteFile;
use League\Flysystem\UnableToReadFile;
use League\Flysystem\UnableToWriteFile;

class SupabaseStorageAdapter implements FilesystemAdapter
{
    public function __construct(
        private string $projectUrl,
        private string $serviceRoleKey,
        private string $bucket
    ) {}

    public function fileExists(string $path): bool
    {
        try {
            $url = "{$this->projectUrl}/storage/v1/object/{$this->bucket}/{$path}";

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->serviceRoleKey}",
                'apikey' => $this->serviceRoleKey,
            ])->head($url);

            return $response->successful();
        } catch (\Exception $e) {
            throw UnableToCheckFileExistence::forLocation($path, $e);
        }
    }

    public function directoryExists(string $path): bool
    {
        // Supabase doesn't have directories - always return true
        return true;
    }

    public function write(string $path, string $contents, Config $config): void
    {
        try {
            $url = "{$this->projectUrl}/storage/v1/object/{$this->bucket}/{$path}";

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->serviceRoleKey}",
                'apikey' => $this->serviceRoleKey,
                'Content-Type' => $config->get('mimetype') ?? 'application/octet-stream',
            ])->withBody($contents, $config->get('mimetype') ?? 'application/octet-stream')
                ->post($url);

            if (! $response->successful()) {
                throw new \Exception('Supabase API error: '.$response->body());
            }
        } catch (\Exception $e) {
            throw UnableToWriteFile::atLocation($path, $e->getMessage(), $e);
        }
    }

    public function writeStream(string $path, $contents, Config $config): void
    {
        $this->write($path, stream_get_contents($contents), $config);
    }

    public function read(string $path): string
    {
        try {
            $url = "{$this->projectUrl}/storage/v1/object/{$this->bucket}/{$path}";

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->serviceRoleKey}",
                'apikey' => $this->serviceRoleKey,
            ])->get($url);

            if (! $response->successful()) {
                throw new \Exception('File not found or access denied');
            }

            return $response->body();
        } catch (\Exception $e) {
            throw UnableToReadFile::fromLocation($path, $e->getMessage(), $e);
        }
    }

    public function readStream(string $path)
    {
        $resource = fopen('php://temp', 'r+');
        fwrite($resource, $this->read($path));
        rewind($resource);

        return $resource;
    }

    public function delete(string $path): void
    {
        try {
            $url = "{$this->projectUrl}/storage/v1/object/{$this->bucket}/{$path}";

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->serviceRoleKey}",
                'apikey' => $this->serviceRoleKey,
            ])->delete($url);

            if (! $response->successful() && $response->status() !== 404) {
                throw new \Exception('Failed to delete file: '.$response->body());
            }
        } catch (\Exception $e) {
            throw UnableToDeleteFile::atLocation($path, $e->getMessage(), $e);
        }
    }

    public function deleteDirectory(string $path): void
    {
        // Supabase doesn't have directories - no-op
    }

    public function createDirectory(string $path, Config $config): void
    {
        // Supabase doesn't have directories - no-op
    }

    public function setVisibility(string $path, string $visibility): void
    {
        // Visibility is controlled by bucket policies in Supabase
    }

    public function visibility(string $path): FileAttributes
    {
        return new FileAttributes($path);
    }

    public function mimeType(string $path): FileAttributes
    {
        return new FileAttributes($path);
    }

    public function lastModified(string $path): FileAttributes
    {
        return new FileAttributes($path);
    }

    public function fileSize(string $path): FileAttributes
    {
        return new FileAttributes($path);
    }

    public function listContents(string $path, bool $deep): iterable
    {
        // List contents using Supabase REST API
        $url = "{$this->projectUrl}/storage/v1/object/list/{$this->bucket}";

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->serviceRoleKey}",
            'apikey' => $this->serviceRoleKey,
        ])->post($url, [
            'prefix' => $path,
            'limit' => 1000,
        ]);

        if (! $response->successful()) {
            return [];
        }

        $items = $response->json();
        $results = [];

        foreach ($items as $item) {
            $results[] = new FileAttributes(
                $item['name'],
                $item['metadata']['size'] ?? null,
                null,
                $item['updated_at'] ?? null
            );
        }

        return $results;
    }

    public function move(string $source, string $destination, Config $config): void
    {
        $this->copy($source, $destination, $config);
        $this->delete($source);
    }

    public function copy(string $source, string $destination, Config $config): void
    {
        $contents = $this->read($source);
        $this->write($destination, $contents, $config);
    }
}
