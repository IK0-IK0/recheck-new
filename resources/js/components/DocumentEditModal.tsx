import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormMaker from '@/components/FormBuilder/FormMaker';
import type { FormField } from '@/components/FormBuilder/FormFieldTypes';

type DocumentRecord = {
    id: number;
    name: string;
    file_path?: string | null;
    label: string;
    file_type?: string | null;
    storage_driver?: string | null;
    form_fields?: FormField[];
};

type Props = {
    document: DocumentRecord;
    trigger: React.ReactNode;
};

export default function DocumentEditModal({ document, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(document.name);
    const [formFields, setFormFields] = useState<FormField[]>(
        document.form_fields ?? [],
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        if (!name.trim()) {
            toast.error('Name is required');
            return;
        }

        setIsSaving(true);

        router.put(
            `/tenant/documents/${document.id}`,
            {
                name: name.trim(),
                form_fields: document.label === 'form' ? formFields : undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Document updated');
                    setOpen(false);
                },
                onError: (errors) => {
                    const errorMessage =
                        errors.name || errors.form_fields || 'Failed to update document';
                    toast.error(
                        typeof errorMessage === 'string'
                            ? errorMessage
                            : 'Failed to update document',
                    );
                },
                onFinish: () => {
                    setIsSaving(false);
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="flex h-[90vh] max-w-4xl flex-col gap-0 p-0">
                <DialogHeader className="shrink-0 space-y-2 border-b border-border p-6 pb-4">
                    <DialogTitle>Edit {document.label === 'form' ? 'Form' : 'Document'}</DialogTitle>
                    <DialogDescription>
                        {document.label === 'form'
                            ? 'Update the form name and configure its fields'
                            : 'Update the document name'}
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
                    <div className="space-y-2">
                        <Label htmlFor="document-name">Name *</Label>
                        <Input
                            id="document-name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Enter document name"
                            disabled={isSaving}
                        />
                    </div>

                    {document.label === 'form' ? (
                        <div className="rounded-lg border border-border bg-muted/30 p-4">
                            <FormMaker
                                fields={formFields}
                                onChange={setFormFields}
                                disabled={isSaving}
                            />
                        </div>
                    ) : null}
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border p-6 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button type="button" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
