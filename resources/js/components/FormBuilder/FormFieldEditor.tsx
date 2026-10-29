import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { FormField, FormFieldOption } from './FormFieldTypes';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type Props = {
    field: FormField;
    onChange: (field: FormField) => void;
};

export default function FormFieldEditor({ field, onChange }: Props) {
    const [draggedOptionIndex, setDraggedOptionIndex] = useState<number | null>(null);
    const [dragOverOptionIndex, setDragOverOptionIndex] = useState<number | null>(null);

    const hasOptions = ['multiple_choice', 'checkboxes', 'dropdown'].includes(field.type);
    const isScaleField = field.type === 'linear_scale';
    const isDateTimeField = field.type === 'date' || field.type === 'time';
    const isFileUploadField = field.type === 'file_upload';

    const handleLabelChange = (label: string) => {
        onChange({ ...field, label });
    };

    const handleDescriptionChange = (description: string) => {
        onChange({ ...field, description });
    };

    const handlePlaceholderChange = (placeholder: string) => {
        onChange({ ...field, placeholder });
    };

    const handleRequiredChange = (required: boolean) => {
        onChange({
            ...field,
            validation: { ...field.validation, required },
        });
    };

    const handleAddOption = () => {
        const newOptionNumber = (field.options?.length ?? 0) + 1;
        const newOption: FormFieldOption = {
            id: `opt${Date.now()}`,
            label: `Option ${newOptionNumber}`,
            value: `option${newOptionNumber}`,
        };

        onChange({
            ...field,
            options: [...(field.options ?? []), newOption],
        });
    };

    const handleUpdateOption = (optionId: string, updates: Partial<FormFieldOption>) => {
        onChange({
            ...field,
            options: field.options?.map((opt) =>
                opt.id === optionId ? { ...opt, ...updates } : opt,
            ),
        });
    };

    const handleDeleteOption = (optionId: string) => {
        onChange({
            ...field,
            options: field.options?.filter((opt) => opt.id !== optionId),
        });
    };

    const handleOptionDragStart = (index: number) => {
        setDraggedOptionIndex(index);
    };

    const handleOptionDragOver = (event: React.DragEvent, index: number) => {
        event.preventDefault();
        setDragOverOptionIndex(index);
    };

    const handleOptionDrop = (event: React.DragEvent, dropIndex: number) => {
        event.preventDefault();

        if (draggedOptionIndex === null || draggedOptionIndex === dropIndex || !field.options) {
            setDraggedOptionIndex(null);
            setDragOverOptionIndex(null);
            return;
        }

        const newOptions = [...field.options];
        const [draggedOption] = newOptions.splice(draggedOptionIndex, 1);
        newOptions.splice(dropIndex, 0, draggedOption);

        onChange({ ...field, options: newOptions });
        setDraggedOptionIndex(null);
        setDragOverOptionIndex(null);
    };

    const handleOptionDragEnd = () => {
        setDraggedOptionIndex(null);
        setDragOverOptionIndex(null);
    };

    return (
        <div className="space-y-6">
            {/* Basic Properties */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="field-label">Question Label *</Label>
                    <Input
                        id="field-label"
                        value={field.label}
                        onChange={(event) => handleLabelChange(event.target.value)}
                        placeholder="Enter your question"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="field-description">Description (optional)</Label>
                    <Textarea
                        id="field-description"
                        value={field.description ?? ''}
                        onChange={(event) => handleDescriptionChange(event.target.value)}
                        placeholder="Add a description or help text"
                        rows={2}
                    />
                </div>

                {(field.type === 'short_text' || field.type === 'long_text') ? (
                    <div className="space-y-2">
                        <Label htmlFor="field-placeholder">Placeholder (optional)</Label>
                        <Input
                            id="field-placeholder"
                            value={field.placeholder ?? ''}
                            onChange={(event) => handlePlaceholderChange(event.target.value)}
                            placeholder="Your answer"
                        />
                    </div>
                ) : null}
            </div>

            {/* Options Editor for Multiple Choice, Checkboxes, Dropdown */}
            {hasOptions ? (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Options</Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddOption}
                        >
                            <Plus className="mr-1.5 size-3.5" />
                            Add Option
                        </Button>
                    </div>

                    {field.options && field.options.length > 0 ? (
                        <div className="space-y-2">
                            {field.options.map((option, index) => (
                                <div
                                    key={option.id}
                                    draggable
                                    onDragStart={() => handleOptionDragStart(index)}
                                    onDragOver={(event) => handleOptionDragOver(event, index)}
                                    onDrop={(event) => handleOptionDrop(event, index)}
                                    onDragEnd={handleOptionDragEnd}
                                    className={`flex items-center gap-2 rounded-md border bg-background p-2 transition-all ${
                                        draggedOptionIndex === index
                                            ? 'opacity-50'
                                            : dragOverOptionIndex === index
                                              ? 'border-primary ring-2 ring-primary/20'
                                              : 'border-border'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                                        aria-label="Drag to reorder"
                                    >
                                        <GripVertical className="size-4" />
                                    </button>

                                    <Input
                                        value={option.label}
                                        onChange={(event) =>
                                            handleUpdateOption(option.id, {
                                                label: event.target.value,
                                            })
                                        }
                                        placeholder={`Option ${index + 1}`}
                                        className="flex-1"
                                    />

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteOption(option.id)}
                                        disabled={field.options?.length === 1}
                                        className="size-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        aria-label="Delete option"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No options added yet.
                        </p>
                    )}
                </div>
            ) : null}

            {/* Linear Scale Configuration */}
            {isScaleField ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="scale-min">Minimum Value</Label>
                            <Input
                                id="scale-min"
                                type="number"
                                value={field.scaleMin ?? 1}
                                onChange={(event) =>
                                    onChange({
                                        ...field,
                                        scaleMin: Number(event.target.value),
                                    })
                                }
                                min={0}
                                max={10}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="scale-max">Maximum Value</Label>
                            <Input
                                id="scale-max"
                                type="number"
                                value={field.scaleMax ?? 5}
                                onChange={(event) =>
                                    onChange({
                                        ...field,
                                        scaleMax: Number(event.target.value),
                                    })
                                }
                                min={1}
                                max={10}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="scale-min-label">Min Label (optional)</Label>
                            <Input
                                id="scale-min-label"
                                value={field.scaleMinLabel ?? ''}
                                onChange={(event) =>
                                    onChange({
                                        ...field,
                                        scaleMinLabel: event.target.value,
                                    })
                                }
                                placeholder="e.g., Not at all"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="scale-max-label">Max Label (optional)</Label>
                            <Input
                                id="scale-max-label"
                                value={field.scaleMaxLabel ?? ''}
                                onChange={(event) =>
                                    onChange({
                                        ...field,
                                        scaleMaxLabel: event.target.value,
                                    })
                                }
                                placeholder="e.g., Extremely"
                            />
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Date/Time Auto-fill Option */}
            {isDateTimeField ? (
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="auto-fill"
                        checked={field.defaultValue === 'auto'}
                        onCheckedChange={(checked) =>
                            onChange({
                                ...field,
                                defaultValue: checked ? 'auto' : undefined,
                            })
                        }
                    />
                    <Label htmlFor="auto-fill" className="cursor-pointer font-normal">
                        Auto-fill with current {field.type === 'date' ? 'date' : 'time'}
                    </Label>
                </div>
            ) : null}

            {/* File Upload Configuration */}
            {isFileUploadField ? (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="file-types">Accepted File Types (optional)</Label>
                        <Input
                            id="file-types"
                            value={field.validation?.fileTypes?.join(', ') ?? ''}
                            onChange={(event) =>
                                onChange({
                                    ...field,
                                    validation: {
                                        ...field.validation,
                                        fileTypes: event.target.value
                                            ? event.target.value.split(',').map((t) => t.trim())
                                            : undefined,
                                    },
                                })
                            }
                            placeholder=".pdf, .doc, .docx"
                        />
                        <p className="text-xs text-muted-foreground">
                            Comma-separated file extensions
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="max-file-size">Max File Size (MB)</Label>
                        <Input
                            id="max-file-size"
                            type="number"
                            value={
                                field.validation?.maxFileSize
                                    ? field.validation.maxFileSize / 1024 / 1024
                                    : 10
                            }
                            onChange={(event) =>
                                onChange({
                                    ...field,
                                    validation: {
                                        ...field.validation,
                                        maxFileSize:
                                            Number(event.target.value) * 1024 * 1024,
                                    },
                                })
                            }
                            min={1}
                            max={100}
                            step={0.1}
                        />
                    </div>
                </div>
            ) : null}

            {/* Text Field Validation */}
            {(field.type === 'short_text' || field.type === 'long_text') ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="min-length">Min Length (optional)</Label>
                            <Input
                                id="min-length"
                                type="number"
                                value={field.validation?.minLength ?? ''}
                                onChange={(event) =>
                                    onChange({
                                        ...field,
                                        validation: {
                                            ...field.validation,
                                            minLength: event.target.value
                                                ? Number(event.target.value)
                                                : undefined,
                                        },
                                    })
                                }
                                min={0}
                                placeholder="No minimum"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="max-length">Max Length (optional)</Label>
                            <Input
                                id="max-length"
                                type="number"
                                value={field.validation?.maxLength ?? ''}
                                onChange={(event) =>
                                    onChange({
                                        ...field,
                                        validation: {
                                            ...field.validation,
                                            maxLength: event.target.value
                                                ? Number(event.target.value)
                                                : undefined,
                                        },
                                    })
                                }
                                min={1}
                                placeholder="No maximum"
                            />
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Required Toggle */}
            <div className="flex items-center space-x-2 rounded-lg border border-border bg-muted/50 p-3">
                <Checkbox
                    id="required"
                    checked={field.validation?.required ?? false}
                    onCheckedChange={handleRequiredChange}
                />
                <Label htmlFor="required" className="cursor-pointer font-normal">
                    Required field
                </Label>
            </div>
        </div>
    );
}
