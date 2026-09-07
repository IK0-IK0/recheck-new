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

        setValues(initialValues);
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

    const togglePermission = (permissionId) => {
        const nextPermissions = values.permissions.includes(permissionId)
            ? values.permissions.filter((item) => item !== permissionId)
            : [...values.permissions, permissionId];

        setValues({ ...values, permissions: nextPermissions });
    };

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
                            <div className="grid gap-2 rounded-md border border-input p-3">
                                {permissions.map((permission) => (
                                    <label key={permission.id} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={values.permissions.includes(permission.id)}
                                            onChange={() => togglePermission(permission.id)}
                                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                                        />
                                        <span>{permission.name}</span>
                                    </label>
                                ))}
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
