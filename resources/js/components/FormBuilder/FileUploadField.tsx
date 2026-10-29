import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, X } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { FormField, FormFieldValue, SavedFormFile } from './FormFieldTypes';

type Props = {
    field: FormField;
    value: FormFieldValue;
    onChange: (value: FormFieldValue) => void;
    error?: string;
    disabled?: boolean;
};

export default function FileUploadField({
    field,
    value,
    onChange,
    error,
    disabled = false,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const file = value instanceof File ? value : null;
    const savedFile =
        value !== null
        && typeof value === 'object'
        && !(value instanceof File)
        && 'document_id' in value
        && typeof value.document_id === 'number'
        && typeof value.name === 'string'
            ? value as SavedFormFile
            : null;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            onChange(selectedFile);
        }
    };

    const handleRemoveFile = () => {
        onChange(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <Label htmlFor={field.id} className="text-sm font-medium">
                {field.label}
                {field.validation?.required ? (
                    <span className="ml-1 text-destructive">*</span>
                ) : null}
            </Label>
            {field.description ? (
                <p className="text-xs text-muted-foreground">
                    {field.description}
                </p>
            ) : null}
            {file || savedFile ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-3">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                            {file?.name ?? savedFile?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {file
                                ? `${(file.size / 1024).toFixed(1)} KB`
                                : 'Previously uploaded'}
                        </p>
                        {savedFile ? (
                            <a
                                href={`/tenant/documents/${savedFile.document_id}/view`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-primary underline-offset-4 hover:underline"
                            >
                                View file
                            </a>
                        ) : null}
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemoveFile}
                        disabled={disabled}
                        className="size-8 shrink-0"
                        aria-label="Remove file"
                    >
                        <X className="size-4" />
                    </Button>
                </div>
            ) : (
                <Input
                    ref={inputRef}
                    id={field.id}
                    type="file"
                    onChange={handleFileChange}
                    disabled={disabled}
                    required={field.validation?.required}
                    accept={field.validation?.fileTypes?.join(',')}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? `${field.id}-error` : undefined}
                />
            )}
            {field.validation?.fileTypes ? (
                <p className="text-xs text-muted-foreground">
                    Accepted file types: {field.validation.fileTypes.join(', ')}
                </p>
            ) : null}
            {field.validation?.maxFileSize ? (
                <p className="text-xs text-muted-foreground">
                    Maximum file size:{' '}
                    {(field.validation.maxFileSize / 1024 / 1024).toFixed(1)} MB
                </p>
            ) : null}
            {error ? (
                <p
                    id={`${field.id}-error`}
                    className="text-xs text-destructive"
                >
                    {error}
                </p>
            ) : null}
        </div>
    );
}
