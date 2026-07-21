import { useState, useEffect } from 'react';

export default function PhaseEditModal({ 
  phase, 
  isOpen, 
  onClose, 
  onSave, 
  isLoading = false 
}) {
  const [name, setName] = useState(phase?.name || '');
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

  const handleSave = async () => {
    await onSave({ ...phase, name });
    handleClose();
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${isClosing || isAnimating ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-card border border-border rounded-lg shadow-lg w-full max-w-md p-6 transition-all duration-200 ${isClosing || isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground mb-4">Edit Phase</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Phase Title
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
            )}
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}