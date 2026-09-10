'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type NewDocumentOptions = {
  name: string;
  w: number;
  h: number;
  resolution: number;
  background: string;
};

type Preset = {
  id: string;
  name: string;
  detail: string;
  w: number;
  h: number;
  resolution: number;
};

const presetGroups: { id: string; label: string; presets: Preset[] }[] = [
  {
    id: 'photo',
    label: 'Photo',
    presets: [
      {
        id: 'photo-4x6',
        name: '4 × 6 in',
        detail: 'Landscape photo',
        w: 1800,
        h: 1200,
        resolution: 300,
      },
      {
        id: 'photo-5x7',
        name: '5 × 7 in',
        detail: 'Portrait photo',
        w: 1500,
        h: 2100,
        resolution: 300,
      },
      {
        id: 'photo-8x10',
        name: '8 × 10 in',
        detail: 'Portrait photo',
        w: 2400,
        h: 3000,
        resolution: 300,
      },
      {
        id: 'photo-dslr',
        name: 'DSLR 24 MP',
        detail: 'Standard 3:2 frame',
        w: 6000,
        h: 4000,
        resolution: 300,
      },
    ],
  },
  {
    id: 'print',
    label: 'Print',
    presets: [
      {
        id: 'print-letter',
        name: 'Letter',
        detail: '8.5 × 11 in',
        w: 2550,
        h: 3300,
        resolution: 300,
      },
      {
        id: 'print-legal',
        name: 'Legal',
        detail: '8.5 × 14 in',
        w: 2550,
        h: 4200,
        resolution: 300,
      },
      {
        id: 'print-a4',
        name: 'A4',
        detail: '210 × 297 mm',
        w: 2480,
        h: 3508,
        resolution: 300,
      },
      {
        id: 'print-a3',
        name: 'A3',
        detail: '297 × 420 mm',
        w: 3508,
        h: 4961,
        resolution: 300,
      },
      {
        id: 'print-tabloid',
        name: 'Tabloid',
        detail: '11 × 17 in',
        w: 3300,
        h: 5100,
        resolution: 300,
      },
    ],
  },
  {
    id: 'web',
    label: 'Web',
    presets: [
      {
        id: 'web-common',
        name: 'Web — Common',
        detail: 'Laptop and browser',
        w: 1366,
        h: 768,
        resolution: 72,
      },
      {
        id: 'web-large',
        name: 'Web — Large',
        detail: 'Large desktop',
        w: 1920,
        h: 1080,
        resolution: 72,
      },
      {
        id: 'web-banner',
        name: 'Web Banner',
        detail: 'Wide display banner',
        w: 1600,
        h: 400,
        resolution: 72,
      },
      {
        id: 'web-square',
        name: 'Square',
        detail: 'Social and web',
        w: 1080,
        h: 1080,
        resolution: 72,
      },
    ],
  },
  {
    id: 'mobile',
    label: 'Mobile',
    presets: [
      {
        id: 'mobile-iphone',
        name: 'iPhone Pro',
        detail: '1290 × 2796 px',
        w: 1290,
        h: 2796,
        resolution: 72,
      },
      {
        id: 'mobile-android',
        name: 'Android',
        detail: '1440 × 3200 px',
        w: 1440,
        h: 3200,
        resolution: 72,
      },
      {
        id: 'mobile-story',
        name: 'Story',
        detail: 'Vertical 9:16',
        w: 1080,
        h: 1920,
        resolution: 72,
      },
      {
        id: 'mobile-post',
        name: 'Portrait Post',
        detail: 'Social 4:5',
        w: 1080,
        h: 1350,
        resolution: 72,
      },
    ],
  },
  {
    id: 'film',
    label: 'Film & video',
    presets: [
      {
        id: 'film-hd',
        name: 'HDTV 720p',
        detail: '16:9 video',
        w: 1280,
        h: 720,
        resolution: 72,
      },
      {
        id: 'film-full-hd',
        name: 'HDTV 1080p',
        detail: 'Full HD 16:9',
        w: 1920,
        h: 1080,
        resolution: 72,
      },
      {
        id: 'film-uhd',
        name: 'UHD 4K',
        detail: 'Ultra HD 16:9',
        w: 3840,
        h: 2160,
        resolution: 72,
      },
      {
        id: 'film-cinema',
        name: 'Cinema 4K',
        detail: 'DCI wide frame',
        w: 4096,
        h: 2160,
        resolution: 72,
      },
      {
        id: 'film-vertical',
        name: 'Vertical Video',
        detail: 'Full HD 9:16',
        w: 1080,
        h: 1920,
        resolution: 72,
      },
    ],
  },
  {
    id: 'art',
    label: 'Art',
    presets: [
      {
        id: 'art-square',
        name: 'Square Canvas',
        detail: 'High-resolution art',
        w: 3000,
        h: 3000,
        resolution: 300,
      },
      {
        id: 'art-landscape',
        name: 'Landscape',
        detail: '4:3 illustration',
        w: 4000,
        h: 3000,
        resolution: 300,
      },
      {
        id: 'art-portrait',
        name: 'Portrait',
        detail: '3:4 illustration',
        w: 3000,
        h: 4000,
        resolution: 300,
      },
      {
        id: 'art-comic',
        name: 'Comic Page',
        detail: 'A4 print page',
        w: 2480,
        h: 3508,
        resolution: 300,
      },
    ],
  },
];

