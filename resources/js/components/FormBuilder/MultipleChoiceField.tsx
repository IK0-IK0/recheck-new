import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { FormField, FormFieldValue } from './FormFieldTypes';

type Props = {
    field: FormField;
    value: FormFieldValue;
    onChange: (value: FormFieldValue) => void;
    error?: string;
    disabled?: boolean;
};

export default function MultipleChoiceField({
    field,
    value,
    onChange,
    error,
    disabled = false,
}: Props) {
    return (
        <div className="space-y-3">
            <div>
                <Label className="text-sm font-medium">
                    {field.label}
                    {field.validation?.required ? (
                        <span className="ml-1 text-destructive">*</span>
                    ) : null}
                </Label>
                {field.description ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                        {field.description}
                    </p>
                ) : null}
            </div>
            <RadioGroup
                value={typeof value === 'string' ? value : ''}
                onValueChange={(newValue) => onChange(newValue)}
                disabled={disabled}
                required={field.validation?.required}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${field.id}-error` : undefined}
            >
                {field.options?.map((option) => (
                    <div
                        key={option.id}
                        className="flex items-center space-x-2"
                    >
                        <RadioGroupItem
                            value={option.value}
                            id={`${field.id}-${option.id}`}
                        />
                        <Label
                            htmlFor={`${field.id}-${option.id}`}
                            className="cursor-pointer font-normal"
                        >
                            {option.label}
                        </Label>
                    </div>
                ))}
            </RadioGroup>
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
