export type MemberRole = string;

export type VerticalColor =
  | 'slate'
  | 'indigo'
  | 'emerald'
  | 'amber'
  | 'violet'
  | 'cyan'
  | 'rose'
  | 'blue';

export type EmploymentType = 'internal' | 'outsourcing';

export type WorkspaceViewMode = 'teams' | 'applications' | 'planner';

export type PlannerLayoutMode = 'roadmap' | 'calendar' | 'split';
export type CalendarFilterTab = 'all' | 'todo' | 'followup' | 'timeline' | 'done';
export type HorizonFilter = 'all' | RoadmapHorizon;
export type ExcelPreviewSheetTab =
  | 'roster'
  | 'pegaApps'
  | 'squads'
  | 'verticals'
  | 'tasks'
  | 'roadmap';
export type HudFilterTab = 'roles' | 'apps' | 'sourcing';

export interface CanvasViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface PlannerUIState {
  layoutMode: PlannerLayoutMode;
  calendarTab: CalendarFilterTab;
  selectedDateIso: string | null;
  calendarMonthIso: string; // YYYY-MM-01
  timelineStartMonthIso: string; // YYYY-MM-01
  horizonFilter: HorizonFilter;
  collapsedHorizons: Record<RoadmapHorizon, boolean>;
  editingTaskId: string | null;
}

export type PracticeTaskKind = 'todo' | 'followup';

export type PracticeTaskPriority = 'high' | 'medium' | 'low';

export type PracticeTaskStatus = 'open' | 'in-progress' | 'done';

export interface PracticeTask {
  id: string;
  title: string;
  kind: PracticeTaskKind;
  status: PracticeTaskStatus;
  priority: PracticeTaskPriority;
  dueDate?: string; // YYYY-MM-DD
  followUpWith?: string;
  linkedTeam?: string;
  linkedApplication?: string;
  linkedRoadmapId?: string;
  notes?: string;
}

export type RoadmapHorizon = 'exploring' | 'now' | 'next' | 'later';

export type RoadmapItemStatus =
  | 'idea'
  | 'discovery'
  | 'in-progress'
  | 'blocked'
  | 'completed';

export interface PracticeRoadmapItem {
  id: string;
  title: string;
  horizon: RoadmapHorizon;
  status: RoadmapItemStatus;
  priority: PracticeTaskPriority;
  category?: string;
  startDate?: string; // YYYY-MM-DD
  targetDate?: string; // YYYY-MM-DD
  progress?: number; // 0-100
  outcome?: string;
  owner?: string;
  linkedTeam?: string;
  linkedApplication?: string;
  wikiUrl?: string;
  notes?: string;
}

export type PegaAppLayer = string;

export interface PegaRuleset {
  id: string;
  name: string;
  version: string;
  type: 'Core' | 'Application' | 'Integration' | 'Branch' | 'Shared' | string;
}

export interface PegaCaseType {
  id: string;
  name: string;
  workPoolPrefix?: string;
  workIdPrefix?: string;
  channel?: string;
}

export interface PegaDataType {
  id: string;
  name: string;
  sourceSystem: string;
  scope:
    | 'Domain'
    | 'Implementation'
    | 'Enterprise'
    | 'Shared'
    | 'Application'
    | 'Integration'
    | string;
}

export interface PegaApplicationBlueprint {
  id: string;
  name: string;
  version: string;
  layer: PegaAppLayer;
  architecture: string;
  description?: string;
  wikiUrl?: string;
  builtOnApplications: string[];
  rulesets: PegaRuleset[];
  caseTypes: PegaCaseType[];
  dataTypes: PegaDataType[];
  integrations?: string[];
  x: number;
  y: number;
}

export type CatalogItemKind =
  | 'application'
  | 'initiative'
  | 'company'
  | 'role'
  | 'architecture'
  | 'layer';

export interface CatalogItem {
  id: string;
  name: string;
  kind: CatalogItemKind;
  description?: string;
}

export interface ChapterMemberAssignment {
  id: string;
  name: string;
  role: MemberRole;
  allocation: number; // e.g., 100, 50, 25, 75
  employmentType?: EmploymentType; // 'internal' | 'outsourcing'
  company?: string;
}

