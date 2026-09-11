export type TransferLayer = {
  id: string;
  name: string;
  parentId?: string;
  linkId?: string;
};

export type LayerTransferPlan<T extends TransferLayer> = {
  layers: T[];
  rootIds: string[];
  idMap: Map<string, string>;
};

const deepCopy = <T>(value: T): T => structuredClone(value);

export function planLayerTransfer<T extends TransferLayer>(
  source: T[],
  selectedRootIds: string[],
  makeId: () => string,
): LayerTransferPlan<T> {
  const sourceIds = new Set(source.map((layer) => layer.id));
  const rootIds = [...new Set(selectedRootIds)].filter((id) =>
    sourceIds.has(id),
  );
  const selected = new Set(rootIds);

  let changed = true;
  while (changed) {
    changed = false;
    for (const layer of source) {
      if (
        layer.parentId &&
        selected.has(layer.parentId) &&
        !selected.has(layer.id)
      ) {
        selected.add(layer.id);
        changed = true;
      }
    }
  }

  const picked = source.filter((layer) => selected.has(layer.id));
  const idMap = new Map(picked.map((layer) => [layer.id, makeId()]));
  const linkMap = new Map<string, string>();
  for (const layer of picked) {
    if (layer.linkId && !linkMap.has(layer.linkId))
      linkMap.set(layer.linkId, makeId());
  }

  const roots = new Set(rootIds);
  const layers = picked.map((sourceLayer) => {
    const layer = deepCopy(sourceLayer);
    layer.id = idMap.get(sourceLayer.id)!;
    layer.parentId = roots.has(sourceLayer.id)
      ? undefined
      : sourceLayer.parentId
        ? idMap.get(sourceLayer.parentId)
        : undefined;
    layer.linkId = sourceLayer.linkId
      ? linkMap.get(sourceLayer.linkId)
      : undefined;
    return layer;
  });

  return {
    layers,
    rootIds: rootIds.map((id) => idMap.get(id)!),
    idMap,
  };
}
