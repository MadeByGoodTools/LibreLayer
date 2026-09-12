'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  applyLiquifyFaceControls,
  applyLiquifyStroke,
  createLiquifyMesh,
  isLiquifyMesh,
  normalizeLiquifyMesh,
  renderLiquifyPixels,
  resizeLiquifyMesh,
  type LiquifyFaceControls,
  type LiquifyMesh,
  type LiquifyTool,
} from '@/lib/liquify-engine';
import {
  defaultVanishingPointRecipe,
  defaultWideAngleRecipe,
  createVanishingPointMapper,
  createWideAngleMapper,
  normalizeVanishingPointRecipe,
  normalizeWideAngleRecipe,
  remapProjectionPixels,
  type VanishingPointRecipe,
  type WideAngleRecipe,
} from '@/lib/projection-engine';

export type DistortionWorkspaceKind =
  | 'liquify'
  | 'wide-angle'
  | 'vanishing-point';

export type DistortionWorkspaceResult =
  | { kind: 'liquify'; mesh: LiquifyMesh }
  | { kind: 'wide-angle'; recipe: WideAngleRecipe }
  | { kind: 'vanishing-point'; recipe: VanishingPointRecipe };

const defaultFace: LiquifyFaceControls = {
  eyeSize: 0,
  eyeHeight: 0,
  noseWidth: 0,
  smile: 0,
  mouthHeight: 0,
  jawline: 0,
};

const title = (kind: DistortionWorkspaceKind) =>
  kind === 'liquify'
    ? 'Liquify'
    : kind === 'wide-angle'
      ? 'Adaptive Wide Angle'
      : 'Vanishing Point';

const SliderRow = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) => (
  <label className="distortion-slider-row">
    <span>{label}</span>
    <input
      aria-label={label}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(+event.target.value)}
    />
    <input
      aria-label={`${label} value`}
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) =>
        onChange(Math.max(min, Math.min(max, +event.target.value || 0)))
      }
    />
  </label>
);