export interface TeamSquad {
  id: string;
  name: string;
  verticalId: string;
  pegaApplication: string;
  initiative?: string;
  architecture?: string;
  wikiUrl?: string;
  x: number;
  y: number;
  members: ChapterMemberAssignment[];
}

export interface BusinessVertical {
  id: string;
  name: string;
  color: VerticalColor;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface TopologyMeta {
  version: string;
  lastUpdated: string;
  zoom: number;
}

export interface ChapterTopology {
  title: string;
  meta: TopologyMeta;
  catalog?: CatalogItem[];
  applications?: PegaApplicationBlueprint[];
  tasks?: PracticeTask[];
  roadmap?: PracticeRoadmapItem[];
  verticals: BusinessVertical[];
  teams: TeamSquad[];
}

export type SpotlightFilterType =
  | { type: 'none' }
  | { type: 'role'; value: string }
  | { type: 'application'; value: string }
  | { type: 'initiative'; value: string }
  | { type: 'sourcing'; value: EmploymentType }
  | { type: 'company'; value: string }
  | { type: 'vertical'; value: string }
  | { type: 'layer'; value: string }
  | { type: 'architecture'; value: string }
  | { type: 'task-kind'; value: PracticeTaskKind }
  | { type: 'horizon'; value: RoadmapHorizon }
  | { type: 'priority'; value: PracticeTaskPriority }
  | { type: 'shared' }
  | { type: 'gap-no-lsa' }
  | { type: 'gap-no-frontend' };

export type SyncStatus =
  | 'local-ready'
  | 'linked'
  | 'saving'
  | 'saved'
  | 'permission-needed'
  | 'error';

export const DEFAULT_CATALOG: CatalogItem[] = [];

/**
 * Empty by default so all dropdowns start clean and are populated 100% by user-defined values.
 */
export const PEGA_APP_LAYERS: {
  layer: PegaAppLayer;
  label: string;
  shortLabel: string;
  description: string;
  dotColor: string;
  badgeDark: string;
  badgeLight: string;
  rank: number;
}[] = [];

export function getPegaLayerMetadata(layer?: string) {
  const trimmed = (layer || '').trim();
  const lower = trimmed.toLowerCase();

  let dotColor = '#818cf8';
  let rank = 1;

  if (!trimmed) {
    dotColor = '#64748b';
    rank = 0;
  } else if (lower.includes('impl') || lower.includes('channel') || lower.includes('app')) {
    dotColor = '#818cf8';
    rank = 0;
  } else if (lower.includes('div') || lower.includes('domain') || lower.includes('region')) {
    dotColor = '#38bdf8';
    rank = 1;
  } else if (lower.includes('ent') || lower.includes('core') || lower.includes('shared')) {
    dotColor = '#a78bfa';
    rank = 2;
  } else if (lower.includes('frame') || lower.includes('base') || lower.includes('platform')) {
    dotColor = '#94a3b8';
    rank = 3;
  }

  return {
    layer: trimmed,
    label: trimmed || 'Unassigned Layer',
    shortLabel: trimmed || 'Unassigned',
    description: 'Application architecture layer',
    dotColor,
    badgeDark: 'bg-[#141a28] text-slate-200 border-[#232c40]',
    badgeLight: 'bg-slate-100 text-slate-700 border-slate-200',
    rank,
  };
}

/**
 * Empty by default so all role/position dropdowns start clean and are populated 100% by the user.
 */
export const MEMBER_ROLES: {
  role: MemberRole;
  shortLabel: string;
  description: string;
  category: 'architect' | 'frontend' | 'specialist';
  badgeDark: string;
  badgeLight: string;
  dotColor: string;
}[] = [];

export const PEGA_APPLICATIONS = [] as const;

export const ARCHITECTURE_STACKS: readonly string[] = [];

/**
 * 2026 Enterprise Architectural Vertical Zone Themes.
 * Unified obsidian-slate / alabaster surfaces across all verticals, with the accent color
 * reserved strictly for the indicator dot and top specular line.
 */
const UNIFIED_ZONE_SURFACE = {
  zoneBgDark: 'bg-[#0d111a]/75',
  zoneBorderDark: 'border-[#1e2638]',
  headerBgDark: 'bg-[#111622]/92 border-b border-[#1e2638]',
  badgeDark: 'bg-[#151b29] text-slate-300 border-[#242e44]',
  zoneBgLight: 'bg-slate-100/65',
  zoneBorderLight: 'border-slate-200/90',
  headerBgLight: 'bg-white/95 border-b border-slate-200/90',
  badgeLight: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const VERTICAL_COLOR_THEMES: Record<
  VerticalColor,
  {
    label: string;
    hex: string;
    zoneBgDark: string;
    zoneBorderDark: string;
    headerBgDark: string;
    badgeDark: string;
    zoneBgLight: string;
    zoneBorderLight: string;
    headerBgLight: string;
    badgeLight: string;
  }
> = {
  slate: {
    label: 'Titanium Slate',
    hex: '#94a3b8',
    ...UNIFIED_ZONE_SURFACE,
  },
  indigo: {
    label: 'Electric Indigo',
    hex: '#818cf8',
    ...UNIFIED_ZONE_SURFACE,
  },
  emerald: {
    label: 'Emerald Mint',
    hex: '#34d399',
    ...UNIFIED_ZONE_SURFACE,
  },
  amber: {
    label: 'Champagne Gold',
    hex: '#f59e0b',
    ...UNIFIED_ZONE_SURFACE,
  },
  violet: {
    label: 'Cosmic Violet',
    hex: '#a78bfa',
    ...UNIFIED_ZONE_SURFACE,
  },
  cyan: {
    label: 'Arctic Cyan',
    hex: '#38bdf8',
    ...UNIFIED_ZONE_SURFACE,
  },
  rose: {
    label: 'Crimson Rose',
    hex: '#fb7185',
    ...UNIFIED_ZONE_SURFACE,
  },
  blue: {
    label: 'Cobalt Sapphire',
    hex: '#60a5fa',
    ...UNIFIED_ZONE_SURFACE,
  },
};

export function getRoleMetadata(roleName: string) {
  const trimmed = (roleName || '').trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return {
      role: '',
      shortLabel: 'Unassigned',
      description: 'No position assigned',
      category: 'specialist' as const,
      badgeDark: 'bg-[#141a28] text-slate-400 border-[#232c40]',
      badgeLight: 'bg-slate-100 text-slate-500 border-slate-200',
      dotColor: '#64748b',
    };
  }

  const isArchitect =
    lower.includes('lsa') ||
    lower.includes('ssa') ||
    lower.includes('csa') ||
    lower.includes('architect') ||
    lower.includes('lead') ||
    lower.includes('principal');
  const isFrontend =
    lower.includes('frontend') ||
    lower.includes('front-end') ||
    lower.includes('constellation') ||
    lower.includes('react') ||
    lower.includes('ui') ||
    lower.includes('ux');

  return {
    role: trimmed,
    shortLabel: trimmed,
    description: 'Defined Position / Role',
    category: (isArchitect
      ? 'architect'
      : isFrontend
      ? 'frontend'
      : 'specialist') as 'architect' | 'frontend' | 'specialist',
    badgeDark: 'bg-[#141a28] text-slate-200 border-[#232c40]',
    badgeLight: 'bg-slate-100 text-slate-700 border-slate-200',
    dotColor: isArchitect ? '#818cf8' : isFrontend ? '#38bdf8' : '#a78bfa',
  };
}

/**
 * Calm, refined badge styling for Applications.
 */
export function getPegaAppBadgeStyle(_app: string, isDark: boolean) {
  return isDark
    ? 'bg-zinc-800/90 text-zinc-200 border-zinc-700/90'
    : 'bg-zinc-100 text-zinc-800 border-zinc-200/90';
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Strictly validates and normalizes user-supplied external URLs (OWASP XSS prevention).
 * Blocks `javascript:`, `data:`, `vbscript:`, `file:`, and malformed schemes; permits only `http:` and `https:`.
 */
export function getSafeExternalUrl(rawUrl?: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  // Strip control characters and trim whitespace
  const cleaned = rawUrl.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!cleaned) return null;

  // Reject any non-http(s) explicit scheme (e.g. javascript:, data:, vbscript:, file:)
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(cleaned) && !/^https?:\/\//i.test(cleaned)) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (!parsed.hostname || parsed.hostname.length < 1) {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

export function formatExternalUrlLabel(rawUrl?: string): string {
  if (!rawUrl) return '';
  return rawUrl
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, '')
    .replace(/\/$/, '');
}
