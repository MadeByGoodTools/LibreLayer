export type ResourcePoolStats = {
  available: number;
  bytes: number;
  budgetBytes: number;
};

type PooledResource<T> = {
  key: string;
  value: T;
  bytes: number;
  usedAt: number;
};

export class BoundedResourcePool<T> {
  private available: PooledResource<T>[] = [];
  private clock = 0;
  private budgetBytes: number;
  private readonly dispose: (value: T) => void;

  constructor(budgetBytes: number, dispose: (value: T) => void) {
    this.budgetBytes = Math.max(0, Math.floor(budgetBytes));
    this.dispose = dispose;
  }

  acquire(key: string, bytes: number, create: () => T) {
    const index = this.available.findIndex((entry) => entry.key === key);
    if (index < 0) return create();
    const [entry] = this.available.splice(index, 1);
    entry.usedAt = ++this.clock;
    return entry.value;
  }

  release(key: string, value: T, bytes: number) {
    const safeBytes = Math.max(0, Math.floor(bytes));
    if (!this.budgetBytes || safeBytes > this.budgetBytes) {
      this.dispose(value);
      return;
    }
    this.available.push({
      key,
      value,
      bytes: safeBytes,
      usedAt: ++this.clock,
    });
    this.trim();
  }

  setBudget(bytes: number) {
    this.budgetBytes = Math.max(0, Math.floor(bytes));
    this.trim();
  }

  clear() {
    for (const entry of this.available) this.dispose(entry.value);
    this.available = [];
  }

  stats(): ResourcePoolStats {
    return {
      available: this.available.length,
      bytes: this.available.reduce((total, entry) => total + entry.bytes, 0),
      budgetBytes: this.budgetBytes,
    };
  }

  private trim() {
    let bytes = this.available.reduce((total, entry) => total + entry.bytes, 0);
    while (bytes > this.budgetBytes && this.available.length) {
      let oldest = 0;
      for (let index = 1; index < this.available.length; index++)
        if (this.available[index].usedAt < this.available[oldest].usedAt)
          oldest = index;
      const [entry] = this.available.splice(oldest, 1);
      bytes -= entry.bytes;
      this.dispose(entry.value);
    }
  }
}
