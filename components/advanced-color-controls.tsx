'use client';

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import type {
  ChannelMixer,
  GradientMap,
  HighDepthAdjustments,
  ReplaceColor,
  SelectiveColor,
  SelectiveColorTarget,
  ShadowsHighlights,
} from '@/lib/high-depth';

const identityMixer: ChannelMixer = {
  red: { red: 100, green: 0, blue: 0, constant: 0 },
  green: { red: 0, green: 100, blue: 0, constant: 0 },
  blue: { red: 0, green: 0, blue: 100, constant: 0 },
};
const defaultGradient: GradientMap = {
  shadows: '#000000',
  highlights: '#ffffff',
  amount: 0,
};
const emptySelectiveColor: SelectiveColor = { mode: 'relative', colors: {} };
const defaultShadowsHighlights: ShadowsHighlights = {
  shadows: 0,
  highlights: 0,
  shadowTone: 50,
  highlightTone: 50,
  color: 0,
  midtone: 0,
};
const defaultReplaceColor: ReplaceColor = {
  target: '#ff0000',
  fuzziness: 40,
  hue: 0,
  saturation: 0,
  lightness: 0,
  amount: 0,
};
const emptyRecipe = { cyan: 0, magenta: 0, yellow: 0, black: 0 };
const selectiveTargets: SelectiveColorTarget[] = [
  'reds',
  'yellows',
  'greens',
  'cyans',
  'blues',
  'magentas',
  'whites',
  'neutrals',
  'blacks',
];
const sliderNumber = (value: number | readonly number[]) =>
  Array.isArray(value) ? Number(value[0]) : Number(value);

