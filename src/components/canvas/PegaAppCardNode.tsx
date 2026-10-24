import React from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  FolderKanban,
  GitBranch,
  Layers,
  Plug,
  Users,
} from 'lucide-react';
import {
  BusinessVertical,
  formatExternalUrlLabel,
  getPegaLayerMetadata,
  getSafeExternalUrl,
  PegaApplicationBlueprint,
  TeamSquad,
} from '../../types/topology';
import { useTopologyStore } from '../../store/useTopologyStore';
import { PEGA_APP_CARD_WIDTH } from '../../utils/layoutEngine';

export interface PegaAppCardNodeData extends Record<string, unknown> {
  app: PegaApplicationBlueprint;
  mappedTeams: TeamSquad[];
  verticalMap: Record<string, BusinessVertical>;
  appIdByName?: Record<string, string>;
  isDimmed: boolean;
  isSelected: boolean;
}

export const PegaAppCardNode: React.FC<NodeProps> = React.memo(({ data }) => {
  const {
    app,
    mappedTeams,
    verticalMap,
    appIdByName = {},
    isDimmed,
    isSelected,
  } = data as unknown as PegaAppCardNodeData;

  const theme = useTopologyStore((s) => s.theme);
  const selectApp = useTopologyStore((s) => s.selectApp);
  const selectTeam = useTopologyStore((s) => s.selectTeam);
  const setViewMode = useTopologyStore((s) => s.setViewMode);

  const isDark = theme === 'dark';
  const layerMeta = getPegaLayerMetadata(app.layer);

  const totalMappedFte = mappedTeams.reduce(
    (sum, t) =>
      sum + t.members.reduce((mSum, m) => mSum + m.allocation / 100, 0),
    0
  );
  const totalMappedMembers = mappedTeams.reduce(
    (sum, t) => sum + t.members.length,
    0
  );

  return (
    <div
      style={{ width: PEGA_APP_CARD_WIDTH }}
      onClick={(e) => {
        e.stopPropagation();
        selectApp(app.id);
      }}
      className={`group relative rounded-xl border transition-opacity duration-150 select-none cursor-grab active:cursor-grabbing ${
        isDark
          ? 'bg-[#121622]/96 border-[#222a3d] hover:border-[#33405c] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_34px_-10px_rgba(0,0,0,0.65)]'
          : 'bg-white/98 border-slate-200/95 hover:border-slate-300 text-slate-900 shadow-[0_2px_4px_rgba(15,23,42,0.03),0_12px_28px_-8px_rgba(15,23,42,0.08)]'
      } ${
        isSelected
          ? isDark
            ? 'ring-2 ring-indigo-400/85 border-indigo-400'
            : 'ring-2 ring-indigo-600 border-indigo-600'
          : ''
      } ${isDimmed ? 'opacity-25' : 'opacity-100'}`}
    >
      {/* React Flow Handles for Built-On Inheritance Edges */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="built-on-src"
        className="!w-2 !h-2 !bg-transparent !border-0 !pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="built-on-bottom-tgt"
        className="!w-2 !h-2 !bg-transparent !border-0 !pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="built-on-tgt"
        className="!w-2 !h-2 !bg-transparent !border-0 !pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="built-on-top-src"
        className="!w-2 !h-2 !bg-transparent !border-0 !pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-src"
        className="!w-2 !h-2 !bg-transparent !border-0 !pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-tgt"
        className="!w-2 !h-2 !bg-transparent !border-0 !pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-tgt"
        className="!w-2 !h-2 !bg-transparent !border-0 !pointer-events-none"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-src"
        className="!w-2 !h-2 !bg-transparent !border-0 !pointer-events-none"
      />

      {/* Card Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className={`text-[15px] font-bold tracking-tight leading-snug truncate ${
                  isDark ? 'text-slate-50' : 'text-slate-900'
                }`}
              >
                {app.name}
              </h3>
            </div>
            {app.description && (
              <p
                className={`text-[11px] mt-0.5 line-clamp-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {app.description}
              </p>
            )}
          </div>

          {app.version?.trim() && (
            <span
              className={`shrink-0 text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border ${
                isDark
                  ? 'bg-[#171d2c] text-indigo-300 border-[#252f45]'
                  : 'bg-slate-100 text-indigo-700 border-slate-200/80'
              }`}
            >
              v{app.version.trim()}
            </span>
          )}
        </div>

        {/* Layer, Architecture & Wiki Badges */}
        {(app.layer?.trim() ||
          app.architecture?.trim() ||
          app.wikiUrl?.trim()) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {app.layer?.trim() && (
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                  isDark ? layerMeta.badgeDark : layerMeta.badgeLight
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: layerMeta.dotColor }}
                />
                <span>{layerMeta.shortLabel}</span>
              </span>
            )}

            {app.architecture?.trim() && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                  isDark
                    ? 'bg-[#0e121b] text-slate-300 border-[#1e2638]'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <Cpu className="h-2.5 w-2.5 shrink-0 opacity-65" />
                <span className="truncate max-w-[155px]">
                  {app.architecture.trim()}
                </span>
              </span>
            )}

            {(() => {
              const safeWikiHref = getSafeExternalUrl(app.wikiUrl);
              if (!safeWikiHref) return null;
              return (
                <a
                  href={safeWikiHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  title={`Open Application Wiki: ${safeWikiHref}`}
                  className={`nodrag nopan relative z-20 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-[#121828] hover:bg-[#192238] text-indigo-200 hover:text-white border-indigo-400/30 hover:border-indigo-400/70'
                      : 'bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-800 hover:text-indigo-950 border-indigo-200 hover:border-indigo-300'
                  }`}
                >
                  <BookOpen className="h-2.5 w-2.5 shrink-0 text-indigo-400" />
                  <span className="truncate max-w-[140px] underline decoration-indigo-400/50 underline-offset-2">
                    {formatExternalUrlLabel(app.wikiUrl)}
                  </span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-75" />
                </a>
              );
            })()}
          </div>
        )}
      </div>

      {/* KPI Summary Strip */}
      <div
        className={`px-4 py-2 border-y grid grid-cols-4 gap-1 text-center ${
          isDark
            ? 'bg-[#0d1019]/75 border-[#1e2638]'
            : 'bg-slate-50/80 border-slate-200/75'
        }`}
      >
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
            Dependencies
          </div>
          <div
            className={`text-xs font-mono font-bold ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}
          >
            {app.builtOnApplications?.length || 0}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
            Modules
          </div>
          <div
            className={`text-xs font-mono font-bold ${
              isDark ? 'text-indigo-300' : 'text-indigo-700'
            }`}
          >
            {app.rulesets?.length || 0}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
            Workflows
          </div>
          <div
            className={`text-xs font-mono font-bold ${
              isDark ? 'text-sky-300' : 'text-sky-700'
            }`}
          >
            {app.caseTypes?.length || 0}
          </div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
            Entities
          </div>
          <div
            className={`text-xs font-mono font-bold ${
              isDark ? 'text-violet-300' : 'text-violet-700'
            }`}
          >
            {app.dataTypes?.length || 0}
          </div>
        </div>
      </div>

      {/* Body Sections */}
      <div className="p-3 space-y-2.5">
        {/* 1. Dependencies & Parent Systems */}
        <div
          className={`p-2.5 rounded-lg border ${
            isDark
              ? 'bg-[#0d111a]/65 border-[#1c2334]'
              : 'bg-slate-50/70 border-slate-200/70'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Layers className="h-3 w-3 text-indigo-400" />
              <span>Dependencies & Parent Systems</span>
            </span>
          </div>
          {!app.builtOnApplications || app.builtOnApplications.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic">
              No parent / upstream dependencies mapped
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {app.builtOnApplications.map((boName, idx) => {
                const targetAppId = appIdByName[boName.trim().toLowerCase()];
                return (
                  <button
                    key={`${boName}-${idx}`}
                    type="button"
                    disabled={!targetAppId}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (targetAppId) {
                        selectApp(targetAppId);
                      }
                    }}
                    title={
                      targetAppId
                        ? `Inspect Dependency "${boName}"`
                        : boName
                    }
                    className={`nodrag nopan inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border transition-colors ${
                      targetAppId ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      isDark
                        ? 'bg-[#161d2e] hover:bg-[#1e273d] text-indigo-200 border-indigo-500/30 hover:border-indigo-400/60'
                        : 'bg-indigo-50/70 hover:bg-indigo-100/80 text-indigo-900 border-indigo-200 hover:border-indigo-300'
                    }`}
                  >
                    <GitBranch className="h-2.5 w-2.5 text-indigo-400 shrink-0" />
                    <span className="truncate max-w-[200px]">{boName}</span>
                    {targetAppId && (
                      <ArrowUpRight className="h-2.5 w-2.5 opacity-60 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Modules & Workflows Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Modules */}
          <div
            className={`p-2.5 rounded-lg border ${
              isDark
                ? 'bg-[#0d111a]/65 border-[#1c2334]'
                : 'bg-slate-50/70 border-slate-200/70'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Code2 className="h-3 w-3 text-indigo-400" />
                <span>Modules</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {app.rulesets?.length || 0}
              </span>
            </div>
            {!app.rulesets || app.rulesets.length === 0 ? (
              <div className="text-[10px] text-slate-500 italic">
                Click to add modules
              </div>
            ) : (
              <div className="space-y-1">
                {app.rulesets.slice(0, 4).map((rs) => (
                  <div
                    key={rs.id}
                    className={`flex items-center justify-between gap-1 text-[10px] px-1.5 py-1 rounded border ${
                      isDark
                        ? 'bg-[#131826] border-[#1f293d] text-slate-200'
                        : 'bg-white border-slate-200/80 text-slate-700'
                    }`}
                  >
                    <span className="font-medium truncate">{rs.name}</span>
                    <span className="font-mono text-[9px] text-indigo-400 shrink-0">
                      {rs.version}
                    </span>
                  </div>
                ))}
                {app.rulesets.length > 4 && (
                  <div className="text-[10px] text-slate-500 text-center pt-0.5">
                    +{app.rulesets.length - 4} more modules
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Workflows */}
          <div
            className={`p-2.5 rounded-lg border ${
              isDark
                ? 'bg-[#0d111a]/65 border-[#1c2334]'
                : 'bg-slate-50/70 border-slate-200/70'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <FolderKanban className="h-3 w-3 text-sky-400" />
                <span>Workflows</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {app.caseTypes?.length || 0}
              </span>
            </div>
            {!app.caseTypes || app.caseTypes.length === 0 ? (
              <div className="text-[10px] text-slate-500 italic">
                Click to add workflows
              </div>
            ) : (
              <div className="space-y-1">
                {app.caseTypes.slice(0, 4).map((ct) => (
                  <div
                    key={ct.id}
                    className={`flex items-center justify-between gap-1 text-[10px] px-1.5 py-1 rounded border ${
                      isDark
                        ? 'bg-[#131826] border-[#1f293d] text-slate-200'
                        : 'bg-white border-slate-200/80 text-slate-700'
                    }`}
                  >
                    <span className="font-medium truncate">{ct.name}</span>
                    {ct.workPoolPrefix && (
                      <span className="font-mono text-[9px] text-sky-400 shrink-0">
                        {ct.workPoolPrefix}
                      </span>
                    )}
                  </div>
                ))}
                {app.caseTypes.length > 4 && (
                  <div className="text-[10px] text-slate-500 text-center pt-0.5">
                    +{app.caseTypes.length - 4} more workflows
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. Data Entities & Integrations */}
        {((app.dataTypes && app.dataTypes.length > 0) ||
          (app.integrations && app.integrations.length > 0)) && (
          <div
            className={`p-2.5 rounded-lg border ${
              isDark
                ? 'bg-[#0d111a]/65 border-[#1c2334]'
                : 'bg-slate-50/70 border-slate-200/70'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Database className="h-3 w-3 text-violet-400" />
                <span>Data Entities & Integrations</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {(app.dataTypes?.length || 0) + (app.integrations?.length || 0)}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {(app.dataTypes || []).map((dt) => (
                <span
                  key={dt.id}
                  title={`Source: ${dt.sourceSystem} (${dt.scope})`}
                  className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border ${
                    isDark
                      ? 'bg-[#151a28] text-violet-200 border-violet-500/25'
                      : 'bg-violet-50/80 text-violet-900 border-violet-200'
                  }`}
                >
                  <Database className="h-2.5 w-2.5 text-violet-400 shrink-0" />
                  <span className="truncate max-w-[130px]">{dt.name}</span>
                </span>
              ))}
              {(app.integrations || []).map((intName, idx) => (
                <span
                  key={`${intName}-${idx}`}
                  className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border ${
                    isDark
                      ? 'bg-[#141b26] text-emerald-200 border-emerald-500/25'
                      : 'bg-emerald-50/80 text-emerald-900 border-emerald-200'
                  }`}
                >
                  <Plug className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[130px]">{intName}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 4. Mapped Teams / Squads (Cross-View Integration) */}
        <div
          className={`p-2.5 rounded-lg border ${
            isDark
              ? 'bg-[#0f1523]/90 border-[#212b42]'
              : 'bg-indigo-50/35 border-indigo-200/60'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Users className="h-3 w-3 text-indigo-400" />
              <span>Mapped Squads ({mappedTeams.length})</span>
            </span>
            {mappedTeams.length > 0 && (
              <span className="text-[10px] font-mono text-indigo-400 font-semibold">
                {totalMappedMembers} mbrs · {totalMappedFte.toFixed(1)} FTE
              </span>
            )}
          </div>

          {mappedTeams.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic">
              No squads mapped yet — click card to assign squads
            </div>
          ) : (
            <div className="space-y-1">
              {mappedTeams.map((team) => {
                const vert = verticalMap[team.verticalId];
                const fte = team.members.reduce(
                  (sum, m) => sum + m.allocation / 100,
                  0
                );
                return (
                  <div
                    key={team.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewMode('teams');
                      selectTeam(team.id);
                    }}
                    title="Click to jump to this squad on the Teams & Verticals board"
                    className={`nodrag flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-[#141b2d] hover:bg-[#1a243b] border-[#24304c] text-slate-100'
                        : 'bg-white hover:bg-indigo-50/60 border-slate-200/90 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-1.5">
                      <Boxes className="h-3 w-3 text-indigo-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate leading-tight">
                          {team.name}
                        </div>
                        {vert && (
                          <div className="text-[10px] text-slate-400 truncate">
                            {vert.name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          isDark
                            ? 'bg-[#0d121f] text-slate-300 border-[#222c44]'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {fte.toFixed(1)} FTE
                      </span>
                      <ArrowUpRight className="h-3 w-3 text-slate-400 opacity-75" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
