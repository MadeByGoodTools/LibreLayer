'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type GeometryOperation =
  | {
      kind: 'transform';
      mode:
        | 'skew'
        | 'distort'
        | 'perspective'
        | 'warp'
        | 'mesh'
        | 'split'
        | 'cylindrical'
        | 'puppet'
        | 'perspective-warp'
        | 'preset-warp'
        | 'content-aware-scale';
      x: number;
      y: number;
      preset?: 'arc' | 'flag' | 'fisheye' | 'twist';
    }
  | {
      kind: 'crop';
      mode: 'crop-copy' | 'preset' | 'straighten' | 'perspective-crop';
      x: number;
      y: number;
      preset: string;
    }
  | { kind: 'image'; mode: 'trim' | 'rotate'; x: number; y: number };

const transformLabels = {
  skew: 'Skew',
  distort: 'Distort',
  perspective: 'Perspective',
  warp: 'Warp',
  mesh: 'Mesh Warp',
  split: 'Split Warp',
  cylindrical: 'Cylindrical Warp',
  puppet: 'Puppet Warp',
  'perspective-warp': 'Perspective Warp',
  'preset-warp': 'Warp Preset',
  'content-aware-scale': 'Content-Aware Scale',
};

export function ProfessionalGeometryDialog({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (operation: GeometryOperation) => void;
}) {
  const [tab, setTab] = useState('transform');
  const [transformMode, setTransformMode] =
    useState<keyof typeof transformLabels>('skew');
  const [cropMode, setCropMode] = useState<
    'crop-copy' | 'preset' | 'straighten' | 'perspective-crop'
  >('crop-copy');
  const [x, setX] = useState(12);
  const [y, setY] = useState(0);
  const [preset, setPreset] = useState('1:1');
  const [warpPreset, setWarpPreset] = useState<
    'arc' | 'flag' | 'fisheye' | 'twist'
  >('arc');
  useEffect(() => {
    if (open) {
      setX(12);
      setY(0);
    }
  }, [open]);
  const apply = () => {
    if (tab === 'transform')
      onApply({
        kind: 'transform',
        mode: transformMode,
        x,
        y,
        preset: transformMode === 'preset-warp' ? warpPreset : undefined,
      });
    else if (tab === 'crop')
      onApply({ kind: 'crop', mode: cropMode, x, y, preset });
    else onApply({ kind: 'image', mode: 'rotate', x, y });
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="professional-geometry-dialog">
        <DialogTitle>Professional geometry</DialogTitle>
        <DialogDescription>
          Apply advanced transforms and crop workflows to the active raster
          layer. Every operation creates one undo step.
        </DialogDescription>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="transform">Transform</TabsTrigger>
            <TabsTrigger value="crop">Crop</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
          </TabsList>
          <TabsContent value="transform">
            <label>
              Mode
              <select
                aria-label="Advanced transform mode"
                value={transformMode}
                onChange={(event) => {
                  const next = event.target
                    .value as keyof typeof transformLabels;
                  setTransformMode(next);
                  if (next === 'content-aware-scale') {
                    setX(100);
                    setY(100);
                  }
                }}
              >
                {Object.entries(transformLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {transformMode === 'preset-warp' && (
              <label>
                Preset
                <select
                  aria-label="Warp preset"
                  value={warpPreset}
                  onChange={(event) =>
                    setWarpPreset(event.target.value as typeof warpPreset)
                  }
                >
                  <option value="arc">Arc</option>
                  <option value="flag">Flag</option>
                  <option value="fisheye">Fisheye</option>
                  <option value="twist">Twist</option>
                </select>
              </label>
            )}
            <div className="geometry-number-grid">
              <label>
                {transformMode === 'content-aware-scale'
                  ? 'Width'
                  : 'Horizontal'}
                <input
                  aria-label="Transform horizontal amount"
                  type="number"
                  min={transformMode === 'content-aware-scale' ? 50 : -100}
                  max={transformMode === 'content-aware-scale' ? 200 : 100}
                  value={x}
                  onChange={(event) => setX(+event.target.value)}
                />
                {transformMode === 'content-aware-scale' ? '%' : ''}
              </label>
              <label>
                {transformMode === 'content-aware-scale'
                  ? 'Height'
                  : 'Vertical'}
                <input
                  aria-label="Transform vertical amount"
                  type="number"
                  min={transformMode === 'content-aware-scale' ? 50 : -100}
                  max={transformMode === 'content-aware-scale' ? 200 : 100}
                  value={
                    y || (transformMode === 'content-aware-scale' ? 100 : 0)
                  }
                  onChange={(event) => setY(+event.target.value)}
                />
                {transformMode === 'content-aware-scale' ? '%' : ''}
              </label>
            </div>
            <p className="geometry-help">
              Distort and perspective use two-axis corner displacement. Mesh,
              split, cylindrical, Puppet, and four named warp presets provide
              different editable deformation fields. Content-Aware Scale
              protects detailed pixels and the active selection.
            </p>
          </TabsContent>
          <TabsContent value="crop">
            <label>
              Workflow
              <select
                aria-label="Crop workflow"
                value={cropMode}
                onChange={(event) =>
                  setCropMode(event.target.value as typeof cropMode)
                }
              >
                <option value="crop-copy">Non-destructive crop copy</option>
                <option value="preset">Aspect-ratio crop preset</option>
                <option value="straighten">Straighten photo</option>
                <option value="perspective-crop">Perspective Crop</option>
              </select>
            </label>
            {cropMode === 'preset' ? (
              <label>
                Aspect ratio
                <select
                  aria-label="Crop aspect ratio"
                  value={preset}
                  onChange={(event) => setPreset(event.target.value)}
                >
                  <option value="1:1">Square · 1:1</option>
                  <option value="4:3">Photo · 4:3</option>
                  <option value="3:2">Camera · 3:2</option>
                  <option value="16:9">Widescreen · 16:9</option>
                  <option value="5:4">Print · 5:4</option>
                </select>
              </label>
            ) : (
              <div className="geometry-number-grid">
                <label>
                  {cropMode === 'straighten' ? 'Angle' : 'Top inset'}
                  <input
                    aria-label="Crop primary amount"
                    type="number"
                    min="-45"
                    max="45"
                    value={x}
                    onChange={(event) => setX(+event.target.value)}
                  />
                  °
                </label>
                {cropMode === 'perspective-crop' && (
                  <label>
                    Bottom inset
                    <input
                      aria-label="Crop secondary amount"
                      type="number"
                      min="-45"
                      max="45"
                      value={y}
                      onChange={(event) => setY(+event.target.value)}
                    />
                    °
                  </label>
                )}
              </div>
            )}
          </TabsContent>
          <TabsContent value="image">
            <label>
              Rotation
              <select
                aria-label="Rotate image"
                value={x}
                onChange={(event) => setX(+event.target.value)}
              >
                <option value="90">90° clockwise</option>
                <option value="-90">90° counter-clockwise</option>
                <option value="180">180°</option>
              </select>
            </label>
            <p className="geometry-help">
              Image rotation affects the whole layered document and preserves
              layer order, masks, and undo history.
            </p>
          </TabsContent>
        </Tabs>
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
