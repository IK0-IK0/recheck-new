import { useState, useEffect, useMemo } from 'react';
import { useForm } from '@inertiajs/react';
import { Edit3, FolderKanban, Plus, Trash2, ChevronDown, GitBranch, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import PhaseComponent from '@/components/PhaseComponent';
import ProcessModal from '@/components/ProcessModal';
import PhaseModal from '@/components/PhaseModal';
import ActionModal from '@/components/ActionModal';
import ActionsFlowGraph from '@/components/ActionsFlowGraph';
import PhasePipeline from '@/components/PhasePipeline';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const decisionBranchColors = ['#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#f97316'];

function buildDecisionBranches(action, actions = [], nextPhase = null) {
    const actionById = new Map(actions.map((item) => [String(item.id), item]));
    const nextAction = actions[actions.findIndex((item) => item.id === action.id) + 1];
    const nextStepName = nextAction?.name ?? nextPhase?.name ?? 'No next step configured';
    const customBranches = action.custom_decision_branches ?? [];

    if (action.decision_mode === 'custom') {
        return customBranches.map((branch, index) => {
            const targetId = branch.destination.startsWith('action:')
                ? branch.destination.slice('action:'.length)
                : null;
            const target = targetId ? actionById.get(targetId) : null;

            return {
                ...branch,
                type: 'custom',
                destination_label: target?.name
                    ?? (branch.destination === 'end' ? 'End this path' : nextStepName),
                color: decisionBranchColors[index % decisionBranchColors.length],
            };
        });
    }

    const approveTarget = action.approve_action_id == null
        ? null
        : actionById.get(String(action.approve_action_id));
    const denyTarget = action.deny_action_id == null
        ? null
        : actionById.get(String(action.deny_action_id));

    return [
        {
            id: 'approve',
            type: 'approve',
            label: 'Approve',
            destination: approveTarget ? `action:${approveTarget.id}` : 'next',
            destination_label: approveTarget?.name ?? nextStepName,
            color: '#16a34a',
        },
        {
            id: 'deny',
            type: 'deny',
            label: 'Deny',
            destination: denyTarget ? `action:${denyTarget.id}` : 'end',
            destination_label: denyTarget?.name ?? 'End this path',
            color: '#dc2626',
        },
    ];
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
    const [actionToDelete, setActionToDelete] = useState(null);
    const form = useForm({ name: '', description: '' });
    const processErrors = form.errors || {};

    const activeProcess = processes.find((p) => p.id === selectedProcessId) ?? null;

    const phases = activeProcess?.phases ?? [];
    const activePhase = phases.find((p) => p.id === activePhaseId) ?? phases[0] ?? null;
    const activePhaseActions = activePhase?.actions ?? [];
    const activePhaseIndex = phases.findIndex((phase) => phase.id === activePhase?.id);
    const nextPhase = activePhaseIndex >= 0 ? phases[activePhaseIndex + 1] ?? null : null;
    const graphActions = useMemo(() => activePhaseActions.map((action) => ({
        ...action,
        decision_branches: action.action_type === 'review'
            ? buildDecisionBranches(
                action,
                activePhaseActions,
                nextPhase,
            )
            : [],
    })), [activePhaseActions, nextPhase]);

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
        const existingActionIds = new Set((phase.actions ?? []).map((action) => action.id));
        form.clearErrors();
        form.setData(values);
        await form.post(`/tenant/phases/${phase.id}/actions`, {
            preserveState: true,
            onSuccess: (page) => {
                toast.success('Action created.');
                const savedPhase = page.props.processes
                    .flatMap((process) => process.phases)
                    .find((item) => item.id === phase.id);
                const savedAction = savedPhase?.actions?.find((action) => (
                    !existingActionIds.has(action.id) && action.name === values.name
                ));

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
            preserveState: true,
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

    const handleDeleteAction = (action) => {
        setActionToDelete(action);
    };

    const confirmDeleteAction = async () => {
        if (!actionToDelete) {
            return;
        }

        const action = actionToDelete;
        form.clearErrors();
        form.setData({});
        await form.delete(`/tenant/actions/${action.id}`, {
            onSuccess: () => {
                toast.success('Action deleted.');
                setActionToDelete(null);

                setDecisionDrafts((currentDrafts) => {
                    const nextDrafts = { ...currentDrafts };

                    delete nextDrafts[action.id];

                    return nextDrafts;
                });
            },
            onError: () => {
                toast.error('Unable to delete action.');
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

    const handleActionReorder = async (actionIds) => {
        if (!activePhase) {
            return false;
        }

        let reordered = false;
        form.clearErrors();
        form.setData({ order: actionIds });
        await form.post(`/tenant/phases/${activePhase.id}/actions/reorder`, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                reordered = true;
                toast.success('Action order updated.');
            },
            onError: () => {
                toast.error('Unable to reorder actions.');
            },
        });

        return reordered;
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
                                            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><FolderKanban className="size-3.5 text-primary" aria-hidden="true" />{activeProcess.name}</p>
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

                                    <div className="-mx-4 min-w-0 rounded-xl border border-border bg-background pb-1">
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
                                <div className="flex-none flex items-center justify-between px-4 py-3 border-border bg-surface">
                                    <div>
                                        <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                            <GitBranch className="size-3.5 text-primary" aria-hidden="true" />
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
                                            key={activePhase.id}
                                            actions={graphActions}
                                            onReorderActions={handleActionReorder}
                                            onAddAction={() => {
                                                setSelectedPhase(activePhase);
                                                setIsCreateActionOpen(true);
                                            }}
                                            onEdit={(action) => {
                                                setEditingAction({ action, phase: activePhase });
                                                setIsEditActionOpen(true);
                                            }}
                                            onDelete={handleDeleteAction}
                                            currentPhaseName={activePhase.name}
                                            nextPhase={nextPhase}
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
                    actions={selectedPhase.actions ?? []}
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
                    actions={editingAction.phase.actions ?? []}
                    actionId={editingAction.action.id}
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
                        reviewer_groups: editingAction.action.reviewer_groups ?? [],
                        approve_action_id: editingAction.action.approve_action_id ?? null,
                        deny_action_id: editingAction.action.deny_action_id ?? null,
                        decision_mode: editingAction.action.decision_mode ?? 'approve_deny',
                        custom_decision_branches: editingAction.action.custom_decision_branches ?? [],
                    }}
                    onSubmit={async (values) => {
                        await handleUpdateAction(values);
                        setEditingAction(null);
                    }}
                />
            ) : null}

            <Dialog
                open={Boolean(actionToDelete)}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen && !form.processing) {
                        setActionToDelete(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete action?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{actionToDelete?.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={form.processing}
                            onClick={() => setActionToDelete(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={form.processing}
                            onClick={confirmDeleteAction}
                        >
                            {form.processing ? 'Deleting…' : 'Delete action'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
