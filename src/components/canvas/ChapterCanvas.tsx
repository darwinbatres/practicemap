import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Edge,
  MiniMap,
  Node,
  OnNodeDrag,
  ReactFlow,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTopologyStore } from '../../store/useTopologyStore';
import {
  computeVerticalBounds,
  getSharedMembersMap,
} from '../../utils/layoutEngine';
import {
  getPanelSurfaceClass,
  getPrimaryButtonClass,
  getSecondaryButtonClass,
} from '../../utils/uiTheme';
import { VerticalZoneNode } from './VerticalZoneNode';
import { TeamCardNode } from './TeamCardNode';
import { SharedMemberEdge } from './SharedMemberEdge';
import { PegaAppCardNode } from './PegaAppCardNode';
import { BuiltOnAppEdge } from './BuiltOnAppEdge';
import { BottomFloatingDock } from '../dock/BottomFloatingDock';
import { PracticePlannerView } from '../planner/PracticePlannerView';
import { BusinessVertical, PegaApplicationBlueprint } from '../../types/topology';

const nodeTypes = {
  verticalZone: VerticalZoneNode,
  teamCard: TeamCardNode,
  pegaAppCard: PegaAppCardNode,
};

const edgeTypes = {
  sharedMember: SharedMemberEdge,
  builtOnApp: BuiltOnAppEdge,
};

