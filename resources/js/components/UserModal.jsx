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

const defaultUserInitialValues = { name: '', email: '', password: '', roles: [] };

export default function UserModal({
    title = 'Create user',
    description = 'Add or update a tenant user.',
    trigger,
    open,
    onOpenChange,
    submitLabel = 'Save',
    initialValues = defaultUserInitialValues,
    roles = [],
    onSubmit,
    allowNameEdit = true,
    allowEmailEdit = true,
    allowPasswordEdit = true,
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({ name: '', email: '' });
    const [processing, setProcessing] = useState(false);

    const dialogOpen = open === undefined ? internalOpen : open;
    const setDialogOpen = onOpenChange ?? setInternalOpen;

    useEffect(() => {
        if (!dialogOpen) {
            return;
        }

        setValues(initialValues);
        setErrors({ name: '', email: '' });
    }, [dialogOpen]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!values.name.trim() || !values.email.trim()) {
            setErrors({
                name: values.name.trim() ? '' : 'Name is required.',
                email: values.email.trim() ? '' : 'Email is required.',
            });
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

    const toggleRole = (roleId) => {
        const nextRoles = values.roles.includes(roleId)
            ? values.roles.filter((item) => item !== roleId)
            : [...values.roles, roleId];

        setValues({ ...values, roles: nextRoles });
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
                        {allowNameEdit ? (
                            <div className="grid gap-2">
                                <Label htmlFor="user-name">Name</Label>
                                <Input
                                    id="user-name"
                                    value={values.name}
                                    onChange={(event) => setValues({ ...values, name: event.target.value })}
                                    placeholder="Name"
                                />
                                {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label>Name</Label>
                                <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground">
                                    {values.name || 'No name provided'}
                                </div>
                            </div>
                        )}

                        {allowEmailEdit ? (
                            <div className="grid gap-2">
                                <Label htmlFor="user-email">Email</Label>
                                <Input
                                    id="user-email"
                                    type="email"
                                    value={values.email}
                                    onChange={(event) => setValues({ ...values, email: event.target.value })}
                                    placeholder="Email"
                                />
                                {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label>Email</Label>
                                <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                                    {values.email || 'No email provided'}
                                </div>
                            </div>
                        )}

                        {allowPasswordEdit ? (
                            <div className="grid gap-2">
                                <Label htmlFor="user-password">Password</Label>
                                <Input
                                    id="user-password"
                                    type="password"
                                    value={values.password}
                                    onChange={(event) => setValues({ ...values, password: event.target.value })}
                                    placeholder="Password (leave empty to keep current)"
                                />
                            </div>
                        ) : null}

                        <div className="grid gap-2">
                            <Label>Roles</Label>
                            <div className="grid gap-2 rounded-md border border-input p-3">
                                {roles.map((role) => (
                                    <label key={role.id} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={values.roles.includes(role.id)}
                                            onChange={() => toggleRole(role.id)}
                                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                                        />
                                        <span>{role.name}</span>
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
