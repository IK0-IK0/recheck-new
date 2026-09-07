import { Edit3, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ActionComponent({
    action,
    onEdit,
    onDelete,
}) {
    const roles = action.roles ?? [];

    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p className="text-sm font-semibold text-foreground">{action.name}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground capitalize">{action.action_type || 'check'}</span>
                    <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground">
                        {action.requires_file ? 'File required' : 'No file required'}
                    </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{action.description || 'No description'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Users className="size-3.5 shrink-0 text-muted-foreground" />
                    {roles.length ? (
                        roles.map((role) => (
                            <span key={role.id} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {role.name}
                            </span>
                        ))
                    ) : (
                        <span className="text-xs text-muted-foreground">No roles assigned</span>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={onEdit} type="button" aria-label="Edit action">
                    <Edit3 className="size-4" />
                </Button>
                <Button variant="destructive" size="sm" onClick={onDelete} type="button" aria-label="Delete action">
                    <Trash2 className="size-4" />
                </Button>
            </div>
        </div>
    );
}
