import * as XLSX from 'xlsx';
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
  VerticalColor,
} from '../types/topology';
import {
  autoLayoutTopology,
  reconcileTopologyApplications,
} from './layoutEngine';

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
 * OWASP Spreadsheet Formula Injection (CSV/XLSX Injection) protection:
 * Neutralizes leading formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`)
 * by prefixing a literal single quote (`'`), while preserving legitimate negative numbers.
 */
function sanitizeExcelCellValue(val: string | number): string | number {
  if (typeof val === 'number') return val;
  if (typeof val !== 'string' || val.length === 0) return '';
  if (/^[=+\-@\t\r]/.test(val) && !/^-\d+(\.\d+)?$/.test(val.trim())) {
    return `'${val}`;
  }
  return val;
}

function unescapeExcelCellString(val: unknown): string {
  const str = String(val ?? '');
  if (str.startsWith("'") && str.length > 1 && /^[=+\-@\t\r]/.test(str.slice(1))) {
    return str.slice(1);
  }
  return str;
}

function safeJsonToSheet(rows: Record<string, string | number>[]): XLSX.WorkSheet {
  const sanitizedRows = rows.map((row) => {
    const cleanRow: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(row)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      cleanRow[k] = sanitizeExcelCellValue(v);
    }
    return cleanRow;
  });
  return XLSX.utils.json_to_sheet(sanitizedRows);
}

function safeSheetToJson(sheet: XLSX.WorkSheet): Record<string, any>[] {
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: '',
  });
  return rawRows.map((row) => {
    const cleanRow: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      cleanRow[k] = typeof v === 'string' ? unescapeExcelCellString(v) : v;
    }
    return cleanRow;
  });
}

/**
 * Serializes ChapterTopology into a multi-sheet Excel (.xlsx) binary ArrayBuffer.
 * Includes:
 * 1. "Squads & Roster" (Executive flat table for easy editing in Excel)
 * 2. "Squads" (Squad metadata including Wiki URL and canvas coordinates)
 * 3. "Verticals" (Business vertical zones and colors)
 * 4. "Catalog" (Defined Applications, Initiatives, Companies, Positions, Architectures, Layers)
 * 5. "Applications" (Application Blueprints, Built-On, Rulesets, Cases, Data, Integrations)
 */
