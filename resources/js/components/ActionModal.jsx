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

const defaultActionInitialValues = {
    name: '',
    description: '',
    action_type: 'review',
    requires_file: false,
    document_ids: [],
    roles: [],
};

export default function ActionModal({
    title = 'Create action',
    description = 'Add or edit an action within a phase.',
    trigger,
    open,
    onOpenChange,
    submitLabel = 'Save',
    initialValues = defaultActionInitialValues,
    roles = [],
    documents = [],
    onSubmit,
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({ name: '' });
    const [processing, setProcessing] = useState(false);

    const dialogOpen = open === undefined ? internalOpen : open;
    const setDialogOpen = onOpenChange ?? setInternalOpen;

    useEffect(() => {
        if (!dialogOpen) {
            return;
        }

        setValues({
            ...defaultActionInitialValues,
            ...initialValues,
            roles: initialValues.roles ?? [],
            document_ids: initialValues.document_ids ?? [],
        });
        setErrors({ name: '' });
    }, [dialogOpen]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!values.name.trim()) {
            setErrors({ name: 'Action name is required.' });
            return;
        }

        setProcessing(true);

        try {
            const { roles: selectedRoles, ...rest } = values;
            await onSubmit?.({ ...rest, role_ids: selectedRoles });
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

    const toggleDocument = (documentId) => {
        const nextDocumentIds = values.document_ids.includes(documentId)
            ? values.document_ids.filter((item) => item !== documentId)
            : [...values.document_ids, documentId];

        setValues({ ...values, document_ids: nextDocumentIds });
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
            <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <form className="max-h-[calc(100vh-14rem)] space-y-4 overflow-y-auto pr-1" onSubmit={handleSubmit}>
                    <div className="grid gap-2">
                        <Label htmlFor="action-name">Name</Label>
                        <Input
                            id="action-name"
                            value={values.name}
                            onChange={(event) => setValues({ ...values, name: event.target.value })}
                            placeholder="Action name"
                        />
                        {errors.name ? (
                            <p className="text-sm text-destructive">{errors.name}</p>
                        ) : null}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="action-description">Description</Label>
                        <textarea
                            id="action-description"
                            value={values.description}
                            onChange={(event) => setValues({ ...values, description: event.target.value })}
                            className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-ring/50"
                            placeholder="Optional description"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="action-type">Action type</Label>
                        <select
                            id="action-type"
                            value={values.action_type ?? 'review'}
                            onChange={(event) => {
                                const actionType = event.target.value;
                                setValues({
                                    ...values,
                                    action_type: actionType,
                                    requires_file: actionType === 'submit',
                                });
                            }}
                            className="border-input bg-transparent text-base shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-ring/50 rounded-md border px-3 py-2"
                        >
                            <option value="review">Review</option>
                            <option value="submit">Submit</option>
                        </select>
                    </div>

                    {values.action_type === 'submit' ? (
                        <div className="grid gap-2">
                            <Label>Required documents</Label>
                            <div className="grid max-h-56 gap-2 overflow-y-auto rounded-md border border-input p-3">
                                {documents.length ? (
                                    documents.map((document) => (
                                        <label key={document.id} className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={values.document_ids.includes(document.id)}
                                                onChange={() => toggleDocument(document.id)}
                                                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                                            />
                                            <span>{document.name}</span>
                                        </label>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No documents are available yet.</p>
                                )}
                            </div>
                        </div>
                    ) : null}

                    <div className="grid gap-2">
                        <Label>Accessible roles</Label>
                        <div className="grid max-h-56 gap-2 overflow-y-auto rounded-md border border-input p-3">
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
                    <DialogFooter>
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
