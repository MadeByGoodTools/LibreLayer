'use client';

import { useEffect, useRef, useState } from 'react';

type ScopeMode = 'waveform' | 'parade' | 'vectorscope';

export function ColorScopes({
  sourceCanvas,
  revision,
}: {
  sourceCanvas?: HTMLCanvasElement | null;
  revision: unknown;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<ScopeMode>('waveform');
  const [verticalScale, setVerticalScale] = useState<1 | 1.25 | 1.5>(1);
  const [traceGain, setTraceGain] = useState<1 | 2 | 3>(2);

  useEffect(() => {
    const output = canvasRef.current;
    if (!output || !sourceCanvas) return;
    const frame = requestAnimationFrame(() => {
      const context = output.getContext('2d')!;
      context.clearRect(0, 0, output.width, output.height);
      context.fillStyle = '#0b0d10';
      context.fillRect(0, 0, output.width, output.height);
      context.strokeStyle = '#2d3239';
      context.lineWidth = 1;
      for (const position of [0.25, 0.5, 0.75]) {
        context.beginPath();
        context.moveTo(0, position * output.height + 0.5);
        context.lineTo(output.width, position * output.height + 0.5);
        context.stroke();
      }
      const scale = Math.min(
          1,
          384 / sourceCanvas.width,
          384 / sourceCanvas.height,
        ),
        sample = document.createElement('canvas');
      sample.width = Math.max(1, Math.round(sourceCanvas.width * scale));
      sample.height = Math.max(1, Math.round(sourceCanvas.height * scale));
      const sampleContext = sample.getContext('2d', {
        willReadFrequently: true,
      })!;
      sampleContext.drawImage(sourceCanvas, 0, 0, sample.width, sample.height);
      const pixels = sampleContext.getImageData(
          0,
          0,
          sample.width,
          sample.height,
        ).data,
        stride = Math.max(1, Math.ceil((sample.width * sample.height) / 45000));
      context.globalCompositeOperation = 'lighter';
      const scopeValue = (value: number) =>
        Math.max(0, Math.min(1, 0.5 + (value - 0.5) * verticalScale));
      for (
        let pixel = 0;
        pixel < sample.width * sample.height;
        pixel += stride
      ) {
        const index = pixel * 4;
        if (!pixels[index + 3]) continue;
        const red = pixels[index] / 255,
          green = pixels[index + 1] / 255,
          blue = pixels[index + 2] / 255,
          sourceX = pixel % sample.width;
        if (mode === 'waveform') {
          const luma = red * 0.2126 + green * 0.7152 + blue * 0.0722;
          context.fillStyle = `rgb(125 235 190 / ${0.04 * traceGain})`;
          context.fillRect(
            (sourceX / sample.width) * output.width,
            (1 - scopeValue(luma)) * output.height,
            1,
            1,
          );
        } else if (mode === 'parade') {
          const width = output.width / 3;
          [red, green, blue].forEach((value, channel) => {
            context.fillStyle = [
              `rgb(255 90 96 / ${0.04 * traceGain})`,
              `rgb(72 230 142 / ${0.04 * traceGain})`,
              `rgb(84 139 255 / ${0.04 * traceGain})`,
            ][channel];
            context.fillRect(
              channel * width + (sourceX / sample.width) * width,
              (1 - scopeValue(value)) * output.height,
              1,
              1,
            );
          });
        } else {
          const cb =
              (blue - (red * 0.2126 + green * 0.7152 + blue * 0.0722)) * 0.55,
            cr = (red - (red * 0.2126 + green * 0.7152 + blue * 0.0722)) * 0.55;
          context.fillStyle = `rgb(${pixels[index]} ${pixels[index + 1]} ${pixels[index + 2]} / ${0.065 * traceGain})`;
          context.fillRect(
            output.width / 2 + cb * output.width * verticalScale,
            output.height / 2 - cr * output.height * verticalScale,
            1.5,
            1.5,
          );
        }
      }
      context.globalCompositeOperation = 'source-over';
      if (mode === 'vectorscope') {
        context.strokeStyle = '#4a515c';
        context.beginPath();
        context.arc(
          output.width / 2,
          output.height / 2,
          Math.min(output.width, output.height) * 0.43,
          0,
          Math.PI * 2,
        );
        context.stroke();
      }
      sample.width = sample.height = 1;
    });
    return () => cancelAnimationFrame(frame);
  }, [mode, revision, sourceCanvas, traceGain, verticalScale]);

  return (
    <section className="color-scopes" aria-label="Color scopes">
      <div className="scope-heading">
        <strong>Scopes</strong>
        <div role="group" aria-label="Scope type">
          {(['waveform', 'parade', 'vectorscope'] as ScopeMode[]).map(
            (item) => (
              <button
                key={item}
                className={mode === item ? 'active' : ''}
                aria-pressed={mode === item}
                onClick={() => setMode(item)}
              >
                {item === 'vectorscope'
                  ? 'Vector'
                  : item === 'waveform'
                    ? 'Wave'
                    : 'RGB'}
              </button>
            ),
          )}
        </div>
      </div>
      <div className="scope-controls">
        <div role="group" aria-label="Scope scale">
          {([1, 1.25, 1.5] as const).map((scale) => (
            <button
              key={scale}
              className={verticalScale === scale ? 'active' : ''}
              aria-pressed={verticalScale === scale}
              onClick={() => setVerticalScale(scale)}
            >
              {Math.round(scale * 100)}%
            </button>
          ))}
        </div>
        <div role="group" aria-label="Trace brightness">
          {([1, 2, 3] as const).map((gain) => (
            <button
              key={gain}
              className={traceGain === gain ? 'active' : ''}
              aria-pressed={traceGain === gain}
              onClick={() => setTraceGain(gain)}
            >
              {gain === 1 ? 'Dim' : gain === 2 ? 'Normal' : 'Bright'}
            </button>
          ))}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={256}
        height={110}
        role="img"
        aria-label={`${mode} color scope`}
      />
    </section>
  );
}