export function serializeTopologyToExcelBuffer(
  topology: ChapterTopology
): Uint8Array {
  const wb = XLSX.utils.book_new();

  const verticalMap = new Map<string, BusinessVertical>();
  for (const v of topology.verticals) {
    verticalMap.set(v.id, v);
  }

  // 1. Sheet: "Squads & Roster"
  const rosterRows: Record<string, string | number>[] = [];
  for (const team of topology.teams) {
    const vertName = verticalMap.get(team.verticalId)?.name || 'Vertical 1';
    if (team.members.length === 0) {
      rosterRows.push({
        Vertical: vertName,
        'Squad Name': team.name,
        Application: team.pegaApplication || '',
        Initiative: team.initiative || '',
        'Wiki URL': team.wikiUrl || '',
        'Member Name': '',
        'Position / Role': '',
        'Allocation %': '',
        Sourcing: '',
        Company: '',
      });
    } else {
      for (const m of team.members) {
        const sourcing =
          m.employmentType === 'outsourcing' ? 'Outsourcing' : 'Internal';
        const comp = m.company?.trim() || '';
        rosterRows.push({
          Vertical: vertName,
          'Squad Name': team.name,
          Application: team.pegaApplication || '',
          Initiative: team.initiative || '',
          'Wiki URL': team.wikiUrl || '',
          'Member Name': m.name,
          'Position / Role': m.role || '',
          'Allocation %': Math.round(m.allocation),
          Sourcing: sourcing,
          Company: comp,
        });
      }
    }
  }

  const rosterSheet =
    rosterRows.length > 0
      ? safeJsonToSheet(rosterRows)
      : XLSX.utils.aoa_to_sheet([
          [
            'Vertical',
            'Squad Name',
            'Application',
            'Initiative',
            'Wiki URL',
            'Member Name',
            'Position / Role',
            'Allocation %',
            'Sourcing',
            'Company',
          ],
        ]);
  XLSX.utils.book_append_sheet(wb, rosterSheet, 'Squads & Roster');

  // 2. Sheet: "Squads"
  const squadRows = topology.teams.map((t) => ({
    'Squad ID': t.id,
    'Squad Name': t.name,
    'Vertical ID': t.verticalId,
    'Vertical Name': verticalMap.get(t.verticalId)?.name || 'Vertical 1',
    Application: t.pegaApplication || '',
    Initiative: t.initiative || '',
    'Wiki URL': t.wikiUrl || '',
    X: Math.round(t.x),
    Y: Math.round(t.y),
  }));
  const squadsSheet =
    squadRows.length > 0
      ? safeJsonToSheet(squadRows)
      : XLSX.utils.aoa_to_sheet([
          [
            'Squad ID',
            'Squad Name',
            'Vertical ID',
            'Vertical Name',
            'Application',
            'Initiative',
            'Wiki URL',
            'X',
            'Y',
          ],
        ]);
  XLSX.utils.book_append_sheet(wb, squadsSheet, 'Squads');

  // 3. Sheet: "Verticals"
  const verticalRows = topology.verticals.map((v) => ({
    'Vertical ID': v.id,
    'Vertical Name': v.name,
    Color: v.color,
    X: Math.round(v.x),
    Y: Math.round(v.y),
  }));
  const verticalsSheet =
    verticalRows.length > 0
      ? safeJsonToSheet(verticalRows)
      : XLSX.utils.aoa_to_sheet([
          ['Vertical ID', 'Vertical Name', 'Color', 'X', 'Y'],
        ]);
  XLSX.utils.book_append_sheet(wb, verticalsSheet, 'Verticals');

  // 4. Sheet: "Catalog"
  const catalogRows = (topology.catalog ?? DEFAULT_CATALOG).map((c) => ({
    ID: c.id,
    Kind: c.kind,
    Name: c.name,
    Description: c.description || '',
  }));
  const catalogSheet =
    catalogRows.length > 0
      ? safeJsonToSheet(catalogRows)
      : XLSX.utils.aoa_to_sheet([['ID', 'Kind', 'Name', 'Description']]);
  XLSX.utils.book_append_sheet(wb, catalogSheet, 'Catalog');

  // 5. Sheet: "Applications"
  const appRows = (topology.applications ?? []).map((app) => {
    const mappedSquads = topology.teams
      .filter(
        (t) =>
          t.pegaApplication &&
          t.pegaApplication.trim().toLowerCase() ===
            app.name.trim().toLowerCase()
      )
      .map((t) => t.name)
      .join(', ');

    return {
      'Application ID': app.id,
      'Application Name': app.name,
      Version: app.version || '',
      Layer: app.layer || '',
      Architecture: app.architecture || '',
      'Wiki URL': app.wikiUrl || '',
      Description: app.description || '',
      Dependencies: (app.builtOnApplications || []).join(', '),
      Modules: (app.rulesets || [])
        .map((rs) => `${rs.name} | ${rs.version || ''} | ${rs.type || 'Core'}`)
        .join('; '),
      Workflows: (app.caseTypes || [])
        .map(
          (ct) =>
            `${ct.name} | ${ct.workPoolPrefix || ''} | ${ct.channel || ''}`
        )
        .join('; '),
      'Data Entities': (app.dataTypes || [])
        .map(
          (dt) =>
            `${dt.name} | ${dt.sourceSystem || ''} | ${
              dt.scope || 'Domain'
            }`
        )
        .join('; '),
      Integrations: (app.integrations || []).join(', '),
      'Mapped Squads': mappedSquads,
      X: Math.round(app.x),
      Y: Math.round(app.y),
    };
  });

  const appsSheet =
    appRows.length > 0
      ? safeJsonToSheet(appRows)
      : XLSX.utils.aoa_to_sheet([
          [
            'Application ID',
            'Application Name',
            'Version',
            'Layer',
            'Architecture',
            'Wiki URL',
            'Description',
            'Dependencies',
            'Modules',
            'Workflows',
            'Data Entities',
            'Integrations',
            'Mapped Squads',
            'X',
            'Y',
          ],
        ]);
  XLSX.utils.book_append_sheet(wb, appsSheet, 'Applications');

  // 6. Sheet: "Action Items" (Practice Lead To-Dos & Follow-Ups)
  const taskRows = (topology.tasks ?? []).map((t) => ({
    ID: t.id,
    Title: t.title,
    Type: t.kind === 'followup' ? 'Follow-Up' : 'To-Do',
    Status: t.status,
    Priority: t.priority,
    'Due Date': t.dueDate || '',
    'Follow-Up With': t.followUpWith || '',
    Squad: t.linkedTeam || '',
    Application: t.linkedApplication || '',
    'Linked Roadmap ID': t.linkedRoadmapId || '',
    Notes: t.notes || '',
  }));
  const tasksSheet =
    taskRows.length > 0
      ? safeJsonToSheet(taskRows)
      : XLSX.utils.aoa_to_sheet([
          [
            'ID',
            'Title',
            'Type',
            'Status',
            'Priority',
            'Due Date',
            'Follow-Up With',
            'Squad',
            'Application',
            'Linked Roadmap ID',
            'Notes',
          ],
        ]);
  XLSX.utils.book_append_sheet(wb, tasksSheet, 'Action Items');

  // 7. Sheet: "Roadmap" (Practice Lead Roadmap: Exploring / Now / Next / Later)
  const roadmapRows = (topology.roadmap ?? []).map((item) => ({
    ID: item.id,
    Title: item.title,
    Horizon: item.horizon,
    Status: item.status,
    Priority: item.priority,
    Progress: typeof item.progress === 'number' ? item.progress : 0,
    Category: item.category || '',
    'Start Date': item.startDate || '',
    'Target Date': item.targetDate || '',
    Outcome: item.outcome || '',
    Owner: item.owner || '',
    Squad: item.linkedTeam || '',
    Application: item.linkedApplication || '',
    'Wiki URL': item.wikiUrl || '',
    Notes: item.notes || '',
  }));
  const roadmapSheet =
    roadmapRows.length > 0
      ? safeJsonToSheet(roadmapRows)
      : XLSX.utils.aoa_to_sheet([
          [
            'ID',
            'Title',
            'Horizon',
            'Status',
            'Priority',
            'Progress',
            'Category',
            'Start Date',
            'Target Date',
            'Outcome',
            'Owner',
            'Squad',
            'Application',
            'Wiki URL',
            'Notes',
          ],
        ]);
  XLSX.utils.book_append_sheet(wb, roadmapSheet, 'Roadmap');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return out instanceof Uint8Array ? out : new Uint8Array(out);
}

