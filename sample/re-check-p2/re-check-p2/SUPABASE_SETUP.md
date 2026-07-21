# Supabase Storage Setup Guide

This guide will help you configure Supabase storage for file uploads in your Laravel application.

## Prerequisites

- A Supabase project
- Laravel application with Supabase Flysystem integration installed

## Step 1: Create Storage Bucket

1. Go to your Supabase dashboard
2. Navigate to **Storage** in the sidebar
3. Click **New Bucket**
4. Create a bucket named `file`
5. Set the bucket to **Public** if you want files to be publicly accessible

## Step 2: Get Supabase Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **Project API Key** (anon/public key)

3. Go to **Settings** > **Storage**
4. Note your storage endpoint (usually `https://your-project.supabase.co/storage/v1`)

## Step 3: Configure Environment Variables

Add these variables to your `.env` file:

```env
# Supabase Storage Configuration
SUPABASE_ACCESS_KEY_ID=your-project-api-key
SUPABASE_SECRET_ACCESS_KEY=your-project-api-key
SUPABASE_DEFAULT_REGION=us-east-1
SUPABASE_BUCKET=file
SUPABASE_URL=https://your-project.supabase.co/storage/v1/object/public/file
SUPABASE_ENDPOINT=https://your-project.supabase.co/storage/v1
SUPABASE_USE_PATH_STYLE_ENDPOINT=true
```

**Important Notes:**
- Use your **anon/public API key** for both ACCESS_KEY_ID and SECRET_ACCESS_KEY
- Replace `your-project` with your actual Supabase project reference
- The SUPABASE_URL should point to the public object URL for file access
- Set `SUPABASE_USE_PATH_STYLE_ENDPOINT=true` for S3 compatibility

## Step 4: Usage Examples

The application uses the following methods for file operations:

### Upload a file:
```php
$folder = 'documents/';
$filename = Storage::disk('supabase')->put($folder, $request->file('file'));
```

### Get public URL:
```php
$publicUrl = Storage::disk('supabase')->url($filename);
```

### Delete a file:
```php
if (!empty($filename) && Storage::disk('supabase')->exists($filename)) {
    Storage::disk('supabase')->delete($filename);
}
```

## Step 5: Set Storage Policies (Optional)

If you want to restrict file access, you can set up Row Level Security (RLS) policies:

1. Go to **Storage** > **Policies** in your Supabase dashboard
2. Create policies for the `file` bucket:

### Allow authenticated users to upload files:
```sql
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'file' AND 
  auth.role() = 'authenticated'
);
```

### Allow users to view their own files:
```sql
CREATE POLICY "Allow users to view own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'file' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Allow users to delete their own files:
```sql
CREATE POLICY "Allow users to delete own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'file' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Step 6: Test the Configuration

1. Start your Laravel development server
2. Navigate to the Document Management page
3. Try uploading a file
4. Check your Supabase storage bucket to confirm the file was uploaded

## Troubleshooting

### Common Issues:

1. **403 Forbidden Error**: Check your API key and bucket policies
2. **Bucket not found**: Ensure the bucket name matches your configuration
3. **File not accessible**: Verify the public URL format and bucket visibility settings
4. **PortableVisibilityConverter Error**: Remove visibility configuration from filesystem config

### Debug Tips:

- Check Laravel logs: `tail -f storage/logs/laravel.log`
- Verify Supabase credentials in your `.env` file
- Test bucket access directly in Supabase dashboard
- Ensure `SUPABASE_USE_PATH_STYLE_ENDPOINT=true` is set

## File Structure

Files are stored in the following structure:
```
file/
└── documents/
    ├── generated_filename_1.ext
    ├── generated_filename_2.ext
    └── ...
```

Laravel automatically generates unique filenames to prevent conflicts between users.