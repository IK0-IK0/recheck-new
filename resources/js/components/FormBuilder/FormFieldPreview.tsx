import { Badge } from '@/components/ui/badge';
import type { FormField } from './FormFieldTypes';

type Props = {
    field: FormField;
};

const FIELD_TYPE_LABELS: Record<FormField['type'], string> = {
    short_text: 'Short Answer',
    long_text: 'Paragraph',
    multiple_choice: 'Multiple Choice',
    checkboxes: 'Checkboxes',
    dropdown: 'Dropdown',
    linear_scale: 'Linear Scale',
    date: 'Date',
    time: 'Time',
    file_upload: 'File Upload',
    signature: 'Signature',
};

export default function FormFieldPreview({ field }: Props) {
    return (
        <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-medium">
                        {field.label}
                        {field.validation?.required ? (
                            <span className="ml-1 text-destructive">*</span>
                        ) : null}
                    </h4>
                    {field.description ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {field.description}
                        </p>
                    ) : null}
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                    {FIELD_TYPE_LABELS[field.type]}
                </Badge>
            </div>

            {field.options && field.options.length > 0 ? (
                <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Options:</span>{' '}
                    {field.options.map((opt) => opt.label).join(', ')}
                </div>
            ) : null}

            {field.type === 'linear_scale' ? (
                <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Scale:</span> {field.scaleMin} to{' '}
                    {field.scaleMax}
                    {field.scaleMinLabel || field.scaleMaxLabel ? (
                        <span>
                            {' '}
                            ({field.scaleMinLabel} — {field.scaleMaxLabel})
                        </span>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
