import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';

/** @typedef {{id: number, name: string, actions?: unknown[], isCurrent?: boolean, isComplete?: boolean, isClickable?: boolean, detail?: string}} PhasePipelinePhase */

/**
 * @param {{
 *   phases?: PhasePipelinePhase[],
 *   activePhaseId?: number | null,
 *   onPhaseSelect?: (phaseId: number) => void,
 *   onAddPhase?: () => void,
 *   onPhaseReorder?: (phases: PhasePipelinePhase[]) => void,
 *   showPhaseDetails?: boolean,
 *   centerActivePhase?: boolean,
 }} props
 */
export default function PhasePipeline({ phases = [], activePhaseId, onPhaseSelect, onAddPhase, onPhaseReorder, showPhaseDetails = true, centerActivePhase = false }) {
    const [draggedPhaseId, setDraggedPhaseId] = useState(null);
    const [previewPhases, setPreviewPhases] = useState(phases);
    const [previewTargetIndex, setPreviewTargetIndex] = useState(null);
    const [isDropping, setIsDropping] = useState(false);
    const itemRefs = useRef({});
    const containerRef = useRef(null);

    useEffect(() => {
        setPreviewPhases(phases);
        setPreviewTargetIndex(null);
        setIsDropping(false);
        setDraggedPhaseId(null);
    }, [phases]);

    useEffect(() => {
        if (!centerActivePhase || activePhaseId == null || !containerRef.current) return;

        const activePhaseElement = itemRefs.current[activePhaseId];
        if (!activePhaseElement) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const phaseRect = activePhaseElement.getBoundingClientRect();
        const phaseCenter = phaseRect.left - containerRect.left + containerRef.current.scrollLeft + phaseRect.width / 2;

        containerRef.current.scrollTo({
            left: Math.max(0, phaseCenter - containerRef.current.clientWidth / 2),
            behavior: 'smooth',
        });
    }, [activePhaseId, centerActivePhase]);

    const getTranslateX = (phaseId) => {
        if (!draggedPhaseId || previewTargetIndex === null) return 0;
        const originalIndex = phases.findIndex((phase) => phase.id === phaseId);
        const previewIndex = previewPhases.findIndex((phase) => phase.id === phaseId);
        if (originalIndex === previewIndex) return 0;
        const element = itemRefs.current[phaseId];
        if (!element) return 0;
        return (previewIndex - originalIndex) * element.offsetWidth;
    };

    const handleDragStart = (event, phase) => {
        setDraggedPhaseId(phase.id);
        setPreviewTargetIndex(null);
        setIsDropping(false);
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleContainerDragOver = (event) => {
        event.preventDefault();
        if (!draggedPhaseId || !containerRef.current) return;

        const nearestPhase = phases.reduce((nearest, phase, index) => {
            const rect = itemRefs.current[phase.id]?.getBoundingClientRect();
            if (!rect) return nearest;

            const distance = Math.hypot(event.clientX - (rect.left + rect.width / 2), event.clientY - (rect.top + rect.height / 2));
            return !nearest || distance < nearest.distance ? { index, distance, rect } : nearest;
        }, null);
        if (!nearestPhase) return;

        const targetIndex = event.clientX > nearestPhase.rect.left + nearestPhase.rect.width / 2
            ? nearestPhase.index + 1
            : nearestPhase.index;
        const clampedIndex = Math.max(0, Math.min(targetIndex, phases.length - 1));

        if (previewTargetIndex === clampedIndex) return;
        setPreviewTargetIndex(clampedIndex);

        const draggedIndex = phases.findIndex((phase) => phase.id === draggedPhaseId);
        if (draggedIndex === -1) return;

        if (clampedIndex === draggedIndex) {
            setPreviewPhases(phases);
            return;
        }

        const reorderedPhases = [...phases];
        const [draggedPhase] = reorderedPhases.splice(draggedIndex, 1);
        reorderedPhases.splice(clampedIndex, 0, draggedPhase);
        setPreviewPhases(reorderedPhases);
    };

    const handleDragEnd = () => {
        if (draggedPhaseId && previewTargetIndex !== null) {
            const draggedIndex = phases.findIndex((phase) => phase.id === draggedPhaseId);
            const newIndex = previewPhases.findIndex((phase) => phase.id === draggedPhaseId);
            if (draggedIndex !== newIndex && draggedIndex !== -1 && newIndex !== -1) {
                setIsDropping(true);
                onPhaseReorder?.(previewPhases);
                return;
            }
        }

        setDraggedPhaseId(null);
        setPreviewTargetIndex(null);
    };

    const canReorderPhases = Boolean(onPhaseReorder);
    const canSelectPhase = Boolean(onPhaseSelect);

    return (
        <div className="flex w-full min-w-0 items-start px-4 pt-8 pb-5">
            <div className="relative min-w-0 flex-1">
                <div
                    ref={containerRef}
                    className={`custom-scrollbar flex min-w-0 flex-nowrap items-start overflow-x-auto overflow-y-hidden p-1 ${onAddPhase ? 'phase-pipeline-fade pr-32' : ''}`}
                    onDragOver={canReorderPhases ? handleContainerDragOver : undefined}
                >
                    {phases.map((phase, originalIndex) => {
                        const isActive = phase.id === activePhaseId;
                        const isCurrent = Boolean(phase.isCurrent);
                        const isHighlighted = isActive || isCurrent;
                        const isComplete = Boolean(phase.isComplete);
                        const canSelectThisPhase = canSelectPhase && phase.isClickable !== false;
                        const isDragging = phase.id === draggedPhaseId;
                        const translateX = getTranslateX(phase.id);
                        const phaseIndicatorClass = isActive
                            ? 'border-primary bg-primary text-primary-foreground'
                            : isCurrent
                                ? 'border-primary bg-primary text-white'
                                : isComplete
                                    ? 'border-emerald-600 bg-emerald-600 text-white'
                                    : 'border-primary bg-primary/10 text-primary';
                        const phaseButtonClass = canReorderPhases
                            ? 'cursor-grab hover:scale-105'
                            : canSelectThisPhase
                                ? 'cursor-pointer hover:scale-105'
                                : 'cursor-default';

                        return (
                            <div
                                key={phase.id}
                                ref={(element) => { itemRefs.current[phase.id] = element; }}
                                className="flex min-w-28 flex-1 items-start"
                                style={{
                                    transform: `translateX(${translateX}px)`,
                                    transition: isDragging || isDropping ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    zIndex: isDragging ? 10 : 1,
                                    position: 'relative',
                                }}
                            >
                                <button
                                    type="button"
                                    draggable={canReorderPhases}
                                    onDragStart={canReorderPhases ? (event) => handleDragStart(event, phase) : undefined}
                                    onDragEnd={canReorderPhases ? handleDragEnd : undefined}
                                    onClick={() => !draggedPhaseId && canSelectThisPhase && onPhaseSelect?.(phase.id)}
                                    aria-pressed={canSelectPhase ? isActive : undefined}
                                    aria-disabled={canSelectPhase ? !canSelectThisPhase : undefined}
                                    className={`flex w-28 flex-col items-center gap-1.5 transition-transform duration-200 ${phaseButtonClass} ${isDragging ? 'opacity-50 cursor-grabbing' : ''}`}
                                >
                                    <div className={`flex size-14 items-center justify-center rounded-full border-2 text-base font-semibold transition-colors ${phaseIndicatorClass}`}>
                                        {isComplete ? <CheckCircle2 className="size-5" /> : originalIndex + 1}
                                    </div>
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                        Phase {originalIndex + 1}
                                    </span>
                                    <span className={`max-w-28 truncate whitespace-nowrap text-center text-sm leading-tight ${isHighlighted ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
                                        {phase.name}
                                    </span>
                                    {showPhaseDetails ? (
                                        <span className="text-xs text-muted-foreground">
                                            {phase.detail ?? `${phase.actions?.length ?? 0} action${(phase.actions?.length ?? 0) !== 1 ? 's' : ''}`}
                                        </span>
                                    ) : null}
                                </button>

                                {originalIndex < phases.length - 1 ? (
                                    <div className="mx-2 mt-[18px] flex flex-1 items-center text-muted-foreground">
                                        <div className="h-px flex-1 bg-border" />
                                        <svg className="size-3 shrink-0" viewBox="0 0 12 12" fill="currentColor">
                                            <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                {onAddPhase ? (
                    <button
                        type="button"
                        onClick={onAddPhase}
                        className="absolute right-0 top-1 z-20 flex w-28 flex-col items-center gap-1.5 transition-transform duration-200 hover:scale-105"
                        aria-label="Add phase"
                    >
                        <div className="flex size-14 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 bg-muted text-muted-foreground transition-colors hover:border-primary hover:bg-primary/10 hover:text-primary">
                            <Plus className="size-5" />
                        </div>
                        <span className="text-xs text-muted-foreground">Add phase</span>
                    </button>
                ) : null}
            </div>
        </div>
    );
}