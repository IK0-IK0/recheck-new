import { useState, useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import { Edit3, Plus, Trash2, ChevronDown, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import PhaseComponent from '@/components/PhaseComponent';
import ProcessModal from '@/components/ProcessModal';
import PhaseModal from '@/components/PhaseModal';
import ActionModal from '@/components/ActionModal';
import ActionsFlowGraph from '@/components/ActionsFlowGraph';
import { Button } from '@/components/ui/button';

function PhasePipeline({ phases = [], activePhaseId, onPhaseSelect, onAddPhase, onPhaseReorder }) {
    const [draggedPhaseId, setDraggedPhaseId] = useState(null);
    const [previewPhases, setPreviewPhases] = useState(phases);
    const [previewTargetIndex, setPreviewTargetIndex] = useState(null);
    const [isDropping, setIsDropping] = useState(false);
    const itemRefs = useRef({});
    const containerRef = useRef(null);

    useEffect(() => {
        setPreviewPhases(phases);
        setPreviewTargetIndex(null);
        setIsDropping(false);
        setDraggedPhaseId(null);
    }, [phases]);

    const getTranslateX = (phaseId) => {
        if (!draggedPhaseId || previewTargetIndex === null) return 0;
        const originalIndex = phases.findIndex(p => p.id === phaseId);
        const previewIndex = previewPhases.findIndex(p => p.id === phaseId);
        if (originalIndex === previewIndex) return 0;
        const el = itemRefs.current[phaseId];
        if (!el) return 0;
        return (previewIndex - originalIndex) * el.offsetWidth;
    };

    const handleDragStart = (e, phase) => {
        setDraggedPhaseId(phase.id);
        setPreviewTargetIndex(null);
        setIsDropping(false);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleContainerDragOver = (e) => {
        e.preventDefault();
        if (!draggedPhaseId || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const relativeX = e.clientX - containerRect.left;
        const slotWidth = containerRect.width / phases.length;
        const targetIndex = Math.floor(relativeX / slotWidth);
        const clampedIndex = Math.max(0, Math.min(targetIndex, phases.length - 1));

        if (previewTargetIndex === clampedIndex) return;
        setPreviewTargetIndex(clampedIndex);

        const draggedIndex = phases.findIndex(p => p.id === draggedPhaseId);
        if (draggedIndex === -1) return;

        if (clampedIndex === draggedIndex) {
            setPreviewPhases(phases);
            return;
        }

        const newPhases = [...phases];
        const [draggedPhase] = newPhases.splice(draggedIndex, 1);
        newPhases.splice(clampedIndex, 0, draggedPhase);
        setPreviewPhases(newPhases);
    };

    const handleDragEnd = () => {
        if (draggedPhaseId && previewTargetIndex !== null) {
            const draggedIndex = phases.findIndex(p => p.id === draggedPhaseId);
            const newIndex = previewPhases.findIndex(p => p.id === draggedPhaseId);
            if (draggedIndex !== newIndex && draggedIndex !== -1 && newIndex !== -1) {
                setIsDropping(true);
                onPhaseReorder?.(previewPhases);
                // Keep draggedPhaseId and previewTargetIndex - let server update reset them
                return;
            }
        }
        // Only reset if no reorder happened (dropped in same spot)
        setDraggedPhaseId(null);
        setPreviewTargetIndex(null);
    };

    return (
        <div className="flex w-full items-start gap-0 px-10 pt-12 pb-5">
            <div 
                ref={containerRef}
                className="flex flex-1 items-start" 
                onDragOver={handleContainerDragOver}
            >
                {phases.map((phase, originalIndex) => {
                    const isActive = phase.id === activePhaseId;
                    const isDragging = phase.id === draggedPhaseId;
                    const translateX = getTranslateX(phase.id);
                    
                    // Show original index during drag, preview index only after drop
                    const displayIndex = originalIndex;

                    return (
                        <div
                            key={phase.id}
                            ref={el => { itemRefs.current[phase.id] = el; }}
                            className="flex flex-1 items-start"
                            style={{
                                transform: `translateX(${translateX}px)`,
                                // Disable transition during drop to prevent jank
                                transition: isDragging || isDropping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                zIndex: isDragging ? 10 : 1,
                                position: 'relative',
                            }}
                        >
                            <button
                                type="button"
                                draggable
                                onDragStart={(e) => handleDragStart(e, phase)}
                                onDragEnd={handleDragEnd}
                                onClick={() => !draggedPhaseId && onPhaseSelect(phase.id)}
                                className={`flex flex-col items-center gap-1.5 ${isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab hover:scale-105 transition-transform duration-200'}`}
                            >
                                <div className={`flex size-14 items-center justify-center rounded-full border-2 text-base font-semibold transition-colors ${isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-primary bg-primary/10 text-primary hover:bg-primary/20'}`}>
                                    {displayIndex + 1}
                                </div>
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                    Phase {displayIndex + 1}
                                </span>
                                <span className={`max-w-28 text-center text-sm leading-tight ${isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                                    {phase.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {phase.actions?.length ?? 0} action{(phase.actions?.length ?? 0) !== 1 ? 's' : ''}
                                </span>
                            </button>

                            <div className="mx-2 mt-[18px] flex flex-1 items-center text-muted-foreground">
                                <div className="h-px flex-1 bg-border" />
                                <svg className="size-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
                                    <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                type="button"
                onClick={onAddPhase}
                className="flex flex-col items-center gap-1.5 hover:scale-105 transition-transform duration-200"
                aria-label="Add phase"
            >
                <div className="flex size-14 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 bg-muted text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary">
                    <Plus className="size-5" />
                </div>
                <span className="text-xs text-muted-foreground">Add phase</span>
            </button>
        </div>
    );
}

export default function ProcessManagement({ processes = [], roles = [], documents = [] }) {
    const [selectedProcessId, setSelectedProcessId] = useState(processes[0]?.id ?? null);
    const [activePhaseId, setActivePhaseId] = useState(null);
    const [editingProcess, setEditingProcess] = useState(null);
    const [editingPhase, setEditingPhase] = useState(null);
    const [editingAction, setEditingAction] = useState(null);
    const [selectedPhase, setSelectedPhase] = useState(null);
    const [isEditProcessOpen, setIsEditProcessOpen] = useState(false);
    const [isCreatePhaseOpen, setIsCreatePhaseOpen] = useState(false);
    const [isEditPhaseOpen, setIsEditPhaseOpen] = useState(false);
    const [isCreateActionOpen, setIsCreateActionOpen] = useState(false);
    const [isEditActionOpen, setIsEditActionOpen] = useState(false);

    const form = useForm({ name: '', description: '' });
    const processErrors = form.errors || {};

    const activeProcess = processes.find((p) => p.id === selectedProcessId) ?? null;

    const phases = activeProcess?.phases ?? [];
    const activePhase = phases.find((p) => p.id === activePhaseId) ?? phases[0] ?? null;

    // When the selected process changes, reset to the first phase
    useEffect(() => {
        setActivePhaseId(phases[0]?.id ?? null);
    }, [selectedProcessId]);

    const handleCreateProcess = async (values) => {
        form.clearErrors();
        form.setData(values);
        await form.post('/tenant/processes', {
            onSuccess: () => {
                toast.success('Process created.');
            },
            onError: () => {
                toast.error('Unable to create process.');
            },
        });
    };

    const handleUpdateProcess = async (values) => {
        if (!editingProcess) {
            return;
        }

        form.clearErrors();
        form.setData(values);
        await form.put(`/tenant/processes/${editingProcess.id}`, {
            onSuccess: () => {
                toast.success('Process updated.');
                setEditingProcess(null);
                setIsEditProcessOpen(false);
            },
            onError: () => {
                toast.error('Unable to update process.');
            },
        });
    };

    const handleDeleteProcess = async (process) => {
        if (!window.confirm(`Delete process "${process.name}"? This will remove all nested phases and actions.`)) {
            return;
        }

        form.clearErrors();
        form.setData({});
        await form.delete(`/tenant/processes/${process.id}`, {
            onSuccess: () => {
                toast.success('Process deleted.');
                setSelectedProcessId(processes.find((p) => p.id !== process.id)?.id ?? null);
            },
            onError: () => {
                toast.error('Unable to delete process.');
            },
        });
    };

    const handleCreatePhase = async (process, values) => {
        form.clearErrors();
        form.setData(values);
        await form.post(`/tenant/processes/${process.id}/phases`, {
            onSuccess: () => {
                toast.success('Phase created.');
            },
            onError: () => {
                toast.error('Unable to create phase.');
            },
        });
    };

    const handleUpdatePhase = async (values) => {
        if (!editingPhase) {
            return;
        }

        form.clearErrors();
        form.setData(values);
        await form.put(`/tenant/phases/${editingPhase.id}`, {
            onSuccess: () => {
                toast.success('Phase updated.');
                setEditingPhase(null);
                setIsEditPhaseOpen(false);
            },
            onError: () => {
                toast.error('Unable to update phase.');
            },
        });
    };

    const handleDeletePhase = async (phase) => {
        if (!window.confirm(`Delete phase "${phase.name}"? This will remove all nested actions.`)) {
            return;
        }

        form.clearErrors();
        form.setData({});
        await form.delete(`/tenant/phases/${phase.id}`, {
            onSuccess: () => {
                toast.success('Phase deleted.');
            },
            onError: () => {
                toast.error('Unable to delete phase.');
            },
        });
    };

    const handleCreateAction = async (phase, values) => {
        form.clearErrors();
        form.setData(values);
        await form.post(`/tenant/phases/${phase.id}/actions`, {
            onSuccess: () => {
                toast.success('Action created.');
            },
            onError: () => {
                toast.error('Unable to create action.');
            },
        });
    };

    const handleUpdateAction = async (values) => {
        if (!editingAction?.action) {
            return;
        }

        form.clearErrors();
        form.setData(values);
        await form.put(`/tenant/actions/${editingAction.action.id}`, {
            onSuccess: () => {
                toast.success('Action updated.');
                setEditingAction(null);
                setIsEditActionOpen(false);
            },
            onError: () => {
                toast.error('Unable to update action.');
            },
        });
    };

    const handleDeleteAction = async (action) => {
        if (!window.confirm(`Delete action "${action.name}"?`)) {
            return;
        }

        form.clearErrors();
        form.setData({});
        await form.delete(`/tenant/actions/${action.id}`, {
            onSuccess: () => {
                toast.success('Action deleted.');
            },
            onError: () => {
                toast.error('Unable to delete action.');
            },
        });
    };

    const handleActionReorder = async (phase, reorderedActions) => {
        const actionIds = reorderedActions.map((action) => action.id);

        form.clearErrors();
        form.setData({ order: actionIds });
        await form.post(`/tenant/phases/${phase.id}/actions/reorder`, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Action order updated.');
            },
            onError: () => {
                toast.error('Unable to reorder actions.');
            },
        });
    };

    const handlePhaseReorder = async (reorderedPhases) => {
        if (!activeProcess) return;
        
        const phaseIds = reorderedPhases.map((phase) => phase.id);

        form.clearErrors();
        form.setData({ order: phaseIds });
        await form.post(`/tenant/processes/${activeProcess.id}/phases/reorder`, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Phase order updated.');
            },
            onError: () => {
                toast.error('Unable to reorder phases.');
            },
        });
    };

    return (
        <>
            {/* Compact header similar to DatabaseSetup */}
            <div className="flex h-full flex-col overflow-hidden">
                {/* Header - fixed at top */}
                <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                            <Workflow className="size-4 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">Process Management</h1>
                            <p className="text-xs text-muted-foreground">Manage processes, phases, and actions for your workflow</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Process selector */}
                        {processes.length ? (
                            <div className="relative">
                                <select
                                    value={selectedProcessId ?? ''}
                                    onChange={(e) => setSelectedProcessId(Number(e.target.value))}
                                    className="h-8 appearance-none rounded-lg border border-input bg-background py-1.5 pl-3 pr-8 text-xs shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                                >
                                    {processes.map((process) => (
                                        <option key={process.id} value={process.id}>
                                            {process.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            </div>
                        ) : null}

                        <ProcessModal
                            title="Add process"
                            submitLabel="Create process"
                            onSubmit={handleCreateProcess}
                            trigger={<Button size="sm" className="h-8 text-xs">Add Process</Button>}
                        />
                    </div>
                </div>

                {processes.length ? (
                    activeProcess ? (
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            {/* Phase pipeline visualization - fixed */}
                            <div className="flex-none border-b border-border bg-surface">
                                <div className="p-4 pb-3">
                                    <div className="mb-3 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{activeProcess.name}</p>
                                            {activeProcess.description ? (
                                                <p className="mt-0.5 text-xs text-muted-foreground">{activeProcess.description}</p>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                type="button"
                                                onClick={() => {
                                                    setEditingProcess(activeProcess);
                                                    setIsEditProcessOpen(true);
                                                }}
                                                className="h-7 text-xs"
                                            >
                                                <Edit3 className="size-3.5" /> Edit
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                type="button"
                                                onClick={() => handleDeleteProcess(activeProcess)}
                                                className="h-7 text-xs"
                                            >
                                                <Trash2 className="size-3.5" /> Delete
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto pb-1">
                                        <PhasePipeline
                                            phases={activeProcess.phases ?? []}
                                            activePhaseId={activePhase?.id ?? null}
                                            onPhaseSelect={setActivePhaseId}
                                            onAddPhase={() => setIsCreatePhaseOpen(true)}
                                            onPhaseReorder={handlePhaseReorder}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions flow graph - fills remaining space */}
                            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                                <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
                                    <div>
                                        <p className="text-xs font-semibold text-foreground">
                                            {activePhase ? activePhase.name : phases.length === 0 ? 'No phases yet' : 'Select a phase'}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {activePhase 
                                                ? `${activePhase.actions?.length ?? 0} action${(activePhase.actions?.length ?? 0) !== 1 ? 's' : ''}`
                                                : phases.length === 0 
                                                    ? 'Add a phase to get started'
                                                    : 'No phase selected'
                                            }
                                        </p>
                                    </div>
                                    {activePhase ? (
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedPhase(activePhase);
                                                    setIsCreateActionOpen(true);
                                                }}
                                                type="button"
                                                className="h-7 text-xs"
                                            >
                                                <Plus className="size-3.5" /> Add action
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingPhase(activePhase);
                                                    setIsEditPhaseOpen(true);
                                                }}
                                                type="button"
                                                className="h-7 text-xs"
                                            >
                                                <Edit3 className="size-3.5" /> Edit phase
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeletePhase(activePhase)}
                                                type="button"
                                                className="h-7 text-xs"
                                            >
                                                <Trash2 className="size-3.5" /> Delete phase
                                            </Button>
                                        </div>
                                    ) : phases.length === 0 ? (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            onClick={() => setIsCreatePhaseOpen(true)}
                                            type="button"
                                            className="h-7 text-xs"
                                        >
                                            <Plus className="size-3.5" /> Add first phase
                                        </Button>
                                    ) : null}
                                </div>

                                <div className="flex-1 min-h-0">
                                    {activePhase ? (
                                        <ActionsFlowGraph
                                            actions={activePhase.actions ?? []}
                                            onEdit={(action) => {
                                                setEditingAction({ action, phase: activePhase });
                                                setIsEditActionOpen(true);
                                            }}
                                            onDelete={handleDeleteAction}
                                            onReorder={(reorderedActions) => handleActionReorder(activePhase, reorderedActions)}
                                            currentPhaseName={activePhase.name}
                                            nextPhase={(() => {
                                                const currentIndex = phases.findIndex(p => p.id === activePhase.id);
                                                return currentIndex >= 0 && currentIndex < phases.length - 1 
                                                    ? phases[currentIndex + 1] 
                                                    : null;
                                            })()}
                                        />
                                    ) : phases.length === 0 ? (
                                        <div className="flex h-full items-center justify-center">
                                            <div className="text-center space-y-4">
                                                <div className="flex size-16 items-center justify-center rounded-full bg-muted mx-auto">
                                                    <Plus className="size-8 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="font-medium text-foreground">No phases in this process</p>
                                                    <p className="text-sm text-muted-foreground max-w-sm">
                                                        Add your first phase to start building your workflow. Each phase contains actions that define the steps.
                                                    </p>
                                                </div>
                                                <Button
                                                    onClick={() => setIsCreatePhaseOpen(true)}
                                                    type="button"
                                                >
                                                    <Plus className="size-4" /> Add phase
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                            No phase selected. Click on a phase above to view its actions.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center p-8 max-w-md">
                            <div className="flex size-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                                <Plus className="size-8 text-muted-foreground" />
                            </div>
                            <p className="font-medium text-foreground mb-2">No processes found</p>
                            <p className="text-sm text-muted-foreground">
                                Add a process to start building your workflow.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {editingProcess ? (
                <ProcessModal
                    title="Edit process"
                    submitLabel="Save changes"
                    open={isEditProcessOpen}
                    onOpenChange={(nextOpen) => {
                        setIsEditProcessOpen(nextOpen);
                        if (!nextOpen) {
                            setEditingProcess(null);
                        }
                    }}
                    initialValues={{ name: editingProcess.name, description: editingProcess.description || '' }}
                    onSubmit={handleUpdateProcess}
                />
            ) : null}

            <PhaseModal
                title="Add phase"
                submitLabel="Create phase"
                open={isCreatePhaseOpen}
                onOpenChange={setIsCreatePhaseOpen}
                onSubmit={async (values) => {
                    await handleCreatePhase(activeProcess, values);
                    setIsCreatePhaseOpen(false);
                }}
            />

            {editingPhase ? (
                <PhaseModal
                    title="Edit phase"
                    submitLabel="Save changes"
                    open={isEditPhaseOpen}
                    onOpenChange={(nextOpen) => {
                        setIsEditPhaseOpen(nextOpen);
                        if (!nextOpen) {
                            setEditingPhase(null);
                        }
                    }}
                    initialValues={{ name: editingPhase.name }}
                    onSubmit={handleUpdatePhase}
                />
            ) : null}

            {selectedPhase ? (
                <ActionModal
                    title="Add action"
                    submitLabel="Create action"
                    roles={roles}
                    documents={documents}
                    open={isCreateActionOpen}
                    onOpenChange={(nextOpen) => {
                        setIsCreateActionOpen(nextOpen);
                        if (!nextOpen) {
                            setSelectedPhase(null);
                        }
                    }}
                    onSubmit={async (values) => {
                        await handleCreateAction(selectedPhase, values);
                        setSelectedPhase(null);
                    }}
                />
            ) : null}

            {editingAction ? (
                <ActionModal
                    title="Edit action"
                    submitLabel="Save changes"
                    roles={roles}
                    documents={documents}
                    open={isEditActionOpen}
                    onOpenChange={(nextOpen) => {
                        setIsEditActionOpen(nextOpen);
                        if (!nextOpen) {
                            setEditingAction(null);
                        }
                    }}
                    initialValues={{
                        name: editingAction.action.name,
                        description: editingAction.action.description || '',
                        action_type: editingAction.action.action_type || 'check',
                        requires_file: Boolean(editingAction.action.requires_file),
                        document_ids: (editingAction.action.documents || []).map((document) => document.id),
                        roles: (editingAction.action.roles || []).map((role) => role.id),
                    }}
                    onSubmit={async (values) => {
                        await handleUpdateAction(values);
                        setEditingAction(null);
                    }}
                />
            ) : null}

            {processErrors && Object.keys(processErrors).length ? (
                <div className="mt-6 rounded-2xl border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                    <p className="font-semibold">Validation errors occurred:</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        {Object.entries(processErrors).map(([key, value]) => (
                            <li key={key}>{value}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </>
    );
}
