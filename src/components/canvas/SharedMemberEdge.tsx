import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
} from '@xyflow/react';
import { Share2 } from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';

export interface SharedMemberEdgeData extends Record<string, unknown> {
  memberName: string;
  normalizedName: string;
  role: string;
  sourceAlloc: number;
  targetAlloc: number;
  arcOffset?: number;
}

export const SharedMemberEdge: React.FC<EdgeProps> = React.memo(
  ({ id, sourceX, sourceY, targetX, targetY, data }) => {
    const edgeData = data as unknown as SharedMemberEdgeData;
    const theme = useTopologyStore((s) => s.theme);
    const hoveredMemberName = useTopologyStore((s) => s.hoveredMemberName);
    const setHoveredMemberName = useTopologyStore((s) => s.setHoveredMemberName);

    const isDark = theme === 'dark';
    const isHovered =
      Boolean(hoveredMemberName) &&
      hoveredMemberName!.trim().toLowerCase() === edgeData?.normalizedName;

    const arcDepth = 48 + (edgeData?.arcOffset || 0) * 30;
    const bottomY = Math.max(sourceY, targetY) + arcDepth;
    const midX = (sourceX + targetX) / 2;

    const edgePath = `M ${sourceX} ${sourceY} C ${sourceX} ${bottomY}, ${targetX} ${bottomY}, ${targetX} ${targetY}`;
    const labelX = midX;
    const labelY = 0.125 * sourceY + 0.75 * bottomY + 0.125 * targetY;

    const strokeColor = isHovered
      ? '#818cf8'
      : isDark
      ? 'rgba(148, 163, 184, 0.30)'
      : 'rgba(100, 116, 139, 0.35)';

    return (
      <>
        {isHovered && (
          <path
            d={edgePath}
            fill="none"
            stroke="#818cf8"
            strokeWidth={5}
            strokeOpacity={0.22}
            className="pointer-events-none"
          />
        )}
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke: strokeColor,
            strokeWidth: isHovered ? 2.2 : 1.5,
            strokeDasharray: '5 5',
            animation: isHovered
              ? 'chaptermap-dash 1.2s linear infinite'
              : undefined,
          }}
        />

        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            onMouseEnter={() => setHoveredMemberName(edgeData.memberName)}
            onMouseLeave={() => setHoveredMemberName(null)}
            className={`nodrag nopan flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border backdrop-blur-md transition-colors cursor-pointer ${
              isHovered
                ? 'bg-[#131829] text-indigo-200 border-indigo-400 shadow-lg z-50'
                : isDark
                ? 'bg-[#0f131d]/92 text-slate-300 border-[#222b3e] hover:border-indigo-400/50 hover:text-slate-100 z-20'
                : 'bg-white/95 text-slate-600 border-slate-200 hover:border-indigo-300 shadow-2xs z-20'
            }`}
          >
            <Share2 className="h-2.5 w-2.5 shrink-0 text-indigo-400" />
            <span className="font-medium">{edgeData?.memberName}</span>
            <span className="opacity-65 font-mono">
              {edgeData?.sourceAlloc}%↔{edgeData?.targetAlloc}%
            </span>
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
);
