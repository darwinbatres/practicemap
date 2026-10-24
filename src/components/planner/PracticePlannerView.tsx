import React, { useMemo, useRef, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Edit3,
  ExternalLink,
  GanttChart,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import {
  CalendarFilterTab,
  getSafeExternalUrl,
  HorizonFilter,
  PlannerLayoutMode,
  PracticeRoadmapItem,
  PracticeTask,
  PracticeTaskKind,
  PracticeTaskPriority,
  RoadmapHorizon,
  RoadmapItemStatus,
} from '../../types/topology';
import { CustomSelect } from '../ui/CustomSelect';
import {
  getActiveToggleClass,
  getCloseButtonClass,
  getDangerIconButtonClass,
  getHeaderFooterSurfaceClass,
  getHeaderIconBadgeClass,
  getInactiveToggleClass,
  getInputSurfaceClass,
  getPanelSurfaceClass,
  getPrimaryButtonClass,
  getSecondaryButtonClass,
  getSubCardSurfaceClass,
} from '../../utils/uiTheme';

const HORIZON_CONFIG: {
  key: RoadmapHorizon;
  label: string;
  shortLabel: string;
  dotClass: string;
  badgeDark: string;
  badgeLight: string;
}[] = [
  {
    key: 'now',
    label: 'Now (Active)',
    shortLabel: 'Now',
    dotClass: 'bg-emerald-400',
    badgeDark: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    badgeLight: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    key: 'next',
    label: 'Next',
    shortLabel: 'Next',
    dotClass: 'bg-indigo-400',
    badgeDark: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    badgeLight: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    key: 'later',
    label: 'Later',
    shortLabel: 'Later',
    dotClass: 'bg-amber-400',
    badgeDark: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    badgeLight: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    key: 'exploring',
    label: 'Exploring / Ideas',
    shortLabel: 'Exploring',
    dotClass: 'bg-violet-400',
    badgeDark: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    badgeLight: 'bg-violet-50 text-violet-700 border-violet-200',
  },
];

const ROADMAP_STATUS_LABELS: Record<RoadmapItemStatus, string> = {
  idea: 'Idea',
  discovery: 'Discovery',
  'in-progress': 'In Progress',
  blocked: 'Blocked',
  completed: 'Completed',
};

const HORIZON_OPTIONS = HORIZON_CONFIG.map((h) => ({
  value: h.key,
  label: h.label,
}));

const ROADMAP_STATUS_OPTIONS: { value: RoadmapItemStatus; label: string }[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High', dotColor: '#f43f5e' },
  { value: 'medium', label: 'Medium', dotColor: '#f59e0b' },
  { value: 'low', label: 'Low', dotColor: '#64748b' },
];

function toIsoDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoDate(iso?: string): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return null;
  const [y, m, d] = iso.trim().split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDaysToIso(baseIso: string, days: number): string {
  const d = parseIsoDate(baseIso) || new Date();
  d.setDate(d.getDate() + days);
  return toIsoDateString(d);
}

function formatReadableDate(iso?: string): string {
  if (!iso) return 'Pick date';
  const parsed = parseIsoDate(iso);
  if (!parsed) return iso;
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      parsed.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

function formatShortSpan(startIso: string, endIso: string): string {
  const s = parseIsoDate(startIso);
  const e = parseIsoDate(endIso);
  if (!s || !e) return '';
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}`;
}

/**
 * Interactive Date Picker Button that opens the browser's native calendar popover on click.
 */
const DatePickerField: React.FC<{
  value: string;
  onChange: (nextIso: string) => void;
  label?: string;
  placeholder?: string;
  isDark: boolean;
  size?: 'sm' | 'md';
}> = ({
  value,
  onChange,
  label,
  placeholder = 'Select date',
  isDark,
  size = 'sm',
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    if (typeof (el as any).showPicker === 'function') {
      try {
        (el as any).showPicker();
        return;
      } catch {
        // Fallback to focus
      }
    }
    el.focus();
    el.click();
  };

  return (
    <div
      onClick={handleOpenPicker}
      className={`relative inline-flex items-center gap-1.5 rounded-xl border transition-colors cursor-pointer select-none ${
        size === 'sm' ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'
      } ${getInputSurfaceClass(isDark)} hover:border-indigo-400/50`}
    >
      <CalendarIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0 pointer-events-none" />
      {label && (
        <span className="text-[10px] font-semibold opacity-55 pointer-events-none">
          {label}:
        </span>
      )}
      <span className="font-medium whitespace-nowrap pointer-events-none">
        {value ? formatReadableDate(value) : placeholder}
      </span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
};

function getDefaultDatesForHorizon(
  horizon: RoadmapHorizon,
  baseIso: string
): { startDate: string; targetDate: string } {
  if (horizon === 'now') {
    return {
      startDate: baseIso,
      targetDate: addDaysToIso(baseIso, 30),
    };
  }
  if (horizon === 'next') {
    return {
      startDate: addDaysToIso(baseIso, 30),
      targetDate: addDaysToIso(baseIso, 75),
    };
  }
  if (horizon === 'later') {
    return {
      startDate: addDaysToIso(baseIso, 75),
      targetDate: addDaysToIso(baseIso, 140),
    };
  }
  return {
    startDate: addDaysToIso(baseIso, 7),
    targetDate: addDaysToIso(baseIso, 35),
  };
}

function resolveRoadmapItemSpan(
  item: PracticeRoadmapItem,
  todayIso: string
): {
  startDateIso: string;
  targetDateIso: string;
  startMs: number;
  endMs: number;
} {
  const parsedStart = parseIsoDate(item.startDate);
  const parsedEnd = parseIsoDate(item.targetDate);

  if (parsedStart && parsedEnd) {
    const s =
      parsedStart.getTime() <= parsedEnd.getTime() ? parsedStart : parsedEnd;
    const e =
      parsedStart.getTime() <= parsedEnd.getTime() ? parsedEnd : parsedStart;
    return {
      startDateIso: toIsoDateString(s),
      targetDateIso: toIsoDateString(e),
      startMs: s.getTime(),
      endMs: Math.max(e.getTime(), s.getTime() + 86400000 * 4),
    };
  }

  if (parsedEnd && !parsedStart) {
    const startIso = addDaysToIso(toIsoDateString(parsedEnd), -21);
    const s = parseIsoDate(startIso)!;
    return {
      startDateIso: startIso,
      targetDateIso: toIsoDateString(parsedEnd),
      startMs: s.getTime(),
      endMs: parsedEnd.getTime(),
    };
  }

  if (parsedStart && !parsedEnd) {
    const endIso = addDaysToIso(toIsoDateString(parsedStart), 28);
    const e = parseIsoDate(endIso)!;
    return {
      startDateIso: toIsoDateString(parsedStart),
      targetDateIso: endIso,
      startMs: parsedStart.getTime(),
      endMs: e.getTime(),
    };
  }

  const defaults = getDefaultDatesForHorizon(item.horizon, todayIso);
  const s = parseIsoDate(defaults.startDate)!;
  const e = parseIsoDate(defaults.targetDate)!;
  return {
    startDateIso: defaults.startDate,
    targetDateIso: defaults.targetDate,
    startMs: s.getTime(),
    endMs: e.getTime(),
  };
}

function getBarVisualClasses(item: PracticeRoadmapItem, isDark: boolean) {
  if (item.status === 'completed') {
    return isDark
      ? 'bg-gradient-to-r from-emerald-600/85 to-teal-500/85 border-emerald-400/60 text-white'
      : 'bg-gradient-to-r from-emerald-500 to-teal-500 border-emerald-600 text-white';
  }
  if (item.status === 'blocked') {
    return isDark
      ? 'bg-gradient-to-r from-rose-600/85 to-pink-600/85 border-rose-400/60 text-white'
      : 'bg-gradient-to-r from-rose-500 to-pink-500 border-rose-600 text-white';
  }
  if (item.horizon === 'now' || item.status === 'in-progress') {
    return isDark
      ? 'bg-gradient-to-r from-indigo-600/90 to-cyan-500/85 border-indigo-300/60 text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)]'
      : 'bg-gradient-to-r from-indigo-600 to-cyan-600 border-indigo-700 text-white shadow-xs';
  }
  if (item.horizon === 'next') {
    return isDark
      ? 'bg-gradient-to-r from-violet-600/85 to-indigo-600/85 border-violet-400/55 text-white'
      : 'bg-gradient-to-r from-violet-600 to-indigo-600 border-violet-700 text-white';
  }
  if (item.horizon === 'later') {
    return isDark
      ? 'bg-gradient-to-r from-amber-600/80 to-orange-600/80 border-amber-400/55 text-white'
      : 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-600 text-white';
  }
  return isDark
    ? 'bg-violet-500/25 border-dashed border-violet-400/60 text-violet-100'
    : 'bg-violet-100 border-dashed border-violet-400 text-violet-900';
}

export const PracticePlannerView: React.FC = () => {
  const topology = useTopologyStore((s) => s.topology);
  const theme = useTopologyStore((s) => s.theme);
  const searchQuery = useTopologyStore((s) => s.searchQuery);
  const spotlightFilter = useTopologyStore((s) => s.spotlightFilter);
  const addPracticeTask = useTopologyStore((s) => s.addPracticeTask);
  const updatePracticeTask = useTopologyStore((s) => s.updatePracticeTask);
  const togglePracticeTaskStatus = useTopologyStore(
    (s) => s.togglePracticeTaskStatus
  );
  const deletePracticeTask = useTopologyStore((s) => s.deletePracticeTask);
  const addRoadmapItem = useTopologyStore((s) => s.addRoadmapItem);
  const updateRoadmapItem = useTopologyStore((s) => s.updateRoadmapItem);
  const deleteRoadmapItem = useTopologyStore((s) => s.deleteRoadmapItem);
  const requestConfirmation = useTopologyStore((s) => s.requestConfirmation);
  const setViewMode = useTopologyStore((s) => s.setViewMode);
  const selectTeam = useTopologyStore((s) => s.selectTeam);
  const selectApp = useTopologyStore((s) => s.selectApp);
  const plannerState = useTopologyStore((s) => s.plannerState);
  const updatePlannerState = useTopologyStore((s) => s.updatePlannerState);
  const togglePlannerHorizonCollapse = useTopologyStore(
    (s) => s.togglePlannerHorizonCollapse
  );

  const isDark = theme === 'dark';
  const todayIso = useMemo(() => toIsoDateString(new Date()), []);

  const layoutMode = plannerState.layoutMode;
  const calendarTab = plannerState.calendarTab;
  const selectedDateIso = plannerState.selectedDateIso;
  const horizonFilter = plannerState.horizonFilter;
  const collapsedHorizons = plannerState.collapsedHorizons;
  const editingTaskId = plannerState.editingTaskId;

  const setLayoutMode = (next: PlannerLayoutMode) =>
    updatePlannerState({ layoutMode: next });
  const setCalendarTab = (next: CalendarFilterTab) =>
    updatePlannerState({ calendarTab: next });
  const setSelectedDateIso = (next: string | null) =>
    updatePlannerState({ selectedDateIso: next });
  const setHorizonFilter = (next: HorizonFilter) =>
    updatePlannerState({ horizonFilter: next });
  const setEditingTaskId = (next: string | null) =>
    updatePlannerState({ editingTaskId: next });
  const toggleHorizonCollapse = (h: RoadmapHorizon) =>
    togglePlannerHorizonCollapse(h);

  // Timeline 6-month window navigation (persisted in store)
  const timelineStartMonth = useMemo(() => {
    const parsed = parseIsoDate(plannerState.timelineStartMonthIso);
    if (parsed) return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }, [plannerState.timelineStartMonthIso]);

  const setTimelineStartMonth = (nextDate: Date) => {
    updatePlannerState({
      timelineStartMonthIso: toIsoDateString(
        new Date(nextDate.getFullYear(), nextDate.getMonth(), 1)
      ),
    });
  };

  // Quick-add Timeline Bar state (with Date Pickers)
  const [quickRmTitle, setQuickRmTitle] = useState('');
  const [quickRmHorizon, setQuickRmHorizon] = useState<RoadmapHorizon>('now');
  const [quickRmStartDate, setQuickRmStartDate] = useState<string>(todayIso);
  const [quickRmTargetDate, setQuickRmTargetDate] = useState<string>(() =>
    addDaysToIso(todayIso, 30)
  );

  // Dragging timeline bar state (local preview during pointermove, committed once on pointerup)
  const timelineTrackRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<{
    itemId: string;
    mode: 'move' | 'resize-start' | 'resize-end';
    initialX: number;
    initialStartMs: number;
    initialEndMs: number;
    trackWidthPx: number;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    itemId: string;
    startDate: string;
    targetDate: string;
  } | null>(null);

  // Calendar month navigation state (persisted in store)
  const calendarMonth = useMemo(() => {
    const parsed = parseIsoDate(plannerState.calendarMonthIso);
    if (parsed) return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, [plannerState.calendarMonthIso]);

  const setCalendarMonth = (nextDate: Date) => {
    updatePlannerState({
      calendarMonthIso: toIsoDateString(
        new Date(nextDate.getFullYear(), nextDate.getMonth(), 1)
      ),
    });
  };

  // Quick-add Calendar Task state (with Date Picker)
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskKind, setNewTaskKind] = useState<PracticeTaskKind>('todo');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>(
    selectedDateIso || todayIso
  );
  const [newTaskFollowUpWith, setNewTaskFollowUpWith] = useState('');

  // Clean Edit Modal for Roadmap Initiative
  const [isRoadmapFormOpen, setIsRoadmapFormOpen] = useState(false);
  const [editingRoadmapId, setEditingRoadmapId] = useState<string | null>(null);
  const [rmTitle, setRmTitle] = useState('');
  const [rmHorizon, setRmHorizon] = useState<RoadmapHorizon>('now');
  const [rmStatus, setRmStatus] = useState<RoadmapItemStatus>('in-progress');
  const [rmPriority, setRmPriority] = useState<PracticeTaskPriority>('medium');
  const [rmStartDate, setRmStartDate] = useState(todayIso);
  const [rmTargetDate, setRmTargetDate] = useState(() =>
    addDaysToIso(todayIso, 30)
  );
  const [rmOutcome, setRmOutcome] = useState('');
  const [rmOwner, setRmOwner] = useState('');
  const [rmTeam, setRmTeam] = useState('');
  const [rmApp, setRmApp] = useState('');
  const [rmWikiUrl, setRmWikiUrl] = useState('');

  const tasks = topology.tasks ?? [];
  const roadmap = topology.roadmap ?? [];

  const squadOptions = useMemo(
    () => [
      { value: '', label: 'Unlinked Squad' },
      ...topology.teams.map((t) => ({
        value: t.name,
        label: t.name,
      })),
    ],
    [topology.teams]
  );

  const appOptions = useMemo(
    () => [
      { value: '', label: 'Unlinked Application' },
      ...(topology.applications ?? []).map((a) => ({
        value: a.name,
        label: a.name,
      })),
    ],
    [topology.applications]
  );

  const knownPeople = useMemo(() => {
    const names = new Set<string>();
    topology.teams.forEach((t) =>
      t.members.forEach((m) => {
        if (m.name.trim()) names.add(m.name.trim());
      })
    );
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [topology.teams]);

  // Filter Roadmap Items
  const filteredRoadmap = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roadmap.filter((item) => {
      if (horizonFilter !== 'all' && item.horizon !== horizonFilter) {
        return false;
      }
      if (q) {
        const hay = [
          item.title,
          item.outcome,
          item.owner,
          item.linkedTeam,
          item.linkedApplication,
          item.startDate,
          item.targetDate,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (spotlightFilter.type !== 'none') {
        if (
          spotlightFilter.type === 'horizon' &&
          item.horizon !== spotlightFilter.value
        )
          return false;
        if (
          spotlightFilter.type === 'priority' &&
          item.priority !== spotlightFilter.value
        )
          return false;
        if (
          spotlightFilter.type === 'application' &&
          item.linkedApplication?.toLowerCase() !==
            spotlightFilter.value.toLowerCase()
        )
          return false;
      }
      return true;
    });
  }, [roadmap, horizonFilter, searchQuery, spotlightFilter]);

  // Filter Calendar Action Items
  const filteredTasks = useMemo(() => {
    if (calendarTab === 'timeline') return [];
    const q = searchQuery.trim().toLowerCase();
    return tasks
      .filter((task) => {
        if (q) {
          const hay = [
            task.title,
            task.followUpWith,
            task.linkedTeam,
            task.linkedApplication,
            task.dueDate,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }

        if (spotlightFilter.type !== 'none') {
          if (
            spotlightFilter.type === 'task-kind' &&
            task.kind !== spotlightFilter.value
          )
            return false;
          if (
            spotlightFilter.type === 'priority' &&
            task.priority !== spotlightFilter.value
          )
            return false;
        }

        if (selectedDateIso && task.dueDate !== selectedDateIso) {
          return false;
        }

        if (calendarTab === 'all' && task.status === 'done') return false;
        if (
          calendarTab === 'todo' &&
          (task.kind !== 'todo' || task.status === 'done')
        )
          return false;
        if (
          calendarTab === 'followup' &&
          (task.kind !== 'followup' || task.status === 'done')
        )
          return false;
        if (calendarTab === 'done' && task.status !== 'done') return false;

        return true;
      })
      .sort((a, b) => {
        const dateA = a.dueDate || '9999-99-99';
        const dateB = b.dueDate || '9999-99-99';
        return dateA.localeCompare(dateB);
      });
  }, [tasks, searchQuery, spotlightFilter, selectedDateIso, calendarTab]);

  // Timeline Items that appear on the Calendar & Agenda List!
  // Any item added to the timeline automatically shows up on the calendar on its start/target dates!
  const calendarTimelineItems = useMemo(() => {
    if (calendarTab === 'todo' || calendarTab === 'followup') return [];
    const q = searchQuery.trim().toLowerCase();

    return roadmap
      .map((item) => ({
        item,
        span: resolveRoadmapItemSpan(item, todayIso),
      }))
      .filter(({ item, span }) => {
        if (
          calendarTab === 'done' &&
          item.status !== 'completed'
        ) {
          return false;
        }
        if (
          calendarTab !== 'done' &&
          item.status === 'completed'
        ) {
          return false;
        }
        if (q) {
          const hay = [
            item.title,
            item.owner,
            item.linkedTeam,
            item.linkedApplication,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (selectedDateIso) {
          // Matches if the selected calendar date is the Start Date, Target Date, or falls within the active span
          return (
            span.startDateIso === selectedDateIso ||
            span.targetDateIso === selectedDateIso ||
            (selectedDateIso >= span.startDateIso &&
              selectedDateIso <= span.targetDateIso)
          );
        }
        return true;
      })
      .sort((a, b) =>
        a.span.targetDateIso.localeCompare(b.span.targetDateIso)
      );
  }, [roadmap, calendarTab, searchQuery, selectedDateIso, todayIso]);

  // Compute 6-Month Timeline Window
  const timelineWindow = useMemo(() => {
    const numMonths = 6;
    const startYear = timelineStartMonth.getFullYear();
    const startMonth = timelineStartMonth.getMonth();
    const windowStart = new Date(startYear, startMonth, 1, 0, 0, 0);
    const windowEnd = new Date(
      startYear,
      startMonth + numMonths,
      0,
      23,
      59,
      59
    );

    const startMs = windowStart.getTime();
    const endMs = windowEnd.getTime();
    const totalMs = Math.max(1, endMs - startMs);

    const months: {
      key: string;
      label: string;
      isCurrentMonth: boolean;
      widthPct: number;
    }[] = [];

    const now = new Date();
    for (let i = 0; i < numMonths; i++) {
      const mStart = new Date(startYear, startMonth + i, 1, 0, 0, 0);
      const mEnd = new Date(startYear, startMonth + i + 1, 0, 23, 59, 59);
      const widthPct = ((mEnd.getTime() - mStart.getTime()) / totalMs) * 100;

      months.push({
        key: `${mStart.getFullYear()}-${mStart.getMonth()}`,
        label: mStart.toLocaleDateString(undefined, {
          month: 'short',
          year: 'numeric',
        }),
        isCurrentMonth:
          mStart.getFullYear() === now.getFullYear() &&
          mStart.getMonth() === now.getMonth(),
        widthPct,
      });
    }

    const todayDate = parseIsoDate(todayIso) || new Date();
    const todayMs = todayDate.getTime() + 12 * 3600 * 1000;
    const todayPct = ((todayMs - startMs) / totalMs) * 100;
    const isTodayVisible = todayPct >= 0 && todayPct <= 100;

    return {
      startMs,
      endMs,
      totalMs,
      months,
      todayPct,
      isTodayVisible,
    };
  }, [timelineStartMonth, todayIso]);

  // Group Timeline items by Horizon (with collapsible sections)
  const horizonSections = useMemo(() => {
    const sortByStart = (a: PracticeRoadmapItem, b: PracticeRoadmapItem) => {
      const spanA = resolveRoadmapItemSpan(a, todayIso);
      const spanB = resolveRoadmapItemSpan(b, todayIso);
      return spanA.startMs - spanB.startMs;
    };

    return HORIZON_CONFIG.filter(
      (h) => horizonFilter === 'all' || horizonFilter === h.key
    ).map((h) => ({
      ...h,
      items: filteredRoadmap
        .filter((r) => r.horizon === h.key)
        .sort(sortByStart),
    }));
  }, [filteredRoadmap, horizonFilter, todayIso]);

  // Handle pointer drag/resize on Timeline Bars (60fps local preview, single store commit on pointerup)
  React.useEffect(() => {
    if (!dragState) return;

    let latestPreview: {
      itemId: string;
      startDate: string;
      targetDate: string;
    } | null = null;

    const handlePointerMove = (e: PointerEvent) => {
      const dx = e.clientX - dragState.initialX;
      const ratio = dx / Math.max(1, dragState.trackWidthPx);
      const deltaMs = ratio * timelineWindow.totalMs;
      const dayMs = 86400000;
      const snappedDeltaMs = Math.round(deltaMs / dayMs) * dayMs;

      if (dragState.mode === 'move') {
        latestPreview = {
          itemId: dragState.itemId,
          startDate: toIsoDateString(
            new Date(dragState.initialStartMs + snappedDeltaMs)
          ),
          targetDate: toIsoDateString(
            new Date(dragState.initialEndMs + snappedDeltaMs)
          ),
        };
      } else if (dragState.mode === 'resize-start') {
        const clampedStartMs = Math.min(
          dragState.initialEndMs - dayMs * 2,
          dragState.initialStartMs + snappedDeltaMs
        );
        latestPreview = {
          itemId: dragState.itemId,
          startDate: toIsoDateString(new Date(clampedStartMs)),
          targetDate: toIsoDateString(new Date(dragState.initialEndMs)),
        };
      } else if (dragState.mode === 'resize-end') {
        const clampedEndMs = Math.max(
          dragState.initialStartMs + dayMs * 2,
          dragState.initialEndMs + snappedDeltaMs
        );
        latestPreview = {
          itemId: dragState.itemId,
          startDate: toIsoDateString(new Date(dragState.initialStartMs)),
          targetDate: toIsoDateString(new Date(clampedEndMs)),
        };
      }

      if (latestPreview) {
        setDragPreview(latestPreview);
      }
    };

    const handlePointerUp = () => {
      if (latestPreview) {
        updateRoadmapItem(latestPreview.itemId, {
          startDate: latestPreview.startDate,
          targetDate: latestPreview.targetDate,
        });
      }
      setDragPreview(null);
      setDragState(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, timelineWindow.totalMs, updateRoadmapItem]);

  // Calendar grid generation (includes To-Dos, Follow-Ups, AND Timeline Roadmap items!)
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const tasksByDate = new Map<string, PracticeTask[]>();
    tasks.forEach((t) => {
      if (!t.dueDate || t.status === 'done') return;
      const list = tasksByDate.get(t.dueDate) ?? [];
      list.push(t);
      tasksByDate.set(t.dueDate, list);
    });

    const roadmapSpans = roadmap
      .filter((r) => r.status !== 'completed')
      .map((r) => ({
        item: r,
        span: resolveRoadmapItemSpan(r, todayIso),
      }));

    const totalCells =
      Math.ceil((startOffset + totalDaysInMonth) / 7) * 7 || 35;

    const cells: {
      iso: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      todos: PracticeTask[];
      followups: PracticeTask[];
      timelineItems: PracticeRoadmapItem[];
    }[] = [];

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(year, month, 1 - startOffset + i);
      const iso = toIsoDateString(cellDate);
      const dayTasks = tasksByDate.get(iso) ?? [];

      // Show timeline items on their Start Date and Target Date on the calendar grid
      const dayTimelineItems = roadmapSpans
        .filter(
          ({ span }) =>
            span.startDateIso === iso || span.targetDateIso === iso
        )
        .map(({ item }) => item);

      cells.push({
        iso,
        dayNumber: cellDate.getDate(),
        isCurrentMonth: cellDate.getMonth() === month,
        todos: dayTasks.filter((t) => t.kind === 'todo'),
        followups: dayTasks.filter((t) => t.kind === 'followup'),
        timelineItems: dayTimelineItems,
      });
    }

    return cells;
  }, [calendarMonth, tasks, roadmap, todayIso]);

  const handleQuickAddRoadmap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRmTitle.trim()) return;
    addRoadmapItem({
      title: quickRmTitle.trim(),
      horizon: quickRmHorizon,
      status: quickRmHorizon === 'now' ? 'in-progress' : 'idea',
      priority: 'medium',
      startDate: quickRmStartDate || todayIso,
      targetDate: quickRmTargetDate || addDaysToIso(todayIso, 30),
    });
    // Ensure the horizon section where the item was added is expanded
    updatePlannerState({
      collapsedHorizons: { ...collapsedHorizons, [quickRmHorizon]: false },
    });
    setQuickRmTitle('');
  };

  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addPracticeTask({
      title: newTaskTitle.trim(),
      kind: newTaskKind,
      status: 'open',
      priority: 'medium',
      dueDate: newTaskDueDate || todayIso,
      followUpWith: newTaskFollowUpWith.trim() || undefined,
    });
    setNewTaskTitle('');
    setNewTaskFollowUpWith('');
  };

  const openNewRoadmapModal = (defaultHorizon: RoadmapHorizon = 'now') => {
    const defaults = getDefaultDatesForHorizon(defaultHorizon, todayIso);
    setEditingRoadmapId(null);
    setRmTitle('');
    setRmHorizon(defaultHorizon);
    setRmStatus(defaultHorizon === 'now' ? 'in-progress' : 'idea');
    setRmPriority('medium');
    setRmStartDate(selectedDateIso || defaults.startDate);
    setRmTargetDate(defaults.targetDate);
    setRmOutcome('');
    setRmOwner('');
    setRmTeam('');
    setRmApp('');
    setRmWikiUrl('');
    setIsRoadmapFormOpen(true);
  };

  const openEditRoadmapModal = (item: PracticeRoadmapItem) => {
    const span = resolveRoadmapItemSpan(item, todayIso);
    setEditingRoadmapId(item.id);
    setRmTitle(item.title);
    setRmHorizon(item.horizon);
    setRmStatus(item.status);
    setRmPriority(item.priority);
    setRmStartDate(span.startDateIso);
    setRmTargetDate(span.targetDateIso);
    setRmOutcome(item.outcome || '');
    setRmOwner(item.owner || '');
    setRmTeam(item.linkedTeam || '');
    setRmApp(item.linkedApplication || '');
    setRmWikiUrl(item.wikiUrl || '');
    setIsRoadmapFormOpen(true);
  };

  const handleSaveRoadmapForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmTitle.trim()) return;
    if (editingRoadmapId) {
      updateRoadmapItem(editingRoadmapId, {
        title: rmTitle.trim(),
        horizon: rmHorizon,
        status: rmStatus,
        priority: rmPriority,
        startDate: rmStartDate || undefined,
        targetDate: rmTargetDate || undefined,
        outcome: rmOutcome.trim() || undefined,
        owner: rmOwner.trim() || undefined,
        linkedTeam: rmTeam || undefined,
        linkedApplication: rmApp || undefined,
        wikiUrl: rmWikiUrl.trim() || undefined,
      });
    } else {
      addRoadmapItem({
        title: rmTitle.trim(),
        horizon: rmHorizon,
        status: rmStatus,
        priority: rmPriority,
        startDate: rmStartDate || undefined,
        targetDate: rmTargetDate || undefined,
        outcome: rmOutcome.trim() || undefined,
        owner: rmOwner.trim() || undefined,
        linkedTeam: rmTeam || undefined,
        linkedApplication: rmApp || undefined,
        wikiUrl: rmWikiUrl.trim() || undefined,
      });
    }
    updatePlannerState({
      collapsedHorizons: { ...collapsedHorizons, [rmHorizon]: false },
    });
    setIsRoadmapFormOpen(false);
    setEditingRoadmapId(null);
  };

  const handleJumpToSquad = (teamName: string) => {
    const team = topology.teams.find(
      (t) => t.name.toLowerCase() === teamName.toLowerCase()
    );
    setViewMode('teams');
    if (team) selectTeam(team.id);
  };

  const handleJumpToApp = (appName: string) => {
    const app = (topology.applications ?? []).find(
      (a) => a.name.toLowerCase() === appName.toLowerCase()
    );
    setViewMode('applications');
    if (app) selectApp(app.id);
  };

  return (
    <div
      className={`w-full h-full pt-20 pb-24 px-4 sm:px-6 overflow-y-auto select-text transition-colors duration-300 ${
        isDark ? 'bg-[#07090e] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
      }`}
    >
      <datalist id="chapter-known-people">
        {knownPeople.map((person) => (
          <option key={person} value={person} />
        ))}
      </datalist>

      <div className="max-w-[1680px] mx-auto flex flex-col gap-4">
        {/* Clean, Minimal Header Bar */}
        <div
          className={`rounded-2xl border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 backdrop-blur-xl ${getPanelSurfaceClass(
            isDark
          )}`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${getHeaderIconBadgeClass(
                isDark
              )}`}
            >
              <GanttChart className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-tight">
                Planner & Timeline Roadmap
              </h1>
              <p
                className={`text-[10px] ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Timeline items automatically sync to your Calendar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center p-0.5 rounded-xl border ${
                isDark
                  ? 'bg-[#0b0e17] border-[#1f273a]'
                  : 'bg-slate-100 border-slate-200/80'
              }`}
            >
              <button
                type="button"
                onClick={() => setLayoutMode('split')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  layoutMode === 'split'
                    ? getActiveToggleClass(isDark)
                    : getInactiveToggleClass(isDark)
                }`}
              >
                Split View
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('roadmap')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  layoutMode === 'roadmap'
                    ? getActiveToggleClass(isDark)
                    : getInactiveToggleClass(isDark)
                }`}
              >
                Timeline Only
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('calendar')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  layoutMode === 'calendar'
                    ? getActiveToggleClass(isDark)
                    : getInactiveToggleClass(isDark)
                }`}
              >
                Calendar Only
              </button>
            </div>

            <button
              type="button"
              onClick={() => openNewRoadmapModal('now')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${getPrimaryButtonClass()}`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Initiative</span>
            </button>
          </div>
        </div>

        {/* Clean Edit / Create Initiative Modal (with Date Pickers) */}
        {isRoadmapFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <form
              onSubmit={handleSaveRoadmapForm}
              className={`w-full max-w-lg rounded-2xl border p-5 space-y-3.5 ${getPanelSurfaceClass(
                isDark
              )}`}
            >
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-500/15">
                <h3 className="text-sm font-bold">
                  {editingRoadmapId ? 'Edit Timeline Item' : 'New Timeline Item'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsRoadmapFormOpen(false);
                    setEditingRoadmapId(null);
                  }}
                  className={`p-1 rounded-lg cursor-pointer ${getCloseButtonClass(
                    isDark
                  )}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={rmTitle}
                  onChange={(e) => setRmTitle(e.target.value)}
                  placeholder="Initiative or idea name..."
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${getInputSurfaceClass(
                    isDark
                  )}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">
                    Start Date
                  </label>
                  <DatePickerField
                    size="md"
                    value={rmStartDate}
                    onChange={setRmStartDate}
                    isDark={isDark}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">
                    Target Date
                  </label>
                  <DatePickerField
                    size="md"
                    value={rmTargetDate}
                    onChange={setRmTargetDate}
                    isDark={isDark}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">
                    Horizon
                  </label>
                  <CustomSelect
                    size="sm"
                    value={rmHorizon}
                    onChange={(v) => setRmHorizon(v as RoadmapHorizon)}
                    options={HORIZON_OPTIONS}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">
                    Status
                  </label>
                  <CustomSelect
                    size="sm"
                    value={rmStatus}
                    onChange={(v) => setRmStatus(v as RoadmapItemStatus)}
                    options={ROADMAP_STATUS_OPTIONS}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">
                    Priority
                  </label>
                  <CustomSelect
                    size="sm"
                    value={rmPriority}
                    onChange={(v) => setRmPriority(v as PracticeTaskPriority)}
                    options={PRIORITY_OPTIONS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">
                    Linked Squad
                  </label>
                  <CustomSelect
                    size="sm"
                    value={rmTeam}
                    onChange={setRmTeam}
                    options={squadOptions}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">
                    Linked Application
                  </label>
                  <CustomSelect
                    size="sm"
                    value={rmApp}
                    onChange={setRmApp}
                    options={appOptions}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">
                    Owner / Lead
                  </label>
                  <input
                    type="text"
                    list="chapter-known-people"
                    value={rmOwner}
                    onChange={(e) => setRmOwner(e.target.value)}
                    placeholder="Lead or point of contact..."
                    className={`w-full px-3 py-1.5 rounded-xl border text-xs outline-none ${getInputSurfaceClass(
                      isDark
                    )}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">
                    Wiki / Doc URL
                  </label>
                  <input
                    type="url"
                    value={rmWikiUrl}
                    onChange={(e) => setRmWikiUrl(e.target.value)}
                    placeholder="https://..."
                    className={`w-full px-3 py-1.5 rounded-xl border text-xs outline-none ${getInputSurfaceClass(
                      isDark
                    )}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1 opacity-70">
                  Expected Outcome / Notes
                </label>
                <textarea
                  rows={2}
                  value={rmOutcome}
                  onChange={(e) => setRmOutcome(e.target.value)}
                  placeholder="Optional goal or notes..."
                  className={`w-full px-3 py-1.5 rounded-xl border text-xs outline-none resize-none ${getInputSurfaceClass(
                    isDark
                  )}`}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-500/15">
                {editingRoadmapId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const idToDelete = editingRoadmapId;
                      const titleToDelete = rmTitle;
                      setIsRoadmapFormOpen(false);
                      setEditingRoadmapId(null);
                      requestConfirmation({
                        title: 'Delete Timeline Initiative',
                        description: `Remove "${titleToDelete}" from your timeline and calendar?`,
                        confirmLabel: 'Delete',
                        onConfirm: () => deleteRoadmapItem(idToDelete),
                      });
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${getDangerIconButtonClass(
                      isDark
                    )}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRoadmapFormOpen(false);
                      setEditingRoadmapId(null);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${getSecondaryButtonClass(
                      isDark
                    )}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${getPrimaryButtonClass()}`}
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* MAIN WORKSPACE GRID */}
        <div
          className={`grid gap-4 items-start ${
            layoutMode === 'split'
              ? 'grid-cols-1 xl:grid-cols-12'
              : 'grid-cols-1'
          }`}
        >
          {/* ===================================================================
              LEFT PANE: CALENDAR + ACTION ITEMS & TIMELINE ITEMS ON CALENDAR
              =================================================================== */}
          {(layoutMode === 'calendar' || layoutMode === 'split') && (
            <div
              className={`${
                layoutMode === 'split' ? 'xl:col-span-5' : 'col-span-1'
              } grid gap-4 ${
                layoutMode === 'calendar'
                  ? 'grid-cols-1 lg:grid-cols-12'
                  : 'grid-cols-1'
              }`}
            >
              {/* Monthly Calendar Grid */}
              <div
                className={`${
                  layoutMode === 'calendar' ? 'lg:col-span-5' : ''
                } rounded-2xl border overflow-hidden ${getPanelSurfaceClass(
                  isDark
                )}`}
              >
                <div
                  className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 ${getHeaderFooterSurfaceClass(
                    isDark
                  )}`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold">
                      {calendarMonth.toLocaleDateString(undefined, {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    {selectedDateIso && (
                      <button
                        type="button"
                        onClick={() => setSelectedDateIso(null)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer ${
                          isDark
                            ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        <span>{formatReadableDate(selectedDateIso)}</span>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth() - 1,
                            1
                          )
                        )
                      }
                      className={`p-1 rounded-lg cursor-pointer ${getSecondaryButtonClass(
                        isDark
                      )}`}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setCalendarMonth(
                          new Date(now.getFullYear(), now.getMonth(), 1)
                        );
                        setSelectedDateIso(null);
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer ${getSecondaryButtonClass(
                        isDark
                      )}`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth(
                          new Date(
                            calendarMonth.getFullYear(),
                            calendarMonth.getMonth() + 1,
                            1
                          )
                        )
                      }
                      className={`p-1 rounded-lg cursor-pointer ${getSecondaryButtonClass(
                        isDark
                      )}`}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Weekday Headers */}
                <div
                  className={`grid grid-cols-7 text-center py-1.5 border-b text-[10px] font-bold uppercase tracking-wider ${
                    isDark
                      ? 'border-[#1f273a] text-slate-400 bg-[#0c1018]'
                      : 'border-slate-200 text-slate-500 bg-slate-50/70'
                  }`}
                >
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
                    (day) => (
                      <div key={day}>{day}</div>
                    )
                  )}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((cell) => {
                    const isToday = cell.iso === todayIso;
                    const isSelected = cell.iso === selectedDateIso;

                    return (
                      <button
                        key={cell.iso}
                        type="button"
                        onClick={() => {
                          if (selectedDateIso === cell.iso) {
                            setSelectedDateIso(null);
                          } else {
                            setSelectedDateIso(cell.iso);
                            setNewTaskDueDate(cell.iso);
                          }
                        }}
                        className={`min-h-[56px] p-1.5 border-b border-r text-left flex flex-col justify-between transition-all cursor-pointer ${
                          isDark ? 'border-[#1a2132]' : 'border-slate-200/70'
                        } ${
                          !cell.isCurrentMonth
                            ? isDark
                              ? 'opacity-30 bg-[#090c14]'
                              : 'opacity-35 bg-slate-50/50'
                            : isDark
                              ? 'hover:bg-[#151c2c]'
                              : 'hover:bg-indigo-50/40'
                        } ${
                          isSelected
                            ? isDark
                              ? 'bg-indigo-500/15 ring-1 ring-inset ring-indigo-400/70'
                              : 'bg-indigo-50/90 ring-1 ring-inset ring-indigo-500'
                            : ''
                        }`}
                      >
                        <span
                          className={`text-[11px] font-semibold w-5 h-5 rounded-md flex items-center justify-center ${
                            isToday
                              ? 'bg-indigo-500 text-white font-bold'
                              : isSelected
                                ? isDark
                                  ? 'text-indigo-300 font-bold'
                                  : 'text-indigo-700 font-bold'
                                : ''
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {/* Dots & Micro-Indicators for To-Dos, Follow-Ups, AND Timeline Items */}
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          {cell.todos.length > 0 && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] font-semibold bg-indigo-500/20 text-indigo-400"
                              title={`${cell.todos.length} To-Do(s)`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                              {cell.todos.length}
                            </span>
                          )}
                          {cell.followups.length > 0 && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] font-semibold bg-amber-500/20 text-amber-400"
                              title={`${cell.followups.length} Follow-Up(s)`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              {cell.followups.length}
                            </span>
                          )}
                          {cell.timelineItems.length > 0 && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] font-semibold bg-violet-500/20 text-violet-300"
                              title={cell.timelineItems
                                .map((t) => t.title)
                                .join(', ')}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                              {cell.timelineItems.length}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Simple Legend */}
                <div
                  className={`px-4 py-2 flex items-center justify-between text-[10px] ${
                    isDark
                      ? 'bg-[#0b0e17] text-slate-400'
                      : 'bg-slate-50 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-400" />
                      To-Do
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Follow-Up
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-violet-400" />
                      Timeline Item
                    </span>
                  </div>
                  <span>Click any day to filter</span>
                </div>
              </div>

              {/* Unified Calendar Agenda List (To-Dos + Follow-Ups + Timeline Items) */}
              <div
                className={`${
                  layoutMode === 'calendar' ? 'lg:col-span-7' : ''
                } rounded-2xl border overflow-hidden flex flex-col ${getPanelSurfaceClass(
                  isDark
                )}`}
              >
                {/* Minimal Quick-Add Bar with Date Picker */}
                <form
                  onSubmit={handleQuickAddTask}
                  className={`p-3 border-b space-y-2 ${getHeaderFooterSurfaceClass(
                    isDark
                  )}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className={`flex items-center p-0.5 rounded-xl border ${
                        isDark
                          ? 'bg-[#0b0e17] border-[#1f273a]'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setNewTaskKind('todo')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          newTaskKind === 'todo'
                            ? getActiveToggleClass(isDark)
                            : getInactiveToggleClass(isDark)
                        }`}
                      >
                        To-Do
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewTaskKind('followup')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          newTaskKind === 'followup'
                            ? getActiveToggleClass(isDark)
                            : getInactiveToggleClass(isDark)
                        }`}
                      >
                        Follow-Up
                      </button>
                    </div>

                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder={
                        newTaskKind === 'followup'
                          ? 'Add a follow-up item...'
                          : 'Add a to-do item...'
                      }
                      className={`flex-1 min-w-[160px] px-3 py-1.5 rounded-xl border text-xs outline-none ${getInputSurfaceClass(
                        isDark
                      )}`}
                    />

                    <DatePickerField
                      value={newTaskDueDate}
                      onChange={setNewTaskDueDate}
                      isDark={isDark}
                    />

                    <button
                      type="submit"
                      disabled={!newTaskTitle.trim()}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40 ${getPrimaryButtonClass()}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>

                  {newTaskKind === 'followup' && (
                    <input
                      type="text"
                      list="chapter-known-people"
                      value={newTaskFollowUpWith}
                      onChange={(e) => setNewTaskFollowUpWith(e.target.value)}
                      placeholder="Follow up with (person name)..."
                      className={`w-full px-3 py-1.5 rounded-xl border text-[11px] outline-none ${getInputSurfaceClass(
                        isDark
                      )}`}
                    />
                  )}
                </form>

                {/* Simple Filter Tabs */}
                <div
                  className={`px-3 py-2 border-b flex items-center justify-between gap-2 ${
                    isDark ? 'border-[#1f273a]' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1 flex-wrap">
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'todo', label: 'To-Dos' },
                        { id: 'followup', label: 'Follow-Ups' },
                        { id: 'timeline', label: 'Timeline' },
                        { id: 'done', label: 'Done' },
                      ] as { id: CalendarFilterTab; label: string }[]
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setCalendarTab(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          calendarTab === tab.id
                            ? getActiveToggleClass(isDark)
                            : getInactiveToggleClass(isDark)
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <span
                    className={`text-[10px] font-semibold ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {filteredTasks.length + calendarTimelineItems.length} items
                  </span>
                </div>

                {/* Combined Calendar List: Tasks + Timeline Items */}
                <div className="p-3 space-y-2 max-h-[520px] overflow-y-auto">
                  {filteredTasks.length === 0 &&
                  calendarTimelineItems.length === 0 ? (
                    <div
                      className={`rounded-xl border border-dashed p-6 text-center ${
                        isDark
                          ? 'border-[#222b3e] text-slate-400'
                          : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      <p className="text-xs font-semibold">
                        No items for this view
                      </p>
                      <p className="text-[11px] opacity-75 mt-0.5">
                        Add a To-Do, Follow-Up, or Timeline Initiative to see it
                        on your calendar.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* 1. Action Items (To-Dos & Follow-Ups) */}
                      {filteredTasks.map((task) => {
                        const isDone = task.status === 'done';
                        const isEditing = editingTaskId === task.id;

                        return (
                          <div
                            key={task.id}
                            className={`rounded-xl border p-2.5 transition-all ${getSubCardSurfaceClass(
                              isDark
                            )} ${isDone ? 'opacity-60' : ''}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    togglePracticeTaskStatus(task.id)
                                  }
                                  className="shrink-0 cursor-pointer text-indigo-400 hover:text-indigo-300"
                                >
                                  {isDone ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <Circle className="w-4 h-4" />
                                  )}
                                </button>

                                <span
                                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                                    task.kind === 'followup'
                                      ? isDark
                                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                      : isDark
                                        ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  }`}
                                >
                                  {task.kind === 'followup'
                                    ? 'Follow-Up'
                                    : 'To-Do'}
                                </span>

                                <span
                                  className={`text-xs font-semibold truncate ${
                                    isDone ? 'line-through opacity-70' : ''
                                  }`}
                                >
                                  {task.title}
                                </span>

                                {task.followUpWith && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${
                                      isDark
                                        ? 'bg-[#171e2f] border-[#26314a] text-amber-200'
                                        : 'bg-amber-50 border-amber-200 text-amber-800'
                                    }`}
                                  >
                                    {task.followUpWith}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <DatePickerField
                                  value={task.dueDate || ''}
                                  onChange={(nextIso) =>
                                    updatePracticeTask(task.id, {
                                      dueDate: nextIso || undefined,
                                    })
                                  }
                                  placeholder="Date"
                                  isDark={isDark}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingTaskId(isEditing ? null : task.id)
                                  }
                                  className={`p-1 rounded-lg cursor-pointer ${getSecondaryButtonClass(
                                    isDark
                                  )}`}
                                  title="Edit"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    requestConfirmation({
                                      title: 'Delete Action Item',
                                      description: `Delete "${task.title}"?`,
                                      confirmLabel: 'Delete',
                                      onConfirm: () =>
                                        deletePracticeTask(task.id),
                                    })
                                  }
                                  className={`p-1 rounded-lg cursor-pointer ${getDangerIconButtonClass(
                                    isDark
                                  )}`}
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {isEditing && (
                              <div
                                className={`mt-2.5 pt-2.5 border-t grid grid-cols-1 sm:grid-cols-3 gap-2 ${
                                  isDark
                                    ? 'border-[#222b3e]'
                                    : 'border-slate-200'
                                }`}
                              >
                                <input
                                  type="text"
                                  value={task.title}
                                  onChange={(e) =>
                                    updatePracticeTask(task.id, {
                                      title: e.target.value,
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-lg border text-xs outline-none ${getInputSurfaceClass(
                                    isDark
                                  )}`}
                                />
                                <input
                                  type="text"
                                  list="chapter-known-people"
                                  value={task.followUpWith || ''}
                                  onChange={(e) =>
                                    updatePracticeTask(task.id, {
                                      followUpWith:
                                        e.target.value || undefined,
                                    })
                                  }
                                  placeholder="Follow up with..."
                                  className={`px-2.5 py-1 rounded-lg border text-xs outline-none ${getInputSurfaceClass(
                                    isDark
                                  )}`}
                                />
                                <CustomSelect
                                  size="sm"
                                  value={task.linkedTeam || ''}
                                  onChange={(val) =>
                                    updatePracticeTask(task.id, {
                                      linkedTeam: val || undefined,
                                    })
                                  }
                                  options={squadOptions}
                                  placeholder="Link Squad..."
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* 2. Timeline Roadmap Items automatically shown on the Calendar! */}
                      {calendarTimelineItems.map(({ item, span }) => (
                        <div
                          key={`cal-rm-${item.id}`}
                          onClick={() => openEditRoadmapModal(item)}
                          className={`rounded-xl border p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-all ${getSubCardSurfaceClass(
                            isDark
                          )} hover:border-violet-400/50`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                                isDark
                                  ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                                  : 'bg-violet-50 text-violet-700 border-violet-200'
                              }`}
                            >
                              Timeline • {item.horizon}
                            </span>
                            <span className="text-xs font-semibold truncate">
                              {item.title}
                            </span>
                          </div>

                          <div
                            className="flex items-center gap-1.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DatePickerField
                              value={span.targetDateIso}
                              onChange={(nextIso) =>
                                updateRoadmapItem(item.id, {
                                  targetDate: nextIso || undefined,
                                })
                              }
                              label="Target"
                              isDark={isDark}
                            />
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              RIGHT PANE: CLEAN, COLLAPSIBLE VISUAL TIMELINE ROADMAP
              =================================================================== */}
          {(layoutMode === 'roadmap' || layoutMode === 'split') && (
            <div
              className={`${
                layoutMode === 'split' ? 'xl:col-span-7' : 'col-span-1'
              } flex flex-col gap-4`}
            >
              <div
                className={`rounded-2xl border overflow-hidden ${getPanelSurfaceClass(
                  isDark
                )}`}
              >
                {/* Simple Top Quick-Add Bar with Date Pickers */}
                <form
                  onSubmit={handleQuickAddRoadmap}
                  className={`p-3 border-b flex flex-wrap items-center gap-2 ${getHeaderFooterSurfaceClass(
                    isDark
                  )}`}
                >
                  <input
                    type="text"
                    value={quickRmTitle}
                    onChange={(e) => setQuickRmTitle(e.target.value)}
                    placeholder="Add initiative or idea to timeline..."
                    className={`flex-1 min-w-[180px] px-3 py-1.5 rounded-xl border text-xs outline-none ${getInputSurfaceClass(
                      isDark
                    )}`}
                  />

                  <DatePickerField
                    label="Start"
                    value={quickRmStartDate}
                    onChange={setQuickRmStartDate}
                    isDark={isDark}
                  />

                  <DatePickerField
                    label="Target"
                    value={quickRmTargetDate}
                    onChange={setQuickRmTargetDate}
                    isDark={isDark}
                  />

                  <div className="w-32">
                    <CustomSelect
                      size="sm"
                      value={quickRmHorizon}
                      onChange={(v) => setQuickRmHorizon(v as RoadmapHorizon)}
                      options={HORIZON_OPTIONS}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!quickRmTitle.trim()}
                    className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-40 ${getPrimaryButtonClass()}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </form>

                {/* Streamlined Filter & Month Navigation Bar */}
                <div
                  className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 ${
                    isDark
                      ? 'bg-[#0c1019] border-[#1f273a]'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  {/* Horizon Filter Pills (Prevents seeing everything at once) */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setHorizonFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        horizonFilter === 'all'
                          ? getActiveToggleClass(isDark)
                          : getInactiveToggleClass(isDark)
                      }`}
                    >
                      All ({roadmap.length})
                    </button>
                    {HORIZON_CONFIG.map((h) => {
                      const count = roadmap.filter(
                        (r) => r.horizon === h.key
                      ).length;
                      return (
                        <button
                          key={h.key}
                          type="button"
                          onClick={() => {
                            updatePlannerState({
                              horizonFilter: h.key,
                              collapsedHorizons: {
                                ...collapsedHorizons,
                                [h.key]: false,
                              },
                            });
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                            horizonFilter === h.key
                              ? getActiveToggleClass(isDark)
                              : getInactiveToggleClass(isDark)
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${h.dotClass}`}
                          />
                          <span>{h.shortLabel}</span>
                          <span className="opacity-60 text-[10px]">
                            ({count})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Timeline Month Navigation */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setTimelineStartMonth(
                          new Date(
                            timelineStartMonth.getFullYear(),
                            timelineStartMonth.getMonth() - 1,
                            1
                          )
                        )
                      }
                      className={`p-1 rounded-lg cursor-pointer ${getSecondaryButtonClass(
                        isDark
                      )}`}
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setTimelineStartMonth(
                          new Date(now.getFullYear(), now.getMonth() - 1, 1)
                        );
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer ${getSecondaryButtonClass(
                        isDark
                      )}`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTimelineStartMonth(
                          new Date(
                            timelineStartMonth.getFullYear(),
                            timelineStartMonth.getMonth() + 1,
                            1
                          )
                        )
                      }
                      className={`p-1 rounded-lg cursor-pointer ${getSecondaryButtonClass(
                        isDark
                      )}`}
                      title="Next Month"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* VISUAL TIMELINE CANVAS */}
                <div className="overflow-x-auto">
                  <div className="min-w-[720px] relative">
                    {/* Month Header Row */}
                    <div
                      className={`sticky top-0 z-20 border-b flex ${
                        isDark
                          ? 'bg-[#0e131f] border-[#1f273a]'
                          : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div
                        className={`w-[230px] shrink-0 px-4 py-2 border-r flex items-center justify-between text-[11px] font-bold ${
                          isDark ? 'border-[#1f273a]' : 'border-slate-200'
                        }`}
                      >
                        <span>Initiative</span>
                      </div>

                      <div
                        ref={timelineTrackRef}
                        className="flex-1 flex relative"
                      >
                        {timelineWindow.months.map((m) => (
                          <div
                            key={m.key}
                            style={{ width: `${m.widthPct}%` }}
                            className={`px-2.5 py-2 border-r text-[11px] font-bold flex items-center justify-between ${
                              isDark
                                ? 'border-[#1c2334]'
                                : 'border-slate-200/80'
                            } ${
                              m.isCurrentMonth
                                ? isDark
                                  ? 'bg-indigo-500/12 text-indigo-300'
                                  : 'bg-indigo-50 text-indigo-700'
                                : ''
                            }`}
                          >
                            <span>{m.label}</span>
                          </div>
                        ))}

                        {timelineWindow.isTodayVisible && (
                          <div
                            style={{ left: `${timelineWindow.todayPct}%` }}
                            className="absolute bottom-0 -translate-x-1/2 z-30 pointer-events-none"
                          >
                            <span className="px-1.5 py-0.2 rounded-t text-[8px] font-extrabold uppercase bg-rose-500 text-white">
                              Today
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Horizon Groups & Timeline Bars */}
                    {roadmap.length === 0 ? (
                      <div className="p-10 text-center">
                        <p className="text-xs font-semibold">
                          No timeline initiatives yet
                        </p>
                        <p
                          className={`text-[11px] mt-1 ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          Use the bar above with the Start & Target date pickers
                          to plot your first initiative.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-500/15">
                        {horizonSections.map((section) => {
                          // Hide empty sections when viewing 'all' so the view stays super clean
                          if (
                            horizonFilter === 'all' &&
                            section.items.length === 0
                          ) {
                            return null;
                          }

                          const isCollapsed =
                            horizonFilter === 'all' &&
                            collapsedHorizons[section.key];

                          return (
                            <div key={section.key} className="flex flex-col">
                              {/* Collapsible Horizon Group Header */}
                              <div
                                onClick={() =>
                                  toggleHorizonCollapse(section.key)
                                }
                                className={`flex items-center justify-between px-4 py-2 cursor-pointer select-none transition-colors ${
                                  isDark
                                    ? 'bg-[#101624]/90 hover:bg-[#151d30]'
                                    : 'bg-slate-100/80 hover:bg-slate-200/60'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <ChevronDown
                                    className={`w-3.5 h-3.5 transition-transform ${
                                      isCollapsed ? '-rotate-90' : ''
                                    }`}
                                  />
                                  <span
                                    className={`w-2 h-2 rounded-full ${section.dotClass}`}
                                  />
                                  <span className="text-xs font-bold">
                                    {section.label}
                                  </span>
                                  <span
                                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                      isDark
                                        ? section.badgeDark
                                        : section.badgeLight
                                    }`}
                                  >
                                    {section.items.length}
                                  </span>
                                </div>

                                <span
                                  className={`text-[10px] ${
                                    isDark ? 'text-slate-400' : 'text-slate-500'
                                  }`}
                                >
                                  {isCollapsed
                                    ? 'Click to expand'
                                    : 'Click to collapse'}
                                </span>
                              </div>

                              {/* Timeline Rows (Only rendered when expanded) */}
                              {!isCollapsed &&
                                section.items.map((item) => {
                                  const effectiveItem =
                                    dragPreview &&
                                    dragPreview.itemId === item.id
                                      ? {
                                          ...item,
                                          startDate: dragPreview.startDate,
                                          targetDate: dragPreview.targetDate,
                                        }
                                      : item;
                                  const span = resolveRoadmapItemSpan(
                                    effectiveItem,
                                    todayIso
                                  );
                                  const safeWikiUrl = getSafeExternalUrl(
                                    item.wikiUrl
                                  );
                                  const rawLeftPct =
                                    ((span.startMs - timelineWindow.startMs) /
                                      timelineWindow.totalMs) *
                                    100;
                                  const rawRightPct =
                                    ((span.endMs - timelineWindow.startMs) /
                                      timelineWindow.totalMs) *
                                    100;

                                  const clampedLeftPct = Math.max(
                                    0,
                                    Math.min(96, rawLeftPct)
                                  );
                                  const clampedRightPct = Math.max(
                                    clampedLeftPct + 3,
                                    Math.min(100, rawRightPct)
                                  );
                                  const barWidthPct = Math.max(
                                    3,
                                    clampedRightPct - clampedLeftPct
                                  );
                                  const isOutOfBounds =
                                    rawRightPct < 0 || rawLeftPct > 100;

                                  const barClasses = getBarVisualClasses(
                                    item,
                                    isDark
                                  );

                                  return (
                                    <div
                                      key={item.id}
                                      className={`flex min-h-[52px] border-t transition-colors ${
                                        isDark
                                          ? 'border-[#192030] hover:bg-[#111726]/70'
                                          : 'border-slate-200/60 hover:bg-slate-50'
                                      }`}
                                    >
                                      {/* Left Initiative Label */}
                                      <div
                                        onClick={() =>
                                          openEditRoadmapModal(item)
                                        }
                                        className={`w-[230px] shrink-0 px-3.5 py-2 border-r flex flex-col justify-center gap-0.5 cursor-pointer ${
                                          isDark
                                            ? 'border-[#1f273a]'
                                            : 'border-slate-200'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-1.5">
                                          <span className="text-xs font-semibold truncate">
                                            {item.title}
                                          </span>
                                          <div className="flex items-center gap-1 shrink-0">
                                            {safeWikiUrl && (
                                              <a
                                                href={safeWikiUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                title="Open external documentation"
                                                className="text-indigo-400 hover:text-indigo-300 p-0.5"
                                              >
                                                <ExternalLink className="w-3 h-3" />
                                              </a>
                                            )}
                                            <Edit3 className="w-3 h-3 opacity-40" />
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-[10px] opacity-65">
                                          <span>
                                            {ROADMAP_STATUS_LABELS[item.status]}
                                          </span>
                                          {item.linkedTeam && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleJumpToSquad(
                                                  item.linkedTeam!
                                                );
                                              }}
                                              className="text-indigo-400 hover:underline truncate max-w-[100px] cursor-pointer"
                                            >
                                              • {item.linkedTeam}
                                            </button>
                                          )}
                                          {item.linkedApplication && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleJumpToApp(
                                                  item.linkedApplication!
                                                );
                                              }}
                                              className="text-cyan-400 hover:underline truncate max-w-[100px] cursor-pointer"
                                            >
                                              • {item.linkedApplication}
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Right Timeline Track */}
                                      <div className="flex-1 relative flex items-center py-1.5">
                                        {/* Month Grid Lines */}
                                        <div className="absolute inset-0 flex pointer-events-none">
                                          {timelineWindow.months.map((m) => (
                                            <div
                                              key={m.key}
                                              style={{
                                                width: `${m.widthPct}%`,
                                              }}
                                              className={`h-full border-r ${
                                                isDark
                                                  ? 'border-[#161d2c]'
                                                  : 'border-slate-200/60'
                                              }`}
                                            />
                                          ))}
                                        </div>

                                        {/* Today Vertical Line */}
                                        {timelineWindow.isTodayVisible && (
                                          <div
                                            style={{
                                              left: `${timelineWindow.todayPct}%`,
                                            }}
                                            className="absolute top-0 bottom-0 w-0.5 bg-rose-500/75 pointer-events-none z-10"
                                          />
                                        )}

                                        {isOutOfBounds ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const d = parseIsoDate(
                                                span.startDateIso
                                              );
                                              if (d) {
                                                setTimelineStartMonth(
                                                  new Date(
                                                    d.getFullYear(),
                                                    d.getMonth(),
                                                    1
                                                  )
                                                );
                                              }
                                            }}
                                            className={`mx-3 px-2.5 py-1 rounded-lg text-[10px] font-semibold border cursor-pointer z-10 ${getSecondaryButtonClass(
                                              isDark
                                            )}`}
                                          >
                                            {formatShortSpan(
                                              span.startDateIso,
                                              span.targetDateIso
                                            )}{' '}
                                            (Click to view)
                                          </button>
                                        ) : (
                                          <div
                                            style={{
                                              left: `${clampedLeftPct}%`,
                                              width: `${barWidthPct}%`,
                                            }}
                                            onPointerDown={(e) => {
                                              if (
                                                (e.target as HTMLElement)
                                                  .dataset.resizeHandle
                                              ) {
                                                return;
                                              }
                                              const trackWidth =
                                                timelineTrackRef.current
                                                  ?.clientWidth || 650;
                                              setDragState({
                                                itemId: item.id,
                                                mode: 'move',
                                                initialX: e.clientX,
                                                initialStartMs: span.startMs,
                                                initialEndMs: span.endMs,
                                                trackWidthPx: trackWidth,
                                              });
                                            }}
                                            onDoubleClick={() =>
                                              openEditRoadmapModal(item)
                                            }
                                            className={`relative z-10 h-8 rounded-xl border px-2.5 flex items-center justify-between gap-2 select-none cursor-grab active:cursor-grabbing overflow-hidden ${barClasses}`}
                                            title={`${item.title} (${formatShortSpan(
                                              span.startDateIso,
                                              span.targetDateIso
                                            )}) — Drag to move, drag edges to resize, or click title to edit`}
                                          >
                                            {/* Left Resize Handle */}
                                            <div
                                              data-resize-handle="start"
                                              onPointerDown={(e) => {
                                                e.stopPropagation();
                                                const trackWidth =
                                                  timelineTrackRef.current
                                                    ?.clientWidth || 650;
                                                setDragState({
                                                  itemId: item.id,
                                                  mode: 'resize-start',
                                                  initialX: e.clientX,
                                                  initialStartMs: span.startMs,
                                                  initialEndMs: span.endMs,
                                                  trackWidthPx: trackWidth,
                                                });
                                              }}
                                              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 z-20"
                                            />

                                            <span className="text-[11px] font-bold truncate">
                                              {item.title}
                                            </span>

                                            <span className="text-[9px] font-mono opacity-90 hidden sm:inline shrink-0">
                                              {formatShortSpan(
                                                span.startDateIso,
                                                span.targetDateIso
                                              )}
                                            </span>

                                            {/* Right Resize Handle */}
                                            <div
                                              data-resize-handle="end"
                                              onPointerDown={(e) => {
                                                e.stopPropagation();
                                                const trackWidth =
                                                  timelineTrackRef.current
                                                    ?.clientWidth || 650;
                                                setDragState({
                                                  itemId: item.id,
                                                  mode: 'resize-end',
                                                  initialX: e.clientX,
                                                  initialStartMs: span.startMs,
                                                  initialEndMs: span.endMs,
                                                  trackWidthPx: trackWidth,
                                                });
                                              }}
                                              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 z-20"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
