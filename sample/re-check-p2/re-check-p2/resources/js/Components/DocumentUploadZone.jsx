import { Upload, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function DocumentUploadZone({ onFileSelect, existingFile = null }) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);
    const [isReplacing, setIsReplacing] = useState(false);

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        const files = e.dataTransfer.files;
        if (files && files[0]) {
            handleFileSelection(files[0]);
        }
    };

    const handleFileSelection = (file) => {
        // Check file size (50MB limit)
        const maxSize = 50 * 1024 * 1024; // 50MB in bytes
        if (file.size > maxSize) {
            alert('File size must be less than 50MB. Please choose a smaller file.');
            return;
        }

        setSelectedFile(file);
        
        // Create preview URL
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        
        if (onFileSelect) {
            onFileSelect(file);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileInputChange = (e) => {
        const files = e.target.files;
        if (files && files[0]) {
            handleFileSelection(files[0]);
        }
    };

    const handleRemoveFile = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        setIsReplacing(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (onFileSelect) {
            onFileSelect(null);
        }
    };

    const handleReplaceFile = () => {
        setIsReplacing(true);
        fileInputRef.current?.click();
    };

    // Cleanup preview URL on unmount
    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const isImage = selectedFile && selectedFile.type.startsWith('image/');
    const isPdf = selectedFile && selectedFile.type === 'application/pdf';
    
    const hasExistingFile = existingFile && !selectedFile;
    const existingIsImage = hasExistingFile && existingFile.file_type?.startsWith('image/');
    const existingIsPdf = hasExistingFile && existingFile.file_type === 'application/pdf';



    return (
        <div className="h-full flex flex-col space-y-3 sm:space-y-4">
            {/* Top Bar - File Selection */}
            <div className="flex flex-col gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Upload Button */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileInputChange}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        className="hidden"
                    />
                    <button
                        type="button"
                        onClick={handleUploadClick}
                        className="
                            inline-flex items-center justify-center gap-2 px-4 py-2 flex-shrink-0
                            text-xs font-semibold uppercase tracking-widest
                            text-primary-foreground bg-primary
                            border border-transparent rounded-md
                            hover:bg-primary/90
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                            transition duration-150 ease-in-out
                        "
                    >
                        <Upload className="w-4 h-4" />
                        Choose File
                    </button>

                    {/* Selected or Existing File Info */}
                    {(selectedFile || hasExistingFile) && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {selectedFile ? selectedFile.name : existingFile.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {selectedFile 
                                        ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                                        : existingFile.size
                                    }
                                    {hasExistingFile && (
                                        <span className="ml-2 text-indigo-600 dark:text-indigo-400">
                                            (Current file)
                                        </span>
                                    )}
                                    {selectedFile && existingFile && (
                                        <span className="ml-2 text-green-600 dark:text-green-400">
                                            (New file - will replace)
                                        </span>
                                    )}
                                </p>
                            </div>
                            {selectedFile ? (
                                <button
                                    type="button"
                                    onClick={handleRemoveFile}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition flex-shrink-0"
                                    title="Remove new file"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            ) : hasExistingFile && (
                                <button
                                    type="button"
                                    onClick={handleReplaceFile}
                                    className="px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition flex-shrink-0"
                                >
                                    Replace
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 min-h-0">
                {(selectedFile || hasExistingFile) ? (
                    <div className="h-full border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                        {(isImage || existingIsImage) && (
                            <div className="relative h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-2">
                                <img 
                                    src={selectedFile ? previewUrl : existingFile.config?.public_url} 
                                    alt="Preview" 
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                        )}
                        {(isPdf || existingIsPdf) && (
                            <iframe 
                                src={selectedFile ? previewUrl : existingFile.config?.public_url} 
                                className="w-full h-full"
                                title="PDF Preview"
                            />
                        )}
                        {!isImage && !isPdf && !existingIsImage && !existingIsPdf && (
                            <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 p-4">
                                <div className="text-center space-y-2">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Preview not available for this file type
                                    </p>
                                    {hasExistingFile && existingFile.config?.public_url && (
                                        <a
                                            href={existingFile.config.public_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                                        >
                                            Download current file
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`
                            h-full border-2 border-dashed rounded-lg
                            transition-all duration-200 ease-in-out
                            flex items-center justify-center
                            ${
                                isDragging
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'
                            }
                        `}
                    >
                        <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4 p-4 sm:p-8">
                            {/* Upload Icon */}
                            <div
                                className={`
                                p-3 sm:p-4 rounded-full transition-colors duration-200
                                ${
                                    isDragging
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30'
                                        : 'bg-gray-100 dark:bg-gray-800'
                                }
                            `}
                            >
                                <Upload
                                    className={`
                                    w-6 h-6 sm:w-8 sm:h-8 transition-colors duration-200
                                    ${
                                        isDragging
                                            ? 'text-indigo-600 dark:text-indigo-400'
                                            : 'text-gray-400 dark:text-gray-500'
                                    }
                                `}
                                />
                            </div>

                            {/* Text Content */}
                            <div className="text-center space-y-1 sm:space-y-2">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {isDragging ? 'Drop your files here' : 'Drag and drop your files here'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    or use the "Choose File" button above
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Accepted: PDF, JPG, PNG, DOC, DOCX
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
