'use client';

import { useRef, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import {
  computeColorStatistics,
  type GradeWheel,
  type HdrToning,
  type LiftGammaGain,
  type PerceptualVibrance,
  type ChannelMixer,
  type GradientMap,
  type HighDepthAdjustments,
  type HueSaturationRangeTarget,
  type ReplaceColor,
  type SelectiveColor,
  type SelectiveColorTarget,
  type ShadowsHighlights,
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
const defaultHdrToning: HdrToning = {
  method: 'reinhard',
  strength: 0,
  exposure: 0,
  gamma: 1,
  shadows: 0,
  highlights: 0,
};
const defaultPerceptualVibrance: PerceptualVibrance = {
  amount: 0,
  protectSkin: 60,
};
const defaultLiftGammaGain: LiftGammaGain = {
  lift: { color: '#808080', level: 0 },
  gamma: { color: '#808080', level: 0 },
  gain: { color: '#808080', level: 0 },
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
  sourceCanvas,
  onRequestHueTarget,
}: {
  adjustments: HighDepthAdjustments;
  onChange: (
    key: keyof HighDepthAdjustments,
    value: HighDepthAdjustments[keyof HighDepthAdjustments],
  ) => void;
  onCommit: (label: string) => void;
  sourceCanvas?: HTMLCanvasElement | null;
  onRequestHueTarget?: (target: HueSaturationRangeTarget) => void;
}) {
  const matchInput = useRef<HTMLInputElement>(null);
  const [matchError, setMatchError] = useState('');
  const [output, setOutput] = useState<'red' | 'green' | 'blue'>('red');
  const [selectiveTarget, setSelectiveTarget] =
    useState<SelectiveColorTarget>('reds');
  const [hueRange, setHueRange] = useState<HueSaturationRangeTarget>('reds');
  const mixer = adjustments.channelMixer ?? identityMixer,
    gradient = adjustments.gradientMap ?? defaultGradient,
    selective = adjustments.selectiveColor ?? emptySelectiveColor,
    selectiveRecipe = selective.colors[selectiveTarget] ?? emptyRecipe,
    shadowsHighlights =
      adjustments.shadowsHighlights ?? defaultShadowsHighlights,
    replaceColor = adjustments.replaceColor ?? defaultReplaceColor,
    hueRanges = adjustments.hueSaturationRanges ?? {},
    hueRangeRecipe = hueRanges[hueRange] ?? {
      hue: 0,
      saturation: 0,
      lightness: 0,
      center: {
        reds: 0,
        yellows: 60,
        greens: 120,
        cyans: 180,
        blues: 240,
        magentas: 300,
      }[hueRange],
      width: 30,
      falloff: 30,
    },
    hdrToning = adjustments.hdrToning ?? defaultHdrToning,
    perceptualVibrance =
      adjustments.perceptualVibrance ?? defaultPerceptualVibrance,
    liftGammaGain = adjustments.liftGammaGain ?? defaultLiftGammaGain,
    matchColor = adjustments.matchColor;
  const hueCenter = hueRangeRecipe.center ?? 0,
    hueSpread =
      (hueRangeRecipe.width ?? 30) / 2 + (hueRangeRecipe.falloff ?? 30),
    hueStart = hueCenter - hueSpread,
    hueEnd = hueCenter + hueSpread,
    hueSegments =
      hueStart < 0
        ? [
            { left: 0, width: hueEnd },
            { left: 360 + hueStart, width: -hueStart },
          ]
        : hueEnd > 360
          ? [
              { left: hueStart, width: 360 - hueStart },
              { left: 0, width: hueEnd - 360 },
            ]
          : [{ left: hueStart, width: hueEnd - hueStart }];
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
  const updateHueRange = (key: keyof typeof hueRangeRecipe, value: number) =>
    onChange('hueSaturationRanges', {
      ...hueRanges,
      [hueRange]: { ...hueRangeRecipe, [key]: value },
    });
  const updateHdrToning = (patch: Partial<HdrToning>) =>
    onChange('hdrToning', { ...hdrToning, ...patch });
  const updatePerceptualVibrance = (patch: Partial<PerceptualVibrance>) =>
    onChange('perceptualVibrance', { ...perceptualVibrance, ...patch });
  const updateWheel = (
    wheel: keyof LiftGammaGain,
    patch: Partial<GradeWheel>,
  ) =>
    onChange('liftGammaGain', {
      ...liftGammaGain,
      [wheel]: { ...liftGammaGain[wheel], ...patch },
    });
  const loadMatchReference = async (file?: File) => {
    if (!file || !sourceCanvas) return;
    setMatchError('');
    try {
      const bitmap = await createImageBitmap(file),
        scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height)),
        canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Reference image could not be analyzed.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const source = computeColorStatistics({
          width: canvas.width,
          height: canvas.height,
          data: context.getImageData(0, 0, canvas.width, canvas.height).data,
        }),
        targetContext = sourceCanvas.getContext('2d', {
          willReadFrequently: true,
        });
      if (!targetContext)
        throw new Error('Current image could not be analyzed.');
      const target = computeColorStatistics({
        width: sourceCanvas.width,
        height: sourceCanvas.height,
        data: targetContext.getImageData(
          0,
          0,
          sourceCanvas.width,
          sourceCanvas.height,
        ).data,
      });
      onChange('matchColor', {
        sourceName: file.name,
        source,
        target,
        amount: 100,
        luminance: 100,
        colorIntensity: 100,
        neutralize: false,
      });
      onCommit(`Matched color from ${file.name}`);
    } catch (reason) {
      setMatchError(
        reason instanceof Error ? reason.message : 'Could not match color.',
      );
    } finally {
      if (matchInput.current) matchInput.current.value = '';
    }
  };
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
        <summary>Hue / Saturation Ranges</summary>
        <div className="advanced-color-body">
          <label className="selective-color-target">
            Range
            <select
              value={hueRange}
              onChange={(event) =>
                setHueRange(event.target.value as HueSaturationRangeTarget)
              }
            >
              {selectiveTargets.slice(0, 6).map((target) => (
                <option key={target} value={target}>
                  {target[0].toUpperCase() + target.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="color-reset-button"
            onClick={() => onRequestHueTarget?.(hueRange)}
          >
            Target color on image
          </button>
          <div
            className="hue-range-preview"
            aria-label={`${hueRange} range centered at ${Math.round(hueRangeRecipe.center ?? 0)} degrees`}
          >
            {hueSegments.map((segment, index) => (
              <i
                key={index}
                style={{
                  left: `${segment.left / 3.6}%`,
                  width: `${segment.width / 3.6}%`,
                }}
              />
            ))}
          </div>
          {(
            [
              ['Center', 'center', 0, 359, '°'],
              ['Range width', 'width', 2, 180, '°'],
              ['Falloff', 'falloff', 1, 90, '°'],
            ] as const
          ).map(([label, key, min, max, suffix]) => (
            <div className="advanced-color-slider" key={key}>
              <label>
                {label}{' '}
                <span>
                  {Math.round(
                    hueRangeRecipe[key] ?? (key === 'center' ? 0 : 30),
                  )}
                  {suffix}
                </span>
              </label>
              <Slider
                aria-label={`${hueRange} ${label}`}
                min={min}
                max={max}
                step={1}
                value={hueRangeRecipe[key] ?? (key === 'center' ? 0 : 30)}
                onValueChange={(value) =>
                  updateHueRange(key, sliderNumber(value))
                }
                onValueCommitted={() =>
                  onCommit(`${hueRange} Hue and Saturation range`)
                }
              />
            </div>
          ))}
          {(
            [
              ['Hue', 'hue', -180, 180, '°'],
              ['Saturation', 'saturation', -100, 100, '%'],
              ['Lightness', 'lightness', -100, 100, '%'],
            ] as const
          ).map(([label, key, min, max, suffix]) => (
            <div className="advanced-color-slider" key={key}>
              <label>
                {label}{' '}
                <span>
                  {hueRangeRecipe[key]}
                  {suffix}
                </span>
              </label>
              <Slider
                aria-label={`${hueRange} ${label}`}
                min={min}
                max={max}
                step={1}
                value={hueRangeRecipe[key]}
                onValueChange={(value) =>
                  updateHueRange(key, sliderNumber(value))
                }
                onValueCommitted={() =>
                  onCommit(`${hueRange} Hue and Saturation adjustment`)
                }
              />
            </div>
          ))}
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
      <details>
        <summary>Match Color</summary>
        <div className="advanced-color-body">
          <input
            ref={matchInput}
            className="sr-only"
            type="file"
            accept="image/*"
            onChange={(event) =>
              void loadMatchReference(event.target.files?.[0])
            }
          />
          <button
            className="color-reset-button"
            disabled={!sourceCanvas}
            onClick={() => matchInput.current?.click()}
          >
            {matchColor
              ? `Reference: ${matchColor.sourceName}`
              : 'Choose reference image…'}
          </button>
          {matchColor && (
            <>
              {(
                [
                  ['Amount', 'amount', 0, 100],
                  ['Luminance', 'luminance', 0, 200],
                  ['Color intensity', 'colorIntensity', 0, 200],
                ] as const
              ).map(([label, key, min, max]) => (
                <div className="advanced-color-slider" key={key}>
                  <label>
                    {label} <span>{matchColor[key]}%</span>
                  </label>
                  <Slider
                    aria-label={`Match Color ${label}`}
                    min={min}
                    max={max}
                    step={1}
                    value={matchColor[key]}
                    onValueChange={(value) =>
                      onChange('matchColor', {
                        ...matchColor,
                        [key]: sliderNumber(value),
                      })
                    }
                    onValueCommitted={() => onCommit(`Match Color ${label}`)}
                  />
                </div>
              ))}
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={matchColor.neutralize}
                  onChange={(event) => {
                    onChange('matchColor', {
                      ...matchColor,
                      neutralize: event.target.checked,
                    });
                    onCommit('Match Color neutralize');
                  }}
                />{' '}
                Neutralize color cast
              </label>
              <button
                className="color-reset-button"
                onClick={() => {
                  onChange('matchColor', undefined);
                  onCommit('Removed Match Color');
                }}
              >
                Remove match
              </button>
            </>
          )}
          {matchError && (
            <p className="lut-error" role="alert">
              {matchError}
            </p>
          )}
        </div>
      </details>
      <details>
        <summary>Lift / Gamma / Gain</summary>
        <div className="color-wheel-grid">
          {(['lift', 'gamma', 'gain'] as const).map((wheel) => (
            <div className="grade-wheel" key={wheel}>
              <label>
                <span>{wheel[0].toUpperCase() + wheel.slice(1)}</span>
                <input
                  aria-label={`${wheel} color wheel`}
                  type="color"
                  value={liftGammaGain[wheel].color}
                  onChange={(event) =>
                    updateWheel(wheel, { color: event.target.value })
                  }
                  onBlur={() => onCommit(`${wheel} color wheel`)}
                />
              </label>
              <span>{liftGammaGain[wheel].level}</span>
              <Slider
                aria-label={`${wheel} level`}
                min={-100}
                max={100}
                step={1}
                value={liftGammaGain[wheel].level}
                onValueChange={(value) =>
                  updateWheel(wheel, { level: sliderNumber(value) })
                }
                onValueCommitted={() => onCommit(`${wheel} level`)}
              />
            </div>
          ))}
        </div>
      </details>
      <details>
        <summary>HDR Toning</summary>
        <div className="advanced-color-body">
          <label className="selective-color-target">
            Method
            <select
              value={hdrToning.method}
              onChange={(event) => {
                updateHdrToning({
                  method: event.target.value as HdrToning['method'],
                });
                onCommit('HDR toning method');
              }}
            >
              <option value="reinhard">Reinhard</option>
              <option value="filmic">Filmic</option>
            </select>
          </label>
          {(
            [
              ['Strength', 'strength', 0, 100, 1, '%'],
              ['Exposure', 'exposure', -5, 5, 0.1, ' EV'],
              ['Gamma', 'gamma', 0.1, 3, 0.05, ''],
              ['Shadows', 'shadows', -100, 100, 1, '%'],
              ['Highlights', 'highlights', -100, 100, 1, '%'],
            ] as const
          ).map(([label, key, min, max, step, suffix]) => (
            <div className="advanced-color-slider" key={key}>
              <label>
                {label}{' '}
                <span>
                  {hdrToning[key]}
                  {suffix}
                </span>
              </label>
              <Slider
                aria-label={`HDR Toning ${label}`}
                min={min}
                max={max}
                step={step}
                value={hdrToning[key]}
                onValueChange={(value) =>
                  updateHdrToning({ [key]: sliderNumber(value) })
                }
                onValueCommitted={() => onCommit(`HDR Toning ${label}`)}
              />
            </div>
          ))}
        </div>
      </details>
      <details>
        <summary>Perceptual Vibrance</summary>
        <div className="advanced-color-body">
          {(
            [
              ['Amount', 'amount', -100, 100],
              ['Protect skin tones', 'protectSkin', 0, 100],
            ] as const
          ).map(([label, key, min, max]) => (
            <div className="advanced-color-slider" key={key}>
              <label>
                {label} <span>{perceptualVibrance[key]}%</span>
              </label>
              <Slider
                aria-label={`Perceptual Vibrance ${label}`}
                min={min}
                max={max}
                step={1}
                value={perceptualVibrance[key]}
                onValueChange={(value) =>
                  updatePerceptualVibrance({ [key]: sliderNumber(value) })
                }
                onValueCommitted={() =>
                  onCommit(`Perceptual Vibrance ${label}`)
                }
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
