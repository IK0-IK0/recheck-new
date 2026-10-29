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

/**
 * @param {{
 *   document: { id: number, name: string, label: string, file_path?: string, file_type?: string },
 *   trigger?: import('react').ReactNode,
 *   onFileReplaced?: () => void,
 * }} props
 */
export default function DocumentEditModal({ document, trigger, onFileReplaced }) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(document.name);
    const [processing, setProcessing] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(null);

    useEffect(() => {
        if (open) {
            setName(document.name);
            setSelectedFiles([]);
            setUploadProgress(null);
        }
    }, [open, document.name]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!name.trim()) {
            toast.error('Document name is required.');
            return;
        }

        setProcessing(true);

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
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isForm ? 'Configure Form' : 'Edit Document'}
                    </DialogTitle>
                    <DialogDescription>
                        {isForm
                            ? 'Configure the form name and settings.'
                            : 'Update the document name.'}
                    </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleSubmit}>
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

                    {hasFile && !isForm && (
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

                    {isForm && !document.file_path && (
                        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                            This form has no file attached. Forms can be filled
                            out during the workflow process.
                        </div>
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

                    <DialogFooter>
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
