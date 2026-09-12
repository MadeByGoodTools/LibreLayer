'use client';
import { useRef, useState } from 'react';
import { commandKey, shortcutLabel } from '@/lib/editor-shortcuts';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { SoftProofMode } from '@/lib/soft-proof';
import { parseWorkspaces, serializeWorkspaces } from '@/lib/workspace-layout';
import {
  moveToolbarItem,
  normalizeToolbar,
  type ToolbarPreferences,
} from '@/lib/toolbar-config';
import type { MotionPreference } from '@/lib/accessibility-preferences';
import type { PerformanceMode } from '@/lib/performance-policy';
import type { ScratchLocation } from '@/lib/scratch-storage';
export type ToolPreset = {
  name: string;
  tool: string;
  size: number;
  opacity: number;
  color: string;
  fontSize: number;
  feather: number;
};
export type WorkspaceLayout = {
  side: 'left' | 'right';
  width: number;
  smart: boolean;
  panels?: Record<
    string,
    {
      floating: boolean;
      x: number;
      y: number;
      width: number;
      collapsed?: boolean;
      solo?: boolean;
    }
  >;
};
export type EditorPreferences = {
  layout: WorkspaceLayout;
  workspaces: { name: string; layout: WorkspaceLayout }[];
  shortcuts: Record<string, string>;
  commands?: Record<string, string>;
  presets: ToolPreset[];
  autosave: boolean;
  proofMode?: SoftProofMode;
  gamutWarning?: boolean;
  historyDepth?: number;
  historyBudgetMb?: number;
  toolbar?: ToolbarPreferences;
  theme?: 'dark' | 'light' | 'contrast';
  interfaceScale?: 85 | 100 | 115 | 125;
  motion?: MotionPreference;
  performanceMode?: PerformanceMode;
  scratchLocation?: ScratchLocation;
  scratchQuotaMb?: number;
};
export const defaultPreferences: EditorPreferences = {
  layout: { side: 'right', width: 300, smart: true },
  workspaces: [],
  shortcuts: {},
  presets: [],
  autosave: true,
  proofMode: 'none',
  gamutWarning: false,
  historyDepth: 32,
  historyBudgetMb: 512,
  toolbar: { order: [], hidden: [], groupByFamily: true },
  theme: 'dark',
  interfaceScale: 100,
  motion: 'system',
  performanceMode: 'balanced',
  scratchLocation: 'browser',
  scratchQuotaMb: 1024,
};
export function WorkspaceSettings({
  commands,
  open,
  onClose,
  value,
  onChange,
  tools,
  current,
  onApply,
  saveLocationName,
  storageStatus,
  onChooseSaveLocation,
  onProtectStorage,
  onResetSaveLocation,
  scratchStatus,
  onCleanScratch,
  performanceCheckStatus,
  performanceCheckRunning,
  onRunPerformanceCheck,
  initialTab = 'layout',
  documentStatus,
}: {
  commands: { name: string; shortcut: string }[];
  open: boolean;
  onClose: () => void;
  value: EditorPreferences;
  onChange: (p: EditorPreferences) => void;
  tools: { id: string; label: string; key: string }[];
  current: Omit<ToolPreset, 'name'>;
  onApply: (p: ToolPreset) => void;
  saveLocationName: string;
  storageStatus: string;
  onChooseSaveLocation: () => void;
  onProtectStorage: () => void;
  onResetSaveLocation: () => void;
  scratchStatus: string;
  onCleanScratch: () => void;
  performanceCheckStatus: string;
  performanceCheckRunning: boolean;
  onRunPerformanceCheck: () => void;
  initialTab?: 'layout' | 'performance';
  documentStatus: string;
}) {
  const [name, setName] = useState(''),
    [error, setError] = useState(''),
    [renameIndex, setRenameIndex] = useState<number | null>(null),
    [renameValue, setRenameValue] = useState('');
  const workspaceImportRef = useRef<HTMLInputElement>(null);
  const toolbar = normalizeToolbar(
    tools.map((tool) => tool.id),
    value.toolbar,
  );
  const updateLayout = (p: Partial<WorkspaceLayout>) =>
    onChange({ ...value, layout: { ...value.layout, ...p } });
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-xl max-h-[85vh] overflow-y-auto"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DialogTitle>Workspace settings</DialogTitle>
        <DialogDescription>
          Saved on this browser profile. These settings remain after you close
          LibreLayer.
        </DialogDescription>
        <Tabs defaultValue={initialTab}>
          <TabsList>
            <TabsTrigger value="layout">Workspace</TabsTrigger>
            <TabsTrigger value="keys">Shortcuts</TabsTrigger>
            <TabsTrigger value="toolbar">Toolbar</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="presets">Tool presets</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          <TabsContent value="layout" className="grid gap-3">
            <label>
              Panel dock
              <select
                className="block border rounded p-2 bg-background w-full"
                value={value.layout.side}
                onChange={(e) =>
                  updateLayout({ side: e.target.value as 'left' | 'right' })
                }
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </label>
            <label>
              Panel width
              <input
                className="block border rounded p-2 w-full"
                type="number"
                min={260}
                max={440}
                value={value.layout.width}
                onChange={(e) => {
                  if (+e.target.value >= 260 && +e.target.value <= 440)
                    updateLayout({ width: +e.target.value });
                }}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={value.layout.smart}
                onChange={(e) => updateLayout({ smart: e.target.checked })}
              />{' '}
              Show smart tools panel
            </label>
            <label>
              <input
                type="checkbox"
                checked={value.autosave}
                onChange={(e) =>
                  onChange({ ...value, autosave: e.target.checked })
                }
              />{' '}
              Restore open documents on this browser profile
            </label>
            <p>
              Open documents, layers, masks, tabs and views are saved locally
              every 10 seconds and when the page is hidden. Only changed
              documents are rewritten, and dated restore points are kept.
            </p>
            <div className="grid gap-2 rounded border p-3">
              <strong>Local working storage</strong>
              <span>{storageStatus}</span>
              <Button variant="outline" onClick={onProtectStorage}>
                Protect local working storage
              </Button>
              <p>
                This asks the browser to protect recovery data from automatic
                cleanup. Important projects should still be saved as files.
              </p>
            </div>
            <div className="grid gap-2 rounded border p-3">
              <strong>Default project save location</strong>
              <span>{saveLocationName}</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onChooseSaveLocation}>
                  Choose folder…
                </Button>
                <Button variant="ghost" onClick={onResetSaveLocation}>
                  Use Downloads
                </Button>
              </div>
              <p>
                Supported browsers can remember a folder on this computer or an
                attached drive. They may ask you to re-authorize it after
                reconnecting.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                onChange({ ...value, layout: { ...defaultPreferences.layout } })
              }
            >
              Reset panel layout
            </Button>
            <label>
              Workspace name
              <input
                className="block border rounded p-2 w-full"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <Button
              disabled={
                !name.trim() ||
                (value.workspaces.length >= 10 &&
                  !value.workspaces.some((w) => w.name === name.trim()))
              }
              onClick={() => {
                onChange({
                  ...value,
                  workspaces: [
                    ...value.workspaces.filter((w) => w.name !== name.trim()),
                    { name: name.trim(), layout: { ...value.layout } },
                  ],
                });
                setName('');
              }}
            >
              Save workspace
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!value.workspaces.length}
                onClick={() => {
                  const url = URL.createObjectURL(
                      new Blob([serializeWorkspaces(value.workspaces)], {
                        type: 'application/json',
                      }),
                    ),
                    anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = 'librelayer-workspaces.json';
                  anchor.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                  setError('Workspace layouts exported.');
                }}
              >
                Export layouts
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => workspaceImportRef.current?.click()}
              >
                Import layouts…
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!value.workspaces.length}
                onClick={() => {
                  onChange({
                    ...value,
                    layout: { ...defaultPreferences.layout },
                    workspaces: [],
                  });
                  setRenameIndex(null);
                  setError('All saved layouts reset.');
                }}
              >
                Reset all layouts
              </Button>
              <input
                ref={workspaceImportRef}
                hidden
                type="file"
                accept="application/json,.json"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  try {
                    const workspaces = parseWorkspaces(await file.text());
                    onChange({
                      ...value,
                      workspaces,
                      layout: { ...workspaces[0].layout },
                    });
                    setError(
                      `${workspaces.length} workspace ${workspaces.length === 1 ? 'layout' : 'layouts'} imported.`,
                    );
                  } catch (importError) {
                    setError(
                      importError instanceof Error
                        ? importError.message
                        : 'Workspace layouts could not be imported.',
                    );
                  }
                }}
              />
            </div>
            {value.workspaces.map((w, i) => (
              <div key={`${w.name}-${i}`} className="flex flex-wrap gap-2">
                {renameIndex === i ? (
                  <>
                    <input
                      aria-label={`Rename workspace ${w.name}`}
                      className="min-w-0 flex-1 rounded border p-2"
                      value={renameValue}
                      maxLength={60}
                      onChange={(event) => setRenameValue(event.target.value)}
                    />
                    <Button
                      disabled={
                        !renameValue.trim() ||
                        value.workspaces.some(
                          (item, index) =>
                            index !== i &&
                            item.name.toLowerCase() ===
                              renameValue.trim().toLowerCase(),
                        )
                      }
                      onClick={() => {
                        onChange({
                          ...value,
                          workspaces: value.workspaces.map((item, index) =>
                            index === i
                              ? { ...item, name: renameValue.trim() }
                              : item,
                          ),
                        });
                        setRenameIndex(null);
                        setRenameValue('');
                      }}
                    >
                      Save name
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() =>
                        onChange({ ...value, layout: { ...w.layout } })
                      }
                    >
                      {w.name}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setRenameIndex(i);
                        setRenameValue(w.name);
                      }}
                    >
                      Rename
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  aria-label={`Delete workspace ${w.name}`}
                  onClick={() =>
                    onChange({
                      ...value,
                      workspaces: value.workspaces.filter((_, n) => n !== i),
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="keys" className="grid gap-2">
            <p>
              Tool shortcuts use single letters. Command shortcuts use Ctrl or
              ⌘; focus a command field and press the desired combination. Some
              browser-reserved combinations may not reach the editor.
            </p>
            {tools.map((tool) => (
              <label
                key={tool.id}
                className="flex items-center justify-between"
              >
                {tool.label}
                <input
                  className="border rounded p-2 w-16"
                  aria-label={`${tool.label} shortcut`}
                  maxLength={1}
                  value={value.shortcuts[tool.id] ?? tool.key.toLowerCase()}
                  onChange={(e) => {
                    const key = e.target.value.toLowerCase();
                    if (!/^[a-z]$/.test(key)) return;
                    const other = tools.find(
                      (t) =>
                        t.id !== tool.id &&
                        (value.shortcuts[t.id] ?? t.key.toLowerCase()) === key,
                    );
                    if (other) {
                      setError(
                        `${key.toUpperCase()} is already assigned to ${other.label}.`,
                      );
                      return;
                    }
                    setError('');
                    onChange({
                      ...value,
                      shortcuts: { ...value.shortcuts, [tool.id]: key },
                    });
                  }}
                />
              </label>
            ))}
            <h3>Menu commands</h3>
            {commands.map((command) => (
              <label
                key={command.name}
                className="flex items-center justify-between gap-3"
              >
                {command.name}
                <span className="flex gap-1">
                  <input
                    className="border rounded p-2 w-36"
                    readOnly
                    aria-label={`${command.name} command shortcut`}
                    placeholder="Unassigned"
                    value={shortcutLabel(
                      value.commands?.[command.name] ?? command.shortcut,
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' || e.key === 'Escape') return;
                      e.preventDefault();
                      if (
                        !/^[a-z0-9]$/i.test(e.key) ||
                        !(e.metaKey || e.ctrlKey)
                      ) {
                        setError(
                          'Use Ctrl or Command with a letter or number; Shift and Alt are optional.',
                        );
                        return;
                      }
                      const key = commandKey(e),
                        conflict = commands.find(
                          (c) =>
                            c.name !== command.name &&
                            (value.commands?.[c.name] ?? c.shortcut) === key,
                        );
                      if (conflict) {
                        setError(
                          `Already assigned to ${conflict.name}. Clear that assignment first.`,
                        );
                        return;
                      }
                      setError('');
                      onChange({
                        ...value,
                        commands: { ...value.commands, [command.name]: key },
                      });
                    }}
                  />
                  <Button
                    variant="ghost"
                    aria-label={`Clear ${command.name} shortcut`}
                    onClick={() =>
                      onChange({
                        ...value,
                        commands: { ...value.commands, [command.name]: '' },
                      })
                    }
                  >
                    Clear
                  </Button>
                </span>
              </label>
            ))}
            <Button
              variant="outline"
              onClick={() => {
                setError('');
                onChange({ ...value, shortcuts: {}, commands: {} });
              }}
            >
              Reset shortcuts
            </Button>
          </TabsContent>
          <TabsContent value="appearance" className="grid gap-3">
            <label>
              Interface theme
              <select
                className="block w-full rounded border bg-background p-2"
                value={value.theme ?? 'dark'}
                onChange={(event) =>
                  onChange({
                    ...value,
                    theme: event.target.value as EditorPreferences['theme'],
                  })
                }
              >
                <option value="dark">Dark studio</option>
                <option value="light">Light studio</option>
                <option value="contrast">High contrast</option>
              </select>
            </label>
            <label>
              Interface scale
              <select
                className="block w-full rounded border bg-background p-2"
                value={value.interfaceScale ?? 100}
                onChange={(event) =>
                  onChange({
                    ...value,
                    interfaceScale: +event.target
                      .value as EditorPreferences['interfaceScale'],
                  })
                }
              >
                <option value="85">Compact · 85%</option>
                <option value="100">Standard · 100%</option>
                <option value="115">Large · 115%</option>
                <option value="125">Extra large · 125%</option>
              </select>
            </label>
            <p>
              Scaling changes the application controls and spacing, not image
              pixels, zoom accuracy, or export dimensions.
            </p>
            <label>
              Interface motion
              <select
                aria-label="Interface motion"
                className="block w-full rounded border bg-background p-2"
                value={value.motion ?? 'system'}
                onChange={(event) =>
                  onChange({
                    ...value,
                    motion: event.target.value as MotionPreference,
                  })
                }
              >
                <option value="system">Follow system setting</option>
                <option value="reduced">Reduce motion</option>
                <option value="full">Allow interface motion</option>
              </select>
            </label>
            <Button
              variant="outline"
              onClick={() =>
                onChange({
                  ...value,
                  theme: defaultPreferences.theme,
                  interfaceScale: defaultPreferences.interfaceScale,
                  motion: defaultPreferences.motion,
                })
              }
            >
              Reset appearance
            </Button>
          </TabsContent>
          <TabsContent value="toolbar" className="grid gap-3">
            <p>
              Choose which tools appear on the left rail and arrange them in the
              order that fits your workflow. Hidden tools remain available
              through shortcuts and command search.
            </p>
            <label>
              <input
                type="checkbox"
                checked={toolbar.groupByFamily}
                onChange={(event) =>
                  onChange({
                    ...value,
                    toolbar: {
                      ...toolbar,
                      groupByFamily: event.target.checked,
                    },
                  })
                }
              />{' '}
              Separate related tool groups
            </label>
            <div className="toolbar-editor-list">
              {toolbar.order.map((id, index) => {
                const item = tools.find((tool) => tool.id === id),
                  visibleCount = toolbar.order.length - toolbar.hidden.length;
                if (!item) return null;
                return (
                  <div className="toolbar-editor-row" key={id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={!toolbar.hidden.includes(id)}
                        disabled={
                          visibleCount <= 1 && !toolbar.hidden.includes(id)
                        }
                        onChange={(event) =>
                          onChange({
                            ...value,
                            toolbar: {
                              ...toolbar,
                              hidden: event.target.checked
                                ? toolbar.hidden.filter(
                                    (toolId) => toolId !== id,
                                  )
                                : [...toolbar.hidden, id],
                            },
                          })
                        }
                      />{' '}
                      {item.label}
                    </label>
                    <span>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Move ${item.label} up`}
                        disabled={index === 0}
                        onClick={() =>
                          onChange({
                            ...value,
                            toolbar: moveToolbarItem(toolbar, id, -1),
                          })
                        }
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Move ${item.label} down`}
                        disabled={index === toolbar.order.length - 1}
                        onClick={() =>
                          onChange({
                            ...value,
                            toolbar: moveToolbarItem(toolbar, id, 1),
                          })
                        }
                      >
                        ↓
                      </Button>
                    </span>
                  </div>
                );
              })}
            </div>
            <Button
              variant="outline"
              onClick={() =>
                onChange({
                  ...value,
                  toolbar: normalizeToolbar(tools.map((tool) => tool.id)),
                })
              }
            >
              Reset toolbar
            </Button>
          </TabsContent>
          <TabsContent value="presets" className="grid gap-3">
            <p>
              Save the current tool, size, opacity, color, text size and
              selection feather.
            </p>
            <input
              className="border rounded p-2"
              aria-label="Tool preset name"
              placeholder="Preset name"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              disabled={
                !name.trim() ||
                (value.presets.length >= 20 &&
                  !value.presets.some((p) => p.name === name.trim()))
              }
              onClick={() => {
                onChange({
                  ...value,
                  presets: [
                    ...value.presets.filter((p) => p.name !== name.trim()),
                    { name: name.trim(), ...current },
                  ],
                });
                setName('');
              }}
            >
              Save current tool preset
            </Button>
            {value.presets.map((p, i) => (
              <div key={p.name} className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    onApply(p);
                    onClose();
                  }}
                >
                  {p.name}
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Delete preset ${p.name}`}
                  onClick={() =>
                    onChange({
                      ...value,
                      presets: value.presets.filter((_, n) => n !== i),
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="performance" className="grid gap-3">
            <div className="grid gap-2 rounded border p-3">
              <strong>Current document</strong>
              <span>{documentStatus}</span>
              <span>{storageStatus}</span>
            </div>
            <label>
              Rendering preference
              <select
                className="block border rounded p-2 bg-background w-full"
                value={value.performanceMode ?? 'balanced'}
                onChange={(event) =>
                  onChange({
                    ...value,
                    performanceMode: event.target.value as PerformanceMode,
                  })
                }
              >
                <option value="performance">Performance — fastest previews</option>
                <option value="balanced">Balanced — adaptive</option>
                <option value="quality">Quality — sharper live previews</option>
              </select>
            </label>
            <p>
              LibreLayer automatically reduces interactive preview work when a
              document approaches this computer&apos;s memory budget, then renders
              the final full-quality result after the control settles.
            </p>
            <label>
              Scratch storage
              <select
                className="block border rounded p-2 bg-background w-full"
                value={value.scratchLocation ?? 'browser'}
                onChange={(event) =>
                  onChange({
                    ...value,
                    scratchLocation: event.target.value as ScratchLocation,
                  })
                }
              >
                <option value="browser">Private browser storage</option>
                <option value="save-folder">Remembered save folder or external drive</option>
              </select>
            </label>
            <label>
              Scratch quota (MB)
              <input
                className="block border rounded p-2 w-full"
                type="number"
                min={128}
                max={8192}
                step={128}
                value={value.scratchQuotaMb ?? 1024}
                onChange={(event) =>
                  onChange({
                    ...value,
                    scratchQuotaMb: Math.max(128, Math.min(8192, +event.target.value || 1024)),
                  })
                }
              />
            </label>
            <div className="flex items-center justify-between gap-3 rounded border p-3">
              <span>{scratchStatus}</span>
              <Button variant="outline" onClick={onCleanScratch}>Clean scratch</Button>
            </div>
            <div className="grid gap-2 rounded border p-3">
              <div className="flex items-center justify-between gap-3">
                <strong>Large-document check</strong>
                <Button
                  variant="outline"
                  disabled={performanceCheckRunning}
                  onClick={onRunPerformanceCheck}
                >
                  {performanceCheckRunning ? 'Running…' : 'Run local check'}
                </Button>
              </div>
              <span>{performanceCheckStatus}</span>
              <p>
                Runs off the interface thread using 12, 36, 64, and 100 MP tiled
                workloads plus a 300-layer composite fixture.
              </p>
            </div>
            <label>
              Undo history states
              <input
                className="block border rounded p-2 w-full"
                type="number"
                min={5}
                max={100}
                value={value.historyDepth ?? 32}
                onChange={(event) =>
                  onChange({
                    ...value,
                    historyDepth: Math.max(
                      5,
                      Math.min(100, +event.target.value || 32),
                    ),
                  })
                }
              />
            </label>
            <label>
              History memory budget (MB)
              <input
                className="block border rounded p-2 w-full"
                type="number"
                min={128}
                max={2048}
                step={128}
                value={value.historyBudgetMb ?? 512}
                onChange={(event) =>
                  onChange({
                    ...value,
                    historyBudgetMb: Math.max(
                      128,
                      Math.min(2048, +event.target.value || 512),
                    ),
                  })
                }
              />
            </label>
            <p>
              LibreLayer keeps named snapshots when possible and releases the
              oldest undo states first when either limit is reached. These
              limits are saved on this browser profile.
            </p>
            <label>
              Soft-proof preview
              <select
                className="block border rounded p-2 bg-background w-full"
                value={value.proofMode ?? 'none'}
                onChange={(event) =>
                  onChange({
                    ...value,
                    proofMode: event.target.value as SoftProofMode,
                  })
                }
              >
                <option value="none">Off — working RGB</option>
                <option value="cmyk">CMYK print simulation</option>
                <option value="grayscale">Grayscale output</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={value.gamutWarning ?? false}
                disabled={(value.proofMode ?? 'none') === 'none'}
                onChange={(event) =>
                  onChange({ ...value, gamutWarning: event.target.checked })
                }
              />{' '}
              Show out-of-gamut colors in magenta
            </label>
            <p>
              Proofing changes only the on-screen preview. Exported pixels stay
              untouched. Exact press matching still depends on the destination
              ICC profile and a calibrated display.
            </p>
            <Button variant="outline" onClick={onProtectStorage}>
              Protect local working storage
            </Button>
          </TabsContent>
        </Tabs>
        {error && <p role="alert">{error}</p>}
        <Button onClick={onClose}>Done</Button>
      </DialogContent>
    </Dialog>
  );
}
