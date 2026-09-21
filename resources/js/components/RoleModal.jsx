import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

const defaultRoleInitialValues = { name: '', permissions: [] };

const visibilityPermissionPattern = /(proposal|file).*(all|assigned|own)|(all|assigned|own).*(proposal|file)/i;

export default function RoleModal({
    title = 'Create role',
    description = 'Add or edit a role and its permissions.',
    trigger,
    open,
    onOpenChange,
    submitLabel = 'Save',
    initialValues = defaultRoleInitialValues,
    permissions = [],
    onSubmit,
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [values, setValues] = useState(initialValues);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    const dialogOpen = open === undefined ? internalOpen : open;
    const setDialogOpen = onOpenChange ?? setInternalOpen;

    useEffect(() => {
        if (!dialogOpen) {
            return;
        }

        setValues({ ...defaultRoleInitialValues, ...initialValues });
        setError('');
    }, [dialogOpen]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!values.name.trim()) {
            setError('Role name is required.');
            return;
        }

        setProcessing(true);

        try {
            await onSubmit?.(values);
            setDialogOpen(false);
        } finally {
            setProcessing(false);
        }
    };

    const togglePermission = (permissionId, isVisibilityPermission = false) => {
        const selectedPermission = permissions.find((permission) => permission.id === permissionId);
        const nextSelectedPermissions = isVisibilityPermission
            ? values.permissions.filter((item) => {
                const permission = permissions.find((candidate) => candidate.id === item);

                return !permission || !visibilityPermissionPattern.test(permission.name);
            })
            : values.permissions;
        const nextPermissions = values.permissions.includes(permissionId)
            ? nextSelectedPermissions.filter((item) => item !== permissionId)
            : [...nextSelectedPermissions, permissionId];

        setValues({ ...values, permissions: nextPermissions });
    };

    const visibilityPermissions = permissions.filter((permission) => visibilityPermissionPattern.test(permission.name));
    const actionPermissions = permissions.filter((permission) => !visibilityPermissionPattern.test(permission.name));

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : open === undefined ? (
                <DialogTrigger asChild>
                    <Button type="button">{title}</Button>
                </DialogTrigger>
            ) : null}
            <DialogContent className="flex max-h-[90vh] flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
                    <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                        <div className="grid gap-2">
                            <Label htmlFor="role-name">Name</Label>
                            <Input
                                id="role-name"
                                value={values.name}
                                onChange={(event) => setValues({ ...values, name: event.target.value })}
                                placeholder="Role name"
                            />
                            {error ? <p className="text-sm text-destructive">{error}</p> : null}
                        </div>

                        <div className="grid gap-2">
                            <Label>Permissions</Label>
                            <div className="space-y-4 rounded-md border border-input p-3">
                                {visibilityPermissions.length > 0 ? (
                                    <div className="grid gap-2">
                                        <p className="text-xs font-semibold text-foreground">Proposal visibility</p>
                                        {visibilityPermissions.map((permission) => (
                                            <label key={permission.id} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="radio"
                                                    name="proposal-visibility"
                                                    checked={values.permissions.includes(permission.id)}
                                                    onChange={() => togglePermission(permission.id, true)}
                                                    className="h-4 w-4 border-input text-primary focus:ring-primary"
                                                />
                                                <span>{permission.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : null}
                                {actionPermissions.length > 0 ? (
                                    <div className="grid gap-2">
                                        {visibilityPermissions.length > 0 ? (
                                            <p className="text-xs font-semibold text-foreground">Actions</p>
                                        ) : null}
                                        {actionPermissions.map((permission) => (
                                    <label key={permission.id} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={values.permissions.includes(permission.id)}
                                            onChange={() => togglePermission(permission.id, false)}
                                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                                        />
                                        <span>{permission.name}</span>
                                    </label>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <DialogClose asChild>
                            <Button variant="secondary" type="button">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={processing}>
                            {submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
