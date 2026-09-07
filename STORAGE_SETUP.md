# Storage Configuration Guide

## Overview

The Recheck application supports multiple storage drivers for file uploads and documents:
- **Local**: Store files privately on the server
- **Public**: Store files publicly accessible via `/storage` URL
- **S3 Compatible**: AWS S3 or any S3-compatible service
- **Supabase Storage**: Use Supabase's cloud storage (S3-compatible)

## How Supabase Storage Works with Laravel

Supabase Storage provides an **S3-compatible API**, which means Laravel can connect to it using the built-in S3 filesystem driver. No special Supabase SDK is needed.

### Connection Flow

```
Laravel App → S3 Driver → Supabase S3 API → Supabase Storage Buckets
```

### What You Need from Supabase

1. **Project URL**
   - Example: `https://xxxxx.supabase.co`
   - Find: Supabase Dashboard → Project Settings → API

2. **Service Role Key**
   - This acts as both the access key and secret key
   - Find: Supabase Dashboard → Project Settings → API → Service Keys → `service_role` key
   - ⚠️ **Important**: Use `service_role` key (not `anon` key) for server-side storage operations

3. **Storage Endpoint**
   - Format: `https://YOUR-PROJECT-REF.supabase.co/storage/v1/s3`
   - This is your Project URL + `/storage/v1/s3`

4. **Bucket Name**
   - Create a bucket in Supabase Dashboard → Storage
   - Example: `documents`, `uploads`, `institution-files`
   - Configure bucket policies (public or private)

### Configuration in Recheck

1. Navigate to **Settings → Storage**

2. Select **Supabase Storage** driver

3. Fill in the form:
   - **Endpoint URL**: `https://xxxxx.supabase.co/storage/v1/s3`
   - **Region**: `us-east-1` (or any region, Supabase doesn't strictly enforce this)
   - **Bucket Name**: Your bucket name from Supabase
   - **Service Role Key**: Copy from Supabase API settings (use for both access key and secret key)

4. Click **Save Storage Settings**
   - The system will test the connection by uploading and reading a test file
   - If successful, the configuration is saved encrypted in the database
   - The storage driver is automatically configured on application boot

## Technical Implementation

### Database Storage

Storage configurations are stored in the `storage_configs` table in the **superadmin database**:

```php
// StorageConfig model
- driver: 'local' | 'public' | 's3' | 'supabase'
- endpoint: Supabase storage API URL (encrypted)
- region: AWS region or placeholder
- bucket: Bucket name
- access_key: Service role key (encrypted)
- secret_key: Service role key (encrypted)
- is_active: Boolean to mark the active configuration
```

### Encryption

Sensitive fields (`access_key`, `secret_key`) are **automatically encrypted** using Laravel's Crypt facade before saving to the database.

### Runtime Configuration

The `StorageServiceProvider` loads the active storage configuration on application boot:

```php
// Automatically configures Laravel's filesystem
Config::set('filesystems.disks.supabase', [
    'driver' => 's3',
    'key' => $config->access_key,
    'secret' => $config->secret_key,
    'region' => $config->region,
    'bucket' => $config->bucket,
    'endpoint' => $config->endpoint,
    'use_path_style_endpoint' => true,
]);
```

### Using Storage in Code

Once configured, use Laravel's Storage facade normally:

```php
use Illuminate\Support\Facades\Storage;

// Upload a file
Storage::disk('supabase')->put('documents/file.pdf', $fileContents);

// Get a file
$contents = Storage::disk('supabase')->get('documents/file.pdf');

// Get a public URL (if bucket is public)
$url = Storage::disk('supabase')->url('documents/file.pdf');

// Delete a file
Storage::disk('supabase')->delete('documents/file.pdf');

// List files
$files = Storage::disk('supabase')->files('documents');
```

If Supabase is set as the default driver, you can omit `disk('supabase')`:

```php
Storage::put('documents/file.pdf', $fileContents);
```

## Supabase Storage Policies

### Public Buckets

For public file access, configure your Supabase bucket policies:

```sql
-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'your-bucket-name');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'your-bucket-name' AND auth.role() = 'authenticated');
```

### Private Buckets

For private files, use service role authentication (automatically handled by Laravel):

```sql
-- Only allow service role access
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
USING (bucket_id = 'your-bucket-name');
```

## Troubleshooting

### Connection Test Failed

If the storage connection test fails:

1. **Check the endpoint URL format**
   - Must be: `https://xxxxx.supabase.co/storage/v1/s3`
   - Include `/storage/v1/s3` at the end

2. **Verify the service role key**
   - Must use `service_role` key, not `anon` key
   - Copy the entire key without spaces

3. **Confirm bucket exists**
   - Create the bucket in Supabase Dashboard → Storage first
   - Bucket names are case-sensitive

4. **Check bucket policies**
   - Service role should have full access to the bucket
   - Policies might be blocking operations

### Files Not Accessible

If files upload but can't be accessed:

1. **For public access**: Set bucket to public in Supabase
2. **For private files**: Use signed URLs:

```php
$url = Storage::disk('supabase')->temporaryUrl(
    'documents/file.pdf', 
    now()->addMinutes(30)
);
```

## Migration from Local Storage

To migrate existing files from local storage to Supabase:

```php
$files = Storage::disk('local')->allFiles();

foreach ($files as $file) {
    $contents = Storage::disk('local')->get($file);
    Storage::disk('supabase')->put($file, $contents);
}
```

## Security Best Practices

1. **Never expose service_role key** in client-side code
2. **Use RLS policies** in Supabase for fine-grained access control
3. **Rotate keys regularly** by creating new service role keys in Supabase
4. **Use signed URLs** for temporary access to private files
5. **Validate file types** before upload to prevent malicious files

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Laravel Filesystem Documentation](https://laravel.com/docs/filesystem)
- [AWS S3 API Compatibility](https://supabase.com/docs/guides/storage/s3/compatibility)
