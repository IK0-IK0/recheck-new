import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
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
import FileDropZone from '@/components/FileDropZone';
import FormMaker from '@/components/FormBuilder/FormMaker';

/**
 * @param {{
 *   document: { id: number, name: string, label: string, file_path?: string, file_type?: string },
 *   trigger?: import('react').ReactNode,
 *   onFileReplaced?: () => void,
 * }} props
 */
export default function DocumentEditModal({ document, trigger, onFileReplaced, open: controlledOpen, onOpenChange }) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;
    
    const [name, setName] = useState(document.name);
    const [formFields, setFormFields] = useState(document.form_fields || []);
    const [processing, setProcessing] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(null);

    useEffect(() => {
        if (open) {
            setName(document.name);
            setFormFields(document.form_fields || []);
            setSelectedFiles([]);
            setUploadProgress(null);
        }
    }, [open, document.name, document.form_fields]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!name.trim()) {
            toast.error('Document name is required.');
            return;
        }

        setProcessing(true);

        const isForm = document.label === 'form';

        // For forms, save form_fields
        if (isForm) {
            router.put(
                `/tenant/documents/${document.id}`,
                { 
                    name: name.trim(),
                    form_fields: formFields 
                },
                {
                    onSuccess: () => {
                        toast.success('Form updated.');
                        setOpen(false);
                    },
                    onError: (errors) => {
                        const message =
                            errors.name ||
                            errors.form_fields ||
                            'Unable to update form. Please try again.';
                        toast.error(message);
                    },
                    onFinish: () => {
                        setProcessing(false);
                    },
                },
            );
            return;
        }

        // If there's a new file selected, upload it as a replacement
        if (selectedFiles.length > 0) {
            const formData = new FormData();
            formData.append('name', name.trim());
            formData.append('file', selectedFiles[0]);
            formData.append('_method', 'PUT');

            router.post(`/tenant/documents/${document.id}`, formData, {
                onSuccess: () => {
                    toast.success('Document updated and file replaced.');
                    setOpen(false);
                    onFileReplaced?.();
                },
                onError: (errors) => {
                    const message =
                        errors.file ||
                        errors.name ||
                        errors.storage ||
                        'Unable to update document. Please try again.';
                    toast.error(message);
                },
                onFinish: () => {
                    setProcessing(false);
                },
            });
        } else {
            // Just update the name
            router.put(
                `/tenant/documents/${document.id}`,
                { name: name.trim() },
                {
                    onSuccess: () => {
                        toast.success('Document updated.');
                        setOpen(false);
                    },
                    onError: (errors) => {
                        const message =
                            errors.name ||
                            'Unable to update document. Please try again.';
                        toast.error(message);
                    },
                    onFinish: () => {
                        setProcessing(false);
                    },
                },
            );
        }
    };

    const isForm = document.label === 'form';
    const hasFile = Boolean(document.file_path);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? <Button type="button">Edit</Button>}
            </DialogTrigger>
            <DialogContent className="flex h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
                <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
                    <DialogTitle>
                        {isForm ? 'Configure Form' : 'Edit Document'}
                    </DialogTitle>
                    <DialogDescription>
                        {isForm
                            ? 'Configure the form fields that users will fill out.'
                            : 'Update the document name and optionally replace the file.'}
                    </DialogDescription>
                </DialogHeader>
                <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
                    <div className="custom-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="document-name">
                                {isForm ? 'Form name' : 'Document name'}
                            </Label>
                            <Input
                                id="document-name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder={
                                    isForm
                                        ? 'e.g. Client intake form'
                                        : 'e.g. Project proposal'
                                }
                                disabled={processing}
                            />
                        </div>

                        {isForm ? (
                            <div className="space-y-4 border-t border-border pt-4">
                                <div>
                                    <h3 className="text-sm font-semibold">
                                        Form Builder
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Add, edit, and reorder the fields users
                                        will fill out.
                                    </p>
                                </div>
                                <FormMaker
                                    fields={formFields}
                                    onChange={setFormFields}
                                    disabled={processing}
                                />
                            </div>
                        ) : (
                            <>
                                {hasFile && (
                                    <div className="grid gap-2">
                                        <Label>Replace file (optional)</Label>
                                        <FileDropZone
                                            onFilesSelected={setSelectedFiles}
                                            accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv"
                                            maxSize={10 * 1024 * 1024}
                                            multiple={false}
                                            className="w-full"
                                        />
                                        {selectedFiles.length > 0 && (
                                            <p className="text-sm text-muted-foreground">
                                                New file selected: {selectedFiles[0].name}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Upload a new file to replace the existing one. The old file will be deleted.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {uploadProgress !== null && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Uploading...</span>
                                    <span className="font-medium">{uploadProgress}%</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full bg-primary transition-all"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="shrink-0 border-t border-border bg-background px-6 py-4">
                        <DialogClose asChild>
                            <Button
                                variant="secondary"
                                type="button"
                                disabled={processing}
                            >
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={processing}
                            aria-busy={processing}
                        >
                            {processing ? (
                                <>
                                    <Spinner />
                                    Saving...
                                </>
                            ) : (
                                'Save changes'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
