import type {
  BlendMode,
  Color,
  EffectContour as PsdEffectContour,
  LayerEffectsInfo,
  UnitsValue,
} from 'ag-psd';
import {
  defaultLayerEffects,
  normalizeLayerEffects,
  type EffectContour,
  type LayerEffects,
} from './layer-effects.ts';

const px = (value: number): UnitsValue => ({ units: 'Pixels', value });
const fromPx = (value: UnitsValue | undefined) =>
  !value || value.units === 'Pixels' ? value?.value : undefined;
const enabled = (value: { enabled?: boolean } | undefined) =>
  Boolean(value && value.enabled !== false);
const clampByte = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)));
const hexToRgb = (value: string) => ({
  r: parseInt(value.slice(1, 3), 16),
  g: parseInt(value.slice(3, 5), 16),
  b: parseInt(value.slice(5, 7), 16),
});
const colorToHex = (color: Color | undefined) => {
  if (!color) return undefined;
  const channels =
    'r' in color
      ? [color.r, color.g, color.b]
      : 'fr' in color
        ? [color.fr * 255, color.fg * 255, color.fb * 255]
        : undefined;
  return channels
    ? `#${channels
        .map((value) => clampByte(value).toString(16).padStart(2, '0'))
        .join('')}`
    : undefined;
};

const contourCurves: Record<EffectContour, PsdEffectContour> = {
  linear: {
    name: 'Linear',
    curve: [
      { x: 0, y: 0 },
      { x: 255, y: 255 },
    ],
  },
  smooth: {
    name: 'Smooth',
    curve: [
      { x: 0, y: 0 },
      { x: 64, y: 40 },
      { x: 191, y: 215 },
      { x: 255, y: 255 },
    ],
  },
  cone: {
    name: 'Cone',
    curve: [
      { x: 0, y: 0 },
      { x: 128, y: 255 },
      { x: 255, y: 0 },
    ],
  },
  ring: {
    name: 'Ring',
    curve: [
      { x: 0, y: 128 },
      { x: 64, y: 255 },
      { x: 191, y: 0 },
      { x: 255, y: 128 },
    ],
  },
};

const contourToPsd = (value: EffectContour): PsdEffectContour =>
  structuredClone(contourCurves[value]);
const contourFromPsd = (
  value: PsdEffectContour | undefined,
): EffectContour | undefined => {
  if (!value) return 'smooth';
  const normalized = JSON.stringify(value.curve);
  return (Object.keys(contourCurves) as EffectContour[]).find(
    (key) => JSON.stringify(contourCurves[key].curve) === normalized,
  );
};

const solidGradient = (effects: LayerEffects) => ({
  name: 'LibreLayer two-color gradient',
  type: 'solid' as const,
  smoothness: 1,
  colorStops: [
    { color: hexToRgb(effects.color), location: 0, midpoint: 50 },
    { color: hexToRgb(effects.secondaryColor), location: 4096, midpoint: 50 },
  ],
  opacityStops: [
    { opacity: 1, location: 0, midpoint: 50 },
    { opacity: 1, location: 4096, midpoint: 50 },
  ],
});

