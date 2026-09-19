import type { BezierPath, Layer, LayerVectorMask, VectorContent } from 'ag-psd';
import { normalizeFillLayerRecipe } from './fill-layer.ts';
import { fillRecipeToPsdSolid, psdSolidFillToRecipe } from './psd-fill.ts';

export type PortableShapeAnchor = {
  x: number;
  y: number;
  incoming?: { x: number; y: number };
  outgoing?: { x: number; y: number };
  smooth?: boolean;
};

export type PortableShapePath = {
  closed: boolean;
  operation?: 'exclude' | 'combine' | 'subtract' | 'intersect';
  fillRule: 'even-odd' | 'non-zero';
  anchors: PortableShapeAnchor[];
};

export type PortableShapeLayer = {
  paths: PortableShapePath[];
  fill: string;
  fillEnabled: boolean;
  stroke?: {
    enabled: boolean;
    color: string;
    width: number;
    opacity: number;
    cap: 'butt' | 'round' | 'square';
    join: 'miter' | 'round' | 'bevel';
    dashes: number[];
  };
};

const finitePoint = (value: { x: number; y: number } | undefined) =>
  !value ||
  (Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Math.abs(value.x) <= 131072 &&
    Math.abs(value.y) <= 131072);

export function supportedPortableShape(shape: PortableShapeLayer | undefined) {
  if (!shape || !shape.paths.length || shape.paths.length > 256) return false;
  if (
    shape.paths.some(
      (path) =>
        !path.closed ||
        path.anchors.length < 3 ||
        path.anchors.length > 10000 ||
        path.anchors.some(
          (anchor) =>
            !finitePoint(anchor) ||
            !finitePoint(anchor.incoming) ||
            !finitePoint(anchor.outgoing),
        ),
    )
  )
    return false;
  const stroke = shape.stroke;
  return (
    !stroke ||
    (Number.isFinite(stroke.width) &&
      stroke.width >= 0 &&
      stroke.width <= 10000 &&
      Number.isFinite(stroke.opacity) &&
      stroke.opacity >= 0 &&
      stroke.opacity <= 100 &&
      stroke.dashes.length <= 32 &&
      stroke.dashes.every(
        (dash) => Number.isFinite(dash) && dash >= 0 && dash <= 10000,
      ))
  );
}

const shapeColor = (content: VectorContent | undefined) =>
  content?.type === 'color' ? psdSolidFillToRecipe(content).color : undefined;

const cleanCoordinate = (value: number) => Math.round(value * 10000) / 10000;

export function supportedPsdShapeLayer(layer: Layer) {
  if (!layer.vectorMask && !layer.vectorStroke) return true;
  if (!layer.vectorMask || layer.vectorFill?.type !== 'color') return false;
  const stroke = layer.vectorStroke;
  if (
    layer.vectorMask.invert ||
    layer.vectorMask.notLink ||
    layer.vectorMask.disable ||
    layer.vectorMask.paths.some(
      (path) =>
        path.open ||
        path.knots.length < 3 ||
        path.knots.length > 10000 ||
        path.knots.some(
          (knot) =>
            knot.points.length !== 6 ||
            knot.points.some(
              (value) => !Number.isFinite(value) || Math.abs(value) > 131072,
            ),
        ),
    )
  )
    return false;
  return (
    !stroke ||
    ((!stroke.content || stroke.content.type === 'color') &&
      (!stroke.lineWidth ||
        (stroke.lineWidth.units === 'Pixels' &&
          Number.isFinite(stroke.lineWidth.value) &&
          stroke.lineWidth.value >= 0 &&
          stroke.lineWidth.value <= 10000)) &&
      (stroke.opacity === undefined ||
        (Number.isFinite(stroke.opacity) &&
          stroke.opacity >= 0 &&
          stroke.opacity <= 1)) &&
      (stroke.lineDashSet?.length ?? 0) <= 32 &&
      (stroke.lineDashSet ?? []).every(
        (dash) =>
          dash.units === 'Pixels' &&
          Number.isFinite(dash.value) &&
          dash.value >= 0 &&
          dash.value <= 10000,
      ))
  );
}

