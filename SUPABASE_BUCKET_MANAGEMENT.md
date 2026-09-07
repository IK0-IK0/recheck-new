# Supabase Bucket Management

## Overview

The storage settings page now includes **integrated Supabase bucket management**, allowing you to view existing buckets and create new ones directly from your Laravel application without leaving the settings page.

## Features

### 1. List Existing Buckets

Click the **"List Buckets"** button to fetch all storage buckets from your Supabase project:

- Displays bucket name
- Shows if bucket is public or private
- Updates in real-time when new buckets are created
- Automatically refreshes after creating a new bucket

### 2. Create New Buckets

Click the **"Create Bucket"** button to open a dialog where you can:

- Enter a bucket name (lowercase, numbers, hyphens only)
- Choose whether the bucket should be public or private
- Create the bucket instantly in your Supabase project

### 3. Automatic Integration

Once you see your buckets listed:
1. Select a bucket name from the list
2. Enter it in the "Bucket Name" field
3. Save your storage settings

The application will now use that Supabase bucket for all file uploads!

## How It Works

### Backend API Integration

The Laravel application communicates directly with Supabase's REST API:

```php
// List buckets
GET https://xxxxx.supabase.co/storage/v1/bucket

// Create bucket
POST https://xxxxx.supabase.co/storage/v1/bucket
{
  "id": "my-bucket",
  "name": "my-bucket",
  "public": false
}
```

### Authentication

All API requests use your **service_role key** for authentication:
- Header: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
- Header: `apikey: YOUR_SERVICE_ROLE_KEY`

This ensures secure, authenticated access to your Supabase storage.

## Usage Flow

### Step 1: Enter Credentials

1. Go to **Settings → Storage**
2. Select **Supabase Storage** driver
3. Enter your **Endpoint URL**: `https://xxxxx.supabase.co/storage/v1/s3`
4. Enter your **Service Role Key** (from Supabase Dashboard)

### Step 2: Manage Buckets

Once credentials are entered, the bucket management section appears:

```
┌─────────────────────────────────────────┐
│ Supabase Buckets                        │
│ Manage your storage buckets             │
│                                          │
│ [List Buckets] [Create Bucket]          │
└─────────────────────────────────────────┘
```

### Step 3: List Buckets

Click **"List Buckets"** to see all existing buckets:

```
┌─────────────────────────────────────────┐
│ documents              [Public]          │
│ private-files                            │
│ avatars                [Public]          │
└─────────────────────────────────────────┘
```

### Step 4: Create a New Bucket (Optional)

If you need a new bucket:

1. Click **"Create Bucket"**
2. Enter bucket name (e.g., `institution-files`)
3. Check "Make bucket public" if you want public access
4. Click **"Create Bucket"**

The new bucket is created in Supabase and automatically appears in the list!

### Step 5: Configure Storage

1. Enter the bucket name in the **"Bucket Name"** field
2. Fill in region (defaults to `us-east-1`)
3. Enter service_role key in both key fields
4. Click **"Save Storage Settings"**

Done! Your application now stores files in that Supabase bucket.

## Bucket Naming Rules

Supabase bucket names must follow these rules:
- **Lowercase letters only** (`a-z`)
- **Numbers** (`0-9`)
- **Hyphens** (`-`)
- Must **start and end** with a letter or number
- Maximum **63 characters**
- No spaces, underscores, or special characters

### Valid Examples:
- ✅ `documents`
- ✅ `private-files`
- ✅ `institution-uploads`
- ✅ `user-avatars-2024`

### Invalid Examples:
- ❌ `Documents` (uppercase)
- ❌ `private_files` (underscore)
- ❌ `my bucket` (space)
- ❌ `-files` (starts with hyphen)
- ❌ `files-` (ends with hyphen)

## Public vs Private Buckets

### Private Buckets (Default)

**Use case**: Sensitive documents, user files, private data

**Access control**: 
- Files require authentication to access
- Use Laravel's download controller for access control
- Generate signed URLs for temporary access

**Example**:
```php
// Private file - served through Laravel controller
Route::get('/documents/{document}/download', [DocumentController::class, 'download'])
    ->middleware('auth');
```

### Public Buckets

**Use case**: Public assets, images, logos, static files

**Access control**:
- Files accessible via direct URL
- No authentication required
- Faster access (can use CDN)

**Example**:
```php
// Public file - direct URL access
$url = Storage::url('logos/company-logo.png');
// https://xxxxx.supabase.co/storage/v1/object/public/my-bucket/logos/company-logo.png
```

## Troubleshooting

