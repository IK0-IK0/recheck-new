import { Link } from '@inertiajs/react';
import { Check, Eye, FileStack, FileText, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import ProposalTestingToggle from '@/components/ProposalTestingToggle';
import PhasePipeline from '@/components/PhasePipeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type Phase = {
    id: number;
    name: string;
    order: number;
};

type Process = {
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
    created_at: string;
    isSample?: boolean;
};

const hasAssignedCurrentPhase = (proposal: Proposal): boolean => Boolean(
    proposal.current_phase
    && proposal.process?.phases?.some((phase) => phase.id === proposal.current_phase?.id),
);

type Props = {
    proposals: Proposal[];
    viewerId: number;
    viewerType: string;
};

type SampleDetailsState = 'waiting' | 'submitted';

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
    title: 'Community Health Research Proposal',
    process: {
        name: 'Research Proposal Workflow',
        phases: [{ id: 1, name: 'Initial Review', order: 1 }],
    },
    current_phase: { id: 1, name: 'Initial Review', order: 1 },
    created_at: '2026-10-15T08:00:00.000Z',
    isSample: true,
};

export default function Tracking({ proposals, viewerId, viewerType }: Props) {
    const [isSampleDetailsOpen, setIsSampleDetailsOpen] = useState(false);
    const [sampleDetailsState, setSampleDetailsState] = useState<SampleDetailsState>('waiting');
    const [sampleFileSearch, setSampleFileSearch] = useState('');
    const [requestedPhaseOrder, setRequestedPhaseOrder] = useState<number | null>(null);
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
                hasAssignedCurrentPhase(proposal) && proposal.current_phase?.order === order
            )).length;

            return {
                id: order,
                name: phaseNames.size === 1 ? Array.from(phaseNames)[0] : `Phase ${order}`,
                isClickable: true,
                detail: `${proposalCount} ${proposalCount === 1 ? 'proposal' : 'proposals'}`,
            };
        });
    }, [proposals]);
    const selectedPhaseOrder = phases.some((phase) => phase.id === requestedPhaseOrder)
        ? requestedPhaseOrder
        : proposals.find(hasAssignedCurrentPhase)?.current_phase?.order ?? phases[0]?.id ?? null;
    const [search, setSearch] = useState('');
    const phaseProposals = useMemo(() => {
        if (selectedPhaseOrder === null) {
            return [];
        }

        return proposals.filter((proposal) => (
            hasAssignedCurrentPhase(proposal) && proposal.current_phase?.order === selectedPhaseOrder
        ));
    }, [proposals, selectedPhaseOrder]);
    const selectedPhaseName = phases.find((phase) => phase.id === selectedPhaseOrder)?.name ?? 'No workflow phases';
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
            return [...phaseProposals, sampleForSelectedPhase];
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

        return sampleMatchesSearch ? [...matchingProposals, sampleForSelectedPhase] : matchingProposals;
    }, [phaseProposals, sampleForSelectedPhase, search]);

    return (
        <div className="flex flex-col gap-4 p-4 md:min-h-0 md:flex-1 md:p-6">
            <header className="-mx-6 -mt-6 mb-0 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-6 py-3">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileStack className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">Tracking</h1>
                        <p className="text-xs text-muted-foreground">Review proposals by workflow phase.</p>
                    </div>
                </div>
                <ProposalTestingToggle />
            </header>

            <div className="shrink-0 overflow-hidden rounded-lg border border-border bg-card">
                <PhasePipeline
                    phases={phases}
                    activePhaseId={selectedPhaseOrder ?? undefined}
                    onPhaseSelect={setRequestedPhaseOrder}
                    showPhaseDetails
                    centerActivePhase
                />
            </div>

            <section className="flex flex-col rounded-lg border border-border bg-card md:min-h-0 md:flex-1 md:overflow-hidden">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border p-4">
                    <div>
                        <h2 className="text-sm font-semibold">{selectedPhaseName}</h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {phaseProposals.length} {phaseProposals.length === 1 ? 'proposal' : 'proposals'} in this phase
                            {' · Sample preview included (not saved)'}
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
                                        ) : (proposal.user_id === viewerId && proposal.user_type === viewerType) || proposal.can_review ? (
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`/tenant/proposals/${proposal.id}`}>Details</Link>
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Owner or assigned reviewer only</span>
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
