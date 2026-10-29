import { useState } from 'react';
import { Button } from '@/components/ui/button';
import FormFieldRenderer from './FormFieldRenderer';
import type { FormField, FormFieldValue } from './FormFieldTypes';

type Props = {
    fields: FormField[];
    onSubmit: (values: Record<string, FormFieldValue>) => void;
    submitLabel?: string;
    disabled?: boolean;
};

type FormErrors = Record<string, string>;

export default function FormBuilder({
    fields,
    onSubmit,
    submitLabel = 'Submit',
    disabled = false,
}: Props) {
    const [values, setValues] = useState<Record<string, FormFieldValue>>({});
    const [errors, setErrors] = useState<FormErrors>({});

    const handleFieldChange = (fieldId: string, value: FormFieldValue) => {
        setValues((currentValues) => ({
            ...currentValues,
            [fieldId]: value,
        }));

        // Clear error for this field when value changes
        if (errors[fieldId]) {
            setErrors((currentErrors) => {
                const nextErrors = { ...currentErrors };
                delete nextErrors[fieldId];

                return nextErrors;
            });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        fields.forEach((field) => {
            const value = values[field.id];

            // Check required validation
            if (field.validation?.required) {
                if (
                    value === null ||
                    value === undefined ||
                    value === '' ||
                    (Array.isArray(value) && value.length === 0)
                ) {
                    newErrors[field.id] = 'This field is required';
                }
            }

            // Check min/max length for text fields
            if (typeof value === 'string' && value) {
                if (
                    field.validation?.minLength &&
                    value.length < field.validation.minLength
                ) {
                    newErrors[field.id] = `Minimum ${field.validation.minLength} characters required`;
                }

                if (
                    field.validation?.maxLength &&
                    value.length > field.validation.maxLength
                ) {
                    newErrors[field.id] = `Maximum ${field.validation.maxLength} characters allowed`;
                }
            }

            // Check file size for file upload
            if (value instanceof File && field.validation?.maxFileSize) {
                if (value.size > field.validation.maxFileSize) {
                    newErrors[field.id] = `File size exceeds ${(field.validation.maxFileSize / 1024 / 1024).toFixed(1)} MB`;
                }
            }

            // Check file type for file upload
            if (
                value instanceof File &&
                field.validation?.fileTypes &&
                field.validation.fileTypes.length > 0
            ) {
                const fileExtension = value.name.split('.').pop()?.toLowerCase();
                const acceptedExtensions = field.validation.fileTypes.map((type) =>
                    type.replace('.', '').toLowerCase(),
                );

                if (fileExtension && !acceptedExtensions.includes(fileExtension)) {
                    newErrors[field.id] = `Only ${field.validation.fileTypes.join(', ')} files are allowed`;
                }
            }
        });

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (validateForm()) {
            onSubmit(values);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {fields.map((field) => (
                <div key={field.id} className="rounded-lg border border-border bg-card p-4">
                    <FormFieldRenderer
                        field={field}
                        value={values[field.id] ?? null}
                        onChange={(value) => handleFieldChange(field.id, value)}
                        error={errors[field.id]}
                        disabled={disabled}
                    />
                </div>
            ))}
            <div className="flex justify-end">
                <Button type="submit" disabled={disabled}>
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
