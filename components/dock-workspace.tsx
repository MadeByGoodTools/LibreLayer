'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type PanelPlacement = {
  floating: boolean;
  x: number;
  y: number;
  width: number;
  collapsed?: boolean;
  solo?: boolean;
};
export type PanelPositions = Record<string, PanelPlacement>;
type WorkspacePanel = { id: string; title: string; content: ReactNode };

export function DockWorkspace({
  panels,
  positions,
  onChange,
}: {
  panels: WorkspacePanel[];
  positions: PanelPositions;
  onChange: (positions: PanelPositions) => void;
}) {
  const [selected, setSelected] = useState('layers'),
    [, redraw] = useState(0),
    [draft, setDraft] = useState<PanelPositions>({});
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    start: PanelPlacement;
  } | null>(null);

  useEffect(() => {
    const update = () => redraw((value) => value + 1);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const get = (id: string): PanelPlacement =>
    positions[id] ?? { floating: false, x: 90, y: 140, width: 320 };
  const clamp = (value: PanelPlacement): PanelPlacement => ({
    ...value,
    x: Math.max(
      0,
      Math.min(
        value.x,
        window.innerWidth - Math.min(value.width, window.innerWidth),
      ),
    ),
    y: Math.max(0, Math.min(value.y, window.innerHeight - 80)),
    width: Math.max(260, Math.min(600, value.width)),
  });
  const set = (id: string, value: PanelPlacement) =>
    onChange({ ...positions, [id]: clamp(value) });
  const patch = (id: string, value: Partial<PanelPlacement>) =>
    set(id, { ...get(id), ...value });
  const soloId = panels.find((panel) => get(panel.id).solo)?.id,
    shown = soloId ? panels.filter((panel) => panel.id === soloId) : panels,
    docked = shown.filter((panel) => !get(panel.id).floating),
    active = docked.some((panel) => panel.id === selected)
      ? selected
      : docked[0]?.id;

  const controls = (panel: WorkspacePanel, floating: boolean) => {
    const current = get(panel.id);
    return (
      <div className="dock-panel-controls">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => patch(panel.id, { collapsed: !current.collapsed })}
        >
          {current.collapsed ? 'Expand' : 'Collapse'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={Boolean(current.solo)}
          onClick={() => {
            const next: PanelPositions = { ...positions };
            for (const item of panels)
              next[item.id] = {
                ...get(item.id),
                solo: item.id === panel.id ? !current.solo : false,
              };
            onChange(next);
            setSelected(panel.id);
          }}
        >
          {current.solo ? 'Show all' : 'Solo'}
        </Button>
        {floating ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              patch(panel.id, { floating: false });
              setSelected(panel.id);
            }}
          >
            Dock {panel.title}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Float ${panel.title} panel`}
            onClick={() =>
              set(panel.id, {
                ...current,
                floating: true,
                x: 90 + panels.indexOf(panel) * 25,
                y: 140 + panels.indexOf(panel) * 25,
                width: current.width || 320,
              })
            }
          >
            Float panel
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <Tabs
        value={active ?? ''}
        onValueChange={setSelected}
        className="dock-tabs h-full"
      >
        <TabsList variant="line" className="panel-tabs pro-tabs">
          {docked.map((panel) => (
            <TabsTrigger key={panel.id} value={panel.id}>
              {panel.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {!docked.length && (
          <p className="p-3">All panels are floating. Use Dock to return one.</p>
        )}
        {docked.map((panel) => (
          <TabsContent
            className="dock-tab-content"
            key={panel.id}
            value={panel.id}
          >
            <div className="dock-tab-actions">{controls(panel, false)}</div>
            {!get(panel.id).collapsed && panel.content}
          </TabsContent>
        ))}
      </Tabs>
      {shown
        .filter((panel) => get(panel.id).floating)
        .map((panel) => {
          const raw = draft[panel.id] ?? get(panel.id),
            current = typeof window === 'undefined' ? raw : clamp(raw);
          return (
            <section
              key={panel.id}
              className="floating-editor-panel panel"
              aria-label={`${panel.title} floating panel`}
              style={{ left: current.x, top: current.y, width: current.width }}
            >
              <div
                className="floating-panel-handle"
                tabIndex={0}
                role="button"
                aria-label={`Move ${panel.title} panel; use arrow keys`}
                onKeyDown={(event) => {
                  const delta: Record<string, [number, number]> = {
                    ArrowLeft: [-10, 0],
                    ArrowRight: [10, 0],
                    ArrowUp: [0, -10],
                    ArrowDown: [0, 10],
                  };
                  if (!delta[event.key]) return;
                  event.preventDefault();
                  const [x, y] = delta[event.key];
                  set(panel.id, {
                    ...current,
                    x: current.x + x,
                    y: current.y + y,
                  });
                }}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  drag.current = {
                    id: panel.id,
                    x: event.clientX,
                    y: event.clientY,
                    start: current,
                  };
                }}
                onPointerMove={(event) => {
                  const moving = drag.current;
                  if (!moving || moving.id !== panel.id) return;
                  setDraft({
                    [panel.id]: clamp({
                      ...moving.start,
                      x: moving.start.x + event.clientX - moving.x,
                      y: moving.start.y + event.clientY - moving.y,
                    }),
                  });
                }}
                onPointerUp={(event) => {
                  const moving = drag.current;
                  if (!moving) return;
                  set(panel.id, {
                    ...moving.start,
                    x: moving.start.x + event.clientX - moving.x,
                    y: moving.start.y + event.clientY - moving.y,
                  });
                  drag.current = null;
                  setDraft({});
                }}
                onPointerCancel={() => {
                  drag.current = null;
                  setDraft({});
                }}
              >
                {panel.title} · drag to move
              </div>
              <div className="floating-panel-actions">
                <label>
                  Width{' '}
                  <input
                    aria-label={`${panel.title} panel width`}
                    type="number"
                    min={260}
                    max={600}
                    value={current.width}
                    onChange={(event) => {
                      const width = +event.target.value;
                      if (width >= 260 && width <= 600)
                        set(panel.id, { ...current, width });
                    }}
                  />
                </label>
                {controls(panel, true)}
              </div>
              {!current.collapsed && (
                <div className="floating-panel-body">{panel.content}</div>
              )}
            </section>
          );
        })}
    </>
  );
}
