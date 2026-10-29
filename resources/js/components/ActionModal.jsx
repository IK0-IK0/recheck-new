import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Check,
    ChevronDown,
    ChevronUp,
    Edit3,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
import DocumentEditModal from '@/components/DocumentEditModal';

const defaultActionInitialValues = {
    name: '',
    description: '',
    action_type: 'review',
    requires_file: false,
    document_ids: [],
    roles: [],
    reviewer_groups: [],
    approve_action_id: null,
    deny_action_id: null,
    decision_mode: 'approve_deny',
    custom_decision_branches: [],
    decision_branches: [],
    review_decision_document_sets: [],
    reviewer_group_sets: [],
};

const createDecisionBranch = (type = 'custom', index = 1) => ({
    id: `decision-${Date.now()}-${index}`,
    type,
    label:
        type === 'approve'
            ? 'Approve'
            : type === 'deny'
              ? 'Deny'
              : `Outcome ${index - 2}`,
    destination: type === 'deny' ? 'end' : 'next',
});

const createReviewerGroup = (number = 1) => ({
    id: `reviewer-group-${Date.now()}-${number}`,
    name: `Assignment ${number}`,
    roleIds: [],
    documentIds: [],
    decisionDocumentSets: [],
});

function normalizeActionValues(actionValues = {}) {
    const normalizeGroup = (group) => ({
        ...group,
        roleIds: group.roleIds ?? group.role_ids ?? [],
        documentIds: group.documentIds ?? group.document_ids ?? [],
        decisionDocumentSets: (
            group.decisionDocumentSets ??
            group.decision_document_sets ??
            []
        ).map((set) => ({
            actionId: set.actionId ?? set.action_id,
            decisionId: set.decisionId ?? set.decision_id,
            documentIds: set.documentIds ?? set.document_ids ?? [],
            roleIds: set.roleIds ?? set.role_ids ?? [],
        })),
    });
    const reviewerGroups = actionValues.reviewer_groups?.length
        ? actionValues.reviewer_groups.map(normalizeGroup)
        : [
              {
                  ...createReviewerGroup(),
                  roleIds: actionValues.roles ?? [],
                  documentIds: actionValues.document_ids ?? [],
              },
          ];
    const mergedDecisionDocumentSets = new Map();
    const legacyDecisionSets = [
        ...(actionValues.review_decision_document_sets ?? []),
        ...reviewerGroups.flatMap((group) => group.decisionDocumentSets),
    ];

    legacyDecisionSets.forEach((set) => {
        const key = `${set.actionId ?? set.action_id}:${set.decisionId ?? set.decision_id}`;
        const existingSet = mergedDecisionDocumentSets.get(key);

        mergedDecisionDocumentSets.set(key, {
            actionId: set.actionId ?? set.action_id,
            decisionId: set.decisionId ?? set.decision_id,
            documentIds: [
                ...new Set([
                    ...(existingSet?.documentIds ?? []),
                    ...(set.documentIds ?? set.document_ids ?? []),
                ]),
            ],
        });
    });
    const hasStoredReviewerGroupSets =
        Array.isArray(actionValues.reviewer_group_sets) &&
        actionValues.reviewer_group_sets.length > 0;
    const storedReviewerGroupSets = hasStoredReviewerGroupSets
        ? actionValues.reviewer_group_sets.map((set) => ({
              key: set.key ?? `${set.action_id}:${set.decision_id}`,
              actionId: set.actionId ?? set.action_id,
              decisionId: set.decisionId ?? set.decision_id,
              reviewerGroups: (
                  set.reviewerGroups ??
                  set.reviewer_groups ??
                  []
              ).map(normalizeGroup),
          }))
        : [...mergedDecisionDocumentSets.values()].map((set, setIndex) => ({
              key: `${set.actionId}:${set.decisionId}`,
              actionId: set.actionId,
              decisionId: set.decisionId,
              reviewerGroups: reviewerGroups.map((group, index) => {
                  const groupLegacySet = group.decisionDocumentSets.find(
                      (legacySet) =>
                          String(legacySet.actionId) === String(set.actionId) &&
                          legacySet.decisionId === set.decisionId,
                  );

                  return {
                      ...group,
                      id: `legacy-reviewer-${set.actionId}-${setIndex}-${index + 1}`,
                      documentIds: [
                          ...new Set([
                              ...group.documentIds,
                              ...(set.documentIds ?? []),
                              ...(groupLegacySet?.documentIds ?? []),
                          ]),
                      ],
                  };
              }),
          }));
    const normalizedReviewerGroups =
        actionValues.action_type === 'submit'
            ? [
                  {
                      ...reviewerGroups[0],
                      roleIds: [
                          ...new Set(
                              reviewerGroups.flatMap((group) => group.roleIds),
                          ),
                      ],
                      documentIds: [
                          ...new Set(
                              reviewerGroups.flatMap(
                                  (group) => group.documentIds,
                              ),
                          ),
                      ],
                      decisionDocumentSets: [
                          ...mergedDecisionDocumentSets.values(),
                      ],
                  },
              ]
            : reviewerGroups.map((group) => ({
                  ...group,
                  decisionDocumentSets: [],
              }));
    const standardBranches = [
        {
            ...createDecisionBranch('approve', 1),
            destination: actionValues.approve_action_id
                ? `action:${actionValues.approve_action_id}`
                : 'next',
        },
        {
            ...createDecisionBranch('deny', 2),
            destination: actionValues.deny_action_id
                ? `action:${actionValues.deny_action_id}`
                : 'end',
        },
    ];

    return {
        ...defaultActionInitialValues,
        ...actionValues,
        roles: actionValues.roles ?? [],
        document_ids: actionValues.document_ids ?? [],
        reviewer_groups: normalizedReviewerGroups,
        reviewer_group_sets: storedReviewerGroupSets,
        review_decision_document_sets:
            actionValues.review_decision_document_sets ?? [],
        decision_mode: actionValues.decision_mode ?? 'approve_deny',
        custom_decision_branches: actionValues.custom_decision_branches ?? [],
        decision_branches: [
            ...standardBranches,
            ...(actionValues.custom_decision_branches ?? []).map((branch) => ({
                ...branch,
                type: 'custom',
            })),
        ],
    };
}

