'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  defaultPrintSettings,
  normalizePrintSettings,
  paperSizeMm,
  PAPER_PRESETS,
  type PrintSettings,
} from '@/lib/print-layout';
import { renderPrintSheet, type PrintCanvasSource } from '@/lib/print-render';

const STORAGE_KEY = 'librelayer-print-settings-v1';

const downloadCanvas = (canvas: HTMLCanvasElement, name: string) =>
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');

export function PrintStudioDialog({
  open,
  sources,
  onClose,
}: {
  open: boolean;
  sources: PrintCanvasSource[];
  onClose: () => void;
}) {
  const previewRef = useRef<HTMLCanvasElement>(null),
    [settings, setSettings] = useState(defaultPrintSettings),
    [status, setStatus] = useState(
      'Print settings are saved on this browser profile.',
    );
  useEffect(() => {
    try {
      setSettings(
        normalizePrintSettings(
          JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'),
        ),
      );
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);
  useEffect(() => {
    if (!open || !sources.length || !previewRef.current) return;
    try {
      const { canvas } = renderPrintSheet(sources, settings, 72),
        preview = previewRef.current,
        context = preview.getContext('2d')!;
      preview.width = canvas.width;
      preview.height = canvas.height;
      context.drawImage(canvas, 0, 0);
      canvas.width = canvas.height = 1;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setStatus('Live print preview updated');
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Print preview failed.',
      );
    }
  }, [open, settings, sources]);
  const update = (patch: Partial<PrintSettings>) =>
      setSettings((current) =>
        normalizePrintSettings({ ...current, ...patch }),
      ),
    paper = paperSizeMm(settings),
    print = () => {
      try {
        const { canvas } = renderPrintSheet(sources, settings, 144),
          data = canvas.toDataURL('image/png'),
          popup = window.open('', 'librelayer-print', 'width=900,height=900');
        canvas.width = canvas.height = 1;
        if (!popup) {
          setStatus(
            'The browser blocked the print window. Allow pop-ups and try again.',
          );
          return;
        }
        let printRequested = false;
        const requestPrint = () => {
          if (printRequested) return;
          printRequested = true;
          popup.focus();
          popup.print();
        };
        popup.document.open();
        popup.document.write(
          `<!doctype html><title>LibreLayer print proof</title><style>@page{size:${paper.widthMm}mm ${paper.heightMm}mm;margin:0}html,body{margin:0;background:white}img{display:block;width:${paper.widthMm}mm;height:${paper.heightMm}mm}</style><img id="librelayer-proof" alt="LibreLayer print proof">`,
        );
        popup.document.close();
        const proof = popup.document.getElementById(
          'librelayer-proof',
        ) as HTMLImageElement | null;
        if (!proof)
          throw new Error('The print proof window could not be prepared.');
        proof.addEventListener('load', requestPrint, { once: true });
        proof.src = data;
        if (proof.complete) requestPrint();
        setStatus('Print proof opened with the selected paper size');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Printing failed.');
      }
    };
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="print-studio-dialog"
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DialogTitle>Print Studio</DialogTitle>
        <DialogDescription>
          Prepare a measured browser print proof with persistent paper,
          placement, bleed, marks, captions, and color-handling notes.
        </DialogDescription>
        <div className="print-studio-layout">
          <div className="print-preview-wrap">
            <canvas ref={previewRef} aria-label="Live print sheet preview" />
            <span>
              {paper.widthMm.toFixed(1)} × {paper.heightMm.toFixed(1)} mm ·{' '}
              {sources.length} open{' '}
              {sources.length === 1 ? 'document' : 'documents'}
            </span>
          </div>
          <div className="print-controls">
            <fieldset>
              <legend>Page</legend>
              <label>
                Layout
                <select
                  value={settings.mode}
                  onChange={(event) =>
                    update({
                      mode: event.target.value as PrintSettings['mode'],
                    })
                  }
                >
                  <option value="single">Current document</option>
                  <option value="contact-sheet">
                    Open-document contact sheet
                  </option>
                </select>
              </label>
              <label>
                Paper
                <select
                  value={settings.paper}
                  onChange={(event) =>
                    update({
                      paper: event.target.value as PrintSettings['paper'],
                    })
                  }
                >
                  {Object.entries(PAPER_PRESETS).map(([id, preset]) => (
                    <option key={id} value={id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Orientation
                <select
                  value={settings.orientation}
                  onChange={(event) =>
                    update({
                      orientation: event.target
                        .value as PrintSettings['orientation'],
                    })
                  }
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </label>
              {settings.paper === 'custom' ? (
                <>
                  <label>
                    Width mm
                    <input
                      type="number"
                      min={50}
                      max={1200}
                      value={settings.customWidthMm}
                      onChange={(event) =>
                        update({ customWidthMm: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Height mm
                    <input
                      type="number"
                      min={50}
                      max={1200}
                      value={settings.customHeightMm}
                      onChange={(event) =>
                        update({ customHeightMm: Number(event.target.value) })
                      }
                    />
                  </label>
                </>
              ) : null}
              <label>
                Margin mm
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={settings.marginMm}
                  onChange={(event) =>
                    update({ marginMm: Number(event.target.value) })
                  }
                />
              </label>
              <label>
                Bleed mm
                <input
                  type="number"
                  min={0}
                  max={25}
                  step={0.1}
                  value={settings.bleedMm}
                  onChange={(event) =>
                    update({ bleedMm: Number(event.target.value) })
                  }
                />
              </label>
            </fieldset>
            {settings.mode === 'single' ? (
              <fieldset>
                <legend>Image size &amp; placement</legend>
                <label>
                  Sizing
                  <select
                    value={settings.scaleMode}
                    onChange={(event) =>
                      update({
                        scaleMode: event.target
                          .value as PrintSettings['scaleMode'],
                      })
                    }
                  >
                    <option value="fit">Fit inside trim</option>
                    <option value="fill">Fill through bleed</option>
                    <option value="actual">Actual size from PPI</option>
                    <option value="custom">Custom percent of fit</option>
                  </select>
                </label>
                {settings.scaleMode === 'actual' ? (
                  <label>
                    Source PPI
                    <input
                      type="number"
                      min={36}
                      max={2400}
                      value={settings.sourcePpi}
                      onChange={(event) =>
                        update({ sourcePpi: Number(event.target.value) })
                      }
                    />
                  </label>
                ) : null}
                {settings.scaleMode === 'custom' ? (
                  <label>
                    Scale %
                    <input
                      type="number"
                      min={10}
                      max={800}
                      value={settings.scalePercent}
                      onChange={(event) =>
                        update({ scalePercent: Number(event.target.value) })
                      }
                    />
                  </label>
                ) : null}
                <label>
                  Placement
                  <select
                    value={settings.placement}
                    onChange={(event) =>
                      update({
                        placement: event.target
                          .value as PrintSettings['placement'],
                      })
                    }
                  >
                    <option value="center">Centered</option>
                    <option value="top-left">Top left</option>
                    <option value="custom">Custom offset</option>
                  </select>
                </label>
                <label>
                  Offset X mm
                  <input
                    type="number"
                    min={-1000}
                    max={1000}
                    step={0.1}
                    value={settings.offsetXmm}
                    onChange={(event) =>
                      update({ offsetXmm: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  Offset Y mm
                  <input
                    type="number"
                    min={-1000}
                    max={1000}
                    step={0.1}
                    value={settings.offsetYmm}
                    onChange={(event) =>
                      update({ offsetYmm: Number(event.target.value) })
                    }
                  />
                </label>
              </fieldset>
            ) : (
              <fieldset>
                <legend>Contact sheet</legend>
                <label>
                  Columns
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={settings.columns}
                    onChange={(event) =>
                      update({ columns: Number(event.target.value) })
                    }
                  />
                </label>
                <label>
                  Gap mm
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.1}
                    value={settings.gapMm}
                    onChange={(event) =>
                      update({ gapMm: Number(event.target.value) })
                    }
                  />
                </label>
              </fieldset>
            )}
            <fieldset>
              <legend>Marks &amp; metadata</legend>
              <label className="print-check">
                <input
                  type="checkbox"
                  checked={settings.cropMarks}
                  onChange={(event) =>
                    update({ cropMarks: event.target.checked })
                  }
                />{' '}
                Trim marks
              </label>
              <label className="print-check">
                <input
                  type="checkbox"
                  checked={settings.registrationMarks}
                  onChange={(event) =>
                    update({ registrationMarks: event.target.checked })
                  }
                />{' '}
                Registration marks
              </label>
              <label className="print-check">
                <input
                  type="checkbox"
                  checked={settings.colorBars}
                  onChange={(event) =>
                    update({ colorBars: event.target.checked })
                  }
                />{' '}
                Color bars
              </label>
              <label className="print-check">
                <input
                  type="checkbox"
                  checked={settings.metadata}
                  onChange={(event) =>
                    update({ metadata: event.target.checked })
                  }
                />{' '}
                Filename and profile
              </label>
              <label>
                Job note / copyright
                <input
                  value={settings.metadataText}
                  maxLength={240}
                  onChange={(event) =>
                    update({ metadataText: event.target.value })
                  }
                />
              </label>
            </fieldset>
            <fieldset>
              <legend>Color handling</legend>
              <label>
                Printer profile
                <select
                  value={settings.printerProfile}
                  onChange={(event) =>
                    update({
                      printerProfile: event.target
                        .value as PrintSettings['printerProfile'],
                    })
                  }
                >
                  <option value="printer-managed">Printer manages color</option>
                  <option value="srgb">sRGB IEC61966-2.1</option>
                  <option value="display-p3">Display P3</option>
                  <option value="adobe-rgb">Adobe RGB (1998)</option>
                </select>
              </label>
              <label>
                Rendering intent
                <select
                  value={settings.renderingIntent}
                  disabled={settings.printerProfile === 'printer-managed'}
                  onChange={(event) =>
                    update({
                      renderingIntent: event.target
                        .value as PrintSettings['renderingIntent'],
                    })
                  }
                >
                  <option value="perceptual">Perceptual</option>
                  <option value="relative">Relative colorimetric</option>
                  <option value="saturation">Saturation</option>
                  <option value="absolute">Absolute colorimetric</option>
                </select>
              </label>
              <label className="print-check">
                <input
                  type="checkbox"
                  checked={settings.blackPointCompensation}
                  disabled={settings.printerProfile === 'printer-managed'}
                  onChange={(event) =>
                    update({ blackPointCompensation: event.target.checked })
                  }
                />{' '}
                Black-point compensation note
              </label>
              <small>
                Browser print drivers control final ICC conversion. LibreLayer
                records this target and intent on the proof; exact device
                conversion remains a separate roadmap item.
              </small>
            </fieldset>
          </div>
        </div>
        <div className="print-actions">
          <output aria-live="polite">{status}</output>
          <Button
            variant="secondary"
            onClick={() => {
              const { canvas } = renderPrintSheet(sources, settings, 144);
              downloadCanvas(canvas, 'librelayer-print-proof.png');
              setStatus('Measured print proof exported as PNG');
            }}
          >
            Export proof PNG
          </Button>
          <Button onClick={print}>Print…</Button>
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
