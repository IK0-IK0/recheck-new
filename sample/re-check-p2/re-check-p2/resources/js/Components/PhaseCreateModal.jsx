import { useState, useEffect } from 'react';

export default function PhaseCreateModal({ isOpen, onClose, onSave, isLoading = false }) {
    const [name, setName] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [isAnimating, setIsAnimating] = useState(true);

    const handleClose = () => {
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

    const handleSave = () => {
        if (!name.trim()) {
            alert('Please enter a phase title');
            return;
        }
        onSave({ name: name.trim() });
        setName('');
    };

    if (!isOpen && !isClosing) return null;

    return (
        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${isClosing || isAnimating ? 'opacity-0' : 'opacity-100'}`} onClick={handleClose}>
            <div className={`bg-card border border-border rounded-lg shadow-lg w-full max-w-md transition-all duration-200 ${isClosing || isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} onClick={(e) => e.stopPropagation()}>
                <div className="p-6 pb-4">
                    <h3 className="text-lg font-semibold text-foreground">Create New Phase</h3>
                </div>
                <div className="px-6 pb-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Phase Title</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter phase title"
                            autoFocus
                            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary"
                        />
                    </div>
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
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isLoading && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>}
                        {isLoading ? 'Creating...' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}
