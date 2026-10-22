import { router } from '@inertiajs/react';
import {
    Activity,
    Check,
    Eye,
    FileText,
    Loader2,
    LoaderCircle,
    Search,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import PhasePipeline from '@/components/PhasePipeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type Phase = {
    id: number;
    name: string;
    order: number;
    actions?: Action[];
};

type Action = {
    id: number;
    name: string;
    description?: string | null;
    action_type: 'submit' | 'review';
    decision_mode: 'approve_deny' | 'custom';
    custom_decision_branches?: { id: string; label: string; destination?: string }[] | null;
    documents?: { id: number; name: string; file_type: string }[];
};

type Process = {
    id: number;
    name: string;
    phases?: Phase[];
};

type Proposal = {
    id: number;
    user_id?: number;
    user_type?: string;
    can_review?: boolean;
    title: string;
    process: Process | null;
    current_phase: Phase | null;
    current_action: Action | null;
    completed_at: string | null;
    created_at: string;
    phase_transitions: { id: number; phase: Phase; created_at: string }[];
    action_transitions: {
        id: number;
        action: Action;
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
    isSample?: boolean;
};

const hasAssignedCurrentPhase = (proposal: Proposal): boolean => Boolean(
    proposal.current_phase
    && proposal.process?.phases?.some((phase) => phase.id === proposal.current_phase?.id),
);

const hasSubmittedRequiredFiles = (proposal: Proposal): boolean => {
    const requiredDocuments = proposal.current_action?.documents ?? [];

    return requiredDocuments.every((requiredDocument) => proposal.documents.some((document) => (
        document.pivot.required_document_id === requiredDocument.id
        && document.pivot.action_id === proposal.current_action?.id
        && document.pivot.phase_id === proposal.current_phase?.id
    )));
};

type Props = {
    proposals: Proposal[];
};

type SampleDetailsState = 'waiting' | 'submitted';
const ARCHIVED_PHASE = 'archived';

const sampleRequiredItems = [
    { id: 'proposal', name: 'Research proposal document' },
    { id: 'ethics', name: 'Ethics approval form' },
    { id: 'supporting', name: 'Supporting materials' },
];

const sampleSubmittedFiles = [
    { id: 'proposal', name: 'community-health-proposal.pdf' },
    { id: 'ethics', name: 'ethics-approval-form.pdf' },
    { id: 'supporting', name: 'participant-information-sheet.pdf' },
];

const sampleProposal: Proposal = {
    id: 0,
    user_id: 0,
    user_type: 'sample',
    can_review: false,
    title: 'Community Health Research Proposal',
    process: {
        id: 0,
        name: 'Research Proposal Workflow',
        phases: [{ id: 1, name: 'Initial Review', order: 1 }],
    },
    current_phase: { id: 1, name: 'Initial Review', order: 1 },
    current_action: null,
    completed_at: null,
    created_at: '2026-10-15T08:00:00.000Z',
    phase_transitions: [],
    action_transitions: [],
    documents: [],
    isSample: true,
};

export default function Tracking({ proposals }: Props) {
    const [isSampleDetailsOpen, setIsSampleDetailsOpen] = useState(false);
    const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
    const [documentToView, setDocumentToView] =
        useState<Proposal['documents'][number] | null>(null);
    const [documentViewUrl, setDocumentViewUrl] = useState<string | null>(null);
    const [isLoadingDocumentView, setIsLoadingDocumentView] = useState(false);
    const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
    const [sampleDetailsState, setSampleDetailsState] = useState<SampleDetailsState>('waiting');
    const [sampleFileSearch, setSampleFileSearch] = useState('');
    const [requestedPhaseOrder, setRequestedPhaseOrder] = useState<number | string | null>(null);
    const phases = useMemo(() => {
        const allPhaseOrders = new Set(
            proposals.flatMap((proposal) => proposal.process?.phases?.map((phase) => phase.order) ?? []),
        );

        return Array.from(allPhaseOrders).sort((first, second) => first - second).map((order) => {
            const phaseNames = new Set(
                proposals.flatMap((proposal) =>
                    proposal.process?.phases?.filter((phase) => phase.order === order).map((phase) => phase.name) ?? [],
                ),
            );
            const proposalCount = proposals.filter((proposal) => (
                !proposal.completed_at
                && hasAssignedCurrentPhase(proposal)
                && proposal.current_phase?.order === order
            )).length;

            return {
                id: order,
                name: phaseNames.size === 1 ? Array.from(phaseNames)[0] : `Phase ${order}`,
                isClickable: true,
                detail: `${proposalCount} ${proposalCount === 1 ? 'proposal' : 'proposals'}`,
            };
        });
    }, [proposals]);
    const isArchivedSelected = requestedPhaseOrder === ARCHIVED_PHASE;
    const archivedProposals = useMemo(
        () => proposals.filter((proposal) => Boolean(proposal.completed_at)),
        [proposals],
    );
    const explicitlySelectedPhase = phases.find(
        (phase) => phase.id === requestedPhaseOrder,
    );
    const selectedPhaseOrder = isArchivedSelected
        ? null
        : explicitlySelectedPhase?.id
          ?? proposals.find(hasAssignedCurrentPhase)?.current_phase?.order
          ?? phases[0]?.id
          ?? null;
    const [search, setSearch] = useState('');
    const selectedProposal = proposals.find(
        (proposal) => proposal.id === selectedProposalId,
    ) ?? null;
    const phaseProposals = useMemo(() => {
        if (isArchivedSelected) {
            return archivedProposals;
        }

        if (selectedPhaseOrder === null) {
            return [];
        }

        return proposals.filter((proposal) => (
            !proposal.completed_at
            && hasAssignedCurrentPhase(proposal)
            && proposal.current_phase?.order === selectedPhaseOrder
        ));
    }, [archivedProposals, isArchivedSelected, proposals, selectedPhaseOrder]);
    const selectedPhaseName = isArchivedSelected
        ? 'Archived'
        : phases.find((phase) => phase.id === selectedPhaseOrder)?.name ?? 'No workflow phases';
    const sampleDefaultPhase = sampleProposal.current_phase ?? { id: 1, name: 'Initial Review', order: 1 };
    const sampleForSelectedPhase = useMemo<Proposal>(() => ({
        ...sampleProposal,
        current_phase: {
            id: selectedPhaseOrder ?? sampleDefaultPhase.id,
            name: selectedPhaseOrder === null ? sampleDefaultPhase.name : selectedPhaseName,
            order: selectedPhaseOrder ?? sampleDefaultPhase.order,
        },
    }), [sampleDefaultPhase.id, sampleDefaultPhase.name, sampleDefaultPhase.order, selectedPhaseName, selectedPhaseOrder]);
    const visibleSampleFiles = (sampleDetailsState === 'waiting' ? sampleRequiredItems : sampleSubmittedFiles)
        .filter((item) => item.name.toLocaleLowerCase().includes(sampleFileSearch.trim().toLocaleLowerCase()));
    const filteredProposals = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase();

        if (!normalizedSearch) {
            return isArchivedSelected
                ? phaseProposals
                : [...phaseProposals, sampleForSelectedPhase];
        }

        const matchingProposals = phaseProposals.filter((proposal) =>
            [proposal.title, proposal.process?.name ?? '', proposal.current_phase?.name ?? '']
                .some((value) => value.toLocaleLowerCase().includes(normalizedSearch)),
        );

        const sampleMatchesSearch = [
            sampleForSelectedPhase.title,
            sampleForSelectedPhase.process?.name ?? '',
            sampleForSelectedPhase.current_phase?.name ?? '',
        ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch));

        return !isArchivedSelected && sampleMatchesSearch
            ? [...matchingProposals, sampleForSelectedPhase]
            : matchingProposals;
    }, [isArchivedSelected, phaseProposals, sampleForSelectedPhase, search]);

    const handleReviewDecision = (decision: string) => {
        if (!selectedProposal?.can_review || !selectedProposal.current_action) {
            return;
        }

        router.post(
            `/tenant/proposals/${selectedProposal.id}/review`,
            { decision },
            {
                preserveScroll: true,
                onStart: () => setIsSubmittingDecision(true),
                onFinish: () => setIsSubmittingDecision(false),
                onSuccess: () => {
                    setSelectedProposalId(null);
                    toast.success('Review decision submitted.');
                    router.reload({ only: ['proposals'] });
                },
                onError: (errors) =>
                    toast.error(
                        errors.workflow || 'Review decision failed.',
                    ),
            },
        );
    };

    const handleViewDocument = async (
        file: Proposal['documents'][number],
    ) => {
        setDocumentToView(file);
        setDocumentViewUrl(null);
        setIsLoadingDocumentView(true);

        try {
            const response = await fetch(
                `/tenant/documents/${file.id}/view-url`,
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

    return (
        <div className="flex flex-col gap-4 p-4 md:min-h-0 md:flex-1 md:p-6">
            <header className="-mx-6 -mt-6 mb-0 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        <Activity className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">Tracking</h1>
                        <p className="text-xs text-muted-foreground">Review proposals by workflow phase.</p>
                    </div>
                </div>
            </header>

            <div className="shrink-0 overflow-hidden rounded-lg border border-border bg-card">
                <PhasePipeline
                    phases={phases}
                    activePhaseId={selectedPhaseOrder ?? undefined}
                    onPhaseSelect={(phaseId) => setRequestedPhaseOrder(phaseId)}
                    endNode={{
                        name: 'Archived',
                        detail: `${archivedProposals.length} ${
                            archivedProposals.length === 1
                                ? 'proposal'
                                : 'proposals'
                        }`,
                        isActive: isArchivedSelected,
                        onSelect: () => setRequestedPhaseOrder(ARCHIVED_PHASE),
                    }}
                    showPhaseDetails
                    centerActivePhase
                />
            </div>

            <section className="flex flex-col rounded-lg border border-border bg-card md:min-h-0 md:flex-1 md:overflow-hidden">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                    <div>
                        <h2 className="text-sm font-semibold">{selectedPhaseName}</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {isArchivedSelected
                                ? `${phaseProposals.length} archived ${phaseProposals.length === 1 ? 'proposal' : 'proposals'}`
                                : `${phaseProposals.length} ${phaseProposals.length === 1 ? 'proposal' : 'proposals'} in this phase · Sample preview included (not saved)`}
                        </p>
                    </div>
                    <div className="relative w-full">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search proposals"
                            aria-label="Search proposals"
                            className="w-full pl-9"
                        />
                    </div>
                </div>

                <div className="overflow-auto md:min-h-0 md:flex-1">
                    <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                        <thead className="sticky top-0 z-10 bg-muted/80 text-xs text-muted-foreground">
                            <tr>
                                <th scope="col" className="px-4 py-3 font-medium">ID</th>
                                <th scope="col" className="px-4 py-3 font-medium">Proposal title</th>
                                <th scope="col" className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredProposals.map((proposal) => (
                                <tr key={proposal.id} className="transition-colors hover:bg-muted/40">
                                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                                        {proposal.isSample ? 'SAMPLE' : `#${proposal.id}`}
                                    </td>
                                    <td className="max-w-96 px-4 py-3">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="truncate font-medium text-foreground">{proposal.title}</span>
                                            {proposal.isSample ? <Badge variant="secondary">Sample</Badge> : null}
                                        </div>
                                        <p className="mt-1 truncate text-xs text-muted-foreground">
                                            {proposal.process?.name ?? 'No workflow process assigned'}
                                            {proposal.current_phase ? ` · ${proposal.current_phase.name}` : ''}
                                        </p>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right">
                                        {proposal.isSample ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSampleDetailsState('waiting');
                                                    setSampleFileSearch('');
                                                    setIsSampleDetailsOpen(true);
                                                }}
                                            >
                                                Details
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedProposalId(proposal.id)}
                                            >
                                                {proposal.can_review
                                                    && proposal.current_action?.action_type === 'review'
                                                    && !proposal.completed_at
                                                    && hasSubmittedRequiredFiles(proposal)
                                                    ? 'Review'
                                                    : 'Details'}
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredProposals.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                        {search.trim() && filteredProposals.length === 0
                                            ? 'No proposals match your search.'
                                            : phaseProposals.length === 0
                                            ? `No proposals are currently in ${selectedPhaseName}.`
                                            : 'No proposals match your search.'}
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </section>

            <Dialog
                open={selectedProposal !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedProposalId(null);
                    }
                }}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                    {selectedProposal ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedProposal.title}</DialogTitle>
                                <DialogDescription>
                                    Proposal #{selectedProposal.id} details and current workflow status.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-5">
                                <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                            Current status
                                        </p>
                                        <p className="mt-1 text-sm">
                                            {selectedProposal.current_action?.action_type === 'review'
                                                ? 'Waiting for review'
                                                : selectedProposal.completed_at
                                                  ? 'Complete'
                                                  : selectedProposal.current_phase?.name ?? 'Not started'}
                                        </p>
                                    </div>
                                    <Badge variant="outline">
                                        {selectedProposal.current_action?.name ?? (selectedProposal.completed_at ? 'Complete' : 'In progress')}
                                    </Badge>
                                </div>

                                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                                    <div>
                                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workflow</dt>
                                        <dd className="mt-1">{selectedProposal.process?.name ?? 'No workflow assigned'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current phase</dt>
                                        <dd className="mt-1">{selectedProposal.current_phase?.name ?? 'Not started'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Created</dt>
                                        <dd className="mt-1">{new Date(selectedProposal.created_at).toLocaleString()}</dd>
                                    </div>
                                    {selectedProposal.current_action?.description ? (
                                        <div className="sm:col-span-2">
                                            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current action</dt>
                                            <dd className="mt-1">{selectedProposal.current_action.description}</dd>
                                        </div>
                                    ) : null}
                                </dl>

                                <div>
                                    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Submitted files
                                    </h3>
                                    {selectedProposal.documents.length > 0 ? (
                                        <ul className="max-h-48 space-y-2 overflow-y-auto">
                                            {selectedProposal.documents.map((file) => (
                                                <li
                                                    key={file.id}
                                                    className="flex min-w-0 items-center gap-3 rounded-md border border-border px-3 py-2"
                                                >
                                                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                                                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
                                                    <span className="shrink-0 text-xs text-muted-foreground">{file.file_type}</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8 shrink-0"
                                                        aria-label={`View ${file.name}`}
                                                        title="View file"
                                                        onClick={() => {
                                                            void handleViewDocument(file);
                                                        }}
                                                    >
                                                        <Eye className="size-4" />
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                                            No files have been submitted.
                                        </p>
                                    )}
                                </div>

                                {selectedProposal.can_review && selectedProposal.current_action?.action_type === 'review' ? (
                                    <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                                        {selectedProposal.current_action.decision_mode === 'custom'
                                            ? selectedProposal.current_action.custom_decision_branches?.map((branch) => (
                                                <Button
                                                    key={branch.id}
                                                    type="button"
                                                    disabled={isSubmittingDecision}
                                                    onClick={() => handleReviewDecision(branch.id)}
                                                >
                                                    {isSubmittingDecision ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                                                    {branch.label}
                                                </Button>
                                            ))
                                            : (
                                                <>
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        disabled={isSubmittingDecision}
                                                        onClick={() => handleReviewDecision('deny')}
                                                    >
                                                        {isSubmittingDecision ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                                                        Reject
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        disabled={isSubmittingDecision}
                                                        onClick={() => handleReviewDecision('approve')}
                                                    >
                                                        {isSubmittingDecision ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                                                        <Check className="mr-1.5 size-4" />
                                                        Accept
                                                    </Button>
                                                </>
                                            )}
                                    </div>
                                ) : null}
                            </div>
                        </>
                    ) : null}
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

            <Dialog open={isSampleDetailsOpen} onOpenChange={setIsSampleDetailsOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{sampleProposal.title}</DialogTitle>
                        <DialogDescription>
                            Sample preview only. Switch states to see how this module looks before and after submission.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="tablist" aria-label="Sample module state">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={sampleDetailsState === 'waiting'}
                            onClick={() => setSampleDetailsState('waiting')}
                            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                sampleDetailsState === 'waiting' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Waiting for researcher
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={sampleDetailsState === 'submitted'}
                            onClick={() => setSampleDetailsState('submitted')}
                            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                                sampleDetailsState === 'submitted' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Submitted for review
                        </button>
                    </div>

                    <section role="tabpanel" className="mt-4 space-y-4">
                        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
                                <p className="mt-1 text-sm text-foreground">
                                    {sampleDetailsState === 'waiting' ? 'Awaiting required files' : 'Files ready for review'}
                                </p>
                            </div>
                            <Badge variant={sampleDetailsState === 'waiting' ? 'outline' : 'secondary'}>
                                {sampleDetailsState === 'waiting' ? 'Waiting for researcher' : 'Submitted'}
                            </Badge>
                        </div>

                        <dl className="grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workflow</dt>
                                <dd className="mt-1">{sampleProposal.process?.name}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current phase</dt>
                                <dd className="mt-1">{sampleProposal.current_phase?.name}</dd>
                            </div>
                            <div>
                                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Created</dt>
                                <dd className="mt-1">{new Date(sampleProposal.created_at).toLocaleDateString()}</dd>
                            </div>
                        </dl>

                        <div>
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    {sampleDetailsState === 'waiting' ? 'Items required' : 'Files submitted for review'}
                                </h3>
                            </div>
                            <div className="relative mb-2">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={sampleFileSearch}
                                    onChange={(event) => setSampleFileSearch(event.target.value)}
                                    placeholder="Search files"
                                    aria-label="Search required and submitted files"
                                    className="pl-9"
                                />
                            </div>
                            <ul className="custom-scrollbar max-h-48 space-y-2 overflow-y-auto pr-2">
                                {visibleSampleFiles.map((item) => (
                                    <li key={item.id} className="flex h-12 min-w-0 items-center gap-3 rounded-md border border-border px-3">
                                        <FileText className="size-4 shrink-0 text-muted-foreground" />
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                                        {sampleDetailsState === 'waiting' ? (
                                            <Badge variant="outline" className="shrink-0">Required</Badge>
                                        ) : (
                                            <Button type="button" variant="outline" size="sm" className="h-8 shrink-0">
                                                <Eye className="mr-1.5 size-4" />
                                                View file
                                            </Button>
                                        )}
                                    </li>
                                ))}
                                {visibleSampleFiles.length === 0 ? (
                                    <li className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                                        No matching files.
                                    </li>
                                ) : null}
                            </ul>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-border pt-4">
                            <Button type="button" variant="destructive" size="sm" disabled>
                                <X className="mr-1.5 size-4" />
                                Reject
                            </Button>
                            <Button type="button" size="sm" disabled className="bg-emerald-600 text-white hover:bg-emerald-700">
                                <Check className="mr-1.5 size-4" />
                                Accept
                            </Button>
                        </div>
                    </section>
                </DialogContent>
            </Dialog>
        </div>
    );
}
