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
import FormBuilder from './FormBuilder';
import type { FormField, FormFieldValue } from './FormFieldTypes';

type FormDocument = {
    id: number;
    name: string;
    form_fields?: FormField[] | null;
    form_response?: Record<string, FormFieldValue> | null;
};

type Props = {
    proposalId: number;
    phaseId: number;
    actionId: number;
    document: FormDocument;
    currentStorageDriver: string;
    canFill: boolean;
};

type UploadDocument = {
    id: number;
    name: string;
};
const EMPTY_FORM_VALUES: Record<string, FormFieldValue> = {};

const readJsonResponse = async (
    response: Response,
): Promise<Record<string, unknown>> => {
    const text = await response.text();

    try {
        return text ? JSON.parse(text) : {};
    } catch {
        throw new Error(`The server returned an unexpected response (HTTP ${response.status}).`);
    }
};

const uploadFileToStorage = (
    url: string,
    body: XMLHttpRequestBodyInit,
    method: 'POST' | 'PUT',
    onProgress: (progress: number) => void,
    headers: Record<string, string> = {},
    expectJson = false,
): Promise<Record<string, unknown>> =>
    new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();

        request.open(method, url);
        Object.entries(headers).forEach(([name, value]) => {
            request.setRequestHeader(name, value);
        });
        request.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        });
        request.addEventListener('load', () => {
            const responseText = request.responseText;
            let responseBody: Record<string, unknown>;

            try {
                responseBody = responseText ? JSON.parse(responseText) : {};
            } catch {
                if (expectJson) {
                    reject(new Error(`The server returned an unexpected response (HTTP ${request.status}).`));

                    return;
                }

                responseBody = {};
            }

            if (request.status >= 200 && request.status < 300) {
                resolve(responseBody);

                return;
            }

            const errors = responseBody.errors as Record<string, string> | undefined;
            reject(new Error(
                String(errors?.file || errors?.form_field_id || responseBody.error || 'File upload failed.'),
            ));
        });
        request.addEventListener('error', () => reject(new Error('File upload failed.')));
        request.addEventListener('abort', () => reject(new Error('File upload was cancelled.')));
        request.send(body);
    });

export default function ProposalFormDialog({
    proposalId,
    phaseId,
    actionId,
    document,
    currentStorageDriver,
    canFill,
}: Props) {
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const csrfToken =
        typeof window !== 'undefined'
            ? window.document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
            : '';

    const uploadFormFile = async (
        field: FormField,
        file: File,
    ): Promise<UploadDocument> => {
        const metadata = {
            phase_id: phaseId,
            required_document_id: document.id,
            action_id: actionId,
            form_field_id: field.id,
        };

        if (currentStorageDriver !== 's3') {
            const formData = new FormData();
            formData.append('file', file);
            Object.entries(metadata).forEach(([key, value]) => {
                formData.append(key, String(value));
            });

            const uploaded = await uploadFileToStorage(
                `/tenant/proposals/${proposalId}/documents`,
                formData,
                'POST',
                setUploadProgress,
                {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                true,
            );
            const result = uploaded.document as UploadDocument | undefined;

            if (!result || typeof result.id !== 'number' || typeof result.name !== 'string') {
                throw new Error('The server did not confirm the uploaded form file.');
            }

            return result;
        }

        const urlResponse = await fetch(
            `/tenant/proposals/${proposalId}/documents/direct-upload-url`,
            {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    ...metadata,
                    file_name: file.name,
                    file_size: file.size,
                    content_type: file.type || 'application/octet-stream',
                }),
            },
        );
        const upload = await readJsonResponse(urlResponse);

        if (
            !urlResponse.ok
            || typeof upload.url !== 'string'
            || typeof upload.path !== 'string'
            || typeof upload.reference !== 'string'
        ) {
            throw new Error(String(upload.error || JSON.stringify(upload.errors || upload)));
        }

        await uploadFileToStorage(
            upload.url,
            file,
            'PUT',
            setUploadProgress,
            { 'Content-Type': file.type || 'application/octet-stream' },
        );

        const completionResponse = await fetch(
            `/tenant/proposals/${proposalId}/documents/complete-direct-upload`,
            {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    ...metadata,
                    file_name: file.name,
                    file_size: file.size,
                    content_type: file.type || 'application/octet-stream',
                    path: upload.path,
                    reference: upload.reference,
                }),
            },
        );
        const completion = await readJsonResponse(completionResponse);
        const result = completion.document as UploadDocument | undefined;

        if (!completionResponse.ok || !result || typeof result.id !== 'number') {
            throw new Error(String(completion.error || JSON.stringify(completion.errors || completion)));
        }

        return result;
    };

    const handleSubmit = async (values: Record<string, FormFieldValue>) => {
        if (!canFill || isSaving) {
            return;
        }

        setIsSaving(true);
        setUploadProgress(null);

        try {
            const answers = { ...values };

            for (const field of document.form_fields ?? []) {
                const value = answers[field.id];

                if (field.type === 'file_upload' && value instanceof File) {
                    const uploaded = await uploadFormFile(field, value);
                    answers[field.id] = {
                        document_id: uploaded.id,
                        name: uploaded.name,
                    };
                }
            }

            await new Promise<void>((resolve) => {
                router.post(
                    `/tenant/proposals/${proposalId}/forms/${document.id}/responses`,
                    { action_id: actionId, answers },
                    {
                        preserveScroll: true,
                        onSuccess: () => {
                            toast.success('Form response saved.');
                            setOpen(false);
                            router.reload({ only: ['proposals'] });
                            resolve();
                        },
                        onError: (errors) => {
                            const message = Object.values(errors).find(
                                (error): error is string => typeof error === 'string',
                            );
                            toast.error(message || 'Unable to save the form response.');
                            resolve();
                        },
                    },
                );
            });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to save the form response.');
            setIsSaving(false);
            setUploadProgress(null);

            return;
        } finally {
            setIsSaving(false);
            setUploadProgress(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant={document.form_response ? 'secondary' : 'outline'} size="sm">
                    {document.form_response ? (canFill ? 'Edit response' : 'View response') : (canFill ? 'Fill form' : 'View form')}
                </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl">
                <DialogHeader className="shrink-0">
                    <DialogTitle>{document.name}</DialogTitle>
                    <DialogDescription>
                        {canFill
                            ? 'Complete the fields below. Your answers are saved for this proposal and workflow action.'
                            : 'Form configuration and your saved answers.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto py-1 pr-1">
                    {(document.form_fields ?? []).length > 0 ? (
                        <FormBuilder
                            key={`${proposalId}-${document.id}-${actionId}`}
                            fields={document.form_fields ?? []}
                            initialValues={document.form_response ?? EMPTY_FORM_VALUES}
                            onSubmit={handleSubmit}
                            submitLabel={document.form_response ? 'Save changes' : 'Save response'}
                            disabled={!canFill || isSaving}
                        />
                    ) : (
                        <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                            This form has no fields configured.
                        </p>
                    )}
                    {uploadProgress !== null ? (
                        <div className="mt-4 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Uploading form file...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