export function DistortionWorkspaceDialog({
  kind,
  sourceCanvas,
  width,
  height,
  onClose,
  onApply,
}: {
  kind: DistortionWorkspaceKind | null;
  sourceCanvas: HTMLCanvasElement | null;
  width: number;
  height: number;
  onClose: () => void;
  onApply: (result: DistortionWorkspaceResult) => void;
}) {
  const previewRef = useRef<HTMLCanvasElement>(null),
    importRef = useRef<HTMLInputElement>(null),
    dragRef = useRef<{ x: number; y: number; corner?: number } | null>(null),
    [tool, setTool] = useState<LiquifyTool>('forward'),
    [radius, setRadius] = useState(90),
    [pressure, setPressure] = useState(50),
    [mesh, setMesh] = useState(() => createLiquifyMesh(width, height)),
    [face, setFace] = useState<LiquifyFaceControls>(defaultFace),
    [wide, setWide] = useState(defaultWideAngleRecipe),
    [vanishing, setVanishing] = useState(defaultVanishingPointRecipe),
    [message, setMessage] = useState('');
  const previewSize = useMemo(() => {
    const scale = Math.min(1, 720 / width, 520 / height);
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    };
  }, [height, width]);

  useEffect(() => {
    if (!kind) return;
    setTool('forward');
    setRadius(Math.max(20, Math.round(Math.min(width, height) * 0.12)));
    setPressure(50);
    setMesh(createLiquifyMesh(width, height));
    setFace(defaultFace);
    setWide(defaultWideAngleRecipe());
    setVanishing(defaultVanishingPointRecipe());
    setMessage('');
  }, [height, kind, width]);

  useEffect(() => {
    if (!kind || !sourceCanvas || !previewRef.current) return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled || !previewRef.current) return;
      const canvas = previewRef.current,
        input = document.createElement('canvas');
      canvas.width = input.width = previewSize.width;
      canvas.height = input.height = previewSize.height;
      const inputContext = input.getContext('2d', {
          willReadFrequently: true,
        })!,
        outputContext = canvas.getContext('2d')!;
      inputContext.drawImage(
        sourceCanvas,
        0,
        0,
        previewSize.width,
        previewSize.height,
      );
      const image = inputContext.getImageData(
          0,
          0,
          previewSize.width,
          previewSize.height,
        ),
        output =
          kind === 'liquify'
            ? renderLiquifyPixels(
                image.data,
                resizeLiquifyMesh(
                  applyLiquifyFaceControls(mesh, face),
                  previewSize.width,
                  previewSize.height,
                ),
              )
            : remapProjectionPixels(
                image.data,
                previewSize.width,
                previewSize.height,
                kind === 'wide-angle'
                  ? createWideAngleMapper(
                      previewSize.width,
                      previewSize.height,
                      wide,
                    )
                  : createVanishingPointMapper(
                      previewSize.width,
                      previewSize.height,
                      vanishing,
                    ),
              );
      outputContext.putImageData(
        new ImageData(output, previewSize.width, previewSize.height),
        0,
        0,
      );
      if (kind === 'vanishing-point') {
        outputContext.save();
        outputContext.strokeStyle = '#69d9a5';
        outputContext.fillStyle = '#69d9a5';
        outputContext.lineWidth = 2;
        outputContext.beginPath();
        vanishing.plane.forEach((point, index) => {
          const x = point.x * previewSize.width,
            y = point.y * previewSize.height;
          if (index) outputContext.lineTo(x, y);
          else outputContext.moveTo(x, y);
        });
        outputContext.closePath();
        outputContext.stroke();
        for (const point of vanishing.plane) {
          outputContext.beginPath();
          outputContext.arc(
            point.x * previewSize.width,
            point.y * previewSize.height,
            5,
            0,
            Math.PI * 2,
          );
          outputContext.fill();
        }
        outputContext.restore();
      }
      input.width = input.height = 1;
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [face, kind, mesh, previewSize, sourceCanvas, vanishing, wide]);

  const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height,
    };
  };
  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = canvasPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (kind === 'vanishing-point') {
      let corner = 0,
        distance = Infinity;
      vanishing.plane.forEach((candidate, index) => {
        const current = Math.hypot(
          candidate.x * width - point.x,
          candidate.y * height - point.y,
        );
        if (current < distance) {
          distance = current;
          corner = index;
        }
      });
      dragRef.current = { ...point, corner };
      return;
    }
    if (kind === 'liquify') {
      dragRef.current = point;
      if (['twirl', 'pucker', 'bloat', 'freeze', 'thaw'].includes(tool))
        setMesh((current) =>
          applyLiquifyStroke(
            current,
            tool,
            point,
            { x: 0, y: 0 },
            radius,
            pressure / 100,
          ),
        );
    }
  };
  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const previous = dragRef.current;
    if (!previous) return;
    const point = canvasPoint(event);
    if (kind === 'vanishing-point' && previous.corner !== undefined) {
      const plane = [...vanishing.plane] as VanishingPointRecipe['plane'];
      plane[previous.corner] = {
        x: point.x / width,
        y: point.y / height,
      };
      setVanishing((current) =>
        normalizeVanishingPointRecipe({ ...current, plane }),
      );
    } else if (kind === 'liquify')
      setMesh((current) =>
        applyLiquifyStroke(
          current,
          tool,
          point,
          { x: point.x - previous.x, y: point.y - previous.y },
          radius,
          pressure / 100,
        ),
      );
    dragRef.current = { ...point, corner: previous.corner };
  };
  const pointerUp = () => {
    dragRef.current = null;
  };

  const exportMesh = () => {
    const blob = new Blob([JSON.stringify(mesh)], { type: 'application/json' }),
      url = URL.createObjectURL(blob),
      anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'librelayer-liquify-mesh.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setMessage('Reusable mesh exported');
  };
  const importMesh = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!isLiquifyMesh(parsed, width, height))
        throw new Error('Mesh dimensions do not match this document.');
      const next = normalizeLiquifyMesh(parsed, width, height);
      setMesh(next);
      setMessage('Reusable mesh imported');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Mesh import failed');
    } finally {
      if (importRef.current) importRef.current.value = '';
    }
  };

  const apply = () => {
    if (kind === 'liquify')
      onApply({ kind, mesh: applyLiquifyFaceControls(mesh, face) });
    else if (kind === 'wide-angle')
      onApply({ kind, recipe: normalizeWideAngleRecipe(wide) });
    else if (kind === 'vanishing-point')
      onApply({ kind, recipe: normalizeVanishingPointRecipe(vanishing) });
  };

  return (
    <Dialog open={Boolean(kind)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="distortion-workspace">
        <DialogTitle>{kind ? title(kind) : 'Distortion workspace'}</DialogTitle>
        <DialogDescription>
          {kind === 'liquify'
            ? 'Paint a reusable displacement mesh. Freeze regions to protect them and use Face controls for precise portrait adjustments.'
            : kind === 'wide-angle'
              ? 'Correct lens curvature, perspective, horizon, and framing with a live preview.'
              : 'Drag the four green plane corners, then adjust the projected clone offset and scale.'}
        </DialogDescription>
        <div className="distortion-workspace-body">
          <div className="distortion-preview-wrap">
            <canvas
              ref={previewRef}
              aria-label={`${kind ? title(kind) : 'Distortion'} live preview`}
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
            />
            <span>Live preview · drag directly on the image</span>
          </div>
          <aside className="distortion-controls">
            {kind === 'liquify' && (
              <>
                <label>
                  Tool
                  <select
                    aria-label="Liquify tool"
                    value={tool}
                    onChange={(event) =>
                      setTool(event.target.value as LiquifyTool)
                    }
                  >
                    <option value="forward">Forward Warp</option>
                    <option value="reconstruct">Reconstruct</option>
                    <option value="twirl">Twirl</option>
                    <option value="pucker">Pucker</option>
                    <option value="bloat">Bloat</option>
                    <option value="push">Push Left</option>
                    <option value="freeze">Freeze Mask</option>
                    <option value="thaw">Thaw Mask</option>
                  </select>
                </label>
                <SliderRow
                  label="Brush size"
                  value={radius}
                  min={5}
                  max={Math.max(20, Math.round(Math.min(width, height) / 2))}
                  onChange={setRadius}
                />
                <SliderRow
                  label="Pressure"
                  value={pressure}
                  min={1}
                  max={100}
                  onChange={setPressure}
                />
                <fieldset>
                  <legend>Face controls</legend>
                  {(Object.keys(defaultFace) as Array<keyof LiquifyFaceControls>).map(
                    (key) => (
                      <SliderRow
                        key={key}
                        label={key.replace(/([A-Z])/g, ' $1')}
                        value={face[key]}
                        min={-100}
                        max={100}
                        onChange={(value) =>
                          setFace((current) => ({ ...current, [key]: value }))
                        }
                      />
                    ),
                  )}
                </fieldset>
                <div className="distortion-inline-actions">
                  <Button variant="outline" size="sm" onClick={exportMesh}>
                    Export mesh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => importRef.current?.click()}
                  >
                    Import mesh
                  </Button>
                  <input
                    ref={importRef}
                    hidden
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) =>
                      void importMesh(event.target.files?.[0])
                    }
                  />
                </div>
              </>
            )}
            {kind === 'wide-angle' && (
              <>
                <SliderRow
                  label="Focal length"
                  value={wide.focalLength}
                  min={4}
                  max={600}
                  onChange={(value) =>
                    setWide((current) => ({ ...current, focalLength: value }))
                  }
                />
                <SliderRow
                  label="Crop factor"
                  value={wide.cropFactor}
                  min={0.1}
                  max={8}
                  step={0.1}
                  onChange={(value) =>
                    setWide((current) => ({ ...current, cropFactor: value }))
                  }
                />
                {(['distortion', 'vertical', 'horizontal', 'rotation'] as const).map(
                  (key) => (
                    <SliderRow
                      key={key}
                      label={key[0].toUpperCase() + key.slice(1)}
                      value={wide[key]}
                      min={key === 'rotation' ? -180 : -100}
                      max={key === 'rotation' ? 180 : 100}
                      onChange={(value) =>
                        setWide((current) => ({ ...current, [key]: value }))
                      }
                    />
                  ),
                )}
                <SliderRow
                  label="Scale"
                  value={wide.scale}
                  min={0.1}
                  max={4}
                  step={0.05}
                  onChange={(value) =>
                    setWide((current) => ({ ...current, scale: value }))
                  }
                />
              </>
            )}
            {kind === 'vanishing-point' && (
              <>
                <p className="geometry-help">
                  Drag each corner to establish the perspective plane.
                </p>
                <SliderRow
                  label="Plane offset X"
                  value={vanishing.cloneOffsetX}
                  min={-1}
                  max={1}
                  step={0.01}
                  onChange={(value) =>
                    setVanishing((current) => ({
                      ...current,
                      cloneOffsetX: value,
                    }))
                  }
                />
                <SliderRow
                  label="Plane offset Y"
                  value={vanishing.cloneOffsetY}
                  min={-1}
                  max={1}
                  step={0.01}
                  onChange={(value) =>
                    setVanishing((current) => ({
                      ...current,
                      cloneOffsetY: value,
                    }))
                  }
                />
                <SliderRow
                  label="Projected scale"
                  value={vanishing.scale}
                  min={0.1}
                  max={4}
                  step={0.05}
                  onChange={(value) =>
                    setVanishing((current) => ({ ...current, scale: value }))
                  }
                />
              </>
            )}
            {message && <p role="status">{message}</p>}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMesh(createLiquifyMesh(width, height));
                setFace(defaultFace);
                setWide(defaultWideAngleRecipe());
                setVanishing(defaultVanishingPointRecipe());
                setMessage('Workspace reset');
              }}
            >
              Reset
            </Button>
          </aside>
        </div>
        <div className="dialog-actions">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={apply}>Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