/**
 * Parses an Excel (.xlsx) ArrayBuffer into a complete ChapterTopology object.
 * Supports both full multi-sheet ChapterMap workbooks and single-sheet user spreadsheets.
 */
export function parseTopologyFromExcelBuffer(buffer: ArrayBuffer): {
  topology: ChapterTopology;
  warnings: string[];
} {
  const warnings: string[] = [];
  if (!buffer || buffer.byteLength === 0) {
    return {
      topology: {
        title: 'Practice Topology',
        meta: {
          version: '2026.1',
          lastUpdated: new Date().toISOString(),
          zoom: 0.85,
        },
        catalog: [...DEFAULT_CATALOG],
        verticals: [],
        teams: [],
      },
      warnings,
    };
  }

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'array' });
  } catch (err: any) {
    return {
      topology: {
        title: 'Practice Topology',
        meta: {
          version: '2026.1',
          lastUpdated: new Date().toISOString(),
          zoom: 0.85,
        },
        catalog: [...DEFAULT_CATALOG],
        verticals: [],
        teams: [],
      },
      warnings: [
        err?.message ||
          'Could not parse Excel workbook; initialized clean workbook.',
      ],
    };
  }

  const verticals: BusinessVertical[] = [];
  const teams: TeamSquad[] = [];
  const catalog: CatalogItem[] = [];

  // 1. Parse Catalog sheet if present
  const catalogSheet = wb.Sheets['Catalog'];
  if (catalogSheet) {
    const rows = safeSheetToJson(catalogSheet);
    for (const r of rows) {
      const name = String(r['Name'] || r['name'] || '').trim();
      const rawKind = String(r['Kind'] || r['kind'] || '')
        .trim()
        .toLowerCase();
      if (!name) continue;
      const kind: CatalogItem['kind'] =
        rawKind === 'initiative'
          ? 'initiative'
          : rawKind === 'company'
          ? 'company'
          : rawKind === 'role' || rawKind === 'position'
          ? 'role'
          : rawKind === 'architecture' || rawKind === 'platform'
          ? 'architecture'
          : rawKind === 'layer' || rawKind === 'tier'
          ? 'layer'
          : 'application';
      catalog.push({
        id:
          String(r['ID'] || r['id'] || '').trim() ||
          `${kind.slice(0, 4)}-${slugify(name)}`,
        name,
        kind,
        description:
          String(r['Description'] || r['description'] || '').trim() ||
          undefined,
      });
    }
  }

  // 2. Parse Verticals sheet if present
  const verticalsSheet = wb.Sheets['Verticals'];
  if (verticalsSheet) {
    const rows = safeSheetToJson(verticalsSheet);
    rows.forEach((r, idx) => {
      const name = String(
        r['Vertical Name'] || r['Vertical'] || r['Name'] || ''
      ).trim();
      if (!name) return;
      const id =
        String(r['Vertical ID'] || r['ID'] || '').trim() ||
        `vert-${slugify(name) || idx + 1}`;
      const rawColor = String(r['Color'] || '')
        .trim()
        .toLowerCase() as VerticalColor;
      const color = VALID_COLORS.includes(rawColor)
        ? rawColor
        : VALID_COLORS[idx % VALID_COLORS.length];
      const hasX =
        r['X'] !== undefined &&
        String(r['X']).trim() !== '' &&
        Number.isFinite(Number(r['X']));
      const hasY =
        r['Y'] !== undefined &&
        String(r['Y']).trim() !== '' &&
        Number.isFinite(Number(r['Y']));
      verticals.push({
        id,
        name,
        color,
        x: hasX ? Number(r['X']) : 60 + idx * 860,
        y: hasY ? Number(r['Y']) : 100,
      });
    });
  }

  const ensureVerticalByName = (vertName: string): BusinessVertical => {
    const clean = vertName.trim() || 'Vertical 1';
    const existing = verticals.find(
      (v) => v.name.toLowerCase() === clean.toLowerCase()
    );
    if (existing) return existing;
    const idx = verticals.length;
    const created: BusinessVertical = {
      id: `vert-${slugify(clean) || idx + 1}`,
      name: clean,
      color: VALID_COLORS[idx % VALID_COLORS.length],
      x: 60 + idx * 860,
      y: 100,
    };
    verticals.push(created);
    return created;
  };

  // 3. Parse Squads sheet if present
  const squadsSheet = wb.Sheets['Squads'];
  if (squadsSheet) {
    const rows = safeSheetToJson(squadsSheet);
    rows.forEach((r, idx) => {
      const name = String(r['Squad Name'] || r['Name'] || '').trim();
      if (!name) return;
      const vertName = String(
        r['Vertical Name'] || r['Vertical'] || 'Vertical 1'
      ).trim();
      const vert =
        verticals.find((v) => v.id === String(r['Vertical ID'] || '').trim()) ||
        ensureVerticalByName(vertName);
      const id =
        String(r['Squad ID'] || r['ID'] || '').trim() ||
        `team-${slugify(name) || idx + 1}`;
      const hasX =
        r['X'] !== undefined &&
        String(r['X']).trim() !== '' &&
        Number.isFinite(Number(r['X']));
      const hasY =
        r['Y'] !== undefined &&
        String(r['Y']).trim() !== '' &&
        Number.isFinite(Number(r['Y']));
      teams.push({
        id,
        name,
        verticalId: vert.id,
        pegaApplication: String(
          r['Application'] || r['Pega Application'] || ''
        ).trim(),
        initiative: String(r['Initiative'] || '').trim() || undefined,
        wikiUrl: String(r['Wiki URL'] || r['Wiki'] || '').trim() || undefined,
        x: hasX ? Number(r['X']) : vert.x + 36,
        y: hasY ? Number(r['Y']) : vert.y + 82,
        members: [],
      });
    });
  }

  // 4. Parse "Squads & Roster" (or first sheet in workbook)
  const rosterSheet =
    wb.Sheets['Squads & Roster'] || wb.Sheets[wb.SheetNames[0]];
  let needsAutoLayout = !squadsSheet;

  if (rosterSheet) {
    const rows = safeSheetToJson(rosterSheet);
    for (const r of rows) {
      const squadName = String(
        r['Squad Name'] || r['Squad'] || r['Team'] || ''
      ).trim();
      if (!squadName) continue;

      const vertName = String(
        r['Vertical'] || r['Vertical Name'] || 'Vertical 1'
      ).trim();
      const vert = ensureVerticalByName(vertName);

      let team = teams.find(
        (t) =>
          t.name.toLowerCase() === squadName.toLowerCase() &&
          t.verticalId === vert.id
      );
      if (!team) {
        team = teams.find(
          (t) => t.name.toLowerCase() === squadName.toLowerCase()
        );
      }

      const appName = String(
        r['Application'] || r['Pega Application'] || ''
      ).trim();
      const initName = String(r['Initiative'] || '').trim();
      const wikiUrl = String(r['Wiki URL'] || r['Wiki'] || '').trim();

      if (!team) {
        team = {
          id: `team-${slugify(squadName) || teams.length + 1}`,
          name: squadName,
          verticalId: vert.id,
          pegaApplication: appName,
          initiative: initName || undefined,
          wikiUrl: wikiUrl || undefined,
          x: vert.x + 36,
          y: vert.y + 82,
          members: [],
        };
        teams.push(team);
        needsAutoLayout = true;
      } else {
        if (appName && !team.pegaApplication) team.pegaApplication = appName;
        if (initName && !team.initiative) team.initiative = initName;
        if (wikiUrl && !team.wikiUrl) team.wikiUrl = wikiUrl;
      }

      if (
        team.pegaApplication &&
        !catalog.some(
          (c) =>
            c.kind === 'application' &&
            c.name.toLowerCase() === team!.pegaApplication.toLowerCase()
        )
      ) {
        catalog.push({
          id: `app-${slugify(team.pegaApplication)}`,
          name: team.pegaApplication,
          kind: 'application',
        });
      }

      if (
        team.initiative &&
        !catalog.some(
          (c) =>
            c.kind === 'initiative' &&
            c.name.toLowerCase() === team!.initiative!.toLowerCase()
        )
      ) {
        catalog.push({
          id: `init-${slugify(team.initiative)}`,
          name: team.initiative,
          kind: 'initiative',
        });
      }

      const memberName = String(
        r['Member Name'] || r['Member'] || r['Resource'] || ''
      ).trim();
      if (memberName) {
        const role = String(
          r['Position / Role'] || r['Role'] || r['Position'] || ''
        ).trim();
        const rawAlloc = parseInt(
          String(r['Allocation %'] || r['Allocation'] || '100').replace(
            '%',
            ''
          ),
          10
        );
        const allocation =
          !Number.isNaN(rawAlloc) && rawAlloc > 0 && rawAlloc <= 200
            ? rawAlloc
            : 100;
        const rawSourcing = String(r['Sourcing'] || 'Internal')
          .trim()
          .toLowerCase();
        const employmentType: EmploymentType =
          rawSourcing.includes('outsourc') ||
          rawSourcing.includes('partner') ||
          rawSourcing.includes('vendor')
            ? 'outsourcing'
            : 'internal';
        const company = String(r['Company'] || '').trim();

        if (
          role &&
          !catalog.some(
            (c) =>
              c.kind === 'role' && c.name.toLowerCase() === role.toLowerCase()
          )
        ) {
          catalog.push({
            id: `role-${slugify(role)}`,
            name: role,
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

        const member: ChapterMemberAssignment = {
          id: `mem-${slugify(memberName)}-${slugify(team.id)}-${team.members.length}`,
          name: memberName,
          role,
          allocation,
          employmentType,
          company: company || undefined,
        };
        team.members.push(member);
      }
    }
  }

  // 5. Parse "Applications" / "Pega Applications" sheet if present
  const applications: PegaApplicationBlueprint[] = [];
  const pegaAppsSheet =
    wb.Sheets['Applications'] || wb.Sheets['Pega Applications'];
  if (pegaAppsSheet) {
    const rows = safeSheetToJson(pegaAppsSheet);
    rows.forEach((r, idx) => {
      const appName = String(
        r['Application Name'] ||
          r['Application'] ||
          r['Pega Application'] ||
          r['Name'] ||
          ''
      ).trim();
      if (!appName) return;

      const layer = String(r['Layer'] || '').trim();
      const architecture = String(r['Architecture'] || '').trim();

      if (
        layer &&
        !catalog.some(
          (c) =>
            c.kind === 'layer' && c.name.toLowerCase() === layer.toLowerCase()
        )
      ) {
        catalog.push({
          id: `layer-${slugify(layer)}`,
          name: layer,
          kind: 'layer',
        });
      }

      if (
        architecture &&
        !catalog.some(
          (c) =>
            c.kind === 'architecture' &&
            c.name.toLowerCase() === architecture.toLowerCase()
        )
      ) {
        catalog.push({
          id: `arch-${slugify(architecture)}`,
          name: architecture,
          kind: 'architecture',
        });
      }

      const builtOn = String(
        r['Dependencies'] ||
          r['Parent Applications'] ||
          r['Built-On Applications'] ||
          r['Built On'] ||
          ''
      )
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const integrations = String(r['Integrations'] || '')
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const rulesets: PegaRuleset[] = String(
        r['Modules'] || r['Packages'] || r['Rulesets'] || ''
      )
        .split(/;|\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry, rIdx) => {
          const parts = entry.split('|').map((p) => p.trim());
          const rawType = parts[2] || 'Core';
          const rsType: PegaRuleset['type'] =
            rawType === 'Core' ||
            rawType === 'Application' ||
            rawType === 'Integration' ||
            rawType === 'Branch' ||
            rawType === 'Shared'
              ? rawType
              : 'Core';
          return {
            id: `rs-${slugify(parts[0] || 'rs')}-${rIdx}`,
            name: parts[0] || `Module-${rIdx + 1}`,
            version: parts[1] || '',
            type: rsType,
          };
        });

      const caseTypes: PegaCaseType[] = String(
        r['Workflows'] || r['Capabilities'] || r['Case Types'] || ''
      )
        .split(/;|\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry, cIdx) => {
          const parts = entry.split('|').map((p) => p.trim());
          return {
            id: `ct-${slugify(parts[0] || 'ct')}-${cIdx}`,
            name: parts[0] || `Workflow-${cIdx + 1}`,
            workPoolPrefix: parts[1] || undefined,
            channel: parts[2] || undefined,
          };
        });

      const dataTypes: PegaDataType[] = String(
        r['Data Entities'] || r['Data Models'] || r['Data Types'] || ''
      )
        .split(/;|\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry, dIdx) => {
          const parts = entry.split('|').map((p) => p.trim());
          const rawScope = parts[2] || 'Domain';
          const dtScope: PegaDataType['scope'] =
            rawScope === 'Domain' ||
            rawScope === 'Implementation' ||
            rawScope === 'Enterprise' ||
            rawScope === 'Shared'
              ? rawScope
              : 'Domain';
          return {
            id: `dt-${slugify(parts[0] || 'dt')}-${dIdx}`,
            name: parts[0] || `Entity-${dIdx + 1}`,
            sourceSystem: parts[1] || '',
            scope: dtScope,
          };
        });

      const hasX =
        r['X'] !== undefined &&
        String(r['X']).trim() !== '' &&
        Number.isFinite(Number(r['X']));
      const hasY =
        r['Y'] !== undefined &&
        String(r['Y']).trim() !== '' &&
        Number.isFinite(Number(r['Y']));
      const col = idx % 3;
      const row = Math.floor(idx / 3);

      applications.push({
        id:
          String(r['Application ID'] || r['ID'] || '').trim() ||
          `app-${slugify(appName) || idx + 1}`,
        name: appName,
        version: String(r['Version'] || '').trim(),
        layer,
        architecture,
        wikiUrl:
          String(r['Wiki URL'] || r['Wiki'] || '').trim() || undefined,
        description: String(r['Description'] || '').trim() || undefined,
        builtOnApplications: builtOn,
        rulesets,
        caseTypes,
        dataTypes,
        integrations,
        x: hasX ? Number(r['X']) : 80 + col * 480,
        y: hasY ? Number(r['Y']) : 120 + row * 470,
      });

      const mappedSquadNames = String(r['Mapped Squads'] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const sName of mappedSquadNames) {
        const matchedTeam = teams.find(
          (t) => t.name.toLowerCase() === sName.toLowerCase()
        );
        if (matchedTeam && !matchedTeam.pegaApplication) {
          matchedTeam.pegaApplication = appName;
        }
      }
    });
  }

  // 6. Parse "Action Items" sheet if present
  const tasks: PracticeTask[] = [];
  const tasksSheet = wb.Sheets['Action Items'] || wb.Sheets['Tasks'];
  if (tasksSheet) {
    const rows = safeSheetToJson(tasksSheet);
    rows.forEach((r, idx) => {
      const title = String(r['Title'] || r['Task'] || r['Name'] || '').trim();
      if (!title) return;
      const rawKind = String(r['Type'] || r['Kind'] || '')
        .trim()
        .toLowerCase();
      const kind: PracticeTaskKind = rawKind.includes('follow')
        ? 'followup'
        : 'todo';
      const rawStatus = String(r['Status'] || 'open')
        .trim()
        .toLowerCase();
      const status: PracticeTaskStatus =
        rawStatus === 'done' || rawStatus === 'completed'
          ? 'done'
          : rawStatus === 'in-progress'
          ? 'in-progress'
          : 'open';
      const rawPrio = String(r['Priority'] || 'medium')
        .trim()
        .toLowerCase();
      const priority: PracticeTaskPriority =
        rawPrio === 'high' || rawPrio === 'low' ? rawPrio : 'medium';

      tasks.push({
        id:
          String(r['ID'] || '').trim() ||
          `task-${slugify(title) || idx + 1}-${idx}`,
        title,
        kind,
        status,
        priority,
        dueDate: String(r['Due Date'] || r['Date'] || '').trim() || undefined,
        followUpWith:
          String(r['Follow-Up With'] || r['Person'] || '').trim() || undefined,
        linkedTeam: String(r['Squad'] || r['Team'] || '').trim() || undefined,
        linkedApplication:
          String(r['Application'] || '').trim() || undefined,
        linkedRoadmapId:
          String(r['Linked Roadmap ID'] || '').trim() || undefined,
        notes: String(r['Notes'] || '').trim() || undefined,
      });
    });
  }

  // 7. Parse "Roadmap" sheet if present
  const roadmap: PracticeRoadmapItem[] = [];
  const roadmapSheet = wb.Sheets['Roadmap'] || wb.Sheets['Practice Roadmap'];
  if (roadmapSheet) {
    const rows = safeSheetToJson(roadmapSheet);
    rows.forEach((r, idx) => {
      const title = String(r['Title'] || r['Initiative'] || r['Name'] || '').trim();
      if (!title) return;
      const rawHor = String(r['Horizon'] || 'exploring')
        .trim()
        .toLowerCase();
      const horizon: RoadmapHorizon =
        rawHor === 'now' || rawHor === 'next' || rawHor === 'later'
          ? rawHor
          : 'exploring';
      const rawStatus = String(r['Status'] || 'idea')
        .trim()
        .toLowerCase();
      const status: RoadmapItemStatus =
        rawStatus === 'discovery' ||
        rawStatus === 'in-progress' ||
        rawStatus === 'blocked' ||
        rawStatus === 'completed'
          ? rawStatus
          : 'idea';
      const rawPrio = String(r['Priority'] || 'medium')
        .trim()
        .toLowerCase();
      const priority: PracticeTaskPriority =
        rawPrio === 'high' || rawPrio === 'low' ? rawPrio : 'medium';
      const rawProg = Number(r['Progress']);
      const progress = Number.isFinite(rawProg)
        ? Math.max(0, Math.min(100, Math.round(rawProg)))
        : undefined;

      roadmap.push({
        id:
          String(r['ID'] || '').trim() ||
          `rm-${slugify(title) || idx + 1}-${idx}`,
        title,
        horizon,
        status,
        priority,
        progress,
        category: String(r['Category'] || '').trim() || undefined,
        startDate: String(r['Start Date'] || '').trim() || undefined,
        targetDate: String(r['Target Date'] || '').trim() || undefined,
        outcome: String(r['Outcome'] || '').trim() || undefined,
        owner: String(r['Owner'] || '').trim() || undefined,
        linkedTeam: String(r['Squad'] || r['Team'] || '').trim() || undefined,
        linkedApplication:
          String(r['Application'] || '').trim() || undefined,
        wikiUrl:
          String(r['Wiki URL'] || r['Wiki'] || '').trim() || undefined,
        notes: String(r['Notes'] || '').trim() || undefined,
      });
    });
  }

  let baseTopology: ChapterTopology = reconcileTopologyApplications({
    title: 'Practice Topology',
    meta: {
      version: '2026.1',
      lastUpdated: new Date().toISOString(),
      zoom: 0.85,
    },
    catalog,
    verticals,
    teams,
    applications,
    tasks,
    roadmap,
  });

  if (needsAutoLayout && teams.length > 0) {
    baseTopology = autoLayoutTopology(baseTopology);
  }

  return { topology: baseTopology, warnings };
}
