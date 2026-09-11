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
import {
  defaultLayerEffects,
  normalizeLayerEffects,
  type LayerEffects,
} from '@/lib/layer-effects';
export type { LayerEffects } from '@/lib/layer-effects';

export type LayerStudioOperation =
  | {
      kind: 'adjustment';
      mode:
        | 'channel-mixer'
        | 'selective-color'
        | 'gradient-map'
        | 'color-lookup'
        | 'posterize'
        | 'threshold'
        | 'clarity'
        | 'dehaze'
        | 'grain';
      amount: number;
      secondary: number;
      color: string;
      color2: string;
    }
  | {
      kind: 'fill';
      mode: 'solid' | 'gradient' | 'pattern';
      color: string;
      color2: string;
      masked: boolean;
    }
  | { kind: 'effects'; effects: LayerEffects };

const effectLabels: [keyof LayerEffects, string][] = [
  ['dropShadow', 'Drop Shadow'],
  ['innerShadow', 'Inner Shadow'],
  ['outerGlow', 'Outer Glow'],
  ['innerGlow', 'Inner Glow'],
  ['bevel', 'Bevel & Emboss'],
  ['satin', 'Satin'],
  ['colorOverlay', 'Color Overlay'],
  ['gradientOverlay', 'Gradient Overlay'],
  ['patternOverlay', 'Pattern Overlay'],
  ['stroke', 'Stroke'],
];

