import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useTopologyStore } from '../../store/useTopologyStore';
import {
  getDangerIconButtonClass,
  getHeaderFooterSurfaceClass,
  getInputSurfaceClass,
  getPopoverSurfaceClass,
  getPrimaryButtonClass,
} from '../../utils/uiTheme';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  dotColor?: string;
  deletable?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md';
  className?: string;
  onCreateOption?: (newName: string) => void;
  createPlaceholder?: string;
  onDeleteOption?: (value: string) => void;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  size = 'md',
  className = '',
  onCreateOption,
  createPlaceholder = 'Add new...',
  onDeleteOption,
}) => {
  const [open, setOpen] = useState(false);
  const [newOptionText, setNewOptionText] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const theme = useTopologyStore((s) => s.theme);
  const requestConfirmation = useTopologyStore((s) => s.requestConfirmation);
  const isDark = theme === 'dark';

  const selectedOption =
    options.find((o) => o.value === value) ||
    (value ? { value, label: value } : null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleCreate = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = newOptionText.trim();
    if (!trimmed || !onCreateOption) return;
    onCreateOption(trimmed);
    onChange(trimmed);
    setNewOptionText('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border text-left transition-colors cursor-pointer outline-none ${
          size === 'sm' ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-2 text-xs'
        } ${getInputSurfaceClass(isDark)} ${
          open
            ? isDark
              ? 'border-indigo-400/60 ring-1 ring-indigo-400/30'
              : 'border-indigo-500 ring-1 ring-indigo-300'
            : ''
        }`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate font-medium">
          {selectedOption?.dotColor && (
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: selectedOption.dotColor }}
            />
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-60 transition-transform duration-150 ${
            open ? 'rotate-180 opacity-100' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute left-0 right-0 mt-1 z-50 rounded-xl border backdrop-blur-xl overflow-hidden ${getPopoverSurfaceClass(
            isDark
          )}`}
        >
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
            {options.length === 0 && (
              <div className="px-2.5 py-2 text-xs opacity-50 text-center">
                {onCreateOption ? 'No options yet — add one below' : 'No items defined'}
              </div>
            )}
            {options.map((opt) => {
              const isSelected = opt.value === value;
              const canDelete =
                Boolean(onDeleteOption) &&
                opt.value !== '' &&
                opt.deletable !== false;

              return (
                <div
                  key={opt.value}
                  className={`group/opt flex items-center justify-between gap-1 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? isDark
                        ? 'bg-[#1a2234] text-white font-semibold'
                        : 'bg-slate-100 text-slate-900 font-semibold'
                      : isDark
                      ? 'text-slate-300 hover:bg-[#171e2e] hover:text-slate-100'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className="flex-1 flex items-center gap-2 min-w-0 text-left cursor-pointer"
                  >
                    {opt.dotColor && (
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: opt.dotColor }}
                      />
                    )}
                    <div className="truncate flex-1">
                      <div className="truncate">{opt.label}</div>
                      {opt.sublabel && (
                        <div className="text-[10px] opacity-55 truncate font-normal">
                          {opt.sublabel}
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(false);
                          requestConfirmation({
                            title: `Delete "${opt.label}"?`,
                            description: `Are you sure you want to delete "${opt.label}"? Any squads, members, or applications currently using it will be updated automatically.`,
                            confirmLabel: 'Delete Item',
                            onConfirm: () => {
                              onDeleteOption!(opt.value);
                            },
                          });
                        }}
                        title={`Delete "${opt.label}"`}
                        aria-label={`Delete ${opt.label}`}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${getDangerIconButtonClass(
                          isDark
                        )}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {onCreateOption && (
            <div
              className={`p-1.5 border-t flex items-center gap-1.5 ${getHeaderFooterSurfaceClass(
                isDark
              )}`}
            >
              <input
                type="text"
                value={newOptionText}
                onChange={(e) => setNewOptionText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreate(e);
                  }
                }}
                placeholder={createPlaceholder}
                className={`flex-1 px-2 py-1 rounded-md text-xs border outline-none ${getInputSurfaceClass(
                  isDark
                )}`}
              />
              <button
                type="button"
                onClick={(e) => handleCreate(e)}
                disabled={!newOptionText.trim()}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold disabled:opacity-40 cursor-pointer transition ${getPrimaryButtonClass()}`}
              >
                <Plus className="h-3 w-3" />
                <span>Add</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
