'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { parseCubeLut } from '@/lib/cube-lut';
import { BUILT_IN_LUT_OPTIONS, BUILT_IN_LUTS } from '@/lib/builtin-luts';
import type { HighDepthAdjustments } from '@/lib/high-depth';

const sliderNumber = (value: number | readonly number[]) =>
  Array.isArray(value) ? Number(value[0]) : Number(value);

export function LutControl({
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const amount = adjustments.lutAmount ?? 100;
  const openFile = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error('LUT files must be 5 MB or smaller.');
      const lut = parseCubeLut(await file.text());
      onChange('lut3d', lut);
      if (amount !== 100) onChange('lutAmount', 100);
      onCommit(`Imported ${lut.title} LUT`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Could not read LUT.',
      );
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  return (
    <section className="lut-control" aria-label="Color lookup table">
      <div className="lut-heading">
        <strong>Color Lookup</strong>
        <span>3D .cube</span>
      </div>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept=".cube,text/plain"
        onChange={(event) => void openFile(event.target.files?.[0])}
      />
      <div className="lut-library-label">
        <span>Built-in looks</span>
        <div className="lut-library-grid">
          {BUILT_IN_LUT_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={
                adjustments.lut3d?.title === option.label ? 'active' : ''
              }
              aria-pressed={adjustments.lut3d?.title === option.label}
              onClick={() => {
                onChange('lut3d', BUILT_IN_LUTS[option.id]);
                if (amount !== 100) onChange('lutAmount', 100);
                onCommit(`Applied ${option.label} LUT`);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {adjustments.lut3d ? (
        <>
          <div className="lut-file-row">
            <span title={adjustments.lut3d.title}>
              {adjustments.lut3d.title} · {adjustments.lut3d.size}³
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onChange('lut3d', undefined);
                onCommit('Removed color lookup');
              }}
            >
              Remove
            </Button>
          </div>
          <label className="lut-amount-label">
            Amount <span>{amount}%</span>
          </label>
          <Slider
            aria-label="Color lookup amount"
            min={0}
            max={100}
            step={1}
            value={amount}
            onValueChange={(value) =>
              onChange('lutAmount', sliderNumber(value))
            }
            onValueCommitted={() => onCommit('Color lookup amount')}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            Replace LUT…
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          Load 3D LUT…
        </Button>
      )}
      {error && (
        <p className="lut-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
