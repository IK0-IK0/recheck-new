import { router } from '@inertiajs/react';
import {
    Activity,
    Eye,
    FileText,
    History,
    Loader2,
    LoaderCircle,
    MessageSquare,
    Replace,
    Search,
    Upload,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import PhasePipeline from '@/components/PhasePipeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

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
    documents?: { id: number; name: string; file_type: string; label: 'form' | 'doc' }[];
};

type ReviewCandidate = {
    id: number;
    name: string;
    email: string;
    user_type: string;
    role_ids: number[];
};

type ReviewMember = {
    id: number;
    user_id: number;
    user_type: string;
    name: string;
    decision: string | null;
    comment: string | null;
    responded_at: string | null;
};

type ReviewDocument = {
    id: number;
    name: string;
    file_type: string;
    label: 'form' | 'doc';
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
    is_main_reviewer?: boolean;
    is_additional_reviewer?: boolean;
    requires_additional_reviewers?: boolean;
    can_submit_decision?: boolean;
    review_members?: ReviewMember[];
    review_reviewer_candidates?: ReviewCandidate[];
    assigned_reviewer_ids?: string[];
    member_decision?: string | null;
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
        rejected_documents?: { document_id: number; comment: string | null }[] | null;
    }[];
    review_documents?: ReviewDocument[];
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

const hasAssignedCurrentPhase = (proposal: Proposal): boolean => Boolean(
    proposal.current_phase
    && proposal.process?.phases?.some((phase) => phase.id === proposal.current_phase?.id),
);

type Props = {
    proposals: Proposal[];
    currentStorageDriver: string;
};

const ARCHIVED_PHASE = 'archived';
const isRejectionOutcome = (decision: string, label?: string): boolean =>
    decision === 'deny' || /\b(reject|deny|decline)\b/i.test(label ?? '');

const readUploadResponse = async (response: Response): Promise<Record<string, unknown>> => {
    const responseText = await response.text();

    try {
        return responseText ? JSON.parse(responseText) : {};
    } catch {
        throw new Error(`The server returned an unexpected response (HTTP ${response.status}).`);
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
        request.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
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

            reject(new Error(`Bucket upload returned HTTP ${request.status}. Check the bucket CORS policy.`));
        });
        request.addEventListener('error', () =>
            reject(new Error('The bucket upload failed. Check the bucket CORS policy.')),
        );
        request.addEventListener('abort', () => reject(new Error('The bucket upload was cancelled.')));
        request.send(file);
    });

