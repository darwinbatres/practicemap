import {
  BusinessVertical,
  CatalogItem,
  ChapterMemberAssignment,
  ChapterTopology,
  DEFAULT_CATALOG,
  EmploymentType,
  PegaApplicationBlueprint,
  PegaCaseType,
  PegaDataType,
  PegaRuleset,
  PracticeRoadmapItem,
  PracticeTask,
  PracticeTaskKind,
  PracticeTaskPriority,
  PracticeTaskStatus,
  RoadmapHorizon,
  RoadmapItemStatus,
  TeamSquad,
  TopologyMeta,
  VerticalColor,
} from '../types/topology';
import { reconcileTopologyApplications } from './layoutEngine';

const VALID_COLORS: VerticalColor[] = [
  'slate',
  'indigo',
  'emerald',
  'amber',
  'violet',
  'cyan',
  'rose',
  'blue',
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Escapes `-->` sequences inside JSON strings embedded in Markdown HTML comments
 * so user-entered descriptions or IDs can never prematurely close `<!-- ... -->`.
 */
function serializeJsonComment(value: unknown): string {
  return JSON.stringify(value).replace(/-->/g, '--\\u003e');
}

/**
 * Safe JSON parser with Prototype Pollution guard (`__proto__`, `constructor`, `prototype`).
 */
function safeParseJsonComment<T = any>(rawJson: string): T {
  return JSON.parse(rawJson, (key, val) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined;
    }
    return val;
  });
}

/**
 * Deterministic serializer from ChapterTopology state to clean, human-readable Markdown
 * with unobtrusive HTML metadata comments for spatial coordinates.
 */
