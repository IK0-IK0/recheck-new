import { AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ConfirmDeleteModal({ isOpen, onClose, onConfirm, title = 'Delete Item', message = 'Are you sure you want to delete this item? This action cannot be undone.', isLoading = false }) {
    const [isClosing, setIsClosing] = useState(false);
    const [isAnimating, setIsAnimating] = useState(true);

    const handleClose = () => {
        if (isLoading) return;
        setIsClosing(true);
        setIsAnimating(true);
        setTimeout(() => {
            setIsClosing(false);
            setIsAnimating(true);
            onClose();
        }, 200);
    };
    
    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen && !isClosing) return null;

    return (
        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${isClosing || isAnimating ? 'opacity-0' : 'opacity-100'}`} onClick={handleClose}>
            <div className={`bg-card border border-border rounded-lg shadow-lg w-full max-w-md transition-all duration-200 ${isClosing || isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} onClick={(e) => e.stopPropagation()}>
                <div className="p-6 pb-4 flex items-start gap-4">
                    <div className="flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
                    </div>
                </div>
                <div className="px-6 pb-6">
                    <p className="text-muted-foreground">{message}</p>
                </div>
                <div className="border-t border-border flex gap-2 p-6 justify-end">
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        {isLoading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}
