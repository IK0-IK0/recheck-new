import { Head, router, useForm } from '@inertiajs/react';
import {
    Archive,
    CalendarDays,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ClipboardList,
    FileText,
    GitBranch,
    History,
    Loader2,
    LoaderCircle,
    Plus,
    Eye,
    RefreshCw,
    Send,
    Upload,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import DocumentUploadModal from '@/components/DocumentUploadModal';
import PhasePipeline from '@/components/PhasePipeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Tracking from '@/pages/Tenant/Proposals/Tracking';

type Process = {
    id: number;
    name: string;
    phases?: Phase[];
};

type Phase = {
    id: number;
    name: string;
    order: number;
    actions?: PhaseAction[];
};

type RequiredDocument = {
    id: number;
    name: string;
    file_type: string;
    label: 'form' | 'doc';
};

type PhaseAction = {
    id: number;
    name: string;
    action_type: 'submit' | 'review';
    decision_mode: 'approve_deny' | 'custom';
    custom_decision_branches?:
        { id: string; label: string; destination: string }[] | null;
    description?: string | null;
    requires_file?: boolean;
    documents?: RequiredDocument[];
};

type Proposal = {
    id: number;
    user_id: number;
    title: string;
    type?: string | null;
    process: Process | null;
    current_phase: Phase | null;
    current_action: PhaseAction | null;
    completed_at: string | null;
    created_at: string;
    phase_transitions: {
        id: number;
        phase: Phase;
        created_at: string;
    }[];
    action_transitions: {
        id: number;
        action: PhaseAction;
        decision: string | null;
        created_at: string;
    }[];
    documents: {
        id: number;
        name: string;
        file_type: string;
        pivot: {
            phase_id: number | null;
            required_document_id: number | null;
            action_id: number | null;
        };
    }[];
};

type Props = {
    proposals: Proposal[];
    isTracking: boolean;
    currentStorageDriver: string;
    viewerId: number;
    viewerType: string;
    selectedProposalId: number | null;
};

const MAX_PROPOSALS = 3;

const readUploadResponse = async (
    response: Response,
): Promise<Record<string, unknown>> => {
    const responseText = await response.text();

    try {
        return responseText ? JSON.parse(responseText) : {};
    } catch {
        throw new Error(
            `The server returned an unexpected response (HTTP ${response.status}).`,
        );
    }
};

const uploadFileWithProgress = (
    url: string,
    file: File,
    onProgress: (progress: number) => void,
): Promise<void> =>
    new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();

        request.open('PUT', url);
        request.setRequestHeader(
            'Content-Type',
            file.type || 'application/octet-stream',
        );
        request.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        });
        request.addEventListener('load', () => {
            if (request.status >= 200 && request.status < 300) {
                resolve();

                return;
            }

            reject(
                new Error(
                    `Bucket upload returned HTTP ${request.status}. Check the bucket CORS policy.`,
                ),
            );
        });
        request.addEventListener('error', () =>
            reject(
                new Error(
                    'The bucket upload failed. Check the bucket CORS policy.',
                ),
            ),
        );
        request.addEventListener('abort', () =>
            reject(new Error('The bucket upload was cancelled.')),
        );
        request.send(file);
    });

