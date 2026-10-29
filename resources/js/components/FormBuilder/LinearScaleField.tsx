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

export default function LinearScaleField({
    field,
    value,
    onChange,
    error,
    disabled = false,
}: Props) {
    const min = field.scaleMin ?? 1;
    const max = field.scaleMax ?? 5;
    const scaleValues = Array.from(
        { length: max - min + 1 },
        (_, index) => min + index,
    );

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
                value={typeof value === 'number' ? String(value) : ''}
                onValueChange={(newValue) => onChange(Number(newValue))}
                disabled={disabled}
                required={field.validation?.required}
                aria-invalid={error ? 'true' : 'false'}
                aria-describedby={error ? `${field.id}-error` : undefined}
            >
                <div className="flex flex-col space-y-3">
                    {field.scaleMinLabel ? (
                        <p className="text-sm text-muted-foreground">
                            {field.scaleMinLabel}
                        </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-4">
                        {scaleValues.map((scaleValue) => (
                            <div
                                key={scaleValue}
                                className="flex flex-col items-center space-y-1"
                            >
                                <RadioGroupItem
                                    value={String(scaleValue)}
                                    id={`${field.id}-${scaleValue}`}
                                />
                                <Label
                                    htmlFor={`${field.id}-${scaleValue}`}
                                    className="cursor-pointer text-sm font-normal"
                                >
                                    {scaleValue}
                                </Label>
                            </div>
                        ))}
                    </div>
                    {field.scaleMaxLabel ? (
                        <p className="text-sm text-muted-foreground">
                            {field.scaleMaxLabel}
                        </p>
                    ) : null}
                </div>
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
