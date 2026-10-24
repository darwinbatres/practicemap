import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Box,
  Building2,
  Compass,
  Cpu,
  Layers,
  Plus,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { CatalogItemKind, DEFAULT_CATALOG } from '../../types/topology';
import { useTopologyStore } from '../../store/useTopologyStore';
import {
  getActiveToggleClass,
  getCloseButtonClass,
  getDangerIconButtonClass,
  getHeaderFooterSurfaceClass,
  getHeaderIconBadgeClass,
  getInactiveToggleClass,
  getInputSurfaceClass,
  getPanelSurfaceClass,
  getPrimaryButtonClass,
  getSecondaryButtonClass,
  getSubCardSurfaceClass,
} from '../../utils/uiTheme';

export const CatalogModal: React.FC = () => {
  const isOpen = useTopologyStore((s) => s.isCatalogModalOpen);
  const setCatalogModalOpen = useTopologyStore((s) => s.setCatalogModalOpen);
  const topology = useTopologyStore((s) => s.topology);
  const addCatalogItem = useTopologyStore((s) => s.addCatalogItem);
  const updateCatalogItem = useTopologyStore((s) => s.updateCatalogItem);
  const deleteCatalogItem = useTopologyStore((s) => s.deleteCatalogItem);
  const requestConfirmation = useTopologyStore((s) => s.requestConfirmation);
  const setViewMode = useTopologyStore((s) => s.setViewMode);
  const selectApp = useTopologyStore((s) => s.selectApp);
  const theme = useTopologyStore((s) => s.theme);
  const activeTab = useTopologyStore((s) => s.catalogActiveTab);
  const setActiveTab = useTopologyStore((s) => s.setCatalogActiveTab);

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const catalog = topology.catalog || DEFAULT_CATALOG;

  const filteredItems = useMemo(
    () => catalog.filter((item) => item.kind === activeTab),
    [catalog, activeTab]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCatalogModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setCatalogModalOpen]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addCatalogItem({
      name: newName.trim(),
      kind: activeTab,
      description: newDescription.trim() || undefined,
    });
    setNewName('');
    setNewDescription('');
  };

  const countUsageLabel = (name: string, kind: CatalogItemKind) => {
    if (kind === 'role') {
      const uniquePeople = new Set<string>();
      for (const t of topology.teams) {
        for (const m of t.members) {
          if (m.role.trim().toLowerCase() === name.toLowerCase()) {
            uniquePeople.add(m.name.trim().toLowerCase());
          }
        }
      }
      const c = uniquePeople.size;
      return `${c} ${c === 1 ? 'Member' : 'Members'}`;
    }

    if (kind === 'company') {
      const uniquePeople = new Set<string>();
      for (const t of topology.teams) {
        for (const m of t.members) {
          const comp = m.company?.trim() || '';
          if (comp && comp.toLowerCase() === name.toLowerCase()) {
            uniquePeople.add(m.name.trim().toLowerCase());
          }
        }
      }
      const c = uniquePeople.size;
      return `${c} ${c === 1 ? 'Member' : 'Members'}`;
    }

    if (kind === 'architecture' || kind === 'layer') {
      const appCount = (topology.applications || []).filter((a) =>
        kind === 'architecture'
          ? (a.architecture || '').trim().toLowerCase() === name.toLowerCase()
          : (a.layer || '').trim().toLowerCase() === name.toLowerCase()
      ).length;
      return `${appCount} ${appCount === 1 ? 'App' : 'Apps'}`;
    }

    const squadCount = topology.teams.filter((t) =>
      kind === 'application'
        ? t.pegaApplication.toLowerCase() === name.toLowerCase()
        : (t.initiative || '').toLowerCase() === name.toLowerCase()
    ).length;
    return `${squadCount} ${squadCount === 1 ? 'Squad' : 'Squads'}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setCatalogModalOpen(false);
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4"
    >
      <div
        className={`w-full max-w-xl rounded-2xl border overflow-hidden flex flex-col max-h-[85vh] ${getPanelSurfaceClass(
          isDark
        )}`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${getHeaderFooterSurfaceClass(
            isDark
          )}`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-xl border ${getHeaderIconBadgeClass(
                isDark
              )}`}
            >
              {activeTab === 'application' ? (
                <Box className="h-4 w-4" />
              ) : activeTab === 'initiative' ? (
                <Compass className="h-4 w-4" />
              ) : activeTab === 'company' ? (
                <Building2 className="h-4 w-4" />
              ) : activeTab === 'role' ? (
                <UserCheck className="h-4 w-4" />
              ) : activeTab === 'architecture' ? (
                <Cpu className="h-4 w-4" />
              ) : (
                <Layers className="h-4 w-4" />
              )}
            </div>
            <div>
              <h2 id="catalog-modal-title" className="text-sm font-bold">
                Catalog & Dropdown Options
              </h2>
              <p className="text-[11px] opacity-60">
                Manage applications, initiatives, companies, positions,
                architectures, and layers
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCatalogModalOpen(false)}
            aria-label="Close Catalog Modal"
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${getCloseButtonClass(
              isDark
            )}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Segmented Tab Switcher */}
        <div className="px-5 pt-4">
          <div
            className={`grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 rounded-xl border ${
              isDark
                ? 'bg-[#090c14] border-[#1f273a]'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            {(
              [
                {
                  key: 'application' as const,
                  label: 'Apps',
                  icon: Box,
                },
                {
                  key: 'initiative' as const,
                  label: 'Initiatives',
                  icon: Compass,
                },
                {
                  key: 'company' as const,
                  label: 'Companies',
                  icon: Building2,
                },
                {
                  key: 'role' as const,
                  label: 'Positions',
                  icon: UserCheck,
                },
                {
                  key: 'architecture' as const,
                  label: 'Platforms',
                  icon: Cpu,
                },
                {
                  key: 'layer' as const,
                  label: 'Layers',
                  icon: Layers,
                },
              ] as const
            ).map(({ key, label, icon: Icon }) => {
              const isSelected = activeTab === key;
              const count = catalog.filter((c) => c.kind === key).length;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    isSelected
                      ? getActiveToggleClass(isDark)
                      : getInactiveToggleClass(isDark)
                  }`}
                >
                  <Icon
                    className={`h-3 w-3 shrink-0 ${
                      isSelected ? 'text-indigo-400' : 'opacity-70'
                    }`}
                  />
                  <span className="truncate">
                    {label} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Add New Catalog Option Form */}
        <form onSubmit={handleAdd} className="px-5 pt-3.5">
          <div
            className={`p-3 rounded-xl border space-y-2.5 ${getSubCardSurfaceClass(
              isDark
            )}`}
          >
            <div className="text-[11px] font-semibold opacity-75">
              + Define New{' '}
              {activeTab === 'application'
                ? 'Application'
                : activeTab === 'initiative'
                ? 'Strategic Initiative'
                : activeTab === 'company'
                ? 'Company / Organization'
                : activeTab === 'role'
                ? 'Position / Role'
                : activeTab === 'architecture'
                ? 'Architecture / Platform'
                : 'Application Layer / Tier'}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={
                  activeTab === 'application'
                    ? 'Application name...'
                    : activeTab === 'initiative'
                    ? 'Strategic initiative name...'
                    : activeTab === 'company'
                    ? 'Company or partner name...'
                    : activeTab === 'role'
                    ? 'Position or role name...'
                    : activeTab === 'architecture'
                    ? 'Architecture or platform name...'
                    : 'Layer or tier name...'
                }
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs border outline-none ${getInputSurfaceClass(
                  isDark
                )}`}
              />
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional note or target scope"
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs border outline-none ${getInputSurfaceClass(
                  isDark
                )}`}
              />
              <button
                type="submit"
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${getPrimaryButtonClass()}`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </form>

        {/* List of Defined Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {filteredItems.length === 0 && (
            <div
              className={`p-5 rounded-xl border border-dashed text-center text-xs opacity-60 ${
                isDark ? 'border-[#232c40]' : 'border-slate-300'
              }`}
            >
              No{' '}
              {activeTab === 'application'
                ? 'applications'
                : activeTab === 'initiative'
                ? 'initiatives'
                : activeTab === 'company'
                ? 'companies'
                : activeTab === 'role'
                ? 'positions'
                : activeTab === 'architecture'
                ? 'architectures / platforms'
                : 'application layers'}{' '}
              defined yet. Add one above to get started.
            </div>
          )}
          {filteredItems.map((item) => {
            const usageLabel = countUsageLabel(item.name, item.kind);
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${getSubCardSurfaceClass(
                  isDark
                )}`}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        updateCatalogItem(item.id, { name: e.target.value })
                      }
                      className={`text-xs font-semibold px-2 py-1 rounded-md border outline-none flex-1 ${getInputSurfaceClass(
                        isDark
                      )}`}
                    />
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${
                        isDark
                          ? 'bg-[#171e2f] text-slate-300 border-[#26324c]'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {usageLabel}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={item.description || ''}
                    onChange={(e) =>
                      updateCatalogItem(item.id, {
                        description: e.target.value,
                      })
                    }
                    placeholder="Add description or scope..."
                    className={`w-full text-[11px] px-2 py-0.5 rounded border border-transparent hover:border-[#222b3e] outline-none ${
                      isDark
                        ? 'bg-transparent text-slate-400 focus:bg-[#0b0e17] focus:border-indigo-400/50'
                        : 'bg-transparent text-slate-500 focus:bg-white focus:border-slate-300'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {item.kind === 'application' && (
                    <button
                      type="button"
                      onClick={() => {
                        const matchingApp = (
                          topology.applications ?? []
                        ).find(
                          (a) =>
                            a.name.trim().toLowerCase() ===
                            item.name.trim().toLowerCase()
                        );
                        setCatalogModalOpen(false);
                        setViewMode('applications');
                        if (matchingApp) {
                          selectApp(matchingApp.id);
                        }
                      }}
                      title={`Inspect "${item.name}" Blueprint on Applications Board`}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition ${getSecondaryButtonClass(
                        isDark
                      )}`}
                    >
                      <span>Blueprint</span>
                      <ArrowUpRight className="h-3 w-3 text-indigo-400" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      requestConfirmation({
                        title: `Delete "${item.name}"?`,
                        description: `Are you sure you want to delete "${item.name}" from the catalog? (${usageLabel} currently assigned)`,
                        confirmLabel: 'Delete Item',
                        onConfirm: () => deleteCatalogItem(item.id),
                      })
                    }
                    title="Remove from catalog"
                    aria-label={`Remove ${item.name} from catalog`}
                    className={`p-1.5 rounded-lg transition cursor-pointer shrink-0 ${getDangerIconButtonClass(
                      isDark
                    )}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between text-xs ${getHeaderFooterSurfaceClass(
            isDark
          )} ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
        >
          <span>
            Renaming an item automatically updates all squads linked to it.
          </span>
          <button
            type="button"
            onClick={() => setCatalogModalOpen(false)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${getSecondaryButtonClass(
              isDark
            )}`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
