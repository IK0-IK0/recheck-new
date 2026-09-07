import { useCallback, useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FileDropZone({
    onFilesSelected,
    accept = '*',
    maxSize = 10 * 1024 * 1024, // 10MB default
    multiple = false,
    className,
}) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [error, setError] = useState('');

    const validateFiles = (files) => {
        const fileArray = Array.from(files);
        
        if (!multiple && fileArray.length > 1) {
            setError('Only one file is allowed');
            return [];
        }

        const validFiles = fileArray.filter((file) => {
            if (file.size > maxSize) {
                setError(`File "${file.name}" exceeds maximum size of ${Math.round(maxSize / 1024 / 1024)}MB`);
                return false;
            }
            return true;
        });

        return validFiles;
    };

    const handleFiles = useCallback((files) => {
        setError('');
        const validFiles = validateFiles(files);
        
        if (validFiles.length > 0) {
            setSelectedFiles(validFiles);
            onFilesSelected?.(validFiles);
        }
    }, [onFilesSelected, maxSize, multiple]);

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
    };

    const handleFileInput = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
    };

    const removeFile = (index) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(newFiles);
        onFilesSelected?.(newFiles);
    };

    const clearAll = () => {
        setSelectedFiles([]);
        setError('');
        onFilesSelected?.([]);
    };

    return (
        <div className={cn('space-y-4 w-full max-w-full overflow-hidden', className)}>
            {/* Drop Zone - Hide when file is selected in single-file mode */}
            {(multiple || selectedFiles.length === 0) && (
                <div
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                        'relative rounded-lg border-2 border-dashed transition-colors',
                        isDragActive
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-surface hover:border-primary/50 hover:bg-surface/80',
                    )}
                >
                    <input
                        type="file"
                        id="file-upload"
                        className="absolute inset-0 z-10 cursor-pointer opacity-0"
                        onChange={handleFileInput}
                        accept={accept}
                        multiple={multiple}
                    />
                    
                    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                        <div className={cn(
                            'mb-4 rounded-full p-3 transition-colors',
                            isDragActive ? 'bg-primary/20' : 'bg-muted'
                        )}>
                            <Upload className={cn(
                                'size-8 transition-colors',
                                isDragActive ? 'text-primary' : 'text-muted-foreground'
                            )} />
                        </div>
                        
                        <p className="mb-2 text-sm font-medium text-foreground">
                            {isDragActive ? 'Drop file here' : 'Drag and drop file here'}
                        </p>
                        
                        <p className="mb-4 text-xs text-muted-foreground">
                            or click to browse from your computer
                        </p>
                        
                        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                            <span>Max {Math.round(maxSize / 1024 / 1024)}MB</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3">
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">
                            {multiple 
                                ? `Selected ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`
                                : 'Selected file'
                            }
                        </p>
                        {multiple && (
                            <button
                                type="button"
                                onClick={clearAll}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Clear all
                            </button>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                            <div
                                key={`${file.name}-${index}`}
                                className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 max-w-full"
                            >
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                                    <File className="size-5 text-primary" />
                                </div>
                                
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground break-all" title={file.name}>
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {(file.size / 1024).toFixed(2)} KB
                                    </p>
                                </div>
                                
                                <button
                                    type="button"
                                    onClick={() => removeFile(index)}
                                    className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    title={multiple ? "Remove file" : "Change file"}
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
