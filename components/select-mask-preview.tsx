'use client';

import { useEffect, useRef } from 'react';

export type SelectMaskPreviewMode =
  | 'overlay'
  | 'on-black'
  | 'on-white'
  | 'black-white'
  | 'on-layers'
  | 'onion-skin';

type Rect = { x: number; y: number; w: number; h: number };

export function SelectMaskPreview({
  source,
  mask,
  selection,
  mode,
  opacity,
  radius,
  smooth,
  feather,
  shift,
}: {
  source: HTMLCanvasElement | null;
  mask: HTMLCanvasElement | null;
  selection: Rect | null;
  mode: SelectMaskPreviewMode;
  opacity: number;
  radius: number;
  smooth: number;
  feather: number;
  shift: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const output = canvasRef.current;
    if (!output || !source?.width || !source.height) return;
    const width = Math.min(720, source.width),
      height = Math.max(1, Math.round((source.height / source.width) * width)),
      scale = width / source.width;
    output.width = width;
    output.height = height;
    const context = output.getContext('2d')!,
      baseMask = document.createElement('canvas');
    baseMask.width = width;
    baseMask.height = height;
    const baseContext = baseMask.getContext('2d')!;
    if (mask) baseContext.drawImage(mask, 0, 0, width, height);
    else if (selection) {
      baseContext.fillStyle = 'white';
      baseContext.fillRect(
        selection.x * scale,
        selection.y * scale,
        selection.w * scale,
        selection.h * scale,
      );
    } else {
      baseContext.fillStyle = 'white';
      baseContext.fillRect(0, 0, width, height);
    }

    let refined = baseMask,
      workingContext = baseContext;
    const expansion = Math.max(0, (radius + Math.max(0, shift) / 10) * scale);
    if (expansion > 0) {
      refined = document.createElement('canvas');
      refined.width = width;
      refined.height = height;
      workingContext = refined.getContext('2d')!;
      for (let step = 0; step < 16; step++) {
        const angle = (step / 16) * Math.PI * 2;
        workingContext.drawImage(
          baseMask,
          Math.cos(angle) * expansion,
          Math.sin(angle) * expansion,
        );
      }
      workingContext.drawImage(baseMask, 0, 0);
    }
    if (shift < 0) {
      const amount = Math.abs(shift / 10) * scale,
        contracted = document.createElement('canvas'),
        inverse = document.createElement('canvas');
      contracted.width = inverse.width = width;
      contracted.height = inverse.height = height;
      const inverseContext = inverse.getContext('2d')!;
      inverseContext.fillStyle = 'white';
      inverseContext.fillRect(0, 0, width, height);
      inverseContext.globalCompositeOperation = 'destination-out';
      inverseContext.drawImage(refined, 0, 0);
      const contractedContext = contracted.getContext('2d')!;
      contractedContext.fillStyle = 'white';
      contractedContext.fillRect(0, 0, width, height);
      contractedContext.globalCompositeOperation = 'destination-out';
      for (let step = 0; step < 16; step++) {
        const angle = (step / 16) * Math.PI * 2;
        contractedContext.drawImage(
          inverse,
          Math.cos(angle) * amount,
          Math.sin(angle) * amount,
        );
      }
      refined = contracted;
      workingContext = contractedContext;
    }
    const blur = Math.max(smooth, feather) * scale;
    if (blur > 0) {
      const softened = document.createElement('canvas');
      softened.width = width;
      softened.height = height;
      const softenedContext = softened.getContext('2d')!;
      softenedContext.filter = `blur(${blur}px)`;
      softenedContext.drawImage(refined, 0, 0);
      refined = softened;
      workingContext = softenedContext;
    }

    context.clearRect(0, 0, width, height);
    if (mode === 'black-white') {
      context.fillStyle = 'black';
      context.fillRect(0, 0, width, height);
      context.drawImage(refined, 0, 0);
      return;
    }
    context.fillStyle = mode === 'on-white' ? 'white' : '#090a0d';
    context.fillRect(0, 0, width, height);
    if (mode === 'overlay' || mode === 'on-layers')
      context.drawImage(source, 0, 0, width, height);
    const subject = document.createElement('canvas');
    subject.width = width;
    subject.height = height;
    const subjectContext = subject.getContext('2d')!;
    subjectContext.drawImage(source, 0, 0, width, height);
    subjectContext.globalCompositeOperation = 'destination-in';
    subjectContext.drawImage(refined, 0, 0);
    if (mode === 'on-black' || mode === 'on-white')
      context.drawImage(subject, 0, 0);
    if (mode === 'on-layers') {
      context.globalAlpha = opacity / 100;
      context.drawImage(subject, 0, 0);
      context.globalAlpha = 1;
    }
    if (mode === 'onion-skin') {
      context.globalAlpha = (100 - opacity) / 100;
      context.drawImage(source, 0, 0, width, height);
      context.globalAlpha = opacity / 100;
      context.drawImage(subject, 0, 0);
      context.globalAlpha = 1;
    }
    if (mode === 'overlay') {
      const overlay = document.createElement('canvas'),
        overlayContext = overlay.getContext('2d')!;
      overlay.width = width;
      overlay.height = height;
      overlayContext.fillStyle = `rgba(255, 42, 74, ${opacity / 100})`;
      overlayContext.fillRect(0, 0, width, height);
      overlayContext.globalCompositeOperation = 'destination-out';
      overlayContext.drawImage(refined, 0, 0);
      context.drawImage(overlay, 0, 0);
    }
    workingContext.filter = 'none';
  }, [source, mask, selection, mode, opacity, radius, smooth, feather, shift]);

  return <canvas ref={canvasRef} aria-label="Live Select and Mask preview" />;
}
