import React, { useMemo } from 'react';
import { Handle, NodeProps, Position } from '@xyflow/react';
import {
  BookOpen,
  Box,
  Compass,
  ExternalLink,
  Share2,
  UserPlus,
} from 'lucide-react';
import {
  BusinessVertical,
  formatExternalUrlLabel,
  getInitials,
  getRoleMetadata,
  getSafeExternalUrl,
  TeamSquad,
} from '../../types/topology';
import { useTopologyStore } from '../../store/useTopologyStore';
import { TEAM_CARD_WIDTH } from '../../utils/layoutEngine';

export interface TeamCardNodeData extends Record<string, unknown> {
  team: TeamSquad;
  vertical?: BusinessVertical;
  sharedMemberNames: string[];
  isDimmed: boolean;
  isSelected: boolean;
  activeRoleFilter: string | null;
}

export const TeamCardNode: React.FC<NodeProps> = React.memo(({ data }) => {
  const {
    team,
    sharedMemberNames,
    isDimmed,
    isSelected,
    activeRoleFilter,
  } = data as unknown as TeamCardNodeData;

  const theme = useTopologyStore((s) => s.theme);
  const selectTeam = useTopologyStore((s) => s.selectTeam);
  const hoveredNorm = useTopologyStore((s) => {
    const h = s.hoveredMemberName?.trim().toLowerCase();
    if (!h) return null;
    return team.members.some((m) => m.name.trim().toLowerCase() === h)
      ? h
      : null;
  });
  const setHoveredMemberName = useTopologyStore((s) => s.setHoveredMemberName);
  const spotlightFilter = useTopologyStore((s) => s.spotlightFilter);

  const isDark = theme === 'dark';

  const sharedSet = useMemo(
    () => new Set(sharedMemberNames),
    [sharedMemberNames]
  );

  const isHighlightedByHover = hoveredNorm !== null;

  // Compute Discipline Mix Bar ratios
  let architectCount = 0;
  let frontendCount = 0;
  let specialistCount = 0;

  for (const m of team.members) {
    const meta = getRoleMetadata(m.role);
    if (meta.category === 'architect') architectCount += 1;
    else if (meta.category === 'frontend') frontendCount += 1;
    else specialistCount += 1;
  }

  const totalMembers = Math.max(1, team.members.length);
  const archPct = Math.round((architectCount / totalMembers) * 100);
  const frontPct = Math.round((frontendCount / totalMembers) * 100);
  const specPct = Math.max(0, 100 - archPct - frontPct);

  const squadFte = team.members.reduce(
    (sum, m) => sum + m.allocation / 100,
    0
  );

  return (
    <div
      style={{ width: TEAM_CARD_WIDTH }}
      onClick={(e) => {
        e.stopPropagation();
        selectTeam(team.id);
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
      } ${
        isHighlightedByHover
          ? 'ring-2 ring-indigo-400 border-indigo-400 shadow-lg'
          : ''
      } ${isDimmed ? 'opacity-25' : 'opacity-100'}`}
    >
      {/* Hidden React Flow Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="right-src"
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
        position={Position.Bottom}
        id="bottom-src"
        className="!w-2 !h-2 !bg-transparent !border-0 !pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-tgt"
        className="!w-2 !h-2 !bg-transparent !border-0 !pointer-events-none"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-tgt"
        className="!w-2 !h-2 !bg-transparent !border-0 !pointer-events-none"
      />

      {/* Card Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          {/* Squad Name */}
          <h3
            className={`text-[15px] font-bold tracking-tight leading-snug ${
              isDark ? 'text-slate-50' : 'text-slate-900'
            }`}
          >
            {team.name}
          </h3>

          <span
            className={`shrink-0 text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-md border ${
              isDark
                ? 'bg-[#171d2c] text-slate-200 border-[#252f45]'
                : 'bg-slate-100 text-slate-700 border-slate-200/80'
            }`}
          >
            {squadFte.toFixed(1)} FTE
          </span>
        </div>

        {/* Application, Initiative & Wiki Badges */}
        {(team.pegaApplication ||
          team.initiative ||
          team.wikiUrl?.trim()) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {team.pegaApplication && (
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                  isDark
                    ? 'bg-[#161c2c] text-slate-100 border-[#26314a]'
                    : 'bg-slate-100 text-slate-900 border-slate-200'
                }`}
              >
                <Box className="h-3 w-3 shrink-0 text-indigo-400" />
                <span className="truncate max-w-[175px]">
                  {team.pegaApplication}
                </span>
              </span>
            )}

            {team.initiative && (
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                  isDark
                    ? 'bg-[#0e121b] text-slate-300 border-[#1e2638]'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <Compass className="h-3 w-3 shrink-0 text-indigo-400/80" />
                <span className="truncate max-w-[180px]">{team.initiative}</span>
              </span>
            )}

            {(() => {
              const safeWikiHref = getSafeExternalUrl(team.wikiUrl);
              if (!safeWikiHref) return null;
              return (
                <a
                  href={safeWikiHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  title={`Open Squad Wiki: ${safeWikiHref}`}
                  className={`nodrag nopan relative z-20 inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-md border transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-[#121828] hover:bg-[#192238] text-indigo-200 hover:text-white border-indigo-400/30 hover:border-indigo-400/70'
                      : 'bg-indigo-50/80 hover:bg-indigo-100/80 text-indigo-800 hover:text-indigo-950 border-indigo-200 hover:border-indigo-300'
                  }`}
                >
                  <BookOpen className="h-3 w-3 shrink-0 text-indigo-400" />
                  <span className="truncate max-w-[195px] underline decoration-indigo-400/50 underline-offset-2">
                    {formatExternalUrlLabel(team.wikiUrl)}
                  </span>
                  <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-75" />
                </a>
              );
            })()}
          </div>
        )}
      </div>

      {/* Harmonious 2026 Discipline Composition Bar */}
      <div
        className={`px-4 py-2 border-y ${
          isDark
            ? 'bg-[#0d1019]/75 border-[#1e2638]'
            : 'bg-slate-50/80 border-slate-200/75'
        }`}
      >
        <div className="flex items-center justify-between text-[10px] font-medium mb-1.5">
          <span className="text-slate-500">Discipline Mix</span>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                Arch {architectCount}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                FE {frontendCount}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                Spec {specialistCount}
              </span>
            </span>
          </div>
        </div>

        <div
          className={`h-1.5 w-full rounded-full overflow-hidden flex gap-0.5 ${
            isDark ? 'bg-[#1a2133]' : 'bg-slate-200/90'
          }`}
        >
          {architectCount > 0 && (
            <div
              style={{ width: `${archPct}%` }}
              className="h-full bg-indigo-400 rounded-l-full"
              title={`Architects: ${architectCount} (${archPct}%)`}
            />
          )}
          {frontendCount > 0 && (
            <div
              style={{ width: `${frontPct}%` }}
              className="h-full bg-sky-400"
              title={`Frontend / Constellation: ${frontendCount} (${frontPct}%)`}
            />
          )}
          {specialistCount > 0 && (
            <div
              style={{ width: `${specPct}%` }}
              className="h-full bg-violet-400 rounded-r-full"
              title={`Specialists: ${specialistCount} (${specPct}%)`}
            />
          )}
        </div>
      </div>

      {/* Member Roster (Draggable anywhere on card!) */}
      <div className="p-2.5 space-y-1">
        {team.members.length === 0 ? (
          <div
            className={`flex items-center justify-center gap-1.5 py-4 text-xs rounded-lg border border-dashed ${
              isDark
                ? 'border-[#222a3d] text-slate-500'
                : 'border-slate-200 text-slate-400'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Click to assign chapter members</span>
          </div>
        ) : (
          team.members.map((member) => {
            const roleMeta = getRoleMetadata(member.role);
            const normName = member.name.trim().toLowerCase();
            const isShared = sharedSet.has(normName);
            const isMemberHovered = hoveredNorm === normName;
            const isOutsourced = member.employmentType === 'outsourcing';
            const companyLabel = member.company?.trim() || '';

            const isRoleHighlighted =
              (activeRoleFilter &&
                member.role.toLowerCase() === activeRoleFilter.toLowerCase()) ||
              (spotlightFilter.type === 'sourcing' &&
                (member.employmentType || 'internal') ===
                  spotlightFilter.value) ||
              (spotlightFilter.type === 'company' &&
                Boolean(companyLabel) &&
                companyLabel.toLowerCase() ===
                  spotlightFilter.value.toLowerCase());

            return (
              <div
                key={member.id}
                onMouseEnter={
                  isShared
                    ? () => setHoveredMemberName(member.name.trim())
                    : undefined
                }
                onMouseLeave={
                  isShared ? () => setHoveredMemberName(null) : undefined
                }
                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border transition-colors ${
                  isMemberHovered
                    ? isDark
                      ? 'bg-indigo-500/15 border-indigo-400/60'
                      : 'bg-indigo-50/80 border-indigo-300'
                    : isRoleHighlighted
                    ? isDark
                      ? 'bg-[#1b2234] border-indigo-400/50'
                      : 'bg-indigo-50/50 border-indigo-300'
                    : isDark
                    ? 'bg-[#0d111a]/65 hover:bg-[#161c2b] border-[#1c2334]'
                    : 'bg-slate-50/65 hover:bg-slate-100/80 border-slate-200/65'
                }`}
              >
                {/* Avatar + Name + Sourcing & Company Sub-line */}
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 border ${
                      isDark
                        ? 'bg-[#181f30] text-slate-300 border-[#28334d]'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {getInitials(member.name)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`text-xs font-medium truncate leading-tight ${
                          isDark ? 'text-slate-100' : 'text-slate-800'
                        }`}
                      >
                        {member.name}
                      </span>

                      {isShared && (
                        <span
                          title={`${member.name} is shared across multiple squads`}
                          className={`inline-flex items-center gap-0.5 text-[9px] font-medium px-1 py-0.2 rounded shrink-0 ${
                            isMemberHovered
                              ? 'bg-indigo-500 text-white'
                              : isDark
                              ? 'bg-indigo-400/12 text-indigo-300 border border-indigo-400/25'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          <Share2 className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] leading-tight mt-0.5 truncate">
                      <span
                        className={
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }
                      >
                        {isOutsourced ? 'Outsourcing' : 'Internal'}
                      </span>
                      {companyLabel &&
                        companyLabel.toLowerCase() !==
                          (isOutsourced ? 'outsourcing' : 'internal') && (
                          <>
                            <span className="opacity-35">·</span>
                            <span
                              className={`truncate font-medium ${
                                isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}
                            >
                              {companyLabel}
                            </span>
                          </>
                        )}
                    </div>
                  </div>
                </div>

                {/* Unified Role Chip (with Discipline Dot) & Allocation % Badge */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {member.role?.trim() && (
                    <span
                      title={member.role}
                      className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                        isDark ? roleMeta.badgeDark : roleMeta.badgeLight
                      }`}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: roleMeta.dotColor }}
                      />
                      <span className="truncate max-w-[90px]">
                        {roleMeta.shortLabel}
                      </span>
                    </span>
                  )}

                  <span
                    title={`Allocation: ${member.allocation}%`}
                    className={`relative overflow-hidden min-w-[38px] text-center text-[10px] font-mono font-medium px-1.5 py-0.5 rounded-md border ${
                      isDark
                        ? 'bg-[#0b0e16] text-slate-200 border-[#232d45]'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span
                      style={{
                        width: `${Math.min(100, Math.max(0, member.allocation))}%`,
                      }}
                      className={`pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-150 ${
                        isDark ? 'bg-indigo-500/25' : 'bg-indigo-500/15'
                      }`}
                    />
                    <span className="relative z-10">{member.allocation}%</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
