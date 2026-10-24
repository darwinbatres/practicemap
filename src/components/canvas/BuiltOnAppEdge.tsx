import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';

export interface BuiltOnAppEdgeData extends Record<string, unknown> {
  childAppName: string;
  parentAppName: string;
  isHighlighted?: boolean;
}

export const BuiltOnAppEdge: React.FC<EdgeProps> = React.memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  }) => {
    const edgeData = data as unknown as BuiltOnAppEdgeData;
    const theme = useTopologyStore((s) => s.theme);
    const isDark = theme === 'dark';
    const isHighlighted = Boolean(edgeData?.isHighlighted);

    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 16,
    });

    const strokeColor = isHighlighted
      ? '#818cf8'
      : isDark
      ? 'rgba(129, 140, 248, 0.45)'
      : 'rgba(79, 70, 229, 0.40)';

    return (
      <>
        {isHighlighted && (
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
            strokeWidth: isHighlighted ? 2.2 : 1.75,
            strokeDasharray: '6 4',
          }}
        />
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`nodrag nopan flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border backdrop-blur-md transition-colors ${
              isHighlighted
                ? 'bg-[#131829] text-indigo-200 border-indigo-400 shadow-lg z-50'
                : isDark
                ? 'bg-[#0f131d]/92 text-indigo-300 border-[#24304c] z-20'
                : 'bg-white/95 text-indigo-700 border-indigo-200 shadow-2xs z-20'
            }`}
          >
            <GitBranch className="h-2.5 w-2.5 shrink-0 text-indigo-400" />
            <span>Depends on {edgeData?.parentAppName}</span>
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
);
