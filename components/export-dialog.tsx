'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  encodeImage,
  encodeRawTiff16,
  type ExportColorSpace,
  type ExportFormat,
  type HighPrecisionRawSource,
} from '@/lib/image-export';

const colorSpaceNames: Record<ExportColorSpace, string> = {
  srgb: 'sRGB — web and general use',
  'display-p3': 'Display P3 — modern wide-gamut displays',
  'adobe-rgb': 'Adobe RGB (1998) — print workflows',
  'prophoto-rgb': 'ProPhoto RGB — wide-gamut handoff',
};

const exportPreferenceKey = 'librelayer-export-preferences';

export function ExportDialog({
  source,
  highPrecision,
  highPrecisionLoading = false,
  name,
  onClose,
}: {
  source: HTMLCanvasElement | null;
  highPrecision?: HighPrecisionRawSource | null;
  highPrecisionLoading?: boolean;
  name: string;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState(1);
  const [matte, setMatte] = useState('transparent');
  const [colorSpace, setColorSpace] = useState<ExportColorSpace>('srgb');
  const [resolution, setResolution] = useState(300);
  const [tiffDepth, setTiffDepth] = useState<8 | 16>(8);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preferencesReady, setPreferencesReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(exportPreferenceKey) || 'null',
      ) as Record<string, unknown> | null;
      if (
        saved &&
        ['png', 'jpeg', 'webp', 'tiff', 'pdf'].includes(String(saved.format))
      )
        setFormat(saved.format as ExportFormat);
      if (saved && [0.25, 0.5, 1, 2].includes(Number(saved.scale)))
        setScale(Number(saved.scale));
      if (
        saved &&
        Number.isFinite(Number(saved.quality)) &&
        Number(saved.quality) >= 1 &&
        Number(saved.quality) <= 100
      )
        setQuality(Number(saved.quality));
      if (
        saved &&
        ['transparent', '#ffffff', '#000000'].includes(String(saved.matte))
      )
        setMatte(String(saved.matte));
      if (saved && Object.hasOwn(colorSpaceNames, String(saved.colorSpace)))
        setColorSpace(saved.colorSpace as ExportColorSpace);
      if (
        saved &&
        Number.isInteger(Number(saved.resolution)) &&
        Number(saved.resolution) >= 36 &&
        Number(saved.resolution) <= 2400
      )
        setResolution(Number(saved.resolution));
      if (saved && [8, 16].includes(Number(saved.tiffDepth)))
        setTiffDepth(Number(saved.tiffDepth) as 8 | 16);
    } catch {
      // Keep safe defaults when browser storage is unavailable or contains old data.
    }
    setPreferencesReady(true);
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    try {
      localStorage.setItem(
        exportPreferenceKey,
        JSON.stringify({
          format,
          quality,
          scale,
          matte,
          colorSpace,
          resolution,
          tiffDepth,
        }),
      );
    } catch {
      // Export remains available when browser storage is disabled.
    }
  }, [
    colorSpace,
    format,
    matte,
    preferencesReady,
    quality,
    resolution,
    scale,
    tiffDepth,
  ]);

  useEffect(() => {
    if (source && !highPrecision && !highPrecisionLoading && tiffDepth === 16)
      setTiffDepth(8);
  }, [highPrecision, highPrecisionLoading, source, tiffDepth]);

  const raw16 = format === 'tiff' && tiffDepth === 16;

  return (
    <Dialog
      open={!!source}
      onOpenChange={(open) => {
        if (!open && !busy) {
          setError('');
          onClose();
        }
      }}
    >
      <DialogContent
        className="sm:max-w-lg"
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DialogTitle>Export image</DialogTitle>
        <DialogDescription>
          Exports the visible artwork. Save a layered project to keep editing.
        </DialogDescription>
        <label className="grid gap-1">
          Format
          <select
            className="border rounded p-2 bg-background"
            value={format}
            onChange={(event) => setFormat(event.target.value as ExportFormat)}
          >
            {['png', 'jpeg', 'webp', 'tiff', 'pdf'].map((item) => (
              <option key={item} value={item}>
                {item.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          Size
          <select
            className="border rounded p-2 bg-background"
            value={scale}
            disabled={raw16}
            onChange={(event) => setScale(+event.target.value)}
          >
            {[0.25, 0.5, 1, 2].map((item) => (
              <option key={item} value={item}>
                {item * 100}%
              </option>
            ))}
          </select>
        </label>
        <p>
          {raw16 && highPrecision
            ? highPrecision.image.width
            : source
              ? Math.round(source.width * scale)
              : 0}{' '}
          ×{' '}
          {raw16 && highPrecision
            ? highPrecision.image.height
            : source
              ? Math.round(source.height * scale)
              : 0}{' '}
          pixels
        </p>
        {['jpeg', 'webp', 'pdf'].includes(format) && (
          <label className="grid gap-1">
            Quality
            <input
              className="border rounded p-2"
              type="number"
              min={1}
              max={100}
              value={quality}
              onChange={(event) => setQuality(+event.target.value)}
            />
          </label>
        )}
        <label className="grid gap-1">
          Background
          <select
            className="border rounded p-2 bg-background"
            value={matte}
            disabled={raw16}
            onChange={(event) => setMatte(event.target.value)}
          >
            <option value="transparent">
              Transparent (white for JPEG/PDF)
            </option>
            <option value="#ffffff">White</option>
            <option value="#000000">Black</option>
          </select>
        </label>
        {format === 'tiff' && (
          <>
            <label className="grid gap-1">
              Bit depth
              <select
                className="border rounded p-2 bg-background"
                value={tiffDepth}
                onChange={(event) =>
                  setTiffDepth(Number(event.target.value) as 8 | 16)
                }
              >
                <option value={8}>8-bit composited artwork</option>
                <option value={16} disabled={!highPrecision}>
                  {highPrecisionLoading
                    ? '16-bit RAW master — preparing…'
                    : highPrecision
                      ? '16-bit RAW master — selected Smart Object'
                      : '16-bit RAW master — select a RAW Smart Object'}
                </option>
              </select>
            </label>
            <label className="grid gap-1">
              Color profile
              <select
                className="border rounded p-2 bg-background"
                value={colorSpace}
                onChange={(event) =>
                  setColorSpace(event.target.value as ExportColorSpace)
                }
              >
                {Object.entries(colorSpaceNames).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              Resolution (pixels per inch)
              <input
                className="border rounded p-2"
                type="number"
                min={36}
                max={2400}
                value={resolution}
                onChange={(event) => setResolution(+event.target.value)}
              />
            </label>
            {raw16 ? (
              <p>
                True 16-bit RGB TIFF developed directly from the scene-linear
                RAW master with an embedded{' '}
                {colorSpaceNames[colorSpace].split(' — ')[0]} profile. It uses
                full sensor resolution and the saved Camera Raw settings; other
                layers and Smart Filters are not included.
              </p>
            ) : (
              <p>
                Uncompressed 8-bit RGBA TIFF with embedded{' '}
                {colorSpaceNames[colorSpace].split(' — ')[0]} profile.
                Transparency and resolution metadata are preserved.
              </p>
            )}
          </>
        )}
        {format === 'pdf' && (
          <p>
            One flattened, JPEG-compressed page at 96 pixels per inch. No
            editable text, layers or print color profiles.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        <Button
          disabled={
            busy ||
            !Number.isFinite(quality) ||
            quality < 1 ||
            quality > 100 ||
            (format === 'tiff' &&
              (!Number.isInteger(resolution) ||
                resolution < 36 ||
                resolution > 2400)) ||
            (raw16 && !highPrecision)
          }
          onClick={async () => {
            if (!source) return;
            setBusy(true);
            setError('');
            try {
              const blob =
                raw16 && highPrecision
                  ? encodeRawTiff16(highPrecision, {
                      colorSpace,
                      resolution,
                    })
                  : await encodeImage(source, format, quality, scale, matte, {
                      colorSpace,
                      resolution,
                    });
              const url = URL.createObjectURL(blob),
                anchor = document.createElement('a');
              anchor.href = url;
              anchor.download =
                (name.replace(/\.[^.]+$/, '') || 'Artwork') +
                '.' +
                (format === 'jpeg'
                  ? 'jpg'
                  : format === 'tiff'
                    ? 'tif'
                    : format);
              anchor.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              onClose();
            } catch (reason) {
              setError(
                reason instanceof Error ? reason.message : 'Export failed.',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? 'Exporting…' : 'Download image'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