export function LayerStudioDialog({
  open,
  onClose,
  onApply,
  initialEffects,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (operation: LayerStudioOperation) => void;
  initialEffects?: LayerEffects;
}) {
  const [tab, setTab] = useState('adjustment');
  const [adjustment, setAdjustment] =
    useState<Extract<LayerStudioOperation, { kind: 'adjustment' }>['mode']>(
      'channel-mixer',
    );
  const [fill, setFill] = useState<'solid' | 'gradient' | 'pattern'>('solid');
  const [amount, setAmount] = useState(35);
  const [secondary, setSecondary] = useState(0);
  const [color, setColor] = useState('#173a63');
  const [color2, setColor2] = useState('#f6c453');
  const [masked, setMasked] = useState(false);
  const [effects, setEffects] = useState(defaultLayerEffects);
  useEffect(() => {
    if (open) {
      setAmount(35);
      setSecondary(0);
      setEffects(normalizeLayerEffects(initialEffects));
    }
  }, [initialEffects, open]);
  const apply = () => {
    if (tab === 'adjustment')
      onApply({
        kind: 'adjustment',
        mode: adjustment,
        amount,
        secondary,
        color,
        color2,
      });
    else if (tab === 'fill')
      onApply({ kind: 'fill', mode: fill, color, color2, masked });
    else onApply({ kind: 'effects', effects: normalizeLayerEffects(effects) });
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="layer-studio-dialog">
        <DialogTitle>Layer Studio</DialogTitle>
        <DialogDescription>
          Create color and fill layers or apply editable effects to the active
          layer. Every change is recorded in History.
        </DialogDescription>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="adjustment">Adjustments</TabsTrigger>
            <TabsTrigger value="fill">Fill layers</TabsTrigger>
            <TabsTrigger value="effects">Layer effects</TabsTrigger>
          </TabsList>
          <TabsContent value="adjustment">
            <label>
              Adjustment
              <select
                aria-label="Layer Studio adjustment"
                value={adjustment}
                onChange={(event) =>
                  setAdjustment(event.target.value as typeof adjustment)
                }
              >
                <option value="channel-mixer">Channel Mixer</option>
                <option value="selective-color">Selective Color</option>
                <option value="gradient-map">Gradient Map</option>
                <option value="color-lookup">Color Lookup</option>
                <option value="posterize">Posterize</option>
                <option value="threshold">Threshold</option>
                <option value="clarity">Clarity</option>
                <option value="dehaze">Dehaze</option>
                <option value="grain">Grain</option>
              </select>
            </label>
            <div className="studio-control-grid">
              <label>
                {adjustment === 'posterize'
                  ? 'Levels'
                  : adjustment === 'threshold'
                    ? 'Threshold'
                    : 'Amount'}
                <input
                  aria-label="Adjustment amount"
                  type="number"
                  min={adjustment === 'posterize' ? 2 : -100}
                  max={
                    adjustment === 'posterize'
                      ? 32
                      : adjustment === 'threshold'
                        ? 255
                        : 100
                  }
                  value={amount}
                  onChange={(event) => setAmount(+event.target.value)}
                />
              </label>
              {(adjustment === 'channel-mixer' ||
                adjustment === 'selective-color') && (
                <label>
                  Secondary channel
                  <input
                    aria-label="Adjustment secondary amount"
                    type="number"
                    min="-100"
                    max="100"
                    value={secondary}
                    onChange={(event) => setSecondary(+event.target.value)}
                  />
                </label>
              )}
            </div>
            {(adjustment === 'gradient-map' ||
              adjustment === 'color-lookup') && (
              <div className="studio-color-grid">
                <label>
                  Shadow color
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                  />
                </label>
                <label>
                  Highlight color
                  <input
                    type="color"
                    value={color2}
                    onChange={(event) => setColor2(event.target.value)}
                  />
                </label>
              </div>
            )}
          </TabsContent>
          <TabsContent value="fill">
            <label>
              Fill type
              <select
                aria-label="Fill layer type"
                value={fill}
                onChange={(event) => setFill(event.target.value as typeof fill)}
              >
                <option value="solid">Solid Color</option>
                <option value="gradient">Gradient</option>
                <option value="pattern">Pattern</option>
              </select>
            </label>
            <div className="studio-color-grid">
              <label>
                Primary color
                <input
                  aria-label="Fill primary color"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                />
              </label>
              {fill !== 'solid' && (
                <label>
                  Secondary color
                  <input
                    aria-label="Fill secondary color"
                    type="color"
                    value={color2}
                    onChange={(event) => setColor2(event.target.value)}
                  />
                </label>
              )}
            </div>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={masked}
                onChange={(event) => setMasked(event.target.checked)}
              />
              Add a white editable adjustment mask
            </label>
          </TabsContent>
          <TabsContent value="effects">
            <div className="effect-check-grid">
              {effectLabels.map(([key, label]) => (
                <label className="inline-check" key={key}>
                  <input
                    type="checkbox"
                    checked={Boolean(effects[key])}
                    onChange={(event) =>
                      setEffects((current) => ({
                        ...current,
                        [key]: event.target.checked,
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="studio-control-grid">
              <label>
                Effect color
                <input
                  aria-label="Layer effect color"
                  type="color"
                  value={effects.color}
                  onChange={(event) =>
                    setEffects((current) => ({
                      ...current,
                      color: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Secondary color
                <input
                  aria-label="Layer effect secondary color"
                  type="color"
                  value={effects.secondaryColor}
                  onChange={(event) =>
                    setEffects((current) => ({
                      ...current,
                      secondaryColor: event.target.value,
                    }))
                  }
                />
              </label>
              {(['opacity', 'size', 'distance'] as const).map((key) => (
                <label key={key}>
                  {key[0].toUpperCase() + key.slice(1)}
                  <input
                    aria-label={`Effect ${key}`}
                    type="number"
                    min={key === 'opacity' ? 0 : 1}
                    max={key === 'opacity' ? 100 : 100}
                    value={effects[key]}
                    onChange={(event) =>
                      setEffects((current) => ({
                        ...current,
                        [key]: +event.target.value,
                      }))
                    }
                  />
                </label>
              ))}
              <label>
                Light angle
                <input
                  aria-label="Layer effect light angle"
                  type="number"
                  min="-360"
                  max="360"
                  value={effects.angle}
                  onChange={(event) =>
                    setEffects((current) => ({
                      ...current,
                      angle: +event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Effect scale %
                <input
                  aria-label="Layer effect scale"
                  type="number"
                  min="1"
                  max="1000"
                  value={effects.scale}
                  onChange={(event) =>
                    setEffects((current) => ({
                      ...current,
                      scale: +event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Contour
                <select
                  aria-label="Layer effect contour"
                  value={effects.contour}
                  onChange={(event) =>
                    setEffects((current) => ({
                      ...current,
                      contour: event.target.value as LayerEffects['contour'],
                    }))
                  }
                >
                  <option value="linear">Linear</option>
                  <option value="smooth">Smooth</option>
                  <option value="cone">Cone</option>
                  <option value="ring">Ring</option>
                </select>
              </label>
            </div>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={effects.useGlobalLight}
                onChange={(event) =>
                  setEffects((current) => ({
                    ...current,
                    useGlobalLight: event.target.checked,
                  }))
                }
              />
              Use shared global light angle
            </label>
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