export function layerEffectsToPsd(
  input: LayerEffects | undefined,
): LayerEffectsInfo | undefined {
  if (!input) return undefined;
  const effects = normalizeLayerEffects(input);
  if (effects.patternOverlay) return undefined;
  const common = {
      present: true,
      showInDialog: true,
      enabled: true,
      size: px(effects.size),
      opacity: effects.opacity / 100,
    },
    shadow = {
      ...common,
      angle: effects.angle,
      distance: px(effects.distance),
      color: hexToRgb(effects.color),
      useGlobalLight: effects.useGlobalLight,
      contour: contourToPsd(effects.contour),
    };
  return {
    disabled: false,
    scale: effects.scale / 100,
    dropShadow: effects.dropShadow
      ? [{ ...shadow, blendMode: 'multiply' }]
      : undefined,
    innerShadow: effects.innerShadow
      ? [{ ...shadow, blendMode: 'multiply' }]
      : undefined,
    outerGlow: effects.outerGlow
      ? {
          ...common,
          color: hexToRgb(effects.color),
          blendMode: 'screen',
          source: 'edge',
          contour: contourToPsd(effects.contour),
        }
      : undefined,
    innerGlow: effects.innerGlow
      ? {
          ...common,
          color: hexToRgb(effects.secondaryColor),
          blendMode: 'screen',
          source: 'edge',
          technique: 'softer',
          contour: contourToPsd(effects.contour),
        }
      : undefined,
    bevel: effects.bevel
      ? {
          ...common,
          angle: effects.angle,
          strength: 1,
          highlightBlendMode: 'screen',
          shadowBlendMode: 'multiply',
          highlightColor: hexToRgb(effects.secondaryColor),
          shadowColor: hexToRgb(effects.color),
          style: 'inner bevel',
          highlightOpacity: effects.opacity / 100,
          shadowOpacity: effects.opacity / 100,
          useGlobalLight: effects.useGlobalLight,
          altitude: 30,
          technique: 'smooth',
          direction: 'up',
          contour: contourToPsd(effects.contour),
        }
      : undefined,
    satin: effects.satin
      ? {
          ...common,
          distance: px(effects.distance),
          angle: effects.angle,
          color: hexToRgb(effects.color),
          blendMode: 'multiply',
          invert: false,
          contour: contourToPsd(effects.contour),
        }
      : undefined,
    solidFill: effects.colorOverlay
      ? [
          {
            ...common,
            color: hexToRgb(effects.color),
            blendMode: 'normal',
          },
        ]
      : undefined,
    gradientOverlay: effects.gradientOverlay
      ? [
          {
            ...common,
            blendMode: 'normal',
            align: true,
            scale: effects.scale,
            dither: false,
            reverse: false,
            type: 'linear',
            offset: { x: 0, y: 0 },
            gradient: solidGradient(effects),
            angle: effects.angle,
          },
        ]
      : undefined,
    stroke: effects.stroke
      ? [
          {
            ...common,
            overprint: false,
            position: 'outside',
            fillType: 'color',
            blendMode: 'normal',
            color: hexToRgb(effects.color),
          },
        ]
      : undefined,
  };
}

type Candidate = Partial<
  Pick<
    LayerEffects,
    | 'color'
    | 'secondaryColor'
    | 'opacity'
    | 'size'
    | 'distance'
    | 'angle'
    | 'useGlobalLight'
    | 'scale'
    | 'contour'
  >
>;

const mergeCandidate = (target: Candidate, next: Candidate) => {
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined) return false;
    const previous = target[key as keyof Candidate];
    if (previous !== undefined && previous !== value) return false;
    (target as Record<string, unknown>)[key] = value;
  }
  return true;
};
const compatibleBlend = (value: string | undefined, expected: BlendMode) =>
  !value || value === expected;

