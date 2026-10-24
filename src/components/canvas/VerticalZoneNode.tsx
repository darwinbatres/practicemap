import React from 'react';
import { NodeProps } from '@xyflow/react';
import {
  Layers,
  Plus,
  Users,
} from 'lucide-react';
import {
  BusinessVertical,
  VERTICAL_COLOR_THEMES,
} from '../../types/topology';
import { useTopologyStore } from '../../store/useTopologyStore';
import {
  getPrimaryButtonClass,
  getSecondaryButtonClass,
} from '../../utils/uiTheme';

export interface VerticalZoneNodeData extends Record<string, unknown> {
  vertical: BusinessVertical;
  width: number;
  height: number;
  squadCount: number;
  memberCount: number;
  totalFte: number;
  isDimmed: boolean;
  isSelected: boolean;
}

export const VerticalZoneNode: React.FC<NodeProps> = React.memo(({ data }) => {
  const {
    vertical,
    width,
    height,
    squadCount,
    memberCount,
    totalFte,
    isDimmed,
    isSelected,
  } = data as unknown as VerticalZoneNodeData;

  const theme = useTopologyStore((s) => s.theme);
  const selectVertical = useTopologyStore((s) => s.selectVertical);
  const addTeam = useTopologyStore((s) => s.addTeam);

  const isDark = theme === 'dark';
  const colorConfig =
    VERTICAL_COLOR_THEMES[vertical.color] || VERTICAL_COLOR_THEMES.slate;

  return (
    <div
      style={{ width, height }}
      className={`pointer-events-none group relative rounded-2xl border transition-opacity duration-150 select-none ${
        isDark
          ? `${colorConfig.zoneBgDark} ${colorConfig.zoneBorderDark} shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_40px_-15px_rgba(0,0,0,0.6)]`
          : `${colorConfig.zoneBgLight} ${colorConfig.zoneBorderLight} shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_30px_-12px_rgba(15,23,42,0.06)]`
      } ${
        isSelected
          ? isDark
            ? 'ring-2 ring-indigo-400/70 shadow-2xl'
            : 'ring-2 ring-indigo-500/80 shadow-2xl'
          : ''
      } ${isDimmed ? 'opacity-25' : 'opacity-100'}`}
    >
      {/* Top Specular Accent Line */}
      <div
        className="pointer-events-none absolute top-0 left-8 right-8 h-[1.5px] rounded-full opacity-75"
        style={{
          background: `linear-gradient(90deg, transparent, ${colorConfig.hex}, transparent)`,
        }}
      />

      {/* Zone Header Bar (pointer-events-auto so only header captures clicks/drags for the Vertical) */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          selectVertical(vertical.id);
        }}
        className={`pointer-events-auto vertical-drag-handle relative z-10 flex items-center justify-between px-5 py-3 rounded-t-2xl cursor-grab active:cursor-grabbing backdrop-blur-md transition-colors ${
          isDark ? colorConfig.headerBgDark : colorConfig.headerBgLight
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: colorConfig.hex,
              boxShadow: `0 0 10px ${colorConfig.hex}80`,
            }}
          />
          <h2
            className={`text-sm font-bold tracking-tight truncate ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            {vertical.name}
          </h2>
        </div>

        {/* Right Zone Metrics & Quick Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={`hidden sm:flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-lg border whitespace-nowrap ${
              isDark
                ? 'bg-[#0b0e16]/80 border-[#1e2638] text-slate-400'
                : 'bg-slate-50/90 border-slate-200/90 text-slate-600'
            }`}
          >
            {width >= 560 && (
              <>
                <span className="flex items-center gap-1" title="Squads in Vertical">
                  <Layers className="h-3 w-3 opacity-70" />
                  {squadCount} {squadCount === 1 ? 'Squad' : 'Squads'}
                </span>
                <span className="opacity-30">•</span>
                <span
                  className="flex items-center gap-1"
                  title="Chapter Members Assigned"
                >
                  <Users className="h-3 w-3 opacity-70" />
                  {memberCount}
                </span>
                <span className="opacity-30">•</span>
              </>
            )}
            <span
              className={`font-mono text-[11px] font-semibold ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              {totalFte.toFixed(1)} FTE
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addTeam({ verticalId: vertical.id });
            }}
            title={`Add Squad to ${vertical.name}`}
            className={`nodrag flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap ${getSecondaryButtonClass(
              isDark
            )}`}
          >
            <Plus className="h-3.5 w-3.5 text-indigo-400" />
            <span>Squad</span>
          </button>
        </div>
      </div>

      {/* Empty State if Vertical has 0 Squads */}
      {squadCount === 0 && (
        <div className="pointer-events-auto flex flex-col items-center justify-center h-[calc(100%-58px)] p-6 text-center">
          <p
            className={`text-xs mb-3 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            No squads assigned to <strong>{vertical.name}</strong> yet.
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addTeam({ verticalId: vertical.id });
            }}
            className={`nodrag inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs ${getPrimaryButtonClass()}`}
          >
            <Plus className="h-3.5 w-3.5" />
            Create Squad in {vertical.name}
          </button>
        </div>
      )}
    </div>
  );
});
