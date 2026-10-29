import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { FormField, FormFieldValue } from './FormFieldTypes';

type Props = {
    field: FormField;
    value: FormFieldValue;
    onChange: (value: FormFieldValue) => void;
    error?: string;
    disabled?: boolean;
};

export default function LongTextField({
    field,
    value,
    onChange,
    error,
    disabled = false,
}: Props) {
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
            <Textarea
                id={field.id}
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => onChange(event.target.value)}
                placeholder={field.placeholder || 'Your answer'}
                disabled={disabled}
                minLength={field.validation?.minLength}
                maxLength={field.validation?.maxLength}
                required={field.validation?.required}
                rows={4}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${field.id}-error` : undefined}
            />
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
