import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import {
  BusinessVertical,
  CalendarFilterTab,
  CanvasViewportState,
  CatalogItem,
  CatalogItemKind,
  ChapterMemberAssignment,
  ChapterTopology,
  DEFAULT_CATALOG,
  EmploymentType,
  ExcelPreviewSheetTab,
  HorizonFilter,
  HudFilterTab,
  PegaApplicationBlueprint,
  PlannerLayoutMode,
  PlannerUIState,
  PracticeRoadmapItem,
  PracticeTask,
  PracticeTaskKind,
  RoadmapHorizon,
  SpotlightFilterType,
  SyncStatus,
  TeamSquad,
  VerticalColor,
  WorkspaceViewMode,
} from '../types/topology';
import { INITIAL_TOPOLOGY } from '../data/initialTopology';
import {
  parseTopologyMarkdown,
  serializeTopologyToMarkdown,
} from '../utils/markdownEngine';
import {
  parseTopologyFromExcelBuffer,
  serializeTopologyToExcelBuffer,
} from '../utils/excelEngine';
import {
  autoLayoutApplications,
  autoLayoutTopology,
  computeVerticalBounds,
  estimateTeamCardHeight,
  reconcileTopologyApplications,
  TEAM_CARD_WIDTH,
  TEAM_GAP_X,
  TEAM_GAP_Y,
  VERTICAL_HEADER_HEIGHT,
  VERTICAL_PADDING_X,
} from '../utils/layoutEngine';

const IDB_TOPOLOGY_KEY = 'chaptermap_topology_v2026_clean_2';
const IDB_FILE_HANDLE_KEY = 'chaptermap_file_handle_v2026_1';
const IDB_MD_HANDLE_KEY = 'chaptermap_md_handle_v2026_1';
const IDB_XLSX_HANDLE_KEY = 'chaptermap_xlsx_handle_v2026_1';
const IDB_THEME_KEY = 'chaptermap_theme_v2026_1';
const IDB_FORMAT_KEY = 'chaptermap_format_v2026_1';
const IDB_IS_LINKED_KEY = 'chaptermap_is_linked_v2026_1';
const IDB_LINKED_FILENAME_KEY = 'chaptermap_linked_filename_v2026_1';
const IDB_UI_STATE_KEY = 'chaptermap_ui_state_idb_v2026_1';

const LS_UI_STATE_KEY = 'chaptermap_ui_state_v2026_1';
const LS_TOPOLOGY_CACHE_KEY = 'chaptermap_topology_cache_v2026_1';

const MAX_UNDO_HISTORY = 100;
const COALESCE_WINDOW_MS = 650;

export type UnderlyingFileFormat = 'markdown' | 'excel';

interface PersistedUIStateSnapshot {
  theme: 'dark' | 'light';
  viewMode: WorkspaceViewMode;
  spotlightFilter: SpotlightFilterType;
  searchQuery: string;
  showAllSharedConnectors: boolean;
  hudFilterTab: HudFilterTab;
  selectedTeamId: string | null;
  selectedVerticalId: string | null;
  selectedAppId: string | null;
  isMarkdownDrawerOpen: boolean;
  excelSheetTab: ExcelPreviewSheetTab;
  isCatalogModalOpen: boolean;
  catalogActiveTab: CatalogItemKind;
  teamsViewport: CanvasViewportState | null;
  applicationsViewport: CanvasViewportState | null;
  plannerState: PlannerUIState;
  fileFormat: UnderlyingFileFormat;
  isFileLinked: boolean;
  fileName: string;
}

