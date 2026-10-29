import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { FormField, FormFieldValue } from './FormFieldTypes';

type Props = {
    field: FormField;
    value: FormFieldValue;
    onChange: (value: FormFieldValue) => void;
    error?: string;
    disabled?: boolean;
};

export default function CheckboxesField({
    field,
    value,
    onChange,
    error,
    disabled = false,
}: Props) {
    const selectedValues = Array.isArray(value) ? value : [];

    const handleCheckboxChange = (optionValue: string, checked: boolean) => {
        if (checked) {
            onChange([...selectedValues, optionValue]);
        } else {
            onChange(selectedValues.filter((v) => v !== optionValue));
        }
    };

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
            <div
                className="space-y-2"
                role="group"
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${field.id}-error` : undefined}
            >
                {field.options?.map((option) => (
                    <div
                        key={option.id}
                        className="flex items-center space-x-2"
                    >
                        <Checkbox
                            id={`${field.id}-${option.id}`}
                            checked={selectedValues.includes(option.value)}
                            onCheckedChange={(checked) =>
                                handleCheckboxChange(
                                    option.value,
                                    checked === true,
                                )
                            }
                            disabled={disabled}
                        />
                        <Label
                            htmlFor={`${field.id}-${option.id}`}
                            className="cursor-pointer font-normal"
                        >
                            {option.label}
                        </Label>
                    </div>
                ))}
            </div>
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
