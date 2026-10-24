import React, { useEffect, useMemo, useState } from 'react';
import { Check, Share2, UserPlus, X } from 'lucide-react';
import {
  DEFAULT_CATALOG,
  EmploymentType,
  getRoleMetadata,
} from '../../types/topology';
import { useTopologyStore } from '../../store/useTopologyStore';
import { getSharedMembersMap } from '../../utils/layoutEngine';
import {
  getActiveToggleClass,
  getCloseButtonClass,
  getHeaderFooterSurfaceClass,
  getHeaderIconBadgeClass,
  getInactiveToggleClass,
  getInputSurfaceClass,
  getPanelSurfaceClass,
  getPrimaryButtonClass,
  getSecondaryButtonClass,
  getSubCardSurfaceClass,
} from '../../utils/uiTheme';
import { AllocationSlider } from '../ui/AllocationSlider';
import { CustomSelect } from '../ui/CustomSelect';

export const QuickAssignModal: React.FC = () => {
  const isOpen = useTopologyStore((s) => s.isAssignModalOpen);
  const setAssignModalOpen = useTopologyStore((s) => s.setAssignModalOpen);
  const topology = useTopologyStore((s) => s.topology);
  const assignMemberAcrossTeams = useTopologyStore(
    (s) => s.assignMemberAcrossTeams
  );
  const addCatalogItem = useTopologyStore((s) => s.addCatalogItem);
  const deleteCatalogItemByName = useTopologyStore(
    (s) => s.deleteCatalogItemByName
  );
  const theme = useTopologyStore((s) => s.theme);

  const [memberName, setMemberName] = useState('');
  const [role, setRole] = useState<string>('');
  const [employmentType, setEmploymentType] =
    useState<EmploymentType>('internal');
  const [company, setCompany] = useState<string>('');
  const [selectedSquadAllocs, setSelectedSquadAllocs] = useState<
    Record<string, number>
  >({});

  const existingMembers = useMemo(() => {
    const map = getSharedMembersMap(topology.teams);
    return Array.from(map.values());
  }, [topology.teams]);

  const companyOptions = useMemo(() => {
    const catalog = topology.catalog ?? DEFAULT_CATALOG;
    const comps = catalog.filter((c) => c.kind === 'company');
    const mapped: {
      value: string;
      label: string;
      sublabel?: string;
      deletable?: boolean;
    }[] = comps.map((c) => ({
      value: c.name,
      label: c.name,
      sublabel: c.description,
      deletable: true,
    }));
    for (const m of existingMembers) {
      if (
        m.company &&
        !mapped.some((o) => o.value.toLowerCase() === m.company.toLowerCase())
      ) {
        mapped.push({
          value: m.company,
          label: m.company,
          deletable: true,
        });
      }
    }
    return mapped;
  }, [topology.catalog, existingMembers]);

  const roleOptions = useMemo(() => {
    const catalog = topology.catalog ?? DEFAULT_CATALOG;
    const base: {
      value: string;
      label: string;
      sublabel?: string;
      dotColor?: string;
      deletable?: boolean;
    }[] = [];

    const customRoles = catalog.filter((c) => c.kind === 'role');
    for (const cr of customRoles) {
      if (!base.some((b) => b.value.toLowerCase() === cr.name.toLowerCase())) {
        const meta = getRoleMetadata(cr.name);
        base.push({
          value: cr.name,
          label: cr.name,
          sublabel: cr.description || meta.description,
          dotColor: meta.dotColor,
          deletable: true,
        });
      }
    }
    for (const m of existingMembers) {
      if (
        m.primaryRole &&
        !base.some((b) => b.value.toLowerCase() === m.primaryRole.toLowerCase())
      ) {
        const meta = getRoleMetadata(m.primaryRole);
        base.push({
          value: m.primaryRole,
          label: m.primaryRole,
          sublabel: meta.description,
          dotColor: meta.dotColor,
          deletable: true,
        });
      }
    }
    return base;
  }, [topology.catalog, existingMembers]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAssignModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setAssignModalOpen]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const toggleSquadSelection = (teamId: string) => {
    setSelectedSquadAllocs((prev) => {
      const next = { ...prev };
      if (next[teamId] !== undefined) {
        delete next[teamId];
      } else {
        const count = Object.keys(next).length;
        if (count === 1) {
          const firstKey = Object.keys(next)[0];
          next[firstKey] = 50;
          next[teamId] = 50;
        } else {
          next[teamId] = count >= 1 ? 50 : 100;
        }
      }
      return next;
    });
  };

  const setAllocationForSquad = (teamId: string, pct: number) => {
    setSelectedSquadAllocs((prev) => ({
      ...prev,
      [teamId]: pct,
    }));
  };

  const handleSelectExistingPerson = (
    name: string,
    primaryRole: string,
    empType: EmploymentType,
    compName: string,
    placements: { teamId: string; allocation: number }[]
  ) => {
    setMemberName(name);
    setRole(primaryRole);
    setEmploymentType(empType);
    setCompany(compName);
    const allocObj: Record<string, number> = {};
    placements.forEach((p) => {
      allocObj[p.teamId] = p.allocation;
    });
    setSelectedSquadAllocs(allocObj);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const assignments = Object.entries(selectedSquadAllocs).map(
      ([teamId, allocation]) => ({ teamId, allocation })
    );
    if (!memberName.trim() || assignments.length === 0) return;
    assignMemberAcrossTeams(memberName.trim(), role, assignments, {
      employmentType,
      company,
    });
    setMemberName('');
    setSelectedSquadAllocs({});
    setAssignModalOpen(false);
  };

  const totalSelectedAlloc = Object.values(selectedSquadAllocs).reduce(
    (sum, v) => sum + v,
    0
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-assign-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setAssignModalOpen(false);
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4"
    >
      <div
        className={`w-full max-w-lg rounded-2xl border overflow-hidden ${getPanelSurfaceClass(
          isDark
        )}`}
      >
        {/* Header */}
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
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <h2 id="quick-assign-modal-title" className="text-sm font-bold">
                Assign Chapter Member Across Squads
              </h2>
              <p className="text-[11px] opacity-60">
                Allocate a new or existing member across one or multiple squads
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAssignModalOpen(false)}
            aria-label="Close Assign Chapter Member Modal"
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${getCloseButtonClass(
              isDark
            )}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {existingMembers.length > 0 && (
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1.5">
                Or Pick Existing Chapter Member to Cross-Allocate:
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {existingMembers.map((m) => (
                  <button
                    key={m.normalizedName}
                    type="button"
                    onClick={() =>
                      handleSelectExistingPerson(
                        m.displayName,
                        m.primaryRole,
                        m.employmentType,
                        m.company,
                        m.placements
                      )
                    }
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                      memberName.toLowerCase() === m.normalizedName
                        ? getActiveToggleClass(isDark)
                        : getSecondaryButtonClass(isDark)
                    }`}
                  >
                    {m.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name & Primary Discipline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                Chapter Member Name
              </label>
              <input
                type="text"
                required
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="e.g. Natalia Voronova"
                className={`w-full px-3 py-2 rounded-lg text-xs border outline-none ${getInputSurfaceClass(
                  isDark
                )}`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                Primary Discipline / Position
              </label>
              <CustomSelect
                value={role}
                onChange={setRole}
                options={roleOptions}
                placeholder="Select or add role..."
                onCreateOption={(newRole) => {
                  addCatalogItem({ name: newRole, kind: 'role' });
                }}
                createPlaceholder="New position / role..."
                onDeleteOption={(roleName) => {
                  deleteCatalogItemByName(roleName, 'role');
                }}
              />
            </div>
          </div>

          {/* Resource Sourcing (Internal vs Outsourcing) & Company / Vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                Sourcing Type
              </label>
              <div
                className={`grid grid-cols-2 gap-1 rounded-lg p-0.5 border ${
                  isDark
                    ? 'bg-[#090c14] border-[#1f273a]'
                    : 'bg-slate-100 border-slate-200'
                }`}
              >
                {(['internal', 'outsourcing'] as const).map((type) => {
                  const isActive = employmentType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setEmploymentType(type);
                      }}
                      className={`py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                        isActive
                          ? getActiveToggleClass(isDark)
                          : getInactiveToggleClass(isDark)
                      }`}
                    >
                      {type === 'internal' ? 'Internal' : 'Outsourcing'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                Company / Partner Organization
              </label>
              <CustomSelect
                value={company}
                onChange={(val) => {
                  setCompany(val);
                }}
                options={companyOptions}
                placeholder="Select or add company..."
                onCreateOption={(newComp) => {
                  addCatalogItem({ name: newComp, kind: 'company' });
                }}
                createPlaceholder="New company / vendor..."
                onDeleteOption={(compName) => {
                  deleteCatalogItemByName(compName, 'company');
                }}
              />
            </div>
          </div>

          {/* Target Squads & Allocation Split */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 text-indigo-400" />
                Select Target Squad(s) & Allocation %
              </label>
              <span className="text-xs font-mono font-semibold opacity-80">
                Total: {totalSelectedAlloc}%
              </span>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {topology.teams.length === 0 && (
                <div
                  className={`p-3 rounded-xl border border-dashed text-center text-xs opacity-60 ${
                    isDark ? 'border-[#232c40]' : 'border-slate-300'
                  }`}
                >
                  No squads created yet. Add a squad on the canvas first.
                </div>
              )}
              {topology.teams.map((squad) => {
                const isSelected = selectedSquadAllocs[squad.id] !== undefined;
                const currentPct = selectedSquadAllocs[squad.id] || 100;

                return (
                  <div
                    key={squad.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl border transition ${
                      isSelected
                        ? isDark
                          ? 'bg-indigo-500/15 border-indigo-400/50'
                          : 'bg-indigo-50/70 border-indigo-300'
                        : getSubCardSurfaceClass(isDark)
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSquadSelection(squad.id)}
                      className="flex items-center gap-2.5 text-left flex-1 cursor-pointer min-w-0"
                    >
                      <div
                        className={`h-4 w-4 rounded flex items-center justify-center border shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : isDark
                            ? 'border-[#28334d] bg-[#121723]'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">
                          {squad.name}
                        </div>
                        {squad.pegaApplication && (
                          <div className="text-[10px] opacity-60 truncate">
                            {squad.pegaApplication}
                          </div>
                        )}
                      </div>
                    </button>

                    {isSelected && (
                      <div className="w-full sm:w-44 shrink-0">
                        <AllocationSlider
                          value={currentPct}
                          onChange={(val) =>
                            setAllocationForSquad(squad.id, val)
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className={`px-4 py-2 rounded-xl text-xs font-medium cursor-pointer transition ${getSecondaryButtonClass(
                isDark
              )}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !memberName.trim() ||
                Object.keys(selectedSquadAllocs).length === 0
              }
              className={`px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer transition ${getPrimaryButtonClass()}`}
            >
              Assign Member to{' '}
              {Object.keys(selectedSquadAllocs).length || 0}{' '}
              {Object.keys(selectedSquadAllocs).length === 1
                ? 'Squad'
                : 'Squads'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