function SearchableMultiSelect({
    label,
    items,
    selectedIds,
    onToggle,
    placeholder = 'Select items',
    openDirection = 'down',
    singleSelect = false,
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState(null);
    const selectedItems = items.filter((item) => selectedIds.includes(item.id));
    const filteredItems = items.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()),
    );
    const selectionLabel = singleSelect
        ? (selectedItems[0]?.name ?? placeholder)
        : selectedItems.length
          ? `${selectedItems.length} selected`
          : placeholder;

    const updateMenuPosition = () => {
        const trigger = triggerRef.current;
        const dialogContainer = containerRef.current?.closest(
            '[data-slot="dialog-content"]',
        );

        if (!trigger || !dialogContainer) {
            return;
        }

        const rect = trigger.getBoundingClientRect();
        const containerRect = dialogContainer.getBoundingClientRect();
        setMenuPosition(
            openDirection === 'up'
                ? {
                      bottom: containerRect.bottom - rect.top + 4,
                      left: rect.left - containerRect.left,
                      width: rect.width,
                  }
                : {
                      top: rect.bottom - containerRect.top + 4,
                      left: rect.left - containerRect.left,
                      width: rect.width,
                  },
        );
    };

    useEffect(() => {
        if (!open) {
            setMenuPosition(null);
            return;
        }

        updateMenuPosition();

        const handlePointerDown = (event) => {
            const eventPath = event.composedPath?.() ?? [];
            const isInsidePicker =
                containerRef.current?.contains(event.target) ||
                menuRef.current?.contains(event.target) ||
                eventPath.includes(menuRef.current);

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
                className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-xs transition outline-none hover:border-ring focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                aria-expanded={open}
            >
                <span
                    className={
                        selectedItems.length
                            ? 'truncate text-foreground'
                            : 'text-muted-foreground'
                    }
                >
                    {selectionLabel}
                </span>
                {openDirection === 'up' ? (
                    <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                )}
            </button>
            {open && menuPosition && typeof document !== 'undefined'
                ? createPortal(
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
                                  onChange={(event) =>
                                      setQuery(event.target.value)
                                  }
                                  placeholder="Search..."
                                  className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                              />
                          </div>
                          <div className="custom-scrollbar max-h-40 overflow-y-auto py-1 pr-2">
                              {filteredItems.length ? (
                                  filteredItems.map((item) => {
                                      const selected = selectedIds.includes(
                                          item.id,
                                      );

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
                                              <span
                                                  className={`flex size-4 items-center justify-center rounded-sm border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'}`}
                                              >
                                                  {selected ? (
                                                      <Check className="size-3" />
                                                  ) : null}
                                              </span>
                                              <span className="truncate">
                                                  {item.name}
                                              </span>
                                          </button>
                                      );
                                  })
                              ) : (
                                  <p className="px-2 py-3 text-sm text-muted-foreground">
                                      No matches found.
                                  </p>
                              )}
                          </div>
                      </div>,
                      containerRef.current?.closest(
                          '[data-slot="dialog-content"]',
                      ) ??
                          document.fullscreenElement ??
                          document.body,
                  )
                : null}
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
    actions = [],
    decisionSources = [],
    actionId = null,
    onSubmit,
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [values, setValues] = useState(() =>
        normalizeActionValues(initialValues),
    );
    const [errors, setErrors] = useState({ name: '' });
    const [processing, setProcessing] = useState(false);
    const [activeDocumentSet, setActiveDocumentSet] = useState('all');
    const [activeReviewerGroupSetKey, setActiveReviewerGroupSetKey] =
        useState('all');
    const [editingDocument, setEditingDocument] = useState(null);

    const dialogOpen = open === undefined ? internalOpen : open;
    const setDialogOpen = onOpenChange ?? setInternalOpen;
    const reviewerGroupOutcomeOptions = decisionSources.flatMap((source) =>
        source.outcomes.map((outcome) => ({
            key: `${source.id}:${outcome.id}`,
            actionId: source.id,
            decisionId: outcome.id,
            label: `${source.phaseLabel} · ${source.name} · ${outcome.label}`,
        })),
    );
    const savedReviewerGroupSets = values.reviewer_group_sets.filter((set) =>
        reviewerGroupOutcomeOptions.some((option) => option.key === set.key),
    );
    const activeReviewerGroupSet = savedReviewerGroupSets.find(
        (set) => set.key === activeReviewerGroupSetKey,
    );
    const activeReviewerGroups =
        activeReviewerGroupSetKey === 'all' || !activeReviewerGroupSet
            ? values.reviewer_groups
            : activeReviewerGroupSet.reviewerGroups;

    const buildSubmissionGroups = (reviewerGroups) => {
        const [firstGroup] = reviewerGroups;

        if (!firstGroup) {
            return [];
        }

        const existingSets = new Map();

        reviewerGroups
            .flatMap((group) => group.decisionDocumentSets)
            .forEach((set) => {
                const key = `${set.actionId}:${set.decisionId}`;
                const existingSet = existingSets.get(key);

                existingSets.set(
                    key,
                    existingSet
                        ? {
                              ...existingSet,
                              documentIds: [
                                  ...new Set([
                                      ...existingSet.documentIds,
                                      ...set.documentIds,
                                  ]),
                              ],
                          }
                        : set,
                );
            });

        return [
            {
                ...firstGroup,
                roleIds: [
                    ...new Set(
                        reviewerGroups.flatMap((group) => group.roleIds),
                    ),
                ],
                documentIds: [
                    ...new Set(
                        reviewerGroups.flatMap((group) => group.documentIds),
                    ),
                ],
                decisionDocumentSets: decisionSources.flatMap((source) =>
                    source.outcomes.map(
                        (outcome) =>
                            existingSets.get(`${source.id}:${outcome.id}`) ?? {
                                actionId: source.id,
                                decisionId: outcome.id,
                                documentIds: [],
                                roleIds: [],
                            },
                    ),
                ),
            },
        ];
    };
    const reviewerGroupsForAction =
        values.action_type === 'submit'
            ? buildSubmissionGroups(values.reviewer_groups)
            : activeReviewerGroups;
    const activeDocumentSetExists =
        activeDocumentSet === 'all' ||
        values.action_type !== 'submit' ||
        reviewerGroupsForAction[0]?.decisionDocumentSets.some(
            (set) => `${set.actionId}:${set.decisionId}` === activeDocumentSet,
        );
    const activeDocumentSetForDisplay = activeDocumentSetExists
        ? activeDocumentSet
        : 'all';

    useEffect(() => {
        if (!dialogOpen) {
            return;
        }

        setValues(normalizeActionValues(initialValues));
        setErrors({ name: '' });
        setActiveDocumentSet('all');
        setActiveReviewerGroupSetKey('all');
    }, [dialogOpen]);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!values.name.trim()) {
            setErrors({
                name: 'Action name is required.',
                decision_branches: '',
            });

            return;
        }

        const decisionBranches = visibleDecisionBranches;
        const decisionMode =
            values.action_type === 'review'
                ? values.decision_mode
                : 'approve_deny';
        const decisionLabels = decisionBranches.map((branch) =>
            branch.label.trim().toLowerCase(),
        );

        if (
            decisionBranches.some((branch) => !branch.label.trim()) ||
            (decisionMode === 'custom' && decisionBranches.length === 0) ||
            new Set(decisionLabels).size !== decisionLabels.length
        ) {
            setErrors({
                name: '',
                decision_branches:
                    decisionMode === 'custom' && decisionBranches.length === 0
                        ? 'Add at least one custom outcome.'
                        : 'Give every decision outcome a unique name.',
            });

            return;
        }

        setProcessing(true);

        try {
            const submissionValues = { ...values };
            delete submissionValues.decision_branches;
            delete submissionValues.roles;
            delete submissionValues.reviewer_groups;
            const rest = submissionValues;
            const submissionGroups = reviewerGroupsForAction;
            const decisionDocumentSets =
                values.action_type === 'submit'
                    ? submissionGroups.flatMap(
                          (group) => group.decisionDocumentSets,
                      )
                    : [];
            const configuredReviewerGroups =
                values.action_type === 'review'
                    ? [
                          ...values.reviewer_groups,
                          ...savedReviewerGroupSets.flatMap(
                              (set) => set.reviewerGroups,
                          ),
                      ]
                    : submissionGroups;
            const roleIds = [
                ...new Set([
                    ...configuredReviewerGroups.flatMap(
                        (group) => group.roleIds,
                    ),
                    ...decisionDocumentSets.flatMap((set) => set.roleIds),
                ]),
            ];
            const decisionDocumentIds = decisionDocumentSets.flatMap(
                (set) => set.documentIds,
            );
            const documentIds = [
                ...new Set([
                    ...configuredReviewerGroups.flatMap(
                        (group) => group.documentIds,
                    ),
                    ...decisionDocumentIds,
                ]),
            ];
            const actionDestination = (branch) =>
                branch?.destination.startsWith('action:')
                    ? Number(branch.destination.slice('action:'.length))
                    : null;
            const savedDecisionBranches = decisionBranches.map(
                ({ id, label, destination }) => ({
                    id,
                    label,
                    destination,
                }),
            );
            const serializeGroup = (group) => ({
                id: group.id,
                name: group.name,
                role_ids: group.roleIds,
                document_ids: group.documentIds,
            });

            await onSubmit?.({
                ...rest,
                role_ids: roleIds,
                document_ids: documentIds,
                reviewer_groups:
                    values.action_type === 'review'
                        ? values.reviewer_groups.map((group) => ({
                              ...serializeGroup(group),
                              decision_document_sets: [],
                          }))
                        : submissionGroups.map((group) => ({
                              ...serializeGroup(group),
                              decision_document_sets:
                                  group.decisionDocumentSets.map((set) => ({
                                      action_id: Number(set.actionId),
                                      decision_id: set.decisionId,
                                      document_ids: set.documentIds,
                                      role_ids: set.roleIds,
                                  })),
                          })),
                reviewer_group_sets:
                    values.action_type === 'review'
                        ? savedReviewerGroupSets.map((set) => ({
                              key: set.key,
                              action_id: Number(set.actionId),
                              decision_id: set.decisionId,
                              reviewer_groups:
                                  set.reviewerGroups.map(serializeGroup),
                          }))
                        : [],
                review_decision_document_sets: [],
                decision_mode: decisionMode,
                approve_action_id:
                    decisionMode === 'approve_deny'
                        ? actionDestination(
                              decisionBranches.find(
                                  (branch) => branch.type === 'approve',
                              ),
                          )
                        : null,
                deny_action_id:
                    decisionMode === 'approve_deny'
                        ? actionDestination(
                              decisionBranches.find(
                                  (branch) => branch.type === 'deny',
                              ),
                          )
                        : null,
                custom_decision_branches:
                    decisionMode === 'custom' ? savedDecisionBranches : [],
            });
            setDialogOpen(false);
        } finally {
            setProcessing(false);
        }
    };

    const addReviewerGroup = () => {
        updateActiveReviewerGroups([
            ...reviewerGroupsForAction,
            createReviewerGroup(reviewerGroupsForAction.length + 1),
        ]);
    };

    const updateActiveReviewerGroups = (reviewerGroups) => {
        if (
            values.action_type !== 'review' ||
            activeReviewerGroupSetKey === 'all'
        ) {
            setValues({ ...values, reviewer_groups: reviewerGroups });

            return;
        }

        const option = reviewerGroupOutcomeOptions.find(
            (item) => item.key === activeReviewerGroupSetKey,
        );
        if (!option) {
            return;
        }

        const existingSetIndex = values.reviewer_group_sets.findIndex(
            (set) => set.key === option.key,
        );
        const optionIndex = reviewerGroupOutcomeOptions.findIndex(
            (item) => item.key === option.key,
        );
        const groupsForSet =
            existingSetIndex < 0
                ? reviewerGroups.map((group, index) => ({
                      ...group,
                      id: `reviewer-group-set-${option.actionId}-${optionIndex}-${Date.now()}-${index + 1}`,
                  }))
                : reviewerGroups;
        const reviewerGroupSet = {
            key: option.key,
            actionId: option.actionId,
            decisionId: option.decisionId,
            reviewerGroups: groupsForSet,
        };
        const nextReviewerGroupSets = [...values.reviewer_group_sets];
        if (existingSetIndex < 0) {
            nextReviewerGroupSets.push(reviewerGroupSet);
        } else {
            nextReviewerGroupSets[existingSetIndex] = reviewerGroupSet;
        }

        setValues({ ...values, reviewer_group_sets: nextReviewerGroupSets });
    };

    const updateReviewerGroup = (groupId, updates) => {
        const sourceGroups =
            values.action_type === 'review'
                ? activeReviewerGroups
                : values.reviewer_groups;
        const nextGroups = sourceGroups.map((group) =>
            group.id === groupId ? { ...group, ...updates } : group,
        );

        if (values.action_type === 'review') {
            updateActiveReviewerGroups(nextGroups);

            return;
        }

        setValues({ ...values, reviewer_groups: nextGroups });
    };

    const removeReviewerGroup = (groupId) => {
        const sourceGroups =
            values.action_type === 'review'
                ? activeReviewerGroups
                : values.reviewer_groups;
        const nextGroups = sourceGroups.filter((group) => group.id !== groupId);

        if (values.action_type === 'review') {
            updateActiveReviewerGroups(nextGroups);

            return;
        }

        setValues({ ...values, reviewer_groups: nextGroups });
    };

    const toggleGroupDocument = (group, documentId) => {
        if (
            values.action_type === 'submit' &&
            activeDocumentSetForDisplay !== 'all'
        ) {
            updateReviewerGroup(group.id, {
                decisionDocumentSets: group.decisionDocumentSets.map((set) =>
                    `${set.actionId}:${set.decisionId}` ===
                    activeDocumentSetForDisplay
                        ? {
                              ...set,
                              documentIds: set.documentIds.includes(documentId)
                                  ? set.documentIds.filter(
                                        (item) => item !== documentId,
                                    )
                                  : [...set.documentIds, documentId],
                          }
                        : set,
                ),
            });
            return;
        }

        const documentIds = group.documentIds.includes(documentId)
            ? group.documentIds.filter((item) => item !== documentId)
            : [...group.documentIds, documentId];

        updateReviewerGroup(group.id, { documentIds });
    };

    const updateDecisionSetRole = (group, roleId) => {
        updateReviewerGroup(group.id, {
            decisionDocumentSets: group.decisionDocumentSets.map((set) =>
                `${set.actionId}:${set.decisionId}` ===
                activeDocumentSetForDisplay
                    ? {
                          ...set,
                          roleIds: set.roleIds.includes(roleId) ? [] : [roleId],
                      }
                    : set,
            ),
        });
    };

    const updateSubmissionRole = (group, roleId) => {
        if (activeDocumentSetForDisplay === 'all') {
            updateReviewerGroup(group.id, {
                roleIds: group.roleIds.includes(roleId) ? [] : [roleId],
            });

            return;
        }

        updateDecisionSetRole(group, roleId);
    };

    const clearActiveDocumentSet = (group) => {
        if (activeDocumentSetForDisplay === 'all') {
            updateReviewerGroup(group.id, {
                ...(values.action_type === 'submit' ? { roleIds: [] } : {}),
                documentIds: [],
            });

            return;
        }

        if (values.action_type === 'submit') {
            updateReviewerGroup(group.id, {
                decisionDocumentSets: group.decisionDocumentSets.map((set) =>
                    `${set.actionId}:${set.decisionId}` ===
                    activeDocumentSetForDisplay
                        ? { ...set, roleIds: [], documentIds: [] }
                        : set,
                ),
            });

            return;
        }
    };

    const hasConfiguredOutcomeSets = (group) =>
        group.decisionDocumentSets.some(
            (set) => set.roleIds.length > 0 || set.documentIds.length > 0,
        );

    const isCurrentDocumentSetEmpty = (group, index) => {
        if (activeDocumentSetForDisplay === 'all') {
            return (
                group.documentIds.length === 0 &&
                (values.action_type !== 'submit' || group.roleIds.length === 0)
            );
        }

        const currentSet = group.decisionDocumentSets.find(
            (set) =>
                `${set.actionId}:${set.decisionId}` ===
                activeDocumentSetForDisplay,
        );

        return (
            !currentSet ||
            (currentSet.roleIds.length === 0 &&
                currentSet.documentIds.length === 0)
        );
    };

    const updateDecisionBranch = (branchId, updates) => {
        setValues({
            ...values,
            decision_branches: values.decision_branches.map((branch) =>
                branch.id === branchId ? { ...branch, ...updates } : branch,
            ),
        });
    };

    const addDecisionBranch = () => {
        const customBranchCount = values.decision_branches.filter(
            (branch) => branch.type === 'custom',
        ).length;

        setValues({
            ...values,
            decision_branches: [
                ...values.decision_branches,
                createDecisionBranch('custom', customBranchCount + 3),
            ],
        });
    };

    const updateDecisionMode = (decisionMode) => {
        const customBranches = values.decision_branches.filter(
            (branch) => branch.type === 'custom',
        );
        const nextBranches =
            decisionMode === 'custom' && customBranches.length === 0
                ? [
                      ...values.decision_branches,
                      createDecisionBranch('custom', 3),
                  ]
                : values.decision_branches;

        setValues({
            ...values,
            decision_mode: decisionMode,
            decision_branches: nextBranches,
        });
    };

    const moveDecisionBranch = (branchId, direction) => {
        const branchIndex = values.decision_branches.findIndex(
            (branch) => branch.id === branchId,
        );
        const targetIndex = branchIndex + direction;

        if (
            branchIndex < 0 ||
            targetIndex < 0 ||
            targetIndex >= values.decision_branches.length
        ) {
            return;
        }

        const decisionBranches = [...values.decision_branches];
        [decisionBranches[branchIndex], decisionBranches[targetIndex]] = [
            decisionBranches[targetIndex],
            decisionBranches[branchIndex],
        ];
        setValues({ ...values, decision_branches: decisionBranches });
    };

    const removeDecisionBranch = (branchId) => {
        setValues({
            ...values,
            decision_branches: values.decision_branches.filter(
                (branch) => branch.id !== branchId,
            ),
        });
    };

    const visibleDecisionBranches = values.decision_branches.filter((branch) =>
        values.decision_mode === 'custom'
            ? branch.type === 'custom'
            : branch.type !== 'custom',
    );

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
                container={
                    typeof document !== 'undefined'
                        ? (document.fullscreenElement ?? undefined)
                        : undefined
                }
                className="flex h-[min(88vh,860px)] max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl lg:max-w-4xl"
            >
                <DialogHeader className="shrink-0 border-b border-border px-6 py-5 pr-14 text-left">
                    <DialogTitle className="text-lg">{title}</DialogTitle>
                    <DialogDescription className="text-sm">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <form
                    className="flex min-h-0 flex-1 flex-col"
                    onSubmit={handleSubmit}
                >
                    <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
                        <div className="grid gap-3">
                            <Label htmlFor="action-name">Name</Label>
                            <Input
                                id="action-name"
                                value={values.name}
                                onChange={(event) =>
                                    setValues({
                                        ...values,
                                        name: event.target.value,
                                    })
                                }
                                placeholder="Action name"
                            />
                            {errors.name ? (
                                <p className="text-sm text-destructive">
                                    {errors.name}
                                </p>
                            ) : null}
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="action-description">
                                Description
                            </Label>
                            <textarea
                                id="action-description"
                                value={values.description}
                                onChange={(event) =>
                                    setValues({
                                        ...values,
                                        description: event.target.value,
                                    })
                                }
                                className="max-h-40 min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2.5 text-sm shadow-xs transition outline-none focus-visible:border-ring focus-visible:ring-ring/50"
                                placeholder="Optional description"
                            />
                        </div>

                        <div className="grid gap-3">
                            <Label htmlFor="action-type">Action type</Label>
                            <Select
                                value={values.action_type ?? 'review'}
                                onValueChange={(actionType) =>
                                    setValues({
                                        ...values,
                                        action_type: actionType,
                                        requires_file: actionType === 'submit',
                                        approve_action_id:
                                            actionType === 'review'
                                                ? values.approve_action_id
                                                : null,
                                        deny_action_id:
                                            actionType === 'review'
                                                ? values.deny_action_id
                                                : null,
                                    })
                                }
                            >
                                <SelectTrigger
                                    id="action-type"
                                    className="w-full"
                                >
                                    <SelectValue placeholder="Select action type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="review">
                                        Review
                                    </SelectItem>
                                    <SelectItem value="submit">
                                        Submit
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {values.action_type === 'review' ? (
                            <div className="grid gap-7">
                                <section className="grid gap-5 rounded-xl border border-border bg-muted/20 p-5 sm:p-6">
                                    <div className="grid gap-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <Label className="text-sm">
                                                    Outcome mode
                                                </Label>
                                                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                                                    Choose standard Approve and
                                                    Deny routes or define your
                                                    own named outcomes.
                                                </p>
                                            </div>
                                            {values.decision_mode ===
                                            'custom' ? (
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    className="shrink-0"
                                                    onClick={addDecisionBranch}
                                                >
                                                    <Plus className="size-4" />
                                                    Add custom outcome
                                                </Button>
                                            ) : null}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="decision-mode">
                                                Mode
                                            </Label>
                                            <Select
                                                value={values.decision_mode}
                                                onValueChange={
                                                    updateDecisionMode
                                                }
                                            >
                                                <SelectTrigger
                                                    id="decision-mode"
                                                    className="h-10 w-full"
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="approve_deny">
                                                        Approve and Deny
                                                    </SelectItem>
                                                    <SelectItem value="custom">
                                                        Custom outcomes
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {errors.decision_branches ? (
                                            <p className="text-sm text-destructive">
                                                {errors.decision_branches}
                                            </p>
                                        ) : null}
                                        <div className="grid gap-4">
                                            {visibleDecisionBranches.map(
                                                (branch, index) => (
                                                    <div
                                                        key={branch.id}
                                                        className="grid gap-4 rounded-xl border border-border bg-background p-4 sm:p-5"
                                                    >
                                                        <div className="flex flex-nowrap items-center gap-2">
                                                            <span
                                                                className={`size-2.5 shrink-0 rounded-full ${
                                                                    branch.type ===
                                                                    'approve'
                                                                        ? 'bg-green-500'
                                                                        : branch.type ===
                                                                            'deny'
                                                                          ? 'bg-red-500'
                                                                          : 'bg-violet-500'
                                                                }`}
                                                            />
                                                            {branch.type ===
                                                            'custom' ? (
                                                                <Input
                                                                    value={
                                                                        branch.label
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateDecisionBranch(
                                                                            branch.id,
                                                                            {
                                                                                label: event
                                                                                    .target
                                                                                    .value,
                                                                            },
                                                                        )
                                                                    }
                                                                    aria-label={`Outcome ${index + 1} name`}
                                                                    placeholder="Outcome name"
                                                                    className="h-8 min-w-0 flex-1"
                                                                />
                                                            ) : (
                                                                <p className="flex-1 text-sm font-semibold">
                                                                    {
                                                                        branch.label
                                                                    }
                                                                </p>
                                                            )}
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="shrink-0"
                                                                onClick={() =>
                                                                    moveDecisionBranch(
                                                                        branch.id,
                                                                        -1,
                                                                    )
                                                                }
                                                                disabled={
                                                                    index === 0
                                                                }
                                                                aria-label={`Move ${branch.label} up`}
                                                                title="Move up"
                                                            >
                                                                <ChevronUp className="size-4" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="shrink-0"
                                                                onClick={() =>
                                                                    moveDecisionBranch(
                                                                        branch.id,
                                                                        1,
                                                                    )
                                                                }
                                                                disabled={
                                                                    index ===
                                                                    visibleDecisionBranches.length -
                                                                        1
                                                                }
                                                                aria-label={`Move ${branch.label} down`}
                                                                title="Move down"
                                                            >
                                                                <ChevronDown className="size-4" />
                                                            </Button>
                                                            {branch.type ===
                                                            'custom' ? (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="shrink-0"
                                                                    onClick={() =>
                                                                        removeDecisionBranch(
                                                                            branch.id,
                                                                        )
                                                                    }
                                                                    aria-label={`Remove ${branch.label}`}
                                                                    title="Remove outcome"
                                                                >
                                                                    <Trash2 className="size-4 text-destructive" />
                                                                </Button>
                                                            ) : null}
                                                        </div>
                                                        <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:items-center">
                                                            <Label
                                                                htmlFor={`decision-destination-${branch.id}`}
                                                            >
                                                                Send to
                                                            </Label>
                                                            <Select
                                                                value={
                                                                    branch.destination
                                                                }
                                                                onValueChange={(
                                                                    destination,
                                                                ) =>
                                                                    updateDecisionBranch(
                                                                        branch.id,
                                                                        {
                                                                            destination,
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger
                                                                    id={`decision-destination-${branch.id}`}
                                                                    className="h-10 w-full"
                                                                >
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {branch.type !==
                                                                    'deny' ? (
                                                                        <SelectItem value="next">
                                                                            Next
                                                                            workflow
                                                                            step
                                                                        </SelectItem>
                                                                    ) : null}
                                                                    {branch.type !==
                                                                    'approve' ? (
                                                                        <SelectItem value="end">
                                                                            End
                                                                            this
                                                                            path
                                                                        </SelectItem>
                                                                    ) : null}
                                                                    {actions
                                                                        .filter(
                                                                            (
                                                                                action,
                                                                            ) => {
                                                                                if (
                                                                                    action.id ===
                                                                                    actionId
                                                                                ) {
                                                                                    return false;
                                                                                }

                                                                                if (
                                                                                    branch.type !==
                                                                                        'approve' &&
                                                                                    branch.type !==
                                                                                        'deny'
                                                                                ) {
                                                                                    return true;
                                                                                }

                                                                                const otherType =
                                                                                    branch.type ===
                                                                                    'approve'
                                                                                        ? 'deny'
                                                                                        : 'approve';
                                                                                const otherDestination =
                                                                                    values.decision_branches.find(
                                                                                        (
                                                                                            item,
                                                                                        ) =>
                                                                                            item.type ===
                                                                                            otherType,
                                                                                    )?.destination;

                                                                                return (
                                                                                    otherDestination !==
                                                                                    `action:${action.id}`
                                                                                );
                                                                            },
                                                                        )
                                                                        .map(
                                                                            (
                                                                                action,
                                                                            ) => (
                                                                                <SelectItem
                                                                                    key={
                                                                                        action.id
                                                                                    }
                                                                                    value={`action:${action.id}`}
                                                                                >
                                                                                    {
                                                                                        action.name
                                                                                    }
                                                                                </SelectItem>
                                                                            ),
                                                                        )}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                </section>
                                {values.decision_mode === 'custom' ? (
                                    <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                                        Proposals follow these custom outcome
                                        routes when a reviewer completes this
                                        action.
                                    </p>
                                ) : null}
                            </div>
                        ) : null}

                        <section className="grid gap-5 border-t border-border pt-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <Label className="text-sm">
                                        {values.action_type === 'submit'
                                            ? 'Submission assignment'
                                            : 'Reviewer groups'}
                                    </Label>
                                    {values.action_type !== 'submit' ? (
                                        <>
                                            <p className="mt-1.5 text-sm text-muted-foreground">
                                                Choose who reviews this action
                                                and which documents they need.
                                            </p>
                                            {values.action_type === 'review' ? (
                                                <p className="mt-1.5 text-xs text-muted-foreground">
                                                    The role in the first
                                                    assignment is the main
                                                    reviewer role. Its members
                                                    assign additional reviewers
                                                    from Tracking.
                                                </p>
                                            ) : null}
                                        </>
                                    ) : null}
                                </div>
                                {values.action_type !== 'submit' ? (
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        {decisionSources.length > 0 ? (
                                            <Select
                                                value={
                                                    activeReviewerGroupSetKey
                                                }
                                                onValueChange={
                                                    setActiveReviewerGroupSetKey
                                                }
                                            >
                                                <SelectTrigger
                                                    aria-label="Reviewer group outcome set"
                                                    className="h-9 w-full sm:w-72"
                                                >
                                                    <SelectValue placeholder="Choose reviewer group set" />
                                                </SelectTrigger>
                                                <SelectContent className="custom-scrollbar max-h-56">
                                                    <SelectItem value="all">
                                                        All (fallback)
                                                    </SelectItem>
                                                    {reviewerGroupOutcomeOptions.map(
                                                        (option) => (
                                                            <SelectItem
                                                                key={option.key}
                                                                value={
                                                                    option.key
                                                                }
                                                            >
                                                                {option.label}
                                                                {!savedReviewerGroupSets.some(
                                                                    (set) =>
                                                                        set.key ===
                                                                        option.key,
                                                                )
                                                                    ? ' · uses All'
                                                                    : ''}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        ) : null}
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            className="shrink-0"
                                            onClick={addReviewerGroup}
                                            aria-label="Add reviewer group"
                                            title="Add reviewer group"
                                        >
                                            <Plus className="size-4" />
                                            Add reviewer group
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                            {values.action_type === 'review' &&
                            activeReviewerGroupSetKey !== 'all' &&
                            !activeReviewerGroupSet ? (
                                <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                                    This outcome is using the All reviewer
                                    groups until you customize it. Changes here
                                    will be saved for this outcome only.
                                </p>
                            ) : null}
                            {reviewerGroupsForAction.length ? (
                                <div className="grid gap-4">
                                    {reviewerGroupsForAction.map(
                                        (group, index) => (
                                            <div
                                                key={group.id}
                                                className={`grid gap-4 rounded-xl border bg-background p-4 sm:p-5 ${
                                                    values.action_type ===
                                                        'review' && index === 0
                                                        ? 'border-primary ring-2 ring-primary/20'
                                                        : 'border-border'
                                                }`}
                                            >
                                                {values.action_type ===
                                                    'review' && index === 0 ? (
                                                    <p className="w-fit rounded-full border border-primary/40 px-2.5 py-1 text-xs font-semibold text-primary">
                                                        Main reviewer role
                                                    </p>
                                                ) : null}
                                                <div
                                                    className={
                                                        values.action_type ===
                                                            'submit' ||
                                                        (values.action_type ===
                                                            'review' &&
                                                            index === 0 &&
                                                            decisionSources.length >
                                                                0)
                                                            ? 'grid grid-cols-[minmax(0,1fr)_minmax(8rem,14rem)] items-center gap-3'
                                                            : 'flex items-center gap-3'
                                                    }
                                                >
                                                    <Input
                                                        value={group.name}
                                                        onChange={(event) =>
                                                            updateReviewerGroup(
                                                                group.id,
                                                                {
                                                                    name: event
                                                                        .target
                                                                        .value,
                                                                },
                                                            )
                                                        }
                                                        aria-label={`Assignment ${index + 1} name`}
                                                        className="h-9"
                                                    />
                                                    {values.action_type ===
                                                    'submit' ? (
                                                        <Select
                                                            value={
                                                                activeDocumentSetForDisplay
                                                            }
                                                            onValueChange={
                                                                setActiveDocumentSet
                                                            }
                                                        >
                                                            <SelectTrigger
                                                                aria-label="Submission assignment set"
                                                                className="h-9 w-full"
                                                            >
                                                                <SelectValue placeholder="Choose document and outcome set" />
                                                            </SelectTrigger>
                                                            <SelectContent className="custom-scrollbar max-h-48">
                                                                <SelectItem value="all">
                                                                    <span className="flex w-full items-center justify-between gap-3">
                                                                        <span>
                                                                            All
                                                                        </span>
                                                                        {!hasConfiguredOutcomeSets(
                                                                            group,
                                                                        ) &&
                                                                        (group
                                                                            .roleIds
                                                                            .length >
                                                                            0 ||
                                                                            group
                                                                                .documentIds
                                                                                .length >
                                                                                0) ? (
                                                                            <span
                                                                                className="size-2 shrink-0 rounded-full bg-primary"
                                                                                aria-label="Assignment has configured documents or role"
                                                                            />
                                                                        ) : null}
                                                                    </span>
                                                                </SelectItem>
                                                                {group.decisionDocumentSets.map(
                                                                    (set) => {
                                                                        const source =
                                                                            decisionSources.find(
                                                                                (
                                                                                    item,
                                                                                ) =>
                                                                                    String(
                                                                                        item.id,
                                                                                    ) ===
                                                                                    String(
                                                                                        set.actionId,
                                                                                    ),
                                                                            );
                                                                        const outcome =
                                                                            source?.outcomes.find(
                                                                                (
                                                                                    item,
                                                                                ) =>
                                                                                    item.id ===
                                                                                    set.decisionId,
                                                                            );

                                                                        if (
                                                                            !source ||
                                                                            !outcome
                                                                        ) {
                                                                            return null;
                                                                        }

                                                                        return (
                                                                            <SelectItem
                                                                                key={`${set.actionId}:${set.decisionId}`}
                                                                                value={`${set.actionId}:${set.decisionId}`}
                                                                            >
                                                                                <span className="flex w-full items-center justify-between gap-3">
                                                                                    <span>
                                                                                        {
                                                                                            source.phaseLabel
                                                                                        }{' '}
                                                                                        ·{' '}
                                                                                        {
                                                                                            source.name
                                                                                        }{' '}
                                                                                        ·{' '}
                                                                                        {
                                                                                            outcome.label
                                                                                        }
                                                                                    </span>
                                                                                    {set
                                                                                        .documentIds
                                                                                        .length >
                                                                                        0 ||
                                                                                    set
                                                                                        .roleIds
                                                                                        .length >
                                                                                        0 ? (
                                                                                        <span
                                                                                            className="size-2 shrink-0 rounded-full bg-primary"
                                                                                            aria-label="Outcome has configured documents or role"
                                                                                        />
                                                                                    ) : null}
                                                                                </span>
                                                                            </SelectItem>
                                                                        );
                                                                    },
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : null}
                                                    {values.action_type !==
                                                    'submit' ? (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                removeReviewerGroup(
                                                                    group.id,
                                                                )
                                                            }
                                                            aria-label={`Remove ${group.name}`}
                                                            title={
                                                                values.action_type ===
                                                                'submit'
                                                                    ? 'Remove assignment'
                                                                    : 'Remove reviewer group'
                                                            }
                                                            className="size-9 border border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    ) : null}
                                                </div>
                                                {values.action_type ===
                                                    'submit' ||
                                                values.action_type ===
                                                    'review' ? (
                                                    <div className="grid gap-4">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <Label>
                                                                Required
                                                                documents
                                                            </Label>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 gap-1.5 px-2 text-muted-foreground"
                                                                onClick={() =>
                                                                    clearActiveDocumentSet(
                                                                        group,
                                                                    )
                                                                }
                                                                disabled={isCurrentDocumentSetEmpty(
                                                                    group,
                                                                    index,
                                                                )}
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                                Clear current
                                                                set
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : null}
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    {values.action_type ===
                                                    'submit' ? (
                                                        <div className="grid gap-2.5">
                                                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                                Role responsible
                                                            </p>
                                                            <SearchableMultiSelect
                                                                label="Role responsible for this assignment set"
                                                                items={roles}
                                                                selectedIds={
                                                                    activeDocumentSetForDisplay ===
                                                                    'all'
                                                                        ? group.roleIds
                                                                        : (group.decisionDocumentSets.find(
                                                                              (
                                                                                  set,
                                                                              ) =>
                                                                                  `${set.actionId}:${set.decisionId}` ===
                                                                                  activeDocumentSetForDisplay,
                                                                          )
                                                                              ?.roleIds ??
                                                                          [])
                                                                }
                                                                onToggle={(
                                                                    roleId,
                                                                ) =>
                                                                    updateSubmissionRole(
                                                                        group,
                                                                        roleId,
                                                                    )
                                                                }
                                                                placeholder="Choose the role that will work on this set"
                                                                openDirection="up"
                                                                singleSelect
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="grid gap-2.5">
                                                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                                Role
                                                            </p>
                                                            <SearchableMultiSelect
                                                                label="Interchangeable roles"
                                                                items={roles}
                                                                selectedIds={
                                                                    group.roleIds
                                                                }
                                                                onToggle={(
                                                                    roleId,
                                                                ) =>
                                                                    updateReviewerGroup(
                                                                        group.id,
                                                                        {
                                                                            roleIds:
                                                                                group.roleIds.includes(
                                                                                    roleId,
                                                                                )
                                                                                    ? []
                                                                                    : [
                                                                                          roleId,
                                                                                      ],
                                                                        },
                                                                    )
                                                                }
                                                                placeholder="Choose interchangeable roles"
                                                                openDirection="up"
                                                                singleSelect
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="grid gap-2.5">
                                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                            Documents
                                                        </p>
                                                        <SearchableMultiSelect
                                                            label="Documents for this group"
                                                            items={documents}
                                                            selectedIds={
                                                                values.action_type ===
                                                                    'submit' &&
                                                                activeDocumentSetForDisplay !==
                                                                    'all'
                                                                    ? (group.decisionDocumentSets.find(
                                                                          (
                                                                              set,
                                                                          ) =>
                                                                              `${set.actionId}:${set.decisionId}` ===
                                                                              activeDocumentSetForDisplay,
                                                                      )
                                                                          ?.documentIds ??
                                                                      [])
                                                                    : group.documentIds
                                                            }
                                                            onToggle={(
                                                                documentId,
                                                            ) =>
                                                                toggleGroupDocument(
                                                                    group,
                                                                    documentId,
                                                                )
                                                            }
                                                            placeholder={
                                                                'Choose documents'
                                                            }
                                                            openDirection="up"
                                                        />
                                                    </div>
                                                </div>
                                                {/* Selected documents with form edit */}
                                                {(() => {
                                                    const selectedDocumentIds = values.action_type === 'submit' && activeDocumentSetForDisplay !== 'all'
                                                        ? (group.decisionDocumentSets.find(
                                                              (set) => `${set.actionId}:${set.decisionId}` === activeDocumentSetForDisplay,
                                                          )?.documentIds ?? [])
                                                        : group.documentIds;
                                                    const selectedDocs = documents.filter(doc => selectedDocumentIds.includes(doc.id));
                                                    
                                                    if (selectedDocs.length === 0) return null;
                                                    
                                                    return (
                                                        <div className="mt-3 grid gap-2">
                                                            <p className="text-xs font-semibold text-muted-foreground">Selected documents:</p>
                                                            <div className="grid gap-2">
                                                                {selectedDocs.map((doc) => (
                                                                    <div key={doc.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                                                                        <span className="text-sm">{doc.name}</span>
                                                                        {doc.label === 'form' ? (
                                                                            <Button
                                                                                type="button"
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-7 gap-1.5 text-xs"
                                                                                onClick={() => setEditingDocument(doc)}
                                                                            >
                                                                                <Edit3 className="size-3.5" />
                                                                                Configure form
                                                                            </Button>
                                                                        ) : (
                                                                            <span className="text-xs text-muted-foreground">Document</span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        ),
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-border p-5 text-sm leading-relaxed text-muted-foreground">
                                    {values.action_type === 'submit'
                                        ? 'Configure the default documents and any outcome-specific documents for this submission.'
                                        : 'Add a reviewer group, then choose its role, required documents, and any outcome-specific documents.'}
                                </div>
                            )}
                        </section>
                    </div>
                    <DialogFooter className="shrink-0 border-t border-border bg-background px-6 py-4">
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
            
            {/* Form editor modal */}
            {editingDocument ? (
                <DocumentEditModal
                    document={editingDocument}
                    open={Boolean(editingDocument)}
                    onOpenChange={(open) => {
                        if (!open) setEditingDocument(null);
                    }}
                />
            ) : null}
        </Dialog>
    );
}
