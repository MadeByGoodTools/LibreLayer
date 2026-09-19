import TiffWorker from './tiff-worker?worker';
export type PagedImage = {
  count: number;
  bitDepth?: number;
  pageNames?: string[];
  render: (
    page: number,
    dpi: number,
    check?: (w: number, h: number) => void,
  ) => Promise<HTMLCanvasElement>;
  close: () => void;
};
function tiff(
  buffer: ArrayBuffer,
  page?: number,
): Promise<{
  pages: { width: number; height: number; bitDepth: number; name?: string }[];
  width: number;
  height: number;
  orientation: number;
  rgba: Uint8Array;
}> {
  return new Promise((resolve, reject) => {
    const worker = new TiffWorker(),
      finish = () => {
        clearTimeout(timer);
        worker.terminate();
      },
      timer = setTimeout(() => {
        finish();
        reject(Error('TIFF decoding timed out.'));
      }, 30000);
    worker.onmessage = (e) => {
      finish();
      if (e.data.ok) resolve(e.data);
      else reject(Error(e.data.error));
    };
    worker.onerror = () => {
      finish();
      reject(Error('TIFF decoder could not load.'));
    };
    worker.postMessage({ buffer, page }, [buffer]);
  });
}
export async function openPagedImage(file: File): Promise<PagedImage> {
  if (file.size > 256 * 1024 * 1024)
    throw Error('PDF/TIFF import is limited to 256 MiB per file.');
  if (/\.tiff?$/i.test(file.name) || file.type === 'image/tiff') {
    const info = await tiff(await file.arrayBuffer());
    return {
      count: info.pages.length,
      bitDepth: Math.max(...info.pages.map((page) => page.bitDepth)),
      pageNames: info.pages.map(
        (page, index) => page.name || `Layer ${index + 1}`,
      ),
      close: () => {},
      render: async (page, _dpi, check) => {
        if (!Number.isInteger(page) || page < 1 || page > info.pages.length)
          throw Error('Choose a valid page.');
        check?.(info.pages[page - 1].width, info.pages[page - 1].height);
        const result = await tiff(await file.arrayBuffer(), page);
        const source = document.createElement('canvas');
        source.width = result.width;
        source.height = result.height;
        source
          .getContext('2d')!
          .putImageData(
            new ImageData(
              new Uint8ClampedArray(
                result.rgba.buffer as ArrayBuffer,
                result.rgba.byteOffset,
                result.rgba.byteLength,
              ),
              result.width,
              result.height,
            ),
            0,
            0,
          );
        const canvas = document.createElement('canvas'),
          swap = result.orientation >= 5 && result.orientation <= 8;
        canvas.width = swap ? source.height : source.width;
        canvas.height = swap ? source.width : source.height;
        const ctx = canvas.getContext('2d')!;
        const w = source.width,
          h = source.height;
        const matrices: Record<
          number,
          [number, number, number, number, number, number]
        > = {
          2: [-1, 0, 0, 1, w, 0],
          3: [-1, 0, 0, -1, w, h],
          4: [1, 0, 0, -1, 0, h],
          5: [0, 1, 1, 0, 0, 0],
          6: [0, 1, -1, 0, h, 0],
          7: [0, -1, -1, 0, h, w],
          8: [0, -1, 1, 0, 0, w],
        };
        if (matrices[result.orientation])
          ctx.setTransform(...matrices[result.orientation]);
        ctx.drawImage(source, 0, 0);
        source.width = 1;
        source.height = 1;
        return canvas;
      },
    };
  }
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } =
    await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useWasm: false,
    maxImageSize: 64_000_000,
  });
  const timeout = setTimeout(() => void task.destroy(), 30000);
  try {
    const pdf = await task.promise;
    clearTimeout(timeout);
    if (pdf.numPages > 200) {
      await task.destroy();
      throw Error('PDF import supports up to 200 pages.');
    }
    return {
      count: pdf.numPages,
      close: () => {
        void task.destroy();
      },
      render: async (page, dpi, check) => {
        if (
          !Number.isInteger(page) ||
          page < 1 ||
          page > pdf.numPages ||
          !Number.isFinite(dpi) ||
          dpi < 36 ||
          dpi > 300
        )
          throw Error('Choose a valid page and resolution.');
        const p = await pdf.getPage(page),
          viewport = p.getViewport({ scale: dpi / 72 }),
          width = Math.ceil(viewport.width),
          height = Math.ceil(viewport.height);
        if (width > 16384 || height > 16384 || width * height > 64_000_000)
          throw Error(
            'Page exceeds 16,384 pixels per side or 64 megapixels. Try a lower resolution.',
          );
        check?.(width, height);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const render = p.render({ canvas, viewport });
        const timer = setTimeout(() => render.cancel(), 30000);
        try {
          await render.promise;
          return canvas;
        } finally {
          clearTimeout(timer);
          p.cleanup();
        }
      },
    };
  } catch (e) {
    clearTimeout(timeout);
    await task.destroy();
    throw e;
  }
}
