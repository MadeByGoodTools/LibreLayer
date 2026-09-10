'use client';
import { Button } from '@/components/ui/button';
import {
  defaultBlendIf,
  type BlendIf,
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
            onChange={(event) =>
              onChange({
                ...current,
                channel: event.target.value as BlendIf['channel'],
              })
            }
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
                      onChange({ ...current, [key]: range });
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => onChange(undefined)}>
          Reset Blend If
        </Button>
      </fieldset>
    </details>
  );
}
