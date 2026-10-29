import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    GripVertical,
    Plus,
    Settings,
    Trash2,
    ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import FormFieldEditor from './FormFieldEditor';
import FormFieldPreview from './FormFieldPreview';
import type { FormField } from './FormFieldTypes';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Props = {
    fields: FormField[];
    onChange: (fields: FormField[]) => void;
    disabled?: boolean;
};

const FIELD_TYPES = [
    { type: 'short_text' as const, label: 'Short Answer', icon: '—' },
    { type: 'long_text' as const, label: 'Paragraph', icon: '☰' },
    { type: 'multiple_choice' as const, label: 'Multiple Choice', icon: '◉' },
    { type: 'checkboxes' as const, label: 'Checkboxes', icon: '☑' },
    { type: 'dropdown' as const, label: 'Dropdown', icon: '▼' },
    { type: 'linear_scale' as const, label: 'Linear Scale', icon: '———' },
    { type: 'date' as const, label: 'Date', icon: '📅' },
    { type: 'time' as const, label: 'Time', icon: '🕐' },
    { type: 'file_upload' as const, label: 'File Upload', icon: '📎' },
    { type: 'signature' as const, label: 'Signature', icon: '✍' },
];

export default function FormMaker({ fields, onChange, disabled = false }: Props) {
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const generateFieldId = (): string => {
        return `field_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    };

    const createNewField = (type: FormField['type']): FormField => {
        const baseField: FormField = {
            id: generateFieldId(),
            type,
            label: 'Untitled Question',
            validation: {},
        };

        // Add default options for choice-based fields
        if (type === 'multiple_choice' || type === 'checkboxes' || type === 'dropdown') {
            baseField.options = [
                { id: 'opt1', label: 'Option 1', value: 'option1' },
            ];
        }

        // Add default scale for linear scale
        if (type === 'linear_scale') {
            baseField.scaleMin = 1;
            baseField.scaleMax = 5;
            baseField.scaleMinLabel = 'Not at all';
            baseField.scaleMaxLabel = 'Extremely';
        }

        return baseField;
    };

    const handleAddField = (type: FormField['type']) => {
        const newField = createNewField(type);
        onChange([...fields, newField]);
        setEditingFieldId(newField.id);
    };

    const handleUpdateField = (updatedField: FormField) => {
        onChange(fields.map((field) => (field.id === updatedField.id ? updatedField : field)));
    };

    const handleDeleteField = (fieldId: string) => {
        onChange(fields.filter((field) => field.id !== fieldId));
        if (editingFieldId === fieldId) {
            setEditingFieldId(null);
        }
        toast.success('Field deleted');
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (event: React.DragEvent, index: number) => {
        event.preventDefault();
        setDragOverIndex(index);
    };

    const handleDrop = (event: React.DragEvent, dropIndex: number) => {
        event.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const newFields = [...fields];
        const [draggedField] = newFields.splice(draggedIndex, 1);
        newFields.splice(dropIndex, 0, draggedField);

        onChange(newFields);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const editingField = fields.find((field) => field.id === editingFieldId);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold">Form Fields</h3>
                    <p className="text-xs text-muted-foreground">
                        Add, edit, and reorder form fields
                    </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="sm" disabled={disabled}>
                            <Plus className="mr-1.5 size-4" />
                            Add Field
                            <ChevronDown className="ml-1.5 size-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        {FIELD_TYPES.map((fieldType) => (
                            <DropdownMenuItem
                                key={fieldType.type}
                                onClick={() => handleAddField(fieldType.type)}
                            >
                                <span className="mr-3 text-lg">{fieldType.icon}</span>
                                {fieldType.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {fields.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-border bg-muted/50 p-12 text-center">
                    <p className="text-sm text-muted-foreground">
                        No fields added yet. Click "Add Field" to get started.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div
                            key={field.id}
                            draggable={!disabled}
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(event) => handleDragOver(event, index)}
                            onDrop={(event) => handleDrop(event, index)}
                            onDragEnd={handleDragEnd}
                            className={`group relative rounded-lg border bg-card transition-all ${
                                draggedIndex === index
                                    ? 'opacity-50'
                                    : dragOverIndex === index
                                      ? 'border-primary ring-2 ring-primary/20'
                                      : 'border-border hover:border-primary/50'
                            }`}
                        >
                            <div className="flex items-start gap-3 p-4">
                                <button
                                    type="button"
                                    className="mt-1 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                                    disabled={disabled}
                                    aria-label="Drag to reorder"
                                >
                                    <GripVertical className="size-5" />
                                </button>

                                <div className="min-w-0 flex-1">
                                    <FormFieldPreview field={field} />
                                </div>

                                <div className="flex shrink-0 items-center gap-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setEditingFieldId(field.id)}
                                        disabled={disabled}
                                        className="size-8"
                                        aria-label="Edit field"
                                    >
                                        <Settings className="size-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteField(field.id)}
                                        disabled={disabled}
                                        className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        aria-label="Delete field"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={editingField !== undefined} onOpenChange={(open) => !open && setEditingFieldId(null)}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Field</DialogTitle>
                        <DialogDescription>
                            Configure the field properties, validation, and options
                        </DialogDescription>
                    </DialogHeader>
                    {editingField ? (
                        <FormFieldEditor
                            field={editingField}
                            onChange={handleUpdateField}
                        />
                    ) : null}
                    <DialogFooter>
                        <Button
                            type="button"
                            onClick={() => setEditingFieldId(null)}
                        >
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
