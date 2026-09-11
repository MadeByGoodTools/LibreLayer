'use client';

import { useEffect, useRef, useState } from 'react';
import { analyzeHistogram, type HistogramData } from '@/lib/histogram';

const percentage = (value: number, total: number) =>
  total ? `${((value / total) * 100).toFixed(value ? 1 : 0)}%` : '0%';

export function Histogram({
  sourceCanvas,
  revision,
}: {
  sourceCanvas?: HTMLCanvasElement | null;
  revision: unknown;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'rgb' | 'luminance'>('rgb');
  const [data, setData] = useState<HistogramData | null>(null);

  useEffect(() => {
    if (!sourceCanvas) {
      setData(null);
      return;
    }
    const frame = requestAnimationFrame(() => {
      const scale = Math.min(
          1,
          512 / sourceCanvas.width,
          512 / sourceCanvas.height,
        ),
        sample = document.createElement('canvas');
      sample.width = Math.max(1, Math.round(sourceCanvas.width * scale));
      sample.height = Math.max(1, Math.round(sourceCanvas.height * scale));
      const context = sample.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(sourceCanvas, 0, 0, sample.width, sample.height);
      setData(
        analyzeHistogram(
          context.getImageData(0, 0, sample.width, sample.height).data,
        ),
      );
      sample.width = sample.height = 1;
    });
    return () => cancelAnimationFrame(frame);
  }, [revision, sourceCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d')!;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#34373d';
    context.lineWidth = 1;
    for (const x of [64, 128, 192]) {
      context.beginPath();
      context.moveTo(x + 0.5, 0);
      context.lineTo(x + 0.5, canvas.height);
      context.stroke();
    }
    if (!data?.opaquePixels) return;
    const channels =
      mode === 'luminance'
        ? [[data.luminance, '#d9dde4'] as const]
        : [
            [data.red, '#ff5f65'] as const,
            [data.green, '#58d58f'] as const,
            [data.blue, '#5d8dff'] as const,
          ];
    const maximum = Math.max(
      1,
      ...channels.flatMap(([channel]) => Array.from(channel)),
    );
    context.globalCompositeOperation =
      mode === 'rgb' ? 'screen' : 'source-over';
    for (const [channel, color] of channels) {
      context.beginPath();
      context.moveTo(0, canvas.height);
      for (let value = 0; value < 256; value++) {
        const height =
          (Math.log1p(channel[value]) / Math.log1p(maximum)) *
          (canvas.height - 4);
        context.lineTo(value, canvas.height - height);
      }
      context.lineTo(255, canvas.height);
      context.closePath();
      context.fillStyle = color;
      context.globalAlpha = mode === 'rgb' ? 0.48 : 0.7;
      context.fill();
    }
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
  }, [data, mode]);

  return (
    <section className="histogram-panel" aria-label="Image histogram">
      <div className="histogram-heading">
        <strong>Histogram</strong>
        <div role="group" aria-label="Histogram channel">
          <button
            className={mode === 'rgb' ? 'active' : ''}
            aria-pressed={mode === 'rgb'}
            onClick={() => setMode('rgb')}
          >
            RGB
          </button>
          <button
            className={mode === 'luminance' ? 'active' : ''}
            aria-pressed={mode === 'luminance'}
            onClick={() => setMode('luminance')}
          >
            Luma
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={256}
        height={92}
        role="img"
        aria-label={`${mode === 'rgb' ? 'RGB' : 'Luminance'} histogram`}
      />
      <div className="histogram-clipping">
        <span className={data?.shadowClipped ? 'warning' : ''}>
          Shadows{' '}
          {percentage(data?.shadowClipped ?? 0, data?.opaquePixels ?? 0)}
        </span>
        <span className={data?.highlightClipped ? 'warning' : ''}>
          Highlights{' '}
          {percentage(data?.highlightClipped ?? 0, data?.opaquePixels ?? 0)}
        </span>
      </div>
    </section>
  );
}
