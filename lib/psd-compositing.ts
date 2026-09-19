import type { Layer } from 'ag-psd';
import {
  validBlendIf,
  type BlendIf,
  type BlendRange,
} from './layer-compositing.ts';

type PsdBlendingRanges = NonNullable<Layer['blendingRanges']>;

const DEFAULT_RANGE: BlendRange = [0, 0, 255, 255];
const CHANNEL_INDEX = { red: 0, green: 1, blue: 2 } as const;

const isRange = (value: unknown): value is BlendRange =>
  Array.isArray(value) &&
  value.length === 4 &&
  value.every(
    (item, index) =>
      Number.isInteger(item) &&
      item >= 0 &&
      item <= 255 &&
      (index === 0 || item >= value[index - 1]),
  );

const isDefault = (range: number[]) =>
  range.length === 4 &&
  range.every((value, index) => value === DEFAULT_RANGE[index]);

const cloneRange = (range: number[]): BlendRange => [
  range[0],
  range[1],
  range[2],
  range[3],
];

export function blendIfToPsd(
  value: BlendIf | undefined,
): PsdBlendingRanges | undefined {
  if (!value || !validBlendIf(value)) return undefined;
  const ranges: PsdBlendingRanges = {
    compositeGrayBlendSource: [...DEFAULT_RANGE],
    compositeGraphBlendDestinationRange: [...DEFAULT_RANGE],
    ranges: Array.from({ length: 3 }, () => ({
      sourceRange: [...DEFAULT_RANGE],
      destRange: [...DEFAULT_RANGE],
    })),
  };
  const channel = value.channel ?? 'gray';
  if (channel === 'gray') {
    ranges.compositeGrayBlendSource = [...value.source];
    ranges.compositeGraphBlendDestinationRange = [...value.backdrop];
  } else {
    const target = ranges.ranges[CHANNEL_INDEX[channel]];
    target.sourceRange = [...value.source];
    target.destRange = [...value.backdrop];
  }
  return ranges;
}

export function psdBlendIfToPortable(
  ranges: Layer['blendingRanges'],
): BlendIf | undefined {
  if (!ranges) return undefined;
  if (!supportedPsdBlendIf(ranges)) return undefined;
  const active: {
    channel: BlendIf['channel'];
    source: number[];
    backdrop: number[];
  }[] = [];
  if (
    !isDefault(ranges.compositeGrayBlendSource) ||
    !isDefault(ranges.compositeGraphBlendDestinationRange)
  )
    active.push({
      channel: 'gray',
      source: ranges.compositeGrayBlendSource,
      backdrop: ranges.compositeGraphBlendDestinationRange,
    });
  ranges.ranges.slice(0, 3).forEach((range, index) => {
    if (!isDefault(range.sourceRange) || !isDefault(range.destRange))
      active.push({
        channel: (['red', 'green', 'blue'] as const)[index],
        source: range.sourceRange,
        backdrop: range.destRange,
      });
  });
  if (!active.length) return undefined;
  const selected = active[0];
  return {
    channel: selected.channel,
    source: cloneRange(selected.source),
    backdrop: cloneRange(selected.backdrop),
  };
}

export function supportedPsdBlendIf(ranges: Layer['blendingRanges']): boolean {
  if (!ranges) return true;
  if (
    !isRange(ranges.compositeGrayBlendSource) ||
    !isRange(ranges.compositeGraphBlendDestinationRange) ||
    ranges.ranges.length > 3 ||
    ranges.ranges.some(
      (range) => !isRange(range.sourceRange) || !isRange(range.destRange),
    )
  )
    return false;
  const padded = [0, 1, 2].map(
    (index) =>
      ranges.ranges[index] ?? {
        sourceRange: DEFAULT_RANGE,
        destRange: DEFAULT_RANGE,
      },
  );
  const activeChannels = [
    !isDefault(ranges.compositeGrayBlendSource) ||
      !isDefault(ranges.compositeGraphBlendDestinationRange),
    ...padded.map(
      (range) => !isDefault(range.sourceRange) || !isDefault(range.destRange),
    ),
  ].filter(Boolean).length;
  return activeChannels <= 1;
}

export function portableFillOpacityToPsd(fill: number | undefined) {
  if (fill === undefined || fill === 100) return undefined;
  if (!Number.isFinite(fill) || fill < 0 || fill > 100) return undefined;
  return fill / 100;
}

export function psdFillOpacityToPortable(fillOpacity: number | undefined) {
  if (fillOpacity === undefined || fillOpacity === 1) return undefined;
  if (!Number.isFinite(fillOpacity) || fillOpacity < 0 || fillOpacity > 1)
    return undefined;
  return Math.round(fillOpacity * 100);
}
