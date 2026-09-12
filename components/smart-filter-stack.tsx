'use client';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export type EditableSmartFilter = {
  id: string;
  name: 'Blur' | 'Sharpen' | 'Brightness';
  amount: number;
  opacity: number;
  blend: string;
  enabled: boolean;
};

type FilterPatch = Partial<
  Pick<EditableSmartFilter, 'amount' | 'opacity' | 'blend' | 'enabled'>
>;

const sliderNumber = (value: number | readonly number[]) =>
  Number(Array.isArray(value) ? value[0] : value);

export function SmartFilterStack({
  filters,
  disabled,
  filterMask,
  blendOptions,
  onAdd,
  onChange,
  onCommit,
  onMove,
  onRemove,
  onEditMask,
}: {
  filters: EditableSmartFilter[];
  disabled: boolean;
  filterMask: boolean;
  blendOptions: Array<{ value: string; label: string }>;
  onAdd: (name: EditableSmartFilter['name']) => void;
  onChange: (id: string, patch: FilterPatch) => void;
  onCommit: (label: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onEditMask: () => void;
}) {
  return (
    <section className="smart-filter-stack" aria-label="Smart Filters">
      <header>
        <strong>Smart Filters</strong>
        <button disabled={disabled} onClick={onEditMask}>
          {filterMask ? 'Edit filter mask' : 'Add filter mask'}
        </button>
      </header>
      <p>Versioned live preview · full-quality result cached locally</p>
      <div className="smart-filter-add">
        {(['Blur', 'Sharpen', 'Brightness'] as const).map((name) => (
          <Button
            key={name}
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onAdd(name)}
          >
            + {name}
          </Button>
        ))}
      </div>
      {filters.length === 0 ? (
        <p>Add a filter to keep the effect editable.</p>
      ) : (
        <div className="smart-filter-list">
          {filters.map((filter, index) => {
            const amountRange =
              filter.name === 'Blur'
                ? { min: 0, max: 50, suffix: ' px' }
                : filter.name === 'Brightness'
                  ? { min: -100, max: 100, suffix: '%' }
                  : { min: 0, max: 100, suffix: '%' };
            return (
              <article key={filter.id} className="smart-filter-row">
                <div className="smart-filter-heading">
                  <label>
                    <input
                      type="checkbox"
                      checked={filter.enabled}
                      disabled={disabled}
                      onChange={(event) =>
                        onChange(filter.id, { enabled: event.target.checked })
                      }
                    />
                    <strong>{filter.name}</strong>
                  </label>
                  <div>
                    <button
                      aria-label={`Move ${filter.name} up`}
                      disabled={disabled || index === 0}
                      onClick={() => onMove(filter.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`Move ${filter.name} down`}
                      disabled={disabled || index === filters.length - 1}
                      onClick={() => onMove(filter.id, 1)}
                    >
                      ↓
                    </button>
                    <button
                      aria-label={`Delete ${filter.name}`}
                      disabled={disabled}
                      onClick={() => onRemove(filter.id)}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <label className="smart-filter-control">
                  <span>Amount</span>
                  <Slider
                    aria-label={`${filter.name} amount`}
                    min={amountRange.min}
                    max={amountRange.max}
                    value={filter.amount}
                    disabled={disabled || !filter.enabled}
                    onValueChange={(value) =>
                      onChange(filter.id, { amount: sliderNumber(value) })
                    }
                    onValueCommitted={() =>
                      onCommit(`${filter.name} Smart Filter amount`)
                    }
                  />
                  <output>
                    {filter.amount}
                    {amountRange.suffix}
                  </output>
                </label>
                <label className="smart-filter-control">
                  <span>Opacity</span>
                  <Slider
                    aria-label={`${filter.name} opacity`}
                    min={0}
                    max={100}
                    value={filter.opacity}
                    disabled={disabled || !filter.enabled}
                    onValueChange={(value) =>
                      onChange(filter.id, { opacity: sliderNumber(value) })
                    }
                    onValueCommitted={() =>
                      onCommit(`${filter.name} Smart Filter opacity`)
                    }
                  />
                  <output>{filter.opacity}%</output>
                </label>
                <label className="smart-filter-blend">
                  <span>Blend</span>
                  <select
                    aria-label={`${filter.name} blend mode`}
                    value={filter.blend}
                    disabled={disabled || !filter.enabled}
                    onChange={(event) => {
                      onChange(filter.id, { blend: event.target.value });
                      onCommit(`${filter.name} Smart Filter blend mode`);
                    }}
                  >
                    {blendOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
