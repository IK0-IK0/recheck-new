import { useState, useMemo, useEffect } from 'react';
import CustomDropdown from './CustomDropdown';
import { AVAILABLE_ROLES } from '@/constants/workflowConstants';
import { Search, X, Plus } from 'lucide-react';

export default function ActionEditModal({ 
    action, 
    isOpen, 
    onClose, 
    onSave, 
    isNew = false, 
    isLoading = false,
    availableDocuments = [],
    isLoadingDocuments = false
}) {
    const [type, setType] = useState(action?.type || 'upload_documents');
    const [name, setName] = useState(action?.name || '');
    const [assignedRole, setAssignedRole] = useState(action?.assignedRole || AVAILABLE_ROLES[0]);
    const [description, setDescription] = useState(action?.description || '');
    const [selectedDocuments, setSelectedDocuments] = useState(action?.documents || []);
    const [formFields, setFormFields] = useState(action?.formFields?.join(', ') || '');
    const [checkOptions, setCheckOptions] = useState(action?.checkOptions?.join(', ') || 'Approve, Deny, Request Changes');
    const [decisionOptions, setDecisionOptions] = useState(action?.options || [{ label: '', nextPhase: '' }]);
    const [documentSearch, setDocumentSearch] = useState('');
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

    // Filter documents based on search
    const filteredDocuments = useMemo(() => {
        if (!documentSearch.trim()) return availableDocuments;

        const searchLower = documentSearch.toLowerCase();
        return availableDocuments.filter(doc =>
            doc.name.toLowerCase().includes(searchLower) ||
            (doc.description && doc.description.toLowerCase().includes(searchLower))
        );
    }, [documentSearch, availableDocuments]);

    const toggleDocument = (docId) => {
        setSelectedDocuments(prev =>
            prev.includes(docId)
                ? prev.filter(d => d !== docId)
                : [...prev, docId]
        );
    };

    const handleSave = async () => {
        const newAction = {
            ...action,
            type,
            name,
            assignedRole,
            description,
        };

        if (type === 'upload_documents') {
            newAction.documents = selectedDocuments;
            if (formFields.trim()) {
                newAction.formFields = formFields.split(',').map(f => f.trim());
            }
        }
        if (type === 'check_documents') {
            newAction.checkOptions = checkOptions.split(',').map(c => c.trim());
        }
        if (type === 'make_decision') {
            newAction.options = decisionOptions.filter(o => o.label);
        }

        await onSave(newAction);
        handleClose();
    };

    if (!isOpen && !isClosing) return null;

    return (
        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 transition-opacity duration-200 ${isClosing || isAnimating ? 'opacity-0' : 'opacity-100'}`} onClick={handleClose}>
            <div className={`bg-card border border-border rounded-lg shadow-lg w-full max-w-xl my-8 flex flex-col max-h-[85vh] transition-all duration-200 ${isClosing || isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`} onClick={(e) => e.stopPropagation()}>
                <div className="p-6 pb-0">
                    <h3 className="text-lg font-semibold text-foreground mb-4">{isNew ? 'Add Action' : 'Edit Action'}</h3>
                </div>
                <div className="overflow-y-auto px-6">
                    <div className="space-y-4 pb-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Action Title</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={isLoading}
                                maxLength={20}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Action Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                disabled={isLoading}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="upload_documents">Upload Documents</option>
                                <option value="make_decision">Make Decision</option>
                                <option value="sign_documents">Sign Documents</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Assigned Role</label>
                            <CustomDropdown
                                value={assignedRole}
                                onChange={setAssignedRole}
                                options={AVAILABLE_ROLES}
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={isLoading}
                                rows="2"
                                maxLength={500}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Type-specific fields */}
                        {type === 'upload_documents' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">Documents Required</label>

                                    {/* Selected documents summary */}
                                    {selectedDocuments.length > 0 && (
                                        <div className="mb-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-sm font-medium text-foreground">
                                                    Selected ({selectedDocuments.length})
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedDocuments([])}
                                                    disabled={isLoading}
                                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                                >
                                                    <X size={14} />
                                                    Clear all
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {selectedDocuments.map(docId => {
                                                    const doc = availableDocuments.find(d => d.id === docId);
                                                    return doc ? (
                                                        <span
                                                            key={docId}
                                                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary text-xs rounded"
                                                        >
                                                            {doc.name}
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleDocument(docId)}
                                                                disabled={isLoading}
                                                                className="hover:text-primary/70"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Search bar */}
                                    <div className="relative mb-3">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                                        <input
                                            type="text"
                                            value={documentSearch}
                                            onChange={(e) => setDocumentSearch(e.target.value)}
                                            placeholder="Search documents..."
                                            disabled={isLoading}
                                            className="w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        {documentSearch && (
                                            <button
                                                type="button"
                                                onClick={() => setDocumentSearch('')}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Documents list with scroll */}
                                    <div className="space-y-2 bg-muted/30 p-3 rounded-lg border border-border">
                                        <div className="max-h-60 overflow-y-auto pr-2">
                                            {isLoadingDocuments ? (
                                                <div className="text-center py-4 text-muted-foreground text-sm">
                                                    Loading documents...
                                                </div>
                                            ) : filteredDocuments.length === 0 ? (
                                                <div className="text-center py-4 text-muted-foreground text-sm">
                                                    {availableDocuments.length === 0 
                                                        ? 'No documents available. Upload documents in Document Management first.'
                                                        : 'No documents found'}
                                                </div>
                                            ) : (
                                                filteredDocuments.map((doc) => (
                                                    <label
                                                        key={doc.id}
                                                        className="flex items-start gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed group"
                                                        style={{ pointerEvents: isLoading ? 'none' : 'auto' }}
                                                    >
                                                        <div className="flex items-center h-5">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedDocuments.includes(doc.id)}
                                                                onChange={() => toggleDocument(doc.id)}
                                                                disabled={isLoading}
                                                                className="cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <span className="text-sm font-medium text-foreground truncate">
                                                                    {doc.name}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground ml-2">
                                                                    {doc.type === 'fillable' ? 'Fill Out' : 'Upload'}
                                                                </span>
                                                            </div>
                                                            {doc.description && (
                                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                                    {doc.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </label>
                                                ))
                                            )}
                                        </div>

                                        {/* Search results info */}
                                        {documentSearch && filteredDocuments.length > 0 && !isLoadingDocuments && (
                                            <div className="text-xs text-muted-foreground pt-2 border-t border-border mt-2">
                                                Showing {filteredDocuments.length} of {availableDocuments.length} documents
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {type === 'check_documents' && (
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1">Check Options (comma-separated)</label>
                                <input
                                    type="text"
                                    value={checkOptions}
                                    onChange={(e) => setCheckOptions(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        )}

                        {type === 'make_decision' && (
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Decision Options
                                </label>
                                <div className="space-y-3">
                                    {decisionOptions.map((opt, idx) => (
                                        <div key={idx} className="flex items-start gap-2">
                                            {/* Option Label */}
                                            <input
                                                type="text"
                                                value={opt.label}
                                                onChange={(e) => {
                                                    const newOpts = [...decisionOptions];
                                                    newOpts[idx].label = e.target.value;
                                                    setDecisionOptions(newOpts);
                                                }}
                                                disabled={isLoading}
                                                placeholder="e.g., Approve"
                                                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary text-sm disabled:opacity-50"
                                            />

                                            {/* Target Type Dropdown */}
                                            <select
                                                value={opt.targetType}
                                                onChange={(e) => {
                                                    const newOpts = [...decisionOptions];
                                                    newOpts[idx].targetType = e.target.value;
                                                    // When switching to next/prev, set the nextPhase value accordingly
                                                    if (e.target.value === 'next') newOpts[idx].nextPhase = 'next';
                                                    else if (e.target.value === 'prev') newOpts[idx].nextPhase = 'prev';
                                                    // When switching to custom, preserve the existing custom value or set to ''
                                                    else newOpts[idx].nextPhase = newOpts[idx].customValue || '';
                                                    setDecisionOptions(newOpts);
                                                }}
                                                maxLength={25}
                                                disabled={isLoading}
                                                className="w-32 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary text-sm disabled:opacity-50"
                                            >
                                                <option value="next">Next Action</option>
                                                <option value="prev">Prev Action</option>
                                                <option value="custom">Custom...</option>
                                            </select>

                                            {/* Custom Number Input (only shown when targetType is 'custom') */}
                                            {opt.targetType === 'custom' && (
                                                <input
                                                    type="text"
                                                    value={opt.customValue || ''}
                                                    onChange={(e) => {
                                                        const newOpts = [...decisionOptions];
                                                        newOpts[idx].customValue = e.target.value;
                                                        newOpts[idx].nextPhase = e.target.value; // keep nextPhase in sync
                                                        setDecisionOptions(newOpts);
                                                    }}
                                                    disabled={isLoading}
                                                    placeholder="e.g., 3, phase 2"
                                                    className="w-28 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary text-sm disabled:opacity-50 font-mono"
                                                />
                                            )}

                                            {/* Remove Option Button */}
                                            {decisionOptions.length > 1 && (
                                                <button
                                                    onClick={() => {
                                                        const newOpts = decisionOptions.filter((_, i) => i !== idx);
                                                        setDecisionOptions(newOpts);
                                                    }}
                                                    disabled={isLoading}
                                                    className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition disabled:opacity-50"
                                                    title="Remove option"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Add Option Button */}
                                <button
                                    onClick={() =>
                                        setDecisionOptions([
                                            ...decisionOptions,
                                            {
                                                label: '',
                                                nextPhase: 'next',
                                                targetType: 'next',
                                                customValue: ''
                                            }
                                        ])
                                    }
                                    disabled={isLoading}
                                    className="mt-3 text-sm text-primary hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                                >
                                    <Plus size={16} />
                                    Add Option
                                </button>
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                    Tip: Choose <span className="font-mono bg-muted/50 px-1 py-0.5 rounded">Next Action</span> or{' '}
                                    <span className="font-mono bg-muted/50 px-1 py-0.5 rounded">Previous Action</span> for relative moves, or{' '}
                                    <span className="font-mono bg-muted/50 px-1 py-0.5 rounded">Custom...</span> to enter a specific action/phase number.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 p-6 pt-5 border-t border-border">
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
                        {isLoading && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>}
                        {isLoading ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}