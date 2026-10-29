import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { FormField, FormFieldValue } from './FormFieldTypes';

type Props = {
    field: FormField;
    value: FormFieldValue;
    onChange: (value: FormFieldValue) => void;
    error?: string;
    disabled?: boolean;
};

export default function DropdownField({
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
            <Select
                value={typeof value === 'string' ? value : ''}
                onValueChange={(newValue) => onChange(newValue)}
                disabled={disabled}
                required={field.validation?.required}
            >
                <SelectTrigger
                    id={field.id}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? `${field.id}-error` : undefined}
                >
                    <SelectValue placeholder="Choose an option" />
                </SelectTrigger>
                <SelectContent>
                    {field.options?.map((option) => (
                        <SelectItem key={option.id} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
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
