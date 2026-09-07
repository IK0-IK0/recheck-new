import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Download, Eye, FileText, FileSpreadsheet, FileType2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DocumentUploadModal from '@/components/DocumentUploadModal';
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

type DocumentRecord = {
    id: number;
    name: string;
    file_path?: string;
    label: string;
    file_type: string;
    storage_driver?: string;
};

const fileExtension = (fileType: string, fileName?: string): string => {
    const pathExtension = fileName?.split('.').pop()?.toLowerCase();

    if (pathExtension && pathExtension !== fileName?.toLowerCase()) {
        return pathExtension;
    }

    return fileType.split('/').pop()?.toLowerCase() || 'file';
};

const fileTypeLabel = (fileType: string, fileName: string): string => fileExtension(fileType, fileName).toUpperCase();

const FileKindIcon = ({ fileType, fileName }: { fileType: string; fileName: string }) => {
    const extension = fileExtension(fileType, fileName);

    if (['xls', 'xlsx', 'csv'].includes(extension)) {
        return <FileSpreadsheet className="size-4 text-emerald-600" aria-hidden="true" />;
    }

    if (['doc', 'docx', 'txt'].includes(extension)) {
        return <FileType2 className="size-4 text-blue-600" aria-hidden="true" />;
    }

    return <FileText className="size-4 text-red-600" aria-hidden="true" />;
};

type UploadValues = {
    name: string;
    label: string;
    files: File[];
};

type Props = {
    documents?: DocumentRecord[];
    currentStorageDriver?: string;
};

const uploadFileWithProgress = (url: string, file: File, onProgress: (progress: number) => void): Promise<void> => new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open('PUT', url);
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    request.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
            onProgress(Math.round((event.loaded / event.total) * 100));
        }
    });
    request.addEventListener('load', () => {
        if (request.status >= 200 && request.status < 300) {
            resolve();
            return;
        }

        reject(new Error(`Bucket upload returned HTTP ${request.status}. Check the bucket CORS policy.`));
    });
    request.addEventListener('error', () => reject(new Error('The bucket upload failed. Check the bucket CORS policy.')));
    request.addEventListener('abort', () => reject(new Error('The bucket upload was cancelled.')));
    request.send(file);
});

const firstErrorMessage = (value: unknown): string | undefined => {
    if (typeof value === 'string' && value.trim()) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.find((item): item is string => typeof item === 'string' && item.trim()) as string | undefined;
    }

    return undefined;
};

const readJsonResponse = async (response: Response): Promise<Record<string, unknown>> => {
    const responseText = await response.text();

    try {
        return responseText ? JSON.parse(responseText) : {};
    } catch {
        throw new Error(`The server returned an unexpected response (HTTP ${response.status}).`);
    }
};

