import { router } from '@inertiajs/react';
import { FileText, Download, Trash2, CheckCircle2, Circle, Eye, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import DocumentUploadModal from '@/components/DocumentUploadModal';
import { Button } from '@/components/ui/button';

type Phase = {
    id: number;
    name: string;
    order: number;
};

type DocumentRecord = {
    id: number;
    name: string;
    file_type: string;
    created_at: string;
};

type Proposal = {
    id: number;
    title: string;
    process_id: number | null;
    current_phase_id: number | null;
    current_action: {
        id: number;
        name: string;
        description: string | null;
        decision_mode: 'approve_deny' | 'custom';
        custom_decision_branches: { id: string; label: string }[] | null;
    } | null;
    documents: DocumentRecord[];
};

type Props = {
    proposal: Proposal;
    phases: Phase[];
    canReview: boolean;
};

export default function Show({ proposal, phases, canReview }: Props) {
    const uploadProgress = null;
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    const handleUpload = async ({ name, label, files }: { name: string; label: string; files: File[] }) => {
        const formData = new FormData();

        if (files.length > 0) {
            formData.append('file', files[0]);
        }

        formData.append('name', name);
        formData.append('label', label);

        return new Promise<boolean>((resolve) => router.post(`/tenant/proposals/${proposal.id}/documents`, formData, {
            onSuccess: () => {
                toast.success('Document uploaded.');
                resolve(true);
            },
            onError: (errors) => {
                toast.error(errors.file || errors.name || errors.storage || 'Upload failed.');
                resolve(false);
            }
        }));
    };

    const handleDeleteDocument = (documentId: number) => {
        if (!confirm('Are you sure you want to delete this document?')) {
return;
}

        router.delete(`/tenant/proposals/${proposal.id}/documents/${documentId}`, {
            onSuccess: () => toast.success('Document deleted.')
        });
    };

    const handleReviewDecision = (decision: string) => {
        router.post(`/tenant/proposals/${proposal.id}/review`, { decision }, {
            onStart: () => setIsSubmittingReview(true),
            onFinish: () => setIsSubmittingReview(false),
            onSuccess: () => toast.success('Review decision submitted.'),
            onError: (errors) => toast.error(errors.workflow || 'Review decision failed.')
        });
    };

    return (
        <div className="flex h-full flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
                <div>
                    <h1 className="text-xl font-bold">{proposal.title}</h1>
                    <p className="text-sm text-muted-foreground">Review the current workflow action</p>
                </div>
                {canReview && proposal.current_action ? (
                    proposal.current_action.decision_mode === 'custom'
                        ? proposal.current_action.custom_decision_branches?.map((branch) => (
                            <Button
                                key={branch.id}
                                onClick={() => handleReviewDecision(branch.id)}
                                disabled={isSubmittingReview}
                            >
                                {isSubmittingReview ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                                {branch.label}
                            </Button>
                        ))
                        : <>
                            <Button onClick={() => handleReviewDecision('approve')} disabled={isSubmittingReview}>
                                {isSubmittingReview ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                                Approve
                            </Button>
                            <Button variant="outline" onClick={() => handleReviewDecision('deny')} disabled={isSubmittingReview}>
                                Deny
                            </Button>
                        </>
                ) : null}
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-4xl space-y-8">
                    
                    {/* Status Tracker */}
                    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold">Proposal Status</h2>
                        <div className="flex items-center gap-4 overflow-x-auto pb-2">
                            {phases.map((phase, index) => {
                                const isCurrent = phase.id === proposal.current_phase_id;
                                const isPast = proposal.current_phase_id && phases.findIndex(p => p.id === proposal.current_phase_id) > index;
                                
                                return (
                                    <div key={phase.id} className="flex items-center gap-4">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className={`flex size-8 items-center justify-center rounded-full ${isCurrent ? 'bg-primary text-primary-foreground' : isPast ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                                {isPast ? <CheckCircle2 className="size-5" /> : isCurrent ? <Circle className="size-4 fill-current" /> : <span className="text-xs font-medium">{index + 1}</span>}
                                            </div>
                                            <span className={`text-sm ${isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{phase.name}</span>
                                        </div>
                                        {index < phases.length - 1 && (
                                            <div className={`h-[2px] w-12 ${isPast ? 'bg-emerald-500' : 'bg-border'}`} />
                                        )}
                                    </div>
                                );
                            })}
                            {phases.length === 0 && (
                                <p className="text-sm text-muted-foreground">No workflow process assigned.</p>
                            )}
                        </div>
                    </div>

                    {proposal.current_action ? (
                        <div className="rounded-lg border border-border bg-card p-5">
                            <h2 className="font-semibold">Review action · {proposal.current_action.name}</h2>
                            {proposal.current_action.description ? (
                                <p className="mt-2 text-sm text-muted-foreground">{proposal.current_action.description}</p>
                            ) : null}
                        </div>
                    ) : null}

                    {/* Document Manager */}
                    <div className="rounded-lg border border-border bg-card shadow-sm">
                        <div className="flex items-center justify-between border-b border-border p-4">
                            <div>
                                <h2 className="text-lg font-semibold">Documents</h2>
                                <p className="text-sm text-muted-foreground">Files submitted for this proposal.</p>
                            </div>
                            {!canReview ? <DocumentUploadModal
                                title="Upload File"
                                submitLabel="Upload"
                                onSubmit={handleUpload}
                                uploadProgress={uploadProgress}
                                trigger={<Button size="sm">Add File</Button>}
                            /> : null}
                        </div>
                        <div className="p-0">
                            {proposal.documents.length > 0 ? (
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">File Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-card">
                                        {proposal.documents.map((doc) => (
                                            <tr key={doc.id}>
                                                <td className="px-4 py-3 text-sm font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="size-4 text-blue-500" />
                                                        {doc.name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground">{doc.file_type}</td>
                                                <td className="px-6 py-4 text-right text-sm">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="secondary" size="sm" asChild>
                                                            <a href={`/tenant/documents/${doc.id}/view`} target="_blank" rel="noreferrer">
                                                                <Eye className="mr-2 size-4" />
                                                                View
                                                            </a>
                                                        </Button>
                                                        <Button variant="outline" size="sm" asChild>
                                                            <a href={`/tenant/documents/${doc.id}/download`}>
                                                                <Download className="mr-2 size-4" />
                                                                Download
                                                            </a>
                                                        </Button>
                                                        {!canReview ? (
                                                            <Button variant="destructive" size="icon" onClick={() => handleDeleteDocument(doc.id)}>
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
                                    <FileText className="mb-2 size-8 opacity-20" />
                                    No documents uploaded yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
