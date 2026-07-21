# Document Edit Feature - File Preview & Replacement

## Overview
Enhanced the document edit modal to display the existing file and allow users to replace it with a new file.

## Changes Made

### 1. DocumentUploadZone Component
**File:** `resources/js/Components/DocumentUploadZone.jsx`

**New Features:**
- Added `existingFile` prop to receive current document data
- Displays existing file information when in edit mode
- Shows file preview for existing images and PDFs
- Added "Replace" button for existing files
- Visual indicators showing:
  - "(Current file)" for existing files
  - "(New file - will replace)" when a replacement is selected
- Download link for non-previewable file types

**Key Changes:**
- Added state for `isReplacing` to track replacement flow
- Added `handleReplaceFile()` function to trigger file selection
- Enhanced preview logic to handle both new and existing files
- Updated file info display to show both current and new file states

### 2. DocumentUploadModal Component
**File:** `resources/js/Components/DocumentUploadModal.jsx`

**Changes:**
- Passes `editDocument` as `existingFile` prop to DocumentUploadZone
- Modal now shows existing file data when editing

### 3. DocumentManagementController
**File:** `app/Http/Controllers/DocumentManagementController.php`

**Changes:**
- Added `config` field to document transformation in `index()` method
- This ensures the frontend receives the `public_url` and other metadata
- Updated URL generation to use manual construction for better compatibility

### 4. File Replacement Flow

**When Editing a Document:**

1. Modal opens with existing document data
2. DocumentUploadZone displays:
   - Current file name and size
   - Preview (if image or PDF)
   - "Replace" button

3. User clicks "Replace" or drags new file:
   - New file is selected
   - Preview updates to show new file
   - Visual indicator shows "(New file - will replace)"
   - User can remove new selection to revert to current file

4. On submit:
   - Backend deletes old file from Supabase
   - Uploads new file to Supabase
   - Updates database with new file information

**When Creating a Document:**
- Works as before with standard upload flow

## User Experience

### Edit Mode Indicators
- Current file shows with "(Current file)" label
- New file shows with "(New file - will replace)" label in green
- Replace button appears next to current file info
- Remove button (X) appears when new file is selected

### File Preview
- Images: Full preview in the preview area
- PDFs: Embedded iframe preview
- Other files: Message with download link to current file

### Validation
- File size limit: 50MB
- Accepted formats: PDF, JPG, PNG, DOC, DOCX
- Name field required
- File required for new uploads, optional for edits

## Technical Details

### Public URL Generation
```php
$endpoint = rtrim(config('filesystems.disks.supabase.endpoint'), '/');
$bucket = config('filesystems.disks.supabase.bucket');
$publicUrl = str_replace('/storage/v1', "/storage/v1/object/public/{$bucket}/{$filename}", $endpoint);
```

### File Deletion on Replace
```php
if (!empty($document->file_path) && Storage::disk('supabase')->exists($document->file_path)) {
    Storage::disk('supabase')->delete($document->file_path);
}
```

## Testing Checklist

- [x] Edit modal shows existing file information
- [x] Image preview works for existing images
- [x] PDF preview works for existing PDFs
- [x] Replace button triggers file selection
- [x] New file selection shows replacement indicator
- [x] Can remove new file to keep existing
- [x] File upload replaces old file in Supabase
- [x] Database updates with new file information
- [x] Old file is deleted from storage
- [x] Public URL is correctly generated and stored

## Future Enhancements

Potential improvements:
- Add file comparison view (side-by-side)
- Show file upload progress bar
- Add file version history
- Support for more file type previews
- Drag and drop directly on preview area