### Cannot List Buckets

**Error**: "Failed to fetch buckets"

**Solutions**:
1. Verify endpoint URL format: `https://xxxxx.supabase.co/storage/v1/s3`
2. Check service_role key is correct (not anon key)
3. Ensure Supabase project is active
4. Check network connectivity

**Debug**:
```bash
# Test connection manually
curl -X GET "https://xxxxx.supabase.co/storage/v1/bucket" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY"
```

### Cannot Create Bucket

**Error**: "Failed to create bucket"

**Common causes**:
1. **Bucket name already exists** - Choose a different name
2. **Invalid bucket name** - Follow naming rules above
3. **Insufficient permissions** - Verify service_role key
4. **Project quota exceeded** - Check Supabase dashboard

### Bucket Not Appearing in List

**Solution**: Click "List Buckets" again to refresh

The bucket list doesn't auto-refresh - manually click the refresh button after creating buckets elsewhere.

## Security Considerations

### Service Role Key Protection

The service_role key has **full access** to your Supabase project:

- ✅ **Encrypted storage**: Keys are encrypted in the database
- ✅ **HTTPS only**: All API calls use HTTPS
- ✅ **Server-side only**: Never expose to frontend JavaScript
- ❌ **Don't commit**: Never commit keys to version control

### RLS Policies

Even with bucket access, you should configure Row Level Security (RLS) policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);

-- Allow users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.uid() = owner
);
```

## API Reference

### List Buckets Endpoint

**Request**:
```http
POST /settings/storage/buckets/list
Content-Type: application/json

{
  "endpoint": "https://xxxxx.supabase.co/storage/v1/s3",
  "access_key": "your-service-role-key"
}
```

**Response** (Success):
```json
{
  "buckets": [
    {
      "id": "documents",
      "name": "documents",
      "public": false,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Response** (Error):
```json
{
  "error": "Failed to fetch buckets: Unauthorized"
}
```

### Create Bucket Endpoint

**Request**:
```http
POST /settings/storage/buckets/create
Content-Type: application/json

{
  "endpoint": "https://xxxxx.supabase.co/storage/v1/s3",
  "access_key": "your-service-role-key",
  "bucket_name": "my-new-bucket",
  "public": false
}
```

**Response** (Success):
```json
{
  "message": "Bucket created successfully",
  "bucket": {
    "name": "my-new-bucket"
  }
}
```

**Response** (Error):
```json
{
  "error": "Failed to create bucket: Bucket already exists"
}
```

## Best Practices

### 1. Plan Your Bucket Structure

Organize files logically:
```
documents/          # User-uploaded documents
forms/              # Form templates
avatars/            # User profile pictures
institution-files/  # Institution-specific files
```

### 2. Use Descriptive Names

- ✅ `user-documents`
- ✅ `form-templates`
- ❌ `bucket1`
- ❌ `temp`

### 3. Set Appropriate Permissions

- Private buckets for sensitive data
- Public buckets only for truly public assets

### 4. Monitor Storage Usage

Check your Supabase dashboard regularly:
- Storage used
- API requests
- Bandwidth consumption

### 5. Implement File Lifecycle

Consider bucket policies for automatic file deletion:
```sql
-- Delete files older than 90 days
CREATE POLICY "Auto-delete old files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'temporary-files'
  AND created_at < NOW() - INTERVAL '90 days'
);
```

## Advanced Features

### Bucket Configuration Options

When creating buckets via API, you can configure:

- **file_size_limit**: Maximum file size (bytes)
- **allowed_mime_types**: Restrict file types
- **public**: Public or private access

Example with restrictions:
```php
private function createSupabaseBucket(
    string $endpoint, 
    string $serviceRoleKey, 
    string $bucketName, 
    bool $public = false,
    ?int $fileSizeLimit = null,
    ?array $allowedMimeTypes = null
): array {
    // ... implementation
    [
        'id' => $bucketName,
        'name' => $bucketName,
        'public' => $public,
        'file_size_limit' => $fileSizeLimit,
        'allowed_mime_types' => $allowedMimeTypes,
    ]
}
```

### Programmatic Bucket Creation

You can also create buckets programmatically in your code:

```php
use App\Http\Controllers\Settings\StorageController;

$controller = new StorageController();
$buckets = $controller->listBuckets(request());
```

## Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Storage API Reference](https://supabase.com/docs/reference/javascript/storage)
- [Storage REST API](https://supabase.com/docs/reference/rest/storage-api)
- [RLS Policies for Storage](https://supabase.com/docs/guides/storage/security/access-control)
