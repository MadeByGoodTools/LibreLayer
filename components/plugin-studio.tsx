'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { FilterPluginManifest } from '@/lib/filter-plugin';
import {
  MAX_PLUGIN_FILE_BYTES,
  installPlugin,
  pluginFilterManifest,
  validatePluginManifest,
  type LibreLayerPluginManifest,
  type PluginControl,
  type PluginExporter,
} from '@/lib/plugin-platform';

const STORAGE_KEY = 'librelayer-plugin-registry-v1';
const SETTINGS_KEY = 'librelayer-plugin-settings-v1';

type PluginSettings = Record<string, Record<string, number | boolean | string>>;

const readRegistry = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.map(validatePluginManifest).slice(0, 32);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
};

const readSettings = (): PluginSettings => {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value
      : {};
  } catch {
    return {};
  }
};

const defaultSettings = (plugin: LibreLayerPluginManifest) =>
  Object.fromEntries(
    (plugin.contributes.panel?.controls ?? []).map((control) => [
      control.id,
      control.default,
    ]),
  );

const Control = ({
  control,
  value,
  onChange,
}: {
  control: PluginControl;
  value: number | boolean | string;
  onChange: (value: number | boolean | string) => void;
}) => {
  if (control.kind === 'slider')
    return (
      <label className="plugin-control">
        <span>{control.label}</span>
        <Slider
          aria-label={control.label}
          min={control.min}
          max={control.max}
          value={[Number(value)]}
          onValueChange={(next) =>
            onChange(Number(Array.isArray(next) ? next[0] : next))
          }
        />
        <output>{Math.round(Number(value))}</output>
      </label>
    );
  if (control.kind === 'checkbox')
    return (
      <label className="plugin-control plugin-checkbox">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{control.label}</span>
      </label>
    );
  return (
    <label className="plugin-control">
      <span>{control.label}</span>
      <input
        type={control.kind === 'color' ? 'color' : 'text'}
        value={String(value)}
        maxLength={control.kind === 'text' ? 160 : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
};

export function PluginStudio({
  onApplyFilter,
  onExport,
}: {
  onApplyFilter: (
    manifest: FilterPluginManifest,
    amount: number,
  ) => Promise<boolean> | boolean;
  onExport: (exporter: PluginExporter) => Promise<void> | void;
}) {
  const fileRef = useRef<HTMLInputElement>(null),
    [plugins, setPlugins] = useState<LibreLayerPluginManifest[]>([]),
    [selectedId, setSelectedId] = useState(''),
    [settings, setSettings] = useState<PluginSettings>({}),
    [status, setStatus] = useState(
      'Plug-ins run locally with declared access only.',
    ),
    [running, setRunning] = useState('');
  useEffect(() => {
    const restored = readRegistry();
    setPlugins(restored);
    setSelectedId(restored[0]?.id ?? '');
    setSettings(readSettings());
  }, []);
  const persistPlugins = (next: LibreLayerPluginManifest[]) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setPlugins(next);
    },
    persistSettings = (next: PluginSettings) => {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      setSettings(next);
    },
    selected = plugins.find((plugin) => plugin.id === selectedId) ?? plugins[0],
    selectedSettings = selected
      ? { ...defaultSettings(selected), ...settings[selected.id] }
      : {};
  const updateSetting = (
    plugin: LibreLayerPluginManifest,
    id: string,
    value: number | boolean | string,
  ) =>
    persistSettings({
      ...settings,
      [plugin.id]: {
        ...defaultSettings(plugin),
        ...settings[plugin.id],
        [id]: value,
      },
    });
  return (
    <section className="plugin-studio" aria-labelledby="plugin-studio-title">
      <div className="plugin-studio-heading">
        <div>
          <strong id="plugin-studio-title">Local plug-in studio</strong>
          <span>Versioned · permission-gated · no network access</span>
        </div>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".libreplugin,application/json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            try {
              if (file.size > MAX_PLUGIN_FILE_BYTES)
                throw new Error('Plug-in files must be 1.5 MB or smaller.');
              const manifest = validatePluginManifest(
                  JSON.parse(await file.text()),
                ),
                previous = plugins.find((plugin) => plugin.id === manifest.id),
                next = installPlugin(plugins, manifest);
              persistPlugins(next);
              setSelectedId(manifest.id);
              setStatus(
                previous
                  ? `${manifest.name} upgraded from ${previous.version} to ${manifest.version}`
                  : `${manifest.name} ${manifest.version} installed locally`,
              );
            } catch (error) {
              setStatus(
                error instanceof Error
                  ? error.message
                  : 'The plug-in could not be installed.',
              );
            }
          }}
        />
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          Install .libreplugin
        </Button>
      </div>
      {plugins.length ? (
        <div className="plugin-studio-body">
          <nav aria-label="Installed plug-ins">
            {plugins.map((plugin) => (
              <button
                type="button"
                key={plugin.id}
                data-active={plugin.id === selected?.id}
                onClick={() => setSelectedId(plugin.id)}
              >
                <strong>{plugin.name}</strong>
                <small>v{plugin.version}</small>
              </button>
            ))}
          </nav>
          {selected ? (
            <div className="plugin-detail">
              <header>
                <div>
                  <strong>
                    {selected.contributes.panel?.title ?? selected.name}
                  </strong>
                  {selected.description ? (
                    <span>{selected.description}</span>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const next = plugins.filter(
                      (plugin) => plugin.id !== selected.id,
                    );
                    persistPlugins(next);
                    setSelectedId(next[0]?.id ?? '');
                    setStatus(`${selected.name} removed`);
                  }}
                >
                  Remove
                </Button>
              </header>
              <div
                className="plugin-permissions"
                aria-label="Granted permissions"
              >
                {selected.permissions.map((permission) => (
                  <small key={permission}>{permission}</small>
                ))}
              </div>
              {selected.contributes.panel?.controls.length ? (
                <div className="plugin-controls">
                  {selected.contributes.panel.controls.map((control) => (
                    <Control
                      key={control.id}
                      control={control}
                      value={selectedSettings[control.id] ?? control.default}
                      onChange={(value) =>
                        updateSetting(selected, control.id, value)
                      }
                    />
                  ))}
                </div>
              ) : null}
              {selected.contributes.filters?.length ? (
                <div className="plugin-contributions">
                  <strong>Filters</strong>
                  {selected.contributes.filters.map((filter) => (
                    <Button
                      key={filter.id}
                      variant="outline"
                      disabled={Boolean(running)}
                      onClick={async () => {
                        const key = `filter:${filter.id}`;
                        setRunning(key);
                        setStatus(
                          `Running ${filter.label} in an isolated worker…`,
                        );
                        try {
                          const amount = Number(
                            selectedSettings.amount ??
                              selectedSettings.strength ??
                              100,
                          );
                          const applied = await onApplyFilter(
                            pluginFilterManifest(selected, filter),
                            Number.isFinite(amount) ? amount : 100,
                          );
                          setStatus(
                            applied
                              ? `${filter.label} completed locally`
                              : `${filter.label} did not change the document`,
                          );
                        } catch (error) {
                          setStatus(
                            error instanceof Error
                              ? error.message
                              : `${filter.label} failed safely`,
                          );
                        } finally {
                          setRunning('');
                        }
                      }}
                    >
                      {running === `filter:${filter.id}`
                        ? 'Running…'
                        : filter.label}
                    </Button>
                  ))}
                </div>
              ) : null}
              {selected.contributes.exporters?.length ? (
                <div className="plugin-contributions">
                  <strong>Exporters</strong>
                  {selected.contributes.exporters.map((exporter) => (
                    <Button
                      key={exporter.id}
                      variant="outline"
                      disabled={Boolean(running)}
                      onClick={async () => {
                        setRunning(`export:${exporter.id}`);
                        try {
                          await onExport(exporter);
                          setStatus(`${exporter.label} export started`);
                        } catch (error) {
                          setStatus(
                            error instanceof Error
                              ? error.message
                              : `${exporter.label} failed safely`,
                          );
                        } finally {
                          setRunning('');
                        }
                      }}
                    >
                      {running === `export:${exporter.id}`
                        ? 'Preparing…'
                        : exporter.label}
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="plugin-empty">
          No plug-ins installed. LibreLayer accepts validated .libreplugin
          files; panels are declarative and pixel code runs off the interface
          thread.
        </p>
      )}
      <output className="plugin-status" aria-live="polite">
        {status}
      </output>
    </section>
  );
}
