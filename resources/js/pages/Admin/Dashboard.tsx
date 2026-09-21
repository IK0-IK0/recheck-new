import { Head, router, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowDownAZ, ArrowUp, Building2, CalendarDays, CreditCard, Eye, Plus, Search, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { THEME_COLORS } from '@/constants/workflowConstants';
import { useInitials } from '@/hooks/use-initials';

type AdminUser = {
    id: number;
    name: string;
    email: string;
    role: 'institution';
    avatar?: string | null;
    theme_color?: string | null;
    subscription_status?: 'configured' | 'not_configured';
};

type Props = { users?: AdminUser[] };

const emptyForm = { name: '', email: '', password: '', role: 'institution' as 'admin' | 'institution', theme_color: 'zinc' };

const themeColorClasses: Record<string, string> = {
    zinc: 'bg-zinc-600', slate: 'bg-slate-600', stone: 'bg-stone-600', gray: 'bg-gray-600', neutral: 'bg-neutral-600',
    red: 'bg-red-600', rose: 'bg-rose-600', orange: 'bg-orange-500', amber: 'bg-amber-500', yellow: 'bg-yellow-400',
    lime: 'bg-lime-500', green: 'bg-emerald-600', teal: 'bg-teal-600',
};

export default function AdminDashboard({ users = [] }: Props) {
    const getInitials = useInitials();
    const [query, setQuery] = useState('');
    const [subscriptionFilter, setSubscriptionFilter] = useState('all');
    const [sortColumn, setSortColumn] = useState<'name' | 'email'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
    const form = useForm(emptyForm);

    const visibleUsers = users
        .filter((user) => {
            const normalizedQuery = query.trim().toLowerCase();
            const matchesSearch = normalizedQuery === ''
                || user.name.toLowerCase().includes(normalizedQuery)
                || user.email.toLowerCase().includes(normalizedQuery);
            const matchesSubscription = subscriptionFilter === 'all'
                || (user.subscription_status ?? 'not_configured') === subscriptionFilter;

            return matchesSearch && matchesSubscription;
        })
        .sort((firstUser, secondUser) => {
            const comparison = firstUser[sortColumn].localeCompare(secondUser[sortColumn], undefined, { sensitivity: 'base' });

            return sortDirection === 'asc' ? comparison : -comparison;
        });

    const handleSort = (column: 'name' | 'email') => {
        if (sortColumn === column) {
            setSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc');

            return;
        }

        setSortColumn(column);
        setSortDirection('asc');
    };

    const sortIcon = (column: 'name' | 'email') => {
        if (sortColumn !== column) {
            return <ArrowDownAZ className="size-3.5 opacity-40" aria-hidden="true" />;
        }

        return sortDirection === 'asc'
            ? <ArrowUp className="size-3.5" aria-hidden="true" />
            : <ArrowDown className="size-3.5" aria-hidden="true" />;
    };

    const openCreate = () => {
        form.reset();
        form.clearErrors();
        setIsCreateOpen(true);
    };

    const openSubscription = (user: AdminUser) => {
        setSelectedUser(user);
        setIsSubscriptionOpen(true);
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const options = {
            onSuccess: () => {
                toast.success('Account created.');
                setIsCreateOpen(false);
                form.reset();
            },
            onError: () => toast.error('Unable to save account.'),
        };

        form.post('/admin/users', options);
    };

    const deleteUser = (user: AdminUser) => {
        if (!window.confirm(`Delete ${user.name}'s account?`)) {
            return;
        }

        router.delete(`/admin/users/${user.id}`, {
            onSuccess: () => toast.success('Account deleted.'),
            onError: () => toast.error('Unable to delete account.'),
        });
    };

    return (
        <>
            <Head title="Admin Dashboard" />
            <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="size-4 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">Institutions Management</h1>
                            <p className="text-xs text-muted-foreground">Manage institution accounts</p>
                        </div>
                    </div>
                    <Button size="sm" className="h-8 text-xs" onClick={openCreate}>
                        <Plus className="size-3.5" />
                        Add institution
                    </Button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col p-4">
                        <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative w-full sm:max-w-sm">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search institutions" aria-label="Search institutions" className="h-9 pl-9 pr-9 text-sm" />
                                {query && <button type="button" onClick={() => setQuery('')} className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center text-muted-foreground" aria-label="Clear search"><X className="size-3.5" /></button>}
                            </div>
                            <select
                                value={subscriptionFilter}
                                onChange={(event) => setSubscriptionFilter(event.target.value)}
                                aria-label="Filter by subscription status"
                                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 sm:w-[190px]"
                            >
                                <option value="all">All subscriptions</option>
                                <option value="configured">Configured</option>
                                <option value="not_configured">Not configured</option>
                            </select>
                        </div>
                        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-background shadow-sm">
                            <table className="min-w-full divide-y divide-border/80 text-center">
                                <thead className="border-b border-border bg-surface">
                                    <tr>
                                        <th className="w-16 px-4 py-3 text-xs font-semibold" aria-label="Profile picture" />
                                        <th className="border-l border-border/80 px-4 py-3 text-left text-xs font-semibold"><button type="button" onClick={() => handleSort('name')} className="inline-flex items-center gap-1.5 hover:text-primary" aria-label="Sort by name">Name {sortIcon('name')}</button></th>
                                        <th className="border-l border-border/80 px-4 py-3 text-xs font-semibold"><button type="button" onClick={() => handleSort('email')} className="inline-flex items-center gap-1.5 hover:text-primary" aria-label="Sort by email">Email {sortIcon('email')}</button></th>
                                        <th className="border-l border-border/80 px-4 py-3 text-xs font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/80">
                                    {visibleUsers.length > 0 ? visibleUsers.map((user) => (
                                        <tr key={user.id} className="border-b border-border/80 transition-colors hover:bg-muted/30">
                                            <td className="w-16 px-4 py-3">
                                                <Avatar className="mx-auto size-8">
                                                    <AvatarImage src={user.avatar ?? undefined} alt={`${user.name} profile`} />
                                                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{getInitials(user.name)}</AvatarFallback>
                                                </Avatar>
                                            </td>
                                            <td className="border-l border-border/80 px-4 py-3 text-left text-sm">{user.name}</td>
                                            <td className="border-l border-border/80 px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                                            <td className="border-l border-border/80 px-4 py-3">
                                                <div className="flex justify-center gap-2">
                                                    <Button variant="secondary" size="icon" className="size-7" onClick={() => openSubscription(user)} aria-label={`View ${user.name} subscription`} title={`View ${user.name} subscription`}><Eye className="size-3.5" /></Button>
                                                    <Button variant="destructive" size="icon" className="size-7" onClick={() => deleteUser(user)} aria-label={`Delete ${user.name}`} title={`Delete ${user.name}`}><Trash2 className="size-3.5" /></Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">No institutions found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div className="border-t border-border bg-surface px-4 py-3"><p className="mx-auto max-w-6xl text-xs text-muted-foreground">Showing {visibleUsers.length} of {users.length} institution{users.length === 1 ? '' : 's'}</p></div>
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Add institution</DialogTitle><DialogDescription>Manage the institution login separately from tenant roles.</DialogDescription></DialogHeader>
                    <form onSubmit={submit} className="space-y-4">
                        <div className="space-y-2"><Label htmlFor="admin-name">Name</Label><Input id="admin-name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="admin-email">Email</Label><Input id="admin-email" type="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} required /></div>
                        <div className="space-y-2"><Label htmlFor="admin-password">Password</Label><Input id="admin-password" type="password" value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} minLength={8} required /></div>
                        <div className="space-y-2">
                            <Label>Theme color</Label>
                            <div className="grid grid-cols-7 gap-1.5">
                                {THEME_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        aria-label={`Select ${color} theme`}
                                        onClick={() => form.setData('theme_color', color)}
                                        className={`h-7 rounded-md border-2 transition ${themeColorClasses[color]} ${form.data.theme_color === color ? 'border-foreground ring-2 ring-primary/30' : 'border-transparent'}`}
                                    />
                                ))}
                            </div>
                        </div>
                        <DialogFooter><Button type="submit" disabled={form.processing}>{form.processing ? 'Saving...' : 'Create account'}</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isSubscriptionOpen} onOpenChange={setIsSubscriptionOpen}>
                <DialogContent>
                    <DialogHeader className="border-b border-border pb-4">
                        <DialogTitle className="flex items-center gap-2"><CreditCard className="size-4 text-muted-foreground" />Subscription tracking</DialogTitle>
                        <DialogDescription>{selectedUser?.name} subscription details.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 overflow-hidden rounded-lg bg-muted/20">
                        <div className="min-w-0 rounded-l-lg border border-red-300 px-4 py-4 dark:border-red-800"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Subscription</p><p className="mt-1 text-sm font-semibold">Not configured</p><p className="mt-1 text-xs text-muted-foreground">No plan or billing connection has been set up yet.</p></div>
                        <div className="min-w-0 rounded-r-lg border border-amber-300 px-4 py-4 dark:border-amber-800"><p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Next billing date</p><p className="mt-1 text-sm font-semibold">Unavailable</p><p className="mt-1 text-xs text-muted-foreground">A date will appear once a subscription is configured.</p></div>
                    </div>
                    <DialogFooter><Button type="button" variant="outline" onClick={() => setIsSubscriptionOpen(false)}>Close</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}