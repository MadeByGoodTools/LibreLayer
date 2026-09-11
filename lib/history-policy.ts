export type HistoryPolicy = { depth: number; budgetMb: number };

export const normalizeHistoryPolicy = (
  depth: unknown,
  budgetMb: unknown,
): HistoryPolicy => ({
  depth: Math.round(Math.max(5, Math.min(100, Number(depth) || 32))),
  budgetMb: Math.round(Math.max(128, Math.min(2048, Number(budgetMb) || 512))),
});

export const historyExceedsPolicy = (
  stateCount: number,
  bytes: number,
  policy: HistoryPolicy,
) => stateCount > policy.depth || bytes > policy.budgetMb * 1048576;
