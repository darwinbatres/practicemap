import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  FileSpreadsheet,
  Link2,
  Link2Off,
  RefreshCw,
  Save,
  Sparkles,
  Unlink,
  Upload,
  X,
} from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import { serializeTopologyToMarkdown } from '../../utils/markdownEngine';
import {
  getActiveToggleClass,
  getCloseButtonClass,
  getDangerIconButtonClass,
  getHeaderFooterSurfaceClass,
  getHeaderIconBadgeClass,
  getInactiveToggleClass,
  getPanelSurfaceClass,
  getPrimaryButtonClass,
  getSecondaryButtonClass,
} from '../../utils/uiTheme';

export const LiveMarkdownDrawer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isOpen = useTopologyStore((s) => s.isMarkdownDrawerOpen);
  const setMarkdownDrawerOpen = useTopologyStore(
    (s) => s.setMarkdownDrawerOpen
  );
  const excelSheetTab = useTopologyStore((s) => s.excelSheetTab);
  const setExcelSheetTab = useTopologyStore((s) => s.setExcelSheetTab);
  const fileFormat = useTopologyStore((s) => s.fileFormat);
  const setFileFormat = useTopologyStore((s) => s.setFileFormat);
  const markdownText = useTopologyStore((s) => s.markdownText);
  const updateFromMarkdownEditor = useTopologyStore(
    (s) => s.updateFromMarkdownEditor
  );
  const openLocalMarkdownFile = useTopologyStore(
    (s) => s.openLocalMarkdownFile
  );
  const importMarkdownFromFileObject = useTopologyStore(
    (s) => s.importMarkdownFromFileObject
  );
  const parseWarnings = useTopologyStore((s) => s.parseWarnings);
  const topology = useTopologyStore((s) => s.topology);
  const fileName = useTopologyStore((s) => s.fileName);
  const isFileLinked = useTopologyStore((s) => s.isFileLinked);
  const fileHandle = useTopologyStore((s) => s.fileHandle);
  const syncStatus = useTopologyStore((s) => s.syncStatus);
  const lastSavedAt = useTopologyStore((s) => s.lastSavedAt);
  const flushAutosaveNow = useTopologyStore((s) => s.flushAutosaveNow);
  const reconnectStoredFileHandle = useTopologyStore(
    (s) => s.reconnectStoredFileHandle
  );
  const unlinkLocalFile = useTopologyStore((s) => s.unlinkLocalFile);
  const requestConfirmation = useTopologyStore((s) => s.requestConfirmation);
  const downloadMarkdownSnapshot = useTopologyStore(
    (s) => s.downloadMarkdownSnapshot
  );
  const saveAsNewMarkdownFile = useTopologyStore(
    (s) => s.saveAsNewMarkdownFile
  );
  const theme = useTopologyStore((s) => s.theme);

  const isLinked = Boolean(fileHandle || isFileLinked);
  const activeFileName = fileHandle?.name || fileName;
  const linkedFormat: 'excel' | 'markdown' = /\.(xlsx|xls)$/i.test(
    activeFileName
  )
    ? 'excel'
    : /\.(md|markdown|txt)$/i.test(activeFileName)
    ? 'markdown'
    : fileFormat;

  const formattedSavedTime = useMemo(() => {
    if (!lastSavedAt) return '';
    try {
      return new Date(lastSavedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return '';
    }
  }, [lastSavedAt]);

  const verticalById = useMemo(
    () => new Map(topology.verticals.map((v) => [v.id, v])),
    [topology.verticals]
  );

  const rosterRows = useMemo(() => {
    if (!isOpen) return [];
    const rows: Array<{
      vertical: string;
      squad: string;
      wikiUrl: string;
      memberName: string;
      role: string;
      allocation: string;
      company: string;
      resourceType: string;
    }> = [];

    for (const team of topology.teams) {
      const verticalName =
        verticalById.get(team.verticalId)?.name || team.verticalId || '—';
      if (team.members.length === 0) {
        rows.push({
          vertical: verticalName,
          squad: team.name,
          wikiUrl: team.wikiUrl || '—',
          memberName: '— (Empty Squad)',
          role: '—',
          allocation: '—',
          company: '—',
          resourceType: '—',
        });
      } else {
        for (const m of team.members) {
          rows.push({
            vertical: verticalName,
            squad: team.name,
            wikiUrl: team.wikiUrl || '—',
            memberName: m.name,
            role: m.role || '—',
            allocation: `${m.allocation}%`,
            company: m.company || '—',
            resourceType:
              m.employmentType === 'outsourcing' ? 'Outsourcing' : 'Internal',
          });
        }
      }
    }
    return rows;
  }, [isOpen, topology.teams, verticalById]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const lineCount = markdownText.split('\n').length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignore
    }
  };

  const handleFormatClean = () => {
    const clean = serializeTopologyToMarkdown(topology);
    updateFromMarkdownEditor(clean);
  };

  const handleOpenOrImportClick = async () => {
    if (typeof window.showOpenFilePicker !== 'function') {
      fileInputRef.current?.click();
      return;
    }
    try {
      await openLocalMarkdownFile();
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.warn('File picker fallback triggered:', err);
      fileInputRef.current?.click();
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importMarkdownFromFileObject(file);
      e.target.value = '';
    }
  };

  return (
    <aside
      aria-label="Live Source Data Drawer"
      className={`fixed top-[68px] bottom-20 right-3 z-30 w-full max-w-[520px] rounded-2xl border backdrop-blur-2xl flex flex-col overflow-hidden ${getPanelSurfaceClass(
        isDark
      )}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,.xlsx,.xls"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Drawer Header */}
      <div
        className={`flex flex-col gap-2.5 px-4 py-3 border-b ${getHeaderFooterSurfaceClass(
          isDark
        )}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${getHeaderIconBadgeClass(
                isDark
              )}`}
            >
              {fileFormat === 'excel' ? (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              ) : (
                <Code2 className="h-3.5 w-3.5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold truncate">
                  {activeFileName}
                </span>
                {parseWarnings.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                    <AlertCircle className="h-2.5 w-2.5" />
                    {parseWarnings.length} Warning
                  </span>
                )}
              </div>
              <p
                className={`text-[10px] truncate ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {fileFormat === 'excel'
                  ? 'Multi-sheet Excel (.xlsx) workbook synchronized with canvas'
                  : 'Edit Markdown below — canvas updates live as you type'}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => setMarkdownDrawerOpen(false)}
            title="Close Source Drawer"
            aria-label="Close Source Drawer"
            className={`p-1.5 rounded-lg cursor-pointer transition-colors shrink-0 ${getCloseButtonClass(
              isDark
            )}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Explicit Disk Link & Live Auto-Save Status Banner */}
        {isLinked ? (
          <div
            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${
              syncStatus === 'permission-needed' || syncStatus === 'error'
                ? isDark
                  ? 'bg-amber-950/35 border-amber-500/40 text-amber-200'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
                : isDark
                ? 'bg-indigo-500/12 border-indigo-400/35 text-slate-100'
                : 'bg-indigo-50/85 border-indigo-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                  isDark
                    ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40'
                    : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                }`}
              >
                {linkedFormat === 'excel' ? (
                  <FileSpreadsheet className="h-3 w-3 text-indigo-400 shrink-0" />
                ) : (
                  <Code2 className="h-3 w-3 text-indigo-400 shrink-0" />
                )}
                <span>
                  LINKED • {linkedFormat === 'excel' ? 'EXCEL' : 'MARKDOWN'}
                </span>
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Link2 className="h-3 w-3 text-indigo-400 shrink-0" />
                  <span className="font-mono text-[11px] font-bold truncate">
                    {activeFileName}
                  </span>
                </div>
                <div
                  className={`text-[10px] truncate ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {syncStatus === 'saving'
                    ? 'Saving...'
                    : syncStatus === 'permission-needed' ||
                      syncStatus === 'error'
                    ? 'Write permission needed to auto-save to disk'
                    : `Live Auto-Save ON${
                        formattedSavedTime
                          ? ` • Last saved on ${formattedSavedTime}`
                          : ''
                      }`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {syncStatus === 'permission-needed' || syncStatus === 'error' ? (
                <button
                  type="button"
                  onClick={reconnectStoredFileHandle}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 cursor-pointer"
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>Authorize</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => flushAutosaveNow()}
                  title="Force immediate write to linked file"
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${getSecondaryButtonClass(
                    isDark
                  )}`}
                >
                  {syncStatus === 'saving' ? (
                    <RefreshCw className="h-2.5 w-2.5 animate-spin text-indigo-400" />
                  ) : (
                    <CheckCircle2 className="h-2.5 w-2.5 text-indigo-400" />
                  )}
                  <span>Save Now</span>
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  requestConfirmation({
                    title: 'Unlink Local File?',
                    description: `Stop auto-saving changes directly to "${activeFileName}"? Your topology will remain saved in browser storage.`,
                    confirmLabel: 'Unlink File',
                    onConfirm: () => {
                      unlinkLocalFile();
                    },
                  })
                }
                title={`Unlink "${activeFileName}"`}
                aria-label={`Unlink ${activeFileName}`}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${getDangerIconButtonClass(
                  isDark
                )}`}
              >
                <Unlink className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${
              isDark
                ? 'bg-[#0b0e17] border-[#1f273a] text-slate-300'
                : 'bg-slate-100/80 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                  isDark
                    ? 'bg-[#141926] text-slate-400 border-[#232c40]'
                    : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                <Link2Off className="h-2.5 w-2.5 shrink-0" />
                <span>NOT LINKED</span>
              </span>
              <span className="text-[11px] truncate">
                Link an existing <strong>.md/.xlsx</strong> file or create a new
                one
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenOrImportClick}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer ${getSecondaryButtonClass(
                  isDark
                )}`}
              >
                <Upload className="h-3 w-3 text-indigo-400" />
                <span>Link File</span>
              </button>
              <button
                type="button"
                onClick={() => saveAsNewMarkdownFile()}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer ${getPrimaryButtonClass()}`}
              >
                <Save className="h-3 w-3" />
                <span>New File</span>
              </button>
            </div>
          </div>
        )}

        {/* Format Switcher & Action Toolbar */}
        <div className="flex items-center justify-between gap-2">
          {/* Format Tabs: Markdown (.md) vs Excel (.xlsx) */}
          <div
            role="tablist"
            aria-label="Source File Format"
            className={`inline-flex p-0.5 rounded-xl border ${
              isDark
                ? 'bg-[#090c14] border-[#1f273a]'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={fileFormat === 'markdown'}
              onClick={() => setFileFormat('markdown')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                fileFormat === 'markdown'
                  ? getActiveToggleClass(isDark)
                  : getInactiveToggleClass(isDark)
              }`}
            >
              <Code2 className="h-3 w-3" />
              <span>Markdown (.md)</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={fileFormat === 'excel'}
              onClick={() => setFileFormat('excel')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                fileFormat === 'excel'
                  ? getActiveToggleClass(isDark)
                  : getInactiveToggleClass(isDark)
              }`}
            >
              <FileSpreadsheet className="h-3 w-3" />
              <span>Excel (.xlsx)</span>
            </button>
          </div>

          {/* Context Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenOrImportClick}
              title="Select & link a local .md or .xlsx file for live auto-save"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors ${getSecondaryButtonClass(
                isDark
              )}`}
            >
              <Upload className="h-3 w-3 text-indigo-400" />
              <span>Link File</span>
            </button>

            <button
              type="button"
              onClick={() => saveAsNewMarkdownFile()}
              title={`Create & link a new ${
                fileFormat === 'excel' ? '.xlsx' : '.md'
              } file on disk for live auto-save`}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors ${getSecondaryButtonClass(
                isDark
              )}`}
            >
              <Save className="h-3 w-3 text-indigo-400" />
              <span>Save As</span>
            </button>

            {fileFormat === 'markdown' && (
              <>
                <button
                  type="button"
                  onClick={handleFormatClean}
                  title="Normalize & Format Markdown AST"
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors ${getSecondaryButtonClass(
                    isDark
                  )}`}
                >
                  <Sparkles className="h-3 w-3 text-indigo-400" />
                  <span>Format</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  title="Copy Raw Markdown"
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-colors ${getSecondaryButtonClass(
                    isDark
                  )}`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3 text-indigo-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 text-indigo-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => downloadMarkdownSnapshot(fileFormat)}
              title={`Download ${
                fileFormat === 'excel' ? '.xlsx workbook' : '.md file'
              }`}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${getPrimaryButtonClass()}`}
            >
              <Download className="h-3 w-3" />
              <span>{fileFormat === 'excel' ? '.xlsx' : '.md'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Body: Either Markdown Live Editor OR Excel Workbook Sheet Preview */}
      {fileFormat === 'markdown' ? (
        <div className="relative flex-1 flex overflow-hidden font-mono text-xs">
          <div
            aria-hidden="true"
            className={`select-none py-3 px-2.5 text-right border-r overflow-hidden ${
              isDark
                ? 'bg-[#090c13] text-slate-600 border-[#192030]'
                : 'bg-slate-100/70 text-slate-400 border-slate-200'
            }`}
            style={{ minWidth: '3rem' }}
          >
            {Array.from({ length: lineCount }).map((_, idx) => (
              <div key={idx} className="leading-[1.6rem] text-[11px]">
                {idx + 1}
              </div>
            ))}
          </div>

          <textarea
            value={markdownText}
            onChange={(e) => updateFromMarkdownEditor(e.target.value)}
            spellCheck={false}
            aria-label="Live Markdown Topology Editor"
            className={`flex-1 w-full h-full p-3 resize-none outline-none font-mono text-xs leading-[1.6rem] overflow-y-auto ${
              isDark
                ? 'bg-[#0b0e16] text-slate-200 selection:bg-indigo-500/30'
                : 'bg-white text-slate-800 selection:bg-indigo-200'
            }`}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Excel Sheet Switcher Bar */}
          <div
            className={`flex items-center gap-1 px-3 py-1.5 border-b text-[11px] ${
              isDark
                ? 'bg-[#090c14] border-[#1f273a]'
                : 'bg-slate-100/80 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setExcelSheetTab('roster')}
              className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition ${
                excelSheetTab === 'roster'
                  ? getActiveToggleClass(isDark)
                  : getInactiveToggleClass(isDark)
              }`}
            >
              Roster ({rosterRows.length})
            </button>
            <button
              type="button"
              onClick={() => setExcelSheetTab('pegaApps')}
              className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition ${
                excelSheetTab === 'pegaApps'
                  ? getActiveToggleClass(isDark)
                  : getInactiveToggleClass(isDark)
              }`}
            >
              Apps ({(topology.applications ?? []).length})
            </button>
            <button
              type="button"
              onClick={() => setExcelSheetTab('squads')}
              className={`px-2.5 py-1 rounded-md font-medium cursor-pointer transition ${
                excelSheetTab === 'squads'
                  ? getActiveToggleClass(isDark)
                  : getInactiveToggleClass(isDark)
              }`}
            >
              Squads ({topology.teams.length})
            </button>
            <button
              type="button"
              onClick={() => setExcelSheetTab('verticals')}
              className={`px-2 py-1 rounded-md font-medium cursor-pointer transition ${
                excelSheetTab === 'verticals'
                  ? getActiveToggleClass(isDark)
                  : getInactiveToggleClass(isDark)
              }`}
            >
              Verticals ({topology.verticals.length})
            </button>
            <button
              type="button"
              onClick={() => setExcelSheetTab('tasks')}
              className={`px-2 py-1 rounded-md font-medium cursor-pointer transition ${
                excelSheetTab === 'tasks'
                  ? getActiveToggleClass(isDark)
                  : getInactiveToggleClass(isDark)
              }`}
            >
              Tasks ({(topology.tasks ?? []).length})
            </button>
            <button
              type="button"
              onClick={() => setExcelSheetTab('roadmap')}
              className={`px-2 py-1 rounded-md font-medium cursor-pointer transition ${
                excelSheetTab === 'roadmap'
                  ? getActiveToggleClass(isDark)
                  : getInactiveToggleClass(isDark)
              }`}
            >
              Roadmap ({(topology.roadmap ?? []).length})
            </button>
          </div>

          {/* Spreadsheet Grid View */}
          <div className="flex-1 overflow-auto">
            {excelSheetTab === 'roster' && (
              <table className="w-full border-collapse text-left text-[11px]">
                <thead
                  className={`sticky top-0 z-10 font-mono text-[10px] uppercase ${
                    isDark
                      ? 'bg-[#111623] text-slate-400 border-b border-[#1f283d]'
                      : 'bg-slate-100 text-slate-600 border-b border-slate-200'
                  }`}
                >
                  <tr>
                    <th className="py-2 px-2.5 font-semibold">Vertical</th>
                    <th className="py-2 px-2.5 font-semibold">Squad</th>
                    <th className="py-2 px-2.5 font-semibold">Member</th>
                    <th className="py-2 px-2.5 font-semibold">Role</th>
                    <th className="py-2 px-2.5 font-semibold">Alloc</th>
                    <th className="py-2 px-2.5 font-semibold">Company</th>
                    <th className="py-2 px-2.5 font-semibold">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/10">
                  {rosterRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-10 text-center text-xs opacity-50"
                      >
                        No squads or members on canvas yet. Add a squad or
                        import an .xlsx file.
                      </td>
                    </tr>
                  ) : (
                    rosterRows.map((r, i) => (
                      <tr
                        key={i}
                        className={
                          isDark
                            ? 'hover:bg-[#141a29]/60'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="py-1.5 px-2.5 truncate max-w-[90px]">
                          {r.vertical}
                        </td>
                        <td className="py-1.5 px-2.5 font-medium truncate max-w-[100px]">
                          {r.squad}
                        </td>
                        <td className="py-1.5 px-2.5 truncate max-w-[110px]">
                          {r.memberName}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-[10px]">
                          {r.role}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-[10px]">
                          {r.allocation}
                        </td>
                        <td className="py-1.5 px-2.5 truncate max-w-[80px]">
                          {r.company}
                        </td>
                        <td className="py-1.5 px-2.5 text-[10px]">
                          {r.resourceType}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {excelSheetTab === 'squads' && (
              <table className="w-full border-collapse text-left text-[11px]">
                <thead
                  className={`sticky top-0 z-10 font-mono text-[10px] uppercase ${
                    isDark
                      ? 'bg-[#111623] text-slate-400 border-b border-[#1f283d]'
                      : 'bg-slate-100 text-slate-600 border-b border-slate-200'
                  }`}
                >
                  <tr>
                    <th className="py-2 px-2.5 font-semibold">Squad</th>
                    <th className="py-2 px-2.5 font-semibold">Vertical</th>
                    <th className="py-2 px-2.5 font-semibold">Application</th>
                    <th className="py-2 px-2.5 font-semibold">Wiki URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/10">
                  {topology.teams.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-10 text-center text-xs opacity-50"
                      >
                        No squads defined yet.
                      </td>
                    </tr>
                  ) : (
                    topology.teams.map((t) => (
                      <tr
                        key={t.id}
                        className={
                          isDark
                            ? 'hover:bg-[#141a29]/60'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="py-1.5 px-2.5 font-medium">{t.name}</td>
                        <td className="py-1.5 px-2.5">
                          {verticalById.get(t.verticalId)?.name || t.verticalId}
                        </td>
                        <td className="py-1.5 px-2.5">
                          {t.pegaApplication || '—'}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-[10px] truncate max-w-[140px]">
                          {t.wikiUrl || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {excelSheetTab === 'verticals' && (
              <table className="w-full border-collapse text-left text-[11px]">
                <thead
                  className={`sticky top-0 z-10 font-mono text-[10px] uppercase ${
                    isDark
                      ? 'bg-[#111623] text-slate-400 border-b border-[#1f283d]'
                      : 'bg-slate-100 text-slate-600 border-b border-slate-200'
                  }`}
                >
                  <tr>
                    <th className="py-2 px-2.5 font-semibold">Vertical ID</th>
                    <th className="py-2 px-2.5 font-semibold">Vertical Name</th>
                    <th className="py-2 px-2.5 font-semibold">Color</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/10">
                  {topology.verticals.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-10 text-center text-xs opacity-50"
                      >
                        No verticals defined yet.
                      </td>
                    </tr>
                  ) : (
                    topology.verticals.map((v) => (
                      <tr
                        key={v.id}
                        className={
                          isDark
                            ? 'hover:bg-[#141a29]/60'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="py-1.5 px-2.5 font-mono text-[10px]">
                          {v.id}
                        </td>
                        <td className="py-1.5 px-2.5 font-medium">{v.name}</td>
                        <td className="py-1.5 px-2.5 font-mono text-[10px]">
                          {v.color}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {excelSheetTab === 'pegaApps' && (
              <table className="w-full border-collapse text-left text-[11px]">
                <thead
                  className={`sticky top-0 z-10 font-mono text-[10px] uppercase ${
                    isDark
                      ? 'bg-[#111623] text-slate-400 border-b border-[#1f283d]'
                      : 'bg-slate-100 text-slate-600 border-b border-slate-200'
                  }`}
                >
                  <tr>
                    <th className="py-2 px-2.5 font-semibold">Application</th>
                    <th className="py-2 px-2.5 font-semibold">Layer</th>
                    <th className="py-2 px-2.5 font-semibold">Dependencies</th>
                    <th className="py-2 px-2.5 font-semibold">Modules</th>
                    <th className="py-2 px-2.5 font-semibold">Workflows</th>
                    <th className="py-2 px-2.5 font-semibold">Entities</th>
                    <th className="py-2 px-2.5 font-semibold">Squads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/10">
                  {(topology.applications ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-10 text-center text-xs opacity-50"
                      >
                        No Applications mapped yet.
                      </td>
                    </tr>
                  ) : (
                    (topology.applications ?? []).map((app) => {
                      const mappedCount = topology.teams.filter(
                        (t) =>
                          t.pegaApplication.trim().toLowerCase() ===
                          app.name.trim().toLowerCase()
                      ).length;
                      return (
                        <tr
                          key={app.id}
                          className={
                            isDark
                              ? 'hover:bg-[#141a29]/60'
                              : 'hover:bg-slate-50'
                          }
                        >
                          <td className="py-1.5 px-2.5 font-medium truncate max-w-[120px]">
                            {app.name}{' '}
                            {app.version && (
                              <span className="font-mono text-[9px] opacity-60">
                                v{app.version}
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono text-[10px] capitalize">
                            {app.layer || '—'}
                          </td>
                          <td className="py-1.5 px-2.5 truncate max-w-[110px]">
                            {(app.builtOnApplications || []).join(', ') || '—'}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono text-[10px]">
                            {app.rulesets?.length || 0}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono text-[10px]">
                            {app.caseTypes?.length || 0}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono text-[10px]">
                            {app.dataTypes?.length || 0}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono text-[10px]">
                            {mappedCount}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {excelSheetTab === 'tasks' && (
              <table className="w-full border-collapse text-left text-[11px]">
                <thead
                  className={`sticky top-0 z-10 font-mono text-[10px] uppercase ${
                    isDark
                      ? 'bg-[#111623] text-slate-400 border-b border-[#1f283d]'
                      : 'bg-slate-100 text-slate-600 border-b border-slate-200'
                  }`}
                >
                  <tr>
                    <th className="py-2 px-2.5 font-semibold">Title</th>
                    <th className="py-2 px-2.5 font-semibold">Kind</th>
                    <th className="py-2 px-2.5 font-semibold">Status</th>
                    <th className="py-2 px-2.5 font-semibold">Due Date</th>
                    <th className="py-2 px-2.5 font-semibold">With / Squad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/10">
                  {(topology.tasks ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 text-center text-xs opacity-50"
                      >
                        No Action Items (To-Dos or Follow-Ups) added yet.
                      </td>
                    </tr>
                  ) : (
                    (topology.tasks ?? []).map((task) => (
                      <tr
                        key={task.id}
                        className={
                          isDark
                            ? 'hover:bg-[#141a29]/60'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="py-1.5 px-2.5 font-medium truncate max-w-[140px]">
                          {task.title}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-[10px] uppercase">
                          {task.kind === 'followup' ? 'Follow-Up' : 'To-Do'}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-[10px] capitalize">
                          {task.status}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-[10px]">
                          {task.dueDate || '—'}
                        </td>
                        <td className="py-1.5 px-2.5 truncate max-w-[120px]">
                          {[task.followUpWith, task.linkedTeam]
                            .filter(Boolean)
                            .join(' • ') || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {excelSheetTab === 'roadmap' && (
              <table className="w-full border-collapse text-left text-[11px]">
                <thead
                  className={`sticky top-0 z-10 font-mono text-[10px] uppercase ${
                    isDark
                      ? 'bg-[#111623] text-slate-400 border-b border-[#1f283d]'
                      : 'bg-slate-100 text-slate-600 border-b border-slate-200'
                  }`}
                >
                  <tr>
                    <th className="py-2 px-2.5 font-semibold">Initiative</th>
                    <th className="py-2 px-2.5 font-semibold">Horizon</th>
                    <th className="py-2 px-2.5 font-semibold">Status</th>
                    <th className="py-2 px-2.5 font-semibold">Target</th>
                    <th className="py-2 px-2.5 font-semibold">Squad / App</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/10">
                  {(topology.roadmap ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 text-center text-xs opacity-50"
                      >
                        No Practice Roadmap items added yet.
                      </td>
                    </tr>
                  ) : (
                    (topology.roadmap ?? []).map((item) => (
                      <tr
                        key={item.id}
                        className={
                          isDark
                            ? 'hover:bg-[#141a29]/60'
                            : 'hover:bg-slate-50'
                        }
                      >
                        <td className="py-1.5 px-2.5 font-medium truncate max-w-[140px]">
                          {item.title}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-[10px] capitalize">
                          {item.horizon}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-[10px] capitalize">
                          {item.status}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-[10px]">
                          {item.targetDate || '—'}
                        </td>
                        <td className="py-1.5 px-2.5 truncate max-w-[120px]">
                          {[item.linkedTeam, item.linkedApplication]
                            .filter(Boolean)
                            .join(' • ') || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {parseWarnings.length > 0 && (
        <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/30 text-[11px] text-amber-300">
          {parseWarnings[0]}
        </div>
      )}

      <div
        className={`px-4 py-2 border-t flex items-center justify-between text-[11px] ${getHeaderFooterSurfaceClass(
          isDark
        )} ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
      >
        <span>
          {topology.verticals.length} Verticals • {topology.teams.length} Squads
          • {(topology.applications ?? []).length} Apps •{' '}
          {(topology.tasks ?? []).length + (topology.roadmap ?? []).length}{' '}
          Planner
        </span>
        <span className="font-mono text-[10px]">
          {fileFormat === 'excel'
            ? 'Excel (.xlsx) 7-Sheet Workbook'
            : 'Markdown (.md) AST Sync'}
        </span>
      </div>
    </aside>
  );
};
