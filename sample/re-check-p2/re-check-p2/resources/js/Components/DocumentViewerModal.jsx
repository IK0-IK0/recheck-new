import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DocumentViewerModal({ isOpen, onClose, document, signedUrl }) {
    const [loading, setLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [isOpening, setIsOpening] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 200);
    };
    
    useEffect(() => {
        if (isOpen) {
            setIsOpening(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setIsOpening(false);
                });
            });
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
        }
    }, [isOpen, signedUrl]);

    if (!isOpen && !isClosing) return null;

    const isImage = document?.file_type?.startsWith('image/');
    const isPdf = document?.file_type === 'application/pdf';

    return (
        <div 
            className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 transition-opacity duration-200 ${isClosing ? 'opacity-0' : isOpening ? 'opacity-0' : 'opacity-100'}`}
            onClick={handleClose}
        >
            <div 
                className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full h-full sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-[75vw] sm:max-h-[90vh] md:max-h-[85vh] lg:max-h-[80vh] flex flex-col transition-all duration-200 ${isClosing ? 'opacity-0 scale-95' : isOpening ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                    <div className="flex-1 min-w-0 mr-4">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {document.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {document.size} • {document.uploadedAt}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="
                            p-2 rounded-md flex-shrink-0
                            text-gray-600 dark:text-gray-400
                            hover:text-gray-900 dark:hover:text-gray-200
                            hover:bg-gray-100 dark:hover:bg-gray-700
                            transition duration-150 ease-in-out
                        "
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Viewer Content */}
                <div className="flex-1 overflow-hidden p-4 sm:p-6 bg-gray-50 dark:bg-gray-900 relative">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-10">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading document...</p>
                            </div>
                        </div>
                    )}

                    {isImage && signedUrl && (
                        <div className="h-full flex items-center justify-center">
                            <img 
                                src={signedUrl} 
                                alt={document.name}
                                className="max-w-full max-h-full object-contain"
                                onLoad={() => setLoading(false)}
                                onError={() => {
                                    setLoading(false);
                                    console.error('Failed to load image');
                                }}
                            />
                        </div>
                    )}

                    {isPdf && signedUrl && (
                        <iframe 
                            src={signedUrl}
                            className="w-full h-full border-0 rounded"
                            title={document.name}
                            onLoad={() => setLoading(false)}
                        />
                    )}

                    {!isImage && !isPdf && (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center space-y-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Preview not available for this file type
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Use the download button to view this file
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
