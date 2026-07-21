import { Head } from '@inertiajs/react';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ActionEditModal from '@/Components/ActionEditModal';
import PhaseEditModal from '@/Components/PhaseEditModal';
import Phase from '@/Components/Phase';
import WorkflowCreateModal from '@/Components/WorkflowCreateModal';
import ProcessEditModal from '@/Components/ProcessEditModal';
import PhaseCreateModal from '@/Components/PhaseCreateModal';
import ConfirmDeleteModal from '@/Components/ConfirmDeleteModal';

export default function ProcessManagement({ initialProcesses = [] }) {
    const [selectedProcessId, setSelectedProcessId] = useState(initialProcesses[0]?.id || null);
    const [expandedPhaseId, setExpandedPhaseId] = useState(initialProcesses[0]?.phases[0]?.id || null);
    const [editingPhase, setEditingPhase] = useState(null);
    const [editingAction, setEditingAction] = useState(null);
    const [editingProcess, setEditingProcess] = useState(null);
    const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
    const [isWorkflowCreateModalOpen, setIsWorkflowCreateModalOpen] = useState(false);
    const [isPhaseCreateModalOpen, setIsPhaseCreateModalOpen] = useState(false);
    const [processes, setProcesses] = useState(initialProcesses);
    const [isAddingPhase, setIsAddingPhase] = useState(false);
    const [isAddingAction, setIsAddingAction] = useState(false);
    const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
    const [isSavingPhase, setIsSavingPhase] = useState(false);
    const [isDeletingPhase, setIsDeletingPhase] = useState(false);
    const [deletingPhaseInfo, setDeletingPhaseInfo] = useState(null);
    const [isDeletePhaseModalOpen, setIsDeletePhaseModalOpen] = useState(false);
    const [isDeletingAction, setIsDeletingAction] = useState(false);
    const [isReorderingPhases, setIsReorderingPhases] = useState(false);
    const [deletingActionInfo, setDeletingActionInfo] = useState(null);
    const [isDeleteActionModalOpen, setIsDeleteActionModalOpen] = useState(false);
    const [isSavingProcess, setIsSavingProcess] = useState(false);
    const [isDeletingProcess, setIsDeletingProcess] = useState(false);
    const [isSavingAction, setIsSavingAction] = useState(false);
    const [deletingProcessInfo, setDeletingProcessInfo] = useState(null);
    const [isDeleteProcessModalOpen, setIsDeleteProcessModalOpen] = useState(false);
    const [isReorderingActions, setIsReorderingActions] = useState(false);
    const [availableDocuments, setAvailableDocuments] = useState([]);
    const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);

    // Refs to track active operations and their toast IDs
    const activeOperations = useRef({});

    const currentProcess = processes.find(p => p.id === selectedProcessId);

    // Fetch available documents from document management
    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                setIsLoadingDocuments(true);
                const response = await fetch('/api/documents/workflow', {
                    headers: {
                        'Accept': 'application/json',
                    },
                    credentials: 'same-origin',
                });
                
                if (response.ok) {
                    const documents = await response.json();
                    setAvailableDocuments(documents);
                } else {
                    console.error('Failed to fetch documents:', response.status);
                    setAvailableDocuments([]);
                }
            } catch (error) {
                console.error('Error fetching documents:', error);
                setAvailableDocuments([]);
            } finally {
                setIsLoadingDocuments(false);
            }
        };

        fetchDocuments();
    }, []);

    // Show loading toast when modal closes during operation
    useEffect(() => {
        if (!isActionModalOpen && isAddingAction) {
            const opKey = 'addAction';
            if (!activeOperations.current[opKey]?.toastId) {
                const toastId = toast.loading('Adding action...');
                if (activeOperations.current[opKey]) {
                    activeOperations.current[opKey].toastId = toastId;
                }
            }
        }
        if (!isActionModalOpen && isSavingAction) {
            const opKey = 'saveAction';
            if (!activeOperations.current[opKey]?.toastId) {
                const toastId = toast.loading('Updating action...');
                if (activeOperations.current[opKey]) {
                    activeOperations.current[opKey].toastId = toastId;
                }
            }
        }
    }, [isActionModalOpen, isAddingAction, isSavingAction]);

    useEffect(() => {
        if (!isPhaseModalOpen && isSavingPhase) {
            const opKey = 'savePhase';
            if (!activeOperations.current[opKey]?.toastId) {
                const toastId = toast.loading('Updating phase...');
                if (activeOperations.current[opKey]) {
                    activeOperations.current[opKey].toastId = toastId;
                }
            }
        }
    }, [isPhaseModalOpen, isSavingPhase]);

    useEffect(() => {
        if (!isPhaseCreateModalOpen && isAddingPhase) {
            const opKey = 'addPhase';
            if (!activeOperations.current[opKey]?.toastId) {
                const toastId = toast.loading('Adding phase...');
                if (activeOperations.current[opKey]) {
                    activeOperations.current[opKey].toastId = toastId;
                }
            }
        }
    }, [isPhaseCreateModalOpen, isAddingPhase]);

    useEffect(() => {
        if (!isProcessModalOpen && isSavingProcess) {
            const opKey = 'saveProcess';
            if (!activeOperations.current[opKey]?.toastId) {
                const toastId = toast.loading('Updating workflow...');
                if (activeOperations.current[opKey]) {
                    activeOperations.current[opKey].toastId = toastId;
                }
            }
        }
    }, [isProcessModalOpen, isSavingProcess]);

    useEffect(() => {
        if (!isWorkflowCreateModalOpen && isCreatingWorkflow) {
            const opKey = 'createWorkflow';
            if (!activeOperations.current[opKey]?.toastId) {
                const toastId = toast.loading('Creating workflow...');
                if (activeOperations.current[opKey]) {
                    activeOperations.current[opKey].toastId = toastId;
                }
            }
        }
    }, [isWorkflowCreateModalOpen, isCreatingWorkflow]);

    useEffect(() => {
        if (!isDeleteActionModalOpen && isDeletingAction) {
            const opKey = 'deleteAction';
            if (!activeOperations.current[opKey]?.toastId) {
                const toastId = toast.loading('Deleting action...');
                if (activeOperations.current[opKey]) {
                    activeOperations.current[opKey].toastId = toastId;
                }
            }
        }
    }, [isDeleteActionModalOpen, isDeletingAction]);

    useEffect(() => {
        if (!isDeletePhaseModalOpen && isDeletingPhase) {
            const opKey = 'deletePhase';
            if (!activeOperations.current[opKey]?.toastId) {
                const toastId = toast.loading('Deleting phase...');
                if (activeOperations.current[opKey]) {
                    activeOperations.current[opKey].toastId = toastId;
                }
            }
        }
    }, [isDeletePhaseModalOpen, isDeletingPhase]);

    useEffect(() => {
        if (!isDeleteProcessModalOpen && isDeletingProcess) {
            const opKey = 'deleteProcess';
            if (!activeOperations.current[opKey]?.toastId) {
                const toastId = toast.loading('Deleting workflow...');
                if (activeOperations.current[opKey]) {
                    activeOperations.current[opKey].toastId = toastId;
                }
            }
        }
    }, [isDeleteProcessModalOpen, isDeletingProcess]);

    // Helper function for API calls
    const apiCall = async (method, url, data = null, setLoadingFn = null, options = {}) => {
        const { 
            successMessage = null, 
            errorMessage = null,
            operationKey = null,
            loadingMessage = 'Processing...'
        } = options;

        const operationId = operationKey || `${method}-${url}-${Date.now()}`;
        let toastId = null;

        try {
            if (setLoadingFn) setLoadingFn(true);
            
            // Track this operation
            activeOperations.current[operationId] = {
                loadingMessage,
                startTime: Date.now()
            };

            const requestOptions = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            };
            if (data) {
                requestOptions.body = JSON.stringify(data);
            }

            console.log(`\n[API REQUEST] ${method} ${url}`);
            console.log('  Body:', data);

            const response = await fetch(url, requestOptions);

            let responseData;
            try {
                const responseText = await response.text();
                console.log(`[API RESPONSE STATUS] ${response.status}`);
                console.log(`[API RESPONSE TEXT] ${responseText.substring(0, 500)}`);
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse response as JSON. Raw response:', await response.clone().text());
                throw new Error('Server returned invalid response - check browser console and server logs');
            }

            if (!response.ok) {
                console.error(`[API ERROR] ${response.status} ${response.statusText}`, responseData);
                const errorMsg = responseData?.message || (responseData?.errors ? JSON.stringify(responseData.errors) : `API error: ${response.status}`);
                throw new Error(errorMsg);
            }
            
            console.log(`[API SUCCESS] ${method} ${url}`, responseData);
            
            // Check if we have a loading toast to dismiss
            if (activeOperations.current[operationId]) {
                toastId = activeOperations.current[operationId].toastId;
                if (toastId) {
                    // Dismiss the loading toast first
                    toast.dismiss(toastId);
                    // Small delay to ensure loading toast is dismissed before showing success
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            // Show success message after loading toast is dismissed
            if (successMessage) {
                toast.success(successMessage);
            }
            
            // Clean up operation tracking
            delete activeOperations.current[operationId];
            
            return responseData;
        } catch (error) {
            console.error('\n=== API ERROR DETAILS ===');
            console.error('Error:', error.message);
            console.error('Stack:', error.stack);
            console.error('========================\n');
            
            // Check if we have a loading toast to dismiss
            if (activeOperations.current[operationId]) {
                toastId = activeOperations.current[operationId].toastId;
                if (toastId) {
                    // Dismiss the loading toast first
                    toast.dismiss(toastId);
                    // Small delay to ensure loading toast is dismissed before showing error
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            // Show error message after loading toast is dismissed
            const displayError = errorMessage || error.message || 'Failed to save data. Please try again.';
            toast.error(displayError);
            
            // Clean up operation tracking
            delete activeOperations.current[operationId];
            
            return null;
        } finally {
            if (setLoadingFn) setLoadingFn(false);
        }
    };

    // Handle moving phases up/down
    const handleMovePhaseUp = async (phaseId) => {
        const process = processes.find(p => p.id === selectedProcessId);
        if (!process) return;

        const phaseIndex = process.phases.findIndex(p => p.id === phaseId);
        if (phaseIndex > 0) {
            const newPhases = [...process.phases];
            [newPhases[phaseIndex], newPhases[phaseIndex - 1]] = [newPhases[phaseIndex - 1], newPhases[phaseIndex]];
            const phaseIds = newPhases.map(p => p.id);

            const result = await apiCall('POST', '/api/phases/reorder', { phase_ids: phaseIds }, setIsReorderingPhases, {
                successMessage: 'Phase moved up',
                errorMessage: 'Failed to reorder phases'
            });

            if (result) {
                setProcesses(processes.map(proc => {
                    if (proc.id === selectedProcessId) {
                        return { ...proc, phases: newPhases };
                    }
                    return proc;
                }));
            }
        }
    };

    const handleMovePhaseDown = async (phaseId) => {
        const process = processes.find(p => p.id === selectedProcessId);
        if (!process) return;

        const phaseIndex = process.phases.findIndex(p => p.id === phaseId);
        if (phaseIndex < process.phases.length - 1) {
            const newPhases = [...process.phases];
            [newPhases[phaseIndex], newPhases[phaseIndex + 1]] = [newPhases[phaseIndex + 1], newPhases[phaseIndex]];
            const phaseIds = newPhases.map(p => p.id);

            const result = await apiCall('POST', '/api/phases/reorder', { phase_ids: phaseIds }, setIsReorderingPhases, {
                successMessage: 'Phase moved down',
                errorMessage: 'Failed to reorder phases'
            });

            if (result) {
                setProcesses(processes.map(proc => {
                    if (proc.id === selectedProcessId) {
                        return { ...proc, phases: newPhases };
                    }
                    return proc;
                }));
            }
        }
    };

    // Handle moving actions up/down
    const handleMoveActionUp = async (phaseId, actionId) => {
        const process = processes.find(p => p.id === selectedProcessId);
        if (!process) return;

        const phase = process.phases.find(ph => ph.id === phaseId);
        if (!phase) return;

        const actionIndex = phase.actions.findIndex(a => a.id === actionId);
        if (actionIndex > 0) {
            const newActions = [...phase.actions];
            [newActions[actionIndex], newActions[actionIndex - 1]] = [newActions[actionIndex - 1], newActions[actionIndex]];
            const actionIds = newActions.map(a => a.id);

            const result = await apiCall('POST', '/api/actions/reorder', { action_ids: actionIds }, setIsReorderingActions, {
                successMessage: 'Action moved up',
                errorMessage: 'Failed to reorder actions'
            });

            if (result) {
                setProcesses(processes.map(proc => {
                    if (proc.id === selectedProcessId) {
                        return {
                            ...proc,
                            phases: proc.phases.map(ph => {
                                if (ph.id === phaseId) {
                                    return { ...ph, actions: newActions };
                                }
                                return ph;
                            })
                        };
                    }
                    return proc;
                }));
            }
        }
    };

    const handleMoveActionDown = async (phaseId, actionId) => {
        const process = processes.find(p => p.id === selectedProcessId);
        if (!process) return;

        const phase = process.phases.find(ph => ph.id === phaseId);
        if (!phase) return;

        const actionIndex = phase.actions.findIndex(a => a.id === actionId);
        if (actionIndex < phase.actions.length - 1) {
            const newActions = [...phase.actions];
            [newActions[actionIndex], newActions[actionIndex + 1]] = [newActions[actionIndex + 1], newActions[actionIndex]];
            const actionIds = newActions.map(a => a.id);

            const result = await apiCall('POST', '/api/actions/reorder', { action_ids: actionIds }, setIsReorderingActions, {
                successMessage: 'Action moved down',
                errorMessage: 'Failed to reorder actions'
            });

            if (result) {
                setProcesses(processes.map(proc => {
                    if (proc.id === selectedProcessId) {
                        return {
                            ...proc,
                            phases: proc.phases.map(ph => {
                                if (ph.id === phaseId) {
                                    return { ...ph, actions: newActions };
                                }
                                return ph;
                            })
                        };
                    }
                    return proc;
                }));
            }
        }
    };

    // Handle phase editing
    const handleEditPhase = (phase) => {
        setEditingPhase(phase);
        setIsPhaseModalOpen(true);
    };

    const handleSavePhase = async (updatedPhase) => {
        const result = await apiCall('PATCH', `/api/phases/${updatedPhase.id}`, {
            name: updatedPhase.name,
        }, setIsSavingPhase, {
            operationKey: 'savePhase',
            loadingMessage: 'Updating phase...',
            successMessage: 'Phase updated successfully',
            errorMessage: 'Failed to update phase'
        });
        
        if (result) {
            setProcesses(processes.map(proc => {
                if (proc.id === selectedProcessId) {
                    return {
                        ...proc,
                        phases: proc.phases.map(p => p.id === updatedPhase.id ? updatedPhase : p)
                    };
                }
                return proc;
            }));
            setIsPhaseModalOpen(false);
            setEditingPhase(null);
        }
    };

    // Handle phase deletion
    const handleDeletePhase = (phaseId) => {
        setDeletingPhaseInfo(phaseId);
        setIsDeletePhaseModalOpen(true);
    };

    const confirmDeletePhase = async () => {
        if (!deletingPhaseInfo) return;
        
        const result = await apiCall('DELETE', `/api/phases/${deletingPhaseInfo}`, null, setIsDeletingPhase, {
            operationKey: 'deletePhase',
            loadingMessage: 'Deleting phase...',
            successMessage: 'Phase deleted successfully',
            errorMessage: 'Failed to delete phase'
        });
        
        if (result) {
            setProcesses(processes.map(proc => {
                if (proc.id === selectedProcessId) {
                    return {
                        ...proc,
                        phases: proc.phases.filter(phase => phase.id !== deletingPhaseInfo)
                    };
                }
                return proc;
            }));
            setIsDeletePhaseModalOpen(false);
            setDeletingPhaseInfo(null);
        }
    };

    // Handle action editing
    const handleEditAction = (phaseId, actionIndex, action) => {
        setEditingAction({ phaseId, actionIndex, action });
        setIsActionModalOpen(true);
    };

    const handleSaveAction = async (updatedAction) => {
        const { phaseId, actionIndex } = editingAction;
        const config = {};
        if (updatedAction.documents) config.documents = updatedAction.documents;
        if (updatedAction.formFields) config.formFields = updatedAction.formFields;
        if (updatedAction.checkOptions) config.checkOptions = updatedAction.checkOptions;
        if (updatedAction.options) config.options = updatedAction.options;

        const result = await apiCall('PATCH', `/api/actions/${updatedAction.id}`, {
            type: updatedAction.type,
            name: updatedAction.name,
            description: updatedAction.description,
            assigned_role: updatedAction.assignedRole,
            config,
        }, setIsSavingAction, {
            operationKey: 'saveAction',
            loadingMessage: 'Updating action...',
            successMessage: 'Action updated successfully',
            errorMessage: 'Failed to update action'
        });
        
        if (result) {
            setProcesses(processes.map(proc => {
                if (proc.id === selectedProcessId) {
                    return {
                        ...proc,
                        phases: proc.phases.map(phase => {
                            if (phase.id === phaseId) {
                                const newActions = [...phase.actions];
                                newActions[actionIndex] = updatedAction;
                                return { ...phase, actions: newActions };
                            }
                            return phase;
                        })
                    };
                }
                return proc;
            }));
            setIsActionModalOpen(false);
            setEditingAction(null);
        }
    };

    // Handle action deletion
    const handleDeleteAction = (phaseId, actionId) => {
        setDeletingActionInfo({ phaseId, actionId });
        setIsDeleteActionModalOpen(true);
    };

    const confirmDeleteAction = async () => {
        if (!deletingActionInfo) return;
        const { phaseId, actionId } = deletingActionInfo;
        
        const result = await apiCall('DELETE', `/api/actions/${actionId}`, null, setIsDeletingAction, {
            operationKey: 'deleteAction',
            loadingMessage: 'Deleting action...',
            successMessage: 'Action deleted successfully',
            errorMessage: 'Failed to delete action'
        });
        
        if (result) {
            setProcesses(processes.map(proc => {
                if (proc.id === selectedProcessId) {
                    return {
                        ...proc,
                        phases: proc.phases.map(phase => {
                            if (phase.id === phaseId) {
                                return {
                                    ...phase,
                                    actions: phase.actions.filter(action => action.id !== actionId)
                                };
                            }
                            return phase;
                        })
                    };
                }
                return proc;
            }));
            setIsDeleteActionModalOpen(false);
            setDeletingActionInfo(null);
        }
    };

    // Handle action adding
    const handleAddAction = (phaseId) => {
        setEditingAction({ phaseId, actionIndex: null, action: null });
        setIsActionModalOpen(true);
    };


    const handleSaveNewAction = async (newAction) => {
        const { phaseId } = editingAction;
        const config = {};
        if (newAction.documents) config.documents = newAction.documents;
        if (newAction.formFields) config.formFields = newAction.formFields;
        if (newAction.checkOptions) config.checkOptions = newAction.checkOptions;
        if (newAction.options) config.options = newAction.options;

        const result = await apiCall('POST', '/api/actions', {
            phase_id: phaseId,
            type: newAction.type,
            name: newAction.name,
            description: newAction.description,
            assigned_role: newAction.assignedRole,
            config,
        }, setIsAddingAction, {
            operationKey: 'addAction',
            loadingMessage: 'Adding action...',
            successMessage: 'Action added successfully',
            errorMessage: 'Failed to add action'
        });
        
        if (result) {
            const actionWithId = { ...newAction, id: result.id };
            setProcesses(processes.map(proc => {
                if (proc.id === selectedProcessId) {
                    return {
                        ...proc,
                        phases: proc.phases.map(phase => {
                            if (phase.id === phaseId) {
                                return {
                                    ...phase,
                                    actions: [...phase.actions, actionWithId]
                                };
                            }
                            return phase;
                        })
                    };
                }
                return proc;
            }));
            setIsActionModalOpen(false);
            setEditingAction(null);
        }
    };

    // Handle process editing
    const handleEditProcess = (process) => {
        setEditingProcess(process);
        setIsProcessModalOpen(true);
    };

    const handleSaveProcess = async (updatedProcess) => {
        const result = await apiCall('PATCH', `/api/processes/${updatedProcess.id}`, {
            name: updatedProcess.name,
            description: updatedProcess.description,
        }, setIsSavingProcess, {
            operationKey: 'saveProcess',
            loadingMessage: 'Updating workflow...',
            successMessage: 'Workflow updated successfully',
            errorMessage: 'Failed to update workflow'
        });
        
        if (result) {
            setProcesses(processes.map(p => p.id === updatedProcess.id ? updatedProcess : p));
            setIsProcessModalOpen(false);
            setEditingProcess(null);
        }
    };

    // Handle process deletion
    const handleDeleteProcess = (processId) => {
        setDeletingProcessInfo(processId);
        setIsDeleteProcessModalOpen(true);
    };

    const confirmDeleteProcess = async () => {
        if (!deletingProcessInfo) return;
        
        const result = await apiCall('DELETE', `/api/processes/${deletingProcessInfo}`, null, setIsDeletingProcess, {
            operationKey: 'deleteProcess',
            loadingMessage: 'Deleting workflow...',
            successMessage: 'Workflow deleted successfully',
            errorMessage: 'Failed to delete workflow'
        });
        
        if (result) {
            const newProcesses = processes.filter(p => p.id !== deletingProcessInfo);
            setProcesses(newProcesses);
            if (selectedProcessId === deletingProcessInfo && newProcesses.length > 0) {
                setSelectedProcessId(newProcesses[0].id);
            }
            setIsDeleteProcessModalOpen(false);
            setDeletingProcessInfo(null);
        }
    };

    // Handle adding new phase
    const handleAddPhase = () => {
        setIsPhaseCreateModalOpen(true);
    };

    const handleCreatePhase = async (phaseData) => {
        if (!currentProcess) return;
        
        const result = await apiCall('POST', '/api/phases', {
            process_id: selectedProcessId,
            name: phaseData.name,
        }, setIsAddingPhase, {
            operationKey: 'addPhase',
            loadingMessage: 'Adding phase...',
            successMessage: 'Phase added successfully',
            errorMessage: 'Failed to add phase'
        });
        
        if (result) {
            const newPhase = {
                id: result.id,
                name: result.name,
                actions: [],
            };
            setProcesses(processes.map(proc => {
                if (proc.id === selectedProcessId) {
                    return {
                        ...proc,
                        phases: [...proc.phases, newPhase]
                    };
                }
                return proc;
            }));
            setIsPhaseCreateModalOpen(false);
        }
    };

    // Handle adding new workflow
    const handleAddWorkflow = () => {
        setIsWorkflowCreateModalOpen(true);
    };

    const handleCreateWorkflow = async (workflowData) => {
        try {
            console.log('Creating workflow with data:', workflowData);

            const result = await apiCall('POST', '/api/processes', {
                name: workflowData.name,
                description: workflowData.description,
            }, setIsCreatingWorkflow, {
                operationKey: 'createWorkflow',
                loadingMessage: 'Creating workflow...',
                errorMessage: 'Failed to create workflow'
            });

            console.log('storeProcess returned:', result);
            if (!result) {
                console.error('storeProcess failed - API returned null. Check error above for details.');
                return;
            }

            if (!result.id) {
                console.error('storeProcess response missing ID field:', result);
                toast.error('Server did not return process ID');
                return;
            }

            console.log('Process created with ID:', result.id);

            const phaseResult = await apiCall('POST', '/api/phases', {
                process_id: result.id,
                name: 'Phase 1',
            }, setIsCreatingWorkflow, {
                errorMessage: 'Created workflow but failed to create initial phase'
            });

            console.log('storePhase returned:', phaseResult);

            if (!phaseResult) {
                console.error('storePhase failed - API returned null. Check error above for details.');
                return;
            }

            const newProcess = {
                id: result.id,
                name: result.name,
                description: result.description,
                status: result.status,
                createdAt: result.createdAt || new Date().toISOString().split('T')[0],
                phases: phaseResult ? [{
                    id: phaseResult.id,
                    name: phaseResult.name,
                    actions: [],
                }] : [],
            };

            console.log('New process object:', newProcess);

            setProcesses(prevProcesses => [...prevProcesses, newProcess]);
            setSelectedProcessId(newProcess.id);
            if (newProcess.phases.length > 0) {
                setExpandedPhaseId(newProcess.phases[0].id);
            }
            setIsWorkflowCreateModalOpen(false);
            toast.success('Workflow created successfully');
            console.log('Workflow created successfully!');
        } catch (error) {
            console.error('Error in handleCreateWorkflow:', error);
        }
    };

    return (
        <>
            <Head title="Workflow Management" />
            <AuthenticatedLayout>
                <main className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Workflow Management</h1>
                            <p className="text-muted-foreground mt-1">Build and manage role-based workflow processes</p>
                        </div>
                        <button onClick={handleAddWorkflow} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium w-fit">
                            <Plus className="w-5 h-5" />
                            New Workflow
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        {/* Processes List (Left Sidebar) */}
                        <div className="lg:col-span-1">
                            <div className="bg-card border border-border rounded-lg shadow-sm">
                                <div className="border-b border-border p-4">
                                    <h2 className="font-semibold text-foreground">Workflows</h2>
                                </div>
                                <div className="space-y-2 p-4">
                                    {processes.map((process) => {
                                        const statusColor = {
                                            'pending': 'border-l-gray-400',
                                            'in_progress': 'border-l-blue-400',
                                            'completed': 'border-l-green-400',
                                            'returned': 'border-l-orange-400',
                                        };
                                        return (
                                            <button
                                                key={process.id}
                                                onClick={() => setSelectedProcessId(process.id)}
                                                className={`w-full text-left p-3 rounded-lg border-l-4 transition ${selectedProcessId === process.id
                                                    ? 'bg-primary/10 border-primary'
                                                    : `border-border hover:bg-muted ${statusColor[process.status]}`
                                                    }`}
                                            >
                                                <p className="font-medium text-sm text-foreground line-clamp-1">{process.name}</p>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{process.description}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Workflow Detail (Right Content) */}
                        <div className="lg:col-span-3">
                            {currentProcess && (
                                <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                                    {/* Process Header */}
                                    <div className="p-6 border-b-2">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <h2 className="text-2xl font-bold text-foreground">{currentProcess.name}</h2>
                                                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                                        Active
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground/80 leading-relaxed max-w-3xl">
                                                    {currentProcess.description}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    Created: {currentProcess.createdAt}
                                                </p>
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => handleEditProcess(currentProcess)}
                                                    className="p-2.5 rounded-lg bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition shadow-sm"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-4.5 h-4.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProcess(currentProcess.id)}
                                                    className="p-2.5 rounded-lg bg-background hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border/50 transition shadow-sm"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4.5 h-4.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Phases Timeline */}
                                    <div className="p-6 space-y-6">
                                        {currentProcess.phases.map((phase, index) => (
                                            <div key={phase.id}>
                                                <Phase
                                                    phase={phase}
                                                    phaseIndex={index}
                                                    isExpanded={expandedPhaseId === phase.id}
                                                    onToggle={() => setExpandedPhaseId(expandedPhaseId === phase.id ? null : phase.id)}
                                                    onEditPhase={handleEditPhase}
                                                    onDeletePhase={handleDeletePhase}
                                                    onAddAction={handleAddAction}
                                                    onEditAction={handleEditAction}
                                                    onDeleteAction={handleDeleteAction}
                                                    onMoveUp={() => handleMovePhaseUp(phase.id)}
                                                    onMoveDown={() => handleMovePhaseDown(phase.id)}
                                                    onMoveActionUp={handleMoveActionUp}
                                                    onMoveActionDown={handleMoveActionDown}
                                                    canMoveUp={index > 0}
                                                    canMoveDown={index < currentProcess.phases.length - 1}
                                                    processId={currentProcess.id}
                                                    isLoadingAction={isAddingAction}
                                                    isReorderingPhases={isReorderingPhases}
                                                    isReorderingActions={isReorderingActions}
                                                    isSavingPhase={isSavingPhase}
                                                    isDeletingAction={isDeletingAction}
                                                    isDeletingPhase={isDeletingPhase}
                                                    availableDocuments={availableDocuments}
                                                />
                                                {index < currentProcess.phases.length - 1 && (
                                                    <div className="pl-6 py-2">
                                                        <div className="h-6 border-l-4 border-muted border-dashed ml-[1.75rem]"></div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Phase Button */}
                                    <div className="border-t border-border p-6">
                                        <button onClick={handleAddPhase} disabled={isAddingPhase} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                                            {isAddingPhase && <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>}
                                            <Plus className="w-4 h-4" />
                                            {isAddingPhase ? 'Adding...' : 'Add Phase'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!currentProcess && processes.length > 0 && (
                                <div className="bg-card border border-border rounded-lg shadow-sm p-12 text-center">
                                    <p className="text-muted-foreground text-lg">Select a workflow to get started</p>
                                </div>
                            )}

                            {processes.length === 0 && (
                                <div className="bg-card border border-border rounded-lg shadow-sm p-12 text-center">
                                    <p className="text-muted-foreground text-lg mb-4">No workflows yet</p>
                                    <button onClick={handleAddWorkflow} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium">
                                        <Plus className="w-5 h-5" />
                                        Create Your First Workflow
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                {/* Modals */}
                <PhaseEditModal
                    key={editingPhase?.id || 'new-phase'}
                    phase={editingPhase}
                    isOpen={isPhaseModalOpen}
                    onClose={() => {
                        setIsPhaseModalOpen(false);
                        setEditingPhase(null);
                    }}
                    onSave={handleSavePhase}
                    isLoading={isSavingPhase}
                />


                <WorkflowCreateModal
                    isOpen={isWorkflowCreateModalOpen}
                    onClose={() => setIsWorkflowCreateModalOpen(false)}
                    onSave={handleCreateWorkflow}
                    isLoading={isCreatingWorkflow}
                />

                <ActionEditModal
                    key={editingAction?.action?.id || (editingAction?.actionIndex === null ? 'new' : 'edit')}
                    action={editingAction?.action}
                    isOpen={isActionModalOpen}
                    onClose={() => {
                        setIsActionModalOpen(false);
                        setEditingAction(null);
                    }}
                    onSave={editingAction?.actionIndex === null ? handleSaveNewAction : handleSaveAction}
                    isNew={editingAction?.actionIndex === null}
                    isLoading={editingAction?.actionIndex === null ? isAddingAction : isSavingAction}
                    availableDocuments={availableDocuments}
                    isLoadingDocuments={isLoadingDocuments}
                />

                <ProcessEditModal
                    key={editingProcess?.id || 'new-process'}
                    process={editingProcess}
                    isOpen={isProcessModalOpen}
                    onClose={() => {
                        setIsProcessModalOpen(false);
                        setEditingProcess(null);
                    }}
                    onSave={handleSaveProcess}
                    isLoading={isSavingProcess}
                />

                <PhaseCreateModal
                    isOpen={isPhaseCreateModalOpen}
                    onClose={() => setIsPhaseCreateModalOpen(false)}
                    onSave={handleCreatePhase}
                    isLoading={isAddingPhase}
                />

                <ConfirmDeleteModal
                    isOpen={isDeleteActionModalOpen}
                    onClose={() => {
                        setIsDeleteActionModalOpen(false);
                        setDeletingActionInfo(null);
                    }}
                    onConfirm={confirmDeleteAction}
                    title="Delete Action"
                    message="Are you sure you want to delete this action? This action cannot be undone."
                    isLoading={isDeletingAction}
                />

                <ConfirmDeleteModal
                    isOpen={isDeleteProcessModalOpen}
                    onClose={() => {
                        setIsDeleteProcessModalOpen(false);
                        setDeletingProcessInfo(null);
                    }}
                    onConfirm={confirmDeleteProcess}
                    title="Delete Workflow"
                    message="Are you sure you want to delete this workflow? This action cannot be undone."
                    isLoading={isDeletingProcess}
                />

                <ConfirmDeleteModal
                    isOpen={isDeletePhaseModalOpen}
                    onClose={() => {
                        setIsDeletePhaseModalOpen(false);
                        setDeletingPhaseInfo(null);
                    }}
                    onConfirm={confirmDeletePhase}
                    title="Delete Phase"
                    message="Are you sure you want to delete this phase? All actions in this phase will also be deleted. This action cannot be undone."
                    isLoading={isDeletingPhase}
                />
            </AuthenticatedLayout>
        </>
    );
}
