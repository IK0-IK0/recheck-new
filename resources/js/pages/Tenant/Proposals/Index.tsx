import { Head, Link, useForm } from '@inertiajs/react';
import { ClipboardList, Plus, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Process = {
    id: number;
    name: string;
};

type Phase = {
    id: number;
    name: string;
};

type Proposal = {
    id: number;
    title: string;
    process: Process | null;
    current_phase: Phase | null;
    created_at: string;
};

type Props = {
    proposals: Proposal[];
};

export default function Index({ proposals }: Props) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        post('/tenant/proposals', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                reset();
            },
        });
    };

    return (
        <div className="flex h-full flex-col bg-background">
            <Head title="Proposals" />

            <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
                <div>
                    <h1 className="text-xl font-bold">Proposals</h1>
                    <p className="text-sm text-muted-foreground">Manage and track your research proposals.</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                    <Plus className="size-4" />
                    New Proposal
                </Button>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <div className="mx-auto max-w-5xl space-y-6">
                    <div className="rounded-lg border border-border bg-card shadow-sm">
                        <div className="p-0">
                            {proposals.length > 0 ? (
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Workflow Process</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Phase</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-card">
                                        {proposals.map((proposal) => (
                                            <tr key={proposal.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <ClipboardList className="size-5 text-primary" />
                                                        <span className="font-medium">{proposal.title}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground">
                                                    {proposal.process ? proposal.process.name : 'Unassigned'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {proposal.current_phase ? (
                                                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-400/30">
                                                            {proposal.current_phase.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">Not started</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={`/tenant/proposals/${proposal.id}`}>
                                                            View
                                                            <ChevronRight className="ml-1 size-4" />
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                                        <ClipboardList className="size-6 text-primary" />
                                    </div>
                                    <h3 className="mb-1 text-lg font-semibold">No proposals found</h3>
                                    <p className="mb-4 text-sm text-muted-foreground max-w-sm">
                                        You don't have any proposals yet. Get started by creating your first proposal.
                                    </p>
                                    <Button onClick={() => setIsCreateModalOpen(true)}>Create Proposal</Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent>
                    <form onSubmit={handleCreate}>
                        <DialogHeader>
                            <DialogTitle>Create New Proposal</DialogTitle>
                            <DialogDescription>
                                Enter the title of your research proposal to get started.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="py-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">Proposal Title</Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    placeholder="e.g., Study on Artificial Intelligence in Healthcare"
                                    autoFocus
                                />
                                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing && <Loader2 className="mr-2 size-4 animate-spin" />}
                                Create Proposal
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
