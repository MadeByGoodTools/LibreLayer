import type { ImageResources, Layer, LinkedFile, PixelData, Psd } from 'ag-psd';
import PsdWorker from './psd-worker?worker';
import { pixelTransfers } from './pixel-transfers';
import type { PortablePsdPath } from './psd-paths';
import type { PortableLayerComp } from './psd-document-structure';
export type PsdImport = {
  width: number;
  height: number;
  bitDepth: 1 | 8 | 16 | 32;
  colorMode: 'bitmap' | 'grayscale' | 'indexed' | 'rgb' | 'cmyk' | 'lab';
  iccProfile?: Uint8Array;
  paths?: PortablePsdPath[];
  channels?: { name: string; id?: number; imageData: ImageData }[];
  preservedResources?: Uint8Array[];
  compAppearance?: PortableLayerComp[];
  warnings: string[];
  children: PsdLayerImport[];
  linkedFiles?: LinkedFile[];
  imageResources?: Pick<
    ImageResources,
    | 'gridAndGuidesInformation'
    | 'resolutionInfo'
    | 'layerComps'
    | 'xmpMetadata'
    | 'pixelAspectRatio'
    | 'globalAngle'
    | 'globalAltitude'
    | 'printScale'
    | 'iccUntaggedProfile'
    | 'alphaChannelNames'
    | 'alphaIdentifiers'
  >;
};
export type PsdLayerImport = Layer & {
  precisionData?: PixelData;
  children?: PsdLayerImport[];
};
export function processPsd<T>(
  request:
    | { action: 'read'; buffer: ArrayBuffer }
    | {
        action: 'write';
        psd: Psd;
        psb?: boolean;
        iccProfile?: Uint8Array;
        paths?: PortablePsdPath[];
        channels?: { name: string; id?: number; imageData: ImageData }[];
        preservedResources?: Uint8Array[];
        compAppearance?: PortableLayerComp[];
      },
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
