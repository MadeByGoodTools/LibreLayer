import type { ImageResources, Layer, LinkedFile, Psd } from 'ag-psd';
import PsdWorker from './psd-worker?worker';
import { pixelTransfers } from './pixel-transfers';
export type PsdImport = {
  width: number;
  height: number;
  bitDepth: number;
  warnings: string[];
  children: Layer[];
  linkedFiles?: LinkedFile[];
  imageResources?: Pick<
    ImageResources,
    'gridAndGuidesInformation' | 'resolutionInfo' | 'layerComps'
  >;
};
export function processPsd<T>(
  request:
    | { action: 'read'; buffer: ArrayBuffer }
    | { action: 'write'; psd: Psd; psb?: boolean },
): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new PsdWorker();
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(
        Error(
          'PSD/PSB processing exceeded two minutes. Your original file was not changed.',
        ),
      );
    }, 120000);
    const finish = () => {
      clearTimeout(timeout);
      worker.terminate();
    };
    worker.onerror = () => {
      finish();
      reject(
        Error(
          'PSD processing could not start. Reload the editor and try again.',
        ),
      );
    };
    worker.onmessage = (event) => {
      finish();
      if (event.data.ok) resolve(event.data.result);
      else reject(Error(event.data.error));
    };
    worker.postMessage(
      request,
      request.action === 'read'
        ? [request.buffer]
        : pixelTransfers(request.psd),
    );
  });
}