export default function Tracking({ proposals, currentStorageDriver }: Props) {
    const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
    const [documentToView, setDocumentToView] =
        useState<Proposal['documents'][number] | null>(null);
    const [documentViewUrl, setDocumentViewUrl] = useState<string | null>(null);
    const [isLoadingDocumentView, setIsLoadingDocumentView] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [uploadingReviewDocumentId, setUploadingReviewDocumentId] = useState<number | null>(null);
    const [draggedReviewDocumentId, setDraggedReviewDocumentId] = useState<number | null>(null);
    const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
    const [selectedReviewDecision, setSelectedReviewDecision] = useState('');
    const [selectedMemberRecommendation, setSelectedMemberRecommendation] = useState('');
    const [memberRecommendationComment, setMemberRecommendationComment] = useState('');
    const [isReviewerAssignmentDialogOpen, setIsReviewerAssignmentDialogOpen] = useState(false);
    const [reviewerSelections, setReviewerSelections] = useState<Record<number, string[]>>({});
    const [filledReviewFormIds, setFilledReviewFormIds] = useState<number[]>([]);
    const [rejectedDocumentIds, setRejectedDocumentIds] = useState<number[]>([]);
    const [rejectedDocumentComments, setRejectedDocumentComments] = useState<
        Record<number, string>
    >({});
    const [commentingDocumentIds, setCommentingDocumentIds] = useState<number[]>([]);
    const [commentDropdownWidths, setCommentDropdownWidths] = useState<
        Record<number, number>
    >({});
    const [commentDropdownOffsets, setCommentDropdownOffsets] = useState<
        Record<number, number>
    >({});
    const fileRowRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const commentButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
    const reviewDocumentInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
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
    const selectedProposalHistory = useMemo(() => {
        if (!selectedProposal) {
            return [];
        }

        return [
            {
                id: `created-${selectedProposal.id}`,
                label: 'Proposal created',
                createdAt: selectedProposal.created_at,
                isCreation: true,
            },
            ...selectedProposal.phase_transitions.map((transition) => ({
                id: `phase-${transition.id}`,
                label: `Moved to ${transition.phase.name}`,
                createdAt: transition.created_at,
                isCreation: false,
            })),
            ...selectedProposal.action_transitions.map((transition) => {
                const decisionLabel = transition.action.custom_decision_branches
                    ?.find((branch) => branch.id === transition.decision)
                    ?.label;

                return {
                    id: `action-${transition.id}`,
                    label: `Completed action · ${transition.action.name}${
                        transition.decision
                            ? ` · ${decisionLabel ?? transition.decision}`
                            : ''
                    }`,
                    createdAt: transition.created_at,
                    isCreation: false,
                };
            }),
        ].sort(
            (first, second) =>
                new Date(second.createdAt).getTime() -
                new Date(first.createdAt).getTime(),
        );
    }, [selectedProposal]);
    const reviewDecisions =
        selectedProposal?.current_action?.decision_mode === 'custom'
            ? (selectedProposal.current_action.custom_decision_branches ?? []).map(
                  (branch) => ({ value: branch.id, label: branch.label }),
              )
            : [
                  { value: 'approve', label: 'Accept' },
                  { value: 'deny', label: 'Reject' },
              ];
    const reviewDecision = reviewDecisions.some(
        (decision) => decision.value === selectedReviewDecision,
    )
        ? selectedReviewDecision
        : (reviewDecisions[0]?.value ?? '');
    const memberRecommendation = reviewDecisions.some(
        (decision) => decision.value === selectedMemberRecommendation,
    )
        ? selectedMemberRecommendation
        : (reviewDecisions[0]?.value ?? '');
    const selectedReviewerIds = selectedProposal
        ? reviewerSelections[selectedProposal.id] ?? selectedProposal.assigned_reviewer_ids ?? []
        : [];
    const assignedReviewerIds = selectedProposal?.assigned_reviewer_ids ?? [];
    const hasAssignedReviewers = assignedReviewerIds.length > 0;
    const hasReviewerResponded = (selectedProposal?.review_members ?? []).some(
        (member) => member.responded_at !== null,
    );
    const requiresAdditionalReviewers = selectedProposal?.requires_additional_reviewers ?? false;
    const hasUnsavedReviewerChanges = [...selectedReviewerIds].sort().join('|')
        !== [...assignedReviewerIds].sort().join('|');
    const isRejectingReview = isRejectionOutcome(
        reviewDecision,
        reviewDecisions.find((decision) => decision.value === reviewDecision)?.label,
    );
    const assignedReviewDocuments = selectedProposal?.can_review
        ? selectedProposal.review_documents ?? []
        : [];
    const assignedReviewDocumentsComplete = assignedReviewDocuments.every(
        (reviewDocument) => reviewDocument.label === 'form'
            ? filledReviewFormIds.includes(reviewDocument.id)
            : (selectedProposal?.documents ?? []).some(
                  (file) =>
                      file.pivot.action_id === selectedProposal?.current_action?.id
                      && file.pivot.required_document_id === reviewDocument.id,
              ),
    );
    const completedReviewDocumentCount = assignedReviewDocuments.filter(
        (reviewDocument) => reviewDocument.label === 'form'
            ? filledReviewFormIds.includes(reviewDocument.id)
            : (selectedProposal?.documents ?? []).some(
                  (file) =>
                      file.pivot.action_id === selectedProposal?.current_action?.id
                      && file.pivot.required_document_id === reviewDocument.id,
              ),
    ).length;
    const assignedReviewDocumentIds = new Set(
        assignedReviewDocuments.map((reviewDocument) => reviewDocument.id),
    );
    const submittedFiles = (selectedProposal?.documents ?? []).filter(
        (file) =>
            file.pivot.action_id !== selectedProposal?.current_action?.id
            || file.pivot.required_document_id === null
            || !assignedReviewDocumentIds.has(file.pivot.required_document_id),
    );
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
    const filteredProposals = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase();

        if (!normalizedSearch) {
            return phaseProposals;
        }

        return phaseProposals.filter((proposal) =>
            [proposal.title, proposal.process?.name ?? '', proposal.current_phase?.name ?? '']
                .some((value) => value.toLocaleLowerCase().includes(normalizedSearch)),
        );
    }, [phaseProposals, search]);

    const handleReviewDecision = (decision: string) => {
        if (!selectedProposal?.can_review || !selectedProposal.current_action) {
            return;
        }

        const rejectedDocuments = isRejectingReview
            ? selectedProposal.documents
                  .filter((file) => rejectedDocumentIds.includes(file.id))
                  .map((file) => ({
                      document_id: file.id,
                      comment: rejectedDocumentComments[file.id]?.trim() || null,
                  }))
            : [];

        router.post(
            `/tenant/proposals/${selectedProposal.id}/review`,
            { decision, rejected_documents: rejectedDocuments },
            {
                preserveScroll: true,
                onStart: () => setIsSubmittingDecision(true),
                onFinish: () => setIsSubmittingDecision(false),
                onSuccess: () => {
                    setSelectedProposalId(null);
                    setFilledReviewFormIds([]);
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

    const handleReviewerSelection = (reviewerId: string, checked: boolean | 'indeterminate') => {
        if (!selectedProposal) {
            return;
        }

        setReviewerSelections((current) => {
            const selectedIds = current[selectedProposal.id]
                ?? selectedProposal.assigned_reviewer_ids
                ?? [];
            const nextIds = checked === true
                ? [...selectedIds, reviewerId]
                : selectedIds.filter((id) => id !== reviewerId);

            return { ...current, [selectedProposal.id]: nextIds };
        });
    };

    const handleSaveReviewers = () => {
        if (!selectedProposal?.is_main_reviewer || !hasUnsavedReviewerChanges) {
            return;
        }

        router.put(
            `/tenant/proposals/${selectedProposal.id}/reviewers`,
            { reviewers: selectedReviewerIds },
            {
                preserveScroll: true,
                onStart: () => setIsSubmittingDecision(true),
                onFinish: () => setIsSubmittingDecision(false),
                onSuccess: () => {
                    setIsReviewerAssignmentDialogOpen(false);
                    setReviewerSelections((current) => {
                        const next = { ...current };
                        delete next[selectedProposal.id];

                        return next;
                    });
                    toast.success('Additional reviewers updated.');

                    router.reload({ only: ['proposals'] });
                },
                onError: (errors) => toast.error(errors.reviewers || 'Reviewer assignment failed.'),
            },
        );
    };

    const handleMemberRecommendation = () => {
        if (!selectedProposal?.is_additional_reviewer || !memberRecommendation) {
            return;
        }

        router.post(
            `/tenant/proposals/${selectedProposal.id}/reviewer-response`,
            {
                decision: memberRecommendation,
                comment: memberRecommendationComment.trim() || null,
            },
            {
                preserveScroll: true,
                onStart: () => setIsSubmittingDecision(true),
                onFinish: () => setIsSubmittingDecision(false),
                onSuccess: () => {
                    toast.success('Recommendation submitted.');
                    router.reload({ only: ['proposals'] });
                },
                onError: (errors) => toast.error(errors.decision || 'Recommendation failed.'),
            },
        );
    };

    const handleUploadReviewDocument = async (
        reviewDocument: ReviewDocument,
        files: File[],
    ): Promise<boolean> => {
        if (
            !selectedProposal?.can_review
            || !selectedProposal.current_action
            || !selectedProposal.current_phase
            || files.length === 0
        ) {
            return false;
        }

        const file = files[0];
        const uploadedDocument = selectedProposal.documents.find(
            (proposalDocument) =>
                proposalDocument.pivot.action_id === selectedProposal.current_action?.id
                && proposalDocument.pivot.required_document_id === reviewDocument.id,
        );
        const metadata = {
            phase_id: selectedProposal.current_phase.id,
            required_document_id: reviewDocument.id,
            action_id: selectedProposal.current_action.id,
            ...(uploadedDocument ? { replace_document_id: uploadedDocument.id } : {}),
        };
        setUploadingReviewDocumentId(reviewDocument.id);

        if (currentStorageDriver !== 's3') {
            const formData = new FormData();
            formData.append('file', file);
            Object.entries(metadata).forEach(([key, value]) => {
                formData.append(key, String(value));
            });

            return new Promise((resolve) => {
                router.post(
                    `/tenant/proposals/${selectedProposal.id}/documents`,
                    formData,
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            toast.success('Assigned file uploaded.');
                            router.reload({ only: ['proposals'] });
                            resolve(true);
                        },
                        onError: (errors) => {
                            toast.error(
                                errors.file
                                    || errors.required_document_id
                                    || errors.storage
                                    || 'Assigned file upload failed.',
                            );
                            resolve(false);
                        },
                        onFinish: () => setUploadingReviewDocumentId(null),
                    },
                );
            });
        }

        const csrfToken =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || '';
        setUploadProgress(0);

        try {
            const uploadUrlResponse = await fetch(
                `/tenant/proposals/${selectedProposal.id}/documents/direct-upload-url`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                    body: JSON.stringify({
                        ...metadata,
                        file_name: file.name,
                        file_size: file.size,
                        content_type: file.type || 'application/octet-stream',
                    }),
                },
            );
            const uploadData = await readUploadResponse(uploadUrlResponse);

            if (!uploadUrlResponse.ok) {
                throw new Error(
                    String(uploadData.error || JSON.stringify(uploadData.errors || uploadData)),
                );
            }

            if (
                typeof uploadData.url !== 'string'
                || typeof uploadData.path !== 'string'
                || typeof uploadData.reference !== 'string'
            ) {
                throw new Error('The server did not return a valid direct upload response.');
            }

            await uploadFileWithProgress(uploadData.url, file, setUploadProgress);

            const completionResponse = await fetch(
                `/tenant/proposals/${selectedProposal.id}/documents/complete-direct-upload`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                    body: JSON.stringify({
                        ...metadata,
                        path: uploadData.path,
                        reference: uploadData.reference,
                        file_size: file.size,
                        content_type: file.type || 'application/octet-stream',
                    }),
                },
            );
            const completionData = await readUploadResponse(completionResponse);

            if (!completionResponse.ok) {
                throw new Error(
                    String(completionData.error || JSON.stringify(completionData.errors || completionData)),
                );
            }

            toast.success('Assigned file uploaded.');
            router.reload({ only: ['proposals'] });

            return true;
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : 'Assigned file upload failed.',
            );

            return false;
        } finally {
            setUploadProgress(null);
            setUploadingReviewDocumentId(null);
        }
    };

    const handleSelectedReviewDocumentFiles = async (
        reviewDocument: ReviewDocument,
        files: FileList | File[],
    ): Promise<void> => {
        if (files.length === 0) {
            return;
        }

        if (files.length !== 1) {
            toast.error('Select or drop one file at a time.');

            return;
        }

        const file = files[0];

        if (file.size > 10 * 1024 * 1024) {
            toast.error('The selected file exceeds the 10MB maximum size.');

            return;
        }

        if (
            reviewDocument.file_type.includes('/')
            && file.type
            && file.type.toLowerCase() !== reviewDocument.file_type.toLowerCase()
        ) {
            toast.error(`Choose a ${reviewDocument.file_type} file.`);

            return;
        }

        await handleUploadReviewDocument(reviewDocument, [file]);
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
                                : `${phaseProposals.length} ${phaseProposals.length === 1 ? 'proposal' : 'proposals'} in this phase`}
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
                                        #{proposal.id}
                                    </td>
                                    <td className="max-w-96 px-4 py-3">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="truncate font-medium text-foreground">{proposal.title}</span>
                                        </div>
                                        <p className="mt-1 truncate text-xs text-muted-foreground">
                                            {proposal.process?.name ?? 'No workflow process assigned'}
                                            {proposal.current_phase ? ` · ${proposal.current_phase.name}` : ''}
                                        </p>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedProposalId(proposal.id)}
                                        >
                                            {proposal.can_review
                                                && proposal.current_action?.action_type === 'review'
                                                && !proposal.completed_at
                                                ? proposal.is_main_reviewer
                                                    ? 'Review'
                                                    : 'Recommend'
                                                : 'Details'}
                                        </Button>
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

            <Sheet
                open={selectedProposal !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setSelectedProposalId(null);
                        setSelectedReviewDecision('');
                        setSelectedMemberRecommendation('');
                        setMemberRecommendationComment('');
                        setFilledReviewFormIds([]);
                        setRejectedDocumentIds([]);
                        setRejectedDocumentComments({});
                        setCommentingDocumentIds([]);
                    }
                }}
            >
                <SheetContent
                    side="right"
                    className="h-dvh w-full overflow-hidden rounded-none p-4 sm:w-[min(72rem,calc(100vw-2rem))] sm:max-w-none sm:p-6"
                >
                    {selectedProposal ? (
                        <>
                            <SheetHeader className="p-0">
                                <SheetTitle className="text-lg leading-none">
                                    {selectedProposal.title}
                                </SheetTitle>
                                <SheetDescription>
                                    Proposal #{selectedProposal.id} details and current workflow status.
                                </SheetDescription>
                            </SheetHeader>

                            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <section className="min-w-0 space-y-4">
                                        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                            Details
                                        </h3>
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

                                    </section>
                                    <section className="min-w-0">
                                        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                            <History className="mr-1.5 inline size-4" />
                                            History
                                        </h3>
                                        {selectedProposalHistory.length > 0 ? (
                                            <ol className="custom-scrollbar max-h-40 space-y-2 overflow-y-auto pr-2">
                                                {selectedProposalHistory.map((entry) => (
                                                    <li
                                                        key={entry.id}
                                                        className={`flex h-12 flex-col justify-center overflow-hidden border-l-2 pl-3 ${entry.isCreation ? 'border-border' : 'border-primary/40'}`}
                                                    >
                                                        <p className="truncate text-sm text-foreground">
                                                            {entry.label}
                                                        </p>
                                                        <time className="truncate text-xs text-muted-foreground">
                                                            {new Date(
                                                                entry.createdAt,
                                                            ).toLocaleString()}
                                                        </time>
                                                    </li>
                                                ))}
                                            </ol>
                                        ) : (
                                            <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                                                No history is available.
                                            </p>
                                        )}
                                    </section>

                                </div>
                                <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
                                    <section className="min-w-0">
                                        <div className="mb-2 min-h-10">
                                            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                Submitted files
                                            </h3>
                                            <p aria-hidden="true" className="mt-1 text-xs leading-4 text-transparent">
                                                -
                                            </p>
                                        </div>
                                        {submittedFiles.length > 0 ? (
                                            <ul className="custom-scrollbar max-h-48 space-y-2 overflow-y-auto pr-1">
                                                {submittedFiles.map((file) => (
                                                    <li key={file.id} className="relative">
                                                        <div
                                                            ref={(element) => {
                                                                fileRowRefs.current[file.id] = element;
                                                            }}
                                                            className={`flex min-h-14 min-w-0 items-center gap-2 overflow-hidden rounded-md border px-2 py-1 ${rejectedDocumentIds.includes(file.id) ? 'border-destructive ring-1 ring-destructive' : 'border-border'}`}
                                                        >
                                                            <button
                                                                type="button"
                                                                className="flex min-w-0 flex-1 items-center gap-3 rounded-sm px-1 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                                aria-label={
                                                                    isRejectingReview
                                                                        ? `${rejectedDocumentIds.includes(file.id) ? 'Unflag' : 'Flag'} ${file.name} as incorrect`
                                                                        : file.name
                                                                }
                                                                aria-pressed={
                                                                    isRejectingReview
                                                                        ? rejectedDocumentIds.includes(file.id)
                                                                        : undefined
                                                                }
                                                                disabled={!isRejectingReview || isSubmittingDecision}
                                                                onClick={() => {
                                                                    const isFlagged = rejectedDocumentIds.includes(file.id);

                                                                    setRejectedDocumentIds((current) =>
                                                                        isFlagged
                                                                            ? current.filter((id) => id !== file.id)
                                                                            : [...current, file.id],
                                                                    );

                                                                    if (isFlagged) {
                                                                        setCommentingDocumentIds((current) =>
                                                                            current.filter((id) => id !== file.id),
                                                                        );
                                                                        setRejectedDocumentComments((current) => {
                                                                            const next = { ...current };
                                                                            delete next[file.id];

                                                                            return next;
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                <FileText className="size-4 shrink-0 text-muted-foreground" />
                                                                <span className="flex min-w-0 flex-1 flex-col">
                                                                    <span className="truncate text-sm font-medium">
                                                                        {file.name}
                                                                    </span>
                                                                    <span className="truncate text-xs text-muted-foreground">
                                                                        {file.file_type}
                                                                    </span>
                                                                </span>
                                                            </button>
                                                            {isRejectingReview && rejectedDocumentIds.includes(file.id) ? (
                                                                <DropdownMenu
                                                                    open={commentingDocumentIds.includes(file.id)}
                                                                    onOpenChange={(open) => {
                                                                        if (open) {
                                                                            const row =
                                                                                fileRowRefs.current[file.id];
                                                                            const trigger =
                                                                                commentButtonRefs.current[file.id];

                                                                            if (row && trigger) {
                                                                                setCommentDropdownWidths((current) => ({
                                                                                    ...current,
                                                                                    [file.id]: row.offsetWidth,
                                                                                }));
                                                                                setCommentDropdownOffsets((current) => ({
                                                                                    ...current,
                                                                                    [file.id]:
                                                                                        row.getBoundingClientRect().left -
                                                                                        trigger.getBoundingClientRect().left,
                                                                                }));
                                                                            }
                                                                        }

                                                                        setCommentingDocumentIds((current) =>
                                                                            open
                                                                                ? current.includes(file.id)
                                                                                    ? current
                                                                                    : [...current, file.id]
                                                                                : current.filter((id) => id !== file.id),
                                                                        );
                                                                    }}
                                                                >
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            ref={(element) => {
                                                                                commentButtonRefs.current[file.id] = element;
                                                                            }}
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className={`relative size-8 shrink-0 ${
                                                                                rejectedDocumentComments[file.id]?.trim()
                                                                                    ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                                                                    : 'text-muted-foreground hover:bg-accent'
                                                                            }`}
                                                                            aria-label={`${commentingDocumentIds.includes(file.id) ? 'Hide' : 'Add'} comment for ${file.name}${rejectedDocumentComments[file.id]?.trim() ? ' (comment added)' : ''}`}
                                                                            title={commentingDocumentIds.includes(file.id) ? 'Hide comment' : 'Add comment'}
                                                                            disabled={isSubmittingDecision}
                                                                        >
                                                                            <MessageSquare className="size-4" />
                                                                            {rejectedDocumentComments[file.id]?.trim() ? (
                                                                                <span className="absolute right-1 top-1 block size-2 rounded-full bg-amber-500 ring-2 ring-background" />
                                                                            ) : null}
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent
                                                                        side="top"
                                                                        align="start"
                                                                        alignOffset={commentDropdownOffsets[file.id] ?? 0}
                                                                        sideOffset={8}
                                                                        style={{
                                                                            width:
                                                                                commentDropdownWidths[file.id] ??
                                                                                undefined,
                                                                        }}
                                                                        className="p-3"
                                                                        onKeyDown={(event) => {
                                                                            event.stopPropagation();
                                                                        }}
                                                                    >
                                                                        <textarea
                                                                            value={rejectedDocumentComments[file.id] ?? ''}
                                                                            onChange={(event) => {
                                                                                setRejectedDocumentComments((current) => ({
                                                                                    ...current,
                                                                                    [file.id]: event.target.value,
                                                                                }));
                                                                            }}
                                                                            maxLength={2000}
                                                                            rows={3}
                                                                            placeholder={`Add a comment about ${file.name}`}
                                                                            aria-label={`Comment about ${file.name}`}
                                                                            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                                        />
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            ) : null}
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
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                                                No submitted files.
                                            </p>
                                        )}
                                    </section>

                                {selectedProposal.can_review ? (
                                    <section className="min-w-0">
                                        <div className="mb-2 min-h-10">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                    Assigned files
                                                </h3>
                                                <span className="text-xs tabular-nums text-muted-foreground">
                                                    {completedReviewDocumentCount}/{assignedReviewDocuments.length}
                                                </span>
                                            </div>
                                        </div>
                                        {assignedReviewDocuments.length > 0 ? (
                                            <ul className="custom-scrollbar max-h-48 space-y-2 overflow-y-auto pr-1">
                                                {assignedReviewDocuments.map((reviewDocument) => {
                                                    const uploadedDocument =
                                                        selectedProposal.documents.find(
                                                            (file) =>
                                                                file.pivot.action_id === selectedProposal.current_action?.id
                                                                && file.pivot.required_document_id === reviewDocument.id,
                                                        );
                                                    const isUploading =
                                                        uploadingReviewDocumentId === reviewDocument.id;
                                                    const isDropTarget =
                                                        reviewDocument.label === 'doc';

                                                    return (
                                                        <li
                                                            key={reviewDocument.id}
                                                            onDragOver={isDropTarget ? (event) => {
                                                                event.preventDefault();
                                                                setDraggedReviewDocumentId(reviewDocument.id);
                                                            } : undefined}
                                                            onDragLeave={isDropTarget ? (event) => {
                                                                if (
                                                                    !(event.relatedTarget instanceof Node)
                                                                    || !event.currentTarget.contains(event.relatedTarget)
                                                                ) {
                                                                    setDraggedReviewDocumentId(null);
                                                                }
                                                            } : undefined}
                                                            onDrop={isDropTarget ? (event) => {
                                                                event.preventDefault();
                                                                setDraggedReviewDocumentId(null);
                                                                void handleSelectedReviewDocumentFiles(
                                                                    reviewDocument,
                                                                    event.dataTransfer.files,
                                                                );
                                                            } : undefined}
                                                            className={`relative flex min-h-14 min-w-0 items-center justify-between gap-3 rounded-md border px-3 py-2 ${
                                                                draggedReviewDocumentId === reviewDocument.id
                                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                                    : uploadedDocument
                                                                      ? 'border-primary bg-primary/5'
                                                                      : 'border-border'
                                                            }`}
                                                        >
                                                            {isDropTarget ? (
                                                                <input
                                                                    ref={(element) => {
                                                                        reviewDocumentInputRefs.current[reviewDocument.id] = element;
                                                                    }}
                                                                    type="file"
                                                                    className="sr-only"
                                                                    accept={reviewDocument.file_type.includes('/')
                                                                        ? reviewDocument.file_type
                                                                        : undefined}
                                                                    aria-label={`Choose file for ${reviewDocument.name}`}
                                                                    disabled={isUploading || isSubmittingDecision}
                                                                    onChange={(event) => {
                                                                        const files = event.currentTarget.files;

                                                                        event.currentTarget.value = '';

                                                                        if (files) {
                                                                            void handleSelectedReviewDocumentFiles(
                                                                                reviewDocument,
                                                                                files,
                                                                            );
                                                                        }
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div className="flex min-w-0 items-center gap-3">
                                                                <FileText className="size-4 shrink-0 text-muted-foreground" />
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-medium">
                                                                        {reviewDocument.name}
                                                                    </p>
                                                                    <p className="truncate text-xs text-muted-foreground">
                                                                        {reviewDocument.label === 'form'
                                                                            ? filledReviewFormIds.includes(reviewDocument.id)
                                                                                ? 'Form filled'
                                                                                : 'Form'
                                                                            : uploadedDocument
                                                                              ? 'File uploaded'
                                                                              : 'Document · not uploaded'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex shrink-0 items-center gap-1">
                                                                {uploadedDocument ? (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-8"
                                                                        aria-label={`View assigned file ${reviewDocument.name}`}
                                                                        title="View file"
                                                                        onClick={() => {
                                                                            void handleViewDocument(uploadedDocument);
                                                                        }}
                                                                    >
                                                                        <Eye className="size-4" />
                                                                    </Button>
                                                                ) : null}
                                                                {reviewDocument.label === 'doc' ? (
                                                                    <div className="flex items-center gap-2">
                                                                        {isUploading ? (
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {uploadProgress === null
                                                                                    ? 'Uploading…'
                                                                                    : `Uploading ${uploadProgress}%`}
                                                                            </span>
                                                                        ) : draggedReviewDocumentId === reviewDocument.id ? (
                                                                            <span className="text-xs font-medium text-primary">
                                                                                Drop file to upload
                                                                            </span>
                                                                        ) : null}
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="relative z-10 size-8 shrink-0"
                                                                            aria-label={`${uploadedDocument ? 'Replace' : 'Upload'} assigned file ${reviewDocument.name}`}
                                                                            title={`${uploadedDocument ? 'Replace' : 'Upload'} file`}
                                                                            disabled={isSubmittingDecision || isUploading}
                                                                            onClick={() => {
                                                                                reviewDocumentInputRefs.current[
                                                                                    reviewDocument.id
                                                                                ]?.click();
                                                                            }}
                                                                        >
                                                                            {isUploading ? (
                                                                                <Loader2 className="size-4 animate-spin" />
                                                                            ) : uploadedDocument ? (
                                                                                <Replace className="size-4" />
                                                                            ) : (
                                                                                <Upload className="size-4" />
                                                                            )}
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <Button
                                                                        type="button"
                                                                        variant={filledReviewFormIds.includes(reviewDocument.id) ? 'secondary' : 'outline'}
                                                                        size="sm"
                                                                        disabled={isSubmittingDecision}
                                                                        onClick={() => {
                                                                            setFilledReviewFormIds((current) =>
                                                                                current.includes(reviewDocument.id)
                                                                                    ? current
                                                                                    : [...current, reviewDocument.id],
                                                                            );
                                                                        }}
                                                                    >
                                                                        {filledReviewFormIds.includes(reviewDocument.id)
                                                                            ? 'Filled'
                                                                            : 'Fill'}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                                                No files are assigned to your reviewer group.
                                            </p>
                                        )}
                                    </section>
                                ) : null}
                                </div>
                            </div>

                                {selectedProposal.is_main_reviewer
                                && selectedProposal.current_action?.action_type === 'review' ? (
                                    <section className="mt-auto shrink-0 space-y-4 border-t border-border bg-background pt-4">
                                        {requiresAdditionalReviewers ? (
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                <h3 className="text-sm font-semibold">Additional reviewers</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Assign at least one member of the main reviewer role. You can submit your decision after everyone responds.
                                                </p>
                                            </div>
                                                {hasAssignedReviewers && !hasReviewerResponded ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={isSubmittingDecision}
                                                        onClick={() => setIsReviewerAssignmentDialogOpen(true)}
                                                    >
                                                        Edit reviewers
                                                    </Button>
                                                ) : null}
                                            </div>
                                        ) : null}
                                        {requiresAdditionalReviewers && !hasAssignedReviewers ? (
                                            <div className="space-y-2 rounded-md border border-dashed border-border p-3">
                                                <p className="text-sm text-muted-foreground">
                                                    Assign at least one additional reviewer before submitting a decision.
                                                </p>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    disabled={isSubmittingDecision}
                                                    onClick={() => setIsReviewerAssignmentDialogOpen(true)}
                                                >
                                                    Assign reviewers
                                                </Button>
                                            </div>
                                        ) : null}
                                        {(!requiresAdditionalReviewers || hasAssignedReviewers) ? (
                                            <>
                                        {hasAssignedReviewers ? (
                                            <div className="space-y-2">
                                                <h3 className="text-sm font-semibold">Reviewer recommendations</h3>
                                                <ul className="max-h-36 space-y-2 overflow-y-auto">
                                                    {selectedProposal.review_members?.map((member) => {
                                                        const decisionLabel = reviewDecisions.find(
                                                            (decision) => decision.value === member.decision,
                                                        )?.label;

                                                        return (
                                                            <li key={member.id} className="rounded-md border border-border px-3 py-2 text-sm">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="font-medium">{member.name}</span>
                                                                    <Badge variant={member.responded_at ? 'secondary' : 'outline'}>
                                                                        {member.responded_at ? decisionLabel ?? member.decision : 'Waiting'}
                                                                    </Badge>
                                                                </div>
                                                                {member.comment ? (
                                                                    <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{member.comment}</p>
                                                                ) : null}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        ) : null}
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
                                            <Select
                                                value={reviewDecision}
                                                onValueChange={(decision) => {
                                                    setSelectedReviewDecision(decision);
                                                    const label = reviewDecisions.find(
                                                        (option) => option.value === decision,
                                                    )?.label;

                                                    if (!isRejectionOutcome(decision, label)) {
                                                        setRejectedDocumentIds([]);
                                                        setRejectedDocumentComments({});
                                                        setCommentingDocumentIds([]);
                                                    }
                                                }}
                                                disabled={isSubmittingDecision || reviewDecisions.length === 0}
                                            >
                                                <SelectTrigger className="w-full sm:max-w-xs [&>svg]:rotate-180">
                                                    <SelectValue placeholder="Select a decision" />
                                                </SelectTrigger>
                                                <SelectContent side="top">
                                                    {reviewDecisions.map((decision) => (
                                                        <SelectItem key={decision.value} value={decision.value}>
                                                            {decision.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                type="button"
                                                disabled={
                                                    isSubmittingDecision
                                                    || reviewDecision === ''
                                                    || !assignedReviewDocumentsComplete
                                                    || !selectedProposal.can_submit_decision
                                                }
                                                onClick={() => handleReviewDecision(reviewDecision)}
                                            >
                                                {isSubmittingDecision ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                                                Submit decision
                                            </Button>
                                        </div>
                                        {hasAssignedReviewers && !selectedProposal.can_submit_decision ? (
                                            <p className="text-right text-xs text-muted-foreground">
                                                Waiting for all assigned reviewers to respond.
                                            </p>
                                        ) : null}
                                            </>
                                        ) : null}
                                    </section>
                                ) : null}

                                {selectedProposal.is_additional_reviewer
                                && selectedProposal.current_action?.action_type === 'review' ? (
                                    <section className="mt-auto shrink-0 space-y-3 border-t border-border bg-background pt-4">
                                        {selectedProposal.member_decision ? (
                                            <p className="text-sm text-muted-foreground">
                                                Your recommendation has been submitted. The main reviewer will make the decision.
                                            </p>
                                        ) : (
                                            <>
                                                <div>
                                                    <h3 className="text-sm font-semibold">Your recommendation</h3>
                                                    <p className="text-xs text-muted-foreground">
                                                        Submit your recommendation to the main reviewer. This will not advance the proposal.
                                                    </p>
                                                </div>
                                                <Select
                                                    value={memberRecommendation}
                                                    onValueChange={setSelectedMemberRecommendation}
                                                    disabled={isSubmittingDecision || reviewDecisions.length === 0}
                                                >
                                                    <SelectTrigger className="w-full sm:max-w-xs [&>svg]:rotate-180">
                                                        <SelectValue placeholder="Select a recommendation" />
                                                    </SelectTrigger>
                                                    <SelectContent side="top">
                                                        {reviewDecisions.map((decision) => (
                                                            <SelectItem key={decision.value} value={decision.value}>
                                                                {decision.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <textarea
                                                    value={memberRecommendationComment}
                                                    onChange={(event) => setMemberRecommendationComment(event.target.value)}
                                                    maxLength={2000}
                                                    rows={3}
                                                    aria-label="Recommendation comment"
                                                    placeholder="Optional comment for the main reviewer"
                                                    className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                />
                                                <div className="flex justify-end">
                                                    <Button
                                                        type="button"
                                                        disabled={isSubmittingDecision || !memberRecommendation || !assignedReviewDocumentsComplete}
                                                        onClick={handleMemberRecommendation}
                                                    >
                                                        {isSubmittingDecision ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                                                        Submit recommendation
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </section>
                                ) : null}
                        </>
                    ) : null}
                </SheetContent>
            </Sheet>

            <Dialog
                open={isReviewerAssignmentDialogOpen}
                onOpenChange={setIsReviewerAssignmentDialogOpen}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Assign additional reviewers</DialogTitle>
                        <DialogDescription>
                            Select at least one member of the main reviewer role. You can submit your decision after everyone responds.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedProposal?.review_reviewer_candidates?.length ? (
                        <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                            {selectedProposal.review_reviewer_candidates.map((candidate) => {
                                const reviewerId = `${candidate.user_type}:${candidate.id}`;

                                return (
                                    <label key={reviewerId} className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={selectedReviewerIds.includes(reviewerId)}
                                            disabled={isSubmittingDecision || hasReviewerResponded}
                                            onCheckedChange={(checked) => handleReviewerSelection(reviewerId, checked)}
                                        />
                                        <span className="min-w-0 flex-1 truncate">{candidate.name}</span>
                                        <span className="truncate text-xs text-muted-foreground">{candidate.email}</span>
                                    </label>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No other users are assigned to the main reviewer role. Assign the role to users, then reopen this modal.
                        </p>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isSubmittingDecision}
                            onClick={() => setIsReviewerAssignmentDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={
                                isSubmittingDecision
                                || !hasUnsavedReviewerChanges
                                || selectedReviewerIds.length === 0
                                || hasReviewerResponded
                            }
                            onClick={handleSaveReviewers}
                        >
                            {isSubmittingDecision ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                            Save reviewers
                        </Button>
                    </div>
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
