/**
 * Centralized 2026 Enterprise Design System Tokens for ChapterMap.
 * Guarantees 100% visual and semantic color consistency across all surfaces,
 * modals, drawers, HUD bars, inputs, toggles, and destructive actions.
 */

export const getPanelSurfaceClass = (isDark: boolean) =>
  isDark
    ? 'bg-[#0e121c]/96 border-[#20283a] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_60px_rgba(0,0,0,0.7)]'
    : 'bg-white/98 border-slate-200/90 text-slate-900 shadow-[0_16px_40px_-10px_rgba(15,23,42,0.14)]';

export const getPopoverSurfaceClass = (isDark: boolean) =>
  isDark
    ? 'bg-[#0e121c]/98 border-[#242e44] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_50px_rgba(0,0,0,0.75)]'
    : 'bg-white/98 border-slate-200 text-slate-900 shadow-[0_16px_36px_-8px_rgba(15,23,42,0.15)]';

export const getHeaderFooterSurfaceClass = (isDark: boolean) =>
  isDark
    ? 'bg-[#111622]/95 border-[#1f273a]'
    : 'bg-slate-50/95 border-slate-200';

export const getHeaderIconBadgeClass = (isDark: boolean) =>
  isDark
    ? 'bg-[#171e2f] border-[#26314a] text-indigo-300'
    : 'bg-indigo-50 border-indigo-200 text-indigo-700';

export const getSubCardSurfaceClass = (isDark: boolean) =>
  isDark
    ? 'bg-[#121723]/90 border-[#222b3e] text-slate-100'
    : 'bg-slate-50/90 border-slate-200 text-slate-900';

export const getInputSurfaceClass = (isDark: boolean) =>
  isDark
    ? 'bg-[#0b0e17] border-[#222b3e] text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/60'
    : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500';

export const getPrimaryButtonClass = () =>
  'bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white border border-indigo-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_2px_8px_rgba(79,70,229,0.25)]';

export const getSecondaryButtonClass = (isDark: boolean) =>
  isDark
    ? 'bg-[#151b29] hover:bg-[#1c2436] text-slate-200 border border-[#242e44]'
    : 'bg-slate-100 hover:bg-slate-200/85 text-slate-800 border border-slate-200/90';

export const getDisabledButtonClass = (isDark: boolean) =>
  isDark
    ? 'bg-[#0c101a]/50 text-slate-600 border border-[#181f2e] cursor-not-allowed'
    : 'bg-slate-100/40 text-slate-300 border border-slate-200/50 cursor-not-allowed';

export const getActiveToggleClass = (isDark: boolean) =>
  isDark
    ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-400/50 shadow-[inset_0_1px_0_rgba(129,140,248,0.2)]'
    : 'bg-indigo-600 text-white border border-indigo-600 shadow-2xs';

export const getInactiveToggleClass = (isDark: boolean) =>
  isDark
    ? 'text-slate-400 hover:text-slate-200 border border-transparent'
    : 'text-slate-500 hover:text-slate-800 border border-transparent';

export const getCloseButtonClass = (isDark: boolean) =>
  isDark
    ? 'hover:bg-[#1a2234] text-slate-400 hover:text-slate-100'
    : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900';

/**
 * Canonical Destructive / Destroy Styling used across the ENTIRE application.
 * Every delete/remove/reset/unlink button shares the exact same semantic rose palette.
 */
export const getDangerButtonClass = (isDark: boolean) =>
  isDark
    ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 shadow-2xs';

export const getDangerIconButtonClass = (isDark: boolean) =>
  isDark
    ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/35'
    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200';
