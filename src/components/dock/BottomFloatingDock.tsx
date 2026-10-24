import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Building2,
  CalendarCheck,
  Check,
  ChevronUp,
  Layers,
  Maximize2,
  Moon,
  Plus,
  Redo2,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Undo2,
  UserPlus,
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import {
  getActiveToggleClass,
  getDangerButtonClass,
  getPanelSurfaceClass,
  getPopoverSurfaceClass,
  getPrimaryButtonClass,
  getSecondaryButtonClass,
} from '../../utils/uiTheme';

interface BottomFloatingDockProps {
  onZoomToFit: () => void;
}

export const BottomFloatingDock: React.FC<BottomFloatingDockProps> = ({
  onZoomToFit,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const theme = useTopologyStore((s) => s.theme);
  const toggleTheme = useTopologyStore((s) => s.toggleTheme);
  const viewMode = useTopologyStore((s) => s.viewMode);
  const setViewMode = useTopologyStore((s) => s.setViewMode);
  const pastCount = useTopologyStore((s) => s.past.length);
  const futureCount = useTopologyStore((s) => s.future.length);
  const undo = useTopologyStore((s) => s.undo);
  const redo = useTopologyStore((s) => s.redo);
  const addVertical = useTopologyStore((s) => s.addVertical);
  const addTeam = useTopologyStore((s) => s.addTeam);
  const addPegaApplication = useTopologyStore((s) => s.addPegaApplication);
  const addPracticeTask = useTopologyStore((s) => s.addPracticeTask);
  const setAssignModalOpen = useTopologyStore((s) => s.setAssignModalOpen);
  const setCatalogModalOpen = useTopologyStore((s) => s.setCatalogModalOpen);
  const runAutoLayout = useTopologyStore((s) => s.runAutoLayout);
  const resetToDemoData = useTopologyStore((s) => s.resetToDemoData);
  const requestConfirmation = useTopologyStore((s) => s.requestConfirmation);
  const showAllSharedConnectors = useTopologyStore(
    (s) => s.showAllSharedConnectors
  );
  const setShowAllSharedConnectors = useTopologyStore(
    (s) => s.setShowAllSharedConnectors
  );

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleAutoLayout = () => {
    runAutoLayout();
    setTimeout(() => {
      onZoomToFit();
    }, 80);
  };

  const handleResetCanvas = () => {
    setMenuOpen(false);
    requestConfirmation({
      title: 'Reset & Clear Canvas?',
      description:
        'This will permanently clear all verticals, squads, member assignments, and custom catalog items on the canvas and start fresh with a clean workspace.',
      confirmLabel: 'Clear Canvas',
      onConfirm: () => {
        resetToDemoData();
        setTimeout(() => onZoomToFit(), 80);
      },
    });
  };

  const itemHoverClass = isDark
    ? 'hover:bg-[#171e2e] text-slate-200'
    : 'hover:bg-slate-100 text-slate-800';

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center px-3">
      <div
        ref={menuRef}
        className={`pointer-events-auto relative flex items-center gap-1.5 p-1.5 rounded-2xl border backdrop-blur-2xl transition-colors whitespace-nowrap ${getPanelSurfaceClass(
          isDark
        )}`}
      >
        {/* Primary Quick Action: Context-Aware (+ New Squad, + New App, or + New Action Item) */}
        <button
          type="button"
          onClick={() => {
            if (viewMode === 'applications') {
              addPegaApplication();
            } else if (viewMode === 'planner') {
              const now = new Date();
              const localIso = `${now.getFullYear()}-${String(
                now.getMonth() + 1
              ).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
              addPracticeTask({
                title: 'New Practice Action Item',
                kind: 'todo',
                status: 'open',
                priority: 'medium',
                dueDate: localIso,
              });
            } else {
              addTeam();
            }
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${getPrimaryButtonClass()}`}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>
            {viewMode === 'applications'
              ? 'New Application'
              : viewMode === 'planner'
                ? 'New Action Item'
                : 'New Squad'}
          </span>
        </button>

        {/* Combined Workspace & Canvas Menu Trigger */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Open Workspace Actions Menu"
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
            menuOpen
              ? getActiveToggleClass(isDark)
              : getSecondaryButtonClass(isDark)
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 opacity-80" />
          <span>Actions</span>
          <ChevronUp
            className={`h-3.5 w-3.5 opacity-75 transition-transform duration-150 ${
              menuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Unified Popover Menu */}
        {menuOpen && (
          <div
            role="menu"
            aria-label="Workspace and Canvas Actions"
            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-64 rounded-2xl border p-1.5 backdrop-blur-2xl ${getPopoverSurfaceClass(
              isDark
            )}`}
          >
            {/* Section 1: Create & Manage */}
            <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-mono uppercase tracking-wider opacity-50">
              Create & Manage
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setViewMode('teams');
                addTeam();
                setMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-left transition cursor-pointer ${itemHoverClass}`}
            >
              <Layers className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <div>New Team / Squad</div>
                <div className="text-[10px] opacity-55">
                  Add a squad card
                </div>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setViewMode('teams');
                addVertical();
                setMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-left transition cursor-pointer ${itemHoverClass}`}
            >
              <Building2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <div>New Business Vertical</div>
                <div className="text-[10px] opacity-55">
                  Add a vertical container zone
                </div>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setViewMode('applications');
                addPegaApplication();
                setMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-left transition cursor-pointer ${itemHoverClass}`}
            >
              <Box className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <div>New Application</div>
                <div className="text-[10px] opacity-55">
                  Map Dependencies, Modules, Workflows & Data
                </div>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setViewMode('planner');
                setMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-left transition cursor-pointer ${itemHoverClass}`}
            >
              <CalendarCheck className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <div>Planner & Strategic Roadmap</div>
                <div className="text-[10px] opacity-55">
                  Calendar To-Dos, Follow-Ups & Horizons
                </div>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAssignModalOpen(true);
                setMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-left transition cursor-pointer ${itemHoverClass}`}
            >
              <UserPlus className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <div>Assign Practice Member</div>
                <div className="text-[10px] opacity-55">
                  Allocate across 1 or more squads
                </div>
              </div>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setCatalogModalOpen(true);
                setMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-left transition cursor-pointer ${itemHoverClass}`}
            >
              <Box className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <div>Manage Catalog</div>
                <div className="text-[10px] opacity-55">
                  Apps, Initiatives, Companies & Roles
                </div>
              </div>
            </button>

            <div
              className={`my-1.5 h-px ${
                isDark ? 'bg-[#1f293d]' : 'bg-slate-200/80'
              }`}
            />

            {/* Section 2: Canvas & History */}
            <div className="px-2.5 pt-1 pb-1 text-[10px] font-mono uppercase tracking-wider opacity-50">
              Canvas & History
            </div>

            <div className="grid grid-cols-2 gap-1 px-1 pb-1">
              <button
                type="button"
                role="menuitem"
                disabled={pastCount === 0}
                onClick={() => {
                  undo();
                }}
                className={`flex items-center justify-between px-2 py-1.5 rounded-xl text-xs font-medium transition ${
                  pastCount > 0
                    ? `${itemHoverClass} cursor-pointer`
                    : 'opacity-35 cursor-not-allowed'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Undo2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span>Undo</span>
                </span>
                <span className="text-[10px] font-mono opacity-60">⌘Z</span>
              </button>

              <button
                type="button"
                role="menuitem"
                disabled={futureCount === 0}
                onClick={() => {
                  redo();
                }}
                className={`flex items-center justify-between px-2 py-1.5 rounded-xl text-xs font-medium transition ${
                  futureCount > 0
                    ? `${itemHoverClass} cursor-pointer`
                    : 'opacity-35 cursor-not-allowed'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Redo2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span>Redo</span>
                </span>
                <span className="text-[10px] font-mono opacity-60">⇧⌘Z</span>
              </button>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                handleAutoLayout();
                setMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition cursor-pointer ${itemHoverClass}`}
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>Auto-Layout Grid</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onZoomToFit();
                setMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition cursor-pointer ${itemHoverClass}`}
            >
              <Maximize2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>Zoom to Fit Topology</span>
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() =>
                setShowAllSharedConnectors(!showAllSharedConnectors)
              }
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition cursor-pointer ${itemHoverClass}`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Share2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>Shared Member Links</span>
              </span>
              {showAllSharedConnectors && (
                <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              )}
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                toggleTheme();
                setMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-left transition cursor-pointer ${itemHoverClass}`}
            >
              {isDark ? (
                <Sun className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              )}
              <span>Switch to {isDark ? 'Light' : 'Dark'} Theme</span>
            </button>

            <div
              className={`my-1.5 h-px ${
                isDark ? 'bg-[#1f293d]' : 'bg-slate-200/80'
              }`}
            />

            {/* Section 3: Destructive Reset (Uses Canonical Danger Button Class) */}
            <button
              type="button"
              role="menuitem"
              onClick={handleResetCanvas}
              className={`w-full flex items-center justify-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${getDangerButtonClass(
                isDark
              )}`}
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span>Reset & Clear Canvas...</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
