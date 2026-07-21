import { useState, useEffect } from 'react';

export default function Modal({ isOpen, onClose, children, maxWidth = 'max-w-md', fullScreen = false }) {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Opening: show immediately, then animate in
            setIsVisible(true);
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 50);
            return () => clearTimeout(timer);
        } else if (isVisible) {
            // Closing: animate out, then hide
            setIsAnimating(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setIsAnimating(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen, isVisible]);

    const handleBackdropClick = () => {
        onClose();
    };

    if (!isVisible) return null;

    return (
        <div 
            className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${fullScreen ? 'p-2 sm:p-4 lg:p-8' : 'p-4'} transition-opacity duration-200 ${isAnimating && isOpen ? 'opacity-0' : isAnimating && !isOpen ? 'opacity-0' : 'opacity-100'}`}
            onClick={handleBackdropClick}
        >
            <div 
                className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full ${fullScreen ? 'h-full sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-[75vw] sm:max-h-[90vh] md:max-h-[85vh] lg:max-h-[80vh]' : maxWidth} transition-all duration-200 ${isAnimating && isOpen ? 'opacity-0 scale-95' : isAnimating && !isOpen ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}
