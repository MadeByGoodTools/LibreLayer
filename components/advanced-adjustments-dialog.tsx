'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

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
};
const numberValue = (value: number | readonly number[]) =>
  Number(Array.isArray(value) ? value[0] : value);

export function AdvancedAdjustmentsDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (options: AdvancedAdjustmentOptions) => void;
}) {
  const [value, setValue] = useState(defaults);
  useEffect(() => {
    if (open) setValue(defaults);
  }, [open]);
  const slider = (
    label: string,
    key: keyof AdvancedAdjustmentOptions,
    min: number,
    max: number,
    unit = '',
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
        value={value[key] as number}
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
      <DialogContent className="sm:max-w-xl">
        <DialogTitle>Adjustments and blur</DialogTitle>
        <DialogDescription>
          Apply tonal, color, black-and-white, or photographic blur corrections
          to the active pixel layer. The result is one undoable edit.
        </DialogDescription>
        <div className="advanced-adjustments-grid">
          {slider('Brightness', 'brightness', -100, 100)}
          {slider('Contrast', 'contrast', -100, 100)}
          {slider('Hue', 'hue', -180, 180, '°')}
          {slider('Saturation', 'saturation', -100, 100)}
          {slider('Vibrance', 'vibrance', -100, 100)}
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
