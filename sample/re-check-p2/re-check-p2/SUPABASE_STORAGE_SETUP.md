# Supabase Storage Setup Guide

This guide explains how to set up Supabase storage using the `laravel-supabase-flysystem` package for document uploads in your Laravel application.

## Installation

The package is already installed:

```bash
composer require quix-labs/laravel-supabase-flysystem
```

## Configuration

### 1. Environment Variables

Add the following to your `.env` file:

```env
SUPABASE_KEY=your_anon_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_BUCKET=files
```

To get these values:
- Go to your Supabase project dashboard
- Navigate to Settings > API
- Copy the `anon` key (public key) for `SUPABASE_KEY`
- Copy the Project URL for `SUPABASE_URL` (without /storage/v1)

### 2. Filesystem Configuration

The Supabase disk is configured in `config/filesystems.php`:

```php
'supabase' => [
    'driver' => 'supabase',
    'key' => env('SUPABASE_KEY'),
    'bucket' => env('SUPABASE_BUCKET', 'files'),
    'endpoint' => env('SUPABASE_URL'),
    'url' => null,
    'public' => true,
    'defaultUrlGeneration' => null,
    'defaultUrlGenerationOptions' => [
        'download' => false,
        'transform' => [],
    ],
    'signedUrlExpires' => 60 * 60 * 24, // 1 day
],
```

### 3. Create Storage Bucket

In your Supabase dashboard:
1. Go to Storage
2. Create a new bucket named `files` (or whatever you set in SUPABASE_BUCKET)
3. Set it as public if you want direct file access
4. Configure policies:
   - Allow INSERT for authenticated users
   - Allow SELECT for public access (if public bucket)
   - Allow DELETE for authenticated users

## Usage

### Uploading Files

```php
$folder = 'documents/';
$filename = Storage::disk('supabase')->put($folder, $request->file('file'));
```

### Getting Public URL

```php
$publicUrl = Storage::disk('supabase')->getAdapter()->getPublicUrl($filename);
```

### Deleting Files

```php
if (!empty($filename) && Storage::disk('supabase')->exists($filename)) {
    Storage::disk('supabase')->delete($filename);
}
```

## Implementation in DocumentManagementController

The controller uses the Supabase Flysystem adapter:

- `store()` - Uploads new documents to Supabase
- `update()` - Replaces existing documents in Supabase
- `destroy()` - Deletes documents from Supabase
- `testStorage()` - Tests the Supabase connection

## Testing

Test the storage connection:
```bash
php artisan config:clear
```

Then visit: `http://localhost:8000/api/test-storage`

## Troubleshooting

If uploads fail:

1. **Check your credentials:**
   - Verify `SUPABASE_KEY` is the anon key from Settings > API
   - Verify `SUPABASE_URL` is correct (e.g., https://xxxxx.supabase.co)
   - Ensure the bucket name matches what's in your Supabase dashboard

2. **Check bucket configuration:**
   - Bucket must exist in Supabase Storage
   - Check bucket policies allow INSERT operations
   - For public access, ensure bucket is set to public

3. **Clear config cache:**
   ```bash
   php artisan config:clear
   ```

4. **Check Laravel logs:**
   ```
   storage/logs/laravel.log
   ```

5. **Common issues:**
   - "key is not specified" - SUPABASE_KEY is missing or empty
   - "endpoint is not specified" - SUPABASE_URL is missing or empty
   - SSL certificate errors - May need to configure SSL verification
   - Upload returns false - Check bucket policies and permissions

## Package Documentation

For more details, see: https://github.com/quix-labs/laravel-supabase-flysystem
