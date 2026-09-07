import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Edit3, Trash2, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import UserModal from '@/components/UserModal';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function Users({ users = [], roles = [] }) {
    const [editingUser, setEditingUser] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const form = useForm({ name: '', email: '', password: '', roles: [] });

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
                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-6xl p-4">
                        <div className="rounded-lg border border-border bg-background shadow-sm">
                            <table className="min-w-full divide-y divide-border text-left">
                                <thead className="bg-surface">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-semibold text-foreground">Name</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-foreground">Email</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-foreground">Roles</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-background">
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
                                    ) : users.length > 0 ? (
                                        users.map((user) => (
                                            <tr key={user.id}>
                                                <td className="px-4 py-3 text-sm text-foreground">{user.name}</td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground">
                                                    {user.roles?.length > 0
                                                        ? user.roles.map((role) => role.name).join(', ')
                                                        : 'No roles assigned'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-foreground">
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            type="button"
                                                            onClick={() => handleEdit(user)}
                                                            aria-label={`Edit user ${user.name}`}
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
                                                No users found.
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
                        <p className="text-xs text-muted-foreground">{users.length} user{users.length !== 1 ? 's' : ''}</p>
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
                    roles={roles}
                    onSubmit={handleSubmit}
                    allowNameEdit={false}
                    allowEmailEdit={false}
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
