import { useState, useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import axios from 'axios';
import DocumentUploadZone from './DocumentUploadZone';
import DocumentLabelSelector from './DocumentLabelSelector';
import Modal from './Modal';
import { Upload } from 'lucide-react';

export default function DocumentUploadModal({ isOpen, onClose, editDocument = null }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [loadingExistingFile, setLoadingExistingFile] = useState(false);
    const isEditMode = !!editDocument;
    const uploadToastId = useRef(null);

    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: '',
        label: 'forms',
        file_path: null,
        file_size: null,
        file_type: null,
        public_url: null,
    });

    // Show loading toast when modal closes during operation
    useEffect(() => {
        if (!isOpen && uploading && !uploadToastId.current) {
            uploadToastId.current = toast.loading(isEditMode ? 'Updating document...' : 'Uploading document...');
        }
    }, [isOpen, uploading, isEditMode]);
    
    // Clear form when modal closes or initialize with edit data
    useEffect(() => {
        if (!isOpen) {
            reset();
            setSelectedFile(null);
            setUploadError(null);
            setLoadingExistingFile(false);
        } else if (editDocument) {
            console.log('=== EDIT MODE ===');
            console.log('Edit document data:', editDocument);
            console.log('File path from DB:', editDocument.file_path);
            console.log('Stored signed URL:', editDocument.config?.public_url);
            
            // Generate signed URL from file_path (bucket is private, needs authentication)
            const loadSignedUrl = async () => {
                if (editDocument.file_path) {
                    setLoadingExistingFile(true);
                    
                    // Create a signed URL that expires in 1 hour (3600 seconds)
                    const { data: urlData, error } = await supabase.storage
                        .from('files')
                        .createSignedUrl(editDocument.file_path, 3600);
                    
                    if (error) {
                        console.error('Error creating signed URL:', error);
                        const errorMsg = `Failed to load file: ${error.message}`;
                        setUploadError(errorMsg);
                        toast.error(errorMsg);
                        setLoadingExistingFile(false);
                        return;
                    }
                    
                    const signedUrl = urlData.signedUrl;
                    console.log('Generated signed URL:', signedUrl);
                    
                    // Initialize with edit document data
                    setData({
                        name: editDocument.name,
                        label: editDocument.label,
                        file_path: editDocument.file_path,
                        file_size: editDocument.file_size,
                        file_type: editDocument.file_type,
                        public_url: signedUrl,
                    });
                    
                    setLoadingExistingFile(false);
                } else {
                    // No file path, just set basic data
                    setData({
                        name: editDocument.name,
                        label: editDocument.label,
                        file_path: null,
                        file_size: null,
                        file_type: null,
                        public_url: null,
                    });
                }
            };
            
            loadSignedUrl();
            setSelectedFile(null);
        } else {
            console.log('=== CREATE MODE ===');
            // Initialize for create mode
            setData({
                name: '',
                label: 'forms',
                file_path: null,
                file_size: null,
                file_type: null,
                public_url: null,
            });
        }
    }, [isOpen, editDocument]);

    // Update document name when file is selected (only in create mode)
    useEffect(() => {
        if (selectedFile && !data.name && !isEditMode) {
            // Remove file extension and set as default name
            const nameWithoutExtension = selectedFile.name.replace(/\.[^/.]+$/, '');
            setData('name', nameWithoutExtension);
        }
    }, [selectedFile, data.name, isEditMode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploadError(null);
        
        // Upload file to Supabase if a new file is selected
        if (selectedFile) {
            setUploading(true);
            
            try {
                const folder = 'documents/';
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${folder}${Math.random().toString(36).substring(2)}.${fileExt}`;
                
                console.log('Starting Supabase upload...');
                
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('files')
                    .upload(fileName, selectedFile, {
                        cacheControl: '3600',
                        upsert: false
                    });
                
                if (uploadError) {
                    setUploading(false);
                    const errorMsg = `Upload failed: ${uploadError.message}`;
                    setUploadError(errorMsg);
                    toast.error(errorMsg);
                    console.error('Supabase upload error:', uploadError);
                    return;
                }
                
                console.log('Supabase upload complete:', uploadData);
                
                // Get signed URL (bucket is private)
                const { data: urlData, error: urlError } = await supabase.storage
                    .from('files')
                    .createSignedUrl(fileName, 31536000); // 1 year expiry
                
                if (urlError) {
                    setUploading(false);
                    const errorMsg = `Failed to generate URL: ${urlError.message}`;
                    setUploadError(errorMsg);
                    toast.error(errorMsg);
                    console.error('Signed URL error:', urlError);
                    return;
                }
                
                const signedUrl = urlData.signedUrl;
                console.log('Signed URL:', signedUrl);
                
                // Prepare form data
                const formData = {
                    name: data.name,
                    label: data.label,
                    file_path: fileName,
                    file_size: selectedFile.size,
                    file_type: selectedFile.type,
                    public_url: signedUrl,
                };
                
                console.log('Submitting to backend:', formData);
                console.log('Route:', isEditMode ? `/api/documents/${editDocument.id}` : '/api/documents');
                
                // Wait a moment to ensure upload is fully complete
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try using axios directly instead of Inertia
                try {
                    // If editing, delete old file first
                    if (isEditMode && editDocument.file_path) {
                        console.log('Deleting old file:', editDocument.file_path);
                        const { error: deleteError } = await supabase.storage
                            .from('files')
                            .remove([editDocument.file_path]);
                        
                        if (deleteError) {
                            console.warn('Could not delete old file:', deleteError);
                            // Continue anyway - old file will remain
                        }
                    }
                    
                    const url = isEditMode 
                        ? `/api/documents/${editDocument.id}`
                        : '/api/documents';
                    
                    // For PATCH requests, use POST with _method override
                    const method = isEditMode ? 'post' : 'post';
                    const requestData = isEditMode ? { ...formData, _method: 'PATCH' } : formData;
                    
                    const response = await axios[method](url, requestData);
                    console.log('Backend response:', response);
                    setUploading(false);
                    
                    // Dismiss loading toast and show success
                    if (uploadToastId.current) {
                        toast.dismiss(uploadToastId.current);
                        uploadToastId.current = null;
                    }
                    setTimeout(() => {
                        toast.success(isEditMode ? 'Document updated successfully' : 'Document uploaded successfully');
                    }, 100);
                    
                    onClose();
                    window.location.reload();
                } catch (error) {
                    console.error('Backend error:', error);
                    console.error('Request URL:', url);
                    console.error('Request method:', method);
                    console.error('Request data:', formData);
                    console.error('Error response:', error.response);
                    console.error('Error status:', error.response?.status);
                    console.error('Error data:', error.response?.data);
                    setUploading(false);
                    
                    // Dismiss loading toast and show error
                    if (uploadToastId.current) {
                        toast.dismiss(uploadToastId.current);
                        uploadToastId.current = null;
                    }
                    setTimeout(() => {
                        const errorMsg = `Failed to save: ${error.response?.data?.message || error.message}`;
                        setUploadError(errorMsg);
                        toast.error(errorMsg);
                    }, 100);
                }
                
                /*
                if (isEditMode) {
                    patch(route('documents.update', editDocument.id), formData, {
                        onSuccess: () => {
                            console.log('Update successful');
                            setUploading(false);
                            onClose();
                            window.location.reload();
                        },
                        onError: (errors) => {
                            console.error('Update failed with errors:', errors);
                            setUploading(false);
                            setUploadError(`Failed to update document: ${JSON.stringify(errors)}`);
                        },
                        onFinish: () => {
                            console.log('Update request finished');
                        }
                    });
                } else {
                    post(route('documents.store'), formData, {
                        onSuccess: () => {
                            console.log('Save successful');
                            setUploading(false);
                            onClose();
                            window.location.reload();
                        },
                        onError: (errors) => {
                            console.error('Save failed with errors:', errors);
                            setUploading(false);
                            setUploadError(`Failed to save document: ${JSON.stringify(errors)}`);
                        },
                        onFinish: () => {
                            console.log('Save request finished');
                        }
                    });
                }
                */
                
            } catch (error) {
                setUploading(false);
                const errorMsg = `Upload error: ${error.message}`;
                setUploadError(errorMsg);
                toast.error(errorMsg);
                console.error('Upload exception:', error);
            }
        } else if (isEditMode) {
            // Update without file change
            setUploading(true);
            try {
                // Use POST with _method override for PATCH
                const response = await axios.post(`/api/documents/${editDocument.id}`, {
                    name: data.name,
                    label: data.label,
                    _method: 'PATCH'
                });
                console.log('Update response:', response);
                setUploading(false);
                
                // Dismiss loading toast and show success
                if (uploadToastId.current) {
                    toast.dismiss(uploadToastId.current);
                    uploadToastId.current = null;
                }
                setTimeout(() => {
                    toast.success('Document updated successfully');
                }, 100);
                
                onClose();
                window.location.reload();
            } catch (error) {
                console.error('Update error:', error);
                console.error('Update URL:', `/api/documents/${editDocument.id}`);
                console.error('Update data:', { name: data.name, label: data.label });
                console.error('Error response:', error.response);
                setUploading(false);
                
                // Dismiss loading toast and show error
                if (uploadToastId.current) {
                    toast.dismiss(uploadToastId.current);
                    uploadToastId.current = null;
                }
                setTimeout(() => {
                    const errorMsg = `Failed to update: ${error.response?.data?.message || error.message}`;
                    setUploadError(errorMsg);
                    toast.error(errorMsg);
                }, 100);
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} fullScreen={true}>
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-4 sm:p-6 lg:p-8 pb-3 sm:pb-4 lg:pb-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
                        {isEditMode ? 'Edit Document' : 'Upload New Document'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {isEditMode 
                            ? 'Update document information and optionally replace the file'
                            : 'Select a document type and upload your files'
                        }
                    </p>
                </div>

                {/* Upload Zone */}
                <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 min-h-0">
                    {loadingExistingFile ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading file...</p>
                            </div>
                        </div>
                    ) : (
                        <DocumentUploadZone
                            onFileSelect={setSelectedFile}
                            existingFile={isEditMode && editDocument ? {
                                ...editDocument,
                                config: {
                                    ...editDocument.config,
                                    public_url: data.public_url
                                }
                            } : null}
                        />
                    )}
                </div>

                {/* Footer Controls */}
                <form onSubmit={handleSubmit}>
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 flex-shrink-0">
                        {/* Mobile Layout */}
                        <div className="sm:hidden space-y-4">
                            {/* Document Type */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                    Document Type:
                                </label>
                                <DocumentLabelSelector 
                                    value={data.label} 
                                    onChange={(value) => setData('label', value)} 
                                />
                            </div>
                            
                            {/* Document Name Input */}
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                    Name:
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Document name"
                                    className="
                                        flex-1 px-3 py-2 text-sm
                                        border border-gray-300 dark:border-gray-600 
                                        rounded-md 
                                        bg-white dark:bg-gray-800 
                                        text-gray-900 dark:text-gray-100
                                        focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                    "
                                />
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex flex-col-reverse gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="
                                        px-4 py-2 rounded-lg 
                                        border border-gray-300 dark:border-gray-600 
                                        text-gray-700 dark:text-gray-300 
                                        bg-white dark:bg-gray-800
                                        hover:bg-gray-50 dark:hover:bg-gray-700 
                                        transition duration-150 ease-in-out
                                        text-center
                                    "
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!data.name.trim() || (!selectedFile && !isEditMode) || uploading || processing}
                                    className="
                                        inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg 
                                        bg-primary
                                        text-primary-foreground
                                        hover:bg-primary/90
                                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                        transition duration-150 ease-in-out
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    "
                                >
                                    <Upload className="w-4 h-4" />
                                    {uploading
                                        ? 'Uploading...'
                                        : processing 
                                            ? (isEditMode ? 'Updating...' : 'Saving...') 
                                            : (isEditMode ? 'Update Document' : 'Add Document')
                                    }
                                </button>
                            </div>
                        </div>

                        {/* Tablet and Desktop Layout */}
                        <div className="hidden sm:block space-y-4">
                            {/* Document Type and Name - Side by side on larger screens */}
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
                                {/* Document Type */}
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                        Document Type:
                                    </label>
                                    <DocumentLabelSelector 
                                        value={data.label} 
                                        onChange={(value) => setData('label', value)} 
                                    />
                                </div>
                                
                                {/* Document Name Input */}
                                <div className="flex items-center gap-2 flex-1">
                                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                        Name:
                                    </label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Document name"
                                        className="
                                            flex-1 px-3 py-2 text-sm
                                            border border-gray-300 dark:border-gray-600 
                                            rounded-md 
                                            bg-white dark:bg-gray-800 
                                            text-gray-900 dark:text-gray-100
                                            focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                        "
                                    />
                                </div>
                            </div>
                            
                            {/* Display validation errors */}
                            {errors.name && (
                                <div className="text-sm text-red-600 dark:text-red-400">
                                    {errors.name}
                                </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="
                                        px-4 py-2 rounded-lg 
                                        border border-gray-300 dark:border-gray-600 
                                        text-gray-700 dark:text-gray-300 
                                        bg-white dark:bg-gray-800
                                        hover:bg-gray-50 dark:hover:bg-gray-700 
                                        transition duration-150 ease-in-out
                                    "
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!data.name.trim() || (!selectedFile && !isEditMode) || uploading || processing}
                                    className="
                                        inline-flex items-center gap-2 px-4 py-2 rounded-lg 
                                        bg-primary
                                        text-primary-foreground
                                        hover:bg-primary/90
                                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                                        transition duration-150 ease-in-out
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    "
                                >
                                    <Upload className="w-4 h-4" />
                                    {uploading
                                        ? 'Uploading...'
                                        : processing 
                                            ? (isEditMode ? 'Updating...' : 'Saving...') 
                                            : (isEditMode ? 'Update Document' : 'Add Document')
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </Modal>
    );
}
