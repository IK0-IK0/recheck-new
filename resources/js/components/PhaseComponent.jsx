import { ChevronDown, ChevronUp, Plus, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DraggableActionsList from '@/components/DraggableActionsList';

export default function PhaseComponent({
    phase,
    expanded = false,
    onToggle,
    onAddAction,
    onEdit,
    onDelete,
    onActionEdit,
    onActionDelete,
    onActionReorder,
}) {
    return (
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={onToggle}
                        className="inline-flex items-center gap-2 text-left text-base font-semibold text-foreground"
                    >
                        <span>{phase.name}</span>
                        {expanded ? (
                            <ChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                            <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                    </button>
                    <p className="text-sm text-muted-foreground">{phase.actions?.length ?? 0} actions</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={onAddAction} type="button">
                        <Plus className="size-4" /> Add action
                    </Button>
                    <Button variant="secondary" size="sm" onClick={onEdit} type="button">
                        <Edit3 className="size-4" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={onDelete} type="button">
                        <Trash2 className="size-4" /> Delete
                    </Button>
                </div>
            </div>

            {expanded ? (
                <div className="mt-4 space-y-3">
                    <DraggableActionsList
                        actions={phase.actions ?? []}
                        onReorder={onActionReorder}
                        onEdit={onActionEdit}
                        onDelete={onActionDelete}
                    />
                </div>
            ) : null}
        </div>
    );
}
