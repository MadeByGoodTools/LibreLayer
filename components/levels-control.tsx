'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  levelPosition,
  levelValueFromPosition,
  type LevelControlKey,
} from '@/lib/levels-control';

const labels: Record<LevelControlKey, string> = {
  levelsBlack: 'Black point',
  levelsGamma: 'Midtone gamma',
  levelsWhite: 'White point',
};

export function LevelsControl({
  black,
  gamma,
  white,
  onChange,
  onCommit,
}: {
  black: number;
  gamma: number;
  white: number;
  onChange: (key: LevelControlKey, value: number) => void;
  onCommit: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<LevelControlKey | null>(null);
  const values: Record<LevelControlKey, number> = {
    levelsBlack: black,
    levelsGamma: gamma,
    levelsWhite: white,
  };
  const setFromPointer = (
    event: PointerEvent<HTMLButtonElement>,
    key: LevelControlKey,
  ) => {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds) return;
    onChange(
      key,
      levelValueFromPosition(
        key,
        (event.clientX - bounds.left) / bounds.width,
        black,
        white,
      ),
    );
  };
  const onKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    key: LevelControlKey,
  ) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const step = key === 'levelsGamma' ? 0.05 : 1;
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const position =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? 1
          : levelPosition(key, values[key] + direction * step);
    onChange(key, levelValueFromPosition(key, position, black, white));
    onCommit();
  };

  return (
    <section className="levels-control" aria-label="Input levels">
      <div className="levels-heading">
        <strong>Input levels</strong>
        <span>Drag black, midtone, and white points</span>
      </div>
      <div className="levels-track" ref={trackRef}>
        {(
          ['levelsBlack', 'levelsGamma', 'levelsWhite'] as LevelControlKey[]
        ).map((key) => (
          <button
            key={key}
            className={`${key} ${dragging === key ? 'dragging' : ''}`}
            style={{ left: `${levelPosition(key, values[key]) * 100}%` }}
            role="slider"
            aria-label={labels[key]}
            aria-valuemin={key === 'levelsGamma' ? 0.1 : 0}
            aria-valuemax={key === 'levelsGamma' ? 3 : 255}
            aria-valuenow={values[key]}
            onKeyDown={(event) => onKey(event, key)}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(key);
              setFromPointer(event, key);
            }}
            onPointerMove={(event) => {
              if (dragging === key) setFromPointer(event, key);
            }}
            onPointerUp={(event) => {
              event.currentTarget.releasePointerCapture(event.pointerId);
              setDragging(null);
              onCommit();
            }}
          />
        ))}
      </div>
      <div className="levels-values">
        <span>{black}</span>
        <span>{gamma.toFixed(2)}</span>
        <span>{white}</span>
      </div>
    </section>
  );
}
