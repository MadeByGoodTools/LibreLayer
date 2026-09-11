'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { adjustHighDepth, precisionToEncodedRgba } from '@/lib/high-depth';

export type AdvancedAdjustmentOptions = {
  brightness: number;
  contrast: number;
  hue: number;
  saturation: number;
  vibrance: number;
  blackWhite: boolean;
  redMix: number;
  greenMix: number;
  blueMix: number;
  blurMode: 'none' | 'gaussian' | 'motion' | 'radial';
  blurRadius: number;
  blurAngle: number;
  levelsBlack?: number;
  levelsWhite?: number;
  levelsGamma?: number;
  curveShadows?: number;
  curveHighlights?: number;
  exposure?: number;
  exposureGamma?: number;
  balanceCyanRed?: number;
  balanceMagentaGreen?: number;
  balanceYellowBlue?: number;
  photoFilter?: string;
  photoFilterDensity?: number;
};

const defaults: AdvancedAdjustmentOptions = {
  brightness: 0,
  contrast: 0,
  hue: 0,
  saturation: 0,
  vibrance: 0,
  blackWhite: false,
  redMix: 30,
  greenMix: 59,
  blueMix: 11,
  blurMode: 'none',
  blurRadius: 0,
  blurAngle: 0,
  levelsBlack: 0,
  levelsWhite: 255,
  levelsGamma: 1,
  curveShadows: 0,
  curveHighlights: 0,
  exposure: 0,
  exposureGamma: 1,
  balanceCyanRed: 0,
  balanceMagentaGreen: 0,
  balanceYellowBlue: 0,
  photoFilter: '#ec8a32',
  photoFilterDensity: 0,
};
const numberValue = (value: number | readonly number[]) =>
  Number(Array.isArray(value) ? value[0] : value);

