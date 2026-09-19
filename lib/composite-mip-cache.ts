export type MipDimensions = {
  level: number;
  width: number;
  height: number;
};

export const mipChainDimensions = (
  width: number,
  height: number,
  minimumEdge = 256,
  maximumLevels = 6,
): MipDimensions[] => {
  let currentWidth = Math.max(1, Math.floor(width)),
    currentHeight = Math.max(1, Math.floor(height));
  const result: MipDimensions[] = [];
  for (let level = 1; level <= Math.max(0, maximumLevels); level++) {
    if (Math.min(currentWidth, currentHeight) <= minimumEdge) break;
    currentWidth = Math.max(1, Math.ceil(currentWidth / 2));
    currentHeight = Math.max(1, Math.ceil(currentHeight / 2));
    result.push({ level, width: currentWidth, height: currentHeight });
  }
  return result;
};

export const mipLevelForZoom = (
  zoomPercent: number,
  availableLevels: number,
) => {
  if (!Number.isFinite(zoomPercent) || zoomPercent <= 0) return 0;
  const ideal = Math.max(0, Math.floor(Math.log2(100 / zoomPercent)));
  return Math.min(Math.max(0, availableLevels), ideal);
};

export const displayCompositeKey = (input: {
  documentId: string;
  width: number;
  height: number;
  precision: string;
  quality: string;
  sceneReferred: boolean;
  profileId: string;
  hdrPreviewMode: string;
  layerSignature: string;
}) =>
  JSON.stringify([
    input.documentId,
    input.width,
    input.height,
    input.precision,
    input.quality,
    input.sceneReferred,
    input.profileId,
    input.hdrPreviewMode,
    input.layerSignature,
  ]);
