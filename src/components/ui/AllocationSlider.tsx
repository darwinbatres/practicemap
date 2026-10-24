import React from 'react';
import { useTopologyStore } from '../../store/useTopologyStore';

interface AllocationSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export const AllocationSlider: React.FC<AllocationSliderProps> = ({
  value,
  onChange,
  min = 5,
  max = 100,
  step = 5,
  className = '',
}) => {
  const theme = useTopologyStore((s) => s.theme);
  const isDark = theme === 'dark';

  const clamped = Math.min(max, Math.max(min, Math.round(value || 100)));
  const fillPct = ((clamped - min) / (max - min)) * 100;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex-1 flex items-center h-6">
        {/* Track Background + Dynamic Fill Bar */}
        <div
          className={`w-full h-2 rounded-full overflow-hidden border ${
            isDark
              ? 'bg-[#090c14] border-[#1f283b]'
              : 'bg-slate-200/90 border-slate-300/80'
          }`}
        >
          <div
            style={{ width: `${fillPct}%` }}
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-[width] duration-75"
          />
        </div>

        {/* Custom Thumb Visual Indicator */}
        <div
          style={{ left: `calc(${fillPct}% - 7px)` }}
          className={`pointer-events-none absolute h-3.5 w-3.5 rounded-full border-2 shadow-sm transition-[left] duration-75 ${
            isDark
              ? 'bg-slate-100 border-indigo-500 shadow-black/60'
              : 'bg-white border-indigo-600 shadow-slate-900/20'
          }`}
        />

        {/* Native Range Input Overlay for accessible drag/keyboard control */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={clamped}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Member allocation percentage"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      {/* Live Monospace Readout */}
      <span
        className={`min-w-[42px] text-center text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md border shrink-0 ${
          isDark
            ? 'bg-[#141a29] text-indigo-200 border-indigo-400/35'
            : 'bg-indigo-50 text-indigo-800 border-indigo-200'
        }`}
      >
        {clamped}%
      </span>
    </div>
  );
};
