import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
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

const proposalVisibilityOptions = {
    'proposal.view.all': {
        label: 'Full',
        description: 'Can view and oversee every proposal in the institution.',
    },
    'proposal.view.own_or_assigned': {
        label: 'Scoped',
        description: 'Can view proposals they own or that are assigned to one of their roles.',
    },
};

const legacyProposalVisibilityPermissions = ['proposal.view.own', 'proposal.view.assigned'];

const isProposalVisibilityPermission = (permission) =>
    Object.hasOwn(proposalVisibilityOptions, permission.name)
    || legacyProposalVisibilityPermissions.includes(permission.name);

const getInitialRoleValues = (initialValues, permissions) => {
    const initialPermissions = initialValues.permissions ?? [];
    const legacyVisibilityPermissionIds = permissions
        .filter((permission) => legacyProposalVisibilityPermissions.includes(permission.name))
        .map((permission) => permission.id);
    const canonicalVisibilityPermissionIds = permissions
        .filter((permission) => Object.hasOwn(proposalVisibilityOptions, permission.name))
        .map((permission) => permission.id);
    const hasCanonicalVisibilityPermission = initialPermissions.some((permissionId) =>
        canonicalVisibilityPermissionIds.includes(permissionId),
    );
    const defaultVisibilityPermission = permissions.find(
        (permission) => permission.name === 'proposal.view.own_or_assigned',
    );
    const preservedPermissions = initialPermissions.filter(
        (permissionId) => !legacyVisibilityPermissionIds.includes(permissionId),
    );

    return {
        ...defaultRoleInitialValues,
        ...initialValues,
        permissions: hasCanonicalVisibilityPermission || !defaultVisibilityPermission
            ? preservedPermissions
            : [...preservedPermissions, defaultVisibilityPermission.id],
    };
};

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
    const [values, setValues] = useState(() => getInitialRoleValues(initialValues, permissions));
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    const dialogOpen = open === undefined ? internalOpen : open;
    const setDialogOpen = onOpenChange ?? setInternalOpen;

    useEffect(() => {
        if (!dialogOpen) {
            return;
        }

        setValues(getInitialRoleValues(initialValues, permissions));
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
            const submitted = await onSubmit?.(values);

            if (submitted !== false) {
                setDialogOpen(false);
            }
        } finally {
            setProcessing(false);
        }
    };

    const togglePermission = (permissionId, isVisibilityPermission = false) => {
        const nextPermissions = isVisibilityPermission
            ? [
                ...values.permissions.filter((item) => {
                    const permission = permissions.find((candidate) => candidate.id === item);

                    return !permission || !isProposalVisibilityPermission(permission);
                }),
                permissionId,
            ]
            : values.permissions.includes(permissionId)
              ? values.permissions.filter((item) => item !== permissionId)
              : [...values.permissions, permissionId];

        setValues({ ...values, permissions: nextPermissions });
    };

    const visibilityPermissions = permissions.filter((permission) =>
        Object.hasOwn(proposalVisibilityOptions, permission.name),
    );
    const actionPermissions = permissions.filter(
        (permission) => !isProposalVisibilityPermission(permission),
    );

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
                                            <label
                                                key={permission.id}
                                                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                                                    values.permissions.includes(permission.id)
                                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="proposal-visibility"
                                                    checked={values.permissions.includes(permission.id)}
                                                    onChange={() => togglePermission(permission.id, true)}
                                                    disabled={processing}
                                                    className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                />
                                                <span className="grid flex-1 gap-0.5">
                                                    <span className="font-medium text-foreground">{proposalVisibilityOptions[permission.name].label}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {proposalVisibilityOptions[permission.name].description}
                                                    </span>
                                                </span>
                                                {values.permissions.includes(permission.id) ? (
                                                    <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                                                ) : null}
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
                        <Button type="submit" disabled={processing} aria-busy={processing}>
                            {processing ? <Spinner /> : null}
                            {processing ? 'Saving...' : submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