function getDefaultPlannerUIState(): PlannerUIState {
  const now = new Date();
  const calMonthIso = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}-01`;
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const timelineStartMonthIso = `${prevMonth.getFullYear()}-${String(
    prevMonth.getMonth() + 1
  ).padStart(2, '0')}-01`;

  return {
    layoutMode: 'split',
    calendarTab: 'all',
    selectedDateIso: null,
    calendarMonthIso: calMonthIso,
    timelineStartMonthIso,
    horizonFilter: 'all',
    collapsedHorizons: {
      now: false,
      next: false,
      later: true,
      exploring: true,
    },
    editingTaskId: null,
  };
}

function loadInitialUIStateSync(): PersistedUIStateSnapshot {
  const defaultPlanner = getDefaultPlannerUIState();
  const fallback: PersistedUIStateSnapshot = {
    theme: 'dark',
    viewMode: 'teams',
    spotlightFilter: { type: 'none' },
    searchQuery: '',
    showAllSharedConnectors: true,
    hudFilterTab: 'roles',
    selectedTeamId: null,
    selectedVerticalId: null,
    selectedAppId: null,
    isMarkdownDrawerOpen: false,
    excelSheetTab: 'roster',
    isCatalogModalOpen: false,
    catalogActiveTab: 'application',
    teamsViewport: null,
    applicationsViewport: null,
    plannerState: defaultPlanner,
    fileFormat: 'markdown',
    isFileLinked: false,
    fileName: 'practice-topology.md',
  };

  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(LS_UI_STATE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedUIStateSnapshot>;
    const theme = parsed.theme === 'light' ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }

    const viewMode: WorkspaceViewMode =
      parsed.viewMode === 'applications' ||
      parsed.viewMode === 'planner' ||
      parsed.viewMode === 'teams'
        ? parsed.viewMode
        : 'teams';

    const rawPlanner = (parsed.plannerState ?? {}) as Partial<PlannerUIState>;
    const rawCollapsed = (rawPlanner.collapsedHorizons ?? {}) as Partial<
      Record<RoadmapHorizon, boolean>
    >;

    const plannerState: PlannerUIState = {
      layoutMode:
        rawPlanner.layoutMode === 'roadmap' ||
        rawPlanner.layoutMode === 'calendar' ||
        rawPlanner.layoutMode === 'split'
          ? rawPlanner.layoutMode
          : defaultPlanner.layoutMode,
      calendarTab:
        rawPlanner.calendarTab === 'todo' ||
        rawPlanner.calendarTab === 'followup' ||
        rawPlanner.calendarTab === 'timeline' ||
        rawPlanner.calendarTab === 'done' ||
        rawPlanner.calendarTab === 'all'
          ? rawPlanner.calendarTab
          : defaultPlanner.calendarTab,
      selectedDateIso:
        typeof rawPlanner.selectedDateIso === 'string'
          ? rawPlanner.selectedDateIso
          : null,
      calendarMonthIso:
        typeof rawPlanner.calendarMonthIso === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(rawPlanner.calendarMonthIso)
          ? rawPlanner.calendarMonthIso
          : defaultPlanner.calendarMonthIso,
      timelineStartMonthIso:
        typeof rawPlanner.timelineStartMonthIso === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(rawPlanner.timelineStartMonthIso)
          ? rawPlanner.timelineStartMonthIso
          : defaultPlanner.timelineStartMonthIso,
      horizonFilter:
        rawPlanner.horizonFilter === 'now' ||
        rawPlanner.horizonFilter === 'next' ||
        rawPlanner.horizonFilter === 'later' ||
        rawPlanner.horizonFilter === 'exploring' ||
        rawPlanner.horizonFilter === 'all'
          ? rawPlanner.horizonFilter
          : 'all',
      collapsedHorizons: {
        now:
          typeof rawCollapsed.now === 'boolean'
            ? rawCollapsed.now
            : defaultPlanner.collapsedHorizons.now,
        next:
          typeof rawCollapsed.next === 'boolean'
            ? rawCollapsed.next
            : defaultPlanner.collapsedHorizons.next,
        later:
          typeof rawCollapsed.later === 'boolean'
            ? rawCollapsed.later
            : defaultPlanner.collapsedHorizons.later,
        exploring:
          typeof rawCollapsed.exploring === 'boolean'
            ? rawCollapsed.exploring
            : defaultPlanner.collapsedHorizons.exploring,
      },
      editingTaskId:
        typeof rawPlanner.editingTaskId === 'string'
          ? rawPlanner.editingTaskId
          : null,
    };

    const sanitizeViewport = (
      vp: unknown
    ): CanvasViewportState | null => {
      if (
        vp &&
        typeof vp === 'object' &&
        typeof (vp as CanvasViewportState).x === 'number' &&
        typeof (vp as CanvasViewportState).y === 'number' &&
        typeof (vp as CanvasViewportState).zoom === 'number' &&
        Number.isFinite((vp as CanvasViewportState).x) &&
        Number.isFinite((vp as CanvasViewportState).y) &&
        Number.isFinite((vp as CanvasViewportState).zoom)
      ) {
        return {
          x: (vp as CanvasViewportState).x,
          y: (vp as CanvasViewportState).y,
          zoom: (vp as CanvasViewportState).zoom,
        };
      }
      return null;
    };

    return {
      theme,
      viewMode,
      spotlightFilter:
        parsed.spotlightFilter && typeof parsed.spotlightFilter.type === 'string'
          ? parsed.spotlightFilter
          : { type: 'none' },
      searchQuery:
        typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
      showAllSharedConnectors:
        typeof parsed.showAllSharedConnectors === 'boolean'
          ? parsed.showAllSharedConnectors
          : true,
      hudFilterTab:
        parsed.hudFilterTab === 'apps' ||
        parsed.hudFilterTab === 'sourcing' ||
        parsed.hudFilterTab === 'roles'
          ? parsed.hudFilterTab
          : 'roles',
      selectedTeamId:
        typeof parsed.selectedTeamId === 'string' ? parsed.selectedTeamId : null,
      selectedVerticalId:
        typeof parsed.selectedVerticalId === 'string'
          ? parsed.selectedVerticalId
          : null,
      selectedAppId:
        typeof parsed.selectedAppId === 'string' ? parsed.selectedAppId : null,
      isMarkdownDrawerOpen: Boolean(parsed.isMarkdownDrawerOpen),
      excelSheetTab:
        parsed.excelSheetTab === 'pegaApps' ||
        parsed.excelSheetTab === 'squads' ||
        parsed.excelSheetTab === 'verticals' ||
        parsed.excelSheetTab === 'tasks' ||
        parsed.excelSheetTab === 'roadmap' ||
        parsed.excelSheetTab === 'roster'
          ? parsed.excelSheetTab
          : 'roster',
      isCatalogModalOpen: Boolean(parsed.isCatalogModalOpen),
      catalogActiveTab:
        parsed.catalogActiveTab === 'initiative' ||
        parsed.catalogActiveTab === 'company' ||
        parsed.catalogActiveTab === 'role' ||
        parsed.catalogActiveTab === 'architecture' ||
        parsed.catalogActiveTab === 'layer' ||
        parsed.catalogActiveTab === 'application'
          ? parsed.catalogActiveTab
          : 'application',
      teamsViewport: sanitizeViewport(parsed.teamsViewport),
      applicationsViewport: sanitizeViewport(parsed.applicationsViewport),
      plannerState,
      fileFormat: parsed.fileFormat === 'excel' ? 'excel' : 'markdown',
      isFileLinked: Boolean(parsed.isFileLinked),
      fileName:
        typeof parsed.fileName === 'string' && parsed.fileName.trim()
          ? !parsed.isFileLinked &&
            (parsed.fileName === 'chapter-topology.md' ||
              parsed.fileName === 'chapter-topology.xlsx')
            ? parsed.fileFormat === 'excel'
              ? 'practice-topology.xlsx'
              : 'practice-topology.md'
            : parsed.fileName
          : 'practice-topology.md',
    };
  } catch {
    return fallback;
  }
}

function loadInitialTopologySync(): ChapterTopology {
  if (typeof window === 'undefined') return INITIAL_TOPOLOGY;
  try {
    const raw = window.localStorage.getItem(LS_TOPOLOGY_CACHE_KEY);
    if (!raw) return INITIAL_TOPOLOGY;
    const parsed = JSON.parse(raw) as ChapterTopology;
    if (
      parsed &&
      Array.isArray(parsed.verticals) &&
      Array.isArray(parsed.teams)
    ) {
      return reconcileTopologyApplications({
        ...parsed,
        title:
          !parsed.title || parsed.title === 'Chapter Topology'
            ? 'Practice Topology'
            : parsed.title,
        catalog: Array.isArray(parsed.catalog)
          ? parsed.catalog
          : DEFAULT_CATALOG,
      });
    }
    return INITIAL_TOPOLOGY;
  } catch {
    return INITIAL_TOPOLOGY;
  }
}

function saveTopologyCacheSync(topology: ChapterTopology) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_TOPOLOGY_CACHE_KEY, JSON.stringify(topology));
  } catch {
    // Ignore quota errors; IndexedDB remains primary large store
  }
}

export interface ConfirmDialogPayload {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
}

declare global {
  interface Window {
    showOpenFilePicker?: (options?: {
      types?: {
        description: string;
        accept: Record<string, string[]>;
      }[];
      multiple?: boolean;
    }) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: {
        description: string;
        accept: Record<string, string[]>;
      }[];
    }) => Promise<FileSystemFileHandle>;
  }

  interface FileSystemFileHandle {
    queryPermission?: (descriptor: {
      mode: 'read' | 'readwrite';
    }) => Promise<'granted' | 'denied' | 'prompt'>;
    requestPermission?: (descriptor: {
      mode: 'read' | 'readwrite';
    }) => Promise<'granted' | 'denied' | 'prompt'>;
  }
}

interface TopologyStoreState {
  topology: ChapterTopology;
  markdownText: string;
  parseWarnings: string[];

  // Undo / Redo History State
  past: ChapterTopology[];
  future: ChapterTopology[];
  undo: () => void;
  redo: () => void;

  // UI & Interaction State (Persisted across tab switches & full page refreshes)
  theme: 'dark' | 'light';
  viewMode: WorkspaceViewMode;
  spotlightFilter: SpotlightFilterType;
  searchQuery: string;
  hoveredMemberName: string | null;
  showAllSharedConnectors: boolean;
  hudFilterTab: HudFilterTab;
  selectedTeamId: string | null;
  selectedVerticalId: string | null;
  selectedAppId: string | null;
  isMarkdownDrawerOpen: boolean;
  excelSheetTab: ExcelPreviewSheetTab;
  isAssignModalOpen: boolean;
  isCatalogModalOpen: boolean;
  catalogActiveTab: CatalogItemKind;
  teamsViewport: CanvasViewportState | null;
  applicationsViewport: CanvasViewportState | null;
  plannerState: PlannerUIState;
  confirmDialog: ConfirmDialogPayload | null;

  // File System Access API State
  fileFormat: UnderlyingFileFormat;
  isFileLinked: boolean;
  fileHandle: FileSystemFileHandle | null;
  markdownFileHandle: FileSystemFileHandle | null;
  excelFileHandle: FileSystemFileHandle | null;
  fileName: string;
  syncStatus: SyncStatus;
  lastSavedAt: string | null;
  syncError: string | null;
  lastKnownFileModified: number | null;

  // Initialization & Persistence
  hydrateFromStorage: () => Promise<void>;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setViewMode: (mode: WorkspaceViewMode) => void;
  setFileFormat: (format: UnderlyingFileFormat) => void;
  requestConfirmation: (payload: ConfirmDialogPayload) => void;
  closeConfirmation: () => void;

  // Spotlight & Selection
  setSpotlightFilter: (filter: SpotlightFilterType) => void;
  setSearchQuery: (query: string) => void;
  setHoveredMemberName: (name: string | null) => void;
  setShowAllSharedConnectors: (show: boolean) => void;
  setHudFilterTab: (tab: HudFilterTab) => void;
  selectTeam: (teamId: string | null) => void;
  selectVertical: (verticalId: string | null) => void;
  selectApp: (appId: string | null) => void;
  setMarkdownDrawerOpen: (open: boolean) => void;
  setExcelSheetTab: (tab: ExcelPreviewSheetTab) => void;
  setAssignModalOpen: (open: boolean) => void;
  setCatalogModalOpen: (open: boolean) => void;
  setCatalogActiveTab: (tab: CatalogItemKind) => void;
  setCanvasViewport: (
    mode: 'teams' | 'applications',
    viewport: CanvasViewportState | null
  ) => void;
  updatePlannerState: (updates: Partial<PlannerUIState>) => void;
  togglePlannerHorizonCollapse: (horizon: RoadmapHorizon) => void;

  // Markdown Two-Way Editing
  updateFromMarkdownEditor: (rawMarkdown: string) => void;

  // Canvas & Spatial Actions
  moveVertical: (verticalId: string, newX: number, newY: number) => void;
  moveTeam: (teamId: string, newX: number, newY: number) => void;
  movePegaApplication: (appId: string, newX: number, newY: number) => void;
  runAutoLayout: () => void;
  resetToDemoData: () => void;

  // Domain CRUD — Pega Applications
  addPegaApplication: (
    payload?: Partial<Omit<PegaApplicationBlueprint, 'id' | 'x' | 'y'>>
  ) => string;
  updatePegaApplication: (
    appId: string,
    updates: Partial<Omit<PegaApplicationBlueprint, 'id'>>
  ) => void;
  duplicatePegaApplication: (appId: string) => string | null;
  deletePegaApplication: (appId: string) => void;
  toggleTeamForApplication: (appId: string, teamId: string) => void;

  // Domain CRUD — Catalog (Applications, Initiatives, Companies, Positions, Architectures & Layers)
  addCatalogItem: (payload: {
    name: string;
    kind: CatalogItemKind;
    description?: string;
  }) => string;
  updateCatalogItem: (
    itemId: string,
    updates: Partial<Pick<CatalogItem, 'name' | 'kind' | 'description'>>
  ) => void;
  deleteCatalogItem: (itemId: string) => void;
  deleteCatalogItemByName: (name: string, kind: CatalogItemKind) => void;

  // Domain CRUD — Verticals
  addVertical: (payload?: { name?: string; color?: VerticalColor }) => string;
  updateVertical: (
    verticalId: string,
    updates: Partial<Pick<BusinessVertical, 'name' | 'color' | 'x' | 'y'>>
  ) => void;
  deleteVertical: (verticalId: string) => void;

  // Domain CRUD — Teams / Squads
  addTeam: (payload?: {
    name?: string;
    verticalId?: string;
    pegaApplication?: string;
    initiative?: string;
    architecture?: string;
    wikiUrl?: string;
  }) => string;
  updateTeam: (
    teamId: string,
    updates: Partial<
      Pick<
        TeamSquad,
        | 'name'
        | 'verticalId'
        | 'pegaApplication'
        | 'initiative'
        | 'architecture'
        | 'wikiUrl'
        | 'x'
        | 'y'
      >
    >
  ) => void;
  duplicateTeam: (teamId: string) => string | null;
  deleteTeam: (teamId: string) => void;

  // Domain CRUD — Chapter Members
  addMemberToTeam: (
    teamId: string,
    member: Omit<ChapterMemberAssignment, 'id'>
  ) => void;
  updateTeamMember: (
    teamId: string,
    memberId: string,
    updates: Partial<Omit<ChapterMemberAssignment, 'id'>>
  ) => void;
  removeMemberFromTeam: (teamId: string, memberId: string) => void;
  assignMemberAcrossTeams: (
    name: string,
    role: string,
    assignments: { teamId: string; allocation: number }[],
    options?: { employmentType?: EmploymentType; company?: string }
  ) => void;

  // Domain CRUD — Practice Lead Planner & Roadmap
  addPracticeTask: (payload: Omit<PracticeTask, 'id'>) => string;
  updatePracticeTask: (
    taskId: string,
    updates: Partial<Omit<PracticeTask, 'id'>>
  ) => void;
  togglePracticeTaskStatus: (taskId: string) => void;
  deletePracticeTask: (taskId: string) => void;
  addRoadmapItem: (payload: Omit<PracticeRoadmapItem, 'id'>) => string;
  updateRoadmapItem: (
    itemId: string,
    updates: Partial<Omit<PracticeRoadmapItem, 'id'>>
  ) => void;
  deleteRoadmapItem: (itemId: string) => void;
  promoteRoadmapToInitiative: (itemId: string) => void;
  createTaskFromRoadmapItem: (
    itemId: string,
    kind?: PracticeTaskKind
  ) => string | null;

  // File System Sync Actions
  openLocalMarkdownFile: (
    preferredFormat?: UnderlyingFileFormat
  ) => Promise<void>;
  importMarkdownFromFileObject: (file: File) => Promise<void>;
  saveAsNewMarkdownFile: (
    preferredFormat?: UnderlyingFileFormat
  ) => Promise<void>;
  createNewLinkedFile: (options: {
    name: string;
    format: UnderlyingFileFormat;
    startBlank?: boolean;
  }) => Promise<void>;
  flushAutosaveNow: () => Promise<void>;
  reconnectStoredFileHandle: () => Promise<void>;
  unlinkLocalFile: () => Promise<void>;
  downloadMarkdownSnapshot: (formatOverride?: UnderlyingFileFormat) => void;
  checkExternalFileChanges: () => Promise<void>;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isWritingToDisk = false;
let hasPendingDiskWrite = false;
let pendingPermissionPromise: Promise<PermissionState> | null = null;
let lastCoalesceKey: string | null = null;
let lastCoalesceTime = 0;

function cloneTopology(topology: ChapterTopology): ChapterTopology {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(topology);
    } catch {
      // Fallback to JSON deep clone
    }
  }
  return JSON.parse(JSON.stringify(topology));
}

function isExcelFileName(name: string): boolean {
  return /\.(xlsx|xls)$/i.test(name.trim());
}

function isMarkdownFileName(name: string): boolean {
  return /\.(md|markdown|txt)$/i.test(name.trim());
}

function resolveHandleFormat(
  handleName: string,
  fallbackFormat: UnderlyingFileFormat
): UnderlyingFileFormat {
  if (isExcelFileName(handleName)) return 'excel';
  if (isMarkdownFileName(handleName)) return 'markdown';
  return fallbackFormat;
}

async function writeToFileHandle(
  handle: FileSystemFileHandle,
  content: string | Uint8Array | Blob
): Promise<number> {
  if (pendingPermissionPromise) {
    try {
      await pendingPermissionPromise;
    } catch {
      // Ignore; queryPermission below will check state
    } finally {
      pendingPermissionPromise = null;
    }
  }

  if (handle.queryPermission) {
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      if (handle.requestPermission) {
        const req = await handle.requestPermission({ mode: 'readwrite' });
        if (req !== 'granted') {
          throw new Error('PERMISSION_REQUIRED');
        }
      } else {
        throw new Error('PERMISSION_REQUIRED');
      }
    }
  }
  const writable = await handle.createWritable();
  await writable.write(content as any);
  await writable.close();
  const file = await handle.getFile();
  return file.lastModified;
}

export const useTopologyStore = create<TopologyStoreState>((set, get) => {
  const performDiskWrite = async () => {
    if (isWritingToDisk) {
      hasPendingDiskWrite = true;
      return;
    }

    isWritingToDisk = true;
    try {
      do {
        hasPendingDiskWrite = false;
        const currentHandle = get().fileHandle;
        const latestMarkdown = get().markdownText;
        const latestTopology = get().topology;
        const nowIso = new Date().toISOString();

        if (!currentHandle) {
          set({
            syncStatus: get().isFileLinked ? 'saved' : 'local-ready',
            lastSavedAt: nowIso,
          });
          break;
        }

        try {
          const targetFormat = resolveHandleFormat(
            currentHandle.name || '',
            get().fileFormat
          );
          const payloadToWrite =
            targetFormat === 'excel'
              ? new Blob([serializeTopologyToExcelBuffer(latestTopology)], {
                  type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                })
              : latestMarkdown;
          const lastMod = await writeToFileHandle(
            currentHandle,
            payloadToWrite
          );

          // If the user also linked a secondary handle for the other format and granted permission, keep it synced too
          const otherHandle =
            targetFormat === 'excel'
              ? get().markdownFileHandle
              : get().excelFileHandle;
          if (otherHandle && otherHandle !== currentHandle) {
            try {
              const otherPerm = otherHandle.queryPermission
                ? await otherHandle.queryPermission({ mode: 'readwrite' })
                : 'granted';
              if (otherPerm === 'granted') {
                const otherPayload =
                  targetFormat === 'excel'
                    ? latestMarkdown
                    : new Blob(
                        [serializeTopologyToExcelBuffer(latestTopology)],
                        {
                          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        }
                      );
                await writeToFileHandle(otherHandle, otherPayload);
              }
            } catch {
              // Secondary handle sync is best-effort
            }
          }

          set({
            syncStatus: 'saved',
            lastSavedAt: new Date().toISOString(),
            lastKnownFileModified: lastMod,
            syncError: null,
          });
        } catch (err: any) {
          console.warn(
            'Auto-save to file handle requires permission or failed:',
            err
          );
          let permState: PermissionState = 'granted';
          try {
            if (currentHandle.queryPermission) {
              permState = await currentHandle.queryPermission({
                mode: 'readwrite',
              });
            }
          } catch {
            permState = 'prompt';
          }

          set({
            syncStatus:
              permState !== 'granted' || err?.message === 'PERMISSION_REQUIRED'
                ? 'permission-needed'
                : 'error',
            syncError:
              err?.message || 'Permission required to write to disk file',
          });
        }
      } while (hasPendingDiskWrite);
    } finally {
      isWritingToDisk = false;
    }
  };

  const scheduleDiskAutosave = (wasPermissionNeeded?: boolean) => {
    // Request write permission synchronously while inside a user gesture if needed
    const activeHandle = get().fileHandle;
    if (
      activeHandle &&
      (wasPermissionNeeded || get().syncStatus === 'permission-needed') &&
      activeHandle.requestPermission
    ) {
      try {
        pendingPermissionPromise = activeHandle.requestPermission({
          mode: 'readwrite',
        });
        pendingPermissionPromise.catch(() => {});
      } catch {
        // Ignore
      }
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      performDiskWrite();
    }, 320);
  };

  const commitTopology = (
    nextTopology: ChapterTopology,
    options?: {
      skipMarkdownRegen?: boolean;
      rawMarkdownOverride?: string;
      coalesceKey?: string;
      skipHistory?: boolean;
    }
  ) => {
    const prevTopology = get().topology;
    const wasPermissionNeeded = get().syncStatus === 'permission-needed';
    const now = Date.now();

    let nextPast = get().past;
    let nextFuture = get().future;

    if (!options?.skipHistory) {
      const coalesceKey = options?.coalesceKey || null;
      const shouldCoalesce =
        coalesceKey !== null &&
        coalesceKey === lastCoalesceKey &&
        now - lastCoalesceTime < COALESCE_WINDOW_MS;

      if (!shouldCoalesce) {
        nextPast = [...nextPast, cloneTopology(prevTopology)].slice(
          -MAX_UNDO_HISTORY
        );
      }
      nextFuture = [];
      lastCoalesceKey = coalesceKey;
      lastCoalesceTime = now;
    }

    const stampedTopology: ChapterTopology = reconcileTopologyApplications({
      ...nextTopology,
      catalog: nextTopology.catalog ?? DEFAULT_CATALOG,
      meta: {
        ...nextTopology.meta,
        lastUpdated: new Date().toISOString(),
      },
    });

    const nextMarkdown =
      options?.skipMarkdownRegen && options.rawMarkdownOverride !== undefined
        ? options.rawMarkdownOverride
        : serializeTopologyToMarkdown(stampedTopology);

    set({
      topology: stampedTopology,
      markdownText: nextMarkdown,
      past: nextPast,
      future: nextFuture,
      syncStatus: 'saving',
      syncError: null,
    });

    saveTopologyCacheSync(stampedTopology);
    idbSet(IDB_TOPOLOGY_KEY, stampedTopology).catch((err) => {
      console.warn('IndexedDB save warning:', err);
    });

    scheduleDiskAutosave(wasPermissionNeeded);
  };

  const initialUI = loadInitialUIStateSync();
  const initialTopology = loadInitialTopologySync();
  const initialMarkdown = serializeTopologyToMarkdown(initialTopology);

  return {
    topology: initialTopology,
    markdownText: initialMarkdown,
    parseWarnings: [],

    past: [],
    future: [],

    undo: () => {
      const {
        past,
        future,
        topology,
        selectedTeamId,
        selectedVerticalId,
        selectedAppId,
      } = get();
      if (past.length === 0) return;

      const previousTopology = past[past.length - 1];
      const nextPast = past.slice(0, -1);
      const nextFuture = [cloneTopology(topology), ...future].slice(
        0,
        MAX_UNDO_HISTORY
      );

      lastCoalesceKey = null;
      lastCoalesceTime = 0;

      const stamped: ChapterTopology = reconcileTopologyApplications({
        ...previousTopology,
        catalog: previousTopology.catalog ?? DEFAULT_CATALOG,
        meta: {
          ...previousTopology.meta,
          lastUpdated: new Date().toISOString(),
        },
      });

      const nextMarkdown = serializeTopologyToMarkdown(stamped);
      const teamStillExists = selectedTeamId
        ? stamped.teams.some((t) => t.id === selectedTeamId)
        : false;
      const vertStillExists = selectedVerticalId
        ? stamped.verticals.some((v) => v.id === selectedVerticalId)
        : false;
      const appStillExists = selectedAppId
        ? (stamped.applications || []).some((a) => a.id === selectedAppId)
        : false;

      const wasPermissionNeeded = get().syncStatus === 'permission-needed';
      set({
        topology: stamped,
        markdownText: nextMarkdown,
        past: nextPast,
        future: nextFuture,
        selectedTeamId: teamStillExists ? selectedTeamId : null,
        selectedVerticalId: vertStillExists ? selectedVerticalId : null,
        selectedAppId: appStillExists ? selectedAppId : null,
        syncStatus: 'saving',
        syncError: null,
      });

      saveTopologyCacheSync(stamped);
      idbSet(IDB_TOPOLOGY_KEY, stamped).catch(() => {});
      scheduleDiskAutosave(wasPermissionNeeded);
    },

    redo: () => {
      const {
        past,
        future,
        topology,
        selectedTeamId,
        selectedVerticalId,
        selectedAppId,
      } = get();
      if (future.length === 0) return;

      const nextTopology = future[0];
      const nextFuture = future.slice(1);
      const nextPast = [...past, cloneTopology(topology)].slice(
        -MAX_UNDO_HISTORY
      );

      lastCoalesceKey = null;
      lastCoalesceTime = 0;

      const stamped: ChapterTopology = reconcileTopologyApplications({
        ...nextTopology,
        catalog: nextTopology.catalog ?? DEFAULT_CATALOG,
        meta: {
          ...nextTopology.meta,
          lastUpdated: new Date().toISOString(),
        },
      });

      const nextMarkdown = serializeTopologyToMarkdown(stamped);
      const teamStillExists = selectedTeamId
        ? stamped.teams.some((t) => t.id === selectedTeamId)
        : false;
      const vertStillExists = selectedVerticalId
        ? stamped.verticals.some((v) => v.id === selectedVerticalId)
        : false;
      const appStillExists = selectedAppId
        ? (stamped.applications || []).some((a) => a.id === selectedAppId)
        : false;

      const wasPermissionNeeded = get().syncStatus === 'permission-needed';
      set({
        topology: stamped,
        markdownText: nextMarkdown,
        past: nextPast,
        future: nextFuture,
        selectedTeamId: teamStillExists ? selectedTeamId : null,
        selectedVerticalId: vertStillExists ? selectedVerticalId : null,
        selectedAppId: appStillExists ? selectedAppId : null,
        syncStatus: 'saving',
        syncError: null,
      });

      saveTopologyCacheSync(stamped);
      idbSet(IDB_TOPOLOGY_KEY, stamped).catch(() => {});
      scheduleDiskAutosave(wasPermissionNeeded);
    },

    theme: initialUI.theme,
    viewMode: initialUI.viewMode,
    spotlightFilter: initialUI.spotlightFilter,
    searchQuery: initialUI.searchQuery,
    hoveredMemberName: null,
    showAllSharedConnectors: initialUI.showAllSharedConnectors,
    hudFilterTab: initialUI.hudFilterTab,
    selectedTeamId: initialUI.selectedTeamId,
    selectedVerticalId: initialUI.selectedVerticalId,
    selectedAppId: initialUI.selectedAppId,
    isMarkdownDrawerOpen: initialUI.isMarkdownDrawerOpen,
    excelSheetTab: initialUI.excelSheetTab,
    isAssignModalOpen: false,
    isCatalogModalOpen: initialUI.isCatalogModalOpen,
    catalogActiveTab: initialUI.catalogActiveTab,
    teamsViewport: initialUI.teamsViewport,
    applicationsViewport: initialUI.applicationsViewport,
    plannerState: initialUI.plannerState,
    confirmDialog: null,

    fileFormat: initialUI.fileFormat,
    isFileLinked: initialUI.isFileLinked,
    fileHandle: null,
    markdownFileHandle: null,
    excelFileHandle: null,
    fileName: initialUI.fileName,
    syncStatus: initialUI.isFileLinked ? 'saved' : 'local-ready',
    lastSavedAt:
      initialTopology.meta?.lastUpdated || new Date().toISOString(),
    syncError: null,
    lastKnownFileModified: null,

    hydrateFromStorage: async () => {
      try {
        const hasLocalStorageUI =
          typeof window !== 'undefined' &&
          Boolean(window.localStorage.getItem(LS_UI_STATE_KEY));

        if (!hasLocalStorageUI) {
          const savedTheme = await idbGet<'dark' | 'light'>(IDB_THEME_KEY);
          if (savedTheme === 'light' || savedTheme === 'dark') {
            set({ theme: savedTheme });
            document.documentElement.classList.toggle(
              'dark',
              savedTheme === 'dark'
            );
          }
        }

        const [savedFormat, savedIsLinked, savedLinkedFileName] =
          await Promise.all([
            idbGet<UnderlyingFileFormat>(IDB_FORMAT_KEY),
            idbGet<boolean>(IDB_IS_LINKED_KEY),
            idbGet<string>(IDB_LINKED_FILENAME_KEY),
          ]);

        if (savedFormat === 'markdown' || savedFormat === 'excel') {
          const normalizedSavedName =
            !savedIsLinked &&
            (savedLinkedFileName === 'chapter-topology.md' ||
              savedLinkedFileName === 'chapter-topology.xlsx')
              ? undefined
              : savedLinkedFileName;
          set({
            fileFormat: savedFormat,
            fileName:
              normalizedSavedName ||
              (savedFormat === 'excel'
                ? 'practice-topology.xlsx'
                : 'practice-topology.md'),
            isFileLinked: Boolean(savedIsLinked),
            syncStatus: savedIsLinked ? 'saved' : 'local-ready',
          });
        }

        const savedTopology = await idbGet<ChapterTopology>(IDB_TOPOLOGY_KEY);
        if (
          savedTopology &&
          Array.isArray(savedTopology.verticals) &&
          Array.isArray(savedTopology.teams)
        ) {
          const withCatalog: ChapterTopology = reconcileTopologyApplications({
            ...savedTopology,
            title:
              !savedTopology.title || savedTopology.title === 'Chapter Topology'
                ? 'Practice Topology'
                : savedTopology.title,
            catalog: Array.isArray(savedTopology.catalog)
              ? savedTopology.catalog
              : DEFAULT_CATALOG,
          });
          const md = serializeTopologyToMarkdown(withCatalog);
          const { selectedTeamId, selectedVerticalId, selectedAppId } = get();
          const validTeamId =
            selectedTeamId &&
            withCatalog.teams.some((t) => t.id === selectedTeamId)
              ? selectedTeamId
              : null;
          const validVerticalId =
            selectedVerticalId &&
            withCatalog.verticals.some((v) => v.id === selectedVerticalId)
              ? selectedVerticalId
              : null;
          const validAppId =
            selectedAppId &&
            (withCatalog.applications ?? []).some((a) => a.id === selectedAppId)
              ? selectedAppId
              : null;

          saveTopologyCacheSync(withCatalog);
          set({
            topology: withCatalog,
            markdownText: md,
            selectedTeamId: validTeamId,
            selectedVerticalId: validVerticalId,
            selectedAppId: validAppId,
            lastSavedAt:
              withCatalog.meta?.lastUpdated || new Date().toISOString(),
          });
        }

        const [storedHandle, storedMdHandle, storedXlsxHandle] =
          await Promise.all([
            idbGet<FileSystemFileHandle>(IDB_FILE_HANDLE_KEY),
            idbGet<FileSystemFileHandle>(IDB_MD_HANDLE_KEY),
            idbGet<FileSystemFileHandle>(IDB_XLSX_HANDLE_KEY),
          ]);

        if (storedMdHandle) {
          set({ markdownFileHandle: storedMdHandle });
        }
        if (storedXlsxHandle) {
          set({ excelFileHandle: storedXlsxHandle });
        }

        if (storedHandle) {
          const perm = storedHandle.queryPermission
            ? await storedHandle.queryPermission({ mode: 'readwrite' })
            : 'prompt';
          const handleIsExcel = isExcelFileName(storedHandle.name || '');
          set({
            isFileLinked: true,
            fileHandle: storedHandle,
            markdownFileHandle: handleIsExcel
              ? storedMdHandle || null
              : storedHandle,
            excelFileHandle: handleIsExcel
              ? storedHandle
              : storedXlsxHandle || null,
            fileFormat: handleIsExcel ? 'excel' : 'markdown',
            fileName:
              storedHandle.name ||
              (handleIsExcel
                ? 'chapter-topology.xlsx'
                : 'chapter-topology.md'),
            syncStatus: perm === 'granted' ? 'saved' : 'permission-needed',
          });
        }
      } catch (err) {
        console.warn('Failed to hydrate from IndexedDB:', err);
      }
    },

    setTheme: (theme) => {
      set({ theme });
      document.documentElement.classList.toggle('dark', theme === 'dark');
      idbSet(IDB_THEME_KEY, theme).catch(() => {});
    },

    toggleTheme: () => {
      const next = get().theme === 'dark' ? 'light' : 'dark';
      get().setTheme(next);
    },

    setViewMode: (mode) => {
      set({
        viewMode: mode,
        selectedTeamId: mode === 'teams' ? get().selectedTeamId : null,
        selectedVerticalId: mode === 'teams' ? get().selectedVerticalId : null,
        selectedAppId: mode === 'applications' ? get().selectedAppId : null,
      });
    },

    setFileFormat: (format) => {
      const { markdownFileHandle, excelFileHandle, fileHandle, fileName } =
        get();
      const wasPermissionNeeded = get().syncStatus === 'permission-needed';
      const targetHandle =
        format === 'excel' ? excelFileHandle : markdownFileHandle;

      if (targetHandle) {
        idbSet(IDB_FILE_HANDLE_KEY, targetHandle).catch(() => {});
        idbSet(IDB_FORMAT_KEY, format).catch(() => {});
        set({
          fileFormat: format,
          fileHandle: targetHandle,
          fileName: targetHandle.name,
          syncStatus: 'saving',
        });
        scheduleDiskAutosave(wasPermissionNeeded);
        return;
      }

      const currentName = fileName || 'chapter-topology.md';
      const baseName = currentName.replace(
        /\.(md|markdown|txt|xlsx|xls)$/i,
        ''
      );
      const nextName =
        format === 'excel' ? `${baseName}.xlsx` : `${baseName}.md`;

      set({
        fileFormat: format,
        fileName: fileHandle ? fileHandle.name : nextName,
      });
      idbSet(IDB_FORMAT_KEY, format).catch(() => {});

      if (fileHandle) {
        scheduleDiskAutosave(wasPermissionNeeded);
      }
    },

    requestConfirmation: (payload) => set({ confirmDialog: payload }),
    closeConfirmation: () => set({ confirmDialog: null }),

    setSpotlightFilter: (filter) => {
      const current = get().spotlightFilter;
      if (
        current.type === filter.type &&
        ('value' in current ? current.value : '') ===
          ('value' in filter ? filter.value : '')
      ) {
        set({ spotlightFilter: { type: 'none' } });
      } else {
        set({ spotlightFilter: filter });
      }
    },

    setSearchQuery: (query) => set({ searchQuery: query }),
    setHoveredMemberName: (name) => set({ hoveredMemberName: name }),
    setShowAllSharedConnectors: (show) =>
      set({ showAllSharedConnectors: show }),
    setHudFilterTab: (tab) => set({ hudFilterTab: tab }),

    selectTeam: (teamId) =>
      set({
        selectedTeamId: teamId,
        selectedVerticalId: teamId ? null : get().selectedVerticalId,
        selectedAppId: teamId ? null : get().selectedAppId,
      }),

    selectVertical: (verticalId) =>
      set({
        selectedVerticalId: verticalId,
        selectedTeamId: verticalId ? null : get().selectedTeamId,
        selectedAppId: verticalId ? null : get().selectedAppId,
      }),

    selectApp: (appId) =>
      set({
        selectedAppId: appId,
        selectedTeamId: appId ? null : get().selectedTeamId,
        selectedVerticalId: appId ? null : get().selectedVerticalId,
      }),

    setMarkdownDrawerOpen: (open) => set({ isMarkdownDrawerOpen: open }),
    setExcelSheetTab: (tab) => set({ excelSheetTab: tab }),
    setAssignModalOpen: (open) => set({ isAssignModalOpen: open }),
    setCatalogModalOpen: (open) => set({ isCatalogModalOpen: open }),
    setCatalogActiveTab: (tab) => set({ catalogActiveTab: tab }),

    setCanvasViewport: (mode, viewport) => {
      if (mode === 'applications') {
        set({ applicationsViewport: viewport });
      } else {
        set({ teamsViewport: viewport });
      }
    },

    updatePlannerState: (updates) => {
      set({
        plannerState: {
          ...get().plannerState,
          ...updates,
        },
      });
    },

    togglePlannerHorizonCollapse: (horizon) => {
      const currentPlanner = get().plannerState;
      set({
        plannerState: {
          ...currentPlanner,
          collapsedHorizons: {
            ...currentPlanner.collapsedHorizons,
            [horizon]: !currentPlanner.collapsedHorizons[horizon],
          },
        },
      });
    },

    updateFromMarkdownEditor: (rawMarkdown) => {
      const { topology, warnings } = parseTopologyMarkdown(rawMarkdown);
      set({ parseWarnings: warnings });
      commitTopology(topology, {
        skipMarkdownRegen: true,
        rawMarkdownOverride: rawMarkdown,
        coalesceKey: 'markdown-editor',
      });
    },

    moveVertical: (verticalId, newX, newY) => {
      const current = get().topology;
      const targetVert = current.verticals.find((v) => v.id === verticalId);
      if (!targetVert) return;

      const currentBounds = computeVerticalBounds(targetVert, current.teams);
      const dx = Math.round(newX - currentBounds.x);
      const dy = Math.round(newY - currentBounds.y);
      if (dx === 0 && dy === 0) return;

      const nextVerticals = current.verticals.map((v) =>
        v.id === verticalId
          ? { ...v, x: Math.round(v.x + dx), y: Math.round(v.y + dy) }
          : v
      );

      const nextTeams = current.teams.map((t) =>
        t.verticalId === verticalId
          ? { ...t, x: Math.round(t.x + dx), y: Math.round(t.y + dy) }
          : t
      );

      commitTopology(
        {
          ...current,
          verticals: nextVerticals,
          teams: nextTeams,
        },
        { coalesceKey: `move-vertical-${verticalId}` }
      );
    },

    moveTeam: (teamId, newX, newY) => {
      const current = get().topology;
      const targetTeam = current.teams.find((t) => t.id === teamId);
      if (!targetTeam) return;

      const roundedX = Math.round(newX);
      const roundedY = Math.round(newY);
      if (targetTeam.x === roundedX && targetTeam.y === roundedY) return;

      const cardCenterX = roundedX + TEAM_CARD_WIDTH / 2;
      const cardCenterY = roundedY + 120;
      let nextVerticalId = targetTeam.verticalId;

      for (const vert of current.verticals) {
        const b = computeVerticalBounds(vert, current.teams);
        if (
          cardCenterX >= b.x &&
          cardCenterX <= b.x + b.width &&
          cardCenterY >= b.y &&
          cardCenterY <= b.y + b.height
        ) {
          nextVerticalId = vert.id;
          break;
        }
      }

      const nextTeams = current.teams.map((t) =>
        t.id === teamId
          ? {
              ...t,
              x: roundedX,
              y: roundedY,
              verticalId: nextVerticalId,
            }
          : t
      );

      commitTopology(
        {
          ...current,
          teams: nextTeams,
        },
        { coalesceKey: `move-team-${teamId}` }
      );
    },

    movePegaApplication: (appId, newX, newY) => {
      const current = get().topology;
      const apps = current.applications ?? [];
      const target = apps.find((a) => a.id === appId);
      if (!target) return;

      const roundedX = Math.round(newX);
      const roundedY = Math.round(newY);
      if (target.x === roundedX && target.y === roundedY) return;

      commitTopology(
        {
          ...current,
          applications: apps.map((a) =>
            a.id === appId ? { ...a, x: roundedX, y: roundedY } : a
          ),
        },
        { coalesceKey: `move-app-${appId}` }
      );
    },

    runAutoLayout: () => {
      const current = get().topology;
      const mode = get().viewMode;
      if (mode === 'applications') {
        const laidOut = autoLayoutApplications(current);
        commitTopology(laidOut);
      } else {
        const laidOut = autoLayoutTopology(current);
        commitTopology(laidOut);
      }
    },

    resetToDemoData: () => {
      commitTopology(INITIAL_TOPOLOGY);
      set({
        spotlightFilter: { type: 'none' },
        searchQuery: '',
        selectedTeamId: null,
        selectedVerticalId: null,
        selectedAppId: null,
      });
    },

    addPegaApplication: (payload) => {
      const current = get().topology;
      const apps = current.applications ?? [];
      const idx = apps.length;
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const baseName =
        payload?.name?.trim() || `Application ${apps.length + 1}`;
      const id = `app-${baseName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-3)}`;

      const newApp: PegaApplicationBlueprint = {
        id,
        name: baseName,
        version: payload?.version ?? '',
        layer: payload?.layer ?? '',
        architecture: payload?.architecture ?? '',
        description: payload?.description,
        wikiUrl: payload?.wikiUrl,
        builtOnApplications: payload?.builtOnApplications || [],
        rulesets: payload?.rulesets || [],
        caseTypes: payload?.caseTypes || [],
        dataTypes: payload?.dataTypes || [],
        integrations: payload?.integrations || [],
        x: 80 + col * 480,
        y: 120 + row * 470,
      };

      commitTopology({
        ...current,
        applications: [...apps, newApp],
      });

      set({
        selectedAppId: id,
        selectedTeamId: null,
        selectedVerticalId: null,
      });
      return id;
    },

    updatePegaApplication: (appId, updates) => {
      const current = get().topology;
      const apps = current.applications ?? [];
      const target = apps.find((a) => a.id === appId);
      if (!target) return;

      const oldName = target.name.trim();
      const newName =
        updates.name !== undefined ? updates.name.trim() : oldName;
      const nameChanged =
        newName.length > 0 && newName.toLowerCase() !== oldName.toLowerCase();

      const nextApps = apps.map((a) => {
        if (a.id === appId) {
          return {
            ...a,
            ...updates,
            name: newName || a.name,
          };
        }
        if (nameChanged) {
          return {
            ...a,
            builtOnApplications: (a.builtOnApplications || []).map((bo) =>
              bo.trim().toLowerCase() === oldName.toLowerCase() ? newName : bo
            ),
          };
        }
        return a;
      });

      let nextTeams = current.teams;
      let nextCatalog = current.catalog ?? DEFAULT_CATALOG;
      let nextTasks = current.tasks ?? [];
      let nextRoadmap = current.roadmap ?? [];

      if (updates.name !== undefined && newName && newName !== oldName) {
        nextTeams = current.teams.map((t) =>
          t.pegaApplication.trim().toLowerCase() === oldName.toLowerCase()
            ? { ...t, pegaApplication: newName }
            : t
        );
        nextCatalog = nextCatalog.map((c) =>
          c.kind === 'application' &&
          c.name.trim().toLowerCase() === oldName.toLowerCase()
            ? { ...c, name: newName }
            : c
        );
        nextTasks = nextTasks.map((t) =>
          (t.linkedApplication || '').trim().toLowerCase() ===
          oldName.toLowerCase()
            ? { ...t, linkedApplication: newName }
            : t
        );
        nextRoadmap = nextRoadmap.map((r) =>
          (r.linkedApplication || '').trim().toLowerCase() ===
          oldName.toLowerCase()
            ? { ...r, linkedApplication: newName }
            : r
        );
      }

      commitTopology(
        {
          ...current,
          applications: nextApps,
          teams: nextTeams,
          catalog: nextCatalog,
          tasks: nextTasks,
          roadmap: nextRoadmap,
        },
        { coalesceKey: `update-pega-app-${appId}` }
      );
    },

    duplicatePegaApplication: (appId) => {
      const current = get().topology;
      const apps = current.applications ?? [];
      const source = apps.find((a) => a.id === appId);
      if (!source) return null;

      const newId = `${source.id}-copy-${Date.now().toString().slice(-3)}`;
      const duplicated: PegaApplicationBlueprint = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        name: `${source.name} (Copy)`,
        x: source.x + 48,
        y: source.y + 48,
      };

      commitTopology({
        ...current,
        applications: [...apps, duplicated],
      });

      set({
        selectedAppId: newId,
        selectedTeamId: null,
        selectedVerticalId: null,
      });
      return newId;
    },

    deletePegaApplication: (appId) => {
      const current = get().topology;
      const apps = current.applications ?? [];
      const target = apps.find((a) => a.id === appId);
      if (!target) return;

      const remainingApps = apps
        .filter((a) => a.id !== appId)
        .map((a) => ({
          ...a,
          builtOnApplications: (a.builtOnApplications || []).filter(
            (bo) => bo.trim().toLowerCase() !== target.name.trim().toLowerCase()
          ),
        }));

      const nextCatalog = (current.catalog ?? DEFAULT_CATALOG).filter(
        (c) =>
          !(
            c.kind === 'application' &&
            c.name.trim().toLowerCase() === target.name.trim().toLowerCase()
          )
      );

      const nextTeams = current.teams.map((t) =>
        t.pegaApplication.trim().toLowerCase() ===
        target.name.trim().toLowerCase()
          ? { ...t, pegaApplication: '' }
          : t
      );

      const nextTasks = (current.tasks ?? []).map((t) =>
        (t.linkedApplication || '').trim().toLowerCase() ===
        target.name.trim().toLowerCase()
          ? { ...t, linkedApplication: undefined }
          : t
      );

      const nextRoadmap = (current.roadmap ?? []).map((r) =>
        (r.linkedApplication || '').trim().toLowerCase() ===
        target.name.trim().toLowerCase()
          ? { ...r, linkedApplication: undefined }
          : r
      );

      commitTopology({
        ...current,
        applications: remainingApps,
        catalog: nextCatalog,
        teams: nextTeams,
        tasks: nextTasks,
        roadmap: nextRoadmap,
      });

      if (get().selectedAppId === appId) {
        set({ selectedAppId: null });
      }
    },

    toggleTeamForApplication: (appId, teamId) => {
      const current = get().topology;
      const apps = current.applications ?? [];
      const app = apps.find((a) => a.id === appId);
      if (!app) return;

      const nextTeams = current.teams.map((t) => {
        if (t.id !== teamId) return t;
        const isMapped =
          t.pegaApplication.trim().toLowerCase() ===
          app.name.trim().toLowerCase();
        return {
          ...t,
          pegaApplication: isMapped ? '' : app.name,
        };
      });

      commitTopology({
        ...current,
        teams: nextTeams,
      });
    },

    addCatalogItem: ({ name, kind, description }) => {
      const current = get().topology;
      const catalog = current.catalog ?? DEFAULT_CATALOG;
      const trimmed = name.trim();
      const existing = catalog.find(
        (c) => c.kind === kind && c.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) return existing.id;

      const prefix =
        kind === 'application'
          ? 'app'
          : kind === 'initiative'
          ? 'init'
          : kind === 'company'
          ? 'comp'
          : kind === 'architecture'
          ? 'arch'
          : kind === 'layer'
          ? 'layer'
          : 'role';
      const id = `${prefix}-${trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-3)}`;

      const newItem: CatalogItem = {
        id,
        name: trimmed,
        kind,
        description: description?.trim() || undefined,
      };

      commitTopology({
        ...current,
        catalog: [...catalog, newItem],
      });
      return id;
    },

    updateCatalogItem: (itemId, updates) => {
      const current = get().topology;
      const catalog = current.catalog ?? DEFAULT_CATALOG;
      const target = catalog.find((c) => c.id === itemId);
      if (!target) return;

      const nextCatalog = catalog.map((c) =>
        c.id === itemId ? { ...c, ...updates } : c
      );

      let nextTeams = current.teams;
      let nextApps = current.applications ?? [];
      let nextTasks = current.tasks ?? [];
      let nextRoadmap = current.roadmap ?? [];
      if (updates.name && updates.name.trim() && updates.name !== target.name) {
        const newName = updates.name.trim();
        if (target.kind === 'application') {
          nextApps = nextApps.map((a) => {
            if (a.name.trim().toLowerCase() === target.name.trim().toLowerCase()) {
              return { ...a, name: newName };
            }
            return {
              ...a,
              builtOnApplications: (a.builtOnApplications || []).map((bo) =>
                bo.trim().toLowerCase() === target.name.trim().toLowerCase()
                  ? newName
                  : bo
              ),
            };
          });
          nextTasks = nextTasks.map((t) =>
            (t.linkedApplication || '').trim().toLowerCase() ===
            target.name.trim().toLowerCase()
              ? { ...t, linkedApplication: newName }
              : t
          );
          nextRoadmap = nextRoadmap.map((r) =>
            (r.linkedApplication || '').trim().toLowerCase() ===
            target.name.trim().toLowerCase()
              ? { ...r, linkedApplication: newName }
              : r
          );
        } else if (target.kind === 'architecture') {
          nextApps = nextApps.map((a) =>
            (a.architecture || '').trim().toLowerCase() ===
            target.name.trim().toLowerCase()
              ? { ...a, architecture: newName }
              : a
          );
        } else if (target.kind === 'layer') {
          nextApps = nextApps.map((a) =>
            (a.layer || '').trim().toLowerCase() ===
            target.name.trim().toLowerCase()
              ? { ...a, layer: newName }
              : a
          );
        }

        nextTeams = current.teams.map((t) => {
          let nextTeam = t;
          if (
            target.kind === 'application' &&
            t.pegaApplication === target.name
          ) {
            nextTeam = { ...nextTeam, pegaApplication: newName };
          }
          if (target.kind === 'initiative' && t.initiative === target.name) {
            nextTeam = { ...nextTeam, initiative: newName };
          }
          if (target.kind === 'company') {
            nextTeam = {
              ...nextTeam,
              members: nextTeam.members.map((m) =>
                (m.company || '').toLowerCase() === target.name.toLowerCase()
                  ? { ...m, company: newName }
                  : m
              ),
            };
          }
          if (target.kind === 'role') {
            nextTeam = {
              ...nextTeam,
              members: nextTeam.members.map((m) =>
                m.role.toLowerCase() === target.name.toLowerCase()
                  ? { ...m, role: newName }
                  : m
              ),
            };
          }
          return nextTeam;
        });
      }

      commitTopology(
        {
          ...current,
          catalog: nextCatalog,
          teams: nextTeams,
          applications: nextApps,
          tasks: nextTasks,
          roadmap: nextRoadmap,
        },
        { coalesceKey: `update-catalog-${itemId}` }
      );
    },

    deleteCatalogItem: (itemId) => {
      const current = get().topology;
      const catalog = current.catalog ?? DEFAULT_CATALOG;
      const target = catalog.find((c) => c.id === itemId);
      if (!target) return;

      const nextCatalog = catalog.filter((c) => c.id !== itemId);

      const deletedAppIds = new Set<string>();
      const nextApps =
        target.kind === 'application'
          ? (current.applications ?? [])
              .filter((a) => {
                const match =
                  a.name.trim().toLowerCase() ===
                  target.name.trim().toLowerCase();
                if (match) deletedAppIds.add(a.id);
                return !match;
              })
              .map((a) => ({
                ...a,
                builtOnApplications: (a.builtOnApplications || []).filter(
                  (bo) =>
                    bo.trim().toLowerCase() !==
                    target.name.trim().toLowerCase()
                ),
              }))
          : target.kind === 'architecture'
          ? (current.applications ?? []).map((a) =>
              (a.architecture || '').trim().toLowerCase() ===
              target.name.trim().toLowerCase()
                ? { ...a, architecture: '' }
                : a
            )
          : target.kind === 'layer'
          ? (current.applications ?? []).map((a) =>
              (a.layer || '').trim().toLowerCase() ===
              target.name.trim().toLowerCase()
                ? { ...a, layer: '' }
                : a
            )
          : current.applications ?? [];

      const nextTeams = current.teams.map((t) => {
        if (
          target.kind === 'application' &&
          t.pegaApplication.trim().toLowerCase() ===
            target.name.trim().toLowerCase()
        ) {
          return { ...t, pegaApplication: '' };
        }
        if (
          target.kind === 'initiative' &&
          (t.initiative || '').toLowerCase() === target.name.toLowerCase()
        ) {
          return { ...t, initiative: undefined };
        }
        if (target.kind === 'company') {
          return {
            ...t,
            members: t.members.map((m) =>
              (m.company || '').toLowerCase() === target.name.toLowerCase()
                ? { ...m, company: undefined }
                : m
            ),
          };
        }
        if (target.kind === 'role') {
          return {
            ...t,
            members: t.members.map((m) =>
              m.role.toLowerCase() === target.name.toLowerCase()
                ? { ...m, role: '' }
                : m
            ),
          };
        }
        return t;
      });

      const nextTasks =
        target.kind === 'application'
          ? (current.tasks ?? []).map((t) =>
              (t.linkedApplication || '').trim().toLowerCase() ===
              target.name.trim().toLowerCase()
                ? { ...t, linkedApplication: undefined }
                : t
            )
          : current.tasks;

      const nextRoadmap =
        target.kind === 'application'
          ? (current.roadmap ?? []).map((r) =>
              (r.linkedApplication || '').trim().toLowerCase() ===
              target.name.trim().toLowerCase()
                ? { ...r, linkedApplication: undefined }
                : r
            )
          : current.roadmap;

      commitTopology({
        ...current,
        catalog: nextCatalog,
        teams: nextTeams,
        applications: nextApps,
        tasks: nextTasks,
        roadmap: nextRoadmap,
      });

      if (get().selectedAppId && deletedAppIds.has(get().selectedAppId!)) {
        set({ selectedAppId: null });
      }
    },

    deleteCatalogItemByName: (name, kind) => {
      const current = get().topology;
      const catalog = current.catalog ?? DEFAULT_CATALOG;
      const target = catalog.find(
        (c) => c.kind === kind && c.name.toLowerCase() === name.toLowerCase()
      );
      if (target) {
        get().deleteCatalogItem(target.id);
      } else {
        const nextApps =
          kind === 'application'
            ? (current.applications ?? [])
                .filter(
                  (a) =>
                    a.name.trim().toLowerCase() !== name.trim().toLowerCase()
                )
                .map((a) => ({
                  ...a,
                  builtOnApplications: (a.builtOnApplications || []).filter(
                    (bo) =>
                      bo.trim().toLowerCase() !== name.trim().toLowerCase()
                  ),
                }))
            : kind === 'architecture'
            ? (current.applications ?? []).map((a) =>
                (a.architecture || '').trim().toLowerCase() ===
                name.trim().toLowerCase()
                  ? { ...a, architecture: '' }
                  : a
              )
            : kind === 'layer'
            ? (current.applications ?? []).map((a) =>
                (a.layer || '').trim().toLowerCase() ===
                name.trim().toLowerCase()
                  ? { ...a, layer: '' }
                  : a
              )
            : current.applications ?? [];

        const nextTeams = current.teams.map((t) => {
          if (
            kind === 'application' &&
            t.pegaApplication.trim().toLowerCase() === name.trim().toLowerCase()
          ) {
            return { ...t, pegaApplication: '' };
          }
          if (
            kind === 'initiative' &&
            (t.initiative || '').toLowerCase() === name.toLowerCase()
          ) {
            return { ...t, initiative: undefined };
          }
          if (kind === 'company') {
            return {
              ...t,
              members: t.members.map((m) =>
                (m.company || '').toLowerCase() === name.toLowerCase()
                  ? { ...m, company: undefined }
                  : m
              ),
            };
          }
          if (kind === 'role') {
            return {
              ...t,
              members: t.members.map((m) =>
                m.role.toLowerCase() === name.toLowerCase()
                  ? { ...m, role: '' }
                  : m
              ),
            };
          }
          return t;
        });

        const nextTasks =
          kind === 'application'
            ? (current.tasks ?? []).map((t) =>
                (t.linkedApplication || '').trim().toLowerCase() ===
                name.trim().toLowerCase()
                  ? { ...t, linkedApplication: undefined }
                  : t
              )
            : current.tasks;

        const nextRoadmap =
          kind === 'application'
            ? (current.roadmap ?? []).map((r) =>
                (r.linkedApplication || '').trim().toLowerCase() ===
                name.trim().toLowerCase()
                  ? { ...r, linkedApplication: undefined }
                  : r
              )
            : current.roadmap;

        commitTopology({
          ...current,
          teams: nextTeams,
          applications: nextApps,
          tasks: nextTasks,
          roadmap: nextRoadmap,
        });
      }
    },

    addVertical: (payload) => {
      const current = get().topology;
      const colorCycle: VerticalColor[] = [
        'slate',
        'indigo',
        'emerald',
        'amber',
        'violet',
        'cyan',
      ];
      const nextColor =
        payload?.color ||
        colorCycle[current.verticals.length % colorCycle.length];
      const name =
        payload?.name?.trim() || `Vertical ${current.verticals.length + 1}`;
      const id = `vert-${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-3)}`;

      const maxRight =
        current.verticals.length > 0
          ? Math.max(
              ...current.verticals.map((v) => {
                const b = computeVerticalBounds(v, current.teams);
                return b.x + b.width;
              })
            )
          : 0;

      const newVertical: BusinessVertical = {
        id,
        name,
        color: nextColor,
        x: current.verticals.length === 0 ? 60 : maxRight + 64,
        y: 100,
      };

      commitTopology({
        ...current,
        verticals: [...current.verticals, newVertical],
      });

      set({ selectedVerticalId: id, selectedTeamId: null });
      return id;
    },

    updateVertical: (verticalId, updates) => {
      const current = get().topology;
      const nextVerticals = current.verticals.map((v) =>
        v.id === verticalId ? { ...v, ...updates } : v
      );
      commitTopology(
        {
          ...current,
          verticals: nextVerticals,
        },
        { coalesceKey: `update-vertical-${verticalId}` }
      );
    },

    deleteVertical: (verticalId) => {
      const current = get().topology;
      const remainingVerticals = current.verticals.filter(
        (v) => v.id !== verticalId
      );
      const fallbackVertId = remainingVerticals[0]?.id;

      const nextTeams = fallbackVertId
        ? current.teams.map((t) =>
            t.verticalId === verticalId
              ? { ...t, verticalId: fallbackVertId }
              : t
          )
        : current.teams.filter((t) => t.verticalId !== verticalId);

      commitTopology({
        ...current,
        verticals: remainingVerticals,
        teams: nextTeams,
      });

      if (get().selectedVerticalId === verticalId) {
        set({ selectedVerticalId: null });
      }
    },

    addTeam: (payload) => {
      const current = get().topology;
      let targetVertical =
        current.verticals.find((v) => v.id === payload?.verticalId) ||
        current.verticals[0];

      let nextVerticals = current.verticals;
      if (!targetVertical) {
        targetVertical = {
          id: 'vert-1',
          name: 'Vertical 1',
          color: 'indigo',
          x: 60,
          y: 100,
        };
        nextVerticals = [targetVertical];
      }

      const siblingTeams = current.teams.filter(
        (t) => t.verticalId === targetVertical.id
      );
      const col = siblingTeams.length % 2;
      const row = Math.floor(siblingTeams.length / 2);

      const baseX =
        targetVertical.x +
        VERTICAL_PADDING_X +
        col * (TEAM_CARD_WIDTH + TEAM_GAP_X);
      let baseY = targetVertical.y + VERTICAL_HEADER_HEIGHT;
      if (row > 0) {
        const aboveSiblings = siblingTeams.slice(0, row * 2);
        const maxBottom = Math.max(
          ...aboveSiblings.map((t) => t.y + estimateTeamCardHeight(t))
        );
        baseY = maxBottom + TEAM_GAP_Y;
      }

      const defaultApp = payload?.pegaApplication ?? '';

      const name =
        payload?.name?.trim() || `New Squad ${current.teams.length + 1}`;
      const id = `team-${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-3)}`;

      const newTeam: TeamSquad = {
        id,
        name,
        verticalId: targetVertical.id,
        pegaApplication: defaultApp,
        initiative: payload?.initiative,
        wikiUrl: payload?.wikiUrl,
        x: Math.round(baseX),
        y: Math.round(baseY),
        members: [],
      };

      commitTopology({
        ...current,
        verticals: nextVerticals,
        teams: [...current.teams, newTeam],
      });

      set({ selectedTeamId: id, selectedVerticalId: null });
      return id;
    },

    updateTeam: (teamId, updates) => {
      const current = get().topology;
      const target = current.teams.find((t) => t.id === teamId);
      if (!target) return;

      let nextX = updates.x ?? target.x;
      let nextY = updates.y ?? target.y;

      if (updates.verticalId && updates.verticalId !== target.verticalId) {
        const destVert = current.verticals.find(
          (v) => v.id === updates.verticalId
        );
        if (destVert) {
          const destTeams = current.teams.filter(
            (t) => t.verticalId === destVert.id && t.id !== teamId
          );
          const col = destTeams.length % 2;
          const row = Math.floor(destTeams.length / 2);
          nextX =
            destVert.x +
            VERTICAL_PADDING_X +
            col * (TEAM_CARD_WIDTH + TEAM_GAP_X);
          nextY = destVert.y + VERTICAL_HEADER_HEIGHT + row * 380;
        }
      }

      const oldName = target.name.trim();
      const newName = updates.name !== undefined ? updates.name.trim() : oldName;
      const nameChanged =
        newName.length > 0 && newName.toLowerCase() !== oldName.toLowerCase();

      const nextTeams = current.teams.map((t) =>
        t.id === teamId ? { ...t, ...updates, x: nextX, y: nextY } : t
      );

      const nextTasks = nameChanged
        ? (current.tasks ?? []).map((t) =>
            (t.linkedTeam || '').trim().toLowerCase() === oldName.toLowerCase()
              ? { ...t, linkedTeam: newName }
              : t
          )
        : current.tasks;

      const nextRoadmap = nameChanged
        ? (current.roadmap ?? []).map((r) =>
            (r.linkedTeam || '').trim().toLowerCase() === oldName.toLowerCase()
              ? { ...r, linkedTeam: newName }
              : r
          )
        : current.roadmap;

      commitTopology(
        {
          ...current,
          teams: nextTeams,
          tasks: nextTasks,
          roadmap: nextRoadmap,
        },
        { coalesceKey: `update-team-${teamId}` }
      );
    },

    duplicateTeam: (teamId) => {
      const current = get().topology;
      const source = current.teams.find((t) => t.id === teamId);
      if (!source) return null;

      const newId = `${source.id}-copy-${Date.now().toString().slice(-3)}`;
      const duplicated: TeamSquad = {
        ...source,
        id: newId,
        name: `${source.name} (Copy)`,
        x: source.x + 40,
        y: source.y + 40,
        members: source.members.map((m, idx) => ({
          ...m,
          id: `mem-${newId}-${idx}`,
        })),
      };

      commitTopology({
        ...current,
        teams: [...current.teams, duplicated],
      });

      set({ selectedTeamId: newId, selectedVerticalId: null });
      return newId;
    },

    deleteTeam: (teamId) => {
      const current = get().topology;
      const target = current.teams.find((t) => t.id === teamId);
      const nextTasks = target
        ? (current.tasks ?? []).map((t) =>
            (t.linkedTeam || '').trim().toLowerCase() ===
            target.name.trim().toLowerCase()
              ? { ...t, linkedTeam: undefined }
              : t
          )
        : current.tasks;
      const nextRoadmap = target
        ? (current.roadmap ?? []).map((r) =>
            (r.linkedTeam || '').trim().toLowerCase() ===
            target.name.trim().toLowerCase()
              ? { ...r, linkedTeam: undefined }
              : r
          )
        : current.roadmap;

      commitTopology({
        ...current,
        teams: current.teams.filter((t) => t.id !== teamId),
        tasks: nextTasks,
        roadmap: nextRoadmap,
      });
      if (get().selectedTeamId === teamId) {
        set({ selectedTeamId: null });
      }
    },

    addMemberToTeam: (teamId, member) => {
      const current = get().topology;
      const empType: EmploymentType =
        member.employmentType === 'outsourcing' ? 'outsourcing' : 'internal';
      const compName = member.company?.trim() || '';
      const roleName = member.role?.trim() || '';

      const catalog = current.catalog ?? DEFAULT_CATALOG;
      let nextCatalog = [...catalog];

      if (
        compName &&
        !nextCatalog.some(
          (c) =>
            c.kind === 'company' &&
            c.name.toLowerCase() === compName.toLowerCase()
        )
      ) {
        nextCatalog.push({
          id: `comp-${compName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-3)}`,
          name: compName,
          kind: 'company',
        });
      }

      if (
        roleName &&
        !nextCatalog.some(
          (c) =>
            c.kind === 'role' &&
            c.name.toLowerCase() === roleName.toLowerCase()
        )
      ) {
        nextCatalog.push({
          id: `role-${roleName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-3)}`,
          name: roleName,
          kind: 'role',
        });
      }

      const nextTeams = current.teams.map((t) => {
        if (t.id !== teamId) return t;
        return {
          ...t,
          members: [
            ...t.members,
            {
              id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: member.name.trim() || 'New Chapter Member',
              role: roleName,
              allocation: member.allocation,
              employmentType: empType,
              company: compName || undefined,
            },
          ],
        };
      });
      commitTopology({
        ...current,
        catalog: nextCatalog,
        teams: nextTeams,
      });
    },

    updateTeamMember: (teamId, memberId, updates) => {
      const current = get().topology;
      const targetTeam = current.teams.find((t) => t.id === teamId);
      const targetMember = targetTeam?.members.find((m) => m.id === memberId);
      const normTargetName = targetMember?.name.trim().toLowerCase() || '';

      const nextTeams = current.teams.map((t) => {
        if (t.id === teamId) {
          return {
            ...t,
            members: t.members.map((m) =>
              m.id === memberId ? { ...m, ...updates } : m
            ),
          };
        }

        if (
          normTargetName &&
          (updates.employmentType !== undefined || updates.company !== undefined)
        ) {
          return {
            ...t,
            members: t.members.map((m) => {
              if (m.name.trim().toLowerCase() !== normTargetName) return m;
              return {
                ...m,
                ...(updates.employmentType !== undefined
                  ? { employmentType: updates.employmentType }
                  : {}),
                ...(updates.company !== undefined
                  ? { company: updates.company }
                  : {}),
              };
            }),
          };
        }

        return t;
      });
      commitTopology(
        {
          ...current,
          teams: nextTeams,
        },
        { coalesceKey: `update-member-${teamId}-${memberId}` }
      );
    },

    removeMemberFromTeam: (teamId, memberId) => {
      const current = get().topology;
      const nextTeams = current.teams.map((t) => {
        if (t.id !== teamId) return t;
        return {
          ...t,
          members: t.members.filter((m) => m.id !== memberId),
        };
      });
      commitTopology({
        ...current,
        teams: nextTeams,
      });
    },

    assignMemberAcrossTeams: (name, role, assignments, options) => {
      const trimmedName = name.trim();
      if (!trimmedName || assignments.length === 0) return;

      const current = get().topology;
      const assignmentMap = new Map(
        assignments.map((a) => [a.teamId, a.allocation])
      );

      const empType: EmploymentType =
        options?.employmentType === 'outsourcing' ? 'outsourcing' : 'internal';
      const compName = options?.company?.trim() || '';
      const roleName = role.trim();

      const catalog = current.catalog ?? DEFAULT_CATALOG;
      let nextCatalog = [...catalog];

      if (
        compName &&
        !nextCatalog.some(
          (c) =>
            c.kind === 'company' &&
            c.name.toLowerCase() === compName.toLowerCase()
        )
      ) {
        nextCatalog.push({
          id: `comp-${compName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-3)}`,
          name: compName,
          kind: 'company',
        });
      }

      if (
        roleName &&
        !nextCatalog.some(
          (c) =>
            c.kind === 'role' &&
            c.name.toLowerCase() === roleName.toLowerCase()
        )
      ) {
        nextCatalog.push({
          id: `role-${roleName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-3)}`,
          name: roleName,
          kind: 'role',
        });
      }

      const nextTeams = current.teams.map((team) => {
        const targetAlloc = assignmentMap.get(team.id);
        if (targetAlloc === undefined) return team;

        const existingIndex = team.members.findIndex(
          (m) => m.name.trim().toLowerCase() === trimmedName.toLowerCase()
        );

        if (existingIndex >= 0) {
          const updatedMembers = [...team.members];
          updatedMembers[existingIndex] = {
            ...updatedMembers[existingIndex],
            name: trimmedName,
            role: roleName,
            allocation: targetAlloc,
            employmentType: empType,
            company: compName || undefined,
          };
          return { ...team, members: updatedMembers };
        } else {
          return {
            ...team,
            members: [
              ...team.members,
              {
                id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: trimmedName,
                role: memberRoleOrFallback(roleName),
                allocation: targetAlloc,
                employmentType: empType,
                company: compName || undefined,
              },
            ],
          };
        }
      });

      commitTopology({
        ...current,
        catalog: nextCatalog,
        teams: nextTeams,
      });
    },

    addPracticeTask: (payload) => {
      const current = get().topology;
      const tasks = current.tasks ?? [];
      const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newTask: PracticeTask = {
        id,
        title: payload.title.trim() || 'Untitled Action Item',
        kind: payload.kind || 'todo',
        status: payload.status || 'open',
        priority: payload.priority || 'medium',
        dueDate: payload.dueDate?.trim() || undefined,
        followUpWith: payload.followUpWith?.trim() || undefined,
        linkedTeam: payload.linkedTeam?.trim() || undefined,
        linkedApplication: payload.linkedApplication?.trim() || undefined,
        linkedRoadmapId: payload.linkedRoadmapId || undefined,
        notes: payload.notes?.trim() || undefined,
      };
      commitTopology({
        ...current,
        tasks: [newTask, ...tasks],
      });
      return id;
    },

    updatePracticeTask: (taskId, updates) => {
      const current = get().topology;
      const tasks = current.tasks ?? [];
      const nextTasks = tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      );
      commitTopology(
        {
          ...current,
          tasks: nextTasks,
        },
        { coalesceKey: `update-task-${taskId}` }
      );
    },

    togglePracticeTaskStatus: (taskId) => {
      const current = get().topology;
      const tasks = current.tasks ?? [];
      const nextTasks = tasks.map((t) => {
        if (t.id !== taskId) return t;
        const nextStatus: PracticeTask['status'] =
          t.status === 'done' ? 'open' : 'done';
        return { ...t, status: nextStatus };
      });
      commitTopology({
        ...current,
        tasks: nextTasks,
      });
    },

    deletePracticeTask: (taskId) => {
      const current = get().topology;
      const tasks = current.tasks ?? [];
      commitTopology({
        ...current,
        tasks: tasks.filter((t) => t.id !== taskId),
      });
    },

    addRoadmapItem: (payload) => {
      const current = get().topology;
      const roadmap = current.roadmap ?? [];
      const id = `rm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newItem: PracticeRoadmapItem = {
        id,
        title: payload.title.trim() || 'Untitled Initiative',
        horizon: payload.horizon || 'exploring',
        status: payload.status || 'idea',
        priority: payload.priority || 'medium',
        progress:
          typeof payload.progress === 'number'
            ? Math.max(0, Math.min(100, Math.round(payload.progress)))
            : payload.status === 'completed'
              ? 100
              : payload.status === 'in-progress'
                ? 35
                : 0,
        category: payload.category?.trim() || undefined,
        startDate: payload.startDate?.trim() || undefined,
        targetDate: payload.targetDate?.trim() || undefined,
        outcome: payload.outcome?.trim() || undefined,
        owner: payload.owner?.trim() || undefined,
        linkedTeam: payload.linkedTeam?.trim() || undefined,
        linkedApplication: payload.linkedApplication?.trim() || undefined,
        wikiUrl: payload.wikiUrl?.trim() || undefined,
        notes: payload.notes?.trim() || undefined,
      };
      commitTopology({
        ...current,
        roadmap: [...roadmap, newItem],
      });
      return id;
    },

    updateRoadmapItem: (itemId, updates) => {
      const current = get().topology;
      const roadmap = current.roadmap ?? [];
      const nextRoadmap = roadmap.map((r) => {
        if (r.id !== itemId) return r;
        const merged = { ...r, ...updates };
        if (updates.status === 'completed' && updates.progress === undefined) {
          merged.progress = 100;
        }
        return merged;
      });
      commitTopology(
        {
          ...current,
          roadmap: nextRoadmap,
        },
        { coalesceKey: `update-roadmap-${itemId}` }
      );
    },

    deleteRoadmapItem: (itemId) => {
      const current = get().topology;
      const roadmap = current.roadmap ?? [];
      const nextTasks = (current.tasks ?? []).map((t) =>
        t.linkedRoadmapId === itemId ? { ...t, linkedRoadmapId: undefined } : t
      );
      commitTopology({
        ...current,
        roadmap: roadmap.filter((r) => r.id !== itemId),
        tasks: nextTasks,
      });
    },

    promoteRoadmapToInitiative: (itemId) => {
      const current = get().topology;
      const item = (current.roadmap ?? []).find((r) => r.id === itemId);
      if (!item) return;
      get().addCatalogItem({
        name: item.title,
        kind: 'initiative',
        description: item.outcome || item.notes,
      });
    },

    createTaskFromRoadmapItem: (itemId, kind = 'todo') => {
      const current = get().topology;
      const item = (current.roadmap ?? []).find((r) => r.id === itemId);
      if (!item) return null;
      const now = new Date();
      const localToday = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      return get().addPracticeTask({
        title:
          kind === 'followup'
            ? `Follow up on: ${item.title}`
            : `Action for: ${item.title}`,
        kind,
        status: 'open',
        priority: item.priority,
        dueDate:
          item.targetDate && /^\d{4}-\d{2}-\d{2}$/.test(item.targetDate)
            ? item.targetDate
            : localToday,
        followUpWith: item.owner,
        linkedTeam: item.linkedTeam,
        linkedApplication: item.linkedApplication,
        linkedRoadmapId: item.id,
        notes: item.outcome || item.notes,
      });
    },

    openLocalMarkdownFile: async (formatOverride) => {
      if (typeof window.showOpenFilePicker !== 'function') {
        throw new Error('FILE_SYSTEM_API_UNSUPPORTED');
      }

      const preferredFormat = formatOverride || get().fileFormat;
      const allSupportedTypeOption = {
        description: 'PracticeMap Files (.md, .xlsx)',
        accept: {
          'text/markdown': ['.md'],
          'text/plain': ['.txt'],
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
            '.xlsx',
          ],
          'application/vnd.ms-excel': ['.xls'],
        },
      };
      const excelTypeOption = {
        description: 'Excel Workbook (.xlsx, .xls)',
        accept: {
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
            '.xlsx',
          ],
          'application/vnd.ms-excel': ['.xls'],
        },
      };
      const mdTypeOption = {
        description: 'Markdown Topology (.md, .txt)',
        accept: {
          'text/markdown': ['.md'],
          'text/plain': ['.txt'],
        },
      };

      let handle: FileSystemFileHandle;
      try {
        const [picked] = await window.showOpenFilePicker({
          types:
            formatOverride === 'excel'
              ? [excelTypeOption, allSupportedTypeOption, mdTypeOption]
              : formatOverride === 'markdown'
              ? [mdTypeOption, allSupportedTypeOption, excelTypeOption]
              : preferredFormat === 'excel'
              ? [allSupportedTypeOption, excelTypeOption, mdTypeOption]
              : [allSupportedTypeOption, mdTypeOption, excelTypeOption],
          multiple: false,
        });
        handle = picked;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          throw err;
        }
        const [pickedFallback] = await window.showOpenFilePicker({
          multiple: false,
        });
        handle = pickedFallback;
      }

      // Request readwrite permission immediately while user activation is active
      try {
        if (handle.requestPermission) {
          pendingPermissionPromise = handle.requestPermission({
            mode: 'readwrite',
          });
          await pendingPermissionPromise;
        }
      } catch {
        // Will be handled if write needs permission
      } finally {
        pendingPermissionPromise = null;
      }

      const file = await handle.getFile();
      const isExcel = isExcelFileName(file.name);
      const nextFormat: UnderlyingFileFormat = isExcel ? 'excel' : 'markdown';

      let parsedTopology: ChapterTopology;
      let warnings: string[];

      if (isExcel) {
        const buf = await file.arrayBuffer();
        const res = parseTopologyFromExcelBuffer(buf);
        parsedTopology = res.topology;
        warnings = res.warnings;
      } else {
        const text = await file.text();
        const res = parseTopologyMarkdown(text);
        parsedTopology = res.topology;
        warnings = res.warnings;
      }

      const currentTopology = get().topology;
      const fileIsEmpty =
        file.size === 0 ||
        (parsedTopology.verticals.length === 0 &&
          parsedTopology.teams.length === 0 &&
          (parsedTopology.applications ?? []).length === 0);
      const canvasHasData =
        currentTopology.verticals.length > 0 ||
        currentTopology.teams.length > 0 ||
        (currentTopology.applications ?? []).length > 0;

      // If the user selected a blank/empty file while having work on the canvas,
      // keep the canvas work and immediately autosave it into the selected file!
      const finalTopology =
        fileIsEmpty && canvasHasData ? currentTopology : parsedTopology;
      const finalMarkdown = serializeTopologyToMarkdown(finalTopology);

      await idbSet(IDB_FILE_HANDLE_KEY, handle);
      if (isExcel) {
        await idbSet(IDB_XLSX_HANDLE_KEY, handle);
      } else {
        await idbSet(IDB_MD_HANDLE_KEY, handle);
      }
      await idbSet(IDB_FORMAT_KEY, nextFormat);
      await idbSet(IDB_IS_LINKED_KEY, true);
      await idbSet(IDB_LINKED_FILENAME_KEY, file.name);
      await idbSet(IDB_TOPOLOGY_KEY, finalTopology);

      const nextPast =
        !fileIsEmpty && canvasHasData
          ? [...get().past, cloneTopology(currentTopology)].slice(
              -MAX_UNDO_HISTORY
            )
          : get().past;

      set({
        isFileLinked: true,
        fileHandle: handle,
        markdownFileHandle: isExcel ? get().markdownFileHandle : handle,
        excelFileHandle: isExcel ? handle : get().excelFileHandle,
        fileFormat: nextFormat,
        fileName: file.name,
        topology: finalTopology,
        markdownText: finalMarkdown,
        parseWarnings: warnings,
        past: nextPast,
        future: [],
        syncStatus: 'saving',
        lastSavedAt: new Date().toISOString(),
        lastKnownFileModified: file.lastModified,
        syncError: null,
      });

      // Immediately write/verify readwrite access so autosave is active right away
      await performDiskWrite();
    },

    importMarkdownFromFileObject: async (file: File) => {
      const isExcel = isExcelFileName(file.name);
      let parsedTopology: ChapterTopology;
      let warnings: string[];

      if (isExcel) {
        const buf = await file.arrayBuffer();
        const res = parseTopologyFromExcelBuffer(buf);
        parsedTopology = res.topology;
        warnings = res.warnings;
      } else {
        const text = await file.text();
        const res = parseTopologyMarkdown(text);
        parsedTopology = res.topology;
        warnings = res.warnings;
      }

      const currentTopology = get().topology;
      const fileIsEmpty =
        file.size === 0 ||
        (parsedTopology.verticals.length === 0 &&
          parsedTopology.teams.length === 0 &&
          (parsedTopology.applications ?? []).length === 0);
      const canvasHasData =
        currentTopology.verticals.length > 0 ||
        currentTopology.teams.length > 0 ||
        (currentTopology.applications ?? []).length > 0;

      const finalTopology =
        fileIsEmpty && canvasHasData ? currentTopology : parsedTopology;

      const nextFormat: UnderlyingFileFormat = isExcel ? 'excel' : 'markdown';
      const resolvedName =
        file.name ||
        (isExcel ? 'practice-topology.xlsx' : 'practice-topology.md');

      await idbSet(IDB_FORMAT_KEY, nextFormat);
      await idbSet(IDB_IS_LINKED_KEY, true);
      await idbSet(IDB_LINKED_FILENAME_KEY, resolvedName);

      set({
        isFileLinked: true,
        fileFormat: nextFormat,
        fileName: resolvedName,
        parseWarnings: warnings,
        syncStatus: 'saved',
        lastSavedAt: new Date().toISOString(),
        syncError: null,
      });
      commitTopology(finalTopology);
    },

    saveAsNewMarkdownFile: async (formatOverride) => {
      const preferredFormat = formatOverride || get().fileFormat;
      const defaultName =
        preferredFormat === 'excel'
          ? 'practice-topology.xlsx'
          : 'practice-topology.md';

      const rawBase = (get().fileName || defaultName).replace(
        /\.(md|markdown|txt|xlsx|xls)$/i,
        ''
      );
      await get().createNewLinkedFile({
        name: rawBase || 'practice-topology',
        format: preferredFormat,
        startBlank: false,
      });
    },

    createNewLinkedFile: async ({ name, format, startBlank = false }) => {
      const cleanBase =
        (name || 'practice-topology')
          .trim()
          .replace(/\.(md|markdown|txt|xlsx|xls)$/i, '')
          .trim() || 'practice-topology';
      const suggestedName =
        format === 'excel' ? `${cleanBase}.xlsx` : `${cleanBase}.md`;

      const currentTopology = get().topology;
      const targetTopology = startBlank
        ? reconcileTopologyApplications(cloneTopology(INITIAL_TOPOLOGY))
        : currentTopology;
      const targetMarkdown = serializeTopologyToMarkdown(targetTopology);

      if (typeof window.showSaveFilePicker === 'function') {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName,
            types:
              format === 'excel'
                ? [
                    {
                      description: 'Excel Workbook (.xlsx)',
                      accept: {
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                          ['.xlsx'],
                      },
                    },
                    {
                      description: 'Markdown Topology File (.md)',
                      accept: {
                        'text/markdown': ['.md'],
                      },
                    },
                  ]
                : [
                    {
                      description: 'Markdown Topology File (.md)',
                      accept: {
                        'text/markdown': ['.md'],
                      },
                    },
                    {
                      description: 'Excel Workbook (.xlsx)',
                      accept: {
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                          ['.xlsx'],
                      },
                    },
                  ],
          });

          const isExcel =
            resolveHandleFormat(handle.name || '', format) === 'excel';
          const nextFormat: UnderlyingFileFormat = isExcel
            ? 'excel'
            : 'markdown';
          const resolvedFileName = handle.name || suggestedName;

          await idbSet(IDB_FILE_HANDLE_KEY, handle);
          if (isExcel) {
            await idbSet(IDB_XLSX_HANDLE_KEY, handle);
          } else {
            await idbSet(IDB_MD_HANDLE_KEY, handle);
          }
          await idbSet(IDB_FORMAT_KEY, nextFormat);
          await idbSet(IDB_IS_LINKED_KEY, true);
          await idbSet(IDB_LINKED_FILENAME_KEY, resolvedFileName);
          await idbSet(IDB_TOPOLOGY_KEY, targetTopology);

          const nextPast = startBlank
            ? [...get().past, cloneTopology(currentTopology)].slice(
                -MAX_UNDO_HISTORY
              )
            : get().past;

          set({
            isFileLinked: true,
            fileHandle: handle,
            markdownFileHandle: isExcel ? get().markdownFileHandle : handle,
            excelFileHandle: isExcel ? handle : get().excelFileHandle,
            fileFormat: nextFormat,
            fileName: resolvedFileName,
            topology: targetTopology,
            markdownText: targetMarkdown,
            past: nextPast,
            future: startBlank ? [] : get().future,
            selectedTeamId: startBlank ? null : get().selectedTeamId,
            selectedVerticalId: startBlank ? null : get().selectedVerticalId,
            selectedAppId: startBlank ? null : get().selectedAppId,
            syncStatus: 'saving',
            syncError: null,
          });

          await performDiskWrite();
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            return;
          }
          console.warn(
            'showSaveFilePicker unavailable or blocked, falling back to linked file creation:',
            err
          );
        }
      }

      // Fallback when showSaveFilePicker is unsupported or blocked in webview:
      await idbSet(IDB_FORMAT_KEY, format);
      await idbSet(IDB_IS_LINKED_KEY, true);
      await idbSet(IDB_LINKED_FILENAME_KEY, suggestedName);
      await idbSet(IDB_TOPOLOGY_KEY, targetTopology);

      const nextPast = startBlank
        ? [...get().past, cloneTopology(currentTopology)].slice(
            -MAX_UNDO_HISTORY
          )
        : get().past;

      set({
        isFileLinked: true,
        fileFormat: format,
        fileName: suggestedName,
        topology: targetTopology,
        markdownText: targetMarkdown,
        past: nextPast,
        future: startBlank ? [] : get().future,
        selectedTeamId: startBlank ? null : get().selectedTeamId,
        selectedVerticalId: startBlank ? null : get().selectedVerticalId,
        selectedAppId: startBlank ? null : get().selectedAppId,
        syncStatus: 'saved',
        lastSavedAt: new Date().toISOString(),
        syncError: null,
      });

      get().downloadMarkdownSnapshot(format);
    },

    flushAutosaveNow: async () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      const activeHandle = get().fileHandle;
      if (
        activeHandle &&
        get().syncStatus === 'permission-needed' &&
        activeHandle.requestPermission
      ) {
        try {
          pendingPermissionPromise = activeHandle.requestPermission({
            mode: 'readwrite',
          });
          pendingPermissionPromise.catch(() => {});
        } catch {
          // Ignore
        }
      }
      set({ syncStatus: 'saving', syncError: null });
      await idbSet(IDB_TOPOLOGY_KEY, get().topology).catch(() => {});
      await new Promise((r) => setTimeout(r, 250));
      await performDiskWrite();
    },

    reconnectStoredFileHandle: async () => {
      const handle = get().fileHandle;
      if (!handle) return;

      if (handle.requestPermission) {
        try {
          pendingPermissionPromise = handle.requestPermission({
            mode: 'readwrite',
          });
          pendingPermissionPromise.catch(() => {});
        } catch {
          // Ignore
        }
      }

      set({ syncStatus: 'saving', syncError: null });
      await performDiskWrite();
    },

    unlinkLocalFile: async () => {
      const currentHandle = get().fileHandle;
      await idbSet(IDB_FILE_HANDLE_KEY, undefined);
      await idbSet(IDB_IS_LINKED_KEY, false);
      await idbSet(IDB_LINKED_FILENAME_KEY, undefined);
      if (currentHandle && isExcelFileName(currentHandle.name || '')) {
        await idbSet(IDB_XLSX_HANDLE_KEY, undefined);
      } else {
        await idbSet(IDB_MD_HANDLE_KEY, undefined);
      }
      const fmt = get().fileFormat;
      set({
        isFileLinked: false,
        fileHandle: null,
        markdownFileHandle:
          currentHandle && !isExcelFileName(currentHandle.name || '')
            ? null
            : get().markdownFileHandle,
        excelFileHandle:
          currentHandle && isExcelFileName(currentHandle.name || '')
            ? null
            : get().excelFileHandle,
        fileName:
          fmt === 'excel' ? 'practice-topology.xlsx' : 'practice-topology.md',
        syncStatus: 'local-ready',
        syncError: null,
        lastKnownFileModified: null,
      });
    },

    downloadMarkdownSnapshot: (formatOverride) => {
      const fmt = formatOverride || get().fileFormat;
      const baseName = (get().fileName || 'practice-topology').replace(
        /\.(md|markdown|txt|xlsx|xls)$/i,
        ''
      );

      if (fmt === 'excel') {
        const buf = serializeTopologyToExcelBuffer(get().topology);
        const blob = new Blob([buf], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      const md = get().markdownText;
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    checkExternalFileChanges: async () => {
      const { fileHandle, lastKnownFileModified, syncStatus } = get();
      if (!fileHandle || syncStatus === 'saving') return;

      try {
        const file = await fileHandle.getFile();
        if (
          lastKnownFileModified !== null &&
          file.lastModified > lastKnownFileModified + 200
        ) {
          const isExcel = isExcelFileName(file.name);
          const { topology, warnings } = isExcel
            ? parseTopologyFromExcelBuffer(await file.arrayBuffer())
            : parseTopologyMarkdown(await file.text());
          await idbSet(IDB_TOPOLOGY_KEY, topology);
          set({
            topology,
            markdownText: serializeTopologyToMarkdown(topology),
            parseWarnings: warnings,
            lastKnownFileModified: file.lastModified,
            lastSavedAt: new Date(file.lastModified).toISOString(),
            syncStatus: 'saved',
          });
        }
      } catch {
        // Ignore transient file read errors
      }
    },
  };
});

