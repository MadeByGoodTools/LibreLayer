import { applyDistortFilter, type DistortFilter } from './distort-filter.ts';
import {
  applyReferenceFilter,
  type ReferenceFilter,
} from './filter-gallery.ts';
import { applyRenderFilter, type RenderFilter } from './render-filter.ts';

export type PixelFilterRequest =
  | {
      family: 'reference';
      operation: ReferenceFilter;
      amount: number;
      secondary: number;
    }
  | {
      family: 'distort';
      operation: DistortFilter;
      amount: number;
      secondary: number;
    }
  | {
      family: 'render';
      operation: RenderFilter;
      amount: number;
      secondary: number;
      color: [number, number, number];
      kernel: number[];
    };

export const applyPixelFilterRequest = (
  source: Uint8ClampedArray,
  width: number,
  height: number,
  request: PixelFilterRequest,
) => {
  if (request.family === 'reference')
    return applyReferenceFilter(
      source,
      width,
      height,
      request.operation,
      request.amount,
      request.secondary,
    );
  if (request.family === 'distort')
    return applyDistortFilter(
      source,
      width,
      height,
      request.operation,
      request.amount,
      request.secondary,
    );
  return applyRenderFilter(
    source,
    width,
    height,
    request.operation,
    request.amount,
    request.secondary,
    request.color,
    request.kernel,
  );
};
