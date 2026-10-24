import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';

/**
 * Persistent floating author signature badge on the bottom-right of the viewport.
 * Links to @darwinbatres on X (Twitter) and adapts to both Dark and Light themes.
 */
export const AuthorSignatureBadge: React.FC = () => {
  const theme = useTopologyStore((s) => s.theme);
  const isDark = theme === 'dark';

  return (
    <div className="pointer-events-none fixed bottom-4 right-3 z-30 flex items-center">
      <a
        href="https://x.com/darwinbatres"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Follow @darwinbatres on X (Twitter)"
        title="Built by @darwinbatres — Open on X / Twitter"
        className={`pointer-events-auto group relative inline-flex items-center gap-2 px-3 py-2 rounded-2xl border backdrop-blur-2xl text-xs font-medium transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 ${
          isDark
            ? 'bg-[#0e121c]/95 border-[#20283a] hover:border-indigo-400/50 text-slate-200 hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_40px_rgba(0,0,0,0.65)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_20px_44px_rgba(79,70,229,0.22)]'
            : 'bg-white/95 border-slate-200/90 hover:border-indigo-300 text-slate-700 hover:text-slate-950 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.14)] hover:shadow-[0_16px_36px_-6px_rgba(79,70,229,0.18)]'
        }`}
      >
        {/* Subtle flowing ambient glow on hover */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
            isDark
              ? 'bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-indigo-500/10'
              : 'bg-gradient-to-r from-indigo-500/5 via-sky-500/5 to-indigo-500/5'
          }`}
        />

        {/* X / Twitter Icon Badge */}
        <span
          className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200 ${
            isDark
              ? 'bg-[#151b29] border-[#26314a] text-slate-200 group-hover:bg-indigo-500/20 group-hover:border-indigo-400/40 group-hover:text-indigo-200'
              : 'bg-slate-100 border-slate-200/90 text-slate-800 group-hover:bg-indigo-50 group-hover:border-indigo-200 group-hover:text-indigo-700'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-3 w-3 fill-current"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </span>

        {/* Handle Text */}
        <span className="relative flex items-baseline gap-1 tracking-tight">
          <span
            className={`hidden sm:inline text-[11px] ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            by
          </span>
          <span className="font-mono text-[11px] font-semibold">
            @darwinbatres
          </span>
        </span>

        {/* External Arrow Indicator */}
        <ArrowUpRight
          className={`relative h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${
            isDark
              ? 'text-slate-400 group-hover:text-indigo-300'
              : 'text-slate-400 group-hover:text-indigo-600'
          }`}
        />
      </a>
    </div>
  );
};