export function AdvancedAdjustmentsDialog({
  open,
  sourceCanvas,
  onClose,
  onApply,
}: {
  open: boolean;
  sourceCanvas?: HTMLCanvasElement | null;
  onClose: () => void;
  onApply: (options: AdvancedAdjustmentOptions) => void;
}) {
  const [value, setValue] = useState(defaults);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const previewRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (open) {
      setValue(defaults);
      setPreviewEnabled(true);
    }
  }, [open]);
  useEffect(() => {
    if (!open || !sourceCanvas || !previewRef.current) return;
    const frame = requestAnimationFrame(() => {
      const preview = previewRef.current;
      if (!preview) return;
      const scale = Math.min(
        1,
        560 / sourceCanvas.width,
        250 / sourceCanvas.height,
      );
      preview.width = Math.max(1, Math.round(sourceCanvas.width * scale));
      preview.height = Math.max(1, Math.round(sourceCanvas.height * scale));
      const context = preview.getContext('2d')!;
      context.clearRect(0, 0, preview.width, preview.height);
      context.drawImage(sourceCanvas, 0, 0, preview.width, preview.height);
      if (!previewEnabled) return;
      const pixels = context.getImageData(0, 0, preview.width, preview.height);
      const adjusted = adjustHighDepth(
        { width: preview.width, height: preview.height, data: pixels.data },
        value,
      );
      pixels.data.set(
        precisionToEncodedRgba({
          width: preview.width,
          height: preview.height,
          data: adjusted,
        }),
      );
      context.putImageData(pixels, 0, 0);
      if (value.blurMode !== 'none' && value.blurRadius > 0) {
        const copy = document.createElement('canvas');
        copy.width = preview.width;
        copy.height = preview.height;
        copy.getContext('2d')!.drawImage(preview, 0, 0);
        context.clearRect(0, 0, preview.width, preview.height);
        if (value.blurMode === 'gaussian') {
          context.filter = `blur(${Math.max(0.5, value.blurRadius * scale)}px)`;
          context.drawImage(copy, 0, 0);
          context.filter = 'none';
        } else {
          const samples = 13;
          const angle = (value.blurAngle * Math.PI) / 180;
          context.globalAlpha = 1 / samples;
          for (let index = 0; index < samples; index++) {
            const amount = index / (samples - 1) - 0.5;
            context.save();
            if (value.blurMode === 'motion') {
              context.translate(
                Math.cos(angle) * value.blurRadius * scale * amount * 2,
                Math.sin(angle) * value.blurRadius * scale * amount * 2,
              );
            } else {
              context.translate(preview.width / 2, preview.height / 2);
              context.rotate((amount * value.blurRadius * Math.PI) / 900);
              context.translate(-preview.width / 2, -preview.height / 2);
            }
            context.drawImage(copy, 0, 0);
            context.restore();
          }
          context.globalAlpha = 1;
        }
        copy.width = copy.height = 1;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open, previewEnabled, sourceCanvas, value]);
  const slider = (
    label: string,
    key: keyof AdvancedAdjustmentOptions,
    min: number,
    max: number,
    unit = '',
    step = 1,
  ) => (
    <label className="advanced-adjustment-row">
      <span>
        {label}
        <strong>
          {String(value[key])}
          {unit}
        </strong>
      </span>
      <Slider
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={(value[key] as number) ?? 0}
        onValueChange={(next) =>
          setValue((current) => ({ ...current, [key]: numberValue(next) }))
        }
      />
    </label>
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="advanced-adjustments-dialog">
        <DialogTitle>Adjustments and blur</DialogTitle>
        <DialogDescription>
          Apply tonal, color, black-and-white, or photographic blur corrections
          to the active pixel layer. Color corrections run together in one tiled
          floating-point pass, then write one undoable result.
        </DialogDescription>
        <div className="advanced-preview-shell">
          {sourceCanvas ? (
            <canvas
              ref={previewRef}
              role="img"
              aria-label="Live active-layer adjustment preview"
            />
          ) : (
            <p>Select a pixel layer to preview these corrections.</p>
          )}
          <label className="inline-check advanced-preview-toggle">
            <input
              type="checkbox"
              checked={previewEnabled}
              onChange={(event) => setPreviewEnabled(event.target.checked)}
            />
            Preview
          </label>
        </div>
        <div className="advanced-adjustments-grid">
          {slider('Brightness', 'brightness', -100, 100)}
          {slider('Contrast', 'contrast', -100, 100)}
          {slider('Hue', 'hue', -180, 180, '°')}
          {slider('Saturation', 'saturation', -100, 100)}
          {slider('Vibrance', 'vibrance', -100, 100)}
          <details>
            <summary>Levels</summary>
            <div className="channel-mix-grid">
              {slider('Black point', 'levelsBlack', 0, 254)}
              {slider('White point', 'levelsWhite', 1, 255)}
              {slider('Midtone gamma', 'levelsGamma', 0.1, 3, '', 0.05)}
            </div>
          </details>
          <details>
            <summary>Curves</summary>
            <div className="channel-mix-grid">
              {slider('Shadow curve', 'curveShadows', -100, 100)}
              {slider('Highlight curve', 'curveHighlights', -100, 100)}
            </div>
          </details>
          <details>
            <summary>Exposure</summary>
            <div className="channel-mix-grid">
              {slider('Exposure', 'exposure', -5, 5, ' EV', 0.1)}
              {slider('Gamma correction', 'exposureGamma', 0.1, 3, '', 0.05)}
            </div>
          </details>
          <details>
            <summary>Color Balance</summary>
            <div className="channel-mix-grid">
              {slider('Cyan / Red', 'balanceCyanRed', -100, 100)}
              {slider('Magenta / Green', 'balanceMagentaGreen', -100, 100)}
              {slider('Yellow / Blue', 'balanceYellowBlue', -100, 100)}
            </div>
          </details>
          <details>
            <summary>Photo Filter</summary>
            <div className="photo-filter-row">
              <label>
                Filter color
                <input
                  aria-label="Photo filter color"
                  type="color"
                  value={value.photoFilter}
                  onChange={(event) =>
                    setValue((current) => ({
                      ...current,
                      photoFilter: event.target.value,
                    }))
                  }
                />
              </label>
              {slider('Filter density', 'photoFilterDensity', 0, 100, '%')}
            </div>
          </details>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={value.blackWhite}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  blackWhite: event.target.checked,
                }))
              }
            />
            Black & White channel mix
          </label>
          {value.blackWhite && (
            <div className="channel-mix-grid">
              {slider('Red mix', 'redMix', -200, 200, '%')}
              {slider('Green mix', 'greenMix', -200, 200, '%')}
              {slider('Blue mix', 'blueMix', -200, 200, '%')}
            </div>
          )}
          <label>
            Blur
            <select
              aria-label="Blur type"
              value={value.blurMode}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  blurMode: event.target
                    .value as AdvancedAdjustmentOptions['blurMode'],
                }))
              }
            >
              <option value="none">None</option>
              <option value="gaussian">Gaussian</option>
              <option value="motion">Motion</option>
              <option value="radial">Radial spin</option>
            </select>
          </label>
          {value.blurMode !== 'none' &&
            slider('Blur radius', 'blurRadius', 1, 50, 'px')}
          {value.blurMode === 'motion' &&
            slider('Motion angle', 'blurAngle', -180, 180, '°')}
        </div>
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setValue(defaults)}>
            Reset
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onApply(value);
              onClose();
            }}
          >
            Apply adjustments
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
