import {
  BusinessVertical,
  CatalogItem,
  ChapterTopology,
  DEFAULT_CATALOG,
  EmploymentType,
  getPegaLayerMetadata,
  PegaApplicationBlueprint,
  TeamSquad,
} from '../types/topology';

export const TEAM_CARD_WIDTH = 360;
export const TEAM_CARD_BASE_HEIGHT = 188;
export const TEAM_MEMBER_ROW_HEIGHT = 44;
export const VERTICAL_PADDING_X = 36;
export const VERTICAL_HEADER_HEIGHT = 82;
export const VERTICAL_PADDING_BOTTOM = 36;
export const TEAM_GAP_X = 36;
export const TEAM_GAP_Y = 36;

export const PEGA_APP_CARD_WIDTH = 400;
export const PEGA_APP_GAP_X = 64;
export const PEGA_APP_GAP_Y = 72;

export function estimateTeamCardHeight(team: TeamSquad): number {
  const memberCount = Math.max(1, team.members.length);
  return TEAM_CARD_BASE_HEIGHT + memberCount * TEAM_MEMBER_ROW_HEIGHT;
}

export function estimatePegaAppCardHeight(
  app: PegaApplicationBlueprint,
  teams: TeamSquad[] = []
): number {
  let height = 220;
  if (app.description?.trim()) height += 36;
  if ((app.builtOnApplications?.length || 0) > 0) height += 62;
  const rsCount = app.rulesets?.length || 0;
  const ctCount = app.caseTypes?.length || 0;
  if (rsCount > 0 || ctCount > 0) {
    height += 48 + Math.min(4, Math.max(rsCount, ctCount)) * 26;
  }
  if ((app.dataTypes?.length || 0) > 0 || (app.integrations?.length || 0) > 0) {
    height += 56;
  }
  const mappedCount = teams.filter(
    (t) =>
      t.pegaApplication?.trim().toLowerCase() === app.name.trim().toLowerCase()
  ).length;
  if (mappedCount > 0) {
    height += Math.ceil(Math.min(4, mappedCount) / 2) * 24;
  }
  return Math.max(340, height);
}

export interface VerticalBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Computes the visual container bounds of a Vertical zone on the canvas so that
 * it frames all of its child Teams cleanly, or displays a sleek default empty zone.
 */
