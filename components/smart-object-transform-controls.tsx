'use client';

import { Slider } from '@/components/ui/slider';
import {
  normalizeSmartObjectTransform,
  type SmartObjectTransform,
} from '@/lib/smart-object-transform';
import type { WarpMode, WarpPreset } from '@/lib/warp-engine';

const sliderNumber = (value: number | readonly number[]) =>
  Number(Array.isArray(value) ? value[0] : value);

export function SmartObjectTransformControls({
  value,
  onPreview,
  onCommit,
}: {
  value?: SmartObjectTransform;
  onPreview: (value?: SmartObjectTransform) => void;
  onCommit: (label: string) => void;
}) {
  const transform = normalizeSmartObjectTransform(value);
  const patch = (next: Partial<SmartObjectTransform>) =>
    onPreview(normalizeSmartObjectTransform({ ...transform, ...next }));
  return (
    <section
      className="smart-transform-controls"
      aria-label="Smart Object distortion"
    >
      <div className="property-heading">
        <strong>Smart Object distortion</strong>
        <button
          onClick={() => {
            onPreview(undefined);
            onCommit('Reset Smart Object distortion');
          }}
        >
          Reset
        </button>
      </div>
      <label>
        Mode
        <select
          aria-label="Smart Object transform mode"
          value={transform.mode}
          onChange={(event) => {
            patch({ mode: event.target.value as WarpMode });
            onCommit('Change Smart Object distortion');
          }}
        >
          <option value="skew">Skew</option>
          <option value="distort">Distort</option>
          <option value="perspective">Perspective</option>
          <option value="warp">Warp</option>
          <option value="mesh">Mesh Warp</option>
          <option value="split">Split Warp</option>
          <option value="cylindrical">Cylindrical</option>
          <option value="puppet">Puppet Warp</option>
          <option value="perspective-warp">Perspective Warp</option>
          <option value="preset-warp">Warp Preset</option>
        </select>
      </label>
      {transform.mode === 'preset-warp' && (
        <label>
          Preset
          <select
            aria-label="Smart Object warp preset"
            value={transform.preset ?? 'arc'}
            onChange={(event) => {
              patch({ preset: event.target.value as WarpPreset });
              onCommit('Change Smart Object warp preset');
            }}
          >
            <option value="arc">Arc</option>
            <option value="flag">Flag</option>
            <option value="fisheye">Fisheye</option>
            <option value="twist">Twist</option>
          </select>
        </label>
      )}
      {(['horizontal', 'vertical'] as const).map((axis) => (
        <div key={axis}>
          <label>
            {axis === 'horizontal' ? 'Horizontal' : 'Vertical'}{' '}
            <span>{transform[axis]}%</span>
          </label>
          <Slider
            aria-label={`Smart Object ${axis} distortion`}
            min={-100}
            max={100}
            value={transform[axis]}
            onValueChange={(next) => patch({ [axis]: sliderNumber(next) })}
            onValueCommitted={() =>
              onCommit(`Adjust Smart Object ${axis} distortion`)
            }
          />
        </div>
      ))}
      <small>
        Editable after reopening; vector, RAW, and nested source content stays
        intact.
      </small>
    </section>
  );
}
