import { Plus, Edit2, Trash2, ChevronRight, Form, PersonStanding, User } from 'lucide-react';
import { ActionBadge } from './ActionComponents';
import {
    FileText,
    File,
    Split,
    ArrowRight,
    CheckCircle2,
    Check
} from 'lucide-react';

export default function Phase({ 
    phase, 
    phaseIndex, 
    isExpanded, 
    onToggle, 
    onEditPhase,
    onDeletePhase,
    onAddAction, 
    onEditAction, 
    onDeleteAction, 
    onMoveUp, 
    onMoveDown, 
    canMoveUp, 
    canMoveDown, 
    onMoveActionUp, 
    onMoveActionDown, 
    processId, 
    isLoadingAction = false, 
    isReorderingPhases = false, 
    isReorderingActions = false, 
    isSavingPhase = false, 
    isDeletingAction = false,
    isDeletingPhase = false,
    availableDocuments = []
}) {
    return (
        <div className="border-l-4 border-primary pl-6 py-4">
            <div className="flex items-center justify-between cursor-pointer hover:opacity-80 transition" onClick={() => onToggle()}>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">Phase {phaseIndex + 1}: {phase.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveUp();
                        }}
                        disabled={!canMoveUp || isReorderingPhases}
                        className={`p-1.5 rounded-lg transition ${canMoveUp && !isReorderingPhases
                            ? 'hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer'
                            : 'text-muted-foreground/30 cursor-not-allowed'
                            }`}
                        title="Move phase up"
                    >
                        <ChevronRight className="w-4 h-4 rotate-[-90deg]" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMoveDown();
                        }}
                        disabled={!canMoveDown || isReorderingPhases}
                        className={`p-1.5 rounded-lg transition ${canMoveDown && !isReorderingPhases
                            ? 'hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer'
                            : 'text-muted-foreground/30 cursor-not-allowed'
                            }`}
                        title="Move phase down"
                    >
                        <ChevronRight className="w-4 h-4 rotate-90" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEditPhase(phase);
                        }}
                        disabled={isSavingPhase}
                        className={`p-1.5 rounded-lg transition ${isSavingPhase
                            ? 'text-muted-foreground/30 cursor-not-allowed'
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer'
                            }`}
                        title="Edit Phase"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeletePhase(phase.id);
                        }}
                        disabled={isDeletingPhase}
                        className={`p-1.5 rounded-lg transition ${isDeletingPhase
                            ? 'text-muted-foreground/30 cursor-not-allowed'
                            : 'hover:bg-muted text-muted-foreground hover:text-red-600 cursor-pointer'
                            }`}
                        title="Delete Phase"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform duration-700 ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
            </div>

            <div 
                className={`grid transition-all duration-[1200ms] ease-in-out ${
                    isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                <div className="overflow-hidden">
                    <div className="mt-4 space-y-3">
                        {phase.actions.map((action, actionIndex) => (
                        <div key={actionIndex} className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition">
                            <div className="flex items-start">
                                <div className="flex-10 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ActionBadge type={action.type} />
                                    </div>

                                    <div className="space-y-2 w-full">
                                        <div>
                                            <p className="text-sm font-medium text-foreground"><b>Title:</b> {action.name}</p>
                                            {action.assignedRole && (
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3 h-3 text-muted-foreground" />
                                                    <p className="text-xs text-muted-foreground">{action.assignedRole}</p>
                                                </div>
                                            )}
                                        </div>

                                        {action.description && (
                                            <div className="text-sm text-muted-foreground break-words whitespace-normal max-w-full">
                                                <span className="font-semibold">Description:</span>{" "}
                                                <span className="break-words">{action.description}</span>
                                            </div>
                                        )}

                                        {/* Action Type Specific Details */}
                                        <div className="pt-2">
                                            {action.type === 'upload_documents' && (
                                                <div className="space-y-3">
                                                    {/* Required Documents Section */}
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
                                                            <FileText className="h-3.5 w-3.5" />
                                                            <span>Required Documents</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {(() => {
                                                                const uploadableDocs = availableDocuments.filter(
                                                                    d => action.documents?.includes(d.id) && d.type === "uploadable"
                                                                );
                                                                return uploadableDocs.length > 0 ? (
                                                                    uploadableDocs.map(doc => (
                                                                        <div
                                                                            key={doc.id}
                                                                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs"
                                                                        >
                                                                            <File className="h-3 w-3" />
                                                                            <span>{doc.name}</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic">None</span>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>

                                                    {/* Required Forms Section */}
                                                    <div>
                                                        <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
                                                            <Form className="h-3.5 w-3.5" />
                                                            <span>Required Forms</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {(() => {
                                                                const fillableDocs = availableDocuments.filter(
                                                                    d => action.documents?.includes(d.id) && d.type === "fillable"
                                                                );
                                                                return fillableDocs.length > 0 ? (
                                                                    fillableDocs.map(doc => (
                                                                        <div
                                                                            key={doc.id}
                                                                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs"
                                                                        >
                                                                            <File className="h-3 w-3" />
                                                                            <span>{doc.name}</span>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground italic">None</span>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {action.type === 'make_decision' && action.options && (
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
                                                        <Split className="h-3.5 w-3.5" />
                                                        <span>Decision Options</span>
                                                    </div>
                                                    <div className="w-full overflow-hidden rounded-lg border border-border">
                                                        <table className="w-full text-sm fixed-table">
                                                            <tbody className="divide-y divide-border">
                                                                {action.options.map((opt, idx) => (
                                                                    <tr key={idx} className="bg-card/50 hover:bg-accent/10 transition-colors">
                                                                        <td className="px-3 py-2.5 w-12 align-middle">
                                                                            <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background">
                                                                                <span className="text-xs font-medium">{idx + 1}</span>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-3 py-2.5 align-middle text-foreground text-ellipsis whitespace-nowrap overflow-hidden">
                                                                            {opt.label}
                                                                        </td>
                                                                        <td className="px-3 py-2.5 w-10 align-middle text-muted-foreground">
                                                                            <ArrowRight className="h-3.5 w-3.5" />
                                                                        </td>
                                                                        <td className="px-3 py-2.5 align-middle whitespace-nowrap text-muted-foreground min-w-[100px]">
                                                                            <span className="...">
                                                                                {opt.nextPhase === 'next' ? 'Next Phase' :
                                                                                    opt.nextPhase === 'prev' ? 'Prev Phase' :
                                                                                        opt.nextPhase ? `Custom: ${opt.nextPhase}` : 'Next Phase'}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {action.type === 'check_documents' && action.checkOptions && (
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-muted-foreground">
                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                        <span>Document Permissions</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {action.checkOptions.map((option, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs"
                                                            >
                                                                <Check className="h-3 w-3" />
                                                                <span>{option}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-auto">
                                    <button
                                        onClick={() => onMoveActionUp(phase.id, action.id)}
                                        disabled={actionIndex === 0 || isReorderingActions}
                                        className={`p-1.5 rounded-lg transition ${actionIndex > 0 && !isReorderingActions
                                            ? 'hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer'
                                            : 'text-muted-foreground/30 cursor-not-allowed'
                                            }`}
                                        title="Move action up"
                                    >
                                        <ChevronRight className="w-4 h-4 rotate-[-90deg]" />
                                    </button>
                                    <button
                                        onClick={() => onMoveActionDown(phase.id, action.id)}
                                        disabled={actionIndex === phase.actions.length - 1 || isReorderingActions}
                                        className={`p-1.5 rounded-lg transition ${actionIndex < phase.actions.length - 1 && !isReorderingActions
                                            ? 'hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer'
                                            : 'text-muted-foreground/30 cursor-not-allowed'
                                            }`}
                                        title="Move action down"
                                    >
                                        <ChevronRight className="w-4 h-4 rotate-90" />
                                    </button>
                                    <button
                                        onClick={() => onEditAction(phase.id, actionIndex, action)}
                                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                                        title="Edit"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onDeleteAction(phase.id, action.id)}
                                        disabled={isDeletingAction}
                                        className={`p-1.5 rounded-lg transition ${isDeletingAction
                                            ? 'text-muted-foreground/30 cursor-not-allowed'
                                            : 'hover:bg-muted text-muted-foreground hover:text-red-600 cursor-pointer'
                                            }`}
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={() => onAddAction(phase.id)}
                        disabled={isLoadingAction}
                        className="w-full py-2 border border-dashed border-border rounded-lg text-foreground hover:bg-muted transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoadingAction && <div className="w-4 h-4 border-2 border-foreground border-t-transparent rounded-full animate-spin"></div>}
                        <Plus className="w-4 h-4" />
                        {isLoadingAction ? 'Adding...' : 'Add Action'}
                    </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
