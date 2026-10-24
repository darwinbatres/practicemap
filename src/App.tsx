import React, { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useTopologyStore } from './store/useTopologyStore';
import { ExecutiveSpotlightHUD } from './components/hud/ExecutiveSpotlightHUD';
import { ChapterCanvas } from './components/canvas/ChapterCanvas';
import { InspectorSheet } from './components/drawer/InspectorSheet';
import { LiveMarkdownDrawer } from './components/drawer/LiveMarkdownDrawer';
import { QuickAssignModal } from './components/modals/QuickAssignModal';
import { CatalogModal } from './components/modals/CatalogModal';
import { ConfirmDialogModal } from './components/modals/ConfirmDialogModal';
import { AuthorSignatureBadge } from './components/hud/AuthorSignatureBadge';

export function App() {
  const hydrateFromStorage = useTopologyStore((s) => s.hydrateFromStorage);
  const checkExternalFileChanges = useTopologyStore(
    (s) => s.checkExternalFileChanges
  );
  const reconnectStoredFileHandle = useTopologyStore(
    (s) => s.reconnectStoredFileHandle
  );
  const flushAutosaveNow = useTopologyStore((s) => s.flushAutosaveNow);
  const fileHandle = useTopologyStore((s) => s.fileHandle);
  const syncStatus = useTopologyStore((s) => s.syncStatus);
  const undo = useTopologyStore((s) => s.undo);
  const redo = useTopologyStore((s) => s.redo);
  const theme = useTopologyStore((s) => s.theme);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    const handleFocus = () => {
      checkExternalFileChanges();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushAutosaveNow();
      } else if (document.visibilityState === 'visible') {
        checkExternalFileChanges();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkExternalFileChanges, flushAutosaveNow]);

  // Automatically re-authorize and flush autosave on first user gesture if a stored handle needs permission
  useEffect(() => {
    if (!fileHandle || syncStatus !== 'permission-needed') return;
    const handleGesture = () => {
      reconnectStoredFileHandle();
    };
    window.addEventListener('pointerdown', handleGesture, { once: true });
    window.addEventListener('keydown', handleGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, [fileHandle, syncStatus, reconnectStoredFileHandle]);

  // Global Undo (Cmd/Ctrl+Z), Redo (Cmd+Shift+Z / Ctrl+Y), and Escape to dismiss Inspector
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const state = useTopologyStore.getState();
        if (
          state.confirmDialog ||
          state.isCatalogModalOpen ||
          state.isAssignModalOpen
        ) {
          return;
        }
        if (
          state.selectedTeamId ||
          state.selectedVerticalId ||
          state.selectedAppId
        ) {
          state.selectTeam(null);
          state.selectVertical(null);
          state.selectApp(null);
        }
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (key === 'y' && !e.metaKey) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden select-none ${
        theme === 'dark'
          ? 'chaptermap-canvas-dark text-slate-100'
          : 'chaptermap-canvas-light text-slate-900'
      }`}
    >
      <ReactFlowProvider>
        <ExecutiveSpotlightHUD />
        <ChapterCanvas />
        <InspectorSheet />
        <LiveMarkdownDrawer />
        <QuickAssignModal />
        <CatalogModal />
        <ConfirmDialogModal />
        <AuthorSignatureBadge />
      </ReactFlowProvider>
    </div>
  );
}

export default App;
