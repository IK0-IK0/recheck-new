import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowDownAZ, ArrowUp, Edit3, Search, Trash2, Users as UsersIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import UserModal from '@/components/UserModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const defaultUserFormData = { name: '', email: '', password: '', roles: [] };

export default function Users({ users = [], roles = [] }) {
    const userList = Array.isArray(users) ? users : Array.isArray(users?.data) ? users.data : [];
    const roleList = Array.isArray(roles)
        ? roles
        : Array.isArray(roles?.data)
            ? roles.data
            : Object.values(roles ?? {}).filter((role) => role && typeof role === 'object' && 'id' in role && 'name' in role);
    const [editingUser, setEditingUser] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');
    const form = useForm(defaultUserFormData);

    // Show loading state while data is being fetched
    const isLoading = users === undefined || roles === undefined;

    const handleSubmit = async (values) => {
        if (!editingUser) {
            toast.error('User creation is disabled.');
            return;
        }

        form.clearErrors();
        form.setData({
            name: values.name,
            email: values.email,
            roles: values.roles ?? [],
        });

        await form.put(`/tenant/users/${editingUser.id}`, {
            onSuccess: () => {
                toast.success('User updated.');
                setEditingUser(null);
                setIsUserModalOpen(false);
            },
            onError: () => {
                toast.error('Unable to update user.');
            },
        });
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setIsUserModalOpen(true);
    };

    const handleDelete = async () => {
        if (!userToDelete) {
            return;
        }

        await router.delete(`/tenant/users/${userToDelete.id}`, {
            onSuccess: () => {
                toast.success('User deleted.');
                setUserToDelete(null);
            },
            onError: () => {
                toast.error('Unable to delete user.');
                setUserToDelete(null);
            },
        });
    };

    const visibleUsers = userList
        .filter((user) => {
            const normalizedQuery = searchQuery.trim().toLowerCase();
            const roleNames = user.roles?.map((role) => role.name).join(', ') ?? '';
            const matchesSearch = normalizedQuery === ''
                || user.name.toLowerCase().includes(normalizedQuery)
                || user.email.toLowerCase().includes(normalizedQuery)
                || roleNames.toLowerCase().includes(normalizedQuery);
            const matchesRole = roleFilter === 'all' || user.roles?.some((role) => String(role.id) === roleFilter);

            return matchesSearch && matchesRole;
        })
        .sort((firstUser, secondUser) => {
            const firstValue = sortColumn === 'name'
                ? firstUser.name
                : sortColumn === 'email'
                    ? firstUser.email
                    : firstUser.roles?.map((role) => role.name).join(', ') ?? '';
            const secondValue = sortColumn === 'name'
                ? secondUser.name
                : sortColumn === 'email'
                    ? secondUser.email
                    : secondUser.roles?.map((role) => role.name).join(', ') ?? '';
            const comparison = firstValue.localeCompare(secondValue, undefined, { sensitivity: 'base' });

            return sortDirection === 'asc' ? comparison : -comparison;
        });

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc');
            return;
        }

        setSortColumn(column);
        setSortDirection('asc');
    };

    const sortIcon = (column) => {
        if (sortColumn !== column) {
            return <ArrowDownAZ className="size-3.5 opacity-40" aria-hidden="true" />;
        }

        return sortDirection === 'asc'
            ? <ArrowUp className="size-3.5" aria-hidden="true" />
            : <ArrowDown className="size-3.5" aria-hidden="true" />;
    };

    return (
        <>
            <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                            <UsersIcon className="size-4 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">User Management</h1>
                            <p className="text-xs text-muted-foreground">Manage tenant users and assign roles</p>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col p-4">
                        <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative w-full sm:max-w-sm">
                                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                <Input
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Search users"
                                    aria-label="Search users"
                                    className="h-9 pl-9 pr-9 text-sm"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                                        aria-label="Clear search"
                                        title="Clear search"
                                    >
                                        <X className="size-3.5" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                            <Select
                                value={roleFilter}
                                onValueChange={setRoleFilter}
                            >
                                <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filter by role">
                                    <SelectValue placeholder="All roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All roles</SelectItem>
                                    {roleList.map((role) => <SelectItem key={role.id} value={String(role.id)}>{role.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-background/60 shadow-sm">
                            <table className="min-w-full divide-y divide-border/80 text-center">
                                <thead className="border-b border-border bg-surface">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-foreground">
                                            <button type="button" onClick={() => handleSort('name')} className="inline-flex items-center justify-center gap-1.5 hover:text-primary" aria-label="Sort by name">
                                                Name {sortIcon('name')}
                                            </button>
                                        </th>
                                        <th className="border-l border-border/80 px-4 py-3 text-center text-xs font-semibold text-foreground">
                                            <button type="button" onClick={() => handleSort('email')} className="inline-flex items-center justify-center gap-1.5 hover:text-primary" aria-label="Sort by email">
                                                Email {sortIcon('email')}
                                            </button>
                                        </th>
                                        <th className="border-l border-border/80 px-4 py-3 text-center text-xs font-semibold text-foreground">
                                            <button type="button" onClick={() => handleSort('roles')} className="inline-flex items-center justify-center gap-1.5 hover:text-primary" aria-label="Sort by roles">
                                                Roles {sortIcon('roles')}
                                            </button>
                                        </th>
                                        <th className="border-l border-border/80 px-4 py-3 text-center text-xs font-semibold text-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/80 bg-transparent">
                                    {isLoading ? (
                                        // Loading skeleton
                                        <>
                                            {[...Array(3)].map((_, i) => (
                                                <tr key={i}>
                                                    <td className="px-4 py-3">
                                                        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-2">
                                                            <div className="size-7 animate-pulse rounded bg-muted" />
                                                            <div className="size-7 animate-pulse rounded bg-muted" />
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </>
                                    ) : visibleUsers.length > 0 ? (
                                        visibleUsers.map((user) => (
                                            <tr key={user.id} className="border-b border-border/80 transition-colors hover:bg-muted/30">
                                                <td className="px-4 py-3 text-left text-sm text-foreground">{user.name}</td>
                                                <td className="border-l border-border/80 px-4 py-3 text-center text-sm text-muted-foreground">{user.email}</td>
                                                <td className="border-l border-border/80 px-4 py-3 text-center text-sm text-muted-foreground">
                                                    {user.roles?.length > 0
                                                        ? user.roles.map((role) => role.name).join(', ')
                                                        : 'No roles assigned'}
                                                </td>
                                                <td className="border-l border-border/80 px-4 py-3 text-center text-sm text-foreground">
                                                    <div className="flex flex-wrap justify-center gap-2">
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            type="button"
                                                            onClick={() => handleEdit(user)}
                                                            aria-label={`Edit user ${user.name}`}
                                                            title={`Edit user ${user.name}`}
                                                            className="h-7 text-xs"
                                                        >
                                                            <Edit3 className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            type="button"
                                                            onClick={() => setUserToDelete(user)}
                                                            aria-label={`Delete user ${user.name}`}
                                                            title={`Delete user ${user.name}`}
                                                            className="h-7 text-xs"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-12 text-center text-sm text-muted-foreground">
                                                {userList.length > 0 ? 'No users match your search.' : 'No users found.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-border bg-surface px-4 py-3">
                    <div className="mx-auto flex max-w-6xl items-center justify-between">
                        <p className="text-xs text-muted-foreground">Showing {visibleUsers.length} of {userList.length} user{userList.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>

            {editingUser ? (
                <UserModal
                    title="Edit user"
                    submitLabel="Save changes"
                    open={isUserModalOpen}
                    onOpenChange={(nextOpen) => {
                        setIsUserModalOpen(nextOpen);
                        if (!nextOpen) {
                            setEditingUser(null);
                        }
                    }}
                    initialValues={{
                        name: editingUser.name,
                        email: editingUser.email,
                        password: '',
                        roles: editingUser.roles?.map((role) => role.id) ?? [],
                    }}
                    roles={roleList}
                    onSubmit={handleSubmit}
                    allowNameEdit={false}
                    allowEmailEdit
                    allowPasswordEdit={false}
                />
            ) : null}

            <Dialog open={Boolean(userToDelete)} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete user</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the user "{userToDelete?.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary" type="button">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button variant="destructive" type="button" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