export default function DocumentManagement({ documents = [], currentStorageDriver = 'local' }: Props) {
    const [documentList, setDocumentList] = useState(documents);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [documentToDelete, setDocumentToDelete] = useState<DocumentRecord | null>(null);
    const [documentToView, setDocumentToView] = useState<DocumentRecord | null>(null);

    useEffect(() => {
        setDocumentList(documents);
    }, [documents]);

    const handleUpload = async ({ name, label, files }: UploadValues) => {
        if (currentStorageDriver === 's3' && files[0]) {
            const file = files[0];
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            setUploadProgress(0);

            try {
                const urlResponse = await fetch('/tenant/documents/direct-upload-url', {
                    method: 'POST',
                    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                    body: JSON.stringify({ name, label, file_name: file.name, content_type: file.type || 'application/octet-stream' }),
                });
                const uploadData = await readJsonResponse(urlResponse);

                if (!urlResponse.ok) {
                    throw new Error(String(uploadData.error || JSON.stringify(uploadData.errors || uploadData)));
                }

                if (typeof uploadData.url !== 'string' || typeof uploadData.path !== 'string' || typeof uploadData.reference !== 'string') {
                    throw new Error('The server did not return a valid direct upload response.');
                }

                await uploadFileWithProgress(uploadData.url, file, setUploadProgress);

                const completeResponse = await fetch('/tenant/documents/complete-direct-upload', {
                    method: 'POST',
                    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                    body: JSON.stringify({ name, label, file_type: file.type || 'application/octet-stream', path: uploadData.path, reference: uploadData.reference }),
                });

                const completeData = await readJsonResponse(completeResponse);

                if (!completeResponse.ok) {
                    throw new Error(String(completeData.error || JSON.stringify(completeData.errors || completeData)));
                }

                if (completeData.document) {
                    setDocumentList((currentDocuments) => [...currentDocuments, completeData.document as DocumentRecord]);
                }

                router.reload({ only: ['documents'] });
                toast.success('Document saved.');
                setUploadProgress(null);

                return true;
            } catch (error) {
                console.error('[Direct document upload failed]', { name, label, fileName: file.name, fileSize: file.size, error });
                toast.error(error instanceof Error ? error.message : 'Upload failed.');
                setUploadProgress(null);

                return false;
            }
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('label', label);

        if (files.length > 0) {
            formData.append('file', files[0]);
        }

        return new Promise<boolean>((resolve) => router.post('/tenant/documents', formData, {
            onSuccess: () => {
                toast.success('Document saved.');
                resolve(true);
            },
            onError: (errors) => {
                console.error('[Document upload failed]', {
                    name,
                    label,
                    fileName: files[0]?.name,
                    fileSize: files[0]?.size,
                });
                console.error('[Document upload errors]', JSON.stringify(errors, null, 2));

                const message = firstErrorMessage(errors.storage)
                    || firstErrorMessage(errors.file)
                    || firstErrorMessage(errors.name)
                    || 'Upload failed. Check the storage configuration and Laravel logs for details.';
                toast.error(message);
                resolve(false);
            },
            onException: (exception) => {
                console.error('[Document upload exception]', exception);
                toast.error('Upload failed unexpectedly. See the browser console and Laravel logs for details.');
                resolve(false);
            },
        }));
    };

    const handleDelete = (document: DocumentRecord) => {
        router.delete(`/tenant/documents/${document.id}`, {
            onSuccess: () => {
                toast.success('Document deleted.');
                setDocumentList((currentDocuments) => currentDocuments.filter((currentDocument) => currentDocument.id !== document.id));
                setDocumentToDelete(null);
            },
            onError: (errors) => {
                toast.error(errors.storage || 'Unable to delete document.');
            },
        });
    };

    const storageLabel = currentStorageDriver === 'local'
        ? 'Local Storage'
        : currentStorageDriver === 's3'
            ? 'S3 Storage'
            : currentStorageDriver === 'supabase'
                ? 'Supabase Storage'
                : currentStorageDriver;

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
                <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="size-4 text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-semibold">Document Management</h1>
                            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{storageLabel}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Upload and manage documents for your workflow</p>
                    </div>
                </div>
                <DocumentUploadModal
                    title="Add document"
                    submitLabel="Add"
                    onSubmit={handleUpload}
                    uploadProgress={uploadProgress}
                    trigger={<Button size="sm" className="h-8 text-xs">Add Document</Button>}
                />
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-6xl p-4">
                    <div className="rounded-lg border border-border bg-background shadow-sm">
                        <table className="min-w-full divide-y divide-border text-left">
                            <thead className="bg-surface">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-semibold text-foreground">Name</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-foreground">Label</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-foreground">File Type</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-background">
                                {documentList.length > 0 ? documentList.map((document) => (
                                    <tr key={document.id}>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            <div className="flex items-center gap-2">
                                                <FileKindIcon fileType={document.file_type} fileName={document.file_path || document.name} />
                                                <span>{document.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{document.label}</td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">{fileTypeLabel(document.file_type, document.file_path || document.name)}</td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            <div className="flex flex-wrap gap-2">
                                                <Button variant="secondary" size="icon" type="button" className="size-7" onClick={() => setDocumentToView(document)} aria-label="View document" title="View document">
                                                    <Eye className="size-3.5" />
                                                </Button>
                                                <Button asChild variant="outline" size="icon" className="size-7" aria-label="Download document">
                                                    <a href={`/tenant/documents/${document.id}/download`} title="Download document" aria-label="Download document">
                                                        <Download className="size-3.5" />
                                                    </a>
                                                </Button>
                                                <Button variant="destructive" size="icon" type="button" onClick={() => setDocumentToDelete(document)} className="size-7" aria-label={`Delete ${document.name}`} title="Delete document">
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">No documents have been uploaded yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="border-t border-border bg-surface px-4 py-3">
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <p className="text-xs text-muted-foreground">{documentList.length} document{documentList.length !== 1 ? 's' : ''}</p>
                </div>
            </div>

            <Dialog open={Boolean(documentToDelete)} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete document?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete &quot;{documentToDelete?.name}&quot; and its stored file.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary" type="button">Cancel</Button>
                        </DialogClose>
                        <Button variant="destructive" type="button" onClick={() => documentToDelete && handleDelete(documentToDelete)}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(documentToView)} onOpenChange={(open) => !open && setDocumentToView(null)}>
                <DialogContent className="flex h-[85vh] max-w-5xl flex-col">
                    <DialogHeader>
                        <DialogTitle>{documentToView?.name}</DialogTitle>
                        <DialogDescription>Document preview</DialogDescription>
                    </DialogHeader>
                    <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-muted">
                        {documentToView ? (
                            <iframe
                                title={`Preview of ${documentToView.name}`}
                                src={`/tenant/documents/${documentToView.id}/view`}
                                className="size-full"
                            />
                        ) : null}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary" type="button">Close</Button>
                        </DialogClose>
                        {documentToView ? (
                            <Button asChild>
                                <a href={`/tenant/documents/${documentToView.id}/download`}>Download</a>
                            </Button>
                        ) : null}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}