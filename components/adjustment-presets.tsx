'use client';

import { useRef, useState } from 'react';
import {
  createDefaultHighDepthAdjustments,
  type HighDepthAdjustments,
} from '@/lib/high-depth';

const presets: Array<{
  name: string;
  settings: Partial<HighDepthAdjustments>;
}> = [
  { name: 'Neutral', settings: {} },
  {
    name: 'Portrait',
    settings: {
      brightness: 3,
      contrast: -4,
      vibrance: 12,
      curveShadows: 7,
      curveHighlights: -5,
    },
  },
  {
    name: 'Landscape',
    settings: {
      contrast: 12,
      saturation: 6,
      vibrance: 24,
      curveShadows: -8,
      curveHighlights: 10,
    },
  },
  {
    name: 'Matte',
    settings: {
      levelsBlack: 12,
      contrast: -5,
      curveShadows: 18,
      curveHighlights: -12,
    },
  },
  {
    name: 'Warm',
    settings: {
      photoFilter: '#ef9957',
      photoFilterDensity: 14,
      vibrance: 8,
    },
  },
  {
    name: 'B&W',
    settings: {
      blackWhite: true,
      redMix: 35,
      greenMix: 55,
      blueMix: 10,
      contrast: 10,
    },
  },
];

export function AdjustmentPresets({
  current,
  onPreview,
  onCommit,
}: {
  current: HighDepthAdjustments;
  onPreview: (settings: HighDepthAdjustments) => void;
  onCommit: (name: string) => void;
}) {
  const [selected, setSelected] = useState('');
  const original = useRef<HighDepthAdjustments | null>(null);
  const choose = (name: string, settings: Partial<HighDepthAdjustments>) => {
    if (!original.current) original.current = { ...current };
    setSelected(name);
    onPreview({ ...createDefaultHighDepthAdjustments(), ...settings });
  };
  return (
    <section className="adjustment-presets" aria-label="Adjustment presets">
      <div className="adjustment-presets-heading">
        <strong>Presets</strong>
        <span>{selected ? `${selected} preview` : 'Live preview'}</span>
      </div>
      <div className="adjustment-preset-grid">
        {presets.map((preset) => (
          <button
            key={preset.name}
            className={selected === preset.name ? 'selected' : ''}
            aria-pressed={selected === preset.name}
            onClick={() => choose(preset.name, preset.settings)}
          >
            {preset.name}
          </button>
        ))}
      </div>
      {selected && (
        <div className="adjustment-preset-actions">
          <button
            onClick={() => {
              if (original.current) onPreview(original.current);
              original.current = null;
              setSelected('');
            }}
          >
            Cancel
          </button>
          <button
            className="primary"
            onClick={() => {
              onCommit(selected);
              original.current = null;
              setSelected('');
            }}
          >
            Apply
          </button>
        </div>
      )}
    </section>
  );
}
