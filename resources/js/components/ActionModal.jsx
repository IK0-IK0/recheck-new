import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronUp, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

const defaultActionInitialValues = {
    name: '',
    description: '',
    action_type: 'review',
    requires_file: false,
    document_ids: [],
    roles: [],
    reviewer_groups: [],
};

const createReviewerGroup = (number = 1) => ({
    id: `reviewer-group-${Date.now()}-${number}`,
    name: `Review group ${number}`,
    roleIds: [],
    documentIds: [],
});

function SearchableMultiSelect({ label, items, selectedIds, onToggle, placeholder = 'Select items', openDirection = 'down', singleSelect = false }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState(null);
    const selectedItems = items.filter((item) => selectedIds.includes(item.id));
    const filteredItems = items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
    const selectionLabel = singleSelect
        ? selectedItems[0]?.name ?? placeholder
        : selectedItems.length ? `${selectedItems.length} selected` : placeholder;

    const updateMenuPosition = () => {
        const trigger = triggerRef.current;
        const dialogContainer = containerRef.current?.closest('[data-slot="dialog-content"]');

        if (!trigger || !dialogContainer) {
            return;
        }

        const rect = trigger.getBoundingClientRect();
        const containerRect = dialogContainer.getBoundingClientRect();
        setMenuPosition(openDirection === 'up'
            ? {
                bottom: containerRect.bottom - rect.top + 4,
                left: rect.left - containerRect.left,
                width: rect.width,
            }
            : {
                top: rect.bottom - containerRect.top + 4,
                left: rect.left - containerRect.left,
                width: rect.width,
            });
    };

    useEffect(() => {
        if (!open) {
            setMenuPosition(null);
            return;
        }

        updateMenuPosition();

        const handlePointerDown = (event) => {
            const eventPath = event.composedPath?.() ?? [];
            const isInsidePicker = containerRef.current?.contains(event.target)
                || menuRef.current?.contains(event.target)
                || eventPath.includes(menuRef.current);

            if (!isInsidePicker) {
                setOpen(false);
            }
        };
        const handleViewportChange = () => updateMenuPosition();

        document.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('scroll', handleViewportChange, true);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('scroll', handleViewportChange, true);
        };
    }, [open, openDirection]);

    return (
        <div ref={containerRef} className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(!open)}
                aria-label={label}
                className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-xs outline-none transition hover:border-ring focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                aria-expanded={open}
            >
                <span className={selectedItems.length ? 'truncate text-foreground' : 'text-muted-foreground'}>
                    {selectionLabel}
                </span>
                {openDirection === 'up' ? (
                    <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                )}
            </button>
            {open && menuPosition && typeof document !== 'undefined' ? createPortal(
                <div
                    ref={menuRef}
                    style={menuPosition}
                    onPointerDown={(event) => event.stopPropagation()}
                    onMouseDown={(event) => event.stopPropagation()}
                    className="absolute z-[100] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
                >
                    <div className="flex items-center gap-2 border-b border-border px-3">
                        <Search className="size-4 shrink-0 text-muted-foreground" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search..."
                            className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                    </div>
                    <div className="action-picker-scrollbar h-24 overflow-y-scroll py-1 pr-2">
                        {filteredItems.length ? filteredItems.map((item) => {
                            const selected = selectedIds.includes(item.id);

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        onToggle(item.id);
                                        if (singleSelect) {
                                            setOpen(false);
                                        }
                                    }}
                                    className="flex w-full items-center gap-2 rounded-sm px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                >
                                    <span className={`flex size-4 items-center justify-center rounded-sm border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}>
                                        {selected ? <Check className="size-3" /> : null}
                                    </span>
                                    <span className="truncate">{item.name}</span>
                                </button>
                            );
                        }) : (
                            <p className="px-2 py-3 text-sm text-muted-foreground">No matches found.</p>
                        )}
                    </div>
                </div>,
                containerRef.current?.closest('[data-slot="dialog-content"]')
                    ?? document.fullscreenElement
                    ?? document.body
            ) : null}
        </div>
    );
}

export default function ActionModal({
    title = 'Create action',
    description = 'Add or edit an action within a phase.',
    trigger,
    open,
    onOpenChange,
    submitLabel = 'Save',
    initialValues = defaultActionInitialValues,
    roles = [],
    documents = [],
    onSubmit,
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({ name: '' });
    const [processing, setProcessing] = useState(false);

    const dialogOpen = open === undefined ? internalOpen : open;
    const setDialogOpen = onOpenChange ?? setInternalOpen;

    useEffect(() => {
        if (!dialogOpen) {
            return;
        }

        setValues({
            ...defaultActionInitialValues,
            ...initialValues,
            roles: initialValues.roles ?? [],
            document_ids: initialValues.document_ids ?? [],
            reviewer_groups: initialValues.reviewer_groups?.length
                ? initialValues.reviewer_groups
                : [createReviewerGroup()],
        });
        setErrors({ name: '' });
    }, [dialogOpen]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!values.name.trim()) {
            setErrors({ name: 'Action name is required.' });
            return;
        }

        setProcessing(true);

        try {
            const submissionValues = { ...values };
            delete submissionValues.reviewer_groups;
            const { roles: selectedRoles, ...rest } = submissionValues;
            await onSubmit?.({ ...rest, role_ids: selectedRoles });
            setDialogOpen(false);
        } finally {
            setProcessing(false);
        }
    };

    const toggleDocument = (documentId) => {
        const nextDocumentIds = values.document_ids.includes(documentId)
            ? values.document_ids.filter((item) => item !== documentId)
            : [...values.document_ids, documentId];

        setValues({ ...values, document_ids: nextDocumentIds });
    };

    const addReviewerGroup = () => {
        setValues({
            ...values,
            reviewer_groups: [
                ...values.reviewer_groups,
                    createReviewerGroup(values.reviewer_groups.length + 1),
            ],
        });
    };

    const updateReviewerGroup = (groupId, updates) => {
        setValues({
            ...values,
            reviewer_groups: values.reviewer_groups.map((group) => (
                group.id === groupId ? { ...group, ...updates } : group
            )),
        });
    };

    const removeReviewerGroup = (groupId) => {
        setValues({
            ...values,
            reviewer_groups: values.reviewer_groups.filter((group) => group.id !== groupId),
        });
    };

    const toggleGroupDocument = (group, documentId) => {
        const documentIds = group.documentIds.includes(documentId)
            ? group.documentIds.filter((item) => item !== documentId)
            : [...group.documentIds, documentId];

        updateReviewerGroup(group.id, { documentIds });
    };

    return (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {trigger ? (
                <DialogTrigger asChild>{trigger}</DialogTrigger>
            ) : open === undefined ? (
                <DialogTrigger asChild>
                    <Button type="button">{title}</Button>
                </DialogTrigger>
            ) : null}
            <DialogContent
                container={typeof document !== 'undefined' ? document.fullscreenElement ?? undefined : undefined}
                className="max-h-[calc(100vh-2rem)] overflow-hidden sm:max-w-2xl"
            >
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <form className="space-y-4 pr-1" onSubmit={handleSubmit}>
                    <div className="grid gap-2">
                        <Label htmlFor="action-name">Name</Label>
                        <Input
                            id="action-name"
                            value={values.name}
                            onChange={(event) => setValues({ ...values, name: event.target.value })}
                            placeholder="Action name"
                        />
                        {errors.name ? (
                            <p className="text-sm text-destructive">{errors.name}</p>
                        ) : null}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="action-description">Description</Label>
                        <textarea
                            id="action-description"
                            value={values.description}
                            onChange={(event) => setValues({ ...values, description: event.target.value })}
                            className="min-h-20 max-h-28 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-ring/50"
                            placeholder="Optional description"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="action-type">Action type</Label>
                        <Select
                            value={values.action_type ?? 'review'}
                            onValueChange={(actionType) => setValues({
                                ...values,
                                action_type: actionType,
                                requires_file: actionType === 'submit',
                            })}
                        >
                            <SelectTrigger id="action-type" className="w-full">
                                <SelectValue placeholder="Select action type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="review">Review</SelectItem>
                                <SelectItem value="submit">Submit</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {values.action_type === 'submit' ? (
                        <div className="grid gap-2">
                            <Label>Required documents</Label>
                            <SearchableMultiSelect
                                label="Required documents"
                                items={documents}
                                selectedIds={values.document_ids}
                                onToggle={toggleDocument}
                                placeholder="Choose optional documents"
                                openDirection="up"
                            />
                        </div>
                    ) : null}

                    {values.action_type === 'review' ? (
                        <div className="action-picker-scrollbar grid max-h-[55vh] gap-4 overflow-y-auto rounded-lg border border-border bg-muted/20 p-4 pr-3">
                            <div className="grid gap-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <Label>Reviewer groups</Label>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        onClick={addReviewerGroup}
                                        aria-label="Add reviewer group"
                                        title="Add reviewer group"
                                    >
                                        <Plus className="size-4" />
                                    </Button>
                                </div>
                                {values.reviewer_groups.length ? (
                                    <div className="grid max-h-96 gap-3 overflow-y-auto pr-1">
                                        {values.reviewer_groups.map((group, index) => (
                                            <div key={group.id} className="grid gap-3 rounded-md border border-border bg-background p-3">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={group.name}
                                                        onChange={(event) => updateReviewerGroup(group.id, { name: event.target.value })}
                                                        aria-label={`Reviewer group ${index + 1} name`}
                                                        className="h-8"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeReviewerGroup(group.id)}
                                                        aria-label={`Remove ${group.name}`}
                                                        title="Remove reviewer group"
                                                        className="border border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                                <div className="grid gap-3 md:grid-cols-2">
                                                    <div className="grid gap-2">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</p>
                                                        <SearchableMultiSelect
                                                            label="Interchangeable roles"
                                                            items={roles}
                                                            selectedIds={group.roleIds}
                                                            onToggle={(roleId) => updateReviewerGroup(group.id, {
                                                                roleIds: group.roleIds.includes(roleId) ? [] : [roleId],
                                                            })}
                                                            placeholder="Choose interchangeable roles"
                                                            openDirection="up"
                                                            singleSelect
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documents</p>
                                                        <SearchableMultiSelect
                                                            label="Documents for this group"
                                                            items={documents}
                                                            selectedIds={group.documentIds}
                                                            onToggle={(documentId) => toggleGroupDocument(group, documentId)}
                                                            placeholder="Choose optional documents"
                                                            openDirection="up"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                                        Add a reviewer group, then choose interchangeable staff roles. Assigning documents is optional.
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary" type="button">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button type="submit" disabled={processing}>
                            {submitLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
