import type { Layer } from 'ag-psd';
import {
  blendIfChannels,
  validBlendIf,
  type BlendIf,
  type BlendIfChannel,
  type BlendIfChannelRange,
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
  for (const [channel, channelRange] of Object.entries(
    blendIfChannels(value),
  ) as [BlendIfChannel, BlendIfChannelRange][]) {
    if (channel === 'gray') {
      ranges.compositeGrayBlendSource = [...channelRange.source];
      ranges.compositeGraphBlendDestinationRange = [...channelRange.backdrop];
    } else {
      const target = ranges.ranges[CHANNEL_INDEX[channel]];
      target.sourceRange = [...channelRange.source];
      target.destRange = [...channelRange.backdrop];
    }
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
  const portable: BlendIf = {
    channel: selected.channel,
    source: cloneRange(selected.source),
    backdrop: cloneRange(selected.backdrop),
  };
  if (active.length > 1)
    portable.channels = Object.fromEntries(
      active.map(({ channel, source, backdrop }) => [
        channel,
        { source: cloneRange(source), backdrop: cloneRange(backdrop) },
      ]),
    );
  return portable;
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
  return true;
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
