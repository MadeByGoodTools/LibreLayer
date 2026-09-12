export type FilterGraphQuality = 'preview' | 'final';

export type VersionedFilterNode = {
  id: string;
  version?: number;
  name: string;
  amount: number;
  opacity: number;
  blend: string;
  enabled: boolean;
};

export const filterGraphKey = ({
  instanceId,
  sourceVersion,
  width,
  height,
  quality,
  filters,
}: {
  instanceId: string;
  sourceVersion: number;
  width: number;
  height: number;
  quality: FilterGraphQuality;
  filters: VersionedFilterNode[];
}) =>
  JSON.stringify([
    instanceId,
    Math.max(1, Math.floor(sourceVersion)),
    width,
    height,
    quality,
    filters.map((filter) => [
      filter.id,
      Math.max(1, Math.floor(filter.version ?? 1)),
      filter.name,
      filter.amount,
      filter.opacity,
      filter.blend,
      filter.enabled,
    ]),
  ]);

export class VersionedRenderCache<T> {
  private entries = new Map<string, { value: T; cost: number }>();
  private cost = 0;
  private maxCost: number;
  private readonly dispose?: (value: T) => void;

  constructor(
    maxCost: number,
    dispose?: (value: T) => void,
  ) {
    if (!Number.isFinite(maxCost) || maxCost < 1)
      throw Error('Render cache requires a positive budget');
    this.maxCost = maxCost;
    this.dispose = dispose;
  }

  get(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, cost: number) {
    if (!Number.isFinite(cost) || cost < 1) {
      this.dispose?.(value);
      return;
    }
    const previous = this.entries.get(key);
    if (previous) {
      this.entries.delete(key);
      this.cost -= previous.cost;
      this.dispose?.(previous.value);
    }
    if (cost > this.maxCost) {
      this.dispose?.(value);
      return;
    }
    this.entries.set(key, { value, cost });
    this.cost += cost;
    this.trim();
  }

  setBudget(maxCost: number) {
    if (!Number.isFinite(maxCost) || maxCost < 1)
      throw Error('Render cache requires a positive budget');
    this.maxCost = maxCost;
    this.trim();
  }

  private trim() {
    while (this.cost > this.maxCost) {
      const oldest = this.entries.entries().next().value as
        | [string, { value: T; cost: number }]
        | undefined;
      if (!oldest) break;
      this.entries.delete(oldest[0]);
      this.cost -= oldest[1].cost;
      this.dispose?.(oldest[1].value);
    }
  }

  clear() {
    for (const entry of this.entries.values()) this.dispose?.(entry.value);
    this.entries.clear();
    this.cost = 0;
  }

  get size() {
    return this.entries.size;
  }

  get currentCost() {
    return this.cost;
  }
}
