import { useCallback, useMemo, useEffect, useState } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    MarkerType,
    Handle,
    Position,
    getBezierPath,
    BaseEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Edit3, Trash2, FileCheck, FileText, Clock } from 'lucide-react';

// Custom edge for deny arrows with deeper curve
function DenyEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, label, labelBgStyle, labelStyle }) {
    // Create a deeper curve by adjusting control points
    const curveDepth = 100; // How far down the curve goes
    
    // Calculate control points for a deeper curve
    const midY = Math.max(sourceY, targetY) + curveDepth;
    
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.5,
    });
    
    // Create custom path with deeper curve
    const customPath = `M ${sourceX},${sourceY} C ${sourceX},${midY} ${targetX},${midY} ${targetX},${targetY}`;
    
    return (
        <>
            <BaseEdge id={id} path={customPath} markerEnd={markerEnd} style={style} />
            {label && (
                <g>
                    <rect
                        x={(sourceX + targetX) / 2 - 20}
                        y={midY - 10}
                        width={40}
                        height={20}
                        rx={4}
                        fill={labelBgStyle?.fill || '#ef4444'}
                        fillOpacity={labelBgStyle?.fillOpacity || 0.9}
                    />
                    <text
                        x={(sourceX + targetX) / 2}
                        y={midY + 3}
                        style={{
                            ...labelStyle,
                            fontSize: labelStyle?.fontSize || 11,
                            fontWeight: labelStyle?.fontWeight || 600,
                            fill: labelStyle?.fill || '#fff',
                        }}
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {label}
                    </text>
                </g>
            )}
        </>
    );
}

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
            className={`rounded-xl border-2 bg-surface shadow-lg min-w-[280px] ${
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
                className="!bg-primary !border-2 !border-primary-foreground !w-3 !h-3"
            />
            
            {/* Bottom handle for receiving deny arrows from later review nodes - only for non-review nodes */}
            {!isReview && (
                <Handle 
                    type="target" 
                    position={Position.Bottom}
                    id="deny-target"
                    className="!bg-red-500 !border-2 !border-white !w-3 !h-3"
                    style={{ left: '50%' }}
                />
            )}
            
            <div className={`flex items-center gap-3 rounded-t-lg ${colorClass} px-4 py-3 text-white`}>
                <Icon className="size-5 shrink-0" />
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{data.name}</h3>
                </div>
                {/* Drag indicator */}
                <svg className="size-4 shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
            </div>

            <div className="p-4 space-y-3">
                {/* Description with label and background */}
                <div className="rounded-lg bg-muted px-3 py-2">
                    <p className="text-xs font-semibold text-foreground mb-1">Description:</p>
                    <p className="text-xs text-foreground">
                        {data.description ? data.description : <span className="italic text-muted-foreground">None</span>}
                    </p>
                </div>

                {/* Actor roles */}
                {data.roles && data.roles.length > 0 && (
                    <div className="rounded-lg bg-muted px-3 py-2">
                        <p className="text-xs font-semibold text-foreground mb-1">Actor:</p>
                        <div className="flex flex-wrap gap-1">
                            {data.roles.map((role, index) => (
                                <span key={role.id || index} className="text-xs text-foreground">
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

            {/* Right handle for outgoing connections (approve) */}
            <Handle 
                type="source" 
                position={Position.Right}
                id="approve"
                className="!bg-primary !border-2 !border-primary-foreground !w-3 !h-3"
            />
            
            {/* Bottom handle for deny outgoing connections - only for review nodes */}
            {isReview && (
                <Handle 
                    type="source" 
                    position={Position.Bottom}
                    id="deny"
                    className="!bg-red-500 !border-2 !border-white !w-3 !h-3"
                    style={{ left: '50%' }}
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

const nodeTypes = {
    actionNode: ActionNode,
    nextPhaseNode: NextPhaseNode,
    startPhaseNode: StartPhaseNode,
};

const edgeTypes = {
    deny: DenyEdge,
};

export default function ActionsFlowGraph({ actions = [], onEdit, onDelete, onReorder, nextPhase = null, currentPhaseName = null }) {
    const [draggedNodeId, setDraggedNodeId] = useState(null);
    const [previewIndex, setPreviewIndex] = useState(null);
    const [isReordering, setIsReordering] = useState(false);

    // Convert actions to nodes and edges (horizontal layout)
    const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
        if (!actions || actions.length === 0) {
            return { nodes: [], edges: [] };
        }

        const nodes = [];
        
        // Add start node (not draggable)
        if (currentPhaseName) {
            nodes.push({
                id: 'start-phase',
                type: 'startPhaseNode',
                position: {
                    x: -300, // Position before first action - closer spacing
                    y: 50,
                },
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
                position: {
                    x: index * 450, // Horizontal spacing - increased from 350 to 450
                    y: 50,
                },
                data: {
                    ...action,
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
                position: {
                    x: actions.length * 450, // Match action spacing
                    y: 50, // Same as action cards for alignment
                },
                data: {
                    name: nextPhase.name,
                    actionCount: nextPhase.actions?.length ?? 0,
                },
                draggable: false,
            });
        }

        const edges = [];
        
        // Connect start node to first action
        if (currentPhaseName && actions.length > 0) {
            edges.push({
                id: 'edge-start-to-first',
                source: 'start-phase',
                target: `action-${actions[0].id}`,
                type: 'default',
                animated: true,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 20,
                    height: 20,
                },
                style: {
                    strokeWidth: 2,
                    stroke: '#16a34a', // green color for start
                },
            });
        }
        
        // Connect actions to each other
        for (let i = 0; i < actions.length - 1; i++) {
            const currentAction = actions[i];
            const nextAction = actions[i + 1];
            
            // Normal forward edge (approve for review, normal for others)
            edges.push({
                id: `edge-${currentAction.id}-${nextAction.id}`,
                source: `action-${currentAction.id}`,
                sourceHandle: currentAction.action_type === 'review' ? 'approve' : null,
                target: `action-${nextAction.id}`,
                type: 'default',
                animated: true,
                label: currentAction.action_type === 'review' ? 'Approve' : undefined,
                labelBgStyle: { fill: '#22c55e', fillOpacity: 0.9 },
                labelStyle: { fill: '#fff', fontSize: 11, fontWeight: 600 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 20,
                    height: 20,
                    color: currentAction.action_type === 'review' ? '#22c55e' : '#3b82f6',
                },
                style: {
                    strokeWidth: 2,
                    stroke: currentAction.action_type === 'review' ? '#22c55e' : '#3b82f6',
                },
            });
            
            // Add deny (backward) arrow for review actions - goes from bottom to bottom of previous
            if (currentAction.action_type === 'review' && i > 0) {
                const targetIndex = Math.max(0, i - 1);
                edges.push({
                    id: `edge-${currentAction.id}-deny`,
                    source: `action-${currentAction.id}`,
                    sourceHandle: 'deny',
                    target: `action-${actions[targetIndex].id}`,
                    targetHandle: 'deny-target',
                    type: 'deny', // Use custom deny edge type
                    animated: true,
                    label: 'Deny',
                    labelBgStyle: { fill: '#ef4444', fillOpacity: 0.9 },
                    labelStyle: { fill: '#fff', fontSize: 11, fontWeight: 600 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: 20,
                        height: 20,
                        color: '#ef4444',
                    },
                    style: {
                        strokeWidth: 2,
                        stroke: '#ef4444',
                    },
                });
            }
        }

        // Connect last action to next phase
        if (nextPhase && actions.length > 0) {
            edges.push({
                id: 'edge-last-to-next-phase',
                source: `action-${actions[actions.length - 1].id}`,
                target: 'next-phase',
                type: 'default',
                animated: true,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    width: 20,
                    height: 20,
                },
                style: {
                    strokeWidth: 2,
                    stroke: '#3b82f6',
                    strokeDasharray: '5,5',
                },
            });
        }

        return { nodes, edges };
    }, [actions, onEdit, onDelete, nextPhase, currentPhaseName]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Update nodes when actions change (after reorder) - but only if not currently previewing or reordering
    useEffect(() => {
        if (isReordering || previewIndex !== null) {
            // Don't reset during reorder operation or while showing preview
            return;
        }
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [actions, nextPhase, currentPhaseName, setNodes, setEdges, initialNodes, initialEdges, isReordering, previewIndex]);

    const onNodeDragStart = useCallback(
        (event, node) => {
            if (node.id.startsWith('action-')) {
                setDraggedNodeId(node.id);
            }
        },
        []
    );

    const onNodeDrag = useCallback(
        (event, node) => {
            // Only show preview for action nodes
            if (!node.id.startsWith('action-')) {
                return;
            }

            // Calculate which position the node would drop into
            const gridX = Math.round(node.position.x / 450); // Updated from 350 to 450
            const newIndex = Math.max(0, Math.min(gridX, actions.length - 1));
            const oldIndex = actions.findIndex(a => `action-${a.id}` === node.id);

            // If we're back to the original position, reset preview
            if (newIndex === oldIndex) {
                setPreviewIndex(null);
                // Reset all nodes to original positions
                setNodes(initialNodes);
                setEdges(initialEdges);
                return;
            }

            // Only update if the preview index changed
            if (newIndex !== previewIndex) {
                setPreviewIndex(newIndex);

                // Reorder actions for edge calculation
                const previewActions = [...actions];
                const [movedAction] = previewActions.splice(oldIndex, 1);
                previewActions.splice(newIndex, 0, movedAction);

                // Update node positions (not recreating them, just repositioning)
                setNodes(prevNodes => 
                    prevNodes.map(n => {
                        if (n.id === 'start-phase') {
                            return { ...n, position: { x: -300, y: 50 } };
                        }
                        if (n.id.startsWith('action-')) {
                            const actionId = n.id;
                            const currentIndex = actions.findIndex(a => `action-${a.id}` === actionId);
                            
                            if (actionId === node.id) {
                                // The dragged node - snap to grid position
                                return {
                                    ...n,
                                    position: {
                                        x: newIndex * 450, // Updated from 350 to 450
                                        y: 50,
                                    },
                                };
                            } else {
                                // Calculate new position for other nodes
                                let visualIndex = currentIndex;
                                
                                if (oldIndex < newIndex) {
                                    // Dragging right
                                    if (currentIndex > oldIndex && currentIndex <= newIndex) {
                                        visualIndex = currentIndex - 1;
                                    }
                                } else if (oldIndex > newIndex) {
                                    // Dragging left
                                    if (currentIndex >= newIndex && currentIndex < oldIndex) {
                                        visualIndex = currentIndex + 1;
                                    }
                                }
                                
                                return {
                                    ...n,
                                    position: {
                                        x: visualIndex * 450, // Updated from 350 to 450
                                        y: 50,
                                    },
                                };
                            }
                        }
                        if (n.id === 'next-phase') {
                            return { ...n, position: { x: actions.length * 450, y: 50 } }; // Updated from 350 to 450
                        }
                        return n;
                    })
                );

                // Update edges based on new preview order
                const newEdges = [];

                // Connect start node to first action
                if (currentPhaseName && previewActions.length > 0) {
                    newEdges.push({
                        id: 'edge-start-to-first',
                        source: 'start-phase',
                        target: `action-${previewActions[0].id}`,
                        type: 'default',
                        animated: true,
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            width: 20,
                            height: 20,
                        },
                        style: { strokeWidth: 2, stroke: '#16a34a' },
                    });
                }

                // Connect actions to each other in preview order
                for (let i = 0; i < previewActions.length - 1; i++) {
                    const currentAction = previewActions[i];
                    const nextAction = previewActions[i + 1];
                    
                    // Normal forward edge (approve for review, normal for others)
                    newEdges.push({
                        id: `edge-${currentAction.id}-${nextAction.id}`,
                        source: `action-${currentAction.id}`,
                        sourceHandle: currentAction.action_type === 'review' ? 'approve' : null,
                        target: `action-${nextAction.id}`,
                        type: 'default',
                        animated: true,
                        label: currentAction.action_type === 'review' ? 'Approve' : undefined,
                        labelBgStyle: { fill: '#22c55e', fillOpacity: 0.9 },
                        labelStyle: { fill: '#fff', fontSize: 11, fontWeight: 600 },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            width: 20,
                            height: 20,
                            color: currentAction.action_type === 'review' ? '#22c55e' : '#3b82f6',
                        },
                        style: { 
                            strokeWidth: 2, 
                            stroke: currentAction.action_type === 'review' ? '#22c55e' : '#3b82f6',
                        },
                    });
                    
                    // Add deny (backward) arrow for review actions - goes from bottom to bottom of previous
                    if (currentAction.action_type === 'review' && i > 0) {
                        const targetIndex = Math.max(0, i - 1);
                        newEdges.push({
                            id: `edge-${currentAction.id}-deny`,
                            source: `action-${currentAction.id}`,
                            sourceHandle: 'deny',
                            target: `action-${previewActions[targetIndex].id}`,
                            targetHandle: 'deny-target',
                            type: 'deny', // Use custom deny edge type
                            animated: true,
                            label: 'Deny',
                            labelBgStyle: { fill: '#ef4444', fillOpacity: 0.9 },
                            labelStyle: { fill: '#fff', fontSize: 11, fontWeight: 600 },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                width: 20,
                                height: 20,
                                color: '#ef4444',
                            },
                            style: { 
                                strokeWidth: 2, 
                                stroke: '#ef4444',
                            },
                        });
                    }
                }

                // Connect last action to next phase
                if (nextPhase && previewActions.length > 0) {
                    newEdges.push({
                        id: 'edge-last-to-next-phase',
                        source: `action-${previewActions[previewActions.length - 1].id}`,
                        target: 'next-phase',
                        type: 'default',
                        animated: true,
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            width: 20,
                            height: 20,
                        },
                        style: { strokeWidth: 2, stroke: '#3b82f6', strokeDasharray: '5,5' },
                    });
                }

                setEdges(newEdges);
            }
        },
        [actions, setNodes, setEdges, initialNodes, initialEdges, previewIndex, currentPhaseName, nextPhase]
    );

    const onNodeDragStop = useCallback(
        (event, node) => {
            // Only allow reordering of action nodes
            if (!node.id.startsWith('action-')) {
                // Clear preview state for non-action nodes
                setDraggedNodeId(null);
                setPreviewIndex(null);
                return;
            }

            const oldIndex = actions.findIndex(a => `action-${a.id}` === node.id);
            const gridX = Math.round(node.position.x / 450); // Snap to grid - updated from 350 to 450
            const newIndex = Math.max(0, Math.min(gridX, actions.length - 1));

            console.log('onNodeDragStop:', { oldIndex, newIndex, nodeId: node.id });

            if (oldIndex !== newIndex && oldIndex !== -1) {
                console.log('Calling onReorder - positions changed');
                // Set reordering flag to prevent useEffect from resetting nodes
                setIsReordering(true);
                
                // Reorder the actions array
                const reorderedActions = [...actions];
                const [movedAction] = reorderedActions.splice(oldIndex, 1);
                reorderedActions.splice(newIndex, 0, movedAction);

                // Call backend to save new order - THIS SHOULD ONLY HAPPEN ON DROP
                onReorder?.(reorderedActions);
                
                // Clear the reordering flag after a short delay (backend should have responded by then)
                setTimeout(() => {
                    setIsReordering(false);
                }, 1000);
                
                // Clear drag/preview states immediately so user can start another drag
                setDraggedNodeId(null);
                setPreviewIndex(null);
            } else {
                console.log('No reorder - same position');
                // No reorder, just reset positions
                setDraggedNodeId(null);
                setPreviewIndex(null);
                setNodes(initialNodes);
            }
        },
        [actions, onReorder, setNodes, initialNodes]
    );

    if (!actions || actions.length === 0) {
        return (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
                <div className="text-center space-y-2">
                    <Clock className="mx-auto size-12 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No actions in this phase yet.</p>
                    <p className="text-xs text-muted-foreground">Click "Add action" to get started.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full rounded-xl border border-border bg-background overflow-hidden relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDragStart={onNodeDragStart}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
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
                snapGrid={[450, 50]}
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
