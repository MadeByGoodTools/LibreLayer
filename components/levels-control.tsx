'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  levelPosition,
  levelValueFromPosition,
  type LevelControlKey,
} from '@/lib/levels-control';
import type {
  ChannelLevel,
  CurveChannel,
  HighDepthAdjustments,
} from '@/lib/high-depth';

type PickerKind = 'black' | 'gray' | 'white';
const defaults: ChannelLevel = {
  black: 0,
  gamma: 1,
  white: 255,
  outputBlack: 0,
  outputWhite: 255,
};
const labels: Record<LevelControlKey, string> = {
  levelsBlack: 'Black point',
  levelsGamma: 'Midtone gamma',
  levelsWhite: 'White point',
};

export function LevelsControl({
  adjustments,
  onChange,
  onCommit,
  onRequestEyedropper,
}: {
  adjustments: HighDepthAdjustments;
  onChange: (
    key: keyof HighDepthAdjustments,
    value: HighDepthAdjustments[keyof HighDepthAdjustments],
  ) => void;
  onCommit: () => void;
  onRequestEyedropper?: (kind: PickerKind, channel: CurveChannel) => void;
}) {
  const inputRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [channel, setChannel] = useState<CurveChannel>('rgb');
  const values =
    channel === 'rgb'
      ? {
          black: adjustments.levelsBlack ?? 0,
          gamma: adjustments.levelsGamma ?? 1,
          white: adjustments.levelsWhite ?? 255,
          outputBlack: adjustments.outputBlack ?? 0,
          outputWhite: adjustments.outputWhite ?? 255,
        }
      : { ...defaults, ...adjustments.channelLevels?.[channel] };

  const setValue = (key: keyof ChannelLevel, value: number) => {
    if (channel === 'rgb') {
      const keys = {
        black: 'levelsBlack',
        gamma: 'levelsGamma',
        white: 'levelsWhite',
        outputBlack: 'outputBlack',
        outputWhite: 'outputWhite',
      } as const;
      onChange(keys[key], value);
    } else
      onChange('channelLevels', {
        ...adjustments.channelLevels,
        [channel]: { ...values, [key]: value },
      });
  };
  const inputPointer = (
    event: PointerEvent<HTMLButtonElement>,
    key: LevelControlKey,
  ) => {
    const bounds = inputRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const property =
      key === 'levelsBlack'
        ? 'black'
        : key === 'levelsGamma'
          ? 'gamma'
          : 'white';
    setValue(
      property,
      levelValueFromPosition(
        key,
        (event.clientX - bounds.left) / bounds.width,
        values.black,
        values.white,
      ),
    );
  };
  const outputPointer = (
    event: PointerEvent<HTMLButtonElement>,
    key: 'outputBlack' | 'outputWhite',
  ) => {
    const bounds = outputRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const raw = Math.round(
      Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) *
        255,
    );
    setValue(
      key,
      key === 'outputBlack'
        ? Math.min(raw, values.outputWhite)
        : Math.max(raw, values.outputBlack),
    );
  };
  const inputKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    key: LevelControlKey,
  ) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const property =
      key === 'levelsBlack'
        ? 'black'
        : key === 'levelsGamma'
          ? 'gamma'
          : 'white';
    const step = key === 'levelsGamma' ? 0.05 : event.shiftKey ? 10 : 1;
    const position =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? 1
          : levelPosition(
              key,
              values[property] + (event.key === 'ArrowRight' ? step : -step),
            );
    setValue(
      property,
      levelValueFromPosition(key, position, values.black, values.white),
    );
    onCommit();
  };
  const outputKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    key: 'outputBlack' | 'outputWhite',
  ) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 10 : 1;
    const raw =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? 255
          : values[key] + (event.key === 'ArrowRight' ? step : -step);
    setValue(
      key,
      key === 'outputBlack'
        ? Math.max(0, Math.min(raw, values.outputWhite))
        : Math.min(255, Math.max(raw, values.outputBlack)),
    );
    onCommit();
  };

  return (
    <section className={`levels-control levels-${channel}`} aria-label="Levels">
      <div className="levels-heading">
        <strong>Levels</strong>
        <div className="levels-eyedroppers" aria-label="Set levels from image">
          {(['black', 'gray', 'white'] as PickerKind[]).map((kind) => (
            <button
              key={kind}
              className={kind}
              title={`Set ${kind} point from image`}
              aria-label={`Set ${kind} point from image`}
              onClick={() => onRequestEyedropper?.(kind, channel)}
            >
              ◉
            </button>
          ))}
        </div>
      </div>
      <div className="levels-channels" role="group" aria-label="Levels channel">
        {(['rgb', 'red', 'green', 'blue'] as CurveChannel[]).map((item) => (
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
      <span className="levels-track-label">Input</span>
      <div className="levels-track" ref={inputRef}>
        {(
          ['levelsBlack', 'levelsGamma', 'levelsWhite'] as LevelControlKey[]
        ).map((key) => {
          const value =
            key === 'levelsBlack'
              ? values.black
              : key === 'levelsGamma'
                ? values.gamma
                : values.white;
          return (
            <button
              key={key}
              className={`${key} ${dragging === key ? 'dragging' : ''}`}
              style={{ left: `${levelPosition(key, value) * 100}%` }}
              role="slider"
              aria-label={`${channel} ${labels[key]}`}
              aria-valuemin={key === 'levelsGamma' ? 0.1 : 0}
              aria-valuemax={key === 'levelsGamma' ? 3 : 255}
              aria-valuenow={value}
              onKeyDown={(e) => inputKey(e, key)}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setDragging(key);
                inputPointer(e, key);
              }}
              onPointerMove={(e) => dragging === key && inputPointer(e, key)}
              onPointerUp={(e) => {
                e.currentTarget.releasePointerCapture(e.pointerId);
                setDragging(null);
                onCommit();
              }}
            />
          );
        })}
      </div>
      <div className="levels-values">
        <span>{values.black}</span>
        <span>{values.gamma.toFixed(2)}</span>
        <span>{values.white}</span>
      </div>
      <span className="levels-track-label">Output</span>
      <div className="levels-track levels-output" ref={outputRef}>
        {(['outputBlack', 'outputWhite'] as const).map((key) => (
          <button
            key={key}
            className={`${key} ${dragging === key ? 'dragging' : ''}`}
            style={{ left: `${(values[key] / 255) * 100}%` }}
            role="slider"
            aria-label={`${channel} ${key === 'outputBlack' ? 'output black' : 'output white'}`}
            aria-valuemin={0}
            aria-valuemax={255}
            aria-valuenow={values[key]}
            onKeyDown={(e) => outputKey(e, key)}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragging(key);
              outputPointer(e, key);
            }}
            onPointerMove={(e) => dragging === key && outputPointer(e, key)}
            onPointerUp={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId);
              setDragging(null);
              onCommit();
            }}
          />
        ))}
      </div>
      <div className="levels-values output-values">
        <span>{values.outputBlack}</span>
        <span>{values.outputWhite}</span>
      </div>
    </section>
  );
}
