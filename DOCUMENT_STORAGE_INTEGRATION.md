# Document Storage Integration

## Overview

The Document Management system now automatically uses the storage configuration set in **Settings → Storage**. Files uploaded through the document management interface will be stored according to your configured storage driver (local, public, S3, or Supabase).

## How It Works

### 1. Storage Configuration (Settings → Storage)

When you configure storage in the settings:
- The configuration is saved to the `storage_configs` table (superadmin DB)
- Credentials are encrypted automatically
- One configuration is marked as "active"

### 2. Application Boot

On every request, the `StorageServiceProvider` runs:
```php
// Loads the active storage config
$activeConfig = StorageConfig::where('is_active', true)->first();

// Configures Laravel's filesystem
Config::set('filesystems.default', $diskName);
Config::set('filesystems.disks.'.$diskName, $diskConfig);
```

### 3. Document Management

The `DocumentManagementController` now uses Laravel's default disk:
```php
// Upload a file
Storage::put($filePath, $fileContents);

// Download a file
Storage::download($document->file_path, $document->name);

// Delete a file
Storage::delete($document->file_path);
```

No hardcoded disk references - it automatically uses whatever is configured!

## File Flow

```
User Uploads Document
    ↓
DocumentManagementController::store()
    ↓
Storage::put() (uses default disk)
    ↓
StorageServiceProvider determines which disk to use
    ↓
File stored on: Local / Public / S3 / Supabase
    ↓
Document record saved to tenant DB with file_path
```

## Storage Drivers

### Local Storage
- **Default**: Files stored in `storage/app/private`
- **Use case**: Development, single-server deployments
- **Pros**: Simple, no external dependencies
- **Cons**: Files lost if server is destroyed, doesn't scale across multiple servers

### Public Storage
- **Path**: Files stored in `storage/app/public`
- **URL**: Accessible via `/storage` URL
- **Use case**: Public files like logos, images
- **Pros**: Simple, direct URL access
- **Cons**: Same as local storage

### S3 Compatible
- **Path**: Files stored on S3-compatible service
- **Use case**: AWS S3, MinIO, DigitalOcean Spaces
- **Pros**: Scalable, reliable, distributed
- **Cons**: Requires configuration, may have costs

### Supabase Storage
- **Path**: Files stored on Supabase cloud storage
- **Use case**: Projects already using Supabase for database
- **Pros**: Integrated with Supabase, S3-compatible, generous free tier
- **Cons**: Requires Supabase account

## Migration Between Storage Drivers

If you change storage drivers, existing files won't automatically move. You need to migrate them:

```php
use App\Models\Document;
use Illuminate\Support\Facades\Storage;

// Get all documents
$documents = Document::all();

foreach ($documents as $document) {
    // Get file from old storage (e.g., local)
    $fileContents = Storage::disk('local')->get($document->file_path);
    
    // Put file on new storage (e.g., supabase)
    Storage::disk('supabase')->put($document->file_path, $fileContents);
    
    // Optionally delete from old storage
    // Storage::disk('local')->delete($document->file_path);
}

echo "Migrated " . $documents->count() . " documents";
```

You can create an artisan command for this:

```bash
php artisan make:command MigrateDocumentsStorage
```

## File Access Patterns

### Private Files (Default)

Files uploaded to local or S3/Supabase private storage require authentication:

```php
// In controller
public function download(Document $document)
{
    // User must be authenticated to reach this
    return Storage::download($document->file_path, $document->name);
}
```

### Public Files

For public file access (if using public disk or public bucket):

```php
// Get public URL
$url = Storage::url($document->file_path);

// In Blade/React
<a href="{{ $url }}" download>Download</a>
```

### Temporary URLs (S3/Supabase)

For temporary access to private files:

```php
// Generate a signed URL valid for 30 minutes
$url = Storage::temporaryUrl(
    $document->file_path,
    now()->addMinutes(30)
);
```

## Security Considerations

### 1. File Type Validation

The document upload validates file types. You can enhance this:

```php
$validated = $request->validate([
    'file' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:10240'], // 10MB max
]);
```

### 2. Access Control

Documents are stored in the tenant database, ensuring:
- Superadmin cannot access tenant documents
- Each tenant can only see their own documents
- Authentication required via Laravel's auth middleware

### 3. File Name Sanitization

The controller already sanitizes file names:
```php
Str::slug($validated['name'])
```

### 4. Direct Access Prevention

For local/public storage, files in `storage/app/private` are not web-accessible. Files must be served through the controller, which enforces authentication.

## Troubleshooting

### Files Not Found After Changing Storage

**Problem**: Changed from local to Supabase, existing documents return 404

**Solution**: Run the migration script above to move files to new storage

### Upload Fails with Supabase

**Problem**: Files fail to upload to Supabase

**Checklist**:
1. Verify service_role key is correct
2. Check bucket exists in Supabase
3. Verify bucket policies allow uploads
4. Check endpoint URL format: `https://xxxxx.supabase.co/storage/v1/s3`

### Download Returns 404

**Problem**: File exists in database but download fails

**Possible causes**:
- File was deleted from storage but not database
- Wrong storage driver configured
- Permissions issue on storage

**Debug**:
```php
// Check if file exists
dd(Storage::exists($document->file_path));

// Check which disk is being used
dd(config('filesystems.default'));
```

## Testing

The document management tests use `Storage::fake()` for isolated testing:

```php
Storage::fake('local');

// Upload file
$this->post('/documents', [...]);

// Assert file was stored
Storage::disk('local')->assertExists('documents/file.pdf');
```

This ensures tests don't interact with real storage.

## Performance Considerations

### Cloud Storage (S3/Supabase)

- **Latency**: Network requests to cloud storage add latency
- **Bandwidth**: Upload/download speeds depend on internet connection
- **Caching**: Consider adding CDN for frequently accessed files

### Local Storage

- **Speed**: Fastest for read/write operations
- **Disk Space**: Monitor server disk usage
- **Backups**: Ensure regular backups of `storage/` directory

## Best Practices

1. **Choose the right driver early** - Migrating storage later is possible but adds complexity

2. **Use Supabase for new projects** - If you're already using Supabase for database, use it for storage too

3. **Set up storage before uploading documents** - Configure storage in Settings → Storage before users start uploading

4. **Test your storage configuration** - The storage settings page automatically tests the connection

5. **Monitor storage usage** - Keep track of file sizes and total storage used

6. **Implement file cleanup** - When documents are deleted, files are automatically removed from storage

7. **Use signed URLs for downloads** - For sensitive documents, consider generating temporary signed URLs instead of direct downloads

## Code Reference

### Key Files

- `app/Http/Controllers/DocumentManagementController.php` - Handles file uploads/downloads
- `app/Models/Document.php` - Document database model
- `app/Models/StorageConfig.php` - Storage configuration model
- `app/Providers/StorageServiceProvider.php` - Loads active storage config
- `app/Http/Controllers/Settings/StorageController.php` - Storage settings management

### Environment Variables

No environment variables needed! All storage configuration is managed through the UI and stored encrypted in the database.

For local development, the default `local` disk works out of the box with no configuration.