export const ChapterCanvas: React.FC = () => {
  const { fitView, getViewport, setViewport } = useReactFlow();

  const topology = useTopologyStore((s) => s.topology);
  const theme = useTopologyStore((s) => s.theme);
  const viewMode = useTopologyStore((s) => s.viewMode);
  const teamsViewport = useTopologyStore((s) => s.teamsViewport);
  const applicationsViewport = useTopologyStore((s) => s.applicationsViewport);
  const setCanvasViewport = useTopologyStore((s) => s.setCanvasViewport);
  const spotlightFilter = useTopologyStore((s) => s.spotlightFilter);
  const searchQuery = useTopologyStore((s) => s.searchQuery);
  const showAllSharedConnectors = useTopologyStore(
    (s) => s.showAllSharedConnectors
  );
  const selectedTeamId = useTopologyStore((s) => s.selectedTeamId);
  const selectedVerticalId = useTopologyStore((s) => s.selectedVerticalId);
  const selectedAppId = useTopologyStore((s) => s.selectedAppId);
  const selectTeam = useTopologyStore((s) => s.selectTeam);
  const selectVertical = useTopologyStore((s) => s.selectVertical);
  const selectApp = useTopologyStore((s) => s.selectApp);
  const moveVertical = useTopologyStore((s) => s.moveVertical);
  const moveTeam = useTopologyStore((s) => s.moveTeam);
  const movePegaApplication = useTopologyStore((s) => s.movePegaApplication);
  const addVertical = useTopologyStore((s) => s.addVertical);
  const addTeam = useTopologyStore((s) => s.addTeam);
  const addPegaApplication = useTopologyStore((s) => s.addPegaApplication);

  const isDark = theme === 'dark';
  const dragStartPosRef = useRef<{ id: string; x: number; y: number } | null>(
    null
  );

  // Shared member lookup map
  const sharedMembersMap = useMemo(
    () => getSharedMembersMap(topology.teams),
    [topology.teams]
  );

  const sharedMemberNamesList = useMemo(() => {
    const names: string[] = [];
    sharedMembersMap.forEach((summary) => {
      if (summary.placements.length > 1) {
        names.push(summary.normalizedName);
      }
    });
    return names;
  }, [sharedMembersMap]);

  // Evaluate whether a team matches current Spotlight Filter & Search Query
  const doesTeamMatchSpotlight = useCallback(
    (teamId: string): boolean => {
      const team = topology.teams.find((t) => t.id === teamId);
      if (!team) return true;

      let filterPass = true;
      if (spotlightFilter.type === 'role') {
        filterPass = team.members.some(
          (m) => m.role.toLowerCase() === spotlightFilter.value.toLowerCase()
        );
      } else if (spotlightFilter.type === 'application') {
        filterPass =
          team.pegaApplication.toLowerCase() ===
          spotlightFilter.value.toLowerCase();
      } else if (spotlightFilter.type === 'initiative') {
        filterPass =
          (team.initiative || '').toLowerCase() ===
          spotlightFilter.value.toLowerCase();
      } else if (spotlightFilter.type === 'sourcing') {
        filterPass = team.members.some(
          (m) => (m.employmentType || 'internal') === spotlightFilter.value
        );
      } else if (spotlightFilter.type === 'company') {
        filterPass = team.members.some((m) => {
          const comp = m.company?.trim() || '';
          return (
            Boolean(comp) &&
            comp.toLowerCase() === spotlightFilter.value.toLowerCase()
          );
        });
      } else if (spotlightFilter.type === 'vertical') {
        filterPass = team.verticalId === spotlightFilter.value;
      } else if (spotlightFilter.type === 'shared') {
        filterPass = team.members.some((m) =>
          sharedMemberNamesList.includes(m.name.trim().toLowerCase())
        );
      } else if (spotlightFilter.type === 'gap-no-lsa') {
        filterPass = !team.members.some((m) =>
          m.role.toLowerCase().includes('lsa')
        );
      } else if (spotlightFilter.type === 'gap-no-frontend') {
        filterPass = !team.members.some((m) =>
          m.role.toLowerCase().includes('frontend')
        );
      }

      if (!filterPass) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      const vertical = topology.verticals.find((v) => v.id === team.verticalId);
      if (team.name.toLowerCase().includes(q)) return true;
      if (team.pegaApplication.toLowerCase().includes(q)) return true;
      if ((team.initiative || '').toLowerCase().includes(q)) return true;
      if ((team.wikiUrl || '').toLowerCase().includes(q)) return true;
      if (vertical?.name.toLowerCase().includes(q)) return true;
      if (
        team.members.some(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.role.toLowerCase().includes(q) ||
            (m.company || '').toLowerCase().includes(q) ||
            (m.employmentType || 'internal').toLowerCase().includes(q)
        )
      ) {
        return true;
      }

      return false;
    },
    [
      topology.teams,
      topology.verticals,
      spotlightFilter,
      searchQuery,
      sharedMemberNamesList,
    ]
  );

  // Evaluate whether a Pega Application matches current Spotlight Filter & Search Query
  const doesAppMatchSpotlight = useCallback(
    (app: PegaApplicationBlueprint): boolean => {
      if (spotlightFilter.type === 'application') {
        if (app.name.toLowerCase() !== spotlightFilter.value.toLowerCase()) {
          return false;
        }
      } else if (spotlightFilter.type === 'layer') {
        if (
          (app.layer || '').toLowerCase() !==
          spotlightFilter.value.toLowerCase()
        ) {
          return false;
        }
      } else if (spotlightFilter.type === 'architecture') {
        if (
          (app.architecture || '').toLowerCase() !==
          spotlightFilter.value.toLowerCase()
        ) {
          return false;
        }
      }

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      if (app.name.toLowerCase().includes(q)) return true;
      if ((app.version || '').toLowerCase().includes(q)) return true;
      if ((app.layer || '').toLowerCase().includes(q)) return true;
      if ((app.architecture || '').toLowerCase().includes(q)) return true;
      if ((app.description || '').toLowerCase().includes(q)) return true;
      if ((app.wikiUrl || '').toLowerCase().includes(q)) return true;
      if (
        (app.builtOnApplications || []).some((bo) =>
          bo.toLowerCase().includes(q)
        )
      ) {
        return true;
      }
      if (
        (app.rulesets || []).some(
          (rs) =>
            rs.name.toLowerCase().includes(q) ||
            rs.version.toLowerCase().includes(q) ||
            rs.type.toLowerCase().includes(q)
        )
      ) {
        return true;
      }
      if (
        (app.caseTypes || []).some(
          (ct) =>
            ct.name.toLowerCase().includes(q) ||
            (ct.workPoolPrefix || '').toLowerCase().includes(q) ||
            (ct.channel || '').toLowerCase().includes(q)
        )
      ) {
        return true;
      }
      if (
        (app.dataTypes || []).some(
          (dt) =>
            dt.name.toLowerCase().includes(q) ||
            dt.sourceSystem.toLowerCase().includes(q) ||
            dt.scope.toLowerCase().includes(q)
        )
      ) {
        return true;
      }
      if (
        (app.integrations || []).some((intName) =>
          intName.toLowerCase().includes(q)
        )
      ) {
        return true;
      }

      const mappedTeams = topology.teams.filter(
        (t) =>
          t.pegaApplication.trim().toLowerCase() ===
          app.name.trim().toLowerCase()
      );
      if (mappedTeams.some((t) => t.name.toLowerCase().includes(q))) {
        return true;
      }

      return false;
    },
    [spotlightFilter, searchQuery, topology.teams]
  );

  // Build React Flow Nodes from Topology State (No hover dependency -> 0ms hover cost!)
  const computedNodes = useMemo<Node[]>(() => {
    if (viewMode === 'applications') {
      const apps = topology.applications ?? [];
      const verticalMap: Record<string, BusinessVertical> = {};
      for (const v of topology.verticals) {
        verticalMap[v.id] = v;
      }
      const appIdByName: Record<string, string> = {};
      for (const a of apps) {
        appIdByName[a.name.trim().toLowerCase()] = a.id;
      }

      return apps.map((app) => {
        const mappedTeams = topology.teams.filter(
          (t) =>
            t.pegaApplication.trim().toLowerCase() ===
            app.name.trim().toLowerCase()
        );
        const matches = doesAppMatchSpotlight(app);
        return {
          id: app.id,
          type: 'pegaAppCard',
          position: { x: app.x, y: app.y },
          zIndex: 10,
          data: {
            app,
            mappedTeams,
            verticalMap,
            appIdByName,
            isDimmed: !matches,
            isSelected: selectedAppId === app.id,
          },
        };
      });
    }

    const matchingTeamIds = new Set(
      topology.teams
        .filter((t) => doesTeamMatchSpotlight(t.id))
        .map((t) => t.id)
    );

    const verticalNodes: Node[] = topology.verticals.map((vertical) => {
      const bounds = computeVerticalBounds(vertical, topology.teams);
      const childTeams = topology.teams.filter(
        (t) => t.verticalId === vertical.id
      );

      const uniqueMembersInVert = new Set<string>();
      let vertFte = 0;
      childTeams.forEach((t) => {
        t.members.forEach((m) => {
          uniqueMembersInVert.add(m.name.trim().toLowerCase());
          vertFte += m.allocation / 100;
        });
      });

      const anyChildMatches =
        childTeams.length === 0
          ? spotlightFilter.type === 'none' && !searchQuery.trim()
          : childTeams.some((t) => matchingTeamIds.has(t.id));

      return {
        id: vertical.id,
        type: 'verticalZone',
        position: { x: bounds.x, y: bounds.y },
        zIndex: 0,
        selectable: false,
        focusable: false,
        dragHandle: '.vertical-drag-handle',
        data: {
          vertical,
          width: bounds.width,
          height: bounds.height,
          squadCount: childTeams.length,
          memberCount: uniqueMembersInVert.size,
          totalFte: vertFte,
          isDimmed: !anyChildMatches,
          isSelected: selectedVerticalId === vertical.id,
        },
      };
    });

    const teamNodes: Node[] = topology.teams.map((team) => {
      const parentVertical = topology.verticals.find(
        (v) => v.id === team.verticalId
      );
      const matchesSpotlight = matchingTeamIds.has(team.id);

      return {
        id: team.id,
        type: 'teamCard',
        position: { x: team.x, y: team.y },
        zIndex: 10,
        data: {
          team,
          vertical: parentVertical,
          sharedMemberNames: sharedMemberNamesList,
          isDimmed: !matchesSpotlight,
          isSelected: selectedTeamId === team.id,
          activeRoleFilter:
            spotlightFilter.type === 'role' ? spotlightFilter.value : null,
        },
      };
    });

    return [...verticalNodes, ...teamNodes];
  }, [
    viewMode,
    topology,
    sharedMemberNamesList,
    doesTeamMatchSpotlight,
    doesAppMatchSpotlight,
    spotlightFilter,
    searchQuery,
    selectedTeamId,
    selectedVerticalId,
    selectedAppId,
  ]);

  // Build Connector Edges (Shared Member Edges in Teams view; Built-On Inheritance Edges in Applications view)
  const computedEdges = useMemo<Edge[]>(() => {
    if (viewMode === 'applications') {
      const apps = topology.applications ?? [];
      const appByName = new Map<string, PegaApplicationBlueprint>();
      for (const a of apps) {
        appByName.set(a.name.trim().toLowerCase(), a);
      }

      const edges: Edge[] = [];
      for (const app of apps) {
        for (const builtOnName of app.builtOnApplications || []) {
          const parentApp = appByName.get(builtOnName.trim().toLowerCase());
          if (!parentApp || parentApp.id === app.id) continue;

          const dy = parentApp.y - app.y;
          const dx = parentApp.x - app.x;

          let sourceHandle = 'built-on-src';
          let targetHandle = 'built-on-tgt';

          if (dy > 140) {
            sourceHandle = 'built-on-src';
            targetHandle = 'built-on-tgt';
          } else if (dy < -140) {
            sourceHandle = 'built-on-top-src';
            targetHandle = 'built-on-bottom-tgt';
          } else if (dx >= 0) {
            sourceHandle = 'right-src';
            targetHandle = 'left-tgt';
          } else {
            sourceHandle = 'left-src';
            targetHandle = 'right-tgt';
          }

          edges.push({
            id: `built-on-${app.id}-to-${parentApp.id}`,
            source: app.id,
            target: parentApp.id,
            sourceHandle,
            targetHandle,
            type: 'builtOnApp',
            zIndex: 15,
            data: {
              childAppName: app.name,
              parentAppName: parentApp.name,
              isHighlighted:
                selectedAppId === app.id || selectedAppId === parentApp.id,
            },
          });
        }
      }
      return edges;
    }

    if (!showAllSharedConnectors && spotlightFilter.type !== 'shared') {
      return [];
    }

    const edges: Edge[] = [];

    sharedMembersMap.forEach((summary) => {
      if (summary.placements.length < 2) return;

      for (let i = 0; i < summary.placements.length - 1; i++) {
        for (let j = i + 1; j < summary.placements.length; j++) {
          const pA = summary.placements[i];
          const pB = summary.placements[j];

          const teamA = topology.teams.find((t) => t.id === pA.teamId);
          const teamB = topology.teams.find((t) => t.id === pB.teamId);
          if (!teamA || !teamB) continue;

          const [leftTeam, rightTeam, leftAlloc, rightAlloc] =
            teamA.x <= teamB.x
              ? [teamA, teamB, pA.allocation, pB.allocation]
              : [teamB, teamA, pB.allocation, pA.allocation];

          edges.push({
            id: `shared-edge-${summary.normalizedName}-${leftTeam.id}-${rightTeam.id}`,
            source: leftTeam.id,
            target: rightTeam.id,
            sourceHandle: 'bottom-src',
            targetHandle: 'bottom-tgt',
            type: 'sharedMember',
            zIndex: 15,
            data: {
              memberName: summary.displayName,
              normalizedName: summary.normalizedName,
              role: summary.primaryRole,
              sourceAlloc: leftAlloc,
              targetAlloc: rightAlloc,
              arcOffset: edges.length,
            },
          });
        }
      }
    });

    return edges;
  }, [
    viewMode,
    topology.applications,
    selectedAppId,
    sharedMembersMap,
    topology.teams,
    showAllSharedConnectors,
    spotlightFilter.type,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes);

  useEffect(() => {
    setNodes(computedNodes);
  }, [computedNodes, setNodes]);

  useEffect(() => {
    if (viewMode === 'planner') return;
    const savedVp =
      viewMode === 'applications' ? applicationsViewport : teamsViewport;
    const timer = setTimeout(() => {
      if (savedVp) {
        setViewport(savedVp, { duration: 0 });
      } else {
        fitView({ padding: 0.16, duration: 240 });
      }
    }, 30);
    return () => clearTimeout(timer);
    // Only trigger when viewMode changes so dragging nodes does not reset viewport
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, fitView, setViewport]);

  const handleNodeDragStart: OnNodeDrag = useCallback((_, node) => {
    dragStartPosRef.current = {
      id: node.id,
      x: node.position.x,
      y: node.position.y,
    };
  }, []);

  const handleNodeDrag: OnNodeDrag = useCallback(
    (_, node) => {
      if (
        node.type === 'verticalZone' &&
        dragStartPosRef.current?.id === node.id
      ) {
        const dx = node.position.x - dragStartPosRef.current.x;
        const dy = node.position.y - dragStartPosRef.current.y;
        dragStartPosRef.current = {
          id: node.id,
          x: node.position.x,
          y: node.position.y,
        };

        const childTeamIds = new Set(
          topology.teams
            .filter((t) => t.verticalId === node.id)
            .map((t) => t.id)
        );

        setNodes((prevNodes) =>
          prevNodes.map((n) => {
            if (childTeamIds.has(n.id)) {
              return {
                ...n,
                position: {
                  x: n.position.x + dx,
                  y: n.position.y + dy,
                },
              };
            }
            return n;
          })
        );
      }
    },
    [topology.teams, setNodes]
  );

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (_, node) => {
      if (node.type === 'verticalZone') {
        moveVertical(node.id, node.position.x, node.position.y);
      } else if (node.type === 'teamCard') {
        moveTeam(node.id, node.position.x, node.position.y);
      } else if (node.type === 'pegaAppCard') {
        movePegaApplication(node.id, node.position.x, node.position.y);
      }
      dragStartPosRef.current = null;
    },
    [moveVertical, moveTeam, movePegaApplication]
  );

  const handleZoomToFit = useCallback(() => {
    fitView({ padding: 0.16, duration: 350 });
    setTimeout(() => {
      if (viewMode === 'teams' || viewMode === 'applications') {
        const vp = getViewport();
        setCanvasViewport(viewMode, {
          x: Math.round(vp.x),
          y: Math.round(vp.y),
          zoom: Number(vp.zoom.toFixed(3)),
        });
      }
    }, 380);
  }, [fitView, getViewport, setCanvasViewport, viewMode]);

  const activeSavedViewport =
    viewMode === 'applications' ? applicationsViewport : teamsViewport;

  const appsList = topology.applications ?? [];

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {viewMode === 'planner' ? (
        <PracticePlannerView />
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={computedEdges}
          onNodesChange={onNodesChange}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onMoveEnd={(_, viewport) => {
            if (viewMode === 'teams' || viewMode === 'applications') {
              setCanvasViewport(viewMode, {
                x: Math.round(viewport.x),
                y: Math.round(viewport.y),
                zoom: Number(viewport.zoom.toFixed(3)),
              });
            }
          }}
          onPaneClick={() => {
            selectTeam(null);
            selectVertical(null);
            selectApp(null);
          }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          elevateNodesOnSelect={false}
          defaultViewport={activeSavedViewport || undefined}
          fitView={!activeSavedViewport}
          fitViewOptions={{ padding: 0.16 }}
          minZoom={0.2}
          maxZoom={1.75}
          panOnScroll
          selectionOnDrag={false}
          proOptions={{ hideAttribution: true }}
          className={
            isDark ? 'chaptermap-canvas-dark' : 'chaptermap-canvas-light'
          }
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1.4}
            color={isDark ? '#242d42' : '#cbd5e1'}
          />

          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            className={`!rounded-xl !border !shadow-2xl !mb-20 !mr-3 ${
              isDark
                ? '!bg-[#0e121c]/92 !border-[#222a3d]'
                : '!bg-white/92 !border-slate-200'
            }`}
            maskColor={
              isDark ? 'rgba(9, 12, 18, 0.68)' : 'rgba(241, 245, 249, 0.68)'
            }
            nodeColor={(node) => {
              if (node.type === 'verticalZone') {
                return isDark
                  ? 'rgba(51, 65, 85, 0.35)'
                  : 'rgba(203, 213, 225, 0.55)';
              }
              return isDark ? '#475569' : '#94a3b8';
            }}
          />
        </ReactFlow>
      )}

      {viewMode === 'teams' &&
        topology.verticals.length === 0 &&
        topology.teams.length === 0 && (
          <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center p-4">
            <div
              className={`pointer-events-auto max-w-sm w-full rounded-2xl border p-6 text-center backdrop-blur-xl ${getPanelSurfaceClass(
                isDark
              )}`}
            >
              <h3 className="text-sm font-bold mb-1">Empty Chapter Canvas</h3>
              <p className="text-xs opacity-65 mb-4">
                Start building your engineering topology from scratch by adding
                a Business Vertical or Squad.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => addVertical()}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${getSecondaryButtonClass(
                    isDark
                  )}`}
                >
                  + Add Vertical
                </button>
                <button
                  type="button"
                  onClick={() => addTeam()}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${getPrimaryButtonClass()}`}
                >
                  + New Squad
                </button>
              </div>
            </div>
          </div>
        )}

      {viewMode === 'applications' && appsList.length === 0 && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center p-4">
          <div
            className={`pointer-events-auto max-w-sm w-full rounded-2xl border p-6 text-center backdrop-blur-xl ${getPanelSurfaceClass(
              isDark
            )}`}
          >
            <h3 className="text-sm font-bold mb-1">
              Empty Applications Board
            </h3>
            <p className="text-xs opacity-65 mb-4">
              Map your Applications, Dependencies, Modules, Workflows, Data
              Entities, and Squad ownership in one board.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => addPegaApplication()}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${getPrimaryButtonClass()}`}
              >
                + New Application
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomFloatingDock onZoomToFit={handleZoomToFit} />
    </div>
  );
};
