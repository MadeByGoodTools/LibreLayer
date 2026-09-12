export type RawBatchProgress = {
  completed: number;
  total: number;
  name: string;
  state: 'decoding' | 'rendering' | 'writing' | 'failed' | 'complete';
};

export type RawBatchFailure = { name: string; error: string };
export type RawBatchResult = {
  completed: number;
  cancelled: boolean;
  failures: RawBatchFailure[];
};

export async function runRawBatch<Source, Image, Output>(
  sources: readonly { name: string; source: Source }[],
  work: {
    shouldCancel: () => boolean;
    decode: (source: Source) => Promise<Image>;
    render: (image: Image) => Promise<Output> | Output;
    write: (output: Output, name: string) => Promise<void> | void;
    onProgress?: (progress: RawBatchProgress) => void;
  },
): Promise<RawBatchResult> {
  let completed = 0;
  const failures: RawBatchFailure[] = [];
  for (const item of sources) {
    if (work.shouldCancel())
      return { completed, cancelled: true, failures };
    try {
      work.onProgress?.({
        completed,
        total: sources.length,
        name: item.name,
        state: 'decoding',
      });
      const image = await work.decode(item.source);
      if (work.shouldCancel())
        return { completed, cancelled: true, failures };
      work.onProgress?.({
        completed,
        total: sources.length,
        name: item.name,
        state: 'rendering',
      });
      const output = await work.render(image);
      if (work.shouldCancel())
        return { completed, cancelled: true, failures };
      work.onProgress?.({
        completed,
        total: sources.length,
        name: item.name,
        state: 'writing',
      });
      await work.write(output, item.name);
      completed++;
      work.onProgress?.({
        completed,
        total: sources.length,
        name: item.name,
        state: 'complete',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      failures.push({ name: item.name, error: message });
      work.onProgress?.({
        completed,
        total: sources.length,
        name: item.name,
        state: 'failed',
      });
    }
  }
  return { completed, cancelled: false, failures };
}
