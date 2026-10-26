import { Head, router, useForm } from '@inertiajs/react';
import { CalendarDays, ChevronDown, Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Role = {
    id: number;
    name: string;
};

type TenantUser = {
    id: number;
    name: string;
    email: string;
    role: Role | null;
    created_at: string | null;
    email_verified_at: string | null;
};

type Props = {
    users: TenantUser[];
    roleOptions: Role[];
    defaultRoleId: number | null;
};

type UserForm = {
    name: string;
    email: string;
    password: string;
    role_id: number | null;
};

export default function UsersPage({ users, roleOptions, defaultRoleId }: Props) {
    const [query, setQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const form = useForm<UserForm>({
        name: '',
        email: '',
        password: '',
        role_id: defaultRoleId,
    });
    const visibleUsers = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        return users.filter((user) => {
            const matchesQuery = normalizedQuery === ''
                || user.name.toLowerCase().includes(normalizedQuery)
                || user.email.toLowerCase().includes(normalizedQuery)
                || user.role?.name.toLowerCase().includes(normalizedQuery);
            const matchesRole = roleFilter === 'all' || String(user.role?.id) === roleFilter;

            return matchesQuery && matchesRole;
        });
    }, [query, roleFilter, users]);

    const openCreateDialog = () => {
        setDialogMode('create');
        setSelectedUser(null);
        form.reset();
        form.clearErrors();
        setIsDialogOpen(true);
    };

    const openEditDialog = (user: TenantUser) => {
        setDialogMode('edit');
        setSelectedUser(user);
        form.setData({
            name: user.name,
            email: user.email,
            password: '',
            role_id: user.role?.id ?? defaultRoleId,
        });
        form.clearErrors();
        setIsDialogOpen(true);
    };

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const onSuccess = () => {
            setIsDialogOpen(false);
            form.reset();
            setSelectedUser(null);
            toast.success(selectedUser ? 'User updated.' : 'User created.');
        };

        const onError = () => toast.error('Unable to save user. Check the highlighted fields and try again.');

        if (selectedUser) {
            form.put(`/tenant/users/${selectedUser.id}`, { onSuccess, onError });
        } else {
            form.post('/tenant/users', { onSuccess, onError });
        }
    };

    const deleteUser = (user: TenantUser) => {
        if (!window.confirm(`Delete ${user.name}'s account?`)) {
            return;
        }

        router.delete(`/tenant/users/${user.id}`, {
            onSuccess: () => toast.success('User deleted.'),
            onError: () => toast.error('Unable to delete user.'),
        });
    };

    return (
        <>
            <Head title="Users" />
            <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                            <Users className="size-4 text-primary" aria-hidden="true" />
                        </div>
                        <div>
                            <h1 className="text-xl font-semibold">User Management</h1>
                            <p className="text-sm text-muted-foreground">Manage users and their role in this tenant.</p>
                        </div>
                    </div>
                    <Button size="sm" onClick={openCreateDialog}>
                        <Plus className="size-4" aria-hidden="true" />
                        Add user
                    </Button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-4">
                    <div className="mb-4 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative w-full min-w-0 flex-1">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                            <Input
                                aria-label="Search users"
                                className="pl-9 pr-9"
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search users or role"
                                value={query}
                            />
                            {query && (
                                <button
                                    aria-label="Clear search"
                                    className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center text-muted-foreground"
                                    onClick={() => setQuery('')}
                                    type="button"
                                >
                                    <X className="size-3.5" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                        <Select onValueChange={setRoleFilter} value={roleFilter}>
                            <SelectTrigger aria-label="Filter users by role" className="w-full sm:w-48">
                                <SelectValue placeholder="Filter by role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All roles</SelectItem>
                                {roleOptions.map((role) => (
                                    <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
                        <div className="min-h-0 flex-1 overflow-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 bg-muted/40 text-xs text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Name</th>
                                        <th className="px-4 py-3 font-medium">Email</th>
                                        <th className="px-4 py-3 font-medium">Role</th>
                                        <th className="w-36 px-4 py-3 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleUsers.map((user) => (
                                            <tr className="border-t border-border/80" key={user.id}>
                                                <td className="px-4 py-3 font-medium">{user.name}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                                                <td className="px-4 py-3">
                                                    {user.role ? (
                                                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
                                                            {user.role.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">No role</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            aria-label={`Edit ${user.name}`}
                                                            onClick={() => openEditDialog(user)}
                                                            size="icon"
                                                            variant="ghost"
                                                        >
                                                            <Pencil className="size-4" aria-hidden="true" />
                                                        </Button>
                                                        <Button
                                                            aria-label={`Delete ${user.name}`}
                                                            onClick={() => deleteUser(user)}
                                                            size="icon"
                                                            variant="ghost"
                                                        >
                                                            <Trash2 className="size-4" aria-hidden="true" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                    ))}
                                    {visibleUsers.length === 0 && (
                                        <tr>
                                            <td className="px-4 py-10 text-center text-muted-foreground" colSpan={4}>
                                                {users.length === 0 ? 'No tenant users yet.' : 'No users match your search.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                    form.clearErrors();
                }
            }} open={isDialogOpen}>
                <DialogContent>
                    <form onSubmit={submit}>
                        <DialogHeader>
                            <DialogTitle>
                                {selectedUser ? 'Edit user' : 'Add user'}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedUser ? 'View and update this tenant user and their role.' : 'Create a user account in this tenant.'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-5">
                            {selectedUser && (
                                <dl className="grid gap-3 rounded-md border border-border bg-muted/30 p-3 text-sm sm:grid-cols-2">
                                    <div>
                                        <dt className="text-muted-foreground">Account created</dt>
                                        <dd className="mt-1 flex items-center gap-2 font-medium">
                                            <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
                                            {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'Unknown'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Email verification</dt>
                                        <dd className="mt-1 font-medium">
                                            {selectedUser.email_verified_at
                                                ? `Verified ${new Date(selectedUser.email_verified_at).toLocaleDateString()}`
                                                : 'Not verified'}
                                        </dd>
                                    </div>
                                </dl>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="user-name">Name</Label>
                                <Input id="user-name" autoComplete="name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} />
                                {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="user-email">Email</Label>
                                <Input id="user-email" type="email" autoComplete="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} />
                                {form.errors.email && <p className="text-sm text-destructive">{form.errors.email}</p>}
                            </div>
                            {dialogMode === 'create' && (
                                <div className="space-y-2">
                                    <Label htmlFor="user-password">Password</Label>
                                    <Input id="user-password" type="password" autoComplete="new-password" value={form.data.password} onChange={(event) => form.setData('password', event.target.value)} />
                                    <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
                                    {form.errors.password && <p className="text-sm text-destructive">{form.errors.password}</p>}
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="user-role">Role</Label>
                                <div className="relative">
                                    <select
                                        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full appearance-none rounded-md border py-2 pr-10 pl-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                                        id="user-role"
                                        onChange={(event) => form.setData('role_id', event.target.value === '' ? null : Number(event.target.value))}
                                        value={form.data.role_id ?? ''}
                                    >
                                        <option disabled value="">Select a role</option>
                                        {roleOptions.map((role) => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown
                                        aria-hidden="true"
                                        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                                    />
                                </div>
                                {roleOptions.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No role options have been configured for this tenant.</p>
                                )}
                                {form.errors.role_id && <p className="text-sm text-destructive">{form.errors.role_id}</p>}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button disabled={form.processing} type="submit">
                                {form.processing ? 'Saving...' : selectedUser ? 'Save changes' : 'Create user'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
