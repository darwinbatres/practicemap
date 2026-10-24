import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code2,
  Download,
  FilePlus2,
  FileSpreadsheet,
  FolderOpen,
  Link2,
  Link2Off,
  Redo2,
  RefreshCw,
  Undo2,
  Unlink,
  X,
} from 'lucide-react';
import {
  UnderlyingFileFormat,
  useTopologyStore,
} from '../../store/useTopologyStore';
import {
  getActiveToggleClass,
  getCloseButtonClass,
  getDangerButtonClass,
  getDangerIconButtonClass,
  getDisabledButtonClass,
  getHeaderFooterSurfaceClass,
  getHeaderIconBadgeClass,
  getInactiveToggleClass,
  getInputSurfaceClass,
  getPanelSurfaceClass,
  getPrimaryButtonClass,
  getSecondaryButtonClass,
  getSubCardSurfaceClass,
} from '../../utils/uiTheme';

export const FileSyncBar: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const [activePopover, setActivePopover] = useState<
    'none' | 'status' | 'new-file'
  >('none');
  const [newFileNameInput, setNewFileNameInput] = useState('practice-topology');
  const [newFileFormat, setNewFileFormat] =
    useState<UnderlyingFileFormat>('markdown');
  const [startBlankCanvas, setStartBlankCanvas] = useState(false);

  const theme = useTopologyStore((s) => s.theme);
  const pastCount = useTopologyStore((s) => s.past.length);
  const futureCount = useTopologyStore((s) => s.future.length);
  const undo = useTopologyStore((s) => s.undo);
  const redo = useTopologyStore((s) => s.redo);

  const fileName = useTopologyStore((s) => s.fileName);
  const fileFormat = useTopologyStore((s) => s.fileFormat);
  const isFileLinked = useTopologyStore((s) => s.isFileLinked);
  const fileHandle = useTopologyStore((s) => s.fileHandle);
  const syncStatus = useTopologyStore((s) => s.syncStatus);
  const lastSavedAt = useTopologyStore((s) => s.lastSavedAt);
  const isMarkdownDrawerOpen = useTopologyStore((s) => s.isMarkdownDrawerOpen);
  const setMarkdownDrawerOpen = useTopologyStore(
    (s) => s.setMarkdownDrawerOpen
  );
  const openLocalMarkdownFile = useTopologyStore(
    (s) => s.openLocalMarkdownFile
  );
  const importMarkdownFromFileObject = useTopologyStore(
    (s) => s.importMarkdownFromFileObject
  );
  const createNewLinkedFile = useTopologyStore((s) => s.createNewLinkedFile);
  const flushAutosaveNow = useTopologyStore((s) => s.flushAutosaveNow);
  const reconnectStoredFileHandle = useTopologyStore(
    (s) => s.reconnectStoredFileHandle
  );
  const downloadMarkdownSnapshot = useTopologyStore(
    (s) => s.downloadMarkdownSnapshot
  );
  const unlinkLocalFile = useTopologyStore((s) => s.unlinkLocalFile);
  const requestConfirmation = useTopologyStore((s) => s.requestConfirmation);

  const isDark = theme === 'dark';
  const isLinked = Boolean(fileHandle || isFileLinked);

  const activeFileName = fileHandle?.name || fileName;
  const linkedFormat: 'excel' | 'markdown' = /\.(xlsx|xls)$/i.test(
    activeFileName
  )
    ? 'excel'
    : /\.(md|markdown|txt)$/i.test(activeFileName)
    ? 'markdown'
    : fileFormat;

  useEffect(() => {
    if (activePopover === 'none') return;
    const handleOutside = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setActivePopover('none');
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopover('none');
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [activePopover]);

  const formattedSavedTime = React.useMemo(() => {
    if (!lastSavedAt) return 'just now';
    try {
      return new Date(lastSavedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'just now';
    }
  }, [lastSavedAt]);

  const formattedSavedFullDate = React.useMemo(() => {
    if (!lastSavedAt) return 'Just now';
    try {
      return new Date(lastSavedAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'Just now';
    }
  }, [lastSavedAt]);

  const handleOpenFileClick = async () => {
    setActivePopover('none');
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

  const handleFallbackInput = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      await importMarkdownFromFileObject(file);
      e.target.value = '';
    }
  };

  const handleOpenNewFilePopover = () => {
    const cleanBase =
      (activeFileName || 'practice-topology')
        .replace(/\.(md|markdown|txt|xlsx|xls)$/i, '')
        .trim() || 'practice-topology';
    setNewFileNameInput(cleanBase);
    setNewFileFormat(fileFormat);
    setStartBlankCanvas(false);
    setActivePopover((prev) => (prev === 'new-file' ? 'none' : 'new-file'));
  };

  const handleCreateNewFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivePopover('none');
    await createNewLinkedFile({
      name: newFileNameInput.trim() || 'practice-topology',
      format: newFileFormat,
      startBlank: startBlankCanvas,
    });
  };

  const handleUnlinkClick = () => {
    setActivePopover('none');
    requestConfirmation({
      title: 'Unlink Local File?',
      description: `Stop auto-saving changes directly to "${activeFileName}"? Your topology will remain saved in browser storage.`,
      confirmLabel: 'Unlink File',
      onConfirm: () => {
        unlinkLocalFile();
      },
    });
  };

  const btnClass = getSecondaryButtonClass(isDark);
  const disabledBtnClass = getDisabledButtonClass(isDark);

  return (
    <div
      ref={menuContainerRef}
      className="relative flex items-center gap-1.5 whitespace-nowrap"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt,.xlsx,.xls"
        onChange={handleFallbackInput}
        className="hidden"
      />

      {/* Global Undo / Redo Controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={undo}
          disabled={pastCount === 0}
          title={
            pastCount > 0
              ? `Undo last action (⌘Z / Ctrl+Z) — ${pastCount} step${
                  pastCount === 1 ? '' : 's'
                } available`
              : 'Nothing to undo'
          }
          aria-label="Undo last action"
          className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
            pastCount > 0 ? `${btnClass} cursor-pointer` : disabledBtnClass
          }`}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={redo}
          disabled={futureCount === 0}
          title={
            futureCount > 0
              ? `Redo action (⇧⌘Z / Ctrl+Y) — ${futureCount} step${
                  futureCount === 1 ? '' : 's'
                } available`
              : 'Nothing to redo'
          }
          aria-label="Redo action"
          className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
            futureCount > 0 ? `${btnClass} cursor-pointer` : disabledBtnClass
          }`}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Unified File Link + Live Save Notification Pill + Same-Line Actions */}
      <div
        className={`flex items-center gap-1.5 pl-1.5 pr-1.5 py-1 rounded-xl border text-[11px] font-medium transition-colors ${
          syncStatus === 'permission-needed' || syncStatus === 'error'
            ? isDark
              ? 'bg-amber-950/45 border-amber-500/40 text-amber-200'
              : 'bg-amber-50 border-amber-300 text-amber-900'
            : isLinked
            ? isDark
              ? 'bg-[#12192b] border-indigo-400/45 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              : 'bg-indigo-50/90 border-indigo-300/90 text-slate-900 shadow-2xs'
            : isDark
            ? 'bg-[#0b0e17] border-[#222b3e] text-slate-300'
            : 'bg-slate-50 border-slate-200/90 text-slate-700'
        }`}
      >
        {isLinked ? (
          <>
            {/* Format Badge: EXCEL vs MD */}
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border shrink-0 ${
                isDark
                  ? 'bg-indigo-500/25 text-indigo-200 border-indigo-400/40'
                  : 'bg-indigo-100 text-indigo-800 border-indigo-300'
              }`}
              title={`Linked ${
                linkedFormat === 'excel'
                  ? 'Excel Workbook (.xlsx)'
                  : 'Markdown File (.md)'
              }`}
            >
              {linkedFormat === 'excel' ? (
                <FileSpreadsheet className="h-3 w-3 text-indigo-400 shrink-0" />
              ) : (
                <Code2 className="h-3 w-3 text-indigo-400 shrink-0" />
              )}
              <span>{linkedFormat === 'excel' ? 'EXCEL' : 'MD'}</span>
            </span>

            {/* Linked File Name */}
            <button
              type="button"
              onClick={handleOpenFileClick}
              title={`Linked to "${activeFileName}". Click to switch to a different .md or .xlsx file.`}
              className="inline-flex items-center gap-1 cursor-pointer hover:opacity-85 min-w-0"
            >
              <Link2 className="h-3 w-3 text-indigo-400 shrink-0" />
              <span className="font-mono font-bold truncate max-w-[125px]">
                {activeFileName}
              </span>
            </button>
          </>
        ) : (
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border shrink-0 ${
              isDark
                ? 'bg-[#141926] text-slate-400 border-[#232c40]'
                : 'bg-slate-200/70 text-slate-600 border-slate-300/80'
            }`}
            title="No local disk file linked yet — saving in browser storage"
          >
            <Link2Off className="h-2.5 w-2.5 shrink-0 opacity-75" />
            <span>Unlinked</span>
          </span>
        )}

        {/* Save Notification Menu Trigger: Shows "Saving..." while saving, and "Last saved on ..." while not saving */}
        {syncStatus === 'permission-needed' || syncStatus === 'error' ? (
          <button
            type="button"
            onClick={reconnectStoredFileHandle}
            title={`Click to grant write permission and auto-save to "${activeFileName}"`}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 cursor-pointer shrink-0"
          >
            <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
            <span>Authorize Save</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              setActivePopover((prev) =>
                prev === 'status' ? 'none' : 'status'
              )
            }
            title="Open Auto-Save & File Notification Menu"
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold border cursor-pointer transition-colors shrink-0 ${
              activePopover === 'status'
                ? getActiveToggleClass(isDark)
                : syncStatus === 'saving'
                ? isDark
                  ? 'bg-indigo-500/20 border-indigo-400/45 text-indigo-200'
                  : 'bg-indigo-100 border-indigo-300 text-indigo-800'
                : isDark
                ? 'bg-[#0b0e17]/90 hover:bg-[#161d2f] border-[#25304a] text-slate-200'
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            {syncStatus === 'saving' ? (
              <>
                <RefreshCw className="h-2.5 w-2.5 animate-spin text-indigo-400 shrink-0" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-400" />
                </span>
                <span>Last saved on {formattedSavedTime}</span>
              </>
            )}
            <ChevronDown className="h-2.5 w-2.5 opacity-60 shrink-0" />
          </button>
        )}

        {/* Same-Line File Actions: Link File & New File */}
        {!isLinked ? (
          <>
            <button
              type="button"
              onClick={handleOpenFileClick}
              title="Link an existing Markdown (.md) or Excel (.xlsx) file"
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
                isDark
                  ? 'bg-[#141926] hover:bg-[#1b2234] text-slate-100 border border-[#25304a]'
                  : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
              }`}
            >
              <FolderOpen className="h-2.5 w-2.5 text-indigo-400 shrink-0" />
              <span>Link</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewFilePopover}
              title="Create & link a brand-new Markdown (.md) or Excel (.xlsx) file"
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
                activePopover === 'new-file'
                  ? getActiveToggleClass(isDark)
                  : getPrimaryButtonClass()
              }`}
            >
              <FilePlus2 className="h-2.5 w-2.5 shrink-0" />
              <span>New File</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleOpenNewFilePopover}
              title="Create & link a brand-new Markdown (.md) or Excel (.xlsx) file"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer transition-colors shrink-0 ${
                activePopover === 'new-file'
                  ? getActiveToggleClass(isDark)
                  : isDark
                  ? 'bg-[#0b0e17] hover:bg-[#171e2f] border-[#26324c] text-slate-200'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              <FilePlus2 className="h-2.5 w-2.5 text-indigo-400 shrink-0" />
              <span>New</span>
            </button>

            <button
              type="button"
              onClick={handleUnlinkClick}
              title={`Unlink "${activeFileName}"`}
              aria-label={`Unlink ${activeFileName}`}
              className={`p-1 rounded-md transition-colors cursor-pointer shrink-0 ${getDangerIconButtonClass(
                isDark
              )}`}
            >
              <Unlink className="h-3 w-3" />
            </button>
          </>
        )}
      </div>

      {/* Auto-Save & File Notification Menu Popover */}
      {activePopover === 'status' && (
        <div
          role="dialog"
          aria-label="Auto-Save Notification Menu"
          className={`absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] rounded-2xl border backdrop-blur-2xl overflow-hidden whitespace-normal ${getPanelSurfaceClass(
            isDark
          )}`}
        >
          {/* Notification Menu Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b ${getHeaderFooterSurfaceClass(
              isDark
            )}`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-lg border ${getHeaderIconBadgeClass(
                  isDark
                )}`}
              >
                {syncStatus === 'saving' ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">
                  {syncStatus === 'saving'
                    ? 'Saving Changes...'
                    : 'Auto-Save Status'}
                </div>
                <div
                  className={`text-[10px] ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {syncStatus === 'saving'
                    ? `Writing latest topology to ${
                        isLinked ? activeFileName : 'workspace storage'
                      }...`
                    : `Last saved on ${formattedSavedFullDate}`}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActivePopover('none')}
              className={`p-1 rounded-lg cursor-pointer ${getCloseButtonClass(
                isDark
              )}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Notification Menu Body */}
          <div className="p-3.5 space-y-3">
            {/* Live Save Activity Card */}
            <div
              className={`p-3 rounded-xl border space-y-2 ${getSubCardSurfaceClass(
                isDark
              )}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Sync Target
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    isLinked
                      ? isDark
                        ? 'bg-indigo-500/20 text-indigo-200 border-indigo-400/35'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : isDark
                      ? 'bg-[#141926] text-slate-400 border-[#232c40]'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {isLinked ? (
                    <>
                      {linkedFormat === 'excel' ? (
                        <FileSpreadsheet className="h-2.5 w-2.5 text-indigo-400" />
                      ) : (
                        <Code2 className="h-2.5 w-2.5 text-indigo-400" />
                      )}
                      <span>
                        Linked •{' '}
                        {linkedFormat === 'excel'
                          ? 'Excel (.xlsx)'
                          : 'Markdown (.md)'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Link2Off className="h-2.5 w-2.5" />
                      <span>Browser Storage Only</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold truncate">
                  {isLinked ? activeFileName : 'No local file linked'}
                </span>
              </div>

              <div
                className={`flex items-center gap-1.5 pt-1.5 border-t text-[11px] ${
                  isDark
                    ? 'border-[#1d2536] text-slate-300'
                    : 'border-slate-200/80 text-slate-600'
                }`}
              >
                {syncStatus === 'saving' ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin text-indigo-400 shrink-0" />
                    <span className="font-medium text-indigo-300">
                      Saving changes right now...
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3 text-indigo-400 shrink-0" />
                    <span>
                      Last saved on <strong>{formattedSavedFullDate}</strong>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Menu Quick Actions */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => flushAutosaveNow()}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs cursor-pointer ${getSecondaryButtonClass(
                  isDark
                )}`}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-indigo-400 ${
                    syncStatus === 'saving' ? 'animate-spin' : ''
                  }`}
                />
                <span>Save Now</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivePopover('none');
                  downloadMarkdownSnapshot(fileFormat);
                }}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs cursor-pointer ${getSecondaryButtonClass(
                  isDark
                )}`}
              >
                <Download className="h-3.5 w-3.5 text-indigo-400" />
                <span>
                  Download {fileFormat === 'excel' ? '.xlsx' : '.md'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleOpenFileClick}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs cursor-pointer ${getSecondaryButtonClass(
                  isDark
                )}`}
              >
                <FolderOpen className="h-3.5 w-3.5 text-indigo-400" />
                <span>Link Existing File</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewFilePopover}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs cursor-pointer ${getPrimaryButtonClass()}`}
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                <span>New File</span>
              </button>
            </div>

            {isLinked && (
              <button
                type="button"
                onClick={handleUnlinkClick}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs cursor-pointer ${getDangerButtonClass(
                  isDark
                )}`}
              >
                <Unlink className="h-3.5 w-3.5" />
                <span>Unlink "{activeFileName}"</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create & Link New File Popover */}
      {activePopover === 'new-file' && (
        <form
          onSubmit={handleCreateNewFileSubmit}
          className={`absolute right-0 top-[calc(100%+8px)] z-50 w-[320px] rounded-2xl border p-4 backdrop-blur-2xl whitespace-normal ${getPanelSurfaceClass(
            isDark
          )}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <FilePlus2 className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-bold">
                Create & Link New File
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActivePopover('none')}
              className={`p-1 rounded-lg cursor-pointer ${getCloseButtonClass(
                isDark
              )}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 1. File Format Choice: Markdown (.md) vs Excel (.xlsx) */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              File Format
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setNewFileFormat('markdown')}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition ${
                  newFileFormat === 'markdown'
                    ? getActiveToggleClass(isDark)
                    : `${getInactiveToggleClass(isDark)} ${
                        isDark
                          ? 'bg-[#0b0e17] border-[#1f273a]'
                          : 'bg-slate-50 border-slate-200'
                      }`
                }`}
              >
                <Code2 className="h-3.5 w-3.5 text-indigo-400" />
                <span>Markdown (.md)</span>
              </button>
              <button
                type="button"
                onClick={() => setNewFileFormat('excel')}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition ${
                  newFileFormat === 'excel'
                    ? getActiveToggleClass(isDark)
                    : `${getInactiveToggleClass(isDark)} ${
                        isDark
                          ? 'bg-[#0b0e17] border-[#1f273a]'
                          : 'bg-slate-50 border-slate-200'
                      }`
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-400" />
                <span>Excel (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* 2. File Name Input */}
          <div className="mb-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              File Name
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newFileNameInput}
                onChange={(e) => setNewFileNameInput(e.target.value)}
                placeholder="practice-topology"
                autoFocus
                className={`flex-1 px-2.5 py-1.5 rounded-xl text-xs font-mono border outline-none ${getInputSurfaceClass(
                  isDark
                )}`}
              />
              <span
                className={`px-2 py-1.5 rounded-xl text-xs font-mono font-bold border ${
                  isDark
                    ? 'bg-[#141926] border-[#232c40] text-indigo-300'
                    : 'bg-slate-100 border-slate-200 text-indigo-700'
                }`}
              >
                {newFileFormat === 'excel' ? '.xlsx' : '.md'}
              </span>
            </div>
          </div>

          {/* 3. Initial Content Mode */}
          <div className="mb-3.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Initial Content
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setStartBlankCanvas(false)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border cursor-pointer transition ${
                  !startBlankCanvas
                    ? getActiveToggleClass(isDark)
                    : `${getInactiveToggleClass(isDark)} ${
                        isDark
                          ? 'bg-[#0b0e17] border-[#1f273a]'
                          : 'bg-slate-50 border-slate-200'
                      }`
                }`}
              >
                Keep Current Canvas
              </button>
              <button
                type="button"
                onClick={() => setStartBlankCanvas(true)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border cursor-pointer transition ${
                  startBlankCanvas
                    ? getActiveToggleClass(isDark)
                    : `${getInactiveToggleClass(isDark)} ${
                        isDark
                          ? 'bg-[#0b0e17] border-[#1f273a]'
                          : 'bg-slate-50 border-slate-200'
                      }`
                }`}
              >
                Start Blank Canvas
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold cursor-pointer transition ${getPrimaryButtonClass()}`}
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            <span>
              Create & Link{' '}
              {(newFileNameInput.trim() || 'practice-topology').replace(
                /\.(md|markdown|txt|xlsx|xls)$/i,
                ''
              )}
              {newFileFormat === 'excel' ? '.xlsx' : '.md'}
            </span>
          </button>
        </form>
      )}

      {/* Source Drawer Toggle (Markdown & Excel Split-View + Format/Export Controls) */}
      <button
        type="button"
        onClick={() => setMarkdownDrawerOpen(!isMarkdownDrawerOpen)}
        title="Toggle Live Source Split-View (Switch .MD / .XLSX, Link File, Create New File, or Download)"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
          isMarkdownDrawerOpen ? getActiveToggleClass(isDark) : btnClass
        }`}
      >
        {fileFormat === 'excel' ? (
          <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-400" />
        ) : (
          <Code2 className="h-3.5 w-3.5 text-indigo-400" />
        )}
        <span>Source ({fileFormat === 'excel' ? '.XLSX' : '.MD'})</span>
      </button>
    </div>
  );
};
