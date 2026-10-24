import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Box,
  Building2,
  Check,
  Code2,
  Copy,
  Database,
  ExternalLink,
  FolderKanban,
  GitBranch,
  Layers,
  Palette,
  Plug,
  Plus,
  Share2,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  DEFAULT_CATALOG,
  EmploymentType,
  getInitials,
  getPegaLayerMetadata,
  getRoleMetadata,
  getSafeExternalUrl,
  MemberRole,
  PegaAppLayer,
  PegaCaseType,
  PegaDataType,
  PegaRuleset,
  VERTICAL_COLOR_THEMES,
  VerticalColor,
} from '../../types/topology';
import { useTopologyStore } from '../../store/useTopologyStore';
import { getSharedMembersMap } from '../../utils/layoutEngine';
import {
  getActiveToggleClass,
  getCloseButtonClass,
  getDangerButtonClass,
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
import { CustomSelect } from '../ui/CustomSelect';
import { AllocationSlider } from '../ui/AllocationSlider';

export const InspectorSheet: React.FC = () => {
  const topology = useTopologyStore((s) => s.topology);
  const theme = useTopologyStore((s) => s.theme);
  const selectedTeamId = useTopologyStore((s) => s.selectedTeamId);
  const selectedVerticalId = useTopologyStore((s) => s.selectedVerticalId);
  const selectedAppId = useTopologyStore((s) => s.selectedAppId);
  const selectTeam = useTopologyStore((s) => s.selectTeam);
  const selectVertical = useTopologyStore((s) => s.selectVertical);
  const selectApp = useTopologyStore((s) => s.selectApp);
  const setViewMode = useTopologyStore((s) => s.setViewMode);

  const addCatalogItem = useTopologyStore((s) => s.addCatalogItem);
  const deleteCatalogItemByName = useTopologyStore(
    (s) => s.deleteCatalogItemByName
  );

  const updateTeam = useTopologyStore((s) => s.updateTeam);
  const duplicateTeam = useTopologyStore((s) => s.duplicateTeam);
  const deleteTeam = useTopologyStore((s) => s.deleteTeam);
  const addMemberToTeam = useTopologyStore((s) => s.addMemberToTeam);
  const updateTeamMember = useTopologyStore((s) => s.updateTeamMember);
  const removeMemberFromTeam = useTopologyStore((s) => s.removeMemberFromTeam);

  const updateVertical = useTopologyStore((s) => s.updateVertical);
  const deleteVertical = useTopologyStore((s) => s.deleteVertical);
  const addTeam = useTopologyStore((s) => s.addTeam);

  const updatePegaApplication = useTopologyStore((s) => s.updatePegaApplication);
  const duplicatePegaApplication = useTopologyStore(
    (s) => s.duplicatePegaApplication
  );
  const deletePegaApplication = useTopologyStore((s) => s.deletePegaApplication);
  const toggleTeamForApplication = useTopologyStore(
    (s) => s.toggleTeamForApplication
  );
  const requestConfirmation = useTopologyStore((s) => s.requestConfirmation);

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<string>('');
  const [newMemberAllocation, setNewMemberAllocation] = useState<number>(100);
  const [newMemberEmploymentType, setNewMemberEmploymentType] =
    useState<EmploymentType>('internal');
  const [newMemberCompany, setNewMemberCompany] = useState<string>('');

  // Local inputs for Application Blueprint sections
  const [newBuiltOnName, setNewBuiltOnName] = useState('');
  const [newRulesetName, setNewRulesetName] = useState('');
  const [newRulesetVersion, setNewRulesetVersion] = useState('');
  const [newRulesetType, setNewRulesetType] =
    useState<PegaRuleset['type']>('Core');
  const [newCaseTypeName, setNewCaseTypeName] = useState('');
  const [newCaseTypePrefix, setNewCaseTypePrefix] = useState('');
  const [newCaseTypeChannel, setNewCaseTypeChannel] = useState('');
  const [newDataTypeName, setNewDataTypeName] = useState('');
  const [newDataTypeSource, setNewDataTypeSource] = useState('');
  const [newDataTypeScope, setNewDataTypeScope] =
    useState<PegaDataType['scope']>('Domain');
  const [newIntegrationName, setNewIntegrationName] = useState('');

  const isDark = theme === 'dark';

  const selectedTeam = useMemo(
    () => topology.teams.find((t) => t.id === selectedTeamId) || null,
    [topology.teams, selectedTeamId]
  );

  const selectedVertical = useMemo(
    () => topology.verticals.find((v) => v.id === selectedVerticalId) || null,
    [topology.verticals, selectedVerticalId]
  );

  const selectedApp = useMemo(
    () =>
      (topology.applications || []).find((a) => a.id === selectedAppId) || null,
    [topology.applications, selectedAppId]
  );

  const catalog = topology.catalog ?? DEFAULT_CATALOG;

  const verticalOptions = useMemo(
    () =>
      topology.verticals.map((v) => ({
        value: v.id,
        label: v.name,
        sublabel: `#${v.id}`,
        dotColor:
          (VERTICAL_COLOR_THEMES[v.color] || VERTICAL_COLOR_THEMES.slate).hex,
      })),
    [topology.verticals]
  );

  const appOptions = useMemo(() => {
    const apps = catalog.filter((c) => c.kind === 'application');
    const list: {
      value: string;
      label: string;
      sublabel?: string;
      deletable?: boolean;
    }[] = apps.map((a) => ({
      value: a.name,
      label: a.name,
      sublabel: a.description,
      deletable: true,
    }));
    if (
      selectedTeam?.pegaApplication &&
      !list.some(
        (o) =>
          o.value.toLowerCase() === selectedTeam.pegaApplication.toLowerCase()
      )
    ) {
      list.push({
        value: selectedTeam.pegaApplication,
        label: selectedTeam.pegaApplication,
        sublabel: undefined,
        deletable: true,
      });
    }
    if (selectedTeam?.pegaApplication) {
      list.unshift({
        value: '',
        label: 'None (Unlink Application)',
        sublabel: undefined,
        deletable: false,
      });
    }
    return list;
  }, [catalog, selectedTeam?.pegaApplication]);

  const initiativeOptions = useMemo(() => {
    const inits = catalog.filter((c) => c.kind === 'initiative');
    const list: {
      value: string;
      label: string;
      sublabel?: string;
      deletable?: boolean;
    }[] = inits.map((i) => ({
      value: i.name,
      label: i.name,
      sublabel: i.description,
      deletable: true,
    }));
    if (
      selectedTeam?.initiative &&
      !list.some(
        (o) => o.value.toLowerCase() === selectedTeam.initiative!.toLowerCase()
      )
    ) {
      list.push({
        value: selectedTeam.initiative,
        label: selectedTeam.initiative,
        deletable: true,
      });
    }
    if (selectedTeam?.initiative) {
      list.unshift({
        value: '',
        label: 'None (Unlink Initiative)',
        deletable: false,
      });
    }
    return list;
  }, [catalog, selectedTeam?.initiative]);

  const companyOptions = useMemo(() => {
    const comps = catalog.filter((c) => c.kind === 'company');
    const list: {
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
    if (selectedTeam) {
      for (const m of selectedTeam.members) {
        if (
          m.company &&
          !list.some((o) => o.value.toLowerCase() === m.company!.toLowerCase())
        ) {
          list.push({
            value: m.company,
            label: m.company,
            deletable: true,
          });
        }
      }
    }
    return list;
  }, [catalog, selectedTeam]);

  const roleOptions = useMemo(() => {
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

    if (selectedTeam) {
      for (const m of selectedTeam.members) {
        if (
          m.role &&
          !base.some((b) => b.value.toLowerCase() === m.role.toLowerCase())
        ) {
          const meta = getRoleMetadata(m.role);
          base.push({
            value: m.role,
            label: m.role,
            sublabel: meta.description,
            dotColor: meta.dotColor,
            deletable: true,
          });
        }
      }
    }

    return base;
  }, [catalog, selectedTeam]);

  const layerOptions = useMemo(() => {
    const layers = catalog.filter((c) => c.kind === 'layer');
    const list: {
      value: string;
      label: string;
      sublabel?: string;
      dotColor?: string;
      deletable?: boolean;
    }[] = layers.map((l) => {
      const meta = getPegaLayerMetadata(l.name);
      return {
        value: l.name,
        label: l.name,
        sublabel: l.description || meta.description,
        dotColor: meta.dotColor,
        deletable: true,
      };
    });
    if (
      selectedApp?.layer &&
      !list.some(
        (o) => o.value.toLowerCase() === selectedApp.layer.toLowerCase()
      )
    ) {
      const meta = getPegaLayerMetadata(selectedApp.layer);
      list.push({
        value: selectedApp.layer,
        label: meta.label || selectedApp.layer,
        sublabel: meta.description,
        dotColor: meta.dotColor,
        deletable: true,
      });
    }
    if (selectedApp?.layer) {
      list.unshift({
        value: '',
        label: 'None (Clear Layer)',
        deletable: false,
      });
    }
    return list;
  }, [catalog, selectedApp?.layer]);

  const architectureOptions = useMemo(() => {
    const archs = catalog.filter((c) => c.kind === 'architecture');
    const list: {
      value: string;
      label: string;
      sublabel?: string;
      deletable?: boolean;
    }[] = archs.map((a) => ({
      value: a.name,
      label: a.name,
      sublabel: a.description,
      deletable: true,
    }));
    if (
      selectedApp?.architecture &&
      !list.some(
        (o) => o.value.toLowerCase() === selectedApp.architecture.toLowerCase()
      )
    ) {
      list.push({
        value: selectedApp.architecture,
        label: selectedApp.architecture,
        deletable: true,
      });
    }
    if (selectedApp?.architecture) {
      list.unshift({
        value: '',
        label: 'None (Clear Architecture)',
        deletable: false,
      });
    }
    return list;
  }, [catalog, selectedApp?.architecture]);

  const availableExistingMembers = useMemo(() => {
    if (!selectedTeam) return [];
    const sharedMap = getSharedMembersMap(topology.teams);
    const currentNames = new Set(
      selectedTeam.members.map((m) => m.name.trim().toLowerCase())
    );
    return Array.from(sharedMap.values()).filter(
      (item) => !currentNames.has(item.normalizedName)
    );
  }, [topology.teams, selectedTeam]);

  if (!selectedTeam && !selectedVertical && !selectedApp) return null;

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !newMemberName.trim()) return;
    addMemberToTeam(selectedTeam.id, {
      name: newMemberName.trim(),
      role: newMemberRole,
      allocation: Number(newMemberAllocation) || 100,
      employmentType: newMemberEmploymentType,
      company: newMemberCompany,
    });
    setNewMemberName('');
    setNewMemberAllocation(100);
  };

  const segmentedContainerClass = isDark
    ? 'bg-[#090c14] border-[#1f273a]'
    : 'bg-slate-100 border-slate-200';

  return (
    <aside
      className={`fixed top-[68px] bottom-20 left-3 z-30 w-full max-w-[410px] rounded-2xl border backdrop-blur-2xl flex flex-col overflow-hidden ${getPanelSurfaceClass(
        isDark
      )}`}
    >
      {/* ========================================================= */}
      {/* 1. TEAM / SQUAD INSPECTOR SHEET                           */}
      {/* ========================================================= */}
      {selectedTeam && (
        <>
          <div
            className={`flex items-center justify-between px-4 py-3 border-b ${getHeaderFooterSurfaceClass(
              isDark
            )}`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg border ${getHeaderIconBadgeClass(
                  isDark
                )}`}
              >
                <Layers className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider opacity-55">
                  Squad Configuration
                </span>
                <h2 className="text-sm font-bold leading-tight truncate max-w-[240px]">
                  {selectedTeam.name}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => selectTeam(null)}
              aria-label="Close squad inspector"
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${getCloseButtonClass(
                isDark
              )}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Squad Name & Parent Vertical */}
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                  Team / Squad Name
                </label>
                <input
                  type="text"
                  value={selectedTeam.name}
                  onChange={(e) =>
                    updateTeam(selectedTeam.id, { name: e.target.value })
                  }
                  className={`w-full px-3 py-2 rounded-lg text-xs font-medium border outline-none transition-colors ${getInputSurfaceClass(
                    isDark
                  )}`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                  Parent Business Vertical
                </label>
                <CustomSelect
                  value={selectedTeam.verticalId}
                  onChange={(val) =>
                    updateTeam(selectedTeam.id, { verticalId: val })
                  }
                  options={verticalOptions}
                />
              </div>
            </div>

            {/* Application & Strategic Initiative Selectors */}
            <div
              className={`space-y-3 pt-2 border-t ${
                isDark ? 'border-[#1f273a]' : 'border-slate-200/70'
              }`}
            >
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                  Application
                </label>
                <CustomSelect
                  value={selectedTeam.pegaApplication}
                  onChange={(val) =>
                    updateTeam(selectedTeam.id, { pegaApplication: val })
                  }
                  options={appOptions}
                  placeholder="Select or add application..."
                  onCreateOption={(newName) => {
                    addCatalogItem({ name: newName, kind: 'application' });
                  }}
                  createPlaceholder="New application..."
                  onDeleteOption={(appName) => {
                    deleteCatalogItemByName(appName, 'application');
                  }}
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                  Strategic Initiative (Optional)
                </label>
                <CustomSelect
                  value={selectedTeam.initiative || ''}
                  onChange={(val) =>
                    updateTeam(selectedTeam.id, {
                      initiative: val || undefined,
                    })
                  }
                  options={initiativeOptions}
                  placeholder="Select or add initiative..."
                  onCreateOption={(newName) => {
                    addCatalogItem({ name: newName, kind: 'initiative' });
                  }}
                  createPlaceholder="New strategic initiative..."
                  onDeleteOption={(initName) => {
                    deleteCatalogItemByName(initName, 'initiative');
                  }}
                />
              </div>

              {/* Squad Wiki Page URL */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider opacity-60 flex items-center gap-1">
                    <BookOpen className="h-3 w-3 opacity-70" />
                    Wiki Page URL (Optional)
                  </label>
                  {(() => {
                    const safeHref = getSafeExternalUrl(selectedTeam.wikiUrl);
                    if (!safeHref) return null;
                    return (
                      <a
                        href={safeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        <span>Open Wiki</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    );
                  })()}
                </div>
                <input
                  type="text"
                  value={selectedTeam.wikiUrl || ''}
                  onChange={(e) =>
                    updateTeam(selectedTeam.id, {
                      wikiUrl: e.target.value || undefined,
                    })
                  }
                  placeholder="https://wiki.example.com/squad"
                  className={`w-full px-3 py-2 rounded-lg text-xs font-medium border outline-none transition-colors ${getInputSurfaceClass(
                    isDark
                  )}`}
                />
              </div>
            </div>

            {/* Current Squad Roster */}
            <div
              className={`space-y-2.5 pt-2 border-t ${
                isDark ? 'border-[#1f273a]' : 'border-slate-200/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 opacity-70" />
                  Squad Roster ({selectedTeam.members.length})
                </label>
                <span className="text-[11px] font-mono font-semibold opacity-80">
                  {selectedTeam.members
                    .reduce((s, m) => s + m.allocation / 100, 0)
                    .toFixed(1)}{' '}
                  FTE
                </span>
              </div>

              <div className="space-y-2">
                {selectedTeam.members.map((member) => {
                  return (
                    <div
                      key={member.id}
                      className={`p-2.5 rounded-xl border space-y-2 ${getSubCardSurfaceClass(
                        isDark
                      )}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 border ${
                              isDark
                                ? 'bg-[#181f30] text-slate-300 border-[#28334d]'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {getInitials(member.name)}
                          </div>
                          <input
                            type="text"
                            value={member.name}
                            onChange={(e) =>
                              updateTeamMember(selectedTeam.id, member.id, {
                                name: e.target.value,
                              })
                            }
                            className={`w-full text-xs font-semibold px-2 py-1 rounded-lg border outline-none ${getInputSurfaceClass(
                              isDark
                            )}`}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            requestConfirmation({
                              title: `Remove "${member.name}" from ${selectedTeam.name}?`,
                              description: `Are you sure you want to remove "${member.name}" (${member.role}) from the "${selectedTeam.name}" squad?`,
                              confirmLabel: 'Remove Member',
                              onConfirm: () =>
                                removeMemberFromTeam(
                                  selectedTeam.id,
                                  member.id
                                ),
                            })
                          }
                          title="Remove member from squad"
                          aria-label={`Remove ${member.name} from squad`}
                          className={`p-1.5 rounded-lg cursor-pointer transition-colors shrink-0 ${getDangerIconButtonClass(
                            isDark
                          )}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-12 items-center gap-2">
                        <div className="col-span-6 min-w-0">
                          <CustomSelect
                            size="sm"
                            value={member.role}
                            onChange={(val) =>
                              updateTeamMember(selectedTeam.id, member.id, {
                                role: val as MemberRole,
                              })
                            }
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

                        <div className="col-span-6">
                          <AllocationSlider
                            value={member.allocation}
                            onChange={(pct) =>
                              updateTeamMember(selectedTeam.id, member.id, {
                                allocation: pct,
                              })
                            }
                          />
                        </div>
                      </div>

                      {/* Row 3: Resource Sourcing (Internal vs Outsourcing) & Company Mapping */}
                      <div
                        className={`flex items-center justify-between gap-2 pt-1.5 border-t ${
                          isDark ? 'border-[#1f273a]' : 'border-slate-200/70'
                        }`}
                      >
                        <div
                          className={`inline-flex rounded-lg p-0.5 border shrink-0 ${segmentedContainerClass}`}
                        >
                          {(['internal', 'outsourcing'] as const).map(
                            (type) => {
                              const isActive =
                                (member.employmentType || 'internal') === type;
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => {
                                    updateTeamMember(
                                      selectedTeam.id,
                                      member.id,
                                      {
                                        employmentType: type,
                                      }
                                    );
                                  }}
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition-colors ${
                                    isActive
                                      ? getActiveToggleClass(isDark)
                                      : getInactiveToggleClass(isDark)
                                  }`}
                                >
                                  {type === 'internal'
                                    ? 'Internal'
                                    : 'Outsourcing'}
                                </button>
                              );
                            }
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <CustomSelect
                            size="sm"
                            value={member.company || ''}
                            onChange={(val) =>
                              updateTeamMember(selectedTeam.id, member.id, {
                                company: val,
                              })
                            }
                            options={companyOptions}
                            placeholder="Select or add company..."
                            onCreateOption={(newComp) => {
                              addCatalogItem({
                                name: newComp,
                                kind: 'company',
                              });
                            }}
                            createPlaceholder="New company / vendor..."
                            onDeleteOption={(compName) => {
                              deleteCatalogItemByName(compName, 'company');
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add New Chapter Member Form */}
            <form
              onSubmit={handleAddMemberSubmit}
              className={`p-3 rounded-xl border space-y-2.5 ${getSubCardSurfaceClass(
                isDark
              )}`}
            >
              <div className="text-[11px] font-semibold flex items-center gap-1.5 opacity-80">
                <UserPlus className="h-3.5 w-3.5 text-indigo-400" />
                Add Member to Squad
              </div>

              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Member Full Name"
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none ${getInputSurfaceClass(
                  isDark
                )}`}
              />

              <div className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-6">
                  <CustomSelect
                    size="sm"
                    value={newMemberRole}
                    onChange={setNewMemberRole}
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
                <div className="col-span-6">
                  <AllocationSlider
                    value={newMemberAllocation}
                    onChange={setNewMemberAllocation}
                  />
                </div>
              </div>

              {/* Sourcing (Internal / Outsourcing) & Company for New Member */}
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`inline-flex rounded-lg p-0.5 border shrink-0 ${segmentedContainerClass}`}
                >
                  {(['internal', 'outsourcing'] as const).map((type) => {
                    const isActive = newMemberEmploymentType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setNewMemberEmploymentType(type);
                        }}
                        className={`px-2 py-1 rounded-md text-[10px] font-semibold cursor-pointer transition-colors ${
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

                <div className="flex-1 min-w-0">
                  <CustomSelect
                    size="sm"
                    value={newMemberCompany}
                    onChange={(val) => {
                      setNewMemberCompany(val);
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

              <button
                type="submit"
                className={`w-full py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${getPrimaryButtonClass()}`}
              >
                <Plus className="h-3.5 w-3.5" />
                Assign to {selectedTeam.name}
              </button>
            </form>

            {/* Quick Shared Member Assignment */}
            {availableExistingMembers.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider opacity-60 flex items-center gap-1">
                  <Share2 className="h-3 w-3 text-indigo-400" />
                  Quick-Share Existing Chapter Member (50%)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-0.5">
                  {availableExistingMembers.slice(0, 8).map((person) => (
                    <button
                      key={person.normalizedName}
                      type="button"
                      onClick={() =>
                        addMemberToTeam(selectedTeam.id, {
                          name: person.displayName,
                          role: person.primaryRole,
                          allocation: 50,
                          employmentType: person.employmentType,
                          company: person.company,
                        })
                      }
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer transition-colors ${getSecondaryButtonClass(
                        isDark
                      )}`}
                    >
                      <Plus className="h-2.5 w-2.5 text-indigo-400" />
                      <span>{person.displayName}</span>
                      {person.company && (
                        <span className="opacity-50">({person.company})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Squad Inspector Footer */}
          <div
            className={`p-3 border-t flex items-center justify-between gap-2 ${getHeaderFooterSurfaceClass(
              isDark
            )}`}
          >
            <button
              type="button"
              onClick={() => duplicateTeam(selectedTeam.id)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${getSecondaryButtonClass(
                isDark
              )}`}
            >
              <Copy className="h-3.5 w-3.5 text-indigo-400" />
              Duplicate Squad
            </button>

            <button
              type="button"
              onClick={() =>
                requestConfirmation({
                  title: `Delete Squad "${selectedTeam.name}"?`,
                  description: `Are you sure you want to permanently delete the "${selectedTeam.name}" squad and its ${selectedTeam.members.length} member assignment(s)?`,
                  confirmLabel: 'Delete Squad',
                  onConfirm: () => deleteTeam(selectedTeam.id),
                })
              }
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${getDangerButtonClass(
                isDark
              )}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 2. BUSINESS VERTICAL INSPECTOR SHEET                      */}
      {/* ========================================================= */}
      {selectedVertical && (
        <>
          <div
            className={`flex items-center justify-between px-4 py-3 border-b ${getHeaderFooterSurfaceClass(
              isDark
            )}`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg border ${getHeaderIconBadgeClass(
                  isDark
                )}`}
              >
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider opacity-55">
                  Vertical Zone Inspector
                </span>
                <h2 className="text-sm font-bold leading-tight">
                  {selectedVertical.name}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => selectVertical(null)}
              aria-label="Close vertical inspector"
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${getCloseButtonClass(
                isDark
              )}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                Business Vertical Name
              </label>
              <input
                type="text"
                value={selectedVertical.name}
                onChange={(e) =>
                  updateVertical(selectedVertical.id, { name: e.target.value })
                }
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium border outline-none transition-colors ${getInputSurfaceClass(
                  isDark
                )}`}
              />
            </div>

            {/* Subtle Indicator Dot Color */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 opacity-70" />
                Vertical Accent Theme
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(VERTICAL_COLOR_THEMES) as VerticalColor[]).map(
                  (colorKey) => {
                    const cfg = VERTICAL_COLOR_THEMES[colorKey];
                    const isSelectedColor = selectedVertical.color === colorKey;
                    return (
                      <button
                        key={colorKey}
                        type="button"
                        onClick={() =>
                          updateVertical(selectedVertical.id, {
                            color: colorKey,
                          })
                        }
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          isSelectedColor
                            ? getActiveToggleClass(isDark)
                            : getSecondaryButtonClass(isDark)
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: cfg.hex,
                            boxShadow: `0 0 8px ${cfg.hex}66`,
                          }}
                        />
                        <span className="truncate">{cfg.label}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Squads inside this Vertical */}
            <div
              className={`space-y-2.5 pt-2 border-t ${
                isDark ? 'border-[#1f273a]' : 'border-slate-200/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                  Squads in {selectedVertical.name}
                </label>
                <button
                  type="button"
                  onClick={() => addTeam({ verticalId: selectedVertical.id })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Squad
                </button>
              </div>

              <div className="space-y-1.5">
                {topology.teams
                  .filter((t) => t.verticalId === selectedVertical.id)
                  .map((squad) => (
                    <div
                      key={squad.id}
                      onClick={() => selectTeam(squad.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${getSubCardSurfaceClass(
                        isDark
                      )} ${
                        isDark ? 'hover:bg-[#192030]' : 'hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold">
                          {squad.name}
                        </div>
                        <div className="text-[10px] opacity-60">
                          {squad.pegaApplication
                            ? `${squad.pegaApplication} • `
                            : ''}
                          {squad.members.length}{' '}
                          {squad.members.length === 1 ? 'member' : 'members'}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-400">
                        Inspect →
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Vertical Inspector Footer (Matches Squad Inspector Footer 100%) */}
          <div
            className={`p-3 border-t flex items-center justify-between gap-2 ${getHeaderFooterSurfaceClass(
              isDark
            )}`}
          >
            <button
              type="button"
              onClick={() => addTeam({ verticalId: selectedVertical.id })}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${getSecondaryButtonClass(
                isDark
              )}`}
            >
              <Plus className="h-3.5 w-3.5 text-indigo-400" />
              New Squad in {selectedVertical.name}
            </button>

            <button
              type="button"
              onClick={() => {
                const squadCountInVert = topology.teams.filter(
                  (t) => t.verticalId === selectedVertical.id
                ).length;
                requestConfirmation({
                  title: `Delete Vertical "${selectedVertical.name}"?`,
                  description:
                    squadCountInVert > 0
                      ? `Are you sure you want to delete the "${selectedVertical.name}" vertical? Its ${squadCountInVert} squad(s) will be reassigned or removed if no other vertical exists.`
                      : `Are you sure you want to delete the "${selectedVertical.name}" business vertical?`,
                  confirmLabel: 'Delete Vertical',
                  onConfirm: () => deleteVertical(selectedVertical.id),
                });
              }}
              title="Delete vertical zone"
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${getDangerButtonClass(
                isDark
              )}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 3. APPLICATION BLUEPRINT INSPECTOR SHEET                  */}
      {/* ========================================================= */}
      {selectedApp && (
        <>
          <div
            className={`flex items-center justify-between px-4 py-3 border-b ${getHeaderFooterSurfaceClass(
              isDark
            )}`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-lg border ${getHeaderIconBadgeClass(
                  isDark
                )}`}
              >
                <Box className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider opacity-55">
                  Application Blueprint
                </span>
                <h2 className="text-sm font-bold leading-tight truncate max-w-[240px]">
                  {selectedApp.name}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => selectApp(null)}
              aria-label="Close application inspector"
              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${getCloseButtonClass(
                isDark
              )}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Application Identity, Version, Layer, Architecture & Wiki */}
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-8">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                    Application Name
                  </label>
                  <input
                    type="text"
                    value={selectedApp.name}
                    onChange={(e) =>
                      updatePegaApplication(selectedApp.id, {
                        name: e.target.value,
                      })
                    }
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium border outline-none transition-colors ${getInputSurfaceClass(
                      isDark
                    )}`}
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={selectedApp.version || ''}
                    onChange={(e) =>
                      updatePegaApplication(selectedApp.id, {
                        version: e.target.value,
                      })
                    }
                    placeholder="e.g. 1.0.0"
                    className={`w-full px-2.5 py-2 rounded-lg text-xs font-mono font-medium border outline-none transition-colors ${getInputSurfaceClass(
                      isDark
                    )}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                  Application Layer / Tier
                </label>
                <CustomSelect
                  value={selectedApp.layer || ''}
                  onChange={(val) =>
                    updatePegaApplication(selectedApp.id, {
                      layer: val as PegaAppLayer,
                    })
                  }
                  options={layerOptions}
                  placeholder="Select or add layer..."
                  onCreateOption={(newLayer) => {
                    addCatalogItem({ name: newLayer, kind: 'layer' });
                  }}
                  createPlaceholder="New layer / tier..."
                  onDeleteOption={(layerName) => {
                    deleteCatalogItemByName(layerName, 'layer');
                  }}
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                  Architecture / Platform
                </label>
                <CustomSelect
                  value={selectedApp.architecture || ''}
                  onChange={(val) =>
                    updatePegaApplication(selectedApp.id, { architecture: val })
                  }
                  options={architectureOptions}
                  placeholder="Select or add architecture..."
                  onCreateOption={(newStack) => {
                    addCatalogItem({ name: newStack, kind: 'architecture' });
                  }}
                  createPlaceholder="New architecture / platform..."
                  onDeleteOption={(archName) => {
                    deleteCatalogItemByName(archName, 'architecture');
                  }}
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-1">
                  Application Description (Optional)
                </label>
                <input
                  type="text"
                  value={selectedApp.description || ''}
                  onChange={(e) =>
                    updatePegaApplication(selectedApp.id, {
                      description: e.target.value || undefined,
                    })
                  }
                  placeholder="Core business purpose or scope..."
                  className={`w-full px-3 py-2 rounded-lg text-xs font-medium border outline-none transition-colors ${getInputSurfaceClass(
                    isDark
                  )}`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider opacity-60 flex items-center gap-1">
                    <BookOpen className="h-3 w-3 opacity-70" />
                    Documentation / Wiki URL (Optional)
                  </label>
                  {(() => {
                    const safeHref = getSafeExternalUrl(selectedApp.wikiUrl);
                    if (!safeHref) return null;
                    return (
                      <a
                        href={safeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        <span>Open Wiki</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    );
                  })()}
                </div>
                <input
                  type="text"
                  value={selectedApp.wikiUrl || ''}
                  onChange={(e) =>
                    updatePegaApplication(selectedApp.id, {
                      wikiUrl: e.target.value || undefined,
                    })
                  }
                  placeholder="https://wiki.example.com/app-blueprint"
                  className={`w-full px-3 py-2 rounded-lg text-xs font-medium border outline-none transition-colors ${getInputSurfaceClass(
                    isDark
                  )}`}
                />
              </div>
            </div>

            {/* 1. Dependencies & Parent Systems */}
            <div
              className={`space-y-2.5 pt-3 border-t ${
                isDark ? 'border-[#1f273a]' : 'border-slate-200/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5 text-indigo-400" />
                  Dependencies & Parent Systems (
                  {selectedApp.builtOnApplications?.length || 0})
                </label>
              </div>

              {selectedApp.builtOnApplications &&
                selectedApp.builtOnApplications.length > 0 && (
                  <div className="space-y-1.5">
                    {selectedApp.builtOnApplications.map((boName) => (
                      <div
                        key={boName}
                        className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border ${getSubCardSurfaceClass(
                          isDark
                        )}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <GitBranch className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          <span className="text-xs font-semibold truncate">
                            {boName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            requestConfirmation({
                              title: `Remove Dependency "${boName}"?`,
                              description: `Remove "${boName}" from the dependencies of "${selectedApp.name}"?`,
                              confirmLabel: 'Remove Dependency',
                              onConfirm: () =>
                                updatePegaApplication(selectedApp.id, {
                                  builtOnApplications: (
                                    selectedApp.builtOnApplications || []
                                  ).filter((b) => b !== boName),
                                }),
                            })
                          }
                          className={`p-1 rounded-lg cursor-pointer transition-colors shrink-0 ${getDangerIconButtonClass(
                            isDark
                          )}`}
                          title="Remove dependency"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              {/* Quick Toggle Other Board Applications as Dependency */}
              {(topology.applications || []).filter(
                (a) =>
                  a.id !== selectedApp.id &&
                  !(selectedApp.builtOnApplications || []).some(
                    (bo) => bo.toLowerCase() === a.name.toLowerCase()
                  )
              ).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(topology.applications || [])
                    .filter(
                      (a) =>
                        a.id !== selectedApp.id &&
                        !(selectedApp.builtOnApplications || []).some(
                          (bo) => bo.toLowerCase() === a.name.toLowerCase()
                        )
                    )
                    .map((otherApp) => (
                      <button
                        key={otherApp.id}
                        type="button"
                        onClick={() =>
                          updatePegaApplication(selectedApp.id, {
                            builtOnApplications: [
                              ...(selectedApp.builtOnApplications || []),
                              otherApp.name,
                            ],
                          })
                        }
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer transition-colors ${getSecondaryButtonClass(
                          isDark
                        )}`}
                      >
                        <Plus className="h-2.5 w-2.5 text-indigo-400" />
                        <span>Link {otherApp.name}</span>
                      </button>
                    ))}
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newBuiltOnName}
                  onChange={(e) => setNewBuiltOnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newBuiltOnName.trim()) {
                      e.preventDefault();
                      const clean = newBuiltOnName.trim();
                      if (
                        !(selectedApp.builtOnApplications || []).some(
                          (b) => b.toLowerCase() === clean.toLowerCase()
                        )
                      ) {
                        updatePegaApplication(selectedApp.id, {
                          builtOnApplications: [
                            ...(selectedApp.builtOnApplications || []),
                            clean,
                          ],
                        });
                      }
                      setNewBuiltOnName('');
                    }
                  }}
                  placeholder="Add parent / upstream dependency..."
                  className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs border outline-none ${getInputSurfaceClass(
                    isDark
                  )}`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const clean = newBuiltOnName.trim();
                    if (!clean) return;
                    if (
                      !(selectedApp.builtOnApplications || []).some(
                        (b) => b.toLowerCase() === clean.toLowerCase()
                      )
                    ) {
                      updatePegaApplication(selectedApp.id, {
                        builtOnApplications: [
                          ...(selectedApp.builtOnApplications || []),
                          clean,
                        ],
                      });
                    }
                    setNewBuiltOnName('');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${getPrimaryButtonClass()}`}
                >
                  Add
                </button>
              </div>
            </div>

            {/* 2. Modules & Packages */}
            <div
              className={`space-y-2.5 pt-3 border-t ${
                isDark ? 'border-[#1f273a]' : 'border-slate-200/70'
              }`}
            >
              <label className="text-[10px] font-semibold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-indigo-400" />
                Modules & Packages ({selectedApp.rulesets?.length || 0})
              </label>

              <div className="space-y-1.5">
                {(selectedApp.rulesets || []).map((rs) => (
                  <div
                    key={rs.id}
                    className={`p-2 rounded-xl border space-y-1.5 ${getSubCardSurfaceClass(
                      isDark
                    )}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <input
                        type="text"
                        value={rs.name}
                        onChange={(e) =>
                          updatePegaApplication(selectedApp.id, {
                            rulesets: (selectedApp.rulesets || []).map((item) =>
                              item.id === rs.id
                                ? { ...item, name: e.target.value }
                                : item
                            ),
                          })
                        }
                        className={`flex-1 px-2 py-1 rounded-lg text-xs font-semibold border outline-none ${getInputSurfaceClass(
                          isDark
                        )}`}
                      />
                      <input
                        type="text"
                        value={rs.version}
                        placeholder="Version"
                        onChange={(e) =>
                          updatePegaApplication(selectedApp.id, {
                            rulesets: (selectedApp.rulesets || []).map((item) =>
                              item.id === rs.id
                                ? { ...item, version: e.target.value }
                                : item
                            ),
                          })
                        }
                        className={`w-20 px-2 py-1 rounded-lg text-xs font-mono border outline-none ${getInputSurfaceClass(
                          isDark
                        )}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          requestConfirmation({
                            title: `Delete Module "${rs.name}"?`,
                            description: `Are you sure you want to remove module "${rs.name}" from "${selectedApp.name}"?`,
                            confirmLabel: 'Delete Module',
                            onConfirm: () =>
                              updatePegaApplication(selectedApp.id, {
                                rulesets: (selectedApp.rulesets || []).filter(
                                  (item) => item.id !== rs.id
                                ),
                              }),
                          })
                        }
                        className={`p-1 rounded-lg cursor-pointer transition-colors shrink-0 ${getDangerIconButtonClass(
                          isDark
                        )}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      {(
                        [
                          'Core',
                          'Integration',
                          'Branch',
                          'Shared',
                        ] as const
                      ).map((t) => {
                        const isTypeActive =
                          rs.type === t ||
                          (t === 'Core' && rs.type === 'Application');
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() =>
                              updatePegaApplication(selectedApp.id, {
                                rulesets: (selectedApp.rulesets || []).map(
                                  (item) =>
                                    item.id === rs.id
                                      ? { ...item, type: t }
                                      : item
                                ),
                              })
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                              isTypeActive
                                ? getActiveToggleClass(isDark)
                                : getInactiveToggleClass(isDark)
                            }`}
                          >
                            {t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Module Form */}
              <div
                className={`p-2.5 rounded-xl border space-y-2 ${getSubCardSurfaceClass(
                  isDark
                )}`}
              >
                <div className="grid grid-cols-12 gap-1.5">
                  <input
                    type="text"
                    value={newRulesetName}
                    onChange={(e) => setNewRulesetName(e.target.value)}
                    placeholder="Module / Package Name"
                    className={`col-span-7 px-2.5 py-1.5 rounded-lg text-xs border outline-none ${getInputSurfaceClass(
                      isDark
                    )}`}
                  />
                  <input
                    type="text"
                    value={newRulesetVersion}
                    onChange={(e) => setNewRulesetVersion(e.target.value)}
                    placeholder="Version (optional)"
                    className={`col-span-5 px-2 py-1.5 rounded-lg text-xs font-mono border outline-none ${getInputSurfaceClass(
                      isDark
                    )}`}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {(
                      [
                        'Core',
                        'Integration',
                        'Branch',
                        'Shared',
                      ] as const
                    ).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewRulesetType(t)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                          newRulesetType === t
                            ? getActiveToggleClass(isDark)
                            : getInactiveToggleClass(isDark)
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const clean = newRulesetName.trim();
                      if (!clean) return;
                      const nextRs: PegaRuleset = {
                        id: `rs-${Date.now()}-${Math.random()
                          .toString(36)
                          .slice(2, 5)}`,
                        name: clean,
                        version: newRulesetVersion.trim(),
                        type: newRulesetType,
                      };
                      updatePegaApplication(selectedApp.id, {
                        rulesets: [...(selectedApp.rulesets || []), nextRs],
                      });
                      setNewRulesetName('');
                      setNewRulesetVersion('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${getPrimaryButtonClass()}`}
                  >
                    + Add Module
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Workflows & Capabilities */}
            <div
              className={`space-y-2.5 pt-3 border-t ${
                isDark ? 'border-[#1f273a]' : 'border-slate-200/70'
              }`}
            >
              <label className="text-[10px] font-semibold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                <FolderKanban className="h-3.5 w-3.5 text-sky-400" />
                Workflows & Capabilities ({selectedApp.caseTypes?.length || 0})
              </label>

              <div className="space-y-1.5">
                {(selectedApp.caseTypes || []).map((ct) => (
                  <div
                    key={ct.id}
                    className={`p-2 rounded-xl border space-y-1.5 ${getSubCardSurfaceClass(
                      isDark
                    )}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <input
                        type="text"
                        value={ct.name}
                        onChange={(e) =>
                          updatePegaApplication(selectedApp.id, {
                            caseTypes: (selectedApp.caseTypes || []).map(
                              (item) =>
                                item.id === ct.id
                                  ? { ...item, name: e.target.value }
                                  : item
                            ),
                          })
                        }
                        className={`flex-1 px-2 py-1 rounded-lg text-xs font-semibold border outline-none ${getInputSurfaceClass(
                          isDark
                        )}`}
                      />
                      <input
                        type="text"
                        value={ct.workPoolPrefix || ''}
                        onChange={(e) =>
                          updatePegaApplication(selectedApp.id, {
                            caseTypes: (selectedApp.caseTypes || []).map(
                              (item) =>
                                item.id === ct.id
                                  ? {
                                      ...item,
                                      workPoolPrefix:
                                        e.target.value || undefined,
                                    }
                                  : item
                            ),
                          })
                        }
                        placeholder="Code"
                        className={`w-16 px-2 py-1 rounded-lg text-xs font-mono border outline-none ${getInputSurfaceClass(
                          isDark
                        )}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          requestConfirmation({
                            title: `Delete Workflow "${ct.name}"?`,
                            description: `Are you sure you want to remove workflow "${ct.name}" from "${selectedApp.name}"?`,
                            confirmLabel: 'Delete Workflow',
                            onConfirm: () =>
                              updatePegaApplication(selectedApp.id, {
                                caseTypes: (
                                  selectedApp.caseTypes || []
                                ).filter((item) => item.id !== ct.id),
                              }),
                          })
                        }
                        className={`p-1 rounded-lg cursor-pointer transition-colors shrink-0 ${getDangerIconButtonClass(
                          isDark
                        )}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={ct.channel || ''}
                      onChange={(e) =>
                        updatePegaApplication(selectedApp.id, {
                          caseTypes: (selectedApp.caseTypes || []).map((item) =>
                            item.id === ct.id
                              ? { ...item, channel: e.target.value }
                              : item
                          ),
                        })
                      }
                      placeholder="Channel / Trigger (optional)"
                      className={`w-full px-2 py-1 rounded-lg text-[11px] border outline-none ${getInputSurfaceClass(
                        isDark
                      )}`}
                    />
                  </div>
                ))}
              </div>

              {/* Add Workflow Form */}
              <div
                className={`p-2.5 rounded-xl border space-y-2 ${getSubCardSurfaceClass(
                  isDark
                )}`}
              >
                <div className="grid grid-cols-12 gap-1.5">
                  <input
                    type="text"
                    value={newCaseTypeName}
                    onChange={(e) => setNewCaseTypeName(e.target.value)}
                    placeholder="Workflow / Capability Name"
                    className={`col-span-8 px-2.5 py-1.5 rounded-lg text-xs border outline-none ${getInputSurfaceClass(
                      isDark
                    )}`}
                  />
                  <input
                    type="text"
                    value={newCaseTypePrefix}
                    onChange={(e) => setNewCaseTypePrefix(e.target.value)}
                    placeholder="Code / ID"
                    className={`col-span-4 px-2 py-1.5 rounded-lg text-xs font-mono border outline-none ${getInputSurfaceClass(
                      isDark
                    )}`}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={newCaseTypeChannel}
                    onChange={(e) => setNewCaseTypeChannel(e.target.value)}
                    placeholder="Channel / Trigger (optional)"
                    className={`flex-1 px-2.5 py-1 rounded-lg text-xs border outline-none ${getInputSurfaceClass(
                      isDark
                    )}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = newCaseTypeName.trim();
                      if (!clean) return;
                      const nextCt: PegaCaseType = {
                        id: `ct-${Date.now()}-${Math.random()
                          .toString(36)
                          .slice(2, 5)}`,
                        name: clean,
                        workPoolPrefix: newCaseTypePrefix.trim() || undefined,
                        channel: newCaseTypeChannel.trim(),
                      };
                      updatePegaApplication(selectedApp.id, {
                        caseTypes: [...(selectedApp.caseTypes || []), nextCt],
                      });
                      setNewCaseTypeName('');
                      setNewCaseTypePrefix('');
                      setNewCaseTypeChannel('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${getPrimaryButtonClass()}`}
                  >
                    + Add Workflow
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Data Entities & Integrations */}
            <div
              className={`space-y-2.5 pt-3 border-t ${
                isDark ? 'border-[#1f273a]' : 'border-slate-200/70'
              }`}
            >
              <label className="text-[10px] font-semibold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-violet-400" />
                Data Entities ({selectedApp.dataTypes?.length || 0})
              </label>

              <div className="space-y-1.5">
                {(selectedApp.dataTypes || []).map((dt) => (
                  <div
                    key={dt.id}
                    className={`p-2 rounded-xl border space-y-1.5 ${getSubCardSurfaceClass(
                      isDark
                    )}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <input
                        type="text"
                        value={dt.name}
                        onChange={(e) =>
                          updatePegaApplication(selectedApp.id, {
                            dataTypes: (selectedApp.dataTypes || []).map(
                              (item) =>
                                item.id === dt.id
                                  ? { ...item, name: e.target.value }
                                  : item
                            ),
                          })
                        }
                        className={`flex-1 px-2 py-1 rounded-lg text-xs font-semibold border outline-none ${getInputSurfaceClass(
                          isDark
                        )}`}
                      />
                      <input
                        type="text"
                        value={dt.sourceSystem}
                        onChange={(e) =>
                          updatePegaApplication(selectedApp.id, {
                            dataTypes: (selectedApp.dataTypes || []).map(
                              (item) =>
                                item.id === dt.id
                                  ? { ...item, sourceSystem: e.target.value }
                                  : item
                            ),
                          })
                        }
                        placeholder="Source System"
                        className={`w-28 px-2 py-1 rounded-lg text-xs border outline-none ${getInputSurfaceClass(
                          isDark
                        )}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          requestConfirmation({
                            title: `Delete Data Entity "${dt.name}"?`,
                            description: `Are you sure you want to remove data entity "${dt.name}" from "${selectedApp.name}"?`,
                            confirmLabel: 'Delete Data Entity',
                            onConfirm: () =>
                              updatePegaApplication(selectedApp.id, {
                                dataTypes: (
                                  selectedApp.dataTypes || []
                                ).filter((item) => item.id !== dt.id),
                              }),
                          })
                        }
                        className={`p-1 rounded-lg cursor-pointer transition-colors shrink-0 ${getDangerIconButtonClass(
                          isDark
                        )}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      {(
                        ['Domain', 'Enterprise', 'Shared'] as const
                      ).map((sc) => {
                        const isScopeActive =
                          dt.scope === sc ||
                          (sc === 'Domain' && dt.scope === 'Implementation');
                        return (
                          <button
                            key={sc}
                            type="button"
                            onClick={() =>
                              updatePegaApplication(selectedApp.id, {
                                dataTypes: (selectedApp.dataTypes || []).map(
                                  (item) =>
                                    item.id === dt.id
                                      ? { ...item, scope: sc }
                                      : item
                                ),
                              })
                            }
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                              isScopeActive
                                ? getActiveToggleClass(isDark)
                                : getInactiveToggleClass(isDark)
                            }`}
                          >
                            {sc}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Data Entity Form */}
              <div
                className={`p-2.5 rounded-xl border space-y-2 ${getSubCardSurfaceClass(
                  isDark
                )}`}
              >
                <div className="grid grid-cols-12 gap-1.5">
                  <input
                    type="text"
                    value={newDataTypeName}
                    onChange={(e) => setNewDataTypeName(e.target.value)}
                    placeholder="Data Entity / Model Name"
                    className={`col-span-7 px-2.5 py-1.5 rounded-lg text-xs border outline-none ${getInputSurfaceClass(
                      isDark
                    )}`}
                  />
                  <input
                    type="text"
                    value={newDataTypeSource}
                    onChange={(e) => setNewDataTypeSource(e.target.value)}
                    placeholder="Source System (optional)"
                    className={`col-span-5 px-2 py-1.5 rounded-lg text-xs border outline-none ${getInputSurfaceClass(
                      isDark
                    )}`}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {(['Domain', 'Enterprise', 'Shared'] as const).map(
                      (sc) => (
                        <button
                          key={sc}
                          type="button"
                          onClick={() => setNewDataTypeScope(sc)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors ${
                            newDataTypeScope === sc
                              ? getActiveToggleClass(isDark)
                              : getInactiveToggleClass(isDark)
                          }`}
                        >
                          {sc}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const clean = newDataTypeName.trim();
                      if (!clean) return;
                      const nextDt: PegaDataType = {
                        id: `dt-${Date.now()}-${Math.random()
                          .toString(36)
                          .slice(2, 5)}`,
                        name: clean,
                        sourceSystem: newDataTypeSource.trim(),
                        scope: newDataTypeScope,
                      };
                      updatePegaApplication(selectedApp.id, {
                        dataTypes: [...(selectedApp.dataTypes || []), nextDt],
                      });
                      setNewDataTypeName('');
                      setNewDataTypeSource('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${getPrimaryButtonClass()}`}
                  >
                    + Add Entity
                  </button>
                </div>
              </div>

              {/* Integrations */}
              <div className="pt-1 space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                  <Plug className="h-3.5 w-3.5 text-emerald-400" />
                  External Integrations ({selectedApp.integrations?.length || 0}
                  )
                </label>

                {selectedApp.integrations &&
                  selectedApp.integrations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedApp.integrations.map((intName) => (
                        <span
                          key={intName}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${getSubCardSurfaceClass(
                            isDark
                          )}`}
                        >
                          <Plug className="h-3 w-3 text-emerald-400 shrink-0" />
                          <span>{intName}</span>
                          <button
                            type="button"
                            onClick={() =>
                              requestConfirmation({
                                title: `Remove Integration "${intName}"?`,
                                description: `Remove integration "${intName}" from "${selectedApp.name}"?`,
                                confirmLabel: 'Remove Integration',
                                onConfirm: () =>
                                  updatePegaApplication(selectedApp.id, {
                                    integrations: (
                                      selectedApp.integrations || []
                                    ).filter((i) => i !== intName),
                                  }),
                              })
                            }
                            className={`p-0.5 rounded cursor-pointer transition-colors ${getDangerIconButtonClass(
                              isDark
                            )}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newIntegrationName}
                    onChange={(e) => setNewIntegrationName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newIntegrationName.trim()) {
                        e.preventDefault();
                        const clean = newIntegrationName.trim();
                        if (
                          !(selectedApp.integrations || []).some(
                            (i) => i.toLowerCase() === clean.toLowerCase()
                          )
                        ) {
                          updatePegaApplication(selectedApp.id, {
                            integrations: [
                              ...(selectedApp.integrations || []),
                              clean,
                            ],
                          });
                        }
                        setNewIntegrationName('');
                      }
                    }}
                    placeholder="Add REST / Kafka / SOAP Connector..."
                    className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs border outline-none ${getInputSurfaceClass(
                      isDark
                    )}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = newIntegrationName.trim();
                      if (!clean) return;
                      if (
                        !(selectedApp.integrations || []).some(
                          (i) => i.toLowerCase() === clean.toLowerCase()
                        )
                      ) {
                        updatePegaApplication(selectedApp.id, {
                          integrations: [
                            ...(selectedApp.integrations || []),
                            clean,
                          ],
                        });
                      }
                      setNewIntegrationName('');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${getPrimaryButtonClass()}`}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* 5. Mapped Squads / Teams Ownership */}
            <div
              className={`space-y-2.5 pt-3 border-t ${
                isDark ? 'border-[#1f273a]' : 'border-slate-200/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold uppercase tracking-wider opacity-60 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  Mapped Squads (
                  {
                    topology.teams.filter(
                      (t) =>
                        t.pegaApplication.trim().toLowerCase() ===
                        selectedApp.name.trim().toLowerCase()
                    ).length
                  }
                  )
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const newTeamId = addTeam({
                      pegaApplication: selectedApp.name,
                    });
                    // Keep inspecting this app unless user wants to jump
                    if (newTeamId) {
                      selectApp(selectedApp.id);
                    }
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Squad for App
                </button>
              </div>

              {topology.teams.length === 0 ? (
                <div className="text-xs opacity-60 italic">
                  No squads exist yet. Click "+ New Squad for App" to create one
                  mapped to {selectedApp.name}.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {topology.teams.map((team) => {
                    const isMapped =
                      team.pegaApplication.trim().toLowerCase() ===
                      selectedApp.name.trim().toLowerCase();
                    const vert = topology.verticals.find(
                      (v) => v.id === team.verticalId
                    );
                    return (
                      <div
                        key={team.id}
                        className={`flex items-center justify-between gap-2 p-2 rounded-xl border ${getSubCardSurfaceClass(
                          isDark
                        )}`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">
                            {team.name}
                          </div>
                          <div className="text-[10px] opacity-60 truncate">
                            {vert ? `${vert.name} • ` : ''}
                            {team.members.length} mbrs
                            {team.pegaApplication && !isMapped
                              ? ` • Currently on ${team.pegaApplication}`
                              : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              toggleTeamForApplication(selectedApp.id, team.id)
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors ${
                              isMapped
                                ? getActiveToggleClass(isDark)
                                : getSecondaryButtonClass(isDark)
                            }`}
                          >
                            {isMapped && <Check className="h-3 w-3" />}
                            <span>{isMapped ? 'Mapped' : 'Map Squad'}</span>
                          </button>

                          {isMapped && (
                            <button
                              type="button"
                              onClick={() => {
                                setViewMode('teams');
                                selectTeam(team.id);
                              }}
                              title="Inspect Squad on Teams Board"
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono cursor-pointer transition-colors ${getSecondaryButtonClass(
                                isDark
                              )}`}
                            >
                              →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Application Inspector Footer */}
          <div
            className={`p-3 border-t flex items-center justify-between gap-2 ${getHeaderFooterSurfaceClass(
              isDark
            )}`}
          >
            <button
              type="button"
              onClick={() => duplicatePegaApplication(selectedApp.id)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${getSecondaryButtonClass(
                isDark
              )}`}
            >
              <Copy className="h-3.5 w-3.5 text-indigo-400" />
              Duplicate App
            </button>

            <button
              type="button"
              onClick={() =>
                requestConfirmation({
                  title: `Delete Application "${selectedApp.name}"?`,
                  description: `Are you sure you want to permanently delete "${selectedApp.name}" and its mapped dependencies, modules, workflows, and data entities? Any squads mapped to it will be unlinked.`,
                  confirmLabel: 'Delete Application',
                  onConfirm: () => deletePegaApplication(selectedApp.id),
                })
              }
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${getDangerButtonClass(
                isDark
              )}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </aside>
  );
};
