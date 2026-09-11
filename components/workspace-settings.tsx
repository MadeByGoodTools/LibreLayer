'use client';
import { useState } from 'react';
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
    { floating: boolean; x: number; y: number; width: number }
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
};
export const defaultPreferences: EditorPreferences = {
  layout: { side: 'right', width: 300, smart: true },
  workspaces: [],
  shortcuts: {},
  presets: [],
  autosave: true,
  proofMode: 'none',
  gamutWarning: false,
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
  documentStatus: string;
}) {
  const [name, setName] = useState(''),
    [error, setError] = useState('');
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
        <Tabs defaultValue="layout">
          <TabsList>
            <TabsTrigger value="layout">Workspace</TabsTrigger>
            <TabsTrigger value="keys">Shortcuts</TabsTrigger>
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
            {value.workspaces.map((w, i) => (
              <div key={w.name} className="flex gap-2">
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
