'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { toneCurveValue, type HighDepthAdjustments } from '@/lib/high-depth';

const clamp = (value: number) => Math.max(-100, Math.min(100, value));
const pointValue = (input: number, shadows: number, highlights: number) =>
  Math.max(0, Math.min(1, toneCurveValue(input, shadows, highlights)));

export function ToneCurve({
  adjustments,
  onChange,
  onCommit,
}: {
  adjustments: HighDepthAdjustments;
  onChange: (key: keyof HighDepthAdjustments, value: number) => void;
  onCommit: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'shadows' | 'highlights' | null>(
    null,
  );
  const [channel, setChannel] = useState<'rgb' | 'red' | 'green' | 'blue'>(
    'rgb',
  );
  const keys = {
    rgb: ['curveShadows', 'curveHighlights'],
    red: ['redCurveShadows', 'redCurveHighlights'],
    green: ['greenCurveShadows', 'greenCurveHighlights'],
    blue: ['blueCurveShadows', 'blueCurveHighlights'],
  } as const;
  const [shadowKey, highlightKey] = keys[channel];
  const shadows = Number(adjustments[shadowKey] ?? 0);
  const highlights = Number(adjustments[highlightKey] ?? 0);
  const curve = Array.from({ length: 65 }, (_, index) => {
    const x = index / 64;
    return `${index ? 'L' : 'M'} ${x * 256} ${(1 - pointValue(x, shadows, highlights)) * 160}`;
  }).join(' ');

  const setFromPointer = (
    event: PointerEvent<SVGCircleElement>,
    point: 'shadows' | 'highlights',
  ) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const y = Math.max(
      0,
      Math.min(1, (event.clientY - bounds.top) / bounds.height),
    );
    const input = point === 'shadows' ? 0.25 : 0.75;
    const other = point === 'shadows' ? highlights : shadows;
    const base = toneCurveValue(
      input,
      point === 'shadows' ? 0 : other,
      point === 'highlights' ? 0 : other,
    );
    const weight = input * (1 - input);
    onChange(
      point === 'shadows' ? shadowKey : highlightKey,
      clamp(Math.round(((1 - y - base) / weight) * 100)),
    );
  };
  const onKey = (
    event: KeyboardEvent<SVGCircleElement>,
    point: 'shadows' | 'highlights',
  ) => {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = point === 'shadows' ? shadows : highlights;
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? event.shiftKey
            ? -100
            : 100
          : clamp(
              current +
                (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 10 : 1),
            );
    onChange(point === 'shadows' ? shadowKey : highlightKey, next);
    onCommit();
  };
  const handle = (point: 'shadows' | 'highlights', input: number) => {
    const value = point === 'shadows' ? shadows : highlights;
    const output = pointValue(input, shadows, highlights);
    return (
      <circle
        className={dragging === point ? 'dragging' : ''}
        cx={input * 256}
        cy={(1 - output) * 160}
        r="6"
        role="slider"
        tabIndex={0}
        aria-label={`${channel === 'rgb' ? 'RGB' : channel} ${
          point === 'shadows' ? 'shadow' : 'highlight'
        } curve point`}
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={value}
        onKeyDown={(event) => onKey(event, point)}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(point);
          setFromPointer(event, point);
        }}
        onPointerMove={(event) => {
          if (dragging === point) setFromPointer(event, point);
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          setDragging(null);
          onCommit();
        }}
      />
    );
  };

  return (
    <div className="tone-curve-editor">
      <div className="tone-curve-heading">
        <strong>Tone curve</strong>
        <span>Drag points vertically</span>
      </div>
      <div
        className="tone-curve-channels"
        role="group"
        aria-label="Curve channel"
      >
        {(['rgb', 'red', 'green', 'blue'] as const).map((item) => (
          <button
            key={item}
            className={channel === item ? `active ${item}` : item}
            aria-pressed={channel === item}
            onClick={() => setChannel(item)}
          >
            {item === 'rgb' ? 'RGB' : item[0].toUpperCase()}
          </button>
        ))}
      </div>
      <svg
        ref={svgRef}
        className={`curve-${channel}`}
        viewBox="0 0 256 160"
        aria-label={`Editable ${channel === 'rgb' ? 'RGB' : channel} tone curve`}
      >
        <path
          className="tone-curve-grid"
          d="M 64 0 V 160 M 128 0 V 160 M 192 0 V 160 M 0 40 H 256 M 0 80 H 256 M 0 120 H 256"
        />
        <path className="tone-curve-baseline" d="M 0 160 L 256 0" />
        <path className="tone-curve-line" d={curve} />
        {handle('shadows', 0.25)}
        {handle('highlights', 0.75)}
      </svg>
      <div className="tone-curve-values">
        <span>
          {channel === 'rgb' ? 'RGB' : channel[0].toUpperCase()} shadows{' '}
          {shadows > 0 ? '+' : ''}
          {shadows}
        </span>
        <span>
          Highlights {highlights > 0 ? '+' : ''}
          {highlights}
        </span>
      </div>
    </div>
  );
}