export function psdShapeToPortable(
  layer: Layer,
): PortableShapeLayer | undefined {
  if (!supportedPsdShapeLayer(layer) || !layer.vectorMask || !layer.vectorFill)
    return undefined;
  const stroke = layer.vectorStroke,
    strokeColor = shapeColor(stroke?.content);
  const shape: PortableShapeLayer = {
    fill: psdSolidFillToRecipe(
      layer.vectorFill as Extract<VectorContent, { type: 'color' }>,
    ).color,
    fillEnabled: stroke?.fillEnabled ?? true,
    paths: layer.vectorMask.paths.map((path) => ({
      closed: !path.open,
      operation: path.operation,
      fillRule: path.fillRule,
      anchors: path.knots.map((knot) => {
        const x = cleanCoordinate(knot.points[2]),
          y = cleanCoordinate(knot.points[3]),
          incoming = {
            x: cleanCoordinate(knot.points[0]),
            y: cleanCoordinate(knot.points[1]),
          },
          outgoing = {
            x: cleanCoordinate(knot.points[4]),
            y: cleanCoordinate(knot.points[5]),
          };
        return {
          x,
          y,
          ...(incoming.x !== x || incoming.y !== y ? { incoming } : {}),
          ...(outgoing.x !== x || outgoing.y !== y ? { outgoing } : {}),
          ...(knot.linked ? { smooth: true } : {}),
        };
      }),
    })),
    ...(stroke && strokeColor
      ? {
          stroke: {
            enabled: stroke.strokeEnabled ?? false,
            color: strokeColor,
            width: stroke.lineWidth?.value ?? 1,
            opacity: (stroke.opacity ?? 1) * 100,
            cap: stroke.lineCapType ?? 'butt',
            join: stroke.lineJoinType ?? 'miter',
            dashes: (stroke.lineDashSet ?? []).map((dash) => dash.value),
          },
        }
      : {}),
  };
  return supportedPortableShape(shape) ? shape : undefined;
}

export function portableShapeToPsd(
  shape: PortableShapeLayer,
): Pick<Layer, 'vectorMask' | 'vectorFill' | 'vectorStroke'> | undefined {
  if (!supportedPortableShape(shape)) return undefined;
  const vectorFill = fillRecipeToPsdSolid(
    normalizeFillLayerRecipe({ mode: 'solid', color: shape.fill }),
  );
  if (!vectorFill) return undefined;
  const vectorMask: LayerVectorMask = {
    fillStartsWithAllPixels: false,
    paths: shape.paths.map<BezierPath>((path) => ({
      open: false,
      operation: path.operation,
      fillRule: path.fillRule,
      knots: path.anchors.map((anchor) => ({
        linked: anchor.smooth ?? false,
        points: [
          anchor.incoming?.x ?? anchor.x,
          anchor.incoming?.y ?? anchor.y,
          anchor.x,
          anchor.y,
          anchor.outgoing?.x ?? anchor.x,
          anchor.outgoing?.y ?? anchor.y,
        ],
      })),
    })),
  };
  const vectorStroke = shape.stroke
    ? {
        strokeEnabled: shape.stroke.enabled,
        fillEnabled: shape.fillEnabled,
        lineWidth: { units: 'Pixels' as const, value: shape.stroke.width },
        lineCapType: shape.stroke.cap,
        lineJoinType: shape.stroke.join,
        opacity: shape.stroke.opacity / 100,
        lineDashSet: shape.stroke.dashes.map((value) => ({
          units: 'Pixels' as const,
          value,
        })),
        content: fillRecipeToPsdSolid({
          ...normalizeFillLayerRecipe({
            mode: 'solid',
            color: shape.stroke.color,
          }),
        }),
      }
    : shape.fillEnabled
      ? undefined
      : { strokeEnabled: false, fillEnabled: false };
  return { vectorMask, vectorFill, vectorStroke };
}
