'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { openPagedImage, type PagedImage } from '@/lib/paged-image-import';
export function PagedImportDialog({
  file,
  onClose,
  onImport,
  onImportLayers,
  onCheck,
}: {
  onCheck?: (w: number, h: number) => void;
  file: File | null;
  onClose: () => void;
  onImport: (canvas: HTMLCanvasElement, name: string) => void;
  onImportLayers?: (
    pages: { canvas: HTMLCanvasElement; name: string }[],
    name: string,
  ) => void;
}) {
  const [source, setSource] = useState<PagedImage | null>(null),
    [page, setPage] = useState(1),
    [dpi, setDpi] = useState(144),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    const run = ++generation.current;
    let opened: PagedImage | null = null;
    setSource(null);
    setError('');
    setBusy(false);
    setPage(1);
    if (file)
      void openPagedImage(file)
        .then((s) => {
          opened = s;
          if (generation.current === run) setSource(s);
          else s.close();
        })
        .catch((e) => {
          if (generation.current === run)
            setError(
              e instanceof Error ? e.message : 'Could not read this file.',
            );
        });
    return () => {
      generation.current++;
      opened?.close();
    };
  }, [file]);
  const pdf =
    file?.type === 'application/pdf' || /\.pdf$/i.test(file?.name ?? '');
  return (
    <Dialog
      open={!!file}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent onKeyDown={(e) => e.stopPropagation()}>
        <DialogTitle>Open {pdf ? 'PDF' : 'TIFF'} page</DialogTitle>
        <DialogDescription>
          Each selected page opens as a new raster document. Text, vectors and
          original layers are flattened; your source file is unchanged.
        </DialogDescription>
        {source ? (
          <>
            <p>
              {source.count} pages · {file?.name}
              {!pdf && source.bitDepth ? ` · ${source.bitDepth}-bit` : ''}
            </p>
            {!pdf && source.bitDepth === 16 && (
              <p>
                The 16-bit source is converted for LibreLayer&apos;s current
                8-bit canvas display. The original TIFF is unchanged.
              </p>
            )}
            <label>
              Page
              <input
                className="block border rounded p-2 w-full"
                type="number"
                min={1}
                max={source.count}
                value={page}
                onChange={(e) => setPage(+e.target.value)}
              />
            </label>
            {pdf && (
              <label>
                Resolution (pixels per inch)
                <input
                  className="block border rounded p-2 w-full"
                  type="number"
                  min={36}
                  max={300}
                  value={dpi}
                  onChange={(e) => setDpi(+e.target.value)}
                />
              </label>
            )}
            <Button
              disabled={
                busy ||
                !Number.isInteger(page) ||
                page < 1 ||
                page > source.count ||
                !Number.isFinite(dpi) ||
                dpi < 36 ||
                dpi > 300
              }
              onClick={async () => {
                const run = generation.current;
                setBusy(true);
                setError('');
                try {
                  const canvas = await source.render(page, dpi, onCheck);
                  if (run !== generation.current) return;
                  onImport(canvas, `${file?.name} — page ${page}`);
                  onClose();
                } catch (e) {
                  if (run === generation.current)
                    setError(
                      e instanceof Error
                        ? e.message
                        : 'Page could not be imported.',
                    );
                } finally {
                  if (run === generation.current) setBusy(false);
                }
              }}
            >
              {busy ? 'Opening…' : 'Open page'}
            </Button>
            {!pdf && source.count > 1 && onImportLayers && (
              <Button
                variant="outline"
                disabled={busy || source.count > 100}
                onClick={async () => {
                  const run = generation.current;
                  setBusy(true);
                  setError('');
                  try {
                    const pages: {
                      canvas: HTMLCanvasElement;
                      name: string;
                    }[] = [];
                    let width = 0,
                      height = 0;
                    for (let index = 1; index <= source.count; index++) {
                      const canvas = await source.render(index, dpi, onCheck);
                      if (run !== generation.current) return;
                      if (!width) {
                        width = canvas.width;
                        height = canvas.height;
                      } else if (
                        canvas.width !== width ||
                        canvas.height !== height
                      )
                        throw Error(
                          'Layered TIFF pages must share the same dimensions.',
                        );
                      pages.push({
                        canvas,
                        name: source.pageNames?.[index - 1] ?? `Layer ${index}`,
                      });
                    }
                    onImportLayers(pages, file?.name ?? 'Layered TIFF');
                    onClose();
                  } catch (e) {
                    if (run === generation.current)
                      setError(
                        e instanceof Error
                          ? e.message
                          : 'TIFF layers could not be imported.',
                      );
                  } finally {
                    if (run === generation.current) setBusy(false);
                  }
                }}
              >
                {busy ? 'Opening layers…' : 'Open all pages as layers'}
              </Button>
            )}
          </>
        ) : (
          !error && <p>Reading document…</p>
        )}
        {error && <p role="alert">{error}</p>}
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
