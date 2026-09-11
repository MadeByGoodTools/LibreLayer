export type PortablePanelLayout = {
  floating: boolean;
  x: number;
  y: number;
  width: number;
};

export type PortableWorkspaceLayout = {
  side: 'left' | 'right';
  width: number;
  smart: boolean;
  panels?: Record<string, PortablePanelLayout>;
};

export type PortableWorkspace = {
  name: string;
  layout: PortableWorkspaceLayout;
};

type WorkspaceFile = {
  format: 'librelayer-workspaces-v1';
  workspaces: PortableWorkspace[];
};

const finite = (value: unknown, fallback: number, min: number, max: number) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
};

export const normalizeWorkspaceLayout = (
  value: unknown,
): PortableWorkspaceLayout => {
  const input = value && typeof value === 'object' ? (value as Record<string, unknown>) : {},
    panelsInput =
      input.panels && typeof input.panels === 'object'
        ? (input.panels as Record<string, unknown>)
        : undefined,
    panels: Record<string, PortablePanelLayout> = {};
  for (const [key, raw] of Object.entries(panelsInput ?? {}).slice(0, 20)) {
    if (!/^[a-z0-9 _-]{1,40}$/i.test(key) || !raw || typeof raw !== 'object')
      continue;
    const panel = raw as Record<string, unknown>;
    panels[key] = {
      floating: Boolean(panel.floating),
      x: finite(panel.x, 24, 0, 4000),
      y: finite(panel.y, 80, 0, 2400),
      width: finite(panel.width, 320, 240, 700),
    };
  }
  return {
    side: input.side === 'left' ? 'left' : 'right',
    width: finite(input.width, 300, 260, 440),
    smart: input.smart !== false,
    ...(Object.keys(panels).length ? { panels } : {}),
  };
};

export const serializeWorkspaces = (workspaces: PortableWorkspace[]) =>
  JSON.stringify(
    {
      format: 'librelayer-workspaces-v1',
      workspaces: workspaces.slice(0, 10).map((workspace) => ({
        name: workspace.name.trim().slice(0, 60),
        layout: normalizeWorkspaceLayout(workspace.layout),
      })),
    } satisfies WorkspaceFile,
    null,
    2,
  );

export const parseWorkspaces = (text: string): PortableWorkspace[] => {
  if (text.length > 250_000) throw new Error('Workspace files must be smaller than 250 KB');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Workspace file is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Workspace file is invalid');
  const file = parsed as Record<string, unknown>;
  if (file.format !== 'librelayer-workspaces-v1' || !Array.isArray(file.workspaces))
    throw new Error('Not a LibreLayer workspace file');
  const names = new Set<string>(),
    workspaces: PortableWorkspace[] = [];
  for (const raw of file.workspaces.slice(0, 10)) {
    if (!raw || typeof raw !== 'object') continue;
    const record = raw as Record<string, unknown>,
      name =
        typeof record.name === 'string'
          ? record.name.trim().slice(0, 60)
          : '';
    if (!name || names.has(name.toLowerCase())) continue;
    names.add(name.toLowerCase());
    workspaces.push({ name, layout: normalizeWorkspaceLayout(record.layout) });
  }
  if (!workspaces.length) throw new Error('Workspace file contains no usable layouts');
  return workspaces;
};