// Automatically persist all UI & navigation states synchronously to localStorage (and IndexedDB)
// so a full page refresh (F5 / Cmd+R) lands in the exact same view, tab, expanded section, and selection.
if (typeof window !== 'undefined') {
  let lastPersistedJson = '';
  useTopologyStore.subscribe((state) => {
    const snapshot: PersistedUIStateSnapshot = {
      theme: state.theme,
      viewMode: state.viewMode,
      spotlightFilter: state.spotlightFilter,
      searchQuery: state.searchQuery,
      showAllSharedConnectors: state.showAllSharedConnectors,
      hudFilterTab: state.hudFilterTab,
      selectedTeamId: state.selectedTeamId,
      selectedVerticalId: state.selectedVerticalId,
      selectedAppId: state.selectedAppId,
      isMarkdownDrawerOpen: state.isMarkdownDrawerOpen,
      excelSheetTab: state.excelSheetTab,
      isCatalogModalOpen: state.isCatalogModalOpen,
      catalogActiveTab: state.catalogActiveTab,
      teamsViewport: state.teamsViewport,
      applicationsViewport: state.applicationsViewport,
      plannerState: state.plannerState,
      fileFormat: state.fileFormat,
      isFileLinked: state.isFileLinked,
      fileName: state.fileName,
    };

    try {
      const json = JSON.stringify(snapshot);
      if (json !== lastPersistedJson) {
        lastPersistedJson = json;
        window.localStorage.setItem(LS_UI_STATE_KEY, json);
        idbSet(IDB_UI_STATE_KEY, snapshot).catch(() => {});
      }
    } catch {
      // Ignore storage quota warnings
    }
  });
}

function memberRoleOrFallback(role: string): string {
  return role.trim();
}