export default function Index({
    proposals,
    isTracking,
    currentStorageDriver,
    viewerId,
    viewerType,
    selectedProposalId,
}: Props) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [documentToView, setDocumentToView] =
        useState<Proposal['documents'][number] | null>(null);
    const [documentViewUrl, setDocumentViewUrl] = useState<string | null>(null);
    const [isLoadingDocumentView, setIsLoadingDocumentView] = useState(false);
    const [isSwitchProposalModalOpen, setIsSwitchProposalModalOpen] =
        useState(false);
    const [proposalListTab, setProposalListTab] = useState<
        'active' | 'archived'
    >('active');
    const [activeProposalId, setActiveProposalId] = useState<number | null>(
        proposals.some((proposal) => proposal.id === selectedProposalId)
            ? selectedProposalId
            : (proposals.find((proposal) => !proposal.completed_at)?.id ??
                  proposals[0]?.id ??
                  null),
    );
    const [selectedPhaseIdByProposal, setSelectedPhaseIdByProposal] = useState<
        Record<number, number>
    >({});
    const [selectedActionIdByPhase, setSelectedActionIdByPhase] = useState<
        Record<string, number>
    >({});
    const [isAdvancing, setIsAdvancing] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
    });
    const activeProposals = proposals.filter(
        (proposal) => !proposal.completed_at,
    );
    const archivedProposals = proposals.filter(
        (proposal) => proposal.completed_at,
    );
    const proposalsInSelectedTab =
        proposalListTab === 'active' ? activeProposals : archivedProposals;
    const isProposalLimitReached = proposals.length >= MAX_PROPOSALS;
    const activeProposal =
        proposals.find((proposal) => proposal.id === activeProposalId) ??
        activeProposals[0] ??
        proposals[0] ??
        null;
    const proposalPhases = activeProposal?.process?.phases ?? [];
    const activePhaseIndex = proposalPhases.findIndex(
        (phase) => phase.id === activeProposal?.current_phase?.id,
    );
    const requestedSelectedPhaseId = activeProposal
        ? (selectedPhaseIdByProposal[activeProposal.id] ??
          activeProposal.current_phase?.id ??
          proposalPhases[0]?.id ??
          null)
        : null;
    const selectedPhase =
        proposalPhases.find((phase) => phase.id === requestedSelectedPhaseId) ??
        activeProposal?.current_phase ??
        proposalPhases[0] ??
        null;
    const selectedPhaseId = selectedPhase?.id ?? null;
    const activePhaseName = activeProposal?.current_phase?.name ?? null;
    const selectedPhaseName = selectedPhase?.name ?? null;
    const isCurrentPhaseSelected =
        selectedPhaseId === activeProposal?.current_phase?.id;
    const selectedPhaseActions = selectedPhase?.actions ?? [];
    const completedActionIds = new Set(
        activeProposal?.action_transitions.map(
            (transition) => transition.action.id,
        ) ?? [],
    );
    const availableActions = selectedPhaseActions.filter(
        (action) =>
            completedActionIds.has(action.id) ||
            (isCurrentPhaseSelected &&
                action.id === activeProposal?.current_action?.id),
    );
    const actionSelectionKey =
        activeProposal && selectedPhase
            ? `${activeProposal.id}:${selectedPhase.id}`
            : '';
    const requestedActionId = selectedActionIdByPhase[actionSelectionKey];
    const latestCompletedAction = [...(activeProposal?.action_transitions ?? [])]
        .reverse()
        .find((transition) =>
            selectedPhaseActions.some(
                (action) => action.id === transition.action.id,
            ),
        )?.action;
    const activeAction =
        availableActions.find((action) => action.id === requestedActionId) ??
        availableActions.find(
            (action) => action.id === activeProposal?.current_action?.id,
        ) ??
        availableActions.find(
            (action) => action.id === latestCompletedAction?.id,
        ) ??
        availableActions[0] ??
        (isCurrentPhaseSelected
            ? (activeProposal?.current_action ?? null)
            : null);
    const activeActionIndex = availableActions.findIndex(
        (action) => action.id === activeAction?.id,
    );
    const isCurrentActionSelected =
        isCurrentPhaseSelected &&
        activeAction?.id === activeProposal?.current_action?.id;
    const canUploadSelectedAction =
        isCurrentActionSelected && activeAction?.action_type !== 'review';
    const pipelinePhases = proposalPhases.map((phase, index) => {
        const isCurrent = phase.id === activeProposal?.current_phase?.id;
        const isComplete = activePhaseIndex >= 0 && index < activePhaseIndex;
//asdasd

        return {
            ...phase,
            isCurrent,
            isComplete,
            isClickable:
                activePhaseIndex >= 0 ? index <= activePhaseIndex : index === 0,
            detail: isCurrent
                ? 'Current'
                : isComplete
                  ? 'Complete'
                  : index === 0 && activePhaseIndex === -1
                    ? 'Next'
                    : 'Upcoming',
        };
    });
    const historyEntries = activeProposal
        ? [
              {
                  phaseName: 'Proposal created',
                  createdAt: activeProposal.created_at,
                  isCreation: true,
                  isAction: false,
              },
              ...activeProposal.phase_transitions.map((entry) => ({
                  phaseName: entry.phase.name,
                  createdAt: entry.created_at,
                  isCreation: false,
                  isAction: false,
              })),
              ...activeProposal.action_transitions.map((entry) => ({
                  phaseName: `${entry.action.name}${
                      entry.decision
                          ? ` · ${entry.action.custom_decision_branches?.find((branch) => branch.id === entry.decision)?.label ?? entry.decision}`
                          : ''
                  }`,
                  createdAt: entry.created_at,
                  isCreation: false,
                  isAction: true,
              })),
          ].sort(
              (first, second) =>
                  new Date(second.createdAt).getTime() -
                  new Date(first.createdAt).getTime(),
          )
        : [];
    const requiredDocuments = new Map<number, RequiredDocument>();

    (activeAction ? [activeAction] : selectedPhaseActions).forEach((action) => {
        action.documents?.forEach((document: RequiredDocument) => {
            requiredDocuments.set(document.id, document);
        });
    });
    const phaseDocuments = Array.from(requiredDocuments.values());
    const uploadedDocuments =
        activeProposal?.documents.filter(
            (document) =>
                Number(document.pivot.phase_id) === selectedPhase?.id &&
                (!activeAction ||
                    Number(document.pivot.action_id) === activeAction.id),
        ) ?? [];
    const uploadedRequiredDocumentIds = new Set(
        uploadedDocuments.flatMap((document) =>
            document.pivot.required_document_id === null
                ? []
                : [Number(document.pivot.required_document_id)],
        ),
    );

    const handleUploadRequiredFile = async (
        requiredDocumentId: number,
        documentName: string,
        files: File[],
        replaceDocumentId?: number,
    ) => {
        if (
            !activeProposal ||
            !selectedPhase ||
            !canUploadSelectedAction ||
            files.length === 0
        ) {
            return false;
        }

        const formData = new FormData();
        formData.append('phase_id', String(selectedPhase.id));
        formData.append('required_document_id', String(requiredDocumentId));
        if (replaceDocumentId !== undefined) {
            formData.append('replace_document_id', String(replaceDocumentId));
        }

        if (activeAction) {
            formData.append('action_id', String(activeAction.id));
        }

        if (currentStorageDriver === 's3') {
            const file = files[0];
            const csrfToken =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute('content') || '';
            const uploadMetadata = {
                phase_id: selectedPhase.id,
                required_document_id: requiredDocumentId,
                ...(activeAction ? { action_id: activeAction.id } : {}),
                ...(replaceDocumentId !== undefined
                    ? { replace_document_id: replaceDocumentId }
                    : {}),
            };
            setUploadProgress(0);

            try {
                const urlResponse = await fetch(
                    `/tenant/proposals/${activeProposal.id}/documents/direct-upload-url`,
                    {
                        method: 'POST',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                        },
                        body: JSON.stringify({
                            ...uploadMetadata,
                            file_name: file.name,
                            file_size: file.size,
                            content_type:
                                file.type || 'application/octet-stream',
                        }),
                    },
                );
                const uploadData = await readUploadResponse(urlResponse);

                if (!urlResponse.ok) {
                    throw new Error(
                        String(
                            uploadData.error ||
                                JSON.stringify(
                                    uploadData.errors || uploadData,
                                ),
                        ),
                    );
                }

                if (
                    typeof uploadData.url !== 'string' ||
                    typeof uploadData.path !== 'string' ||
                    typeof uploadData.reference !== 'string'
                ) {
                    throw new Error(
                        'The server did not return a valid direct upload response.',
                    );
                }

                await uploadFileWithProgress(
                    uploadData.url,
                    file,
                    setUploadProgress,
                );

                const completeResponse = await fetch(
                    `/tenant/proposals/${activeProposal.id}/documents/complete-direct-upload`,
                    {
                        method: 'POST',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                        },
                        body: JSON.stringify({
                            ...uploadMetadata,
                            content_type:
                                file.type || 'application/octet-stream',
                            file_size: file.size,
                            path: uploadData.path,
                            reference: uploadData.reference,
                        }),
                    },
                );
                const completeData =
                    await readUploadResponse(completeResponse);

                if (!completeResponse.ok) {
                    throw new Error(
                        String(
                            completeData.error ||
                                JSON.stringify(
                                    completeData.errors || completeData,
                                ),
                        ),
                    );
                }

                router.reload({ only: ['proposals'], preserveScroll: true });
                toast.success(`${documentName} uploaded.`);

                return true;
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : 'File upload failed.',
                );

                return false;
            } finally {
                setUploadProgress(null);
            }
        }

        formData.append('file', files[0]);

        return new Promise<boolean>((resolve) =>
            router.post(
                `/tenant/proposals/${activeProposal.id}/documents`,
                formData,
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        toast.success(`${documentName} uploaded.`);
                        resolve(true);
                    },
                    onError: (uploadErrors) => {
                        toast.error(
                            uploadErrors.file ||
                                uploadErrors.name ||
                                uploadErrors.storage ||
                                uploadErrors.phase_id ||
                                uploadErrors.required_document_id ||
                                uploadErrors.action_id ||
                                'File upload failed.',
                        );
                        resolve(false);
                    },
                },
            ),
        );
    };

    const handleViewProposalDocument = async (
        uploadedDocument: Proposal['documents'][number],
    ) => {
        setDocumentToView(uploadedDocument);
        setDocumentViewUrl(null);
        setIsLoadingDocumentView(true);

        try {
            const response = await fetch(
                `/tenant/documents/${uploadedDocument.id}/view-url`,
                { headers: { Accept: 'application/json' } },
            );
            const data = (await response.json()) as {
                url?: string;
                error?: string;
            };

            if (!response.ok || !data.url) {
                throw new Error(
                    data.error || 'Unable to load document preview.',
                );
            }

            setDocumentViewUrl(data.url);
        } catch (error) {
            setDocumentToView(null);
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Unable to load document preview.',
            );
        } finally {
            setIsLoadingDocumentView(false);
        }
    };

    const handleSubmitAction = () => {
        if (
            !activeProposal ||
            !activeAction ||
            activeAction.action_type !== 'submit' ||
            !isCurrentActionSelected ||
            isAdvancing
        ) {
            return;
        }

        router.post(
            `/tenant/proposals/${activeProposal.id}/submit`,
            {},
            {
                preserveScroll: true,
                onStart: () => setIsAdvancing(true),
                onFinish: () => setIsAdvancing(false),
                onSuccess: () => {
                    setSelectedActionIdByPhase((current) => {
                        const next = { ...current };
                        delete next[actionSelectionKey];

                        return next;
                    });
                    toast.success('Action submitted successfully.');
                },
                onError: (submitErrors) =>
                    toast.error(
                        submitErrors.workflow ||
                            'The action could not be submitted.',
                    ),
            },
        );
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        post('/tenant/proposals', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    if (isTracking) {
        return (
            <Tracking
                proposals={proposals}
                viewerId={viewerId}
                viewerType={viewerType}
            />
        );
    }

    return (
        <div className="flex min-h-svh flex-1 flex-col bg-transparent md:min-h-0">
            <Head title="Proposals" />

            <div className="bg-surface flex items-center justify-between border-b border-border px-6 py-3">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                        <ClipboardList className="size-4 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">Proposals</h1>
                        <p className="text-xs text-muted-foreground">
                            Manage and track your research proposals.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                        {proposals.length}/{MAX_PROPOSALS} proposals
                    </span>
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="gap-2"
                        disabled={isProposalLimitReached}
                        title={
                            isProposalLimitReached
                                ? `You can create up to ${MAX_PROPOSALS} proposals.`
                                : undefined
                        }
                    >
                        <Plus className="size-4" />
                        New Proposal
                    </Button>
                </div>
            </div>

            <div className="flex-1 p-4 lg:min-h-0 lg:overflow-hidden lg:p-6">
                <div className="mx-auto flex w-full max-w-6xl flex-col lg:h-full lg:min-h-0">
                    {proposals.length > 0 && activeProposal ? (
                        <section
                            id="active-proposal-phases"
                            className="flex flex-col lg:min-h-0 lg:flex-1"
                        >
                            <header className="mb-5 grid shrink-0 gap-5 rounded-lg border border-border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                                <div className="min-w-0">
                                    <h2 className="flex min-w-0 items-center gap-2 text-xl font-semibold tracking-tight">
                                        <FileText className="size-5 shrink-0 text-muted-foreground" />
                                        <span className="truncate">
                                            {activeProposal.title}
                                        </span>
                                    </h2>
                                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                        <GitBranch className="size-4 shrink-0" />
                                        <span className="truncate">
                                            {activeProposal.process?.name ??
                                                'No workflow process assigned'}
                                        </span>
                                    </p>
                                    <span className="mt-3 inline-flex rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                                        #{activeProposal.id}
                                    </span>
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        Type:{' '}
                                        {activeProposal.type ?? 'Not specified'}
                                    </p>
                                </div>
                                <div className="flex flex-col items-start gap-4 sm:items-end">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0"
                                        onClick={() => {
                                            setProposalListTab(
                                                activeProposal.completed_at
                                                    ? 'archived'
                                                    : 'active',
                                            );
                                            setIsSwitchProposalModalOpen(true);
                                        }}
                                    >
                                        Switch proposal
                                        <ChevronDown className="ml-1 size-4" />
                                    </Button>
                                    <div className="space-y-1 sm:text-right">
                                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                            Status
                                        </p>
                                        <Badge variant="outline">
                                            <ClipboardList />
                                            {activeProposal.completed_at
                                                ? 'Complete'
                                                : (activePhaseName ??
                                                  'Not started')}
                                        </Badge>
                                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:justify-end">
                                            <CalendarDays className="size-3.5" />
                                            Created{' '}
                                            <time
                                                dateTime={
                                                    activeProposal.created_at
                                                }
                                            >
                                                {new Date(
                                                    activeProposal.created_at,
                                                ).toLocaleDateString()}
                                            </time>
                                        </p>
                                    </div>
                                </div>
                            </header>

                            <div className="shrink-0 overflow-hidden rounded-lg border border-border bg-card">
                                <PhasePipeline
                                    phases={pipelinePhases}
                                    activePhaseId={selectedPhaseId ?? undefined}
                                    onPhaseSelect={(phaseId) => {
                                        if (!activeProposal) {
                                            return;
                                        }

                                        const phaseIndex =
                                            proposalPhases.findIndex(
                                                (phase) => phase.id === phaseId,
                                            );
                                        const isSelectable =
                                            activePhaseIndex >= 0
                                                ? phaseIndex <= activePhaseIndex
                                                : phaseIndex === 0;

                                        if (!isSelectable) {
                                            return;
                                        }

                                        setSelectedPhaseIdByProposal(
                                            (current) => ({
                                                ...current,
                                                [activeProposal.id]: phaseId,
                                            }),
                                        );
                                    }}
                                    showPhaseDetails={false}
                                    centerActivePhase
                                />
                            </div>

                            <div className="mt-6 grid grid-cols-1 items-stretch gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
                                <div className="flex flex-col gap-4 lg:min-h-0">
                                    <section className="flex flex-col rounded-lg border border-border bg-card p-5 lg:min-h-0 lg:flex-1">
                                        <div className="flex h-8 items-center border-b border-border pb-4">
                                            <h3 className="text-sm font-semibold">
                                                <History className="mr-1.5 inline size-4 text-muted-foreground" />
                                                History
                                            </h3>
                                        </div>
                                        <ol className="custom-scrollbar mt-3 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-2">
                                            {historyEntries.map(
                                                (entry, index) => (
                                                    <li
                                                        key={`${entry.createdAt}-${index}`}
                                                        className={`border-l-2 pl-3 ${entry.isCreation ? 'border-border' : 'border-primary/40'}`}
                                                    >
                                                        <p className="text-sm text-foreground">
                                                            {entry.isCreation
                                                                ? entry.phaseName
                                                                : entry.isAction
                                                                  ? `Completed action · ${entry.phaseName}`
                                                                  : `Moved to ${entry.phaseName}`}
                                                        </p>
                                                        <time className="text-xs text-muted-foreground">
                                                            {new Date(
                                                                entry.createdAt,
                                                            ).toLocaleString()}
                                                        </time>
                                                    </li>
                                                ),
                                            )}
                                        </ol>
                                    </section>
                                </div>

                                <section className="flex min-w-0 flex-col rounded-lg border border-border bg-card p-5 lg:min-h-0">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border pb-4">
                                        <h3 className="text-sm font-semibold">
                                            <Zap className="mr-1.5 inline size-4 text-muted-foreground" />
                                            Actions
                                        </h3>
                                        {activeAction ? (
                                            <div className="flex min-w-0 items-center gap-1.5">
                                                <Badge
                                                    variant="outline"
                                                    className="max-w-full gap-1.5"
                                                >
                                                    {activeAction.action_type ===
                                                    'submit' ? (
                                                        <Send className="size-3.5 shrink-0" />
                                                    ) : (
                                                        <Eye className="size-3.5 shrink-0" />
                                                    )}
                                                    <span className="truncate">
                                                        {activeAction.name}
                                                    </span>
                                                    {availableActions.length >
                                                    1 ? (
                                                        <span className="shrink-0 text-muted-foreground">
                                                            {activeActionIndex +
                                                                1}
                                                            /
                                                            {
                                                                availableActions.length
                                                            }
                                                        </span>
                                                    ) : null}
                                                </Badge>
                                                {availableActions.length > 1 ? (
                                                    <div className="flex shrink-0 items-center gap-0.5">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-7"
                                                        disabled={
                                                            activeActionIndex <=
                                                            0
                                                        }
                                                        aria-label="View previous action"
                                                        title="Previous action"
                                                        onClick={() => {
                                                            const action =
                                                                availableActions[
                                                                    activeActionIndex -
                                                                        1
                                                                ];

                                                            if (
                                                                action &&
                                                                actionSelectionKey
                                                            ) {
                                                                setSelectedActionIdByPhase(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        [actionSelectionKey]:
                                                                            action.id,
                                                                    }),
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <ChevronLeft className="size-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-7"
                                                        disabled={
                                                            activeActionIndex <
                                                                0 ||
                                                            activeActionIndex >=
                                                                availableActions.length -
                                                                    1
                                                        }
                                                        aria-label="View next action"
                                                        title="Next action"
                                                        onClick={() => {
                                                            const action =
                                                                availableActions[
                                                                    activeActionIndex +
                                                                        1
                                                                ];

                                                            if (
                                                                action &&
                                                                actionSelectionKey
                                                            ) {
                                                                setSelectedActionIdByPhase(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        [actionSelectionKey]:
                                                                            action.id,
                                                                    }),
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <ChevronRight className="size-4" />
                                                    </Button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                    {selectedPhase ? (
                                        <div className="mt-4 flex flex-col gap-4 lg:min-h-0 lg:flex-1">
                                            {activeAction?.description ? (
                                                <p className="text-sm text-muted-foreground">
                                                    {activeAction.description}
                                                </p>
                                            ) : null}
                                            {phaseDocuments.length > 0 ? (
                                                <div className="lg:min-h-0 lg:flex-1">
                                                    <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        {activeAction
                                                            ? 'Required documents for this action'
                                                            : 'Required documents'}
                                                    </p>
                                                    <ul className="custom-scrollbar space-y-2 lg:max-h-56 lg:overflow-y-auto lg:pr-1">
                                                        {phaseDocuments.map(
                                                            (document) => {
                                                                const submittedDocument =
                                                                    uploadedDocuments.find(
                                                                        (
                                                                            uploaded,
                                                                        ) =>
                                                                            Number(
                                                                                uploaded
                                                                                    .pivot
                                                                                    .required_document_id,
                                                                            ) ===
                                                                            document.id,
                                                                    );

                                                                return (
                                                                    <li
                                                                        key={
                                                                            document.id
                                                                        }
                                                                        className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 ${
                                                                            submittedDocument
                                                                                ? 'border-primary bg-primary/5'
                                                                                : 'border-border'
                                                                        }`}
                                                                    >
                                                                        <div className="flex min-w-0 items-center gap-3">
                                                                            {submittedDocument ? (
                                                                                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                                                                            ) : (
                                                                                <FileText className="size-4 shrink-0 text-muted-foreground" />
                                                                            )}
                                                                            <div className="min-w-0">
                                                                                <p className="truncate text-sm font-medium">
                                                                                    {
                                                                                        document.name
                                                                                    }
                                                                                </p>
                                                                                <p className="truncate text-xs text-muted-foreground">
                                                                                    {submittedDocument
                                                                                        ? 'File uploaded'
                                                                                        : 'Not uploaded'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex shrink-0 items-center gap-1">
                                                                            {submittedDocument ? (
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="size-8 text-primary hover:text-primary"
                                                                                    aria-label={`View ${document.name}`}
                                                                                    title="View file"
                                                                                    onClick={() =>
                                                                                        handleViewProposalDocument(
                                                                                            submittedDocument,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <Eye className="size-3.5" />
                                                                                </Button>
                                                                            ) : null}
                                                                            {!canUploadSelectedAction ? null : (
                                                                            <DocumentUploadModal
                                                                                title={`${submittedDocument ? 'Replace' : 'Upload'} ${document.name}`}
                                                                                description={`${submittedDocument ? 'Choose a replacement file' : 'Upload the file'} required for ${activeAction?.name ?? selectedPhaseName}.`}
                                                                                submitLabel={submittedDocument ? 'Replace file' : 'Upload file'}
                                                                                uploadProgress={
                                                                                    uploadProgress
                                                                                }
                                                                                showName={
                                                                                    false
                                                                                }
                                                                                showType={
                                                                                    false
                                                                                }
                                                                                expectedType={
                                                                                    document.file_type
                                                                                }
                                                                                initialValues={{
                                                                                    name: document.name,
                                                                                    label: document.label,
                                                                                }}
                                                                                onSubmit={({
                                                                                    files,
                                                                                }: {
                                                                                    files: File[];
                                                                                }) =>
                                                                                    handleUploadRequiredFile(
                                                                                        document.id,
                                                                                        document.name,
                                                                                        files,
                                                                                        submittedDocument?.id,
                                                                                    )
                                                                                }
                                                                                trigger={
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        className="size-8 shrink-0 p-0"
                                                                                        aria-label={`${submittedDocument ? 'Replace' : 'Upload'} ${document.name}`}
                                                                                        title={submittedDocument ? 'Replace file' : 'Upload file'}
                                                                                    >
                                                                                        {submittedDocument ? (
                                                                                            <RefreshCw className="size-3.5" />
                                                                                        ) : (
                                                                                            <Upload className="size-3.5" />
                                                                                        )}
                                                                                    </Button>
                                                                                }
                                                                            />
                                                                            )}
                                                                        </div>
                                                                    </li>
                                                                );
                                                            },
                                                        )}
                                                    </ul>
                                                </div>
                                            ) : (
                                                <p className="rounded-md border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
                                                    No documents are required
                                                    for this phase.
                                                </p>
                                            )}
                                            {activeAction?.action_type ===
                                            'review' ? (
                                                <p className="rounded-md border border-dashed border-border px-3 py-5 text-center text-sm text-muted-foreground">
                                                    This action is awaiting
                                                    review. Decisions are made
                                                    from Tracking.
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <p className="mt-3 text-sm text-muted-foreground">
                                            This proposal has no workflow phases
                                            configured.
                                        </p>
                                    )}
                                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 pt-6 lg:mt-auto">
                                        <p
                                            className="flex items-center gap-1.5 text-sm text-muted-foreground"
                                            aria-live="polite"
                                        >
                                            <CheckCircle2 className="size-4" />
                                            {
                                                phaseDocuments.filter(
                                                    (document) =>
                                                        uploadedRequiredDocumentIds.has(
                                                            document.id,
                                                        ),
                                                ).length
                                            }
                                            {' / '}
                                            {phaseDocuments.length} files
                                            complete
                                        </p>
                                        {activeAction?.action_type ===
                                            'submit' &&
                                        isCurrentActionSelected ? (
                                            <Button
                                                type="button"
                                                disabled={
                                                    isAdvancing ||
                                                    phaseDocuments.some(
                                                        (document) =>
                                                            !uploadedRequiredDocumentIds.has(
                                                                document.id,
                                                            ),
                                                    )
                                                }
                                                onClick={handleSubmitAction}
                                            >
                                                {isAdvancing ? (
                                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                                ) : null}
                                                Submit
                                            </Button>
                                        ) : null}
                                        {!activeAction &&
                                        activeProposal.completed_at ? (
                                            <span className="text-sm font-medium text-muted-foreground">
                                                Workflow complete
                                            </span>
                                        ) : null}
                                        {!activeAction &&
                                        !activeProposal.completed_at &&
                                        proposalPhases.length > 0 ? (
                                            <span className="text-sm font-medium text-muted-foreground">
                                                No actions configured for this
                                                phase
                                            </span>
                                        ) : null}
                                    </div>
                                </section>
                            </div>
                        </section>
                    ) : proposals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 text-center">
                            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                                <ClipboardList className="size-6 text-primary" />
                            </div>
                            <h3 className="mb-1 text-lg font-semibold">
                                No proposals found
                            </h3>
                            <p className="mb-4 max-w-sm text-sm text-muted-foreground">
                                You don't have any proposals yet. Get started by
                                creating your first proposal.
                            </p>
                            <Button onClick={() => setIsCreateModalOpen(true)}>
                                Create Proposal
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>

            <Dialog
                open={isSwitchProposalModalOpen}
                onOpenChange={setIsSwitchProposalModalOpen}
            >
                <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
                    <DialogHeader className="border-b border-border px-6 py-5 pr-12">
                        <DialogTitle>Switch proposal</DialogTitle>
                        <DialogDescription>
                            Choose a proposal to view its workflow and activity.
                            <span className="ml-1">
                                {proposals.length} of {MAX_PROPOSALS} proposals
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <div
                        className="flex shrink-0 gap-2 border-b border-border px-6 py-3"
                        role="tablist"
                        aria-label="Proposal status"
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={proposalListTab === 'active'}
                            onClick={() => setProposalListTab('active')}
                            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                proposalListTab === 'active'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Active ({activeProposals.length})
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={proposalListTab === 'archived'}
                            onClick={() => setProposalListTab('archived')}
                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                proposalListTab === 'archived'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <Archive className="size-4" />
                            Archived ({archivedProposals.length})
                        </button>
                    </div>
                    <div
                        className="custom-scrollbar h-[28.5rem] max-h-[calc(85vh-9.5rem)] overflow-y-auto p-6"
                        role="tabpanel"
                        aria-label={
                            proposalListTab === 'active'
                                ? 'Active proposals'
                                : 'Archived proposals'
                        }
                    >
                        {proposalsInSelectedTab.length > 0 ? (
                            <div className="space-y-3">
                                {proposalsInSelectedTab.map((proposal) => {
                                    const phaseName =
                                        proposal.current_phase?.name ??
                                        'Not started';
                                    const isActive =
                                        proposal.id === activeProposalId;

                                    return (
                                        <button
                                            key={proposal.id}
                                            type="button"
                                            aria-pressed={isActive}
                                            onClick={() => {
                                                setActiveProposalId(
                                                    proposal.id,
                                                );
                                                setIsSwitchProposalModalOpen(
                                                    false,
                                                );
                                            }}
                                            className={`flex h-32 w-full shrink-0 flex-row items-center justify-between gap-3 overflow-hidden rounded-lg border p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none ${
                                                isActive
                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                                    : 'border-border bg-card'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate leading-snug font-semibold">
                                                            {proposal.title}
                                                        </p>
                                                        <p className="mt-1 truncate text-sm text-muted-foreground">
                                                            {proposal.process
                                                                ?.name ??
                                                                'No workflow process assigned'}
                                                        </p>
                                                    </div>
                                                    {isActive ? (
                                                        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                                            <Check className="size-3" />
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className="mt-2 font-mono"
                                                >
                                                    #{proposal.id}
                                                </Badge>
                                            </div>

                                            <div className="w-32 shrink-0 space-y-2">
                                                <div>
                                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Status
                                                    </p>
                                                    <Badge
                                                        variant="outline"
                                                        className="mt-1.5"
                                                    >
                                                        <ClipboardList />
                                                        {proposal.completed_at
                                                            ? 'Complete'
                                                            : phaseName}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Created{' '}
                                                    <time
                                                        dateTime={
                                                            proposal.created_at
                                                        }
                                                    >
                                                        {new Date(
                                                            proposal.created_at,
                                                        ).toLocaleDateString()}
                                                    </time>
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                                {proposalListTab === 'active'
                                    ? 'No active proposals.'
                                    : 'Completed proposals will appear here.'}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
            >
                <DialogContent>
                    <form onSubmit={handleCreate}>
                        <DialogHeader>
                            <DialogTitle>Create New Proposal</DialogTitle>
                            <DialogDescription>
                                Enter the title of your research proposal to get
                                started.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">Proposal Title</Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(e) =>
                                        setData('title', e.target.value)
                                    }
                                    placeholder="e.g., Study on Artificial Intelligence in Healthcare"
                                    autoFocus
                                />
                                {errors.title && (
                                    <p className="text-sm text-destructive">
                                        {errors.title}
                                    </p>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing || isProposalLimitReached}
                            >
                                {processing && (
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                )}
                                Create Proposal
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog
                open={documentToView !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDocumentToView(null);
                        setDocumentViewUrl(null);
                    }
                }}
            >
                <DialogContent className="!inset-0 !top-0 !left-0 flex h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col rounded-none border-0 p-4 sm:p-6 [&>button:last-child]:bg-background [&>button:last-child]:text-foreground [&>button:last-child]:opacity-100 [&>button:last-child]:shadow-sm [&>button:last-child]:ring-1 [&>button:last-child]:ring-border [&>button:last-child]:hover:bg-muted [&>button:last-child_svg]:size-5">
                    <DialogHeader>
                        <DialogTitle>
                            {documentToView?.name ?? 'Document preview'}
                        </DialogTitle>
                        <DialogDescription>
                            Previewing the document from secure storage.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-muted">
                        {isLoadingDocumentView ? (
                            <div
                                className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center"
                                role="status"
                                aria-live="polite"
                            >
                                <div className="flex size-16 items-center justify-center rounded-full bg-background shadow-sm">
                                    <LoaderCircle
                                        className="size-7 animate-spin text-primary"
                                        aria-hidden="true"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">
                                        Preparing preview
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Connecting to secure storage...
                                    </p>
                                </div>
                                <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-background">
                                    <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
                                </div>
                            </div>
                        ) : documentViewUrl ? (
                            <iframe
                                src={documentViewUrl}
                                title={`Preview ${documentToView?.name ?? 'document'}`}
                                className="h-full min-h-[24rem] w-full border-0"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                Preview unavailable.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
