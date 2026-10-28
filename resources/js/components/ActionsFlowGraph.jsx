import { useMemo, useEffect, useRef, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    BaseEdge,
    useNodesState,
    useEdgesState,
    MarkerType,
    Handle,
    Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Edit3, Trash2, FileCheck, FileText, Clock, Maximize2, Minimize2, Plus } from 'lucide-react';

const actionTypeIcons = {
    review: FileCheck,
    submit: FileText,
    default: Clock,
};

const actionTypeColors = {
    review: 'bg-purple-500',
    submit: 'bg-orange-500',
    default: 'bg-gray-500',
};

function ActionNode({ data, selected }) {
    const Icon = actionTypeIcons[data.action_type] || actionTypeIcons.default;
    const colorClass = actionTypeColors[data.action_type] || actionTypeColors.default;
    const isReview = data.action_type === 'review';

    return (
        <div
            className={`w-[280px] max-w-[calc(100vw_-_3rem)] min-w-0 rounded-xl border-2 bg-surface shadow-lg ${
                selected 
                    ? 'border-primary shadow-2xl scale-105 cursor-grabbing'
                    : 'border-border hover:shadow-xl hover:border-primary/50 cursor-grab'
            }`}
            style={{
                transition: selected ? 'transform 0.2s, box-shadow 0.2s, border-color 0.2s' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            {/* Left handle for incoming connections */}
            <Handle
                type="target"
                position={Position.Left} 
                id="target-left"
                className="!bg-primary !border-2 !border-primary-foreground !w-3 !h-3"
            />
            {data.incomingDecisionPaths?.some((path) => path.isBackward) ? (
                <Handle
                    type="target"
                    position={Position.Bottom}
                    id="target-bottom"
                    className="!bg-primary !border-2 !border-primary-foreground !w-3 !h-3"
                />
            ) : null}
            
                <div className={`flex items-center gap-3 rounded-t-lg ${colorClass} px-4 py-3 text-white`}>
                    <Icon className="size-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{data.name}</h3>
                    </div>
            </div>

            <div className="p-4 space-y-3">
                {/* Description with label and background */}
                <div className="rounded-lg bg-muted px-3 py-2">
                    <p className="text-xs font-semibold text-foreground mb-1">Description:</p>
                    <p className="break-words text-xs text-foreground">
                        {data.description ? data.description : <span className="italic text-muted-foreground">None</span>}
                    </p>
                </div>

                {/* Actor roles */}
                {data.roles && data.roles.length > 0 && (
                    <div className="rounded-lg bg-muted px-3 py-2">
                        <p className="text-xs font-semibold text-foreground mb-1">Actor:</p>
                        <div className="flex flex-wrap gap-1">
                            {data.roles.map((role, index) => (
                                <span key={role.id || index} className="break-words text-xs text-foreground">
                                    {role.name}{index < data.roles.length - 1 ? ',' : ''}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Badges - only show container if there are badges to display */}
                {(data.requires_file || (data.documents && data.documents.length > 0)) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                        {data.requires_file && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                <FileText className="size-3" />
                                File required
                            </span>
                        )}
                        {data.documents && data.documents.length > 0 && (
                            <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                {data.documents.length} doc{data.documents.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                )}

                {isReview && data.decision_branches?.length ? (
                    <div className="grid gap-1.5 border-t border-border pt-3">
                        <p className="text-xs font-semibold text-foreground">Decision paths</p>
                        {data.decision_branches.map((branch) => (
                            <div key={branch.id} className="flex min-w-0 items-center gap-2 text-[11px]">
                                <span
                                    className="size-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: branch.color }}
                                />
                                <span className="min-w-0 truncate font-medium text-foreground">{branch.label}</span>
                                <span className="min-w-0 truncate text-muted-foreground">{branch.destination_label}</span>
                            </div>
                        ))}
                        {data.decision_branches.some((branch) => branch.type === 'custom') ? (
                            <span className="mt-1 w-fit rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                                Saved to configuration; not executed in proposals
                            </span>
                        ) : null}
                    </div>
                ) : null}

                {data.incomingDecisionPaths?.length ? (
                    <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
                        {data.incomingDecisionPaths.map((path) => (
                            <span
                                key={`${path.label}-${path.color}`}
                                className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold"
                                style={{
                                    color: path.color,
                                    backgroundColor: `${path.color}1a`,
                                }}
                            >
                                <span
                                    className="size-1.5 rounded-full"
                                    style={{ backgroundColor: path.color }}
                                />
                                {path.label} path
                            </span>
                        ))}
                    </div>
                ) : null}

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <button
                        type="button"
                        onClick={() => data.onEdit?.(data)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
                    >
                        <Edit3 className="size-3" />
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => data.onDelete?.(data)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/80"
                    >
                        <Trash2 className="size-3" />
                        Delete
                    </button>
                </div>
            </div>

            {isReview ? data.decision_branches?.map((branch, index) => {
                const handleId = branch.type === 'approve'
                    ? 'approve'
                    : branch.type === 'deny'
                        ? 'deny'
                        : `outcome-${branch.id}`;
                const topPosition = `${((index + 1) / (data.decision_branches.length + 1)) * 100}%`;
                const backwardHandleIndex = data.backwardDecisionBranchHandles?.indexOf(handleId) ?? -1;
                const isBackward = backwardHandleIndex >= 0;
                const backwardHandleCount = data.backwardDecisionBranchHandles?.length ?? 0;

                return (
                    <Handle
                        key={handleId}
                        type="source"
                        position={isBackward
                            ? Position.Bottom
                            : branch.type === 'deny' ? Position.Left : Position.Right}
                        id={handleId}
                        title={branch.label}
                        className="!border-2 !border-white !w-3 !h-3"
                        style={{
                            ...(isBackward
                                ? {
                                      left: `${20 + ((backwardHandleIndex + 1) / (backwardHandleCount + 1)) * 25}%`,
                                      bottom: '-6px',
                                  }
                                : { top: topPosition }),
                            backgroundColor: branch.color,
                            ...(!isBackward && branch.type === 'deny' ? { left: '-6px' } : {}),
                        }}
                    />
                );
            }) : (
                <Handle
                    type="source"
                    position={Position.Right}
                    className="!bg-primary !border-2 !border-primary-foreground !w-3 !h-3"
                />
            )}
        </div>
    );
}

function NextPhaseNode({ data }) {
    return (
        <div className="relative flex flex-col items-center">
            {/* Left handle for incoming connection - positioned at the vertical center of the circle */}
            <Handle 
                type="target" 
                position={Position.Left} 
                className="!bg-primary !border-2 !border-primary-foreground !w-3 !h-3 !top-[66px]"
                style={{ left: '-6px' }}
            />
            
            {/* Circular node */}
            <div className="flex size-32 flex-col items-center justify-center rounded-full border-4 border-dashed border-primary bg-primary/10 shadow-lg transition-all hover:bg-primary/20 hover:shadow-xl">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/20 text-primary mb-2">
                    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Next Phase</p>
                <h3 className="font-semibold text-xs text-foreground text-center px-2 mt-0.5 line-clamp-2">{data.name}</h3>
            </div>
            
            {/* Action count below circle */}
            <div className="mt-2 rounded-full bg-primary/10 px-3 py-1">
                <p className="text-xs text-foreground font-medium">
                    {data.actionCount} action{data.actionCount !== 1 ? 's' : ''}
                </p>
            </div>
        </div>
    );
}

function StartPhaseNode({ data }) {
    return (
        <div className="relative flex flex-col items-center">
            {/* Right handle for outgoing connection */}
            <Handle 
                type="source" 
                position={Position.Right} 
                className="!bg-green-600 !border-2 !border-white !w-3 !h-3 !top-[66px]"
                style={{ right: '-6px' }}
            />
            
            {/* Circular node */}
            <div className="flex size-32 flex-col items-center justify-center rounded-full border-4 border-dashed border-green-600 bg-green-50 dark:bg-green-950/20 shadow-lg transition-all hover:bg-green-100 dark:hover:bg-green-900/30 hover:shadow-xl">
                <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 mb-2">
                    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Start</p>
                <h3 className="font-semibold text-xs text-foreground text-center px-2 mt-0.5 line-clamp-2">{data.name}</h3>
            </div>
            
            {/* Action count below circle */}
            <div className="mt-2 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1">
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                    Phase Start
                </p>
            </div>
        </div>
    );
}

function EndNode() {
    return (
        <div className="relative flex flex-col items-center">
            <Handle
                type="target"
                position={Position.Left}
                className="!top-[66px] !h-3 !w-3 !border-2 !border-white !bg-red-600"
                style={{ left: '-6px' }}
            />
            <div className="flex size-32 flex-col items-center justify-center rounded-full border-4 border-dashed border-red-600 bg-red-50 shadow-lg dark:bg-red-950/20">
                <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6h12v12H6z" />
                    </svg>
                </div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">End</p>
                <h3 className="mt-0.5 px-2 text-center text-xs font-semibold text-foreground">Workflow complete</h3>
            </div>
            <div className="mt-2 rounded-full bg-red-100 px-3 py-1 dark:bg-red-900/30">
                <p className="text-xs font-medium text-red-700 dark:text-red-400">End of process</p>
            </div>
        </div>
    );
}

const nodeTypes = {
    actionNode: ActionNode,
    nextPhaseNode: NextPhaseNode,
    startPhaseNode: StartPhaseNode,
    endNode: EndNode,
};

function BackwardDecisionEdge({ sourceX, sourceY, targetX, targetY, markerEnd, style, label, labelStyle, labelBgStyle }) {
    const loopDepth = Math.max(180, Math.abs(targetX - sourceX) * 0.2);
    const path = `M ${sourceX},${sourceY} C ${sourceX},${sourceY + loopDepth} ${targetX},${targetY + loopDepth} ${targetX},${targetY}`;

    return (
        <BaseEdge
            path={path}
            markerEnd={markerEnd}
            style={style}
            label={label}
            labelX={(sourceX + targetX) / 2}
            labelY={(sourceY + targetY) / 2 + loopDepth * 0.75}
            labelStyle={labelStyle}
            labelShowBg={Boolean(label)}
            labelBgStyle={labelBgStyle}
            labelBgPadding={[5, 3]}
            labelBgBorderRadius={4}
        />
    );
}

const edgeTypes = {
    backwardDecision: BackwardDecisionEdge,
};

function buildActionEdges(actions, currentPhaseName, nextPhase) {
    const edges = [];
    const actionTargets = new Map(actions.map((action) => [String(action.id), action]));
    const actionIndexes = new Map(actions.map((action, index) => [String(action.id), index]));
    const getEdgeType = (sourceAction, targetAction) => (
        actionIndexes.get(String(targetAction.id)) < actionIndexes.get(String(sourceAction.id))
            ? 'backwardDecision'
            : 'default'
    );
    const getTargetHandle = (sourceAction, targetAction) => (
        getEdgeType(sourceAction, targetAction) === 'backwardDecision'
            ? 'target-bottom'
            : 'target-left'
    );

    if (currentPhaseName && actions.length > 0) {
        edges.push({
            id: 'edge-start-to-first',
            source: 'start-phase',
            target: `action-${actions[0].id}`,
            targetHandle: 'target-left',
            type: 'default',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
            style: { strokeWidth: 2, stroke: '#16a34a' },
        });
    }

    if (currentPhaseName && actions.length === 0) {
        edges.push({
            id: `edge-start-to-${nextPhase ? 'next-phase' : 'end'}`,
            source: 'start-phase',
            target: nextPhase ? 'next-phase' : 'end',
            type: 'default',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
            style: { strokeWidth: 2, stroke: '#3b82f6', strokeDasharray: '5,5' },
        });
    }

    actions.forEach((action, index) => {
        const nextAction = actions[index + 1] ?? null;

        if (action.action_type === 'review') {
            const configuredApproveTarget = action.approve_action_id == null
                ? null
                : actionTargets.get(String(action.approve_action_id));
            const approveTarget = configuredApproveTarget ?? nextAction;

            if (approveTarget) {
                edges.push({
                    id: `edge-${action.id}-approve-${approveTarget.id}`,
                    source: `action-${action.id}`,
                    sourceHandle: 'approve',
                    target: `action-${approveTarget.id}`,
                    targetHandle: getTargetHandle(action, approveTarget),
                    type: getEdgeType(action, approveTarget),
                    animated: true,
                    label: 'Approve',
                    labelBgStyle: { fill: '#22c55e', fillOpacity: 0.9 },
                    labelStyle: { fill: '#fff', fontSize: 11, fontWeight: 600 },
                    markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#22c55e' },
                    style: { strokeWidth: 2, stroke: '#22c55e' },
                });
            } else if (!nextPhase && action.approve_action_id == null) {
                edges.push({
                    id: `edge-${action.id}-approve-end`,
                    source: `action-${action.id}`,
                    sourceHandle: 'approve',
                    target: 'end',
                    type: 'default',
                    animated: true,
                    label: 'Approve',
                    labelBgStyle: { fill: '#22c55e', fillOpacity: 0.9 },
                    labelStyle: { fill: '#fff', fontSize: 11, fontWeight: 600 },
                    markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#22c55e' },
                    style: { strokeWidth: 2, stroke: '#22c55e' },
                });
            }

            const denyTarget = action.deny_action_id == null
                ? null
                : actionTargets.get(String(action.deny_action_id));

            if (denyTarget || (!nextPhase && action.deny_action_id == null)) {
                edges.push({
                    id: `edge-${action.id}-deny-${denyTarget?.id ?? 'end'}`,
                    source: `action-${action.id}`,
                    sourceHandle: 'deny',
                    target: denyTarget ? `action-${denyTarget.id}` : 'end',
                    ...(denyTarget ? { targetHandle: getTargetHandle(action, denyTarget) } : {}),
                    type: denyTarget ? getEdgeType(action, denyTarget) : 'default',
                    animated: true,
                    label: 'Deny',
                    labelBgStyle: { fill: '#ef4444', fillOpacity: 0.9 },
                    labelStyle: { fill: '#fff', fontSize: 11, fontWeight: 600 },
                    markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#ef4444' },
                    style: { strokeWidth: 2, stroke: '#ef4444' },
                });
            }

            (action.decision_branches ?? [])
                .filter((branch) => branch.type === 'custom')
                .forEach((branch) => {
                    const actionTargetId = branch.destination.startsWith('action:')
                        ? branch.destination.slice('action:'.length)
                        : null;
                    const actionTarget = actionTargetId
                        ? actionTargets.get(String(actionTargetId))
                        : null;
                    const destination = actionTarget
                        ?? (branch.destination === 'next' ? nextAction ?? nextPhase : null)
                        ?? ((branch.destination === 'end' && !nextPhase)
                            || (branch.destination === 'next' && !nextAction && !nextPhase)
                            ? { id: 'end' }
                            : null);

                    if (!destination) {
                        return;
                    }

                    const isEnd = destination.id === 'end';
                    const target = isEnd
                        ? 'end'
                        : destination === nextPhase
                            ? 'next-phase'
                            : `action-${destination.id}`;

                    edges.push({
                        id: `edge-${action.id}-outcome-${branch.id}-${target}`,
                        source: `action-${action.id}`,
                        sourceHandle: `outcome-${branch.id}`,
                        target,
                        ...(!isEnd && destination !== nextPhase
                            ? { targetHandle: getTargetHandle(action, destination) }
                            : {}),
                        type: !isEnd && destination !== nextPhase
                            ? getEdgeType(action, destination)
                            : 'default',
                        animated: true,
                        label: branch.label,
                        labelBgStyle: { fill: branch.color, fillOpacity: 0.9 },
                        labelStyle: { fill: '#fff', fontSize: 11, fontWeight: 600 },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            width: 20,
                            height: 20,
                            color: branch.color,
                        },
                        style: { strokeWidth: 2, stroke: branch.color },
                    });
                });
        } else if (nextAction) {
            edges.push({
                id: `edge-${action.id}-${nextAction.id}`,
                source: `action-${action.id}`,
                target: `action-${nextAction.id}`,
                targetHandle: 'target-left',
                type: 'default',
                animated: true,
                markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: '#3b82f6' },
                style: { strokeWidth: 2, stroke: '#3b82f6' },
            });
        }
    });

    const lastAction = actions.at(-1);

    if (nextPhase && lastAction && (
        lastAction.action_type !== 'review'
        || lastAction.approve_action_id == null
        || !actionTargets.has(String(lastAction.approve_action_id))
    )) {
        edges.push({
            id: 'edge-last-to-next-phase',
            source: `action-${lastAction.id}`,
            sourceHandle: lastAction.action_type === 'review' ? 'approve' : null,
            target: 'next-phase',
            type: 'default',
            animated: true,
            label: lastAction.action_type === 'review' ? 'Approve' : undefined,
            labelBgStyle: { fill: '#22c55e', fillOpacity: 0.9 },
            labelStyle: { fill: '#fff', fontSize: 11, fontWeight: 600 },
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
            style: { strokeWidth: 2, stroke: '#3b82f6', strokeDasharray: '5,5' },
        });
    }

    if (!nextPhase && lastAction && lastAction.action_type !== 'review') {
        edges.push({
            id: `edge-${lastAction.id}-to-end`,
            source: `action-${lastAction.id}`,
            target: 'end',
            type: 'default',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
            style: { strokeWidth: 2, stroke: '#3b82f6', strokeDasharray: '5,5' },
        });
    }

    return edges;
}

function getDecisionDestinationPaths(actions) {
    const destinationPaths = new Map();
    const actionIndexes = new Map(actions.map((action, index) => [String(action.id), index]));
    const defaultColors = {
        approve: '#16a34a',
        deny: '#dc2626',
        custom: '#8b5cf6',
    };

    actions.forEach((action) => {
        if (action.action_type !== 'review') {
            return;
        }

        const branches = action.decision_branches?.length
            ? action.decision_branches
            : [
                  {
                      type: 'approve',
                      label: 'Approve',
                      destination: action.approve_action_id == null
                          ? 'next'
                          : `action:${action.approve_action_id}`,
                  },
                  {
                      type: 'deny',
                      label: 'Deny',
                      destination: action.deny_action_id == null
                          ? 'end'
                          : `action:${action.deny_action_id}`,
                  },
              ];

        branches.forEach((branch) => {
            if (!branch.destination?.startsWith('action:')) {
                return;
            }

            const destinationId = branch.destination.slice('action:'.length);
            const existingPaths = destinationPaths.get(destinationId) ?? [];

            destinationPaths.set(destinationId, [
                ...existingPaths,
                {
                    label: branch.label,
                    color: branch.color ?? defaultColors[branch.type] ?? defaultColors.custom,
                    isBackward: actionIndexes.has(destinationId)
                        && actionIndexes.get(destinationId) < actionIndexes.get(String(action.id)),
                },
            ]);
        });
    });

    return destinationPaths;
}

function getBackwardDecisionBranchHandles(actions) {
    const actionIndexes = new Map(actions.map((action, index) => [String(action.id), index]));

    return new Map(actions.map((action, actionIndex) => {
        const branches = action.decision_branches?.length
            ? action.decision_branches
            : [
                  {
                      id: 'approve',
                      type: 'approve',
                      destination: action.approve_action_id == null
                          ? 'next'
                          : `action:${action.approve_action_id}`,
                  },
                  {
                      id: 'deny',
                      type: 'deny',
                      destination: action.deny_action_id == null
                          ? 'end'
                          : `action:${action.deny_action_id}`,
                  },
              ];
        const handles = branches
            .filter((branch) => {
                const destination = branch.type === 'approve' && action.approve_action_id != null
                    ? `action:${action.approve_action_id}`
                    : branch.type === 'deny' && action.deny_action_id != null
                        ? `action:${action.deny_action_id}`
                        : branch.destination;
                const targetId = destination?.startsWith('action:')
                    ? destination.slice('action:'.length)
                    : null;

                return targetId != null
                    && actionIndexes.has(String(targetId))
                    && actionIndexes.get(String(targetId)) < actionIndex;
            });

        return [
            String(action.id),
            handles.map((branch) => (
                branch.type === 'approve'
                    ? 'approve'
                    : branch.type === 'deny'
                        ? 'deny'
                        : `outcome-${branch.id}`
            )),
        ];
    }));
}

export default function ActionsFlowGraph({ actions = [], onEdit, onDelete, onAddAction, onReorderActions, nextPhase = null, currentPhaseName = null }) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const graphRef = useRef(null);
    const draggedActionOrder = useRef(actions.map((action) => String(action.id)));

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement === graphRef.current);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        if (!graphRef.current) {
            return;
        }

        if (document.fullscreenElement) {
            await document.exitFullscreen();
            return;
        }

        await graphRef.current.requestFullscreen();
    };

    // Convert actions to nodes and edges (horizontal layout)
    const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
        const nodes = [];
        const destinationPaths = getDecisionDestinationPaths(actions);
        const backwardDecisionBranches = getBackwardDecisionBranchHandles(actions);
        
        // Add start node (not draggable)
        if (currentPhaseName) {
            nodes.push({
                id: 'start-phase',
                type: 'startPhaseNode',
                position: { x: -300, y: 50 },
                data: {
                    name: currentPhaseName,
                },
                draggable: false,
            });
        }

        // Add action nodes (draggable)
        actions.forEach((action, index) => {
            nodes.push({
                id: `action-${action.id}`,
                type: 'actionNode',
                position: { x: index * 450, y: 50 },
                data: {
                    ...action,
                    incomingDecisionPaths: destinationPaths.get(String(action.id)) ?? [],
                    backwardDecisionBranchHandles: backwardDecisionBranches.get(String(action.id)) ?? [],
                    onEdit,
                    onDelete,
                },
                draggable: true,
            });
        });

        // Add next phase node if provided (not draggable)
        if (nextPhase) {
            nodes.push({
                id: 'next-phase',
                type: 'nextPhaseNode',
                position: { x: actions.length * 450, y: 50 },
                data: {
                    name: nextPhase.name,
                    actionCount: nextPhase.actions?.length ?? 0,
                },
                draggable: false,
            });
        }

        if (currentPhaseName && !nextPhase) {
            nodes.push({
                id: 'end',
                type: 'endNode',
                position: { x: actions.length * 450, y: 50 },
                data: {},
                draggable: false,
            });
        }

        const edges = buildActionEdges(actions, currentPhaseName, nextPhase);

        return { nodes, edges };
    }, [actions, onEdit, onDelete, nextPhase, currentPhaseName]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Reapply saved positions when actions or phase data changes.
    useEffect(() => {
        draggedActionOrder.current = actions.map((action) => String(action.id));
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [setNodes, setEdges, initialNodes, initialEdges]);

    const onNodeDrag = (_, draggedNode) => {
        if (!draggedNode.id.startsWith('action-')) {
            return;
        }

        const actionId = draggedNode.id.slice('action-'.length);
        const currentIndex = draggedActionOrder.current.indexOf(actionId);
        const draggedX = Math.max(
            0,
            Math.min(
                (draggedActionOrder.current.length - 1) * 450,
                draggedNode.position.x,
            ),
        );
        const nextIndex = Math.max(
            0,
            Math.min(
                draggedActionOrder.current.length - 1,
                Math.round(draggedX / 450),
            ),
        );
        const nextOrder = [...draggedActionOrder.current];

        if (currentIndex !== -1 && currentIndex !== nextIndex) {
            nextOrder.splice(currentIndex, 1);
            nextOrder.splice(nextIndex, 0, actionId);
            draggedActionOrder.current = nextOrder;
        }

        const actionById = new Map(actions.map((action) => [String(action.id), action]));
        const orderedActions = nextOrder.map((id) => actionById.get(id)).filter(Boolean);
        const destinationPaths = getDecisionDestinationPaths(orderedActions);
        const backwardDecisionBranches = getBackwardDecisionBranchHandles(orderedActions);

        setEdges(buildActionEdges(orderedActions, currentPhaseName, nextPhase));
        setNodes((currentNodes) => currentNodes.map((currentNode) => {
            if (!currentNode.id.startsWith('action-')) {
                return currentNode;
            }

            const currentActionId = currentNode.id.slice('action-'.length);
            const orderedIndex = nextOrder.indexOf(currentActionId);
            const isDraggedNode = currentNode.id === draggedNode.id;

            return {
                ...currentNode,
                data: {
                    ...currentNode.data,
                    incomingDecisionPaths: destinationPaths.get(currentActionId) ?? [],
                    backwardDecisionBranchHandles: backwardDecisionBranches.get(currentActionId) ?? [],
                },
                position: {
                    x: isDraggedNode ? draggedX : orderedIndex * 450,
                    y: 50,
                },
            };
        }));
    };

    const onNodeDragStop = async (_, draggedNode) => {
        if (!draggedNode.id.startsWith('action-') || !onReorderActions) {
            return;
        }

        const orderedActionIds = draggedActionOrder.current;
        const currentActionIds = actions.map((action) => String(action.id));

        if (orderedActionIds.every((actionId, index) => actionId === currentActionIds[index])) {
            setNodes((currentNodes) => currentNodes.map((node) => {
                if (!node.id.startsWith('action-')) {
                    return node;
                }

                const originalIndex = currentActionIds.indexOf(node.id.slice('action-'.length));

                return {
                    ...node,
                    position: { x: originalIndex * 450, y: 50 },
                };
            }));

            return;
        }

        setNodes((currentNodes) => currentNodes.map((node) => {
            if (!node.id.startsWith('action-')) {
                return node;
            }

            const orderedIndex = orderedActionIds.indexOf(node.id.slice('action-'.length));

            return {
                ...node,
                position: { x: orderedIndex * 450, y: 50 },
            };
        }));

        const reordered = await onReorderActions(orderedActionIds);

        if (reordered === false) {
            draggedActionOrder.current = currentActionIds;
            setNodes((currentNodes) => currentNodes.map((node) => {
                if (!node.id.startsWith('action-')) {
                    return node;
                }

                const originalIndex = currentActionIds.indexOf(node.id.slice('action-'.length));

                return {
                    ...node,
                    position: { x: originalIndex * 450, y: 50 },
                };
            }));
            return;
        }

        draggedActionOrder.current = orderedActionIds;
    };

    const graphControls = (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            {onAddAction ? (
                <button
                    type="button"
                    onClick={onAddAction}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background/90 px-2.5 text-xs font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted"
                >
                    <Plus className="size-3.5" />
                    Add action
                </button>
            ) : null}
            <button
                type="button"
                onClick={toggleFullscreen}
                className="flex size-8 items-center justify-center rounded-md border border-border bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'View nodes fullscreen'}
                title={isFullscreen ? 'Exit fullscreen' : 'View nodes fullscreen'}
            >
                {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
        </div>
    );

    return (
        <div
            ref={graphRef}
            className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-background fullscreen:bg-background"
        >
            {graphControls}
            {actions.length === 0 ? (
                <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-md border border-border bg-background/90 px-3 py-2 text-center text-xs text-muted-foreground shadow-sm backdrop-blur">
                    No actions in this phase yet. Use Add action to get started.
                </div>
            ) : null}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{
                    padding: 0.2,
                    includeHiddenNodes: false,
                }}
                minZoom={0.5}
                maxZoom={1.5}
                defaultEdgeOptions={{
                    animated: true,
                }}
                snapToGrid={true}
                snapGrid={[25, 25]}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
                nodesDraggable={true}
                nodesConnectable={false}
                elementsSelectable={true}
                className="reactflow-smooth-transitions"
            >
                <style>{`
                    .reactflow-smooth-transitions .react-flow__node {
                        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    }
                    .reactflow-smooth-transitions .react-flow__node.selected {
                        transition: transform 0.2s ease-out !important;
                    }
                    .reactflow-smooth-transitions .react-flow__edge {
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    }
                    
                    /* Fix Controls visibility */
                    .react-flow__controls {
                        background: hsl(var(--foreground)) !important;
                        border: 1px solid hsl(var(--border)) !important;
                        border-radius: 0.5rem !important;
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
                    }
                    .react-flow__controls-button {
                        background: hsl(var(--foreground)) !important;
                        border-bottom: 1px solid hsl(var(--border)) !important;
                        color: hsl(var(--background)) !important;
                    }
                    .react-flow__controls-button:hover {
                        background: hsl(var(--muted)) !important;
                        color: hsl(var(--foreground)) !important;
                    }
                    .react-flow__controls-button svg {
                        fill: currentColor !important;
                    }
                    .react-flow__controls-button path {
                        fill: currentColor !important;
                    }
                    
                    /* Fix MiniMap visibility */
                    .react-flow__minimap {
                        background: hsl(var(--background)) !important;
                        border: 1px solid hsl(var(--border)) !important;
                        border-radius: 0.5rem !important;
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
                    }
                `}</style>
                <Background 
                    color="#94a3b8" 
                    gap={16} 
                    size={1}
                    variant="dots"
                />
                <Controls 
                    showInteractive={false}
                    position="bottom-right"
                />
                <MiniMap 
                    nodeColor={(node) => {
                        const type = node.data?.action_type;
                        switch(type) {
                            case 'review': return '#a855f7';
                            case 'submit': return '#f97316';
                            default: return '#6b7280';
                        }
                    }}
                    position="bottom-left"
                    maskColor="rgb(0, 0, 0, 0.1)"
                />
            </ReactFlow>
        </div>
    );
}