export function computeVerticalBounds(
  vertical: BusinessVertical,
  teams: TeamSquad[]
): VerticalBounds {
  const childTeams = teams.filter((t) => t.verticalId === vertical.id);

  if (childTeams.length === 0) {
    return {
      x: vertical.x,
      y: vertical.y,
      width: vertical.width || 432,
      height: vertical.height || 340,
    };
  }

  let minX = vertical.x;
  let minY = vertical.y;
  let maxX = vertical.x + 432;
  let maxY = vertical.y + 340;

  const teamMinX = Math.min(...childTeams.map((t) => t.x)) - VERTICAL_PADDING_X;
  const teamMinY =
    Math.min(...childTeams.map((t) => t.y)) - VERTICAL_HEADER_HEIGHT;
  const teamMaxX =
    Math.max(...childTeams.map((t) => t.x + TEAM_CARD_WIDTH)) +
    VERTICAL_PADDING_X;
  const teamMaxY =
    Math.max(...childTeams.map((t) => t.y + estimateTeamCardHeight(t))) +
    VERTICAL_PADDING_BOTTOM;

  minX = Math.min(vertical.x, teamMinX);
  minY = Math.min(vertical.y, teamMinY);
  maxX = Math.max(minX + 432, teamMaxX);
  maxY = Math.max(minY + 340, teamMaxY);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Ensures `topology.applications`, `topology.catalog` (kind='application'),
 * and `team.pegaApplication` are 100% synchronized so any application mapped
 * on a squad or in the catalog appears automatically on the Pega Applications Board.
 */
export function reconcileTopologyApplications(
  topology: ChapterTopology
): ChapterTopology {
  const existingCatalog = topology.catalog ?? DEFAULT_CATALOG;
  const existingApps = topology.applications ?? [];

  const catalog: CatalogItem[] = [...existingCatalog];
  const applications: PegaApplicationBlueprint[] = [...existingApps];
  let changed = !topology.catalog || !topology.applications;

  const appByName = new Map<string, PegaApplicationBlueprint>();
  for (const app of applications) {
    appByName.set(app.name.trim().toLowerCase(), app);
  }

  const ensureAppExists = (rawName: string, defaultDesc?: string) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();

    if (
      !catalog.some(
        (c) => c.kind === 'application' && c.name.trim().toLowerCase() === key
      )
    ) {
      catalog.push({
        id: `app-${trimmed
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}-${applications.length + 1}`,
        name: trimmed,
        kind: 'application',
        description: defaultDesc,
      });
      changed = true;
    }

    if (!appByName.has(key)) {
      const idx = applications.length;
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const newApp: PegaApplicationBlueprint = {
        id: `app-${trimmed
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}-${idx + 1}`,
        name: trimmed,
        version: '',
        layer: '',
        architecture: '',
        description: defaultDesc,
        builtOnApplications: [],
        rulesets: [],
        caseTypes: [],
        dataTypes: [],
        integrations: [],
        x: 80 + col * (PEGA_APP_CARD_WIDTH + PEGA_APP_GAP_X),
        y: 110 + row * 420,
      };
      applications.push(newApp);
      appByName.set(key, newApp);
      changed = true;
    }
  };

  for (const catItem of catalog) {
    if (catItem.kind === 'application') {
      ensureAppExists(catItem.name, catItem.description);
    }
  }

  for (const team of topology.teams) {
    if (team.pegaApplication?.trim()) {
      ensureAppExists(team.pegaApplication);
    }
  }

  for (const app of [...applications]) {
    if (
      !catalog.some(
        (c) =>
          c.kind === 'application' &&
          c.name.trim().toLowerCase() === app.name.trim().toLowerCase()
      )
    ) {
      catalog.push({
        id: `app-${app.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: app.name.trim(),
        kind: 'application',
        description: app.description,
      });
      changed = true;
    }
  }

  if (!changed) {
    return topology;
  }

  return {
    ...topology,
    catalog,
    applications,
  };
}

/**
 * Auto-layouts the Applications Board by layer tier or in a clean architectural grid
 * with dynamic row heights so tall cards never overlap.
 */
export function autoLayoutApplications(
  topology: ChapterTopology
): ChapterTopology {
  const apps = [...(topology.applications ?? [])];
  if (apps.length === 0) return topology;

  const byLayer = new Map<string, PegaApplicationBlueprint[]>();
  for (const app of apps) {
    const key = (app.layer || '').trim().toLowerCase();
    if (!byLayer.has(key)) {
      byLayer.set(key, []);
    }
    byLayer.get(key)!.push(app);
  }

  const activeTiers = Array.from(byLayer.entries())
    .sort(([layerA], [layerB]) => {
      const rankA = getPegaLayerMetadata(layerA).rank;
      const rankB = getPegaLayerMetadata(layerB).rank;
      return rankA !== rankB ? rankA - rankB : layerA.localeCompare(layerB);
    })
    .map(([, list]) => list)
    .filter((list) => list.length > 0);

  const laidOut: PegaApplicationBlueprint[] = [];
  let currentY = 100;

  const groupsToLayout = activeTiers.length > 1 ? activeTiers : [apps];

  for (const tierApps of groupsToLayout) {
    const rowCount = Math.ceil(tierApps.length / 3);
    for (let row = 0; row < rowCount; row++) {
      const rowApps = tierApps.slice(row * 3, row * 3 + 3);
      let maxRowHeight = 360;
      for (let col = 0; col < rowApps.length; col++) {
        const app = rowApps[col];
        const cardH = estimatePegaAppCardHeight(app, topology.teams);
        if (cardH > maxRowHeight) {
          maxRowHeight = cardH;
        }
        laidOut.push({
          ...app,
          x: Math.round(80 + col * (PEGA_APP_CARD_WIDTH + PEGA_APP_GAP_X)),
          y: Math.round(currentY),
        });
      }
      currentY += maxRowHeight + PEGA_APP_GAP_Y;
    }
  }

  return {
    ...topology,
    applications: laidOut,
  };
}

/**
 * One-click Auto-Layout engine that arranges all Verticals and their Squads
 * into a clean, balanced architectural grid.
 */
export function autoLayoutTopology(
  topology: ChapterTopology
): ChapterTopology {
  const newVerticals: BusinessVertical[] = [];
  const newTeams: TeamSquad[] = [];

  let currentX = 60;
  const startY = 100;
  const verticalGapX = 64;

  for (const vertical of topology.verticals) {
    const childTeams = topology.teams.filter(
      (t) => t.verticalId === vertical.id
    );

    const cols = childTeams.length <= 1 ? 1 : 2;
    const vertX = currentX;
    const vertY = startY;

    const rowHeights: number[] = [];
    for (let i = 0; i < childTeams.length; i++) {
      const row = Math.floor(i / cols);
      const h = estimateTeamCardHeight(childTeams[i]);
      rowHeights[row] = Math.max(rowHeights[row] || 0, h);
    }

    for (let i = 0; i < childTeams.length; i++) {
      const team = childTeams[i];
      const col = i % cols;
      const row = Math.floor(i / cols);

      const offsetY = rowHeights
        .slice(0, row)
        .reduce((sum, h) => sum + h + TEAM_GAP_Y, 0);

      const teamX =
        vertX + VERTICAL_PADDING_X + col * (TEAM_CARD_WIDTH + TEAM_GAP_X);
      const teamY = vertY + VERTICAL_HEADER_HEIGHT + offsetY;

      newTeams.push({
        ...team,
        x: Math.round(teamX),
        y: Math.round(teamY),
      });
    }

    const totalGridWidth =
      childTeams.length === 0
        ? 432
        : cols * TEAM_CARD_WIDTH +
          (cols - 1) * TEAM_GAP_X +
          VERTICAL_PADDING_X * 2;

    const totalGridHeight =
      childTeams.length === 0
        ? 340
        : VERTICAL_HEADER_HEIGHT +
          rowHeights.reduce((sum, h) => sum + h, 0) +
          Math.max(0, rowHeights.length - 1) * TEAM_GAP_Y +
          VERTICAL_PADDING_BOTTOM;

    newVerticals.push({
      ...vertical,
      x: Math.round(vertX),
      y: Math.round(vertY),
      width: Math.round(totalGridWidth),
      height: Math.round(totalGridHeight),
    });

    currentX += totalGridWidth + verticalGapX;
  }

  const handledTeamIds = new Set(newTeams.map((t) => t.id));
  const orphanTeams = topology.teams.filter((t) => !handledTeamIds.has(t.id));
  if (orphanTeams.length > 0) {
    const cols = orphanTeams.length <= 1 ? 1 : 2;
    const rowHeights: number[] = [];
    for (let i = 0; i < orphanTeams.length; i++) {
      const row = Math.floor(i / cols);
      rowHeights[row] = Math.max(
        rowHeights[row] || 0,
        estimateTeamCardHeight(orphanTeams[i])
      );
    }
    for (let i = 0; i < orphanTeams.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const offsetY = rowHeights
        .slice(0, row)
        .reduce((sum, h) => sum + h + TEAM_GAP_Y, 0);
      newTeams.push({
        ...orphanTeams[i],
        x: Math.round(currentX + col * (TEAM_CARD_WIDTH + TEAM_GAP_X)),
        y: Math.round(startY + offsetY),
      });
    }
  }

  return autoLayoutApplications({
    ...topology,
    meta: {
      ...topology.meta,
      lastUpdated: new Date().toISOString(),
    },
    verticals: newVerticals,
    teams: newTeams,
  });
}

export interface SharedMemberSummary {
  normalizedName: string;
  displayName: string;
  primaryRole: string;
  employmentType: EmploymentType;
  company: string;
  totalAllocation: number;
  placements: {
    teamId: string;
    teamName: string;
    verticalId: string;
    role: string;
    allocation: number;
  }[];
}

export function getSharedMembersMap(
  teams: TeamSquad[]
): Map<string, SharedMemberSummary> {
  const byName = new Map<string, SharedMemberSummary>();

  for (const team of teams) {
    for (const member of team.members) {
      const key = member.name.trim().toLowerCase();
      if (!key) continue;

      const empType: EmploymentType =
        member.employmentType === 'outsourcing' ? 'outsourcing' : 'internal';
      const compName = member.company?.trim() || '';

      const existing = byName.get(key);
      if (existing) {
        existing.totalAllocation += member.allocation;
        existing.placements.push({
          teamId: team.id,
          teamName: team.name,
          verticalId: team.verticalId,
          role: member.role,
          allocation: member.allocation,
        });
      } else {
        byName.set(key, {
          normalizedName: key,
          displayName: member.name.trim(),
          primaryRole: member.role,
          employmentType: empType,
          company: compName,
          totalAllocation: member.allocation,
          placements: [
            {
              teamId: team.id,
              teamName: team.name,
              verticalId: team.verticalId,
              role: member.role,
              allocation: member.allocation,
            },
          ],
        });
      }
    }
  }

  return byName;
}
