import React from 'react';
import { useTopologyStore } from '../../store/useTopologyStore';

/**
 * Persistent floating X (Twitter) icon link on the bottom-right of the viewport.
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
        title="@darwinbatres on X"
        className={`pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-xl border backdrop-blur-2xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
          isDark
            ? 'bg-[#0e121c]/95 border-[#20283a] hover:border-indigo-400/50 text-slate-300 hover:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_40px_rgba(0,0,0,0.65)]'
            : 'bg-white/95 border-slate-200/90 hover:border-indigo-300 text-slate-700 hover:text-slate-950 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.14)]'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-4 w-4 fill-current"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
    </div>
  );
};

