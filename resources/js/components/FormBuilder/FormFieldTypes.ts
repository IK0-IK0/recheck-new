export type FormFieldType =
    | 'short_text'
    | 'long_text'
    | 'multiple_choice'
    | 'checkboxes'
    | 'dropdown'
    | 'linear_scale'
    | 'date'
    | 'time'
    | 'file_upload'
    | 'signature';

export type FormFieldOption = {
    id: string;
    label: string;
    value: string;
};

export type FormFieldValidation = {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    fileTypes?: string[];
    maxFileSize?: number;
};

export type FormField = {
    id: string;
    type: FormFieldType;
    label: string;
    description?: string;
    placeholder?: string;
    options?: FormFieldOption[];
    validation?: FormFieldValidation;
    defaultValue?: string | string[] | number;
    scaleMin?: number;
    scaleMax?: number;
    scaleMinLabel?: string;
    scaleMaxLabel?: string;
};

export type SavedFormFile = {
    document_id: number;
    name: string;
};

export type FormFieldValue = string | string[] | number | File | SavedFormFile | null;
