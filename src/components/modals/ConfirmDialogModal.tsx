import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import {
  getCloseButtonClass,
  getDangerButtonClass,
  getDangerIconButtonClass,
  getHeaderFooterSurfaceClass,
  getPanelSurfaceClass,
  getSecondaryButtonClass,
} from '../../utils/uiTheme';

export const ConfirmDialogModal: React.FC = () => {
  const confirmDialog = useTopologyStore((s) => s.confirmDialog);
  const closeConfirmation = useTopologyStore((s) => s.closeConfirmation);
  const theme = useTopologyStore((s) => s.theme);

  useEffect(() => {
    if (!confirmDialog) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeConfirmation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog, closeConfirmation]);

  if (!confirmDialog) return null;

  const isDark = theme === 'dark';

  const handleConfirm = () => {
    const action = confirmDialog.onConfirm;
    closeConfirmation();
    action();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      onClick={closeConfirmation}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border overflow-hidden ${getPanelSurfaceClass(
          isDark
        )}`}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${getHeaderFooterSurfaceClass(
            isDark
          )}`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${getDangerIconButtonClass(
                isDark
              )}`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 id="confirm-dialog-title" className="text-sm font-bold">
                {confirmDialog.title}
              </h2>
              <p className="text-[11px] opacity-60">
                Please confirm this destructive action
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeConfirmation}
            aria-label="Close confirmation dialog"
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${getCloseButtonClass(
              isDark
            )}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p
            id="confirm-dialog-description"
            className={`text-xs leading-relaxed ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {confirmDialog.description}
          </p>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeConfirmation}
              className={`px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition ${getSecondaryButtonClass(
                isDark
              )}`}
            >
              {confirmDialog.cancelLabel || 'Cancel'}
            </button>
            <button
              type="button"
              autoFocus
              onClick={handleConfirm}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${getDangerButtonClass(
                isDark
              )}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{confirmDialog.confirmLabel || 'Confirm Delete'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
