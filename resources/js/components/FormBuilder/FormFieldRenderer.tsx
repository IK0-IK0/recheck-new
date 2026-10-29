import CheckboxesField from './CheckboxesField';
import DateField from './DateField';
import DropdownField from './DropdownField';
import FileUploadField from './FileUploadField';
import LinearScaleField from './LinearScaleField';
import LongTextField from './LongTextField';
import MultipleChoiceField from './MultipleChoiceField';
import ShortTextField from './ShortTextField';
import SignatureField from './SignatureField';
import TimeField from './TimeField';
import type { FormField, FormFieldValue } from './FormFieldTypes';

type Props = {
    field: FormField;
    value: FormFieldValue;
    onChange: (value: FormFieldValue) => void;
    error?: string;
    disabled?: boolean;
};

export default function FormFieldRenderer({
    field,
    value,
    onChange,
    error,
    disabled = false,
}: Props) {
    switch (field.type) {
        case 'short_text':
            return (
                <ShortTextField
                    field={field}
                    value={value}
                    onChange={onChange}
                    error={error}
                    disabled={disabled}
                />
            );
        case 'long_text':
            return (
                <LongTextField
                    field={field}
                    value={value}
                    onChange={onChange}
                    error={error}
                    disabled={disabled}
                />
            );
        case 'multiple_choice':
            return (
                <MultipleChoiceField
                    field={field}
                    value={value}
                    onChange={onChange}
                    error={error}
                    disabled={disabled}
                />
            );
        case 'checkboxes':
            return (
                <CheckboxesField
                    field={field}
                    value={value}
                    onChange={onChange}
                    error={error}
                    disabled={disabled}
                />
            );
        case 'dropdown':
            return (
                <DropdownField
                    field={field}
                    value={value}
                    onChange={onChange}
                    error={error}
                    disabled={disabled}
                />
            );
        case 'linear_scale':
            return (
                <LinearScaleField
                    field={field}
                    value={value}
                    onChange={onChange}
                    error={error}
                    disabled={disabled}
                />
            );
        case 'date':
            return (
                <DateField
                    field={field}
                    value={value}
                    onChange={onChange}
                    error={error}
                    disabled={disabled}
                />
            );
        case 'time':
            return (
                <TimeField
                    field={field}
                    value={value}
                    onChange={onChange}
                    error={error}
                    disabled={disabled}
                />
            );
        case 'file_upload':
            return (
                <FileUploadField
                    field={field}
                    value={value}
                    onChange={onChange}
                    error={error}
                    disabled={disabled}
                />
            );
        case 'signature':
            return (
                <SignatureField
                    field={field}
                    value={value}
                    onChange={onChange}
                    error={error}
                    disabled={disabled}
                />
            );
        default:
            return (
                <div className="text-sm text-muted-foreground">
                    Unsupported field type: {field.type}
                </div>
            );
    }
}
