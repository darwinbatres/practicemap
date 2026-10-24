import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Building2,
  CalendarCheck,
  Check,
  ChevronDown,
  Compass,
  Cpu,
  FilterX,
  Layers,
  Network,
  Search,
  Share2,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import {
  DEFAULT_CATALOG,
  getPegaLayerMetadata,
  getRoleMetadata,
} from '../../types/topology';
import { useTopologyStore } from '../../store/useTopologyStore';
import { getSharedMembersMap } from '../../utils/layoutEngine';
import {
  getActiveToggleClass,
  getInactiveToggleClass,
  getInputSurfaceClass,
  getPanelSurfaceClass,
  getPopoverSurfaceClass,
  getSecondaryButtonClass,
} from '../../utils/uiTheme';
import { FileSyncBar } from './FileSyncBar';

export const ExecutiveSpotlightHUD: React.FC = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const dropdownContainerRef = useRef<HTMLDivElement | null>(null);

  const topology = useTopologyStore((s) => s.topology);
  const theme = useTopologyStore((s) => s.theme);
  const viewMode = useTopologyStore((s) => s.viewMode);
  const setViewMode = useTopologyStore((s) => s.setViewMode);
  const spotlightFilter = useTopologyStore((s) => s.spotlightFilter);
  const setSpotlightFilter = useTopologyStore((s) => s.setSpotlightFilter);
  const searchQuery = useTopologyStore((s) => s.searchQuery);
  const setSearchQuery = useTopologyStore((s) => s.setSearchQuery);
  const filterTab = useTopologyStore((s) => s.hudFilterTab);
  const setFilterTab = useTopologyStore((s) => s.setHudFilterTab);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!isFilterOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isFilterOpen]);

  const kpis = useMemo(() => {
    const sharedMap = getSharedMembersMap(topology.teams);
    const uniqueHeadcount = sharedMap.size;

    let totalAllocationPoints = 0;
    let sharedCount = 0;

    sharedMap.forEach((summary) => {
      totalAllocationPoints += summary.totalAllocation;
      if (summary.placements.length > 1) {
        sharedCount += 1;
      }
    });

    const roleCounts = new Map<string, number>();

    let internalCount = 0;
    let outsourcingCount = 0;
    const companyCounts = new Map<string, number>();

    const catalog = topology.catalog ?? DEFAULT_CATALOG;
    catalog
      .filter((c) => c.kind === 'role')
      .forEach((c) => {
        if (!roleCounts.has(c.name)) {
          roleCounts.set(c.name, 0);
        }
      });
    catalog
      .filter((c) => c.kind === 'company')
      .forEach((c) => companyCounts.set(c.name, 0));

    sharedMap.forEach((summary) => {
      if (summary.primaryRole) {
        const current = roleCounts.get(summary.primaryRole) || 0;
        roleCounts.set(summary.primaryRole, current + 1);
      }

      if (summary.employmentType === 'outsourcing') {
        outsourcingCount += 1;
      } else {
        internalCount += 1;
      }

      if (summary.company) {
        companyCounts.set(
          summary.company,
          (companyCounts.get(summary.company) || 0) + 1
        );
      }
    });

    const appCounts = new Map<string, number>();
    const initCounts = new Map<string, number>();
    const layerCounts = new Map<string, number>();
    const archCounts = new Map<string, number>();

    catalog
      .filter((c) => c.kind === 'application')
      .forEach((c) => appCounts.set(c.name, 0));
    (topology.applications ?? []).forEach((a) => {
      if (!appCounts.has(a.name)) appCounts.set(a.name, 0);
    });
    catalog
      .filter((c) => c.kind === 'initiative')
      .forEach((c) => initCounts.set(c.name, 0));
    catalog
      .filter((c) => c.kind === 'layer')
      .forEach((c) => layerCounts.set(c.name, 0));
    catalog
      .filter((c) => c.kind === 'architecture')
      .forEach((c) => archCounts.set(c.name, 0));

    for (const app of topology.applications ?? []) {
      if (app.layer?.trim()) {
        layerCounts.set(
          app.layer.trim(),
          (layerCounts.get(app.layer.trim()) || 0) + 1
        );
      }
      if (app.architecture?.trim()) {
        archCounts.set(
          app.architecture.trim(),
          (archCounts.get(app.architecture.trim()) || 0) + 1
        );
      }
    }

    for (const team of topology.teams) {
      if (team.pegaApplication) {
        appCounts.set(
          team.pegaApplication,
          (appCounts.get(team.pegaApplication) || 0) + 1
        );
      }
      if (team.initiative) {
        initCounts.set(
          team.initiative,
          (initCounts.get(team.initiative) || 0) + 1
        );
      }
    }

    const openTasksCount = (topology.tasks ?? []).filter(
      (t) => t.status !== 'done'
    ).length;
    const roadmapCount = (topology.roadmap ?? []).length;

    return {
      totalVerticals: topology.verticals.length,
      totalSquads: topology.teams.length,
      totalApplications: (topology.applications ?? []).length,
      totalPlannerItems: openTasksCount + roadmapCount,
      openTasksCount,
      roadmapCount,
      uniqueHeadcount,
      totalFte: totalAllocationPoints / 100,
      sharedCount,
      internalCount,
      outsourcingCount,
      roleCounts,
      appCounts,
      initCounts,
      companyCounts,
      layerCounts,
      archCounts,
    };
  }, [topology]);

  const hasActiveFilter =
    spotlightFilter.type !== 'none' || searchQuery.trim().length > 0;

  const activeFilterSummary = useMemo(() => {
    if (spotlightFilter.type === 'none') return 'Filter';
    if (spotlightFilter.type === 'role') {
      return spotlightFilter.value;
    }
    if (spotlightFilter.type === 'application') return spotlightFilter.value;
    if (spotlightFilter.type === 'initiative') return spotlightFilter.value;
    if (spotlightFilter.type === 'layer') {
      return spotlightFilter.value;
    }
    if (spotlightFilter.type === 'architecture') {
      return spotlightFilter.value;
    }
    if (spotlightFilter.type === 'sourcing') {
      return spotlightFilter.value === 'internal' ? 'Internal' : 'Outsourcing';
    }
    if (spotlightFilter.type === 'company') return spotlightFilter.value;
    if (spotlightFilter.type === 'shared') return 'Shared Members';
    if (spotlightFilter.type === 'task-kind') {
      return spotlightFilter.value === 'followup' ? 'Follow-Ups' : 'To-Dos';
    }
    if (spotlightFilter.type === 'horizon') {
      return `Horizon: ${spotlightFilter.value}`;
    }
    if (spotlightFilter.type === 'priority') {
      return `${spotlightFilter.value} Priority`;
    }
    return 'Filtered';
  }, [spotlightFilter]);

  const pillInactive = getSecondaryButtonClass(isDark);
  const pillActive = `${getActiveToggleClass(isDark)} font-semibold`;

  return (
    <header className="pointer-events-none fixed top-3 left-3 right-3 z-30">
      <div
        className={`pointer-events-auto flex items-center justify-between gap-2 px-3 py-2 rounded-2xl border backdrop-blur-xl transition-colors ${getPanelSurfaceClass(
          isDark
        )}`}
      >
        {/* Left: Brand & Workspace Board View Switcher */}
        <div className="flex items-center gap-2.5 whitespace-nowrap">
          <div
            className={`flex items-center gap-2 pr-2.5 border-r ${
              isDark ? 'border-[#222a3d]' : 'border-slate-200'
            }`}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-b from-indigo-500 to-indigo-600 text-white border border-indigo-400/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_2px_8px_rgba(79,70,229,0.35)]">
              <Network className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-xs tracking-tight hidden sm:inline">
              PracticeMap
            </span>
          </div>

          {/* Dedicated View Switcher: Teams & Verticals vs Applications vs Planner & Roadmap */}
          <div
            role="tablist"
            aria-label="Workspace Board View"
            className={`inline-flex items-center p-0.5 rounded-xl border ${
              isDark
                ? 'bg-[#090c14] border-[#1f273a]'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'teams'}
              onClick={() => setViewMode('teams')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'teams'
                  ? getActiveToggleClass(isDark)
                  : getInactiveToggleClass(isDark)
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Teams & Verticals</span>
              <span className="font-mono text-[10px] opacity-75 px-1 rounded bg-black/15">
                {kpis.totalSquads}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'applications'}
              onClick={() => setViewMode('applications')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'applications'
                  ? getActiveToggleClass(isDark)
                  : getInactiveToggleClass(isDark)
              }`}
            >
              <Box className="h-3.5 w-3.5" />
              <span>Applications</span>
              <span className="font-mono text-[10px] opacity-75 px-1 rounded bg-black/15">
                {kpis.totalApplications}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'planner'}
              onClick={() => setViewMode('planner')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'planner'
                  ? getActiveToggleClass(isDark)
                  : getInactiveToggleClass(isDark)
              }`}
            >
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Planner & Roadmap</span>
              <span className="font-mono text-[10px] opacity-75 px-1 rounded bg-black/15">
                {kpis.totalPlannerItems}
              </span>
            </button>
          </div>
        </div>

        {/* Center: Search + Unified Filter Popover */}
        <div
          ref={dropdownContainerRef}
          className="flex items-center gap-1.5 whitespace-nowrap"
        >
          {/* Search Input */}
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-45" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                viewMode === 'applications'
                  ? 'Search apps, modules, workflows...'
                  : viewMode === 'planner'
                    ? 'Search tasks, follow-ups, roadmap...'
                    : 'Search squads, members...'
              }
              className={`pl-7 pr-2.5 py-1 rounded-lg text-xs border outline-none transition-colors w-40 sm:w-52 ${getInputSurfaceClass(
                isDark
              )}`}
            />
          </div>

          {/* Unified Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-colors cursor-pointer ${
                spotlightFilter.type !== 'none' ? pillActive : pillInactive
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 opacity-75" />
              <span className="truncate max-w-[130px]">
                {activeFilterSummary}
              </span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>

            {isFilterOpen && (
              <div
                className={`absolute left-0 mt-1.5 w-76 rounded-xl border p-2 backdrop-blur-xl z-50 ${getPopoverSurfaceClass(
                  isDark
                )}`}
              >
                {viewMode === 'planner' ? (
                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider opacity-55">
                      Action Item Type
                    </div>
                    {(
                      [
                        { value: 'todo', label: 'To-Dos Only' },
                        { value: 'followup', label: 'Follow-Ups Only' },
                      ] as const
                    ).map((opt) => {
                      const isSelected =
                        spotlightFilter.type === 'task-kind' &&
                        spotlightFilter.value === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSpotlightFilter({
                              type: 'task-kind',
                              value: opt.value,
                            });
                            setIsFilterOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left cursor-pointer ${
                            isSelected
                              ? isDark
                                ? 'bg-[#1a2234] font-semibold text-white'
                                : 'bg-slate-100 font-semibold text-slate-900'
                              : isDark
                                ? 'text-slate-300 hover:bg-[#171e2e]'
                                : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}

                    <div className="px-2 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider opacity-55">
                      Priority
                    </div>
                    {(
                      [
                        { value: 'high', label: 'High Priority' },
                        { value: 'medium', label: 'Medium Priority' },
                        { value: 'low', label: 'Low Priority' },
                      ] as const
                    ).map((opt) => {
                      const isSelected =
                        spotlightFilter.type === 'priority' &&
                        spotlightFilter.value === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSpotlightFilter({
                              type: 'priority',
                              value: opt.value,
                            });
                            setIsFilterOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left cursor-pointer ${
                            isSelected
                              ? isDark
                                ? 'bg-[#1a2234] font-semibold text-white'
                                : 'bg-slate-100 font-semibold text-slate-900'
                              : isDark
                                ? 'text-slate-300 hover:bg-[#171e2e]'
                                : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}

                    <div className="px-2 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider opacity-55">
                      Roadmap Horizon
                    </div>
                    {(
                      [
                        { value: 'exploring', label: 'Exploring & Ideas' },
                        { value: 'now', label: 'Now (Active)' },
                        { value: 'next', label: 'Next' },
                        { value: 'later', label: 'Later' },
                      ] as const
                    ).map((opt) => {
                      const isSelected =
                        spotlightFilter.type === 'horizon' &&
                        spotlightFilter.value === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSpotlightFilter({
                              type: 'horizon',
                              value: opt.value,
                            });
                            setIsFilterOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left cursor-pointer ${
                            isSelected
                              ? isDark
                                ? 'bg-[#1a2234] font-semibold text-white'
                                : 'bg-slate-100 font-semibold text-slate-900'
                              : isDark
                                ? 'text-slate-300 hover:bg-[#171e2e]'
                                : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : viewMode === 'applications' ? (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider opacity-55">
                      Filter by Layer / Architecture
                    </div>
                    {kpis.layerCounts.size === 0 &&
                      kpis.archCounts.size === 0 && (
                        <div className="px-2.5 py-3 text-xs opacity-50 text-center">
                          No layers or architectures defined yet
                        </div>
                      )}
                    {Array.from(kpis.layerCounts.entries()).map(
                      ([layerName, count]) => {
                        const meta = getPegaLayerMetadata(layerName);
                        const isSelected =
                          spotlightFilter.type === 'layer' &&
                          spotlightFilter.value.toLowerCase() ===
                            layerName.toLowerCase();
                        return (
                          <button
                            key={`layer-${layerName}`}
                            type="button"
                            onClick={() => {
                              setSpotlightFilter({
                                type: 'layer',
                                value: layerName,
                              });
                              setIsFilterOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left cursor-pointer ${
                              isSelected
                                ? isDark
                                  ? 'bg-[#1a2234] font-semibold text-white'
                                  : 'bg-slate-100 font-semibold text-slate-900'
                                : isDark
                                ? 'text-slate-300 hover:bg-[#171e2e]'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: meta.dotColor }}
                              />
                              <span className="truncate">{layerName}</span>
                            </span>
                            <span className="font-mono text-[10px] opacity-60">
                              {count}
                            </span>
                          </button>
                        );
                      }
                    )}
                    {Array.from(kpis.archCounts.entries()).map(
                      ([archName, count]) => {
                        const isSelected =
                          spotlightFilter.type === 'architecture' &&
                          spotlightFilter.value.toLowerCase() ===
                            archName.toLowerCase();
                        return (
                          <button
                            key={`arch-${archName}`}
                            type="button"
                            onClick={() => {
                              setSpotlightFilter({
                                type: 'architecture',
                                value: archName,
                              });
                              setIsFilterOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left cursor-pointer ${
                              isSelected
                                ? isDark
                                  ? 'bg-[#1a2234] font-semibold text-white'
                                  : 'bg-slate-100 font-semibold text-slate-900'
                                : isDark
                                ? 'text-slate-300 hover:bg-[#171e2e]'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <Cpu className="h-3 w-3 text-indigo-400 shrink-0" />
                              <span className="truncate">{archName}</span>
                            </span>
                            <span className="font-mono text-[10px] opacity-60">
                              {count}
                            </span>
                          </button>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Sub-tabs inside Unified Filter Popover */}
                    <div
                      className={`grid grid-cols-3 p-0.5 rounded-lg border text-[11px] font-semibold ${
                        isDark
                          ? 'bg-[#090c14] border-[#1f273a]'
                          : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      {(
                        [
                          { id: 'roles', label: 'Roles' },
                          { id: 'apps', label: 'Apps & Inits' },
                          { id: 'sourcing', label: 'Sourcing' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setFilterTab(tab.id)}
                          className={`py-1 rounded-md cursor-pointer transition-colors ${
                            filterTab === tab.id
                              ? getActiveToggleClass(isDark)
                              : getInactiveToggleClass(isDark)
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Quick Shared Members Toggle inside Filter */}
                    <button
                      type="button"
                      onClick={() => {
                        setSpotlightFilter({ type: 'shared' });
                        setIsFilterOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer border ${
                        spotlightFilter.type === 'shared'
                          ? getActiveToggleClass(isDark)
                          : getSecondaryButtonClass(isDark)
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Share2 className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Shared Multi-Squad Members</span>
                      </span>
                      <span className="font-mono text-[10px] opacity-75">
                        {kpis.sharedCount}
                      </span>
                    </button>

                    <div className="max-h-60 overflow-y-auto space-y-0.5 pt-1">
                      {filterTab === 'roles' &&
                        (kpis.roleCounts.size === 0 ? (
                          <div className="px-2.5 py-3 text-xs opacity-50 text-center">
                            No roles defined yet
                          </div>
                        ) : (
                          Array.from(kpis.roleCounts.entries()).map(
                            ([roleName, count]) => {
                              const meta = getRoleMetadata(roleName);
                              const isSelected =
                                spotlightFilter.type === 'role' &&
                                spotlightFilter.value === roleName;
                              return (
                                <button
                                  key={roleName}
                                  type="button"
                                  onClick={() => {
                                    setSpotlightFilter({
                                      type: 'role',
                                      value: roleName,
                                    });
                                    setIsFilterOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left cursor-pointer ${
                                    isSelected
                                      ? isDark
                                        ? 'bg-[#1a2234] font-semibold text-white'
                                        : 'bg-slate-100 font-semibold text-slate-900'
                                      : isDark
                                      ? 'text-slate-300 hover:bg-[#171e2e]'
                                      : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <span
                                      className="h-2 w-2 rounded-full shrink-0"
                                      style={{ backgroundColor: meta.dotColor }}
                                    />
                                    <span className="truncate">{roleName}</span>
                                  </span>
                                  <span className="font-mono text-[10px] opacity-60 ml-2">
                                    {count}
                                  </span>
                                </button>
                              );
                            }
                          )
                        ))}

                      {filterTab === 'apps' && (
                        <>
                          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider opacity-50">
                            Applications
                          </div>
                          {kpis.appCounts.size === 0 && (
                            <div className="px-2.5 py-1.5 text-xs opacity-50">
                              No applications defined yet
                            </div>
                          )}
                          {Array.from(kpis.appCounts.entries()).map(
                            ([app, count]) => {
                              const isSelected =
                                spotlightFilter.type === 'application' &&
                                spotlightFilter.value === app;
                              return (
                                <button
                                  key={app}
                                  type="button"
                                  onClick={() => {
                                    setSpotlightFilter({
                                      type: 'application',
                                      value: app,
                                    });
                                    setIsFilterOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left cursor-pointer ${
                                    isSelected
                                      ? isDark
                                        ? 'bg-[#1a2234] font-semibold text-white'
                                        : 'bg-slate-100 font-semibold text-slate-900'
                                      : isDark
                                      ? 'text-slate-300 hover:bg-[#171e2e]'
                                      : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <Box className="h-3 w-3 text-indigo-400 shrink-0" />
                                    <span className="truncate">{app}</span>
                                  </span>
                                  <span className="font-mono text-[10px] opacity-60 ml-2">
                                    {count}
                                  </span>
                                </button>
                              );
                            }
                          )}

                          <div className="px-2 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider opacity-50">
                            Strategic Initiatives
                          </div>
                          {kpis.initCounts.size === 0 && (
                            <div className="px-2.5 py-1.5 text-xs opacity-50">
                              No initiatives defined yet
                            </div>
                          )}
                          {Array.from(kpis.initCounts.entries()).map(
                            ([init, count]) => {
                              const isSelected =
                                spotlightFilter.type === 'initiative' &&
                                spotlightFilter.value === init;
                              return (
                                <button
                                  key={init}
                                  type="button"
                                  onClick={() => {
                                    setSpotlightFilter({
                                      type: 'initiative',
                                      value: init,
                                    });
                                    setIsFilterOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left cursor-pointer ${
                                    isSelected
                                      ? isDark
                                        ? 'bg-[#1a2234] font-semibold text-white'
                                        : 'bg-slate-100 font-semibold text-slate-900'
                                      : isDark
                                      ? 'text-slate-300 hover:bg-[#171e2e]'
                                      : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <Compass className="h-3 w-3 opacity-70 shrink-0" />
                                    <span className="truncate">{init}</span>
                                  </span>
                                  <span className="font-mono text-[10px] opacity-60 ml-2">
                                    {count}
                                  </span>
                                </button>
                              );
                            }
                          )}
                        </>
                      )}

                      {filterTab === 'sourcing' && (
                        <>
                          {(
                            [
                              {
                                value: 'internal' as const,
                                label: 'Internal Only',
                                count: kpis.internalCount,
                              },
                              {
                                value: 'outsourcing' as const,
                                label: 'Outsourcing Only',
                                count: kpis.outsourcingCount,
                              },
                            ] as const
                          ).map((item) => {
                            const isSelected =
                              spotlightFilter.type === 'sourcing' &&
                              spotlightFilter.value === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => {
                                  setSpotlightFilter({
                                    type: 'sourcing',
                                    value: item.value,
                                  });
                                  setIsFilterOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left cursor-pointer ${
                                  isSelected
                                    ? isDark
                                      ? 'bg-[#1a2234] font-semibold text-white'
                                      : 'bg-slate-100 font-semibold text-slate-900'
                                    : isDark
                                    ? 'text-slate-300 hover:bg-[#171e2e]'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span>{item.label}</span>
                                <span className="font-mono text-[10px] opacity-60 ml-2">
                                  {item.count}
                                </span>
                              </button>
                            );
                          })}

                          <div className="px-2 pt-2 pb-1 text-[10px] font-mono uppercase tracking-wider opacity-50">
                            Company / Partner
                          </div>
                          {Array.from(kpis.companyCounts.entries()).map(
                            ([comp, count]) => {
                              const isSelected =
                                spotlightFilter.type === 'company' &&
                                spotlightFilter.value.toLowerCase() ===
                                  comp.toLowerCase();
                              return (
                                <button
                                  key={comp}
                                  type="button"
                                  onClick={() => {
                                    setSpotlightFilter({
                                      type: 'company',
                                      value: comp,
                                    });
                                    setIsFilterOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left cursor-pointer ${
                                    isSelected
                                      ? isDark
                                        ? 'bg-[#1a2234] font-semibold text-white'
                                        : 'bg-slate-100 font-semibold text-slate-900'
                                      : isDark
                                      ? 'text-slate-300 hover:bg-[#171e2e]'
                                      : 'text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="flex items-center gap-2 truncate">
                                    <Building2 className="h-3 w-3 opacity-70 shrink-0" />
                                    <span className="truncate">{comp}</span>
                                  </span>
                                  <span className="font-mono text-[10px] opacity-60 ml-2">
                                    {count}
                                  </span>
                                </button>
                              );
                            }
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {spotlightFilter.type !== 'none' && (
                  <div
                    className={`mt-2 pt-1.5 border-t ${
                      isDark ? 'border-[#1f273a]' : 'border-slate-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSpotlightFilter({ type: 'none' });
                        setIsFilterOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1 rounded-lg text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Reset Filter</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setSpotlightFilter({ type: 'none' });
                setSearchQuery('');
              }}
              title="Clear all active filters"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${getSecondaryButtonClass(
                isDark
              )}`}
            >
              <FilterX className="h-3 w-3 text-indigo-400" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Right: Streamlined Undo/Redo + Auto-Save File Pill + Source Split-View Toggle */}
        <FileSyncBar />
      </div>
    </header>
  );
};