export function AdvancedColorControls({
  adjustments,
  onChange,
  onCommit,
}: {
  adjustments: HighDepthAdjustments;
  onChange: (
    key: keyof HighDepthAdjustments,
    value: HighDepthAdjustments[keyof HighDepthAdjustments],
  ) => void;
  onCommit: (label: string) => void;
}) {
  const [output, setOutput] = useState<'red' | 'green' | 'blue'>('red');
  const [selectiveTarget, setSelectiveTarget] =
    useState<SelectiveColorTarget>('reds');
  const mixer = adjustments.channelMixer ?? identityMixer,
    gradient = adjustments.gradientMap ?? defaultGradient,
    selective = adjustments.selectiveColor ?? emptySelectiveColor,
    selectiveRecipe = selective.colors[selectiveTarget] ?? emptyRecipe,
    shadowsHighlights =
      adjustments.shadowsHighlights ?? defaultShadowsHighlights,
    replaceColor = adjustments.replaceColor ?? defaultReplaceColor;
  const updateMixer = (input: keyof ChannelMixer['red'], value: number) =>
    onChange('channelMixer', {
      ...mixer,
      [output]: { ...mixer[output], [input]: value },
    });
  const updateGradient = (patch: Partial<GradientMap>) =>
    onChange('gradientMap', { ...gradient, ...patch });
  const updateSelective = (channel: keyof typeof emptyRecipe, value: number) =>
    onChange('selectiveColor', {
      ...selective,
      colors: {
        ...selective.colors,
        [selectiveTarget]: { ...selectiveRecipe, [channel]: value },
      },
    });
  const updateShadowsHighlights = (
    key: keyof ShadowsHighlights,
    value: number,
  ) => onChange('shadowsHighlights', { ...shadowsHighlights, [key]: value });
  const updateReplaceColor = (patch: Partial<ReplaceColor>) =>
    onChange('replaceColor', { ...replaceColor, ...patch });
  return (
    <div className="advanced-color-controls">
      <details>
        <summary>Channel Mixer</summary>
        <div className="advanced-color-body">
          <div
            className="channel-mixer-tabs"
            role="group"
            aria-label="Channel Mixer output"
          >
            {(['red', 'green', 'blue'] as const).map((channel) => (
              <button
                key={channel}
                className={output === channel ? `active ${channel}` : channel}
                aria-pressed={output === channel}
                onClick={() => setOutput(channel)}
              >
                {channel[0].toUpperCase()}
              </button>
            ))}
          </div>
          {(['red', 'green', 'blue', 'constant'] as const).map((input) => (
            <div className="advanced-color-slider" key={input}>
              <label>
                {input[0].toUpperCase() + input.slice(1)}{' '}
                <span>{mixer[output][input]}%</span>
              </label>
              <Slider
                aria-label={`${output} output ${input}`}
                min={-200}
                max={200}
                step={1}
                value={mixer[output][input]}
                onValueChange={(value) =>
                  updateMixer(input, sliderNumber(value))
                }
                onValueCommitted={() => onCommit('Channel Mixer adjustment')}
              />
            </div>
          ))}
          <button
            className="color-reset-button"
            onClick={() => {
              onChange('channelMixer', identityMixer);
              onCommit('Reset Channel Mixer');
            }}
          >
            Reset mixer
          </button>
        </div>
      </details>
      <details>
        <summary>Gradient Map</summary>
        <div className="advanced-color-body">
          <div
            className="gradient-map-colors"
            style={{
              background: `linear-gradient(90deg, ${gradient.shadows}, ${gradient.highlights})`,
            }}
          >
            <label>
              Shadows
              <input
                aria-label="Gradient Map shadow color"
                type="color"
                value={gradient.shadows}
                onChange={(event) =>
                  updateGradient({ shadows: event.target.value })
                }
                onBlur={() => onCommit('Gradient Map shadow color')}
              />
            </label>
            <label>
              Highlights
              <input
                aria-label="Gradient Map highlight color"
                type="color"
                value={gradient.highlights}
                onChange={(event) =>
                  updateGradient({ highlights: event.target.value })
                }
                onBlur={() => onCommit('Gradient Map highlight color')}
              />
            </label>
          </div>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={gradient.reverse ?? false}
              onChange={(event) => {
                updateGradient({ reverse: event.target.checked });
                onCommit('Reverse Gradient Map');
              }}
            />{' '}
            Reverse
          </label>
          <div className="advanced-color-slider">
            <label>
              Amount <span>{gradient.amount}%</span>
            </label>
            <Slider
              aria-label="Gradient Map amount"
              min={0}
              max={100}
              step={1}
              value={gradient.amount}
              onValueChange={(value) =>
                updateGradient({ amount: sliderNumber(value) })
              }
              onValueCommitted={() => onCommit('Gradient Map amount')}
            />
          </div>
        </div>
      </details>
      <details>
        <summary>Selective Color</summary>
        <div className="advanced-color-body">
          <label className="selective-color-target">
            Colors
            <select
              value={selectiveTarget}
              onChange={(event) =>
                setSelectiveTarget(event.target.value as SelectiveColorTarget)
              }
            >
              {selectiveTargets.map((target) => (
                <option key={target} value={target}>
                  {target[0].toUpperCase() + target.slice(1)}
                </option>
              ))}
            </select>
          </label>
          {(['cyan', 'magenta', 'yellow', 'black'] as const).map((channel) => (
            <div className="advanced-color-slider" key={channel}>
              <label>
                {channel[0].toUpperCase() + channel.slice(1)}{' '}
                <span>{selectiveRecipe[channel]}%</span>
              </label>
              <Slider
                aria-label={`${selectiveTarget} ${channel}`}
                min={-100}
                max={100}
                step={1}
                value={selectiveRecipe[channel]}
                onValueChange={(value) =>
                  updateSelective(channel, sliderNumber(value))
                }
                onValueCommitted={() => onCommit('Selective Color adjustment')}
              />
            </div>
          ))}
          <div
            className="selective-color-mode"
            role="group"
            aria-label="Selective Color method"
          >
            {(['relative', 'absolute'] as const).map((mode) => (
              <button
                key={mode}
                className={selective.mode === mode ? 'active' : ''}
                aria-pressed={selective.mode === mode}
                onClick={() => {
                  onChange('selectiveColor', { ...selective, mode });
                  onCommit(`Selective Color ${mode} method`);
                }}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </details>
      <details>
        <summary>Shadows / Highlights</summary>
        <div className="advanced-color-body">
          {(
            [
              ['Shadows', 'shadows', 0, 100],
              ['Shadow tone', 'shadowTone', 5, 95],
              ['Highlights', 'highlights', 0, 100],
              ['Highlight tone', 'highlightTone', 5, 95],
              ['Color correction', 'color', -100, 100],
              ['Midtone contrast', 'midtone', -100, 100],
            ] as const
          ).map(([label, key, min, max]) => (
            <div className="advanced-color-slider" key={key}>
              <label>
                {label} <span>{shadowsHighlights[key]}%</span>
              </label>
              <Slider
                aria-label={label}
                min={min}
                max={max}
                step={1}
                value={shadowsHighlights[key]}
                onValueChange={(value) =>
                  updateShadowsHighlights(key, sliderNumber(value))
                }
                onValueCommitted={() =>
                  onCommit('Shadows and Highlights adjustment')
                }
              />
            </div>
          ))}
        </div>
      </details>
      <details>
        <summary>Replace Color</summary>
        <div className="advanced-color-body">
          <label className="replace-color-target">
            Target color
            <input
              aria-label="Replace Color target"
              type="color"
              value={replaceColor.target}
              onChange={(event) =>
                updateReplaceColor({ target: event.target.value })
              }
              onBlur={() => onCommit('Replace Color target')}
            />
          </label>
          {(
            [
              ['Fuzziness', 'fuzziness', 0, 100, '%'],
              ['Hue', 'hue', -180, 180, '°'],
              ['Saturation', 'saturation', -100, 100, '%'],
              ['Lightness', 'lightness', -100, 100, '%'],
              ['Amount', 'amount', 0, 100, '%'],
            ] as const
          ).map(([label, key, min, max, suffix]) => (
            <div className="advanced-color-slider" key={key}>
              <label>
                {label}{' '}
                <span>
                  {replaceColor[key]}
                  {suffix}
                </span>
              </label>
              <Slider
                aria-label={`Replace Color ${label}`}
                min={min}
                max={max}
                step={1}
                value={replaceColor[key]}
                onValueChange={(value) =>
                  updateReplaceColor({ [key]: sliderNumber(value) })
                }
                onValueCommitted={() => onCommit(`Replace Color ${label}`)}
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
