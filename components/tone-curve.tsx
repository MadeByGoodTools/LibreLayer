'use client';

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { analyzeHistogram } from '@/lib/histogram';
import {
  pointCurveValue,
  resampleCurvePoints,
  sanitizeCurvePoints,
  smoothCurvePoints,
  toneCurveValue,
  type CurveChannel,
  type CurvePoint,
  type HighDepthAdjustments,
} from '@/lib/high-depth';

const clamp = (value: number, low = -100, high = 100) =>
  Math.max(low, Math.min(high, value));

export function ToneCurve({
  adjustments,
  onChange,
  onCommit,
  onRequestTarget,
  sourceCanvas,
  revision,
}: {
  adjustments: HighDepthAdjustments;
  onChange: (
    key: keyof HighDepthAdjustments,
    value: HighDepthAdjustments[keyof HighDepthAdjustments],
  ) => void;
  onCommit: () => void;
  onRequestTarget?: (channel: CurveChannel) => void;
  sourceCanvas?: HTMLCanvasElement | null;
  revision?: unknown;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const freehandStroke = useRef<CurvePoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [channel, setChannel] = useState<CurveChannel>('rgb');
  const [mode, setMode] = useState<'points' | 'draw'>('points');
  const [smoothing, setSmoothing] = useState(50);
  const [clipEndpoints, setClipEndpoints] = useState(true);
  const [histogram, setHistogram] = useState<Uint32Array | null>(null);
  const keys = {
    rgb: ['curveShadows', 'curveHighlights'],
    red: ['redCurveShadows', 'redCurveHighlights'],
    green: ['greenCurveShadows', 'greenCurveHighlights'],
    blue: ['blueCurveShadows', 'blueCurveHighlights'],
  } as const;
  const [shadowKey, highlightKey] = keys[channel];
  const shadows = Number(adjustments[shadowKey] ?? 0);
  const highlights = Number(adjustments[highlightKey] ?? 0);
  const custom = adjustments.curves?.[channel] ?? [];
  const evaluated = (input: number, forChannel = channel) => {
    const [s, h] = keys[forChannel];
    return pointCurveValue(
      toneCurveValue(
        input,
        Number(adjustments[s] ?? 0),
        Number(adjustments[h] ?? 0),
      ),
      adjustments.curves?.[forChannel],
    );
  };
  const pathFor = (forChannel: CurveChannel) =>
    Array.from({ length: 65 }, (_, i) => {
      const x = i / 64;
      return `${i ? 'L' : 'M'} ${x * 256} ${(1 - evaluated(x, forChannel)) * 160}`;
    }).join(' ');

  useEffect(() => {
    if (!sourceCanvas) return setHistogram(null);
    const frame = requestAnimationFrame(() => {
      const scale = Math.min(
        1,
        384 / sourceCanvas.width,
        384 / sourceCanvas.height,
      );
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
      canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
      const data = analyzeHistogram(
        context.getImageData(0, 0, canvas.width, canvas.height).data,
      );
      setHistogram(channel === 'rgb' ? data.luminance : data[channel]);
    });
    return () => cancelAnimationFrame(frame);
  }, [channel, revision, sourceCanvas]);
  const histogramPath = histogram
    ? (() => {
        const maximum = Math.max(1, ...histogram);
        return `M 0 160 ${Array.from(histogram, (count, x) => `L ${x} ${160 - (Math.log1p(count) / Math.log1p(maximum)) * 145}`).join(' ')} L 255 160 Z`;
      })()
    : '';

  const coordinates = (event: PointerEvent<SVGElement>) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y:
        1 -
        Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };
  const setCustom = (points: CurvePoint[]) =>
    onChange('curves', {
      ...adjustments.curves,
      [channel]: [...points].sort((a, b) => a.x - b.x).slice(0, 14),
    });
  const addPoint = (event: PointerEvent<SVGSVGElement>) => {
    if (mode === 'draw') return;
    if (custom.length >= 14) return;
    const point = coordinates(event);
    if (!point) return;
    const next = [...custom, point].sort((a, b) => a.x - b.x);
    setCustom(next);
    setSelectedPoint(next.indexOf(point));
  };
  const finishFreehand = () => {
    if (!freehandStroke.current.length) return;
    let next = resampleCurvePoints(
      freehandStroke.current,
      clipEndpoints ? 12 : 14,
    );
    next = smoothCurvePoints(next, smoothing);
    if (clipEndpoints)
      next = [
        { x: 0, y: 0 },
        ...next.filter((point) => point.x > 0.002 && point.x < 0.998),
        { x: 1, y: 1 },
      ];
    setCustom(next);
    freehandStroke.current = [];
    setDragging(null);
    setSelectedPoint(null);
    onCommit();
  };
  const drawFreehand = (event: PointerEvent<SVGSVGElement>) => {
    const point = coordinates(event);
    if (!point) return;
    const previous = freehandStroke.current.at(-1);
    if (
      previous &&
      Math.abs(previous.x - point.x) < 0.004 &&
      Math.abs(previous.y - point.y) < 0.004
    )
      return;
    freehandStroke.current.push(point);
    let preview = resampleCurvePoints(
      freehandStroke.current,
      clipEndpoints ? 12 : 14,
    );
    if (clipEndpoints)
      preview = [
        { x: 0, y: 0 },
        ...preview.filter((item) => item.x > 0.002 && item.x < 0.998),
        { x: 1, y: 1 },
      ];
    setCustom(preview);
  };
  const movePoint = (event: PointerEvent<SVGCircleElement>, index: number) => {
    const point = coordinates(event);
    if (!point) return;
    const previous = custom[index - 1]?.x ?? 0;
    const next = custom[index + 1]?.x ?? 1;
    const updated = custom.map((item, i) =>
      i === index
        ? {
            x: Math.max(previous + 0.002, Math.min(next - 0.002, point.x)),
            y: point.y,
          }
        : item,
    );
    setCustom(updated);
  };
  const pointKey = (event: KeyboardEvent<SVGCircleElement>, index: number) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      setCustom(custom.filter((_, i) => i !== index));
      setSelectedPoint(null);
      onCommit();
      return;
    }
    if (
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    )
      return;
    event.preventDefault();
    const step = event.shiftKey ? 0.05 : 0.01;
    const deltaX =
      event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const deltaY =
      event.key === 'ArrowDown' ? -step : event.key === 'ArrowUp' ? step : 0;
    const previous = custom[index - 1]?.x ?? 0,
      next = custom[index + 1]?.x ?? 1;
    setCustom(
      custom.map((point, i) =>
        i === index
          ? {
              x: Math.max(
                previous + 0.002,
                Math.min(next - 0.002, point.x + deltaX),
              ),
              y: Math.max(0, Math.min(1, point.y + deltaY)),
            }
          : point,
      ),
    );
    onCommit();
  };
  const zoneHandle = (name: 'shadows' | 'highlights', input: number) => {
    const key = name === 'shadows' ? shadowKey : highlightKey;
    const value = Number(adjustments[key] ?? 0);
    const setFromPointer = (event: PointerEvent<SVGCircleElement>) => {
      const point = coordinates(event);
      if (!point) return;
      const other = name === 'shadows' ? highlights : shadows;
      const base = toneCurveValue(
        input,
        name === 'shadows' ? 0 : other,
        name === 'highlights' ? 0 : other,
      );
      onChange(
        key,
        clamp(Math.round(((point.y - base) / (input * (1 - input))) * 100)),
      );
    };
    return (
      <circle
        className="zone-point"
        cx={input * 256}
        cy={(1 - evaluated(input)) * 160}
        r="5"
        role="slider"
        tabIndex={0}
        aria-label={`${channel} ${name} curve point`}
        aria-valuemin={-100}
        aria-valuemax={100}
        aria-valuenow={value}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(name);
          setFromPointer(e);
        }}
        onPointerMove={(e) => dragging === name && setFromPointer(e)}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          setDragging(null);
          onCommit();
        }}
      />
    );
  };

  return (
    <div className="tone-curve-editor">
      <div className="tone-curve-heading">
        <strong>Curves</strong>
        <div>
          <button onClick={() => onRequestTarget?.(channel)}>
            Target image
          </button>
          <button
            disabled={selectedPoint === null}
            onClick={() => {
              if (selectedPoint !== null) {
                setCustom(custom.filter((_, i) => i !== selectedPoint));
                setSelectedPoint(null);
                onCommit();
              }
            }}
          >
            Delete point
          </button>
        </div>
      </div>
      <div
        className="tone-curve-channels"
        role="group"
        aria-label="Curve channel"
      >
        {(['rgb', 'red', 'green', 'blue'] as CurveChannel[]).map((item) => (
          <button
            key={item}
            className={channel === item ? `active ${item}` : item}
            aria-pressed={channel === item}
            onClick={() => {
              setChannel(item);
              setSelectedPoint(null);
            }}
          >
            {item === 'rgb' ? 'RGB' : item[0].toUpperCase()}
          </button>
        ))}
      </div>
      <div className="tone-curve-tools" aria-label="Curve drawing controls">
        <div role="group" aria-label="Curve editing mode">
          <button
            className={mode === 'points' ? 'active' : ''}
            aria-pressed={mode === 'points'}
            onClick={() => setMode('points')}
          >
            Points
          </button>
          <button
            className={mode === 'draw' ? 'active' : ''}
            aria-pressed={mode === 'draw'}
            onClick={() => setMode('draw')}
          >
            Draw
          </button>
        </div>
        <button
          onClick={() => {
            setCustom(smoothCurvePoints(custom, smoothing));
            onCommit();
          }}
          disabled={!custom.length}
        >
          Smooth
        </button>
        <label>
          <input
            type="checkbox"
            checked={clipEndpoints}
            onChange={(event) => {
              const checked = event.target.checked;
              setClipEndpoints(checked);
              if (checked)
                setCustom([
                  { x: 0, y: 0 },
                  ...custom
                    .filter((point) => point.x > 0.002 && point.x < 0.998)
                    .slice(0, 12),
                  { x: 1, y: 1 },
                ]);
              onCommit();
            }}
          />
          Clip ends
        </label>
      </div>
      {mode === 'draw' && (
        <label className="curve-smoothing">
          Smoothing
          <input
            aria-label="Freehand curve smoothing"
            type="range"
            min={0}
            max={100}
            value={smoothing}
            onChange={(event) => setSmoothing(+event.target.value)}
          />
          <span>{smoothing}%</span>
        </label>
      )}
      <svg
        ref={svgRef}
        className={`curve-${channel}`}
        viewBox="0 0 256 160"
        aria-label={`Editable ${channel} curve. Click to add up to 14 points.`}
        onPointerDown={(event) => {
          if (mode === 'points') return addPoint(event);
          event.currentTarget.setPointerCapture(event.pointerId);
          freehandStroke.current = [];
          setDragging('freehand');
          drawFreehand(event);
        }}
        onPointerMove={(event) =>
          dragging === 'freehand' && drawFreehand(event)
        }
        onPointerUp={(event) => {
          if (dragging !== 'freehand') return;
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
          finishFreehand();
        }}
        onPointerCancel={() => {
          freehandStroke.current = [];
          setDragging(null);
        }}
      >
        {histogramPath && (
          <path className="tone-curve-histogram" d={histogramPath} />
        )}
        <path
          className="tone-curve-grid"
          d="M 64 0 V 160 M 128 0 V 160 M 192 0 V 160 M 0 40 H 256 M 0 80 H 256 M 0 120 H 256"
        />
        <path className="tone-curve-baseline" d="M 0 160 L 256 0" />
        {channel === 'rgb' &&
          (['red', 'green', 'blue'] as CurveChannel[]).map((item) => (
            <path
              key={item}
              className={`tone-curve-overlay ${item}`}
              d={pathFor(item)}
            />
          ))}
        <path className="tone-curve-line" d={pathFor(channel)} />
        {zoneHandle('shadows', 0.25)}
        {zoneHandle('highlights', 0.75)}
        {mode === 'points' &&
          custom.map((point, index) => (
            <circle
              key={`${index}-${point.x}`}
              className={`custom-point ${selectedPoint === index ? 'selected' : ''}`}
              cx={point.x * 256}
              cy={(1 - point.y) * 160}
              r="5"
              role="slider"
              tabIndex={0}
              aria-label={`${channel} curve point ${index + 1}`}
              aria-valuemin={0}
              aria-valuemax={255}
              aria-valuenow={Math.round(point.y * 255)}
              onKeyDown={(e) => pointKey(e, index)}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                setDragging(`point-${index}`);
                setSelectedPoint(index);
              }}
              onPointerMove={(e) =>
                dragging === `point-${index}` && movePoint(e, index)
              }
              onPointerUp={(e) => {
                e.currentTarget.releasePointerCapture(e.pointerId);
                setDragging(null);
                onCommit();
              }}
            />
          ))}
      </svg>
      <div className="tone-curve-values">
        <span>Click graph to add points · arrows fine tune</span>
        <span>{sanitizeCurvePoints(custom).length - 2}/14</span>
      </div>
      {mode === 'points' && selectedPoint !== null && custom[selectedPoint] && (
        <div
          className="curve-point-editor"
          aria-label="Selected curve point values"
        >
          <label>
            Input
            <input
              type="number"
              min={0}
              max={255}
              value={Math.round(custom[selectedPoint].x * 255)}
              onChange={(event) => {
                const previous = custom[selectedPoint - 1]?.x ?? 0,
                  next = custom[selectedPoint + 1]?.x ?? 1,
                  x = Math.max(
                    previous + 0.002,
                    Math.min(next - 0.002, Number(event.target.value) / 255),
                  );
                setCustom(
                  custom.map((point, index) =>
                    index === selectedPoint ? { ...point, x } : point,
                  ),
                );
              }}
              onBlur={onCommit}
            />
          </label>
          <label>
            Output
            <input
              type="number"
              min={0}
              max={255}
              value={Math.round(custom[selectedPoint].y * 255)}
              onChange={(event) =>
                setCustom(
                  custom.map((point, index) =>
                    index === selectedPoint
                      ? {
                          ...point,
                          y: Math.max(
                            0,
                            Math.min(1, Number(event.target.value) / 255),
                          ),
                        }
                      : point,
                  ),
                )
              }
              onBlur={onCommit}
            />
          </label>
        </div>
      )}
    </div>
  );
}