export function psdEffectsToLayerEffects(
  input: LayerEffectsInfo | undefined,
): LayerEffects | undefined {
  if (!input || input.disabled) return undefined;
  if (
    (input.dropShadow?.length ?? 0) > 1 ||
    (input.innerShadow?.length ?? 0) > 1 ||
    (input.solidFill?.length ?? 0) > 1 ||
    (input.gradientOverlay?.length ?? 0) > 1 ||
    (input.stroke?.length ?? 0) > 1 ||
    enabled(input.patternOverlay)
  )
    return undefined;
  const out = { ...defaultLayerEffects(), dropShadow: false },
    common: Candidate = {};
  const mergeOpacity = (value: { opacity?: number }) =>
    mergeCandidate(common, {
      opacity: value.opacity === undefined ? 100 : value.opacity * 100,
    });
  const mergeSize = (value: { opacity?: number; size?: UnitsValue }) =>
    mergeOpacity(value) &&
    mergeCandidate(common, { size: fromPx(value.size) ?? 0 });
  const mergeCommon = (value: {
    opacity?: number;
    size?: UnitsValue;
    contour?: PsdEffectContour;
  }) =>
    mergeSize(value) &&
    mergeCandidate(common, { contour: contourFromPsd(value.contour) });
  const mergeShadow = (
    value: NonNullable<LayerEffectsInfo['dropShadow']>[number],
  ) =>
    mergeCommon(value) &&
    mergeCandidate(common, {
      color: colorToHex(value.color),
      distance: fromPx(value.distance) ?? 0,
      angle: value.angle ?? 120,
      useGlobalLight: value.useGlobalLight ?? true,
    });
  const drop = input.dropShadow?.[0];
  if (enabled(drop)) {
    if (!compatibleBlend(drop!.blendMode, 'multiply') || !mergeShadow(drop!))
      return undefined;
    out.dropShadow = true;
  }
  const inner = input.innerShadow?.[0];
  if (enabled(inner)) {
    if (!compatibleBlend(inner!.blendMode, 'multiply') || !mergeShadow(inner!))
      return undefined;
    out.innerShadow = true;
  }
  if (enabled(input.outerGlow)) {
    const value = input.outerGlow!;
    if (
      !compatibleBlend(value.blendMode, 'screen') ||
      !mergeCommon(value) ||
      !mergeCandidate(common, { color: colorToHex(value.color) })
    )
      return undefined;
    out.outerGlow = true;
  }
  if (enabled(input.innerGlow)) {
    const value = input.innerGlow!;
    if (
      !compatibleBlend(value.blendMode, 'screen') ||
      (value.technique && value.technique !== 'softer') ||
      !mergeCommon(value) ||
      !mergeCandidate(common, { secondaryColor: colorToHex(value.color) })
    )
      return undefined;
    out.innerGlow = true;
  }
  if (enabled(input.bevel)) {
    const value = input.bevel!;
    if (
      (value.style && value.style !== 'inner bevel') ||
      (value.technique && value.technique !== 'smooth') ||
      (value.direction && value.direction !== 'up') ||
      !compatibleBlend(value.highlightBlendMode, 'screen') ||
      !compatibleBlend(value.shadowBlendMode, 'multiply') ||
      !mergeCommon({
        ...value,
        opacity: value.highlightOpacity ?? value.shadowOpacity,
      }) ||
      !mergeCandidate(common, {
        color: colorToHex(value.shadowColor),
        secondaryColor: colorToHex(value.highlightColor),
        angle: value.angle ?? 120,
        useGlobalLight: value.useGlobalLight ?? true,
      }) ||
      (value.highlightOpacity !== undefined &&
        value.shadowOpacity !== undefined &&
        value.highlightOpacity !== value.shadowOpacity)
    )
      return undefined;
    out.bevel = true;
  }
  if (enabled(input.satin)) {
    const value = input.satin!;
    if (
      !compatibleBlend(value.blendMode, 'multiply') ||
      value.invert ||
      !mergeCommon(value) ||
      !mergeCandidate(common, {
        color: colorToHex(value.color),
        distance: fromPx(value.distance) ?? 0,
        angle: value.angle ?? 120,
      })
    )
      return undefined;
    out.satin = true;
  }
  const fill = input.solidFill?.[0];
  if (enabled(fill)) {
    if (
      !compatibleBlend(fill!.blendMode, 'normal') ||
      !mergeOpacity(fill!) ||
      !mergeCandidate(common, { color: colorToHex(fill!.color) })
    )
      return undefined;
    out.colorOverlay = true;
  }
  const gradient = input.gradientOverlay?.[0];
  if (enabled(gradient)) {
    const value = gradient!,
      stops = value.gradient?.type === 'solid' ? value.gradient.colorStops : [];
    if (
      !compatibleBlend(value.blendMode, 'normal') ||
      value.gradient?.type !== 'solid' ||
      stops.length !== 2 ||
      (value.type && value.type !== 'linear') ||
      value.reverse ||
      value.dither ||
      value.offset?.x ||
      value.offset?.y ||
      value.gradient.opacityStops.some((stop) => stop.opacity !== 1) ||
      !mergeOpacity(value) ||
      !mergeCandidate(common, {
        color: colorToHex(stops[0]?.color),
        secondaryColor: colorToHex(stops[1]?.color),
        angle: value.angle ?? 90,
        scale: value.scale ?? 100,
      })
    )
      return undefined;
    out.gradientOverlay = true;
  }
  const stroke = input.stroke?.[0];
  if (enabled(stroke)) {
    if (
      !compatibleBlend(stroke!.blendMode, 'normal') ||
      (stroke!.fillType && stroke!.fillType !== 'color') ||
      (stroke!.position && stroke!.position !== 'outside') ||
      !mergeSize(stroke!) ||
      !mergeCandidate(common, { color: colorToHex(stroke!.color) })
    )
      return undefined;
    out.stroke = true;
  }
  if (
    ![
      out.dropShadow,
      out.innerShadow,
      out.outerGlow,
      out.innerGlow,
      out.bevel,
      out.satin,
      out.colorOverlay,
      out.gradientOverlay,
      out.stroke,
    ].some(Boolean)
  )
    return undefined;
  Object.assign(out, common, {
    scale: (input.scale ?? 1) * 100,
    patternOverlay: false,
  });
  return normalizeLayerEffects(out);
}

export const supportedPsdEffects = (effects: LayerEffectsInfo | undefined) =>
  Boolean(effects && psdEffectsToLayerEffects(effects));
