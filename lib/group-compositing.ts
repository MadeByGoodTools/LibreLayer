export type GroupIsolation = 'pass-through' | 'isolated';
export type KnockoutMode = 'none' | 'shallow' | 'deep';

type GroupLike = {
  opacity: number;
  fill?: number;
  blend: string;
  blendSpace?: string;
  hasMask: boolean;
  effects?: unknown;
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  groupIsolation?: GroupIsolation;
  knockout?: KnockoutMode;
};

export function groupCanPassThrough(group: GroupLike) {
  return (
    (group.groupIsolation ?? 'pass-through') === 'pass-through' &&
    group.opacity === 100 &&
    (group.fill ?? 100) === 100 &&
    group.blend === 'source-over' &&
    group.blendSpace !== 'linear' &&
    !group.hasMask &&
    !group.effects &&
    group.x === 0 &&
    group.y === 0 &&
    (group.rotation ?? 0) === 0 &&
    (group.scaleX ?? 1) === 1 &&
    (group.scaleY ?? 1) === 1 &&
    (group.knockout ?? 'none') === 'none'
  );
}

export function clippingBaseId<T extends { id: string; clipping?: boolean }>(
  siblings: T[],
  layerId: string,
) {
  const index = siblings.findIndex((layer) => layer.id === layerId);
  return index < 0
    ? undefined
    : siblings.slice(index + 1).find((layer) => !layer.clipping)?.id;
}
