'use client';

import { useEffect, useRef } from 'react';
import { isProofGamutWarning, type SoftProofMode } from '@/lib/soft-proof';

export function SoftProofOverlay({
  sourceCanvas,
  revision,
  mode,
  enabled,
}: {
  sourceCanvas?: HTMLCanvasElement | null;
  revision: unknown;
  mode: SoftProofMode;
  enabled: boolean;
}) {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !sourceCanvas || !enabled || mode === 'none') return;
    const frame = requestAnimationFrame(() => {
      const scale = Math.min(
        1,
        1024 / sourceCanvas.width,
        1024 / sourceCanvas.height,
      );
      overlay.width = Math.max(1, Math.round(sourceCanvas.width * scale));
      overlay.height = Math.max(1, Math.round(sourceCanvas.height * scale));
      const context = overlay.getContext('2d', { willReadFrequently: true })!;
      context.drawImage(sourceCanvas, 0, 0, overlay.width, overlay.height);
      const image = context.getImageData(0, 0, overlay.width, overlay.height);
      for (let index = 0; index < image.data.length; index += 4) {
        const warning =
          image.data[index + 3] > 0 &&
          isProofGamutWarning(
            image.data[index],
            image.data[index + 1],
            image.data[index + 2],
            mode,
          );
        image.data[index] = warning ? 255 : 0;
        image.data[index + 1] = warning ? 0 : 0;
        image.data[index + 2] = warning ? 214 : 0;
        image.data[index + 3] = warning ? 155 : 0;
      }
      context.putImageData(image, 0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [enabled, mode, revision, sourceCanvas]);
  if (!enabled || mode === 'none') return null;
  return (
    <canvas
      ref={overlayRef}
      className="soft-proof-gamut-overlay"
      aria-label="Out-of-gamut color warning overlay"
    />
  );
}
