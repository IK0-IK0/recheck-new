import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Edit3, Plus, Shield, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import RoleModal from '@/components/RoleModal';
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

const defaultRoleFormData = { name: '', permissions: [] };
const proposalVisibilityLabels = {
    'proposal.view.all': 'Full',
    'proposal.view.own_or_assigned': 'Scoped',
};

export default function Roles({ roles = [], permissions = [], defaultRoleId = null }) {
    const [editingRole, setEditingRole] = useState(null);
    const [roleToDelete, setRoleToDelete] = useState(null);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const form = useForm(defaultRoleFormData);

    const handleSubmit = (values) => new Promise((resolve) => {
        form.clearErrors();
        const callbacks = {
            onSuccess: () => {
                toast.success(editingRole ? 'Role updated.' : 'Role created.');

                if (editingRole) {
                    setEditingRole(null);
                    setIsRoleModalOpen(false);
                }

                resolve(true);
            },
            onError: () => {
                toast.error(editingRole ? 'Unable to update role.' : 'Unable to create role.');
                resolve(false);
            },
            onCancel: () => resolve(false),
            onFinish: () => resolve(false),
        };

        form.transform(() => values);

        if (editingRole) {
            form.put(`/tenant/roles/${editingRole.id}`, callbacks);
            return;
        }

        form.post('/tenant/roles', callbacks);
    });

    const handleEdit = (role) => {
        setEditingRole(role);
        setIsRoleModalOpen(true);
    };

    const handleDelete = async () => {
        if (!roleToDelete) {
            return;
        }

        await router.delete(`/tenant/roles/${roleToDelete.id}`, {
            onSuccess: () => {
                toast.success('Role deleted.');
                setRoleToDelete(null);
            },
            onError: () => {
                toast.error('Unable to delete role.');
                setRoleToDelete(null);
            },
        });
    };

    const setDefaultRole = (role) => {
        router.post(`/tenant/roles/${role.id}/default`, {}, {
            onSuccess: () => toast.success(`${role.name} is now the default role for new users.`),
            onError: () => toast.error('Unable to set the default role.'),
        });
    };

    return (
        <>
            <div className="flex h-full flex-col">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                            <Shield className="size-4 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold">Role Management</h1>
                            <p className="text-xs text-muted-foreground">Manage roles, permissions, and the default role for new users.</p>
                        </div>
                    </div>
                    
                    <RoleModal
                        title="Add role"
                        submitLabel="Add"
                        permissions={permissions}
                        onSubmit={handleSubmit}
                        trigger={
                            <Button type="button" size="sm" className="h-8 text-xs">
                                <Plus className="size-4" aria-hidden="true" />
                                Add Role
                            </Button>
                        }
                    />
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-6xl p-4">
                        <div className="rounded-lg border border-border bg-background/60 shadow-sm">
                            <table className="min-w-full divide-y divide-border text-left">
                                <thead className="bg-surface">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-semibold text-foreground">Name</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-foreground">Permissions</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-transparent">
                                    {roles.length > 0 ? (
                                        roles.map((role) => (
                                            <tr
                                                key={role.id}
                                                className={`border-b border-border/80 ${role.id === defaultRoleId ? 'outline outline-2 -outline-offset-2 outline-primary bg-primary/5' : ''}`}
                                            >
                                                <td className="px-4 py-3 text-sm text-foreground">{role.name}</td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground">
                                                    {role.permissions?.length > 0
                                                        ? role.permissions
                                                            .map((permission) => proposalVisibilityLabels[permission.name] ?? permission.name)
                                                            .join(', ')
                                                        : 'No permissions assigned'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <Button
                                                            variant={role.id === defaultRoleId ? 'default' : 'outline'}
                                                            size="icon"
                                                            type="button"
                                                            onClick={() => setDefaultRole(role)}
                                                            aria-label={role.id === defaultRoleId ? `${role.name} is the default role` : `Set ${role.name} as default role`}
                                                            title={role.id === defaultRoleId ? `${role.name} is the default role` : `Set ${role.name} as default role`}
                                                            disabled={role.id === defaultRoleId}
                                                            className="size-7"
                                                        >
                                                            <Star className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="secondary"
                                                            size="icon"
                                                            type="button"
                                                            onClick={() => handleEdit(role)}
                                                            aria-label={`Edit role ${role.name}`}
                                                            title={`Edit role ${role.name}`}
                                                            className="size-7"
                                                        >
                                                            <Edit3 className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            type="button"
                                                            onClick={() => setRoleToDelete(role)}
                                                            aria-label={`Delete role ${role.name}`}
                                                            title={`Delete role ${role.name}`}
                                                            className="size-7"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-4 py-12 text-center text-sm text-muted-foreground">
                                                No roles found. Add a role to get started.
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
                        <p className="text-xs text-muted-foreground">{roles.length} role{roles.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>

            {editingRole ? (
                <RoleModal
                    title="Edit role"
                    submitLabel="Save changes"
                    open={isRoleModalOpen}
                    onOpenChange={(nextOpen) => {
                        setIsRoleModalOpen(nextOpen);
                        if (!nextOpen) {
                            setEditingRole(null);
                        }
                    }}
                    initialValues={{
                        name: editingRole.name,
                        permissions: editingRole.permissions?.map((permission) => permission.id) ?? [],
                    }}
                    permissions={permissions}
                    onSubmit={handleSubmit}
                />
            ) : null}

            <Dialog open={Boolean(roleToDelete)} onOpenChange={(open) => !open && setRoleToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete role</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete the role "{roleToDelete?.name}"? This action cannot be undone.
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