export function serializeTopologyToMarkdown(topology: ChapterTopology): string {
  const lines: string[] = [];

  const title =
    !topology.title || topology.title === 'Chapter Topology'
      ? 'Practice Topology'
      : topology.title;
  lines.push(`# ${title}`);

  const metaObj: TopologyMeta = {
    version: topology.meta?.version || '2026.1',
    lastUpdated: topology.meta?.lastUpdated || new Date().toISOString(),
    zoom: Number((topology.meta?.zoom ?? 0.85).toFixed(2)),
  };
  lines.push(`<!-- meta: ${serializeJsonComment(metaObj)} -->`);

  if (topology.catalog && topology.catalog.length > 0) {
    const compactCatalog = topology.catalog.map((c) => ({
      id: c.id,
      name: c.name,
      kind: c.kind,
      ...(c.description ? { description: c.description } : {}),
    }));
    lines.push(`<!-- catalog: ${serializeJsonComment(compactCatalog)} -->`);
  }
  lines.push('');

  for (const vertical of topology.verticals) {
    lines.push(`## Vertical: ${vertical.name}`);
    const vertMeta: Record<string, unknown> = {
      id: vertical.id,
      x: Math.round(vertical.x),
      y: Math.round(vertical.y),
      color: vertical.color,
    };
    lines.push(`<!-- vertical: ${serializeJsonComment(vertMeta)} -->`);
    lines.push('');

    const verticalTeams = topology.teams.filter(
      (t) => t.verticalId === vertical.id
    );

    for (const team of verticalTeams) {
      lines.push(`### Team: ${team.name}`);
      const teamMeta = {
        id: team.id,
        x: Math.round(team.x),
        y: Math.round(team.y),
      };
      lines.push(`<!-- team: ${serializeJsonComment(teamMeta)} -->`);
      lines.push(`- **Application:** ${team.pegaApplication || ''}`);
      if (team.initiative) {
        lines.push(`- **Initiative:** ${team.initiative}`);
      }
      if (team.wikiUrl?.trim()) {
        lines.push(`- **Wiki:** ${team.wikiUrl.trim()}`);
      }
      lines.push(`- **Members:**`);
      for (const member of team.members) {
        const empLabel =
          member.employmentType === 'outsourcing' ? 'Outsourcing' : 'Internal';
        const roleLabel = member.role?.trim() || '—';
        const compLabel = member.company?.trim() || '—';
        lines.push(
          `  - ${member.name} | ${roleLabel} | ${Math.round(
            member.allocation
          )}% | ${empLabel} | ${compLabel}`
        );
      }
      lines.push('');
    }
  }

  // Also serialize any orphan teams whose verticalId was not matched
  const verticalIds = new Set(topology.verticals.map((v) => v.id));
  const orphanTeams = topology.teams.filter(
    (t) => !verticalIds.has(t.verticalId)
  );
  if (orphanTeams.length > 0) {
    lines.push(`## Vertical: Unassigned`);
    lines.push(
      `<!-- vertical: ${serializeJsonComment({
        id: 'vert-unassigned',
        x: 60,
        y: 680,
        color: 'slate',
      })} -->`
    );
    lines.push('');
    for (const team of orphanTeams) {
      lines.push(`### Team: ${team.name}`);
      lines.push(
        `<!-- team: ${serializeJsonComment({
          id: team.id,
          x: Math.round(team.x),
          y: Math.round(team.y),
        })} -->`
      );
      lines.push(`- **Application:** ${team.pegaApplication || ''}`);
      if (team.initiative) {
        lines.push(`- **Initiative:** ${team.initiative}`);
      }
      if (team.wikiUrl?.trim()) {
        lines.push(`- **Wiki:** ${team.wikiUrl.trim()}`);
      }
      lines.push(`- **Members:**`);
      for (const member of team.members) {
        const empLabel =
          member.employmentType === 'outsourcing' ? 'Outsourcing' : 'Internal';
        const roleLabel = member.role?.trim() || '—';
        const compLabel = member.company?.trim() || '—';
        lines.push(
          `  - ${member.name} | ${roleLabel} | ${Math.round(
            member.allocation
          )}% | ${empLabel} | ${compLabel}`
        );
      }
      lines.push('');
    }
  }

  // Serialize Application Blueprints
  const apps = topology.applications || [];
  if (apps.length > 0) {
    for (const app of apps) {
      lines.push(`## Application: ${app.name}`);
      lines.push(
        `<!-- app: ${serializeJsonComment({
          id: app.id,
          x: Math.round(app.x),
          y: Math.round(app.y),
        })} -->`
      );
      if (app.version?.trim()) {
        lines.push(`- **Version:** ${app.version.trim()}`);
      }
      if (app.layer?.trim()) {
        lines.push(`- **Layer:** ${app.layer.trim()}`);
      }
      if (app.architecture?.trim()) {
        lines.push(`- **Architecture:** ${app.architecture.trim()}`);
      }
      if (app.wikiUrl?.trim()) {
        lines.push(`- **Wiki:** ${app.wikiUrl.trim()}`);
      }
      if (app.description?.trim()) {
        lines.push(`- **Description:** ${app.description.trim()}`);
      }
      if (app.builtOnApplications && app.builtOnApplications.length > 0) {
        lines.push(
          `- **Dependencies:** ${app.builtOnApplications.join(', ')}`
        );
      }
      if (app.integrations && app.integrations.length > 0) {
        lines.push(`- **Integrations:** ${app.integrations.join(', ')}`);
      }
      if (app.rulesets && app.rulesets.length > 0) {
        lines.push(`- **Modules:**`);
        for (const rs of app.rulesets) {
          lines.push(
            `  - ${rs.name} | ${rs.version || '—'} | ${
              rs.type || 'Core'
            }`
          );
        }
      }
      if (app.caseTypes && app.caseTypes.length > 0) {
        lines.push(`- **Workflows:**`);
        for (const ct of app.caseTypes) {
          lines.push(
            `  - ${ct.name} | ${ct.workPoolPrefix || '—'} | ${
              ct.channel || '—'
            }`
          );
        }
      }
      if (app.dataTypes && app.dataTypes.length > 0) {
        lines.push(`- **Data Entities:**`);
        for (const dt of app.dataTypes) {
          lines.push(
            `  - ${dt.name} | ${dt.sourceSystem || '—'} | ${
              dt.scope || 'Domain'
            }`
          );
        }
      }
      lines.push('');
    }
  }

  // Serialize Practice Lead Action Items (To-Dos & Follow-Ups)
  const tasks = topology.tasks || [];
  if (tasks.length > 0) {
    lines.push(`## Planner: Action Items`);
    for (const task of tasks) {
      const checkToken =
        task.status === 'done'
          ? '[x]'
          : task.status === 'in-progress'
          ? '[-]'
          : '[ ]';
      const kindLabel = task.kind === 'followup' ? 'Follow-Up' : 'To-Do';
      const dueLabel = task.dueDate?.trim() || '—';
      const whoLabel = task.followUpWith?.trim() || '—';
      const squadLabel = task.linkedTeam?.trim() || '—';
      const appLabel = task.linkedApplication?.trim() || '—';
      const notesLabel = task.notes?.trim()
        ? task.notes.trim().replace(/\r?\n/g, ' ').replace(/\|/g, '/')
        : '—';
      const roadmapRef = task.linkedRoadmapId?.trim() || '—';
      lines.push(
        `- ${checkToken} ${task.title} | ${kindLabel} | ${task.priority} | ${dueLabel} | ${whoLabel} | ${squadLabel} | ${appLabel} | ${notesLabel} | ${roadmapRef}`
      );
    }
    lines.push('');
  }

  // Serialize Practice Roadmap (Exploring / Now / Next / Later)
  const roadmap = topology.roadmap || [];
  if (roadmap.length > 0) {
    lines.push(`## Planner: Practice Roadmap`);
    lines.push('');
    for (const item of roadmap) {
      lines.push(`### Roadmap: ${item.title}`);
      lines.push(
        `<!-- roadmap: ${serializeJsonComment({
          id: item.id,
        })} -->`
      );
      lines.push(`- **Horizon:** ${item.horizon}`);
      lines.push(`- **Status:** ${item.status}`);
      lines.push(`- **Priority:** ${item.priority}`);
      if (typeof item.progress === 'number') {
        lines.push(`- **Progress:** ${Math.round(item.progress)}%`);
      }
      if (item.category?.trim()) {
        lines.push(`- **Category:** ${item.category.trim()}`);
      }
      if (item.startDate?.trim()) {
        lines.push(`- **Start Date:** ${item.startDate.trim()}`);
      }
      if (item.targetDate?.trim()) {
        lines.push(`- **Target Date:** ${item.targetDate.trim()}`);
      }
      if (item.outcome?.trim()) {
        lines.push(`- **Outcome:** ${item.outcome.trim()}`);
      }
      if (item.owner?.trim()) {
        lines.push(`- **Owner:** ${item.owner.trim()}`);
      }
      if (item.linkedTeam?.trim()) {
        lines.push(`- **Squad:** ${item.linkedTeam.trim()}`);
      }
      if (item.linkedApplication?.trim()) {
        lines.push(`- **Application:** ${item.linkedApplication.trim()}`);
      }
      if (item.wikiUrl?.trim()) {
        lines.push(`- **Wiki:** ${item.wikiUrl.trim()}`);
      }
      if (item.notes?.trim()) {
        lines.push(`- **Notes:** ${item.notes.trim().replace(/\r?\n/g, ' ')}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}

export interface ParseResult {
  topology: ChapterTopology;
  warnings: string[];
}

/**
 * Resilient parser that converts a chapter-topology.md string back into a ChapterTopology object.
 * Handles both strict machine-generated comments and hand-edited Markdown from Obsidian/VS Code.
 */
export function parseTopologyMarkdown(markdown: string): ParseResult {
  const warnings: string[] = [];
  const rawLines = markdown.replace(/\r\n/g, '\n').split('\n');

  let title = 'Practice Topology';
  let meta: TopologyMeta = {
    version: '2026.1',
    lastUpdated: new Date().toISOString(),
    zoom: 0.85,
  };
  let catalog: CatalogItem[] = [...DEFAULT_CATALOG];

  const verticals: BusinessVertical[] = [];
  const teams: TeamSquad[] = [];
  const applications: PegaApplicationBlueprint[] = [];
  const tasks: PracticeTask[] = [];
  const roadmap: PracticeRoadmapItem[] = [];

  let currentVertical: BusinessVertical | null = null;
  let currentTeam: TeamSquad | null = null;
  let currentApp: PegaApplicationBlueprint | null = null;
  let currentRoadmap: PracticeRoadmapItem | null = null;
  let inMembersSection = false;
  let inTasksSection = false;
  let inRoadmapSection = false;
  let appSubSection: 'none' | 'rulesets' | 'caseTypes' | 'dataTypes' = 'none';

  const colorCycle: VerticalColor[] = [
    'indigo',
    'emerald',
    'amber',
    'slate',
    'violet',
    'cyan',
  ];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    // 1. Top-level Heading (# Title)
    if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      const parsedTitle = trimmed.slice(2).trim();
      title =
        !parsedTitle || parsedTitle === 'Chapter Topology'
          ? 'Practice Topology'
          : parsedTitle;
      continue;
    }

    // 2. Meta HTML Comment
    const metaMatch = trimmed.match(/^<!--\s*meta:\s*(\{.*?\})\s*-->$/i);
    if (metaMatch) {
      try {
        const parsed = safeParseJsonComment(metaMatch[1]);
        meta = {
          version: String(parsed.version || '2026.1'),
          lastUpdated: String(parsed.lastUpdated || new Date().toISOString()),
          zoom: typeof parsed.zoom === 'number' ? parsed.zoom : 0.85,
        };
      } catch {
        warnings.push(`Line ${i + 1}: Could not parse meta JSON comment.`);
      }
      continue;
    }

    // 2b. Catalog HTML Comment
    const catalogMatch = trimmed.match(/^<!--\s*catalog:\s*(\[.*?\])\s*-->$/i);
    if (catalogMatch) {
      try {
        const parsed = safeParseJsonComment(catalogMatch[1]);
        if (Array.isArray(parsed)) {
          catalog = parsed;
        }
      } catch {
        warnings.push(`Line ${i + 1}: Could not parse catalog JSON comment.`);
      }
      continue;
    }

    // 3. Second-level Heading: Application, Planner, OR Vertical
    if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
      inMembersSection = false;
      inTasksSection = false;
      inRoadmapSection = false;
      appSubSection = 'none';
      currentTeam = null;
      currentRoadmap = null;

      const rawHeading = trimmed.slice(3).trim();

      if (/^(?:Planner:\s*)?Action\s+Items$/i.test(rawHeading)) {
        currentVertical = null;
        currentApp = null;
        inTasksSection = true;
        continue;
      }

      if (/^(?:Planner:\s*)?(?:Practice\s+)?Roadmap$/i.test(rawHeading)) {
        currentVertical = null;
        currentApp = null;
        inRoadmapSection = true;
        continue;
      }

      if (
        /^(?:Pega\s+Application|PegaApplication|Application):\s*/i.test(
          rawHeading
        )
      ) {
        currentVertical = null;
        const appName =
          rawHeading
            .replace(
              /^(?:Pega\s+Application|PegaApplication|Application):\s*/i,
              ''
            )
            .trim() || `Application ${applications.length + 1}`;
        const appIdx = applications.length;
        const col = appIdx % 3;
        const row = Math.floor(appIdx / 3);
        currentApp = {
          id: `app-${slugify(appName) || appIdx + 1}`,
          name: appName,
          version: '',
          layer: '',
          architecture: '',
          builtOnApplications: [],
          rulesets: [],
          caseTypes: [],
          dataTypes: [],
          integrations: [],
          x: 80 + col * 480,
          y: 120 + row * 470,
        };
        applications.push(currentApp);
        continue;
      }

      currentApp = null;
      const vertName =
        rawHeading.replace(/^Vertical:\s*/i, '').trim() ||
        `Vertical ${verticals.length + 1}`;
      const vertIndex = verticals.length;
      const defaultColor = colorCycle[vertIndex % colorCycle.length];

      currentVertical = {
        id: `vert-${slugify(vertName) || vertIndex + 1}`,
        name: vertName,
        color: defaultColor,
        x: 60 + vertIndex * 860,
        y: 100,
      };
      verticals.push(currentVertical);
      continue;
    }

    // 3a. Parse Action Items (To-Dos & Follow-Ups)
    if (inTasksSection && trimmed.startsWith('- ')) {
      const rawLine = trimmed.slice(2).trim();
      let status: PracticeTaskStatus = 'open';
      let content = rawLine;
      const checkMatch = rawLine.match(/^\[([ xX\-])\]\s*(.*)$/);
      if (checkMatch) {
        const mark = checkMatch[1].toLowerCase();
        status =
          mark === 'x' ? 'done' : mark === '-' ? 'in-progress' : 'open';
        content = checkMatch[2].trim();
      }
      const parts = content.split('|').map((s) => s.trim());
      const taskTitle = parts[0] || `Task ${tasks.length + 1}`;
      const rawKind = (parts[1] || '').toLowerCase();
      const kind: PracticeTaskKind =
        rawKind.includes('follow') ? 'followup' : 'todo';
      const rawPrio = (parts[2] || '').toLowerCase();
      const priority: PracticeTaskPriority =
        rawPrio === 'high' || rawPrio === 'low' ? rawPrio : 'medium';
      const cleanField = (val?: string) =>
        !val || val === '—' || val === '-' ? undefined : val;
      tasks.push({
        id: `task-${slugify(taskTitle) || tasks.length + 1}-${tasks.length}`,
        title: taskTitle,
        kind,
        status,
        priority,
        dueDate: cleanField(parts[3]),
        followUpWith: cleanField(parts[4]),
        linkedTeam: cleanField(parts[5]),
        linkedApplication: cleanField(parts[6]),
        notes: cleanField(parts[7]),
        linkedRoadmapId: cleanField(parts[8]),
      });
      continue;
    }

    // 3b. App HTML Comment & Properties
    const pegaAppCommentMatch = trimmed.match(
      /^<!--\s*(?:pega-app|app):\s*(\{.*?\})\s*-->$/i
    );
    if (pegaAppCommentMatch && currentApp) {
      try {
        const parsed = safeParseJsonComment(pegaAppCommentMatch[1]);
        if (parsed.id && typeof parsed.id === 'string') {
          currentApp.id = parsed.id;
        }
        if (typeof parsed.x === 'number' && !Number.isNaN(parsed.x)) {
          currentApp.x = parsed.x;
        }
        if (typeof parsed.y === 'number' && !Number.isNaN(parsed.y)) {
          currentApp.y = parsed.y;
        }
      } catch {
        warnings.push(`Line ${i + 1}: Invalid application metadata comment.`);
      }
      continue;
    }

    if (currentApp && !trimmed.startsWith('### ')) {
      const verMatch = trimmed.match(/^-\s*\*\*Version:\*\*\s*(.*)$/i);
      if (verMatch) {
        appSubSection = 'none';
        currentApp.version = verMatch[1].trim();
        continue;
      }

      const layerMatch = trimmed.match(/^-\s*\*\*Layer:\*\*\s*(.*)$/i);
      if (layerMatch) {
        appSubSection = 'none';
        const rawLayer = layerMatch[1].trim();
        currentApp.layer = rawLayer;
        if (
          rawLayer &&
          !catalog.some(
            (c) =>
              c.kind === 'layer' &&
              c.name.toLowerCase() === rawLayer.toLowerCase()
          )
        ) {
          catalog.push({
            id: `layer-${slugify(rawLayer)}`,
            name: rawLayer,
            kind: 'layer',
          });
        }
        continue;
      }

      const archMatch = trimmed.match(
        /^-\s*\*\*(?:Architecture|Platform|Platform Stack):\*\*\s*(.*)$/i
      );
      if (archMatch) {
        appSubSection = 'none';
        const rawArch = archMatch[1].trim();
        currentApp.architecture = rawArch;
        if (
          rawArch &&
          !catalog.some(
            (c) =>
              c.kind === 'architecture' &&
              c.name.toLowerCase() === rawArch.toLowerCase()
          )
        ) {
          catalog.push({
            id: `arch-${slugify(rawArch)}`,
            name: rawArch,
            kind: 'architecture',
          });
        }
        continue;
      }

      const wikiMatch = trimmed.match(
        /^-\s*\*\*(?:Wiki|Wiki Page|Wiki URL):\*\*\s*(.*)$/i
      );
      if (wikiMatch) {
        appSubSection = 'none';
        currentApp.wikiUrl = wikiMatch[1].trim() || undefined;
        continue;
      }

      const descMatch = trimmed.match(/^-\s*\*\*Description:\*\*\s*(.*)$/i);
      if (descMatch) {
        appSubSection = 'none';
        currentApp.description = descMatch[1].trim() || undefined;
        continue;
      }

      const builtOnMatch = trimmed.match(
        /^-\s*\*\*(?:Dependencies|Parent(?:\s+Applications|\s+Systems)?|Built-On(?:\s+Applications)?):\*\*\s*(.*)$/i
      );
      if (builtOnMatch) {
        appSubSection = 'none';
        currentApp.builtOnApplications = builtOnMatch[1]
          .split(/[,;|]/)
          .map((s) => s.trim())
          .filter(Boolean);
        continue;
      }

      const intMatch = trimmed.match(/^-\s*\*\*Integrations:\*\*\s*(.*)$/i);
      if (intMatch) {
        appSubSection = 'none';
        currentApp.integrations = intMatch[1]
          .split(/[,;|]/)
          .map((s) => s.trim())
          .filter(Boolean);
        continue;
      }

      if (
        /^-\s*\*\*(?:Modules(?:\s*\/\s*Packages|\s*&\s*Packages)?|Packages|Rulesets):\*\*\s*$/i.test(
          trimmed
        )
      ) {
        appSubSection = 'rulesets';
        continue;
      }

      if (
        /^-\s*\*\*(?:Workflows(?:\s*\/\s*Capabilities|\s*&\s*Capabilities)?|Capabilities|Case Types):\*\*\s*$/i.test(
          trimmed
        )
      ) {
        appSubSection = 'caseTypes';
        continue;
      }

      if (
        /^-\s*\*\*(?:Data Entities|Data Models|Data Types):\*\*\s*$/i.test(
          trimmed
        )
      ) {
        appSubSection = 'dataTypes';
        continue;
      }

      if (appSubSection !== 'none' && trimmed.startsWith('- ')) {
        const rawItem = trimmed.slice(2).trim();
        const parts = rawItem.split('|').map((s) => s.trim());
        if (appSubSection === 'rulesets') {
          const rsName = parts[0];
          if (rsName) {
            const rawVer = parts[1] === '—' || parts[1] === '-' ? '' : (parts[1] || '');
            const rawType = parts[2] || 'Core';
            const rsType: PegaRuleset['type'] =
              rawType === 'Core' ||
              rawType === 'Application' ||
              rawType === 'Integration' ||
              rawType === 'Branch' ||
              rawType === 'Shared'
                ? rawType
                : 'Core';
            currentApp.rulesets.push({
              id: `rs-${slugify(rsName)}-${currentApp.rulesets.length}`,
              name: rsName,
              version: rawVer,
              type: rsType,
            });
          }
        } else if (appSubSection === 'caseTypes') {
          const ctName = parts[0];
          if (ctName) {
            const rawPrefix =
              parts[1] === '—' || parts[1] === '-' ? '' : (parts[1] || '');
            const rawChannel =
              parts[2] === '—' || parts[2] === '-' ? '' : (parts[2] || '');
            const ctItem: PegaCaseType = {
              id: `ct-${slugify(ctName)}-${currentApp.caseTypes.length}`,
              name: ctName,
              workPoolPrefix: rawPrefix || undefined,
              channel: rawChannel || undefined,
            };
            currentApp.caseTypes.push(ctItem);
          }
        } else if (appSubSection === 'dataTypes') {
          const dtName = parts[0];
          if (dtName) {
            const rawSource =
              parts[1] === '—' || parts[1] === '-' ? '' : (parts[1] || '');
            const rawScope = parts[2] || 'Domain';
            const dtScope: PegaDataType['scope'] =
              rawScope === 'Domain' ||
              rawScope === 'Implementation' ||
              rawScope === 'Enterprise' ||
              rawScope === 'Shared'
                ? rawScope
                : 'Domain';
            currentApp.dataTypes.push({
              id: `dt-${slugify(dtName)}-${currentApp.dataTypes.length}`,
              name: dtName,
              sourceSystem: rawSource,
              scope: dtScope,
            });
          }
        }
        continue;
      }
    }

    // 4. Vertical HTML Comment
    const vertCommentMatch = trimmed.match(
      /^<!--\s*vertical:\s*(\{.*?\})\s*-->$/i
    );
    if (vertCommentMatch && currentVertical) {
      try {
        const parsed = safeParseJsonComment(vertCommentMatch[1]);
        if (parsed.id && typeof parsed.id === 'string') {
          currentVertical.id = parsed.id;
        }
        if (typeof parsed.x === 'number' && !Number.isNaN(parsed.x)) {
          currentVertical.x = parsed.x;
        }
        if (typeof parsed.y === 'number' && !Number.isNaN(parsed.y)) {
          currentVertical.y = parsed.y;
        }
        if (parsed.color && VALID_COLORS.includes(parsed.color as VerticalColor)) {
          currentVertical.color = parsed.color as VerticalColor;
        }
      } catch {
        warnings.push(`Line ${i + 1}: Invalid vertical metadata comment.`);
      }
      continue;
    }

    // 5. Third-level Heading: Roadmap Item OR Team Heading
    if (trimmed.startsWith('### ')) {
      inMembersSection = false;
      inTasksSection = false;

      const rawSubHeading = trimmed.slice(4).trim();
      if (inRoadmapSection || /^Roadmap:\s*/i.test(rawSubHeading)) {
        currentTeam = null;
        const itemTitle =
          rawSubHeading.replace(/^Roadmap:\s*/i, '').trim() ||
          `Roadmap Item ${roadmap.length + 1}`;
        currentRoadmap = {
          id: `rm-${slugify(itemTitle) || roadmap.length + 1}-${roadmap.length}`,
          title: itemTitle,
          horizon: 'exploring',
          status: 'idea',
          priority: 'medium',
        };
        roadmap.push(currentRoadmap);
        continue;
      }

      currentRoadmap = null;
      if (!currentVertical) {
        currentVertical = {
          id: 'vert-1',
          name: 'Vertical 1',
          color: 'indigo',
          x: 60,
          y: 100,
        };
        verticals.push(currentVertical);
      }

      const teamName =
        rawSubHeading.replace(/^Team:\s*/i, '').trim() ||
        `Squad ${teams.length + 1}`;

      const teamsInCurrentVertical = teams.filter(
        (t) => t.verticalId === currentVertical!.id
      );
      const col = teamsInCurrentVertical.length % 2;
      const row = Math.floor(teamsInCurrentVertical.length / 2);

      currentTeam = {
        id: `team-${slugify(teamName) || teams.length + 1}`,
        name: teamName,
        verticalId: currentVertical.id,
        pegaApplication: '',
        x: currentVertical.x + 40 + col * 400,
        y: currentVertical.y + 85 + row * 380,
        members: [],
      };
      teams.push(currentTeam);
      continue;
    }

    // 5b. Roadmap HTML Comment & Properties
    const roadmapCommentMatch = trimmed.match(
      /^<!--\s*roadmap:\s*(\{.*?\})\s*-->$/i
    );
    if (roadmapCommentMatch && currentRoadmap) {
      try {
        const parsed = safeParseJsonComment(roadmapCommentMatch[1]);
        if (parsed.id && typeof parsed.id === 'string') {
          currentRoadmap.id = parsed.id;
        }
      } catch {
        // Ignore malformed comment
      }
      continue;
    }

    if (currentRoadmap) {
      const horizonMatch = trimmed.match(/^-\s*\*\*Horizon:\*\*\s*(.*)$/i);
      if (horizonMatch) {
        const h = horizonMatch[1].trim().toLowerCase();
        currentRoadmap.horizon = (
          h === 'now' || h === 'next' || h === 'later' ? h : 'exploring'
        ) as RoadmapHorizon;
        continue;
      }
      const statusMatch = trimmed.match(/^-\s*\*\*Status:\*\*\s*(.*)$/i);
      if (statusMatch) {
        const s = statusMatch[1].trim().toLowerCase();
        currentRoadmap.status = (
          s === 'discovery' ||
          s === 'in-progress' ||
          s === 'blocked' ||
          s === 'completed'
            ? s
            : 'idea'
        ) as RoadmapItemStatus;
        continue;
      }
      const prioMatch = trimmed.match(/^-\s*\*\*Priority:\*\*\s*(.*)$/i);
      if (prioMatch) {
        const p = prioMatch[1].trim().toLowerCase();
        currentRoadmap.priority = (
          p === 'high' || p === 'low' ? p : 'medium'
        ) as PracticeTaskPriority;
        continue;
      }
      const catMatch = trimmed.match(/^-\s*\*\*Category:\*\*\s*(.*)$/i);
      if (catMatch) {
        currentRoadmap.category = catMatch[1].trim() || undefined;
        continue;
      }
      const progMatch = trimmed.match(/^-\s*\*\*Progress:\*\*\s*(.*)$/i);
      if (progMatch) {
        const parsedProg = parseInt(progMatch[1].replace('%', '').trim(), 10);
        if (!Number.isNaN(parsedProg)) {
          currentRoadmap.progress = Math.max(0, Math.min(100, parsedProg));
        }
        continue;
      }
      const startMatch = trimmed.match(/^-\s*\*\*Start Date:\*\*\s*(.*)$/i);
      if (startMatch) {
        currentRoadmap.startDate = startMatch[1].trim() || undefined;
        continue;
      }
      const targetMatch = trimmed.match(/^-\s*\*\*Target Date:\*\*\s*(.*)$/i);
      if (targetMatch) {
        currentRoadmap.targetDate = targetMatch[1].trim() || undefined;
        continue;
      }
      const outcomeMatch = trimmed.match(/^-\s*\*\*Outcome:\*\*\s*(.*)$/i);
      if (outcomeMatch) {
        currentRoadmap.outcome = outcomeMatch[1].trim() || undefined;
        continue;
      }
      const ownerMatch = trimmed.match(/^-\s*\*\*Owner:\*\*\s*(.*)$/i);
      if (ownerMatch) {
        currentRoadmap.owner = ownerMatch[1].trim() || undefined;
        continue;
      }
      const squadMatch = trimmed.match(/^-\s*\*\*Squad:\*\*\s*(.*)$/i);
      if (squadMatch) {
        currentRoadmap.linkedTeam = squadMatch[1].trim() || undefined;
        continue;
      }
      const appMatch = trimmed.match(/^-\s*\*\*Application:\*\*\s*(.*)$/i);
      if (appMatch) {
        currentRoadmap.linkedApplication = appMatch[1].trim() || undefined;
        continue;
      }
      const wikiMatch = trimmed.match(/^-\s*\*\*Wiki:\*\*\s*(.*)$/i);
      if (wikiMatch) {
        currentRoadmap.wikiUrl = wikiMatch[1].trim() || undefined;
        continue;
      }
      const notesMatch = trimmed.match(/^-\s*\*\*Notes:\*\*\s*(.*)$/i);
      if (notesMatch) {
        currentRoadmap.notes = notesMatch[1].trim() || undefined;
        continue;
      }
    }

    // 6. Team HTML Comment
    const teamCommentMatch = trimmed.match(/^<!--\s*team:\s*(\{.*?\})\s*-->$/i);
    if (teamCommentMatch && currentTeam) {
      try {
        const parsed = safeParseJsonComment(teamCommentMatch[1]);
        if (parsed.id && typeof parsed.id === 'string') {
          currentTeam.id = parsed.id;
        }
        if (typeof parsed.x === 'number' && !Number.isNaN(parsed.x)) {
          currentTeam.x = parsed.x;
        }
        if (typeof parsed.y === 'number' && !Number.isNaN(parsed.y)) {
          currentTeam.y = parsed.y;
        }
      } catch {
        warnings.push(`Line ${i + 1}: Invalid team metadata comment.`);
      }
      continue;
    }

    // 7. Team Properties & Members
    if (currentTeam) {
      const pegaAppMatch = trimmed.match(
        /^-\s*\*\*(?:Pega\s+Application|Application):\*\*\s*(.*)$/i
      );
      if (pegaAppMatch) {
        inMembersSection = false;
        const appName = pegaAppMatch[1].trim();
        currentTeam.pegaApplication = appName;
        if (
          appName &&
          !catalog.some(
            (c) =>
              c.kind === 'application' &&
              c.name.toLowerCase() === appName.toLowerCase()
          )
        ) {
          catalog.push({
            id: `app-${slugify(appName)}`,
            name: appName,
            kind: 'application',
          });
        }
        continue;
      }

      const initMatch = trimmed.match(/^-\s*\*\*Initiative:\*\*\s*(.*)$/i);
      if (initMatch) {
        inMembersSection = false;
        const initName = initMatch[1].trim();
        currentTeam.initiative = initName || undefined;
        if (
          initName &&
          !catalog.some(
            (c) =>
              c.kind === 'initiative' &&
              c.name.toLowerCase() === initName.toLowerCase()
          )
        ) {
          catalog.push({
            id: `init-${slugify(initName)}`,
            name: initName,
            kind: 'initiative',
          });
        }
        continue;
      }

      const archMatch = trimmed.match(
        /^-\s*\*\*(?:Architecture|UI \/ Platform Stack|Platform Stack):\*\*\s*(.*)$/i
      );
      if (archMatch) {
        inMembersSection = false;
        continue;
      }

      const wikiMatch = trimmed.match(
        /^-\s*\*\*(?:Wiki|Wiki Page|Wiki URL):\*\*\s*(.*)$/i
      );
      if (wikiMatch) {
        inMembersSection = false;
        currentTeam.wikiUrl = wikiMatch[1].trim() || undefined;
        continue;
      }

      if (/^-\s*\*\*Members:\*\*\s*$/i.test(trimmed)) {
        inMembersSection = true;
        continue;
      }

      // Member list item: "  - Name | Role | 100% | Internal/Outsourcing | Company"
      if (inMembersSection && trimmed.startsWith('- ')) {
        const memberRaw = trimmed.slice(2).trim();
        const parts = memberRaw.split('|').map((s) => s.trim());
        const memberName = parts[0] || 'Unnamed Member';
        const rawRole = parts[1] || '';
        const memberRole =
          rawRole === '—' || rawRole === '-' ? '' : rawRole.trim();
        const allocStr = (parts[2] || '100%').replace('%', '').trim();
        const parsedAlloc = parseInt(allocStr, 10);
        const allocation =
          !Number.isNaN(parsedAlloc) && parsedAlloc > 0 && parsedAlloc <= 200
            ? parsedAlloc
            : 100;

        let employmentType: EmploymentType = 'internal';
        let company = '';

        const part3 = parts[3] || '';
        const rawPart4 = parts[4] || '';
        const part4 =
          rawPart4 === '—' || rawPart4 === '-' ? '' : rawPart4.trim();

        if (part3) {
          if (/^(outsourc|external|vendor|partner|contractor)/i.test(part3)) {
            employmentType = 'outsourcing';
            company = part4;
          } else if (/^(internal|in-house|fte)/i.test(part3)) {
            employmentType = 'internal';
            company = part4;
          } else {
            employmentType =
              part3.toLowerCase() === 'internal' ? 'internal' : 'outsourcing';
            company = part4 || (part3 === '—' || part3 === '-' ? '' : part3);
          }
        }

        if (
          memberRole &&
          !catalog.some(
            (c) =>
              c.kind === 'role' &&
              c.name.toLowerCase() === memberRole.toLowerCase()
          )
        ) {
          catalog.push({
            id: `role-${slugify(memberRole)}`,
            name: memberRole,
            kind: 'role',
          });
        }

        if (
          company &&
          !catalog.some(
            (c) =>
              c.kind === 'company' &&
              c.name.toLowerCase() === company.toLowerCase()
          )
        ) {
          catalog.push({
            id: `comp-${slugify(company)}`,
            name: company,
            kind: 'company',
          });
        }

        const memberItem: ChapterMemberAssignment = {
          id: `mem-${slugify(memberName)}-${slugify(currentTeam.id)}-${currentTeam.members.length}`,
          name: memberName,
          role: memberRole,
          allocation,
          employmentType,
          company: company || undefined,
        };
        currentTeam.members.push(memberItem);
        continue;
      }
    }
  }

  return {
    topology: reconcileTopologyApplications({
      title,
      meta,
      catalog,
      verticals,
      teams,
      applications,
      tasks,
      roadmap,
    }),
    warnings,
  };
}
