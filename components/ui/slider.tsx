'use client';

import { useRef } from 'react';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { cn } from '@/lib/utils';
import {
  clampPrecisionValue,
  replacePrecisionValue,
  scrubPrecisionValue,
} from '@/lib/precision-control';

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  largeStep = 10,
  disabled,
  onValueChange,
  onValueCommitted,
  ...props
}: SliderPrimitive.Root.Props) {
  const _values =
      value !== undefined
        ? Array.isArray(value)
          ? value
          : [value]
        : defaultValue !== undefined
          ? Array.isArray(defaultValue)
            ? defaultValue
            : [defaultValue]
          : [min],
    resetValues = useRef([..._values]),
    scrub = useRef<{
      pointerId: number;
      startX: number;
      startValue: number;
      index: number;
      moved: boolean;
    } | null>(null),
    arrayValue = Array.isArray(value ?? defaultValue),
    output = (next: number, index: number) => {
      if (!arrayValue) return next;
      return replacePrecisionValue(_values, index, next);
    },
    change = (next: number, index: number) =>
      (
        onValueChange as
          | ((next: number | readonly number[]) => void)
          | undefined
      )?.(output(clampPrecisionValue(next, min, max, step), index)),
    commit = (next: number, index: number) =>
      (
        onValueCommitted as
          | ((next: number | readonly number[]) => void)
          | undefined
      )?.(output(clampPrecisionValue(next, min, max, step), index)),
    reset = () => {
      const next = arrayValue
        ? [...resetValues.current]
        : (resetValues.current[0] ?? min);
      (
        onValueChange as
          | ((next: number | readonly number[]) => void)
          | undefined
      )?.(next);
      (
        onValueCommitted as
          | ((next: number | readonly number[]) => void)
          | undefined
      )?.(next);
    };

  return (
    <div
      className={cn('precision-slider', className)}
      data-disabled={disabled || undefined}
    >
      <SliderPrimitive.Root
        className="precision-slider-control"
        data-slot="slider"
        defaultValue={defaultValue}
        value={value}
        min={min}
        max={max}
        step={step}
        largeStep={largeStep}
        disabled={disabled}
        thumbAlignment="edge"
        onValueChange={onValueChange}
        onValueCommitted={onValueCommitted}
        {...props}
      >
        <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50">
          <SliderPrimitive.Track
            data-slot="slider-track"
            className="bg-muted relative h-1 w-full grow overflow-hidden rounded-full select-none"
          >
            <SliderPrimitive.Indicator
              data-slot="slider-range"
              className="bg-primary h-full select-none"
            />
          </SliderPrimitive.Track>
          {Array.from({ length: _values.length }, (_, index) => (
            <SliderPrimitive.Thumb
              data-slot="slider-thumb"
              key={index}
              className="border-ring ring-ring/50 relative block size-3 shrink-0 rounded-full border bg-white transition-[color,box-shadow] after:absolute after:-inset-2 select-none hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
            />
          ))}
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
      {_values.map((current, index) => (
        <input
          key={index}
          className="precision-slider-value"
          aria-label={`${String(props['aria-label'] ?? 'Slider')} numeric value${_values.length > 1 ? ` ${index + 1}` : ''}`}
          title="Type a value · drag to scrub · double-click to reset · Shift coarse · Option/Alt fine"
          type="number"
          min={min}
          max={max}
          step={step}
          value={current}
          disabled={disabled}
          onChange={(event) => change(+event.target.value, index)}
          onBlur={(event) => commit(+event.target.value, index)}
          onKeyDown={(event) => {
            if (
              event.altKey &&
              (event.key === 'ArrowUp' || event.key === 'ArrowDown')
            ) {
              event.preventDefault();
              const direction = event.key === 'ArrowUp' ? 1 : -1,
                next = current + direction * step * 0.1;
              change(next, index);
              commit(next, index);
            }
          }}
          onDoubleClick={() => {
            const next = resetValues.current[index] ?? min;
            change(next, index);
            commit(next, index);
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            scrub.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startValue: current,
              index,
              moved: false,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const state = scrub.current;
            if (!state || state.pointerId !== event.pointerId) return;
            const distance = event.clientX - state.startX;
            if (Math.abs(distance) < 2 && !state.moved) return;
            state.moved = true;
            change(
              scrubPrecisionValue(
                state.startValue,
                distance,
                step,
                min,
                max,
                event.shiftKey,
                event.altKey,
              ),
              state.index,
            );
          }}
          onPointerUp={(event) => {
            const state = scrub.current;
            if (!state || state.pointerId !== event.pointerId) return;
            if (state.moved) commit(_values[state.index], state.index);
            scrub.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => {
            scrub.current = null;
          }}
        />
      ))}
      <button
        className="precision-slider-reset"
        type="button"
        disabled={disabled}
        aria-label={`${String(props['aria-label'] ?? 'Slider')} reset`}
        title="Reset this control"
        onClick={reset}
      >
        ↺
      </button>
    </div>
  );
}

export { Slider };
