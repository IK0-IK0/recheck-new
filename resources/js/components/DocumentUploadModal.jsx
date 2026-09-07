import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export default function DocumentUploadModal({
    title = 'Save document',
    description = 'Save a document record and choose its type.',
    trigger,
    submitLabel = 'Save',
    initialValues = { name: '', label: 'form' },
    onSubmit,
    uploadProgress = null,
}) {
    const [open, setOpen] = useState(false);
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({ name: '', label: '' });
    const [processing, setProcessing] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);

    useEffect(() => {
        if (!open) {
            return;
        }

        setValues({ ...initialValues });
        setErrors({ name: '', label: '' });
        setSelectedFiles([]);
    }, [open]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!values.name.trim()) {
            setErrors({
                name: 'Document name is required.',
                label: '',
            });
            return;
        }

        if (selectedFiles.length === 0) {
            setErrors({
                name: '',
                label: 'Please select a file.',
            });
            return;
        }

        setProcessing(true);

        try {
            const submitted = await onSubmit?.({ ...values, files: selectedFiles });

            if (submitted !== false) {
                setOpen(false);
            }
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ?? <Button type="button">{title}</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <form className="space-y-4 overflow-hidden" onSubmit={handleSubmit}>
                    <div className="grid gap-2">
                        <Label htmlFor="document-name">Document name</Label>
                        <Input
                            id="document-name"
                            value={values.name}
                            onChange={(event) => setValues({ ...values, name: event.target.value })}
                            placeholder="e.g. Client intake form"
                        />
                        {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="document-label">Document type</Label>
                        <Select value={values.label} onValueChange={(label) => setValues({ ...values, label })}>
                            <SelectTrigger id="document-label" className="w-full">
                                <SelectValue placeholder="Select a document type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="form">Form</SelectItem>
                                <SelectItem value="doc">Document</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.label ? <p className="text-sm text-destructive">{errors.label}</p> : null}
                    </div>
                    
                    {/* File Drop Zone */}
                    <div className="grid gap-2 w-full overflow-hidden">
                        {selectedFiles.length === 0 && <Label>Upload file</Label>}
                        <FileDropZone
                            onFilesSelected={setSelectedFiles}
                            accept=".pdf,.doc,.docx,.txt,.xlsx,.xls,.csv"
                            maxSize={10 * 1024 * 1024}
                            multiple={false}
                            className="w-full"
                        />
                    </div>

                    <DialogFooter>
                        {processing && uploadProgress !== null ? (
                            <div className="flex min-w-0 flex-1 items-center gap-2" aria-live="polite">
                                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="File upload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={uploadProgress}>
                                    <div className="h-full bg-primary transition-[width]" style={{ width: `${uploadProgress}%` }} />
                                </div>
                                <span className="shrink-0 text-xs text-muted-foreground">{uploadProgress}%</span>
                            </div>
                        ) : null}
                        <DialogClose asChild>
                            <Button variant="secondary" type="button">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={processing} aria-busy={processing}>
                            {processing ? (
                                <>
                                    <Spinner />
                                    Uploading...
                                </>
                            ) : submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