export function NewDocumentDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (options: NewDocumentOptions) => void;
}) {
  const [name, setName] = useState('Untitled artwork');
  const [w, setW] = useState('1366');
  const [h, setH] = useState('768');
  const [resolution, setResolution] = useState('72');
  const [backgroundMode, setBackgroundMode] = useState('transparent');
  const [customBackground, setCustomBackground] = useState('#ffffff');
  const [selectedPreset, setSelectedPreset] = useState('web-common');
  const [error, setError] = useState('');
  const valid =
    Number.isInteger(+w) &&
    Number.isInteger(+h) &&
    Number.isInteger(+resolution) &&
    +w > 0 &&
    +h > 0 &&
    +resolution >= 1 &&
    +resolution <= 1200 &&
    +w <= 16384 &&
    +h <= 16384 &&
    +w * +h <= 64000000;
  const megapixels = ((+w * +h) / 1_000_000).toFixed(1);
  const selectPreset = (preset: Preset) => {
    setW(String(preset.w));
    setH(String(preset.h));
    setResolution(String(preset.resolution));
    setSelectedPreset(preset.id);
    setError('');
  };
  const markCustom = () => {
    setSelectedPreset('');
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DialogTitle>New document</DialogTitle>
        <DialogDescription>
          Start from a familiar size or enter your own dimensions.
        </DialogDescription>
        <form
          className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            try {
              onCreate({
                name: name.trim() || 'Untitled artwork',
                w: +w,
                h: +h,
                resolution: +resolution,
                background:
                  backgroundMode === 'custom'
                    ? customBackground
                    : backgroundMode,
              });
              setError('');
              onOpenChange(false);
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : 'Could not create this document. Try smaller dimensions.',
              );
            }
          }}
        >
          <section className="min-w-0">
            <Tabs defaultValue="web">
              <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1 sm:grid-cols-6">
                {presetGroups.map((group) => (
                  <TabsTrigger
                    key={group.id}
                    value={group.id}
                    className="h-9 px-2"
                  >
                    {group.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {presetGroups.map((group) => (
                <TabsContent key={group.id} value={group.id} className="pt-3">
                  <div
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    aria-label={`${group.label} document presets`}
                  >
                    {group.presets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        aria-pressed={selectedPreset === preset.id}
                        className="rounded-lg border bg-background p-3 text-left transition hover:border-primary/60 hover:bg-muted/50 aria-pressed:border-primary aria-pressed:bg-primary/10"
                        onClick={() => selectPreset(preset)}
                      >
                        <span className="block font-medium">{preset.name}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">
                          {preset.detail}
                        </span>
                        <span className="mt-2 block text-sm text-foreground/80">
                          {preset.w.toLocaleString()} ×{' '}
                          {preset.h.toLocaleString()} px · {preset.resolution}{' '}
                          ppi
                        </span>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </section>

          <section className="grid content-start gap-4 rounded-xl border bg-muted/25 p-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Name
              <input
                autoFocus
                className="rounded-md border bg-background p-2 font-normal"
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1.5 text-sm font-medium">
                Width
                <input
                  required
                  className="min-w-0 rounded-md border bg-background p-2 font-normal"
                  type="number"
                  min={1}
                  max={16384}
                  step={1}
                  value={w}
                  onChange={(e) => {
                    setW(e.target.value);
                    markCustom();
                  }}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Height
                <input
                  required
                  className="min-w-0 rounded-md border bg-background p-2 font-normal"
                  type="number"
                  min={1}
                  max={16384}
                  step={1}
                  value={h}
                  onChange={(e) => {
                    setH(e.target.value);
                    markCustom();
                  }}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={+h >= +w ? 'secondary' : 'outline'}
                className="flex-1"
                onClick={() => {
                  if (+w > +h) {
                    setW(h);
                    setH(w);
                    markCustom();
                  }
                }}
              >
                Portrait
              </Button>
              <Button
                type="button"
                variant={+w > +h ? 'secondary' : 'outline'}
                className="flex-1"
                onClick={() => {
                  if (+h > +w) {
                    setW(h);
                    setH(w);
                    markCustom();
                  }
                }}
              >
                Landscape
              </Button>
            </div>
            <label className="grid gap-1.5 text-sm font-medium">
              Resolution
              <span className="flex items-center gap-2">
                <input
                  required
                  className="min-w-0 flex-1 rounded-md border bg-background p-2 font-normal"
                  type="number"
                  min={1}
                  max={1200}
                  step={1}
                  value={resolution}
                  onChange={(e) => {
                    setResolution(e.target.value);
                    markCustom();
                  }}
                />
                <span className="font-normal text-muted-foreground">ppi</span>
              </span>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Background
              <select
                className="rounded-md border bg-background p-2 font-normal"
                value={backgroundMode}
                onChange={(e) => setBackgroundMode(e.target.value)}
              >
                <option value="transparent">Transparent</option>
                <option value="#ffffff">White</option>
                <option value="#000000">Black</option>
                <option value="custom">Custom color</option>
              </select>
            </label>
            {backgroundMode === 'custom' ? (
              <label className="flex items-center justify-between text-sm font-medium">
                Custom color
                <input
                  type="color"
                  aria-label="Custom document background color"
                  value={customBackground}
                  onChange={(e) => setCustomBackground(e.target.value)}
                />
              </label>
            ) : null}
            <div className="rounded-lg border bg-background p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Color</span>
                <span>RGB · 8 bit</span>
              </div>
              <div className="mt-1 flex justify-between gap-3">
                <span className="text-muted-foreground">Canvas</span>
                <span>
                  {Number.isFinite(+megapixels) ? megapixels : '—'} MP
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Maximum 16,384 px per side and 64 megapixels total.
            </p>
            {!valid ? (
              <p role="alert" className="text-sm text-destructive">
                Enter whole-number dimensions and a resolution within these
                limits.
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!valid}>
                Create
              </Button>
            </div>
          </section>
        </form>
      </DialogContent>
    </Dialog>
  );
}
