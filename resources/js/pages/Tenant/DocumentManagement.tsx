import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowDownAZ, ArrowUp, Download, Edit3, Eye, FileText, FileSpreadsheet, FileType2, LoaderCircle, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import DocumentUploadModal from '@/components/DocumentUploadModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

type SortColumn = 'name' | 'label' | 'fileType';
type SortDirection = 'asc' | 'desc';

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
    const [documentViewUrl, setDocumentViewUrl] = useState<string | null>(null);
    const [isLoadingDocumentView, setIsLoadingDocumentView] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [labelFilter, setLabelFilter] = useState('all');
    const [sortColumn, setSortColumn] = useState<SortColumn>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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

    const handleView = async (document: DocumentRecord) => {
        setDocumentToView(document);
        setDocumentViewUrl(null);
        setIsLoadingDocumentView(true);

        try {
            const response = await fetch(`/tenant/documents/${document.id}/view-url`, {
                headers: { Accept: 'application/json' },
            });
            const data = (await response.json()) as { url?: string; error?: string };

            if (!response.ok || !data.url) {
                throw new Error(data.error || 'Unable to load document preview.');
            }

            setDocumentViewUrl(data.url);
        } catch (error) {
            setDocumentToView(null);
            toast.error(error instanceof Error ? error.message : 'Unable to load document preview.');
        } finally {
            setIsLoadingDocumentView(false);
        }
    };

    const handleDelete = () => {
        if (!documentToDelete) {
            return;
        }

        const document = documentToDelete;
        router.delete(`/tenant/documents/${document.id}`, {
            onSuccess: () => {
                toast.success('Document deleted.');
                setDocumentList((currentDocuments) => currentDocuments.filter((item) => item.id !== document.id));
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

        const visibleDocuments = documentList
            .filter((document) => {
                const normalizedQuery = searchQuery.trim().toLowerCase();
                const matchesSearch = normalizedQuery === ''
                    || document.name.toLowerCase().includes(normalizedQuery)
                    || document.label.toLowerCase().includes(normalizedQuery)
                    || document.file_type.toLowerCase().includes(normalizedQuery);
                const matchesLabel = labelFilter === 'all' || document.label === labelFilter;

                return matchesSearch && matchesLabel;
            })
            .sort((firstDocument, secondDocument) => {
                const firstValue = sortColumn === 'name'
                    ? firstDocument.name
                    : sortColumn === 'label'
                        ? firstDocument.label
                        : fileTypeLabel(firstDocument.file_type, firstDocument.file_path || firstDocument.name);
                const secondValue = sortColumn === 'name'
                    ? secondDocument.name
                    : sortColumn === 'label'
                        ? secondDocument.label
                        : fileTypeLabel(secondDocument.file_type, secondDocument.file_path || secondDocument.name);
                const comparison = firstValue.localeCompare(secondValue, undefined, { sensitivity: 'base' });

                return sortDirection === 'asc' ? comparison : -comparison;
            });

        const handleSort = (column: SortColumn) => {
            if (sortColumn === column) {
                setSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc');
                return;
            }

            setSortColumn(column);
            setSortDirection('asc');
        };

        const sortIcon = (column: SortColumn) => {
            if (sortColumn !== column) {
                return <ArrowDownAZ className="size-3.5 opacity-40" aria-hidden="true" />;
            }

            return sortDirection === 'asc'
                ? <ArrowUp className="size-3.5" aria-hidden="true" />
                : <ArrowDown className="size-3.5" aria-hidden="true" />;
        };

    return (
        <Dialog open={documentToDelete !== null} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
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

            <div className="flex min-h-0 flex-1 flex-col">
                <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col p-4">
                    <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full sm:max-w-sm">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                            <Input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search documents"
                                aria-label="Search documents"
                                className="h-9 pl-9 pr-9 text-sm"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                                    aria-label="Clear search"
                                    title="Clear search"
                                >
                                    <X className="size-3.5" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                        <select
                            value={labelFilter}
                            onChange={(event) => setLabelFilter(event.target.value)}
                            aria-label="Filter by label"
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                        >
                            <option value="all">All labels</option>
                            <option value="form">Forms</option>
                            <option value="doc">Documents</option>
                        </select>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-background shadow-sm">
                        <table className="min-w-full divide-y divide-border/80 text-center">
                            <thead className="border-b border-border bg-surface">
                                <tr>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-foreground">
                                        <button type="button" onClick={() => handleSort('name')} className="inline-flex items-center justify-center gap-1.5 hover:text-primary" aria-label="Sort by name">
                                            Name {sortIcon('name')}
                                        </button>
                                    </th>
                                    <th className="border-l border-border/80 px-4 py-3 text-center text-xs font-semibold text-foreground">
                                        <button type="button" onClick={() => handleSort('label')} className="inline-flex items-center justify-center gap-1.5 hover:text-primary" aria-label="Sort by label">
                                            Label {sortIcon('label')}
                                        </button>
                                    </th>
                                    <th className="border-l border-border/80 px-4 py-3 text-center text-xs font-semibold text-foreground">
                                        <button type="button" onClick={() => handleSort('fileType')} className="inline-flex items-center justify-center gap-1.5 hover:text-primary" aria-label="Sort by file type">
                                            File Type {sortIcon('fileType')}
                                        </button>
                                    </th>
                                    <th className="border-l border-border/80 px-4 py-3 text-center text-xs font-semibold text-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-background">
                                {visibleDocuments.length > 0 ? visibleDocuments.map((document) => (
                                    <tr key={document.id}>
                                        <td className="px-4 py-3 text-left text-sm text-foreground">
                                            <div className="flex items-center justify-start gap-2">
                                                <FileKindIcon fileType={document.file_type} fileName={document.file_path || document.name} />
                                                <span>{document.name}</span>
                                            </div>
                                        </td>
                                        <td className="border-l border-border/80 px-4 py-3 text-center text-sm text-muted-foreground capitalize">{document.label}</td>
                                        <td className="border-l border-border/80 px-4 py-3 text-center text-sm text-muted-foreground">{fileTypeLabel(document.file_type, document.file_path || document.name)}</td>
                                        <td className="border-l border-border/80 px-4 py-3 text-center text-sm text-foreground">
                                            <div className="flex flex-wrap justify-center gap-2">
                                                <Button variant="secondary" size="icon" className="size-7" type="button" onClick={() => handleView(document)} aria-label={`View ${document.name}`} title="View document">
                                                    <Eye className="size-3.5" />
                                                </Button>
                                                <Button variant="outline" size="icon" className="size-7" type="button" aria-label={`Edit ${document.name}`} title={`Edit ${document.label}`}>
                                                    <Edit3 className="size-3.5" />
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
                                        <td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">
                                            {documentList.length > 0 ? 'No documents match your search.' : 'No documents have been uploaded yet.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="border-t border-border bg-surface px-4 py-3">
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <p className="text-xs text-muted-foreground">Showing {visibleDocuments.length} of {documentList.length} document{documentList.length !== 1 ? 's' : ''}</p>
                </div>
            </div>
            </div>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete document?</DialogTitle>
                    <DialogDescription>
                        This will permanently delete <span className="font-medium text-foreground">{documentToDelete?.name}</span>.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button variant="destructive" onClick={handleDelete} data-test="confirm-delete-document-button">
                        Delete document
                    </Button>
                </DialogFooter>
            </DialogContent>
            <Dialog open={documentToView !== null} onOpenChange={(open) => {
                if (!open) {
                    setDocumentToView(null);
                    setDocumentViewUrl(null);
                }
            }}>
                <DialogContent className="[&>button:last-child]:bg-background [&>button:last-child]:text-foreground [&>button:last-child]:opacity-100 [&>button:last-child]:shadow-sm [&>button:last-child]:ring-1 [&>button:last-child]:ring-border [&>button:last-child]:hover:bg-muted [&>button:last-child_svg]:size-5 !inset-0 !left-0 !top-0 flex h-[100dvh] !w-screen !max-w-none !translate-x-0 !translate-y-0 flex-col rounded-none border-0 p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle>{documentToView?.name ?? 'Document preview'}</DialogTitle>
                        <DialogDescription>Previewing the document from secure storage.</DialogDescription>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-muted">
                        {isLoadingDocumentView ? (
                            <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center" role="status" aria-live="polite">
                                <div className="flex size-16 items-center justify-center rounded-full bg-background shadow-sm">
                                    <LoaderCircle className="size-7 animate-spin text-primary" aria-hidden="true" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">Preparing preview</p>
                                    <p className="text-sm text-muted-foreground">Connecting to secure storage...</p>
                                </div>
                                <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-background">
                                    <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
                                </div>
                            </div>
                        ) : documentViewUrl ? (
                            <iframe
                                src={documentViewUrl}
                                title={`Preview ${documentToView?.name ?? 'document'}`}
                                className="h-full min-h-[24rem] w-full border-0"
                            />
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                Preview unavailable.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
}