'use client';
import { Button } from '@/components/ui/button';
import {
  blendIfChannels,
  defaultBlendIf,
  type BlendIf,
  type BlendIfChannel,
  type BlendRange,
} from '@/lib/layer-compositing';
export function BlendIfControls({
  value,
  onChange,
  disabled,
}: {
  value?: BlendIf;
  onChange: (value?: BlendIf) => void;
  disabled: boolean;
}) {
  const current = value ?? defaultBlendIf;
  const channels = blendIfChannels(current);
  const updateRange = (key: 'source' | 'backdrop', range: BlendRange) => {
    const selected = current.channel ?? 'gray';
    onChange({
      ...current,
      [key]: range,
      channels: {
        ...channels,
        [selected]: { ...channels[selected]!, [key]: range },
      },
    });
  };
  return (
    <details className="blend-if-controls">
      <summary>
        Blend If ·{' '}
        {current.channel === 'gray' || !current.channel
          ? 'grayscale'
          : current.channel}
      </summary>
      <p>
        Hide shadows/highlights with optional soft transitions. These controls
        affect the active pixel layer.
      </p>
      <fieldset disabled={disabled}>
        <label>
          Blend channel
          <select
            aria-label="Blend If channel"
            value={current.channel ?? 'gray'}
            onChange={(event) => {
              const channel = event.target.value as BlendIfChannel,
                selected = channels[channel] ?? defaultBlendIf;
              onChange({
                ...current,
                channel,
                source: [...selected.source],
                backdrop: [...selected.backdrop],
                channels,
              });
            }}
          >
            <option value="gray">Grayscale</option>
            <option value="red">Red</option>
            <option value="green">Green</option>
            <option value="blue">Blue</option>
          </select>
        </label>
        {(['source', 'backdrop'] as const).map((key) => (
          <div key={key}>
            <strong>
              {key === 'source' ? 'This layer' : 'Underlying image'}
            </strong>
            <div className="blend-range-grid">
              {[
                'Black cutoff',
                'Black fade end',
                'White fade start',
                'White cutoff',
              ].map((label, i) => (
                <label key={label}>
                  {label}
                  <input
                    aria-label={`${key === 'source' ? 'This layer' : 'Underlying image'} ${label}`}
                    type="number"
                    min={i ? current[key][i - 1] : 0}
                    max={i < 3 ? current[key][i + 1] : 255}
                    value={current[key][i]}
                    onChange={(e) => {
                      const n = +e.target.value;
                      if (!Number.isFinite(n)) return;
                      const range = [...current[key]] as BlendRange;
                      range[i] = Math.max(
                        i ? range[i - 1] : 0,
                        Math.min(i < 3 ? range[i + 1] : 255, Math.round(n)),
                      );
                      updateRange(key, range);
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="property-buttons">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const channel = current.channel ?? 'gray',
                next = { ...channels };
              delete next[channel];
              const remaining = Object.entries(next)[0] as
                | [BlendIfChannel, { source: BlendRange; backdrop: BlendRange }]
                | undefined;
              onChange(
                remaining
                  ? {
                      channel: remaining[0],
                      source: [...remaining[1].source],
                      backdrop: [...remaining[1].backdrop],
                      channels: next,
                    }
                  : undefined,
              );
            }}
          >
            Reset channel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onChange(undefined)}
          >
            Reset all
          </Button>
        </div>
      </fieldset>
    </details>
  );
}
