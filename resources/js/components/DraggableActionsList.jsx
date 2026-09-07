import { useState, useEffect, useRef } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import ActionComponent from '@/components/ActionComponent';

function SortableActionItem({
    action,
    onEdit,
    onDelete,
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
        isOver,
    } = useSortable({ id: action.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="relative">
            {/* Drop indicator */}
            {isOver && !isDragging && (
                <div className="absolute inset-x-0 -top-2 h-1 rounded-full bg-primary" />
            )}
            
            <div className="flex items-stretch gap-2">
                {/* Drag handle - spans full height */}
                <button
                    type="button"
                    className="flex cursor-grab touch-none items-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    {...attributes}
                    {...listeners}
                    aria-label="Drag to reorder"
                >
                    <GripVertical className="size-5" />
                </button>

                {/* Action component */}
                <div className="flex-1">
                    <ActionComponent
                        action={action}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                </div>
            </div>
        </div>
    );
}

export default function DraggableActionsList({
    actions = [],
    onReorder,
    onEdit,
    onDelete,
}) {
    // Use local state for optimistic updates
    const [localActions, setLocalActions] = useState(actions);
    const isDraggingRef = useRef(false);
    const hasReorderedRef = useRef(false);

    // Sync with server data, but not immediately after a reorder
    useEffect(() => {
        if (!isDraggingRef.current && !hasReorderedRef.current) {
            setLocalActions(actions);
        }
        // Clear the flag after server data arrives
        if (hasReorderedRef.current) {
            // Check if server data matches our optimistic update
            const serverIds = actions.map(a => a.id).join(',');
            const localIds = localActions.map(a => a.id).join(',');
            if (serverIds === localIds) {
                hasReorderedRef.current = false;
            }
        }
    }, [actions]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px of movement before activating
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = () => {
        isDraggingRef.current = true;
    };

    const handleDragEnd = (event) => {
        isDraggingRef.current = false;
        
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = localActions.findIndex((action) => action.id === active.id);
            const newIndex = localActions.findIndex((action) => action.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const reorderedActions = arrayMove(localActions, oldIndex, newIndex);
                
                // Mark that we just reordered
                hasReorderedRef.current = true;
                
                // Update local state immediately
                setLocalActions(reorderedActions);
                
                // Notify parent (which will sync to server)
                onReorder(reorderedActions);
            }
        }
    };

    if (!localActions.length) {
        return (
            <div className="rounded-xl border border-dashed border-border bg-muted p-4 text-sm text-muted-foreground">
                No actions yet.
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={localActions.map((action) => action.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-3">
                    {localActions.map((action, index) => (
                        <SortableActionItem
                            key={action.id}
                            action={action}
                            onEdit={() => onEdit(action)}
                            onDelete={() => onDelete(action)}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
