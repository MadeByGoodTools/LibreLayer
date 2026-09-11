'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Hand,
  RotateCcw,
  Blend,
  Brush,
  ChevronDown,
  ChevronRight,
  Crop,
  Download,
  Droplets,
  Eraser,
  Eye,
  EyeOff,
  FolderPlus,
  Focus,
  ImagePlus,
  LassoSelect,
  Layers,
  MousePointer2,
  PaintBucket,
  PenTool,
  Pipette,
  Plus,
  Redo2,
  ScanSearch,
  Scissors,
  Search,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Stamp,
  Trash2,
  Type,
  Undo2,
  WandSparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { ExportDialog } from '@/components/export-dialog';
import {
  WorkspaceSettings,
  defaultPreferences,
  type EditorPreferences,
} from '@/components/workspace-settings';
import { DockWorkspace } from '@/components/dock-workspace';
import { PagedImportDialog } from '@/components/paged-import-dialog';
import {
  captureTiles,
  restoreTiles,
  historyBytes,
  type HistorySurface,
  type TiledImage,
} from '@/lib/tiled-history';
import {
  checkDimensions,
  checkFileSize,
  MAX_DOCUMENT_PIXELS,
  MAX_WORKING_PIXELS,
  HISTORY_BYTES,
} from '@/lib/document-limits';
import { preflightImage } from '@/lib/image-preflight';
import {
  commandKey,
  defaultCommandKey,
  shortcutLabel,
} from '@/lib/editor-shortcuts';
import {
  clearDefaultSaveDirectory,
  deleteVersion,
  forgetRecentFile,
  getDefaultSaveDirectory,
  loadRawAsset,
  loadWorkspaceState,
  recentFiles,
  recoveryRecords,
  rememberRecentFile,
  saveRecovery,
  saveRawAsset,
  saveVersion,
  saveWorkspaceState,
  setDefaultSaveDirectory,
  deleteRecovery,
  type LocalDirectoryHandle,
  type LocalFileHandle,
  type RecentFileRecord,
  type RecoveryRecord,
  type VersionRecord,
  versionRecords,
} from '@/lib/recovery';
import type { Layer as PsdLayer } from 'ag-psd';
import { processPsd, type PsdImport } from '@/lib/psd-transfer';
import {
  EncryptedProjectPasswordInvalid,
  EncryptedProjectPasswordRequired,
  packEncryptedProject,
  packProject,
  unpackProject,
} from '@/lib/project-format';
import {
  applyColorGradeToPixels,
  colorGradeIsNeutral,
  createDefaultColorGrade,
  neutralChannelLevels,
  resolveColorGrade,
  type ChannelLevelKey,
  type ColorGrade,
  type GradeOffsetKey,
  type GradeRange,
} from '@/lib/channel-grade';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  NewDocumentDialog,
  type NewDocumentOptions,
} from '@/components/new-document';
import { ImageSizeDialog, CanvasSizeDialog } from '@/components/resize-dialogs';
import {
  AdvancedAdjustmentsDialog,
  type AdvancedAdjustmentOptions,
} from '@/components/advanced-adjustments-dialog';
import {
  ProfessionalGeometryDialog,
  type GeometryOperation,
} from '@/components/professional-geometry-dialog';
import {
  LayerStudioDialog,
  type LayerEffects,
  type LayerStudioOperation,
} from '@/components/layer-studio-dialog';
import { ProSuiteDialog } from '@/components/pro-suite-dialog';
import {
  applySuitePixelOperation,
  encodeAnimatedGif,
  type SuiteFeature,
  type SuiteOptions,
} from '@/lib/pro-suite';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  CanvasViewport,
  type ViewportHandle,
} from '@/components/canvas-viewport';
import {
  defaultView,
  readView,
  clampZoom,
  snapPosition,
  type EditorView,
} from '@/lib/editor-view';
import {
  ancestors,
  descendants,
  locked,
  treeOrder,
  moveSibling,
} from '@/lib/layer-tree';
import {
  extraBlends,
  compositePixels,
  validBlendIf,
  type ExtraBlend,
  type BlendIf,
} from '@/lib/layer-compositing';
import { BlendIfControls } from '@/components/blend-if-controls';
import { SmartFilterStack } from '@/components/smart-filter-stack';
import { Histogram } from '@/components/histogram';
import { AdjustmentPresets } from '@/components/adjustment-presets';
import { LevelsControl } from '@/components/levels-control';
import { ToneCurve } from '@/components/tone-curve';
import { sharpenCanvasTiled } from '@/lib/smart-filter-engine';
import {
  decodeCameraRaw,
  defaultRawDevelopSettings,
  developRawRgba,
  isRawDevelopSettings,
  type RawDevelopSettings,
  type RawLinearImage,
} from '@/lib/raw-develop';
import type { HighPrecisionRawSource } from '@/lib/image-export';
import {
  adjustHighDepth,
  createDefaultHighDepthAdjustments,
  precisionToEncodedRgba,
  type HighDepthAdjustments,
} from '@/lib/high-depth';
const Mask = Focus;

type Tool =
  | 'hand'
  | 'rotateView'
  | 'move'
  | 'marquee'
  | 'lasso'
  | 'smart'
  | 'crop'
  | 'eyedropper'
  | 'brush'
  | 'clone'
  | 'retouch'
  | 'eraser'
  | 'fill'
  | 'gradient'
  | 'text'
  | 'shape'
  | 'path'
  | 'zoom';
type BlendMode =
  | ExtraBlend
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';
type Rect = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };
type SavedPath = {
  id: string;
  name: string;
  points: Point[];
  curved?: boolean;
  tension?: number;
};
type SavedSelection = { id: string; name: string; mask: string };
type SmartFilter = {
  id: string;
  name: 'Blur' | 'Sharpen' | 'Brightness';
  amount: number;
  opacity: number;
  blend: BlendMode;
  enabled: boolean;
};
type SmartObjectData = {
  kind: 'embedded' | 'linked';
  sourceName: string;
  sourceData: string;
  filters: SmartFilter[];
  filterMask: boolean;
  raw?: {
    assetId: string;
    width: number;
    height: number;
    bitDepth: number;
    camera: string;
    lens: string;
    settings: RawDevelopSettings;
  };
};
type TextLayerData = {
  content: string;
  color: string;
  originX: number;
  originY: number;
  paragraph: boolean;
  width: number;
  family: string;
  weight: number;
  size: number;
  tracking: number;
  kerning: boolean;
  leading: number;
  baseline: number;
  align: 'left' | 'center' | 'right' | 'justify';
  onPath: boolean;
  warp: number;
  smallCaps: boolean;
  ligatures: boolean;
};
type LayerKind = 'pixel' | 'group' | 'adjustment';
type LayerMeta = {
  fill?: number;
  clipping?: boolean;
  blendIf?: BlendIf;
  linkId?: string;
  maskDensity?: number;
  maskFeather?: number;
  maskLinked?: boolean;
  vectorMask?: Point[];
  colorLabel?: string;
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blend: BlendMode;
  x: number;
  y: number;
  hasMask: boolean;
  maskEnabled: boolean;
  locked?: boolean;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur?: number;
  kind?: LayerKind;
  parentId?: string;
  collapsed?: boolean;
  effects?: LayerEffects;
  smartObject?: SmartObjectData;
  textLayer?: TextLayerData;
  colorGrade?: ColorGrade;
  precisionAdjustment?: HighDepthAdjustments;
};
type LayerSurface = { pixels: HTMLCanvasElement; mask?: HTMLCanvasElement };
type LayerComp = {
  id: string;
  name: string;
  comment?: string;
  states: {
    id: string;
    visible: boolean;
    x: number;
    y: number;
    opacity: number;
    fill?: number;
    blend: BlendMode;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    brightness?: number;
    contrast?: number;
    saturation?: number;
    blur?: number;
  }[];
};
type Snapshot = {
  selectedIds?: string[];
  label: string;
  named?: boolean;
  w: number;
  h: number;
  layers: LayerMeta[];
  surfaces: HistorySurface[];
  selectedId: string;
  selection?: TiledImage;
  selectionBounds?: Rect | null;
  selectionPath?: Point[] | null;
  paths?: SavedPath[];
  layerComps?: LayerComp[];
  view?: EditorView;
};
type EditorDocument = {
  selectedIds?: string[];
  layerComps?: LayerComp[];
  view?: EditorView;
  id: string;
  name: string;
  saved: boolean;
  doc: { w: number; h: number };
  layers: LayerMeta[];
  surfaces: Map<string, LayerSurface>;
  selectedId: string;
  history: Snapshot[];
  historyIndex: number;
  zoom: number;
  selection: Rect | null;
  feather?: number;
  selectionPath?: Point[] | null;
  paths?: SavedPath[];
  savedSelections?: SavedSelection[];
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const shiftedHex = (hex: string, amount: number) => {
  if (!amount) return hex;
  const n = parseInt(hex.slice(1), 16),
    r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255,
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    light = (max + min) / 510;
  let hue = 0,
    saturation = 0;
  if (max !== min) {
    const d = max - min;
    saturation = d / (255 * (1 - Math.abs(2 * light - 1)));
    hue =
      max === r
        ? 60 * (((g - b) / d) % 6)
        : max === g
          ? 60 * ((b - r) / d + 2)
          : 60 * ((r - g) / d + 4);
  }
  hue = (hue + amount + 360) % 360;
  const c = (1 - Math.abs(2 * light - 1)) * saturation,
    x = c * (1 - Math.abs(((hue / 60) % 2) - 1)),
    m = light - c / 2,
    [rr, gg, bb] =
      hue < 60
        ? [c, x, 0]
        : hue < 120
          ? [x, c, 0]
          : hue < 180
            ? [0, c, x]
            : hue < 240
              ? [0, x, c]
              : hue < 300
                ? [x, 0, c]
                : [c, 0, x];
  return `#${[rr, gg, bb]
    .map((value) =>
      Math.round((value + m) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
};

const toolItems: {
  id: Tool;
  label: string;
  key: string;
  icon: typeof Brush;
}[] = [
  { id: 'hand', label: 'Hand', key: 'H', icon: Hand },
  { id: 'rotateView', label: 'Rotate view', key: 'R', icon: RotateCcw },
  { id: 'move', label: 'Move', key: 'V', icon: MousePointer2 },
  { id: 'marquee', label: 'Marquee select', key: 'M', icon: ScanSearch },
  { id: 'lasso', label: 'Polygonal lasso', key: 'L', icon: LassoSelect },
  { id: 'smart', label: 'Magic Wand', key: 'W', icon: WandSparkles },
  { id: 'crop', label: 'Crop', key: 'C', icon: Crop },
  { id: 'eyedropper', label: 'Eyedropper', key: 'I', icon: Pipette },
  { id: 'brush', label: 'Brush', key: 'B', icon: Brush },
  { id: 'clone', label: 'Clone stamp', key: 'S', icon: Stamp },
  { id: 'retouch', label: 'Retouch tools', key: 'J', icon: Sparkles },
  { id: 'eraser', label: 'Eraser', key: 'E', icon: Eraser },
  { id: 'fill', label: 'Fill', key: 'G', icon: PaintBucket },
  { id: 'gradient', label: 'Gradient', key: 'D', icon: Droplets },
  { id: 'text', label: 'Text', key: 'T', icon: Type },
  { id: 'shape', label: 'Rectangle', key: 'U', icon: Shapes },
  { id: 'path', label: 'Pen path', key: 'P', icon: PenTool },
  { id: 'zoom', label: 'Zoom', key: 'Z', icon: ZoomIn },
];
const blendLabels: Record<BlendMode, string> = {
  'source-over': 'Normal',
  ...extraBlends,
  multiply: 'Multiply',
  screen: 'Screen',
  overlay: 'Overlay',
  darken: 'Darken',
  lighten: 'Lighten',
  'color-dodge': 'Color Dodge',
  'color-burn': 'Color Burn',
  'hard-light': 'Hard Light',
  'soft-light': 'Soft Light',
  difference: 'Difference',
  exclusion: 'Exclusion',
  hue: 'Hue',
  saturation: 'Saturation',
  color: 'Color',
  luminosity: 'Luminosity',
};
const makeCanvas = (w: number, h: number) => {
  checkDimensions(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

const canvasPngDataUrl = (canvas: HTMLCanvasElement) =>
  new Promise<string>((resolve, reject) =>
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(Error('A document surface could not be encoded.'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? Error('Encoding failed.'));
      reader.onload = () =>
        typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(Error('Encoding returned an invalid result.'));
      reader.readAsDataURL(blob);
    }, 'image/png'),
  );
const maskGray = (hex: string) => {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
    gray = Math.round(0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]);
  return `rgb(${gray},${gray},${gray})`;
};
const applyAdvancedPixels = (
  canvas: HTMLCanvasElement,
  options: AdvancedAdjustmentOptions,
) => {
  const filtered = makeCanvas(canvas.width, canvas.height),
    fc = filtered.getContext('2d')!,
    sourceContext = canvas.getContext('2d', { willReadFrequently: true })!;
  for (let y = 0; y < canvas.height; y += 256)
    for (let x = 0; x < canvas.width; x += 256) {
      const width = Math.min(256, canvas.width - x),
        height = Math.min(256, canvas.height - y),
        tile = sourceContext.getImageData(x, y, width, height),
        adjusted = adjustHighDepth({ width, height, data: tile.data }, options);
      tile.data.set(precisionToEncodedRgba({ width, height, data: adjusted }));
      fc.putImageData(tile, x, y);
    }
  let output = filtered;
  if (options.blurMode !== 'none' && options.blurRadius > 0) {
    output = makeCanvas(canvas.width, canvas.height);
    const out = output.getContext('2d')!;
    if (options.blurMode === 'gaussian') {
      out.filter = `blur(${options.blurRadius}px)`;
      out.drawImage(filtered, 0, 0);
    } else {
      const samples = 17,
        angle = (options.blurAngle * Math.PI) / 180;
      out.globalAlpha = 1 / samples;
      for (let i = 0; i < samples; i++) {
        const t = i / (samples - 1) - 0.5;
        out.save();
        if (options.blurMode === 'motion')
          out.translate(
            Math.cos(angle) * options.blurRadius * t * 2,
            Math.sin(angle) * options.blurRadius * t * 2,
          );
        else {
          out.translate(canvas.width / 2, canvas.height / 2);
          out.rotate((t * options.blurRadius * Math.PI) / 900);
          out.translate(-canvas.width / 2, -canvas.height / 2);
        }
        out.drawImage(filtered, 0, 0);
        out.restore();
      }
      out.globalAlpha = 1;
    }
  }
  const target = canvas.getContext('2d')!;
  target.clearRect(0, 0, canvas.width, canvas.height);
  target.drawImage(output, 0, 0);
  if (output !== filtered) output.width = output.height = 1;
  filtered.width = filtered.height = 1;
};

const remapRaster = (
  source: HTMLCanvasElement,
  mapper: (x: number, y: number, w: number, h: number) => [number, number],
) => {
  const w = source.width,
    h = source.height,
    input = source
      .getContext('2d', { willReadFrequently: true })!
      .getImageData(0, 0, w, h),
    output = source.getContext('2d')!.createImageData(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [sx, sy] = mapper(x, y, w, h),
        ix = Math.round(sx),
        iy = Math.round(sy),
        target = (y * w + x) * 4;
      if (ix < 0 || iy < 0 || ix >= w || iy >= h) continue;
      const from = (iy * w + ix) * 4;
      output.data[target] = input.data[from];
      output.data[target + 1] = input.data[from + 1];
      output.data[target + 2] = input.data[from + 2];
      output.data[target + 3] = input.data[from + 3];
    }
  source.getContext('2d')!.putImageData(output, 0, 0);
};

const transformRasterPixels = (
  canvas: HTMLCanvasElement,
  mode: Extract<GeometryOperation, { kind: 'transform' }>['mode'],
  horizontal: number,
  vertical: number,
) => {
  const amountX = Math.max(-1, Math.min(1, horizontal / 100)),
    amountY = Math.max(-1, Math.min(1, vertical / 100));
  if (mode === 'content-aware-scale') return;
  remapRaster(canvas, (x, y, w, h) => {
    const nx = x / Math.max(1, w - 1) - 0.5,
      ny = y / Math.max(1, h - 1) - 0.5;
    if (mode === 'skew') return [x - amountX * ny * w, y - amountY * nx * h];
    if (mode === 'distort')
      return [
        x - amountX * ny * w * (0.5 + nx),
        y - amountY * nx * h * (0.5 + ny),
      ];
    if (mode === 'perspective') {
      const scaleX = Math.max(0.2, 1 + amountX * ny * 1.6),
        scaleY = Math.max(0.2, 1 + amountY * nx * 1.6);
      return [(nx / scaleX + 0.5) * w, (ny / scaleY + 0.5) * h];
    }
    if (mode === 'warp')
      return [
        x - Math.sin((y / h) * Math.PI) * amountX * w * 0.22,
        y - Math.sin((x / w) * Math.PI) * amountY * h * 0.22,
      ];
    if (mode === 'puppet') {
      const distance = Math.hypot(nx, ny),
        influence = Math.max(0, 1 - distance * 2);
      return [
        x - amountX * w * 0.35 * influence,
        y - amountY * h * 0.35 * influence,
      ];
    }
    const scaleX = Math.max(0.2, 1 + amountX * ny * 1.8),
      scaleY = Math.max(0.2, 1 + amountY * nx * 1.8);
    return [(nx / scaleX + 0.5) * w, (ny / scaleY + 0.5) * h];
  });
};

const rotateCanvasPixels = (source: HTMLCanvasElement, degrees: number) => {
  const swap = Math.abs(degrees) % 180 === 90,
    output = makeCanvas(
      swap ? source.height : source.width,
      swap ? source.width : source.height,
    ),
    ctx = output.getContext('2d')!;
  ctx.translate(output.width / 2, output.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return output;
};
const drawEditableText = (canvas: HTMLCanvasElement, value: TextLayerData) => {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = value.color;
  ctx.font = `${value.weight} ${value.size}px ${value.family}`;
  ctx.fontKerning = value.kerning ? 'normal' : 'none';
  ctx.fontVariantCaps = value.smallCaps ? 'small-caps' : 'normal';
  ctx.textBaseline = 'alphabetic';
  const typed = value.ligatures
      ? value.content.replaceAll('fi', 'ﬁ').replaceAll('fl', 'ﬂ')
      : value.content,
    content = value.smallCaps ? typed.toUpperCase() : typed,
    lineHeight = value.size * value.leading,
    lines: string[] = [];
  if (value.paragraph) {
    for (const paragraph of content.split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(candidate).width > value.width) {
          lines.push(line);
          line = word;
        } else line = candidate;
      }
      lines.push(line);
    }
  } else lines.push(...content.split('\n'));
  lines.forEach((line, lineIndex) => {
    const width =
        ctx.measureText(line).width +
        Math.max(0, line.length - 1) * value.tracking,
      x =
        value.align === 'center'
          ? value.originX - width / 2
          : value.align === 'right'
            ? value.originX - width
            : value.originX,
      y = value.originY + value.baseline + lineIndex * lineHeight;
    let cursor = x;
    const justifyExtra =
      value.align === 'justify' && value.paragraph
        ? Math.max(0, value.width - width) /
          Math.max(1, line.split(' ').length - 1)
        : 0;
    for (let index = 0; index < line.length; index++) {
      const character = line[index],
        progress = index / Math.max(1, line.length - 1),
        pathOffset = value.onPath
          ? -Math.sin(progress * Math.PI) * value.size * 0.45
          : 0,
        warpOffset = Math.sin(progress * Math.PI * 2) * value.warp;
      ctx.fillText(character, cursor, y + pathOffset + warpOffset);
      cursor +=
        ctx.measureText(character).width +
        value.tracking +
        (character === ' ' ? justifyExtra : 0);
    }
  });
};
const rawImageCanvas = (output: {
  data: Uint8Array;
  width: number;
  height: number;
}) => {
  if (!Number.isInteger(output.width) || !Number.isInteger(output.height))
    throw Error('Invalid model image size');
  const count = output.width * output.height,
    channels = output.data.length / count;
  if (![1, 3, 4].includes(channels))
    throw Error('Unsupported model image format');
  const canvas = makeCanvas(output.width, output.height),
    image = canvas
      .getContext('2d')!
      .createImageData(output.width, output.height);
  for (let pixel = 0; pixel < count; pixel++) {
    const source = pixel * channels,
      target = pixel * 4;
    if (channels === 1) {
      image.data[target] =
        image.data[target + 1] =
        image.data[target + 2] =
          255;
      image.data[target + 3] = output.data[source];
    } else {
      image.data[target] = output.data[source];
      image.data[target + 1] = output.data[source + 1];
      image.data[target + 2] = output.data[source + 2];
      image.data[target + 3] =
        channels === 4
          ? output.data[source + 3]
          : Math.round(
              0.299 * output.data[source] +
                0.587 * output.data[source + 1] +
                0.114 * output.data[source + 2],
            );
    }
  }
  canvas.getContext('2d')!.putImageData(image, 0, 0);
  return canvas;
};

const maskToAlpha = (mask: HTMLCanvasElement, density = 100, feather = 0) => {
  const out = makeCanvas(mask.width, mask.height),
    ctx = out.getContext('2d')!,
    mc = mask.getContext('2d', { willReadFrequently: true })!,
    amount = Math.max(0, Math.min(100, density)) / 100;
  for (let y = 0; y < mask.height; y += 256)
    for (let x = 0; x < mask.width; x += 256) {
      const source = mc.getImageData(
        x,
        y,
        Math.min(256, mask.width - x),
        Math.min(256, mask.height - y),
      );
      for (let i = 0; i < source.data.length; i += 4) {
        const gray =
          (source.data[i] + source.data[i + 1] + source.data[i + 2]) / 3;
        source.data[i + 3] = 255 - (255 - gray) * amount;
        source.data[i] = source.data[i + 1] = source.data[i + 2] = 255;
      }
      ctx.putImageData(source, x, y);
    }
  if (feather > 0) {
    const blurred = makeCanvas(mask.width, mask.height),
      bc = blurred.getContext('2d')!;
    bc.filter = `blur(${Math.min(250, feather)}px)`;
    bc.drawImage(out, 0, 0);
    out.width = out.height = 1;
    return blurred;
  }
  return out;
};
const sliderNumber = (value: number | readonly number[]) =>
  Number(Array.isArray(value) ? value[0] : value);
const colorGradedCanvas = (
  source: HTMLCanvasElement,
  grade: ColorGrade | undefined,
  w: number,
  h: number,
) => {
  if (colorGradeIsNeutral(grade)) return source;
  const output = makeCanvas(w, h),
    outputContext = output.getContext('2d')!,
    tile = makeCanvas(Math.min(256, w), Math.min(256, h));
  for (let y = 0; y < h; y += 256)
    for (let x = 0; x < w; x += 256) {
      const width = Math.min(256, w - x),
        height = Math.min(256, h - y),
        tileContext = tile.getContext('2d', { willReadFrequently: true })!;
      tileContext.clearRect(0, 0, tile.width, tile.height);
      tileContext.drawImage(source, x, y, width, height, 0, 0, width, height);
      const pixels = tileContext.getImageData(0, 0, width, height);
      applyColorGradeToPixels(pixels.data, grade);
      tileContext.putImageData(pixels, 0, 0);
      outputContext.drawImage(tile, 0, 0, width, height, x, y, width, height);
    }
  tile.width = tile.height = 1;
  return output;
};
const drawLayer = (
  ctx: CanvasRenderingContext2D,
  layer: LayerMeta,
  surface: LayerSurface,
  w: number,
  h: number,
) => {
  let source = surface.pixels;
  const masks: HTMLCanvasElement[] = [];
  if (layer.vectorMask?.length && layer.vectorMask.length > 2) {
    const vector = makeCanvas(w, h),
      vc = vector.getContext('2d')!;
    vc.fillStyle = 'white';
    vc.beginPath();
    vc.moveTo(layer.vectorMask[0].x, layer.vectorMask[0].y);
    layer.vectorMask.slice(1).forEach((p) => vc.lineTo(p.x, p.y));
    vc.closePath();
    vc.fill();
    masks.push(vector);
  }
  if (
    layer.hasMask &&
    layer.maskEnabled &&
    surface.mask &&
    !layer.smartObject?.filterMask &&
    layer.maskLinked !== false
  )
    masks.push(maskToAlpha(surface.mask, layer.maskDensity, layer.maskFeather));
  if (masks.length) {
    const temp = makeCanvas(w, h),
      tc = temp.getContext('2d')!;
    tc.drawImage(source, 0, 0);
    for (const alpha of masks) {
      tc.globalCompositeOperation = 'destination-in';
      tc.drawImage(alpha, 0, 0);
      alpha.width = alpha.height = 1;
    }
    source = temp;
  }
  for (const smartFilter of layer.smartObject?.filters ?? []) {
    if (!smartFilter.enabled) continue;
    const filtered =
        smartFilter.name === 'Sharpen'
          ? sharpenCanvasTiled(source, smartFilter.amount)
          : makeCanvas(w, h),
      fc = filtered.getContext('2d')!;
    if (smartFilter.name !== 'Sharpen') {
      fc.filter =
        smartFilter.name === 'Blur'
          ? `blur(${Math.max(0, smartFilter.amount)}px)`
          : `brightness(${100 + smartFilter.amount}%)`;
      fc.drawImage(source, 0, 0);
    }
    if (
      layer.smartObject?.filterMask &&
      layer.hasMask &&
      layer.maskEnabled &&
      surface.mask
    ) {
      const alpha = maskToAlpha(
        surface.mask,
        layer.maskDensity,
        layer.maskFeather,
      );
      fc.globalCompositeOperation = 'destination-in';
      fc.filter = 'none';
      fc.drawImage(alpha, 0, 0);
      alpha.width = alpha.height = 1;
    }
    const combined = makeCanvas(w, h),
      cc = combined.getContext('2d')!;
    cc.drawImage(source, 0, 0);
    cc.globalAlpha = smartFilter.opacity / 100;
    cc.globalCompositeOperation = smartFilter.blend as GlobalCompositeOperation;
    cc.drawImage(filtered, 0, 0);
    if (source !== surface.pixels) source.width = source.height = 1;
    filtered.width = filtered.height = 1;
    source = combined;
  }
  const graded = colorGradedCanvas(source, layer.colorGrade, w, h);
  if (graded !== source) {
    if (source !== surface.pixels) source.width = source.height = 1;
    source = graded;
  }
  const filter =
    (layer.brightness ?? 100) === 100 &&
    (layer.contrast ?? 100) === 100 &&
    (layer.saturation ?? 100) === 100 &&
    !(layer.blur ?? 0)
      ? 'none'
      : `brightness(${layer.brightness ?? 100}%) contrast(${layer.contrast ?? 100}%) saturate(${layer.saturation ?? 100}%) blur(${layer.blur ?? 0}px)`;
  if (
    layer.hasMask &&
    layer.maskEnabled &&
    surface.mask &&
    !layer.smartObject?.filterMask &&
    layer.maskLinked === false
  ) {
    const placed = makeCanvas(w, h),
      pc = placed.getContext('2d')!;
    pc.filter = filter;
    pc.translate(layer.x + w / 2, layer.y + h / 2);
    pc.rotate(((layer.rotation ?? 0) * Math.PI) / 180);
    pc.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
    pc.drawImage(source, -w / 2, -h / 2);
    const alpha = maskToAlpha(
      surface.mask,
      layer.maskDensity,
      layer.maskFeather,
    );
    pc.globalCompositeOperation = 'destination-in';
    pc.filter = 'none';
    pc.setTransform(1, 0, 0, 1, 0, 0);
    pc.drawImage(alpha, 0, 0);
    alpha.width = alpha.height = 1;
    ctx.save();
    ctx.globalAlpha = ((layer.opacity / 100) * (layer.fill ?? 100)) / 100;
    ctx.globalCompositeOperation = layer.blend as GlobalCompositeOperation;
    ctx.drawImage(placed, 0, 0);
    ctx.restore();
    placed.width = placed.height = 1;
  } else {
    const effects = layer.effects;
    if (effects) {
      const drawEffectSource = (
        effectColor: string,
        blur: number,
        offsetX: number,
        offsetY: number,
      ) => {
        ctx.save();
        ctx.globalAlpha = (layer.opacity / 100) * (effects.opacity / 100);
        ctx.shadowColor = effectColor;
        ctx.shadowBlur = blur;
        ctx.shadowOffsetX = offsetX;
        ctx.shadowOffsetY = offsetY;
        ctx.translate(layer.x + w / 2, layer.y + h / 2);
        ctx.rotate(((layer.rotation ?? 0) * Math.PI) / 180);
        ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
        ctx.drawImage(source, -w / 2, -h / 2);
        ctx.restore();
      };
      if (effects.dropShadow)
        drawEffectSource(
          effects.color,
          effects.size,
          effects.distance,
          effects.distance,
        );
      if (effects.outerGlow)
        drawEffectSource(effects.color, effects.size * 1.6, 0, 0);
      if (effects.stroke)
        for (const [dx, dy] of [
          [-effects.size, 0],
          [effects.size, 0],
          [0, -effects.size],
          [0, effects.size],
        ])
          drawEffectSource(effects.color, 0, dx as number, dy as number);
    }
    ctx.save();
    ctx.globalAlpha = ((layer.opacity / 100) * (layer.fill ?? 100)) / 100;
    ctx.globalCompositeOperation = layer.blend as GlobalCompositeOperation;
    ctx.filter = filter;
    ctx.translate(layer.x + w / 2, layer.y + h / 2);
    ctx.rotate(((layer.rotation ?? 0) * Math.PI) / 180);
    ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
    ctx.drawImage(source, -w / 2, -h / 2);
    ctx.restore();
    if (effects) {
      const overlay = makeCanvas(w, h),
        oc = overlay.getContext('2d')!;
      if (effects.colorOverlay) {
        oc.fillStyle = effects.color;
        oc.fillRect(0, 0, w, h);
      } else if (effects.gradientOverlay) {
        const gradient = oc.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, effects.color);
        gradient.addColorStop(1, effects.secondaryColor);
        oc.fillStyle = gradient;
        oc.fillRect(0, 0, w, h);
      } else if (effects.patternOverlay) {
        oc.fillStyle = effects.color;
        oc.fillRect(0, 0, w, h);
        oc.fillStyle = effects.secondaryColor;
        for (let y = 0; y < h; y += Math.max(4, effects.size))
          for (let x = 0; x < w; x += Math.max(4, effects.size))
            if (((x + y) / Math.max(4, effects.size)) % 2 < 1)
              oc.fillRect(
                x,
                y,
                Math.max(2, effects.size / 2),
                Math.max(2, effects.size / 2),
              );
      }
      if (
        effects.colorOverlay ||
        effects.gradientOverlay ||
        effects.patternOverlay
      ) {
        oc.globalCompositeOperation = 'destination-in';
        oc.drawImage(source, 0, 0);
        ctx.save();
        ctx.globalAlpha = effects.opacity / 100;
        ctx.translate(layer.x + w / 2, layer.y + h / 2);
        ctx.rotate(((layer.rotation ?? 0) * Math.PI) / 180);
        ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
        ctx.drawImage(overlay, -w / 2, -h / 2);
        ctx.restore();
      }
      if (
        effects.innerShadow ||
        effects.innerGlow ||
        effects.bevel ||
        effects.satin
      ) {
        const inner = makeCanvas(w, h),
          ic = inner.getContext('2d')!;
        ic.drawImage(source, 0, 0);
        ic.globalCompositeOperation = 'source-atop';
        ic.globalAlpha = effects.opacity / 100;
        ic.fillStyle =
          effects.innerGlow || effects.bevel
            ? effects.secondaryColor
            : effects.color;
        if (effects.satin) {
          for (let y = 0; y < h; y += Math.max(6, effects.size * 2))
            ic.fillRect(0, y, w, Math.max(2, effects.size / 2));
        } else ic.fillRect(0, 0, w, h);
        ic.globalCompositeOperation = 'destination-in';
        ic.filter = `blur(${effects.innerGlow ? effects.size : Math.max(1, effects.size / 3)}px)`;
        ic.drawImage(
          source,
          effects.innerShadow ? effects.distance : 0,
          effects.innerShadow ? effects.distance : 0,
        );
        ctx.save();
        ctx.globalAlpha = effects.opacity / 100;
        ctx.translate(layer.x + w / 2, layer.y + h / 2);
        ctx.rotate(((layer.rotation ?? 0) * Math.PI) / 180);
        ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
        ctx.drawImage(inner, -w / 2, -h / 2);
        ctx.restore();
        inner.width = inner.height = 1;
      }
      overlay.width = overlay.height = 1;
    }
  }
  if (source !== surface.pixels) {
    source.width = source.height = 1;
  }
};
const applyAdjustment = (
  ctx: CanvasRenderingContext2D,
  layer: LayerMeta,
  w: number,
  h: number,
  surface?: LayerSurface,
) => {
  const source = makeCanvas(w, h),
    adjusted = makeCanvas(w, h),
    ac = adjusted.getContext('2d')!,
    sourceContext = source.getContext('2d', { willReadFrequently: true })!;
  source.getContext('2d')!.drawImage(ctx.canvas, 0, 0);
  const settings: HighDepthAdjustments = {
    brightness: (layer.brightness ?? 100) - 100,
    contrast: (layer.contrast ?? 100) - 100,
    saturation: (layer.saturation ?? 100) - 100,
    ...layer.precisionAdjustment,
  };
  for (let y = 0; y < h; y += 256)
    for (let x = 0; x < w; x += 256) {
      const width = Math.min(256, w - x),
        height = Math.min(256, h - y),
        tile = sourceContext.getImageData(x, y, width, height),
        result = adjustHighDepth({ width, height, data: tile.data }, settings);
      tile.data.set(precisionToEncodedRgba({ width, height, data: result }));
      ac.putImageData(tile, x, y);
    }
  if (layer.blur) {
    const blurred = makeCanvas(w, h),
      blurredContext = blurred.getContext('2d')!;
    blurredContext.filter = `blur(${Math.max(0, layer.blur)}px)`;
    blurredContext.drawImage(adjusted, 0, 0);
    ac.clearRect(0, 0, w, h);
    ac.drawImage(blurred, 0, 0);
    blurred.width = blurred.height = 1;
  }
  if (layer.hasMask && layer.maskEnabled && surface?.mask) {
    const alpha = maskToAlpha(
      surface.mask,
      layer.maskDensity,
      layer.maskFeather,
    );
    ac.globalCompositeOperation = 'destination-in';
    ac.filter = 'none';
    ac.drawImage(alpha, 0, 0);
    alpha.width = alpha.height = 1;
  }
  ctx.save();
  ctx.globalAlpha = layer.opacity / 100;
  ctx.drawImage(adjusted, 0, 0);
  ctx.restore();
  source.width = 1;
  source.height = 1;
  adjusted.width = adjusted.height = 1;
};

export default function Home() {
  const [preferences, setPreferences] =
      useState<EditorPreferences>(defaultPreferences),
    [settingsOpen, setSettingsOpen] = useState(false),
    [panelsHidden, setPanelsHidden] = useState(false),
    [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const menuCommands = useRef(
    new Map<string, { name: string; shortcut: string; action: () => void }>(),
  );
  const [exportSource, setExportSource] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [exportRawSource, setExportRawSource] =
    useState<HighPrecisionRawSource | null>(null);
  const [exportRawLoading, setExportRawLoading] = useState(false);
  const [pagedFile, setPagedFile] = useState<File | null>(null);
  const [recoveries, setRecoveries] = useState<RecoveryRecord[] | null>(null),
    [versions, setVersions] = useState<VersionRecord[] | null>(null),
    [recent, setRecent] = useState<RecentFileRecord[]>([]),
    [recoveryStatus, setRecoveryStatus] = useState(''),
    [storageStatus, setStorageStatus] = useState('Checking browser storage…'),
    [saveLocationName, setSaveLocationName] = useState('Downloads'),
    [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
      null,
    );
  const recoveryTick = useRef<(manual?: boolean) => void>(() => {}),
    recoveryWriting = useRef(false),
    recoveryFingerprints = useRef(new Map<string, string>()),
    lastVersionAt = useRef(new Map<string, number>()),
    workspaceRestore = useRef<() => Promise<void>>(async () => {}),
    workspaceRestored = useRef(false);
  useEffect(() => {
    try {
      const p = JSON.parse(
        localStorage.getItem('pixel-studio-preferences') || 'null',
      );
      if (
        p &&
        ['left', 'right'].includes(p.layout?.side) &&
        p.layout.width >= 260 &&
        p.layout.width <= 440 &&
        Array.isArray(p.workspaces) &&
        Array.isArray(p.presets) &&
        p.shortcuts &&
        typeof p.autosave === 'boolean'
      )
        setPreferences({
          ...p,
          workspaces: p.workspaces
            .filter(
              (w: any) =>
                typeof w.name === 'string' &&
                ['left', 'right'].includes(w.layout?.side) &&
                w.layout.width >= 260 &&
                w.layout.width <= 440,
            )
            .slice(0, 10),
          presets: p.presets
            .filter(
              (x: any) =>
                typeof x.name === 'string' &&
                toolItems.some((t) => t.id === x.tool) &&
                Number.isFinite(x.size) &&
                x.size >= 1 &&
                x.size <= 300 &&
                Number.isFinite(x.opacity) &&
                x.opacity >= 1 &&
                x.opacity <= 100 &&
                /^#[0-9a-f]{6}$/i.test(x.color) &&
                Number.isFinite(x.fontSize) &&
                Number.isFinite(x.feather),
            )
            .slice(0, 20),
        });
    } catch {}
  }, []);
  const refreshStorageStatus = async () => {
    if (!navigator.storage?.estimate) {
      setStorageStatus('Storage details are unavailable in this browser');
      return;
    }
    const [estimate, protectedStorage] = await Promise.all([
      navigator.storage.estimate(),
      navigator.storage.persisted?.() ?? Promise.resolve(false),
    ]);
    const used = Math.round((estimate.usage ?? 0) / 1048576),
      quota = Math.round((estimate.quota ?? 0) / 1048576);
    setStorageStatus(
      `${used.toLocaleString()} MB used of ${quota.toLocaleString()} MB${protectedStorage ? ' · protected' : ''}`,
    );
  };
  useEffect(() => {
    void refreshStorageStatus().catch(() =>
      setStorageStatus('Storage details are unavailable in this browser'),
    );
  }, []);
  const protectLocalStorage = async () => {
    try {
      const protectedStorage = await navigator.storage?.persist?.();
      await refreshStorageStatus();
      setRecoveryStatus(
        protectedStorage
          ? 'Local working storage is protected from automatic cleanup'
          : 'The browser kept its normal storage policy; project files remain the safest copy',
      );
    } catch {
      setRecoveryStatus(
        'The browser could not change its local storage policy',
      );
    }
  };
  useEffect(() => {
    void getDefaultSaveDirectory()
      .then((handle) => setSaveLocationName(handle?.name ?? 'Downloads'))
      .catch(() => setSaveLocationName('Downloads'));
    void recentFiles()
      .then(setRecent)
      .catch(() => setRecent([]));
  }, []);
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        void navigator.serviceWorker.register('/sw.js').catch(() => {});
      } else {
        // A production service worker left on localhost can cache Vite's
        // development client and break hot reload with repeated send errors.
        void navigator.serviceWorker
          .register('/sw.js?dev-cleanup=v30')
          .then(() => navigator.serviceWorker.getRegistrations())
          .then(async (registrations) => {
            const wasControlled = Boolean(navigator.serviceWorker.controller);
            await Promise.all(
              registrations.map((registration) => registration.unregister()),
            );
            const cacheKeys = await caches.keys();
            await Promise.all(
              cacheKeys
                .filter(
                  (key) =>
                    key.startsWith('pixel-studio-shell-') ||
                    key.startsWith('librelayer-shell-'),
                )
                .map((key) => caches.delete(key)),
            );
            if (
              wasControlled &&
              sessionStorage.getItem('pixel-studio-dev-sw-cleaned') !== 'true'
            ) {
              sessionStorage.setItem('pixel-studio-dev-sw-cleaned', 'true');
              window.location.reload();
            } else {
              sessionStorage.removeItem('pixel-studio-dev-sw-cleaned');
            }
          })
          .catch(() => {});
      }
    }
    const capture = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installed = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', installed);
    return () => {
      window.removeEventListener('beforeinstallprompt', capture);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);
  const updatePreferences = (p: EditorPreferences) => {
    setPreferences(p);
    try {
      localStorage.setItem('pixel-studio-preferences', JSON.stringify(p));
      setRecoveryStatus('Preferences saved on this browser');
    } catch {
      setRecoveryStatus(
        'Browser storage is unavailable; preferences last for this session only',
      );
    }
  };
  useEffect(() => {
    const id = setInterval(() => recoveryTick.current(), 10000);
    const saveOnHide = () => {
      if (document.visibilityState === 'hidden') recoveryTick.current();
    };
    document.addEventListener('visibilitychange', saveOnHide);
    if (!workspaceRestored.current) {
      workspaceRestored.current = true;
      void workspaceRestore.current();
    }
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', saveOnHide);
    };
  }, []);

  const [psdBusy, setPsdBusy] = useState(false),
    psdBusyRef = useRef(false);
  const [psdPending, setPsdPending] = useState<{
    name: string;
    data: PsdImport;
  } | null>(null);
  const [psdError, setPsdError] = useState('');
  const [newDocumentOpen, setNewDocumentOpen] = useState(false);
  const [imageSizeOpen, setImageSizeOpen] = useState(false),
    [canvasSizeOpen, setCanvasSizeOpen] = useState(false),
    [adjustmentsOpen, setAdjustmentsOpen] = useState(false),
    [snapshotOpen, setSnapshotOpen] = useState(false),
    [snapshotName, setSnapshotName] = useState(''),
    [selectMaskOpen, setSelectMaskOpen] = useState(false),
    [selectionManagerOpen, setSelectionManagerOpen] = useState(false),
    [geometryOpen, setGeometryOpen] = useState(false),
    [layerStudioOpen, setLayerStudioOpen] = useState(false),
    [proSuiteOpen, setProSuiteOpen] = useState(false),
    [secureSaveOpen, setSecureSaveOpen] = useState(false),
    [secureSavePassword, setSecureSavePassword] = useState(''),
    [secureSaveConfirmation, setSecureSaveConfirmation] = useState(''),
    [secureSaveError, setSecureSaveError] = useState(''),
    [encryptedProjectFile, setEncryptedProjectFile] = useState<File | null>(
      null,
    ),
    [encryptedProjectPassword, setEncryptedProjectPassword] = useState(''),
    [encryptedProjectError, setEncryptedProjectError] = useState(''),
    [selectionRepairOpen, setSelectionRepairOpen] = useState<
      'patch' | 'remove' | 'fill' | 'move' | null
    >(null),
    [repairOffsetX, setRepairOffsetX] = useState(40),
    [repairOffsetY, setRepairOffsetY] = useState(0),
    [selectionName, setSelectionName] = useState('Selection 1'),
    [rawDevelop, setRawDevelop] = useState<{
      name: string;
      image: RawLinearImage;
      sourceFile?: File;
      targetLayerId?: string;
      assetId?: string;
    } | null>(null),
    [rawSettings, setRawSettings] = useState<RawDevelopSettings>(
      defaultRawDevelopSettings,
    ),
    [rawPreview, setRawPreview] = useState(''),
    [refineRadius, setRefineRadius] = useState(2),
    [refineSmooth, setRefineSmooth] = useState(2),
    [refineFeather, setRefineFeather] = useState(1),
    [refineShift, setRefineShift] = useState(0),
    [decontaminate, setDecontaminate] = useState(true),
    [decontaminateAmount, setDecontaminateAmount] = useState(50);
  useEffect(() => {
    if (!rawDevelop) {
      setRawPreview('');
      return;
    }
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      const preview = developRawRgba(rawDevelop.image, rawSettings, 900);
      if (cancelled) return;
      const canvas = makeCanvas(preview.width, preview.height);
      canvas
        .getContext('2d')!
        .putImageData(
          new ImageData(preview.data, preview.width, preview.height),
          0,
          0,
        );
      setRawPreview(canvas.toDataURL('image/jpeg', 0.9));
      canvas.width = canvas.height = 1;
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [rawDevelop, rawSettings]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (
        !saved ||
        documents.some((item) => item.id !== activeDocumentId && !item.saved)
      ) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  });
  const displayRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const surfacesRef = useRef(new Map<string, LayerSurface>());
  const layersRef = useRef<LayerMeta[]>([]);
  const drawing = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const last = useRef({ x: 0, y: 0 });
  const moveOrigin = useRef({ x: 0, y: 0 });
  const historyRef = useRef<Snapshot[]>([]);
  const historyIndex = useRef(-1);
  const cloneSource = useRef<{ x: number; y: number } | null>(null);
  const cloneHasOffset = useRef(false);
  const cloneOffset = useRef({ x: 0, y: 0 });
  const cloneBuffer = useRef<HTMLCanvasElement | null>(null);
  const rawMasterCache = useRef(new Map<string, RawLinearImage>());
  const exportRawGeneration = useRef(0);
  const brushPresetFileRef = useRef<HTMLInputElement>(null);
  const smartObjectFileRef = useRef<HTMLInputElement>(null);
  const smartFileAction = useRef<'link' | 'replace' | 'relink'>('link');
  const clipboardRef = useRef<{
    pixels: HTMLCanvasElement;
    x: number;
    y: number;
  } | null>(null);
  const savedSelectionCanvases = useRef(new Map<string, HTMLCanvasElement>());
  const selectionChannelRef = useRef<HTMLCanvasElement | null>(null);
  const lastSelectionRef = useRef<{
    mask: HTMLCanvasElement;
    bounds: Rect;
    path: Point[] | null;
  } | null>(null);
  const polygonDraft = useRef<Point[]>([]);
  const transformDrag = useRef<{
    action: 'scale' | 'rotate';
    x: number;
    y: number;
    states: Map<string, { scaleX: number; scaleY: number; rotation: number }>;
  } | null>(null);
  const viewportRef = useRef<ViewportHandle>(null);
  const togglePanels = () => {
    setPanelsHidden((hidden) => !hidden);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => viewportRef.current?.fit()),
    );
  };
  const [view, setView] = useState<EditorView>(defaultView);
  const updateView = (next: EditorView) => {
    setView(next);
    if (next.guides !== view.guides) setSaved(false);
  };
  const [doc, setDoc] = useState({ w: 1200, h: 800 });
  const [layers, setLayers] = useState<LayerMeta[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const selectedRef = useRef('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]),
    selectedIdsRef = useRef<string[]>([]);
  const [layerQuery, setLayerQuery] = useState(''),
    [layerKind, setLayerKind] = useState('all'),
    [layerState, setLayerState] = useState('all');
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    edge: 'before' | 'after' | 'inside';
  } | null>(null);
  const moveOrigins = useRef(new Map<string, { x: number; y: number }>());
  const [, setHistoryVersion] = useState(0);
  const [editing, setEditing] = useState<'pixels' | 'mask'>('pixels');
  const [selectionShape, setSelectionShape] = useState<
    'rectangle' | 'ellipse' | 'row' | 'column'
  >('rectangle');
  const [lassoMode, setLassoMode] = useState<
    'freehand' | 'polygonal' | 'magnetic'
  >('freehand');
  const [magicTolerance, setMagicTolerance] = useState(28);
  const [magicContiguous, setMagicContiguous] = useState(true);
  const [smartMode, setSmartMode] = useState<'wand' | 'quick' | 'object'>(
    'wand',
  );
  const [selectionMode, setSelectionMode] = useState<
    'replace' | 'add' | 'subtract' | 'intersect'
  >('replace');
  const [selectionRadius, setSelectionRadius] = useState(4);
  const [quickMask, setQuickMask] = useState(false);
  const quickMaskRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>('move');
  const [size, setSize] = useState(32);
  const [opacity, setOpacity] = useState(100);
  const [flow, setFlow] = useState(100);
  const [hardness, setHardness] = useState(80);
  const [brushSpacing, setBrushSpacing] = useState(10);
  const [pressureSize, setPressureSize] = useState(true),
    [pressureOpacity, setPressureOpacity] = useState(false),
    [tiltShape, setTiltShape] = useState(true),
    [brushSmoothing, setBrushSmoothing] = useState(20),
    [sizeJitter, setSizeJitter] = useState(0),
    [hueJitter, setHueJitter] = useState(0),
    [brushScatter, setBrushScatter] = useState(0),
    [brushTexture, setBrushTexture] = useState(0),
    [mixerWet, setMixerWet] = useState(50),
    [mixerLoad, setMixerLoad] = useState(50),
    [mixerMix, setMixerMix] = useState(50),
    [mixerBrush, setMixerBrush] = useState(false);
  const [paintMode, setPaintMode] = useState<'brush' | 'pencil'>('brush');
  const [color, setColor] = useState('#171717');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [zoom, setZoom] = useState(68);
  const [selection, setSelection] = useState<Rect | null>(null);
  const selectionRef = useRef<Rect | null>(null);
  const [selectionPath, setSelectionPath] = useState<Point[] | null>(null);
  const selectionPathRef = useRef<Point[] | null>(null);
  const [feather, setFeather] = useState(0);
  const [dragRect, setDragRect] = useState<Rect | null>(null);
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [paths, setPaths] = useState<SavedPath[]>([]);
  const [savedSelections, setSavedSelections] = useState<SavedSelection[]>([]);
  const [layerComps, setLayerComps] = useState<LayerComp[]>([]);
  const layerCompsRef = useRef<LayerComp[]>([]);
  const [channelView, setChannelView] = useState<
    'rgb' | 'red' | 'green' | 'blue' | 'alpha'
  >('rgb');
  const [soloChannel, setSoloChannel] = useState(false);
  const [text, setText] = useState('Your text');
  const [fontSize, setFontSize] = useState(64);
  const [fileName, setFileName] = useState('Untitled artwork');
  const [saved, setSaved] = useState(true);
  const [status, setStatus] = useState('Ready');
  const [aiBusy, setAiBusy] = useState(false);
  const [transformSession, setTransformSession] = useState<LayerMeta[] | null>(
    null,
  );
  const [fillTolerance, setFillTolerance] = useState(32),
    [fillContiguous, setFillContiguous] = useState(true),
    [gradientMidpoint, setGradientMidpoint] = useState(50),
    [shapeRadius, setShapeRadius] = useState(0),
    [shapeFill, setShapeFill] = useState(false),
    [cloneAligned, setCloneAligned] = useState(true),
    [cloneOffsetX, setCloneOffsetX] = useState(0),
    [cloneOffsetY, setCloneOffsetY] = useState(0),
    [cloneScale, setCloneScale] = useState(100),
    [cloneRotation, setCloneRotation] = useState(0),
    [cloneFlipX, setCloneFlipX] = useState(false),
    [cloneFlipY, setCloneFlipY] = useState(false),
    [cloneOverlay, setCloneOverlay] = useState(true),
    [retouchMode, setRetouchMode] = useState<
      | 'healing'
      | 'spot'
      | 'dodge'
      | 'burn'
      | 'sponge'
      | 'blur'
      | 'sharpen'
      | 'smudge'
    >('healing'),
    [pathCurved, setPathCurved] = useState(false),
    [pathMode, setPathMode] = useState<'straight' | 'curvature' | 'freeform'>(
      'straight',
    ),
    [pathTension, setPathTension] = useState(50),
    [shapeKind, setShapeKind] = useState<'rectangle' | 'ellipse' | 'polygon'>(
      'rectangle',
    ),
    [polygonSides, setPolygonSides] = useState(5),
    [textParagraph, setTextParagraph] = useState(false),
    [textWidth, setTextWidth] = useState(420),
    [fontFamily, setFontFamily] = useState('Arial'),
    [fontWeight, setFontWeight] = useState(600),
    [textTracking, setTextTracking] = useState(0),
    [textKerning, setTextKerning] = useState(true),
    [textLeading, setTextLeading] = useState(1.2),
    [textBaseline, setTextBaseline] = useState(0),
    [textAlign, setTextAlign] = useState<
      'left' | 'center' | 'right' | 'justify'
    >('left'),
    [textOnPath, setTextOnPath] = useState(false),
    [textWarp, setTextWarp] = useState(0),
    [textSmallCaps, setTextSmallCaps] = useState(false),
    [textLigatures, setTextLigatures] = useState(true);
  const firstDocumentId = useRef(crypto.randomUUID());
  const activeDocumentRef = useRef(firstDocumentId.current);
  const documentStoreRef = useRef(new Map<string, EditorDocument>());
  const [activeDocumentId, setActiveDocumentId] = useState(
    firstDocumentId.current,
  );
  const [documents, setDocuments] = useState<
    { id: string; name: string; saved: boolean }[]
  >([{ id: firstDocumentId.current, name: 'Untitled artwork', saved: true }]);

  const syncLayers = (next: LayerMeta[]) => {
    next = treeOrder(next);
    layersRef.current = next;
    setLayers(next);
    const stored = documentStoreRef.current.get(activeDocumentRef.current);
    if (stored)
      documentStoreRef.current.set(stored.id, {
        ...stored,
        layers: next,
        surfaces: surfacesRef.current,
      });
  };
  const selectMany = (ids: string[], primary = ids[0] ?? '') => {
    const valid = [
      ...new Set(
        ids.filter((id) => layersRef.current.some((l) => l.id === id)),
      ),
    ];
    selectedIdsRef.current = valid;
    setSelectedIds(valid);
    selectedRef.current = valid.includes(primary) ? primary : (valid[0] ?? '');
    setSelectedId(selectedRef.current);
  };
  const select = (id: string) => selectMany([id], id);
  const currentWorkingPixels = () => {
    let pixels = 0;
    const count = (surfaces: Map<string, LayerSurface>) => {
      for (const s of surfaces.values())
        pixels +=
          s.pixels.width * s.pixels.height +
          (s.mask ? s.mask.width * s.mask.height : 0);
    };
    count(surfacesRef.current);
    for (const [id, d] of documentStoreRef.current)
      if (id !== activeDocumentRef.current) count(d.surfaces);
    return pixels;
  };
  const requireRoom = (w: number, h: number, additional: number) => {
    checkDimensions(w, h);
    if (currentWorkingPixels() + additional > MAX_WORKING_PIXELS)
      throw Error(
        'Open documents would exceed the 96-million layer/mask-pixel memory budget. Save and close another tab, or reduce the layer count. No resizing was applied.',
      );
  };
  const roomForLayers = (count = 1) => {
    if (layersRef.current.length + count > 100) {
      setStatus('A document supports up to 100 layers and groups.');
      return false;
    }
    return true;
  };
  const hasRoom = (additional: number) => {
    try {
      requireRoom(doc.w, doc.h, additional);
      return true;
    } catch (e) {
      setPsdError(e instanceof Error ? e.message : 'Not enough image memory');
      return false;
    }
  };
  const boundHistory = () => {
    const inactive = [...documentStoreRef.current.values()].filter(
      (d) => d.id !== activeDocumentRef.current,
    );
    const total = () =>
      historyBytes([
        ...historyRef.current,
        ...inactive.flatMap((d) => d.history),
      ]);
    let trimmed = false;
    for (const d of inactive)
      while (d.history.length > 1 && total() > HISTORY_BYTES) {
        if (d.historyIndex > 0) {
          d.history = d.history.slice(1);
          d.historyIndex--;
        } else d.history = d.history.slice(0, -1);
        trimmed = true;
      }
    while (
      historyRef.current.length > 1 &&
      (historyRef.current.length > 32 || total() > HISTORY_BYTES)
    ) {
      if (historyIndex.current > 0) {
        historyRef.current = historyRef.current.slice(1);
        historyIndex.current--;
      } else historyRef.current = historyRef.current.slice(0, -1);
      trimmed = true;
    }
    if (trimmed)
      setStatus(
        'Older undo steps were released to stay within the 512 MiB history budget.',
      );
  };
  const renderLayers = (
    ctx: CanvasRenderingContext2D,
    stack = layersRef.current,
    surfaceMap = surfacesRef.current,
    size = doc,
  ) => {
    const visible = (layer: LayerMeta) =>
      layer.visible && !ancestors(stack, layer.id).some((p) => !p.visible);
    ctx.clearRect(0, 0, size.w, size.h);
    for (const layer of [...treeOrder(stack)].reverse()) {
      if (!visible(layer) || layer.kind === 'group') continue;
      if (layer.kind === 'adjustment') {
        applyAdjustment(ctx, layer, size.w, size.h, surfaceMap.get(layer.id));
        continue;
      }
      const surface = surfaceMap.get(layer.id);
      if (!surface) continue;
      if (!layer.clipping && !layer.blendIf && !(layer.blend in extraBlends)) {
        drawLayer(ctx, layer, surface, size.w, size.h);
        continue;
      }
      const source = makeCanvas(size.w, size.h),
        sc = source.getContext('2d')!;
      drawLayer(
        sc,
        { ...layer, blend: 'source-over' },
        surface,
        size.w,
        size.h,
      );
      if (layer.clipping) {
        const siblings = stack.filter((l) => l.parentId === layer.parentId),
          index = siblings.findIndex((l) => l.id === layer.id),
          base = siblings.slice(index + 1).find((l) => !l.clipping);
        if (
          !base ||
          !visible(base) ||
          base.kind === 'group' ||
          base.kind === 'adjustment'
        ) {
          source.width = source.height = 1;
          continue;
        }
        const baseSurface = surfaceMap.get(base.id);
        if (!baseSurface) {
          source.width = source.height = 1;
          continue;
        }
        const alpha = makeCanvas(size.w, size.h);
        drawLayer(
          alpha.getContext('2d')!,
          { ...base, opacity: 100, fill: 100, blend: 'source-over' },
          baseSurface,
          size.w,
          size.h,
        );
        sc.globalCompositeOperation = 'destination-in';
        sc.drawImage(alpha, 0, 0);
        sc.globalCompositeOperation = 'source-over';
        alpha.width = alpha.height = 1;
      }
      if (layer.blendIf || layer.blend in extraBlends)
        compositePixels(ctx, source, layer.blend, layer.blendIf);
      else {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = layer.blend as GlobalCompositeOperation;
        ctx.drawImage(source, 0, 0);
        ctx.restore();
      }
      source.width = source.height = 1;
    }
  };
  const render = useCallback(() => {
    const out = displayRef.current;
    if (!out) return;
    if (out.width !== doc.w) out.width = doc.w;
    if (out.height !== doc.h) out.height = doc.h;
    const ctx = out.getContext('2d', { willReadFrequently: true })!;
    renderLayers(ctx);
    if (soloChannel && channelView !== 'rgb') {
      const image = ctx.getImageData(0, 0, doc.w, doc.h);
      for (let i = 0; i < image.data.length; i += 4) {
        const value =
          channelView === 'red'
            ? image.data[i]
            : channelView === 'green'
              ? image.data[i + 1]
              : channelView === 'blue'
                ? image.data[i + 2]
                : image.data[i + 3];
        image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
        if (channelView === 'alpha') image.data[i + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
    }
    const quick = quickMaskRef.current;
    if (quick) {
      const overlay = makeCanvas(doc.w, doc.h),
        oc = overlay.getContext('2d')!,
        alpha = maskToAlpha(quick);
      oc.fillStyle = 'rgba(255,35,85,.48)';
      oc.fillRect(0, 0, doc.w, doc.h);
      oc.globalCompositeOperation = 'destination-out';
      oc.drawImage(alpha, 0, 0);
      ctx.drawImage(overlay, 0, 0);
      alpha.width = alpha.height = overlay.width = overlay.height = 1;
    }
    if (
      cloneOverlay &&
      cloneSource.current &&
      (tool === 'clone' || (tool === 'retouch' && retouchMode === 'healing'))
    ) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.lineWidth = Math.max(1, 1 / (zoom / 100));
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(
        cloneSource.current.x,
        cloneSource.current.y,
        size / 2,
        0,
        Math.PI * 2,
      );
      ctx.moveTo(cloneSource.current.x - 7, cloneSource.current.y);
      ctx.lineTo(cloneSource.current.x + 7, cloneSource.current.y);
      ctx.moveTo(cloneSource.current.x, cloneSource.current.y - 7);
      ctx.lineTo(cloneSource.current.x, cloneSource.current.y + 7);
      ctx.stroke();
      ctx.restore();
    }
  }, [
    doc,
    channelView,
    soloChannel,
    cloneOverlay,
    tool,
    retouchMode,
    zoom,
    size,
  ]);
  useEffect(() => {
    render();
  }, [layers, render]);
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);
  useEffect(() => {
    selectionPathRef.current = selectionPath;
  }, [selectionPath]);
  useEffect(() => {
    if (dragRect && tool === 'marquee') selectionChannelRef.current = null;
  }, [dragRect, tool]);
  const snapshot = useCallback(
    (label: string, named = false) => {
      const first = surfacesRef.current.values().next().value as
          | LayerSurface
          | undefined,
        previous = historyRef.current[historyIndex.current],
        selectionCanvas = selectionRef.current
          ? selectionMask(doc.w, doc.h, 0, 0)
          : undefined;
      const snap: Snapshot = {
        label,
        named,
        w: first?.pixels.width ?? 1200,
        h: first?.pixels.height ?? 800,
        layers: layersRef.current.map((x) => ({ ...x })),
        selectedId: selectedRef.current,
        selectedIds: [...selectedIdsRef.current],
        selection: selectionCanvas
          ? captureTiles(selectionCanvas, previous?.selection)
          : undefined,
        selectionBounds: selectionRef.current
          ? { ...selectionRef.current }
          : null,
        selectionPath: selectionPathRef.current?.map((p) => ({ ...p })) ?? null,
        paths: paths.map((p) => ({
          ...p,
          points: p.points.map((point) => ({ ...point })),
        })),
        layerComps: layerComps.map((c) => ({
          ...c,
          states: c.states.map((s) => ({ ...s })),
        })),
        view: {
          ...view,
          rulerOrigin: { ...view.rulerOrigin },
          guides: view.guides.map((g) => ({ ...g })),
        },
        surfaces: layersRef.current.map((meta) => {
          const s = surfacesRef.current.get(meta.id)!,
            old = previous?.surfaces.find((x) => x.id === meta.id);
          return {
            id: meta.id,
            pixels: captureTiles(s.pixels, old?.pixels),
            mask: s.mask ? captureTiles(s.mask, old?.mask) : undefined,
          };
        }),
      };
      if (selectionCanvas) selectionCanvas.width = selectionCanvas.height = 1;
      historyRef.current = historyRef.current.slice(
        0,
        historyIndex.current + 1,
      );
      historyRef.current.push(snap);
      historyIndex.current = historyRef.current.length - 1;
      boundHistory();
      setSaved(false);
      setHistoryVersion((v) => v + 1);
    },
    [doc, paths, layerComps, view],
  );
  const restoreSnapshot = useCallback((index: number) => {
    const snap = historyRef.current[index];
    if (!snap) return;
    const current = [...surfacesRef.current.values()].reduce(
        (n, s) =>
          n +
          s.pixels.width * s.pixels.height +
          (s.mask ? s.mask.width * s.mask.height : 0),
        0,
      ),
      needed = snap.surfaces.reduce(
        (n, s) =>
          n +
          s.pixels.width * s.pixels.height +
          (s.mask ? s.mask.width * s.mask.height : 0),
        0,
      );
    try {
      requireRoom(snap.w, snap.h, needed - current);
    } catch (e) {
      setPsdError(
        e instanceof Error
          ? e.message
          : 'Close another document before restoring this step.',
      );
      return;
    }
    const nextMap = new Map<string, LayerSurface>();
    for (const item of snap.surfaces) {
      const pixels = restoreTiles(item.pixels),
        mask = item.mask ? restoreTiles(item.mask) : undefined;
      nextMap.set(item.id, { pixels, mask });
    }
    surfacesRef.current = nextMap;
    setDoc({ w: snap.w, h: snap.h });
    syncLayers(snap.layers.map((x) => ({ ...x })));
    selectMany(snap.selectedIds ?? [snap.selectedId], snap.selectedId);
    const restoredSelection = snap.selection
      ? restoreTiles(snap.selection)
      : null;
    selectionChannelRef.current = restoredSelection;
    setSelection(snap.selectionBounds ? { ...snap.selectionBounds } : null);
    selectionRef.current = snap.selectionBounds
      ? { ...snap.selectionBounds }
      : null;
    setSelectionPath(snap.selectionPath?.map((p) => ({ ...p })) ?? null);
    selectionPathRef.current =
      snap.selectionPath?.map((p) => ({ ...p })) ?? null;
    if (snap.paths)
      setPaths(
        snap.paths.map((p) => ({
          ...p,
          points: p.points.map((point) => ({ ...point })),
        })),
      );
    if (snap.layerComps) {
      const comps = snap.layerComps.map((c) => ({
        ...c,
        states: c.states.map((s) => ({ ...s })),
      }));
      layerCompsRef.current = comps;
      setLayerComps(comps);
    }
    if (snap.view) setView(readView(snap.view));
    historyIndex.current = index;
    setSaved(false);
    setStatus(snap.label);
    setHistoryVersion((v) => v + 1);
  }, []);
  const createHistorySnapshot = () => {
    setSnapshotName(
      `Snapshot ${historyRef.current.filter((x) => x.named).length + 1}`,
    );
    setSnapshotOpen(true);
  };
  const snapshotSurfaceMap = (snap: Snapshot) => {
    const map = new Map<string, LayerSurface>();
    for (const item of snap.surfaces)
      map.set(item.id, {
        pixels: restoreTiles(item.pixels),
        mask: item.mask ? restoreTiles(item.mask) : undefined,
      });
    return map;
  };
  const releaseSurfaceMap = (map: Map<string, LayerSurface>) => {
    for (const surface of map.values()) {
      surface.pixels.width = surface.pixels.height = 1;
      if (surface.mask) surface.mask.width = surface.mask.height = 1;
    }
  };
  const openHistoryBranch = (index: number) => {
    const snap = historyRef.current[index];
    if (!snap) return;
    const needed = snap.surfaces.reduce(
      (total, surface) =>
        total +
        surface.pixels.width * surface.pixels.height +
        (surface.mask ? surface.mask.width * surface.mask.height : 0),
      0,
    );
    try {
      requireRoom(snap.w, snap.h, needed);
    } catch (error) {
      setPsdError(
        error instanceof Error
          ? error.message
          : 'Close another document before opening this branch.',
      );
      return;
    }
    persistActiveDocument();
    const id = crypto.randomUUID(),
      name = `${fileName.replace(/\s—\s.+$/, '')} — ${snap.label}`,
      surfaces = snapshotSurfaceMap(snap),
      branchSnapshot: Snapshot = {
        ...snap,
        label: `Branch from ${snap.label}`,
        layers: snap.layers.map((layer) => ({ ...layer })),
        selectedIds: [...(snap.selectedIds ?? [snap.selectedId])],
        surfaces: snap.surfaces.map((surface) => ({ ...surface })),
      },
      next: EditorDocument = {
        id,
        name,
        saved: false,
        doc: { w: snap.w, h: snap.h },
        layers: branchSnapshot.layers,
        surfaces,
        selectedId: snap.selectedId,
        selectedIds: branchSnapshot.selectedIds,
        history: [branchSnapshot],
        historyIndex: 0,
        zoom,
        selection: snap.selectionBounds ? { ...snap.selectionBounds } : null,
        selectionPath: snap.selectionPath?.map((point) => ({ ...point })),
        paths: snap.paths?.map((path) => ({
          ...path,
          points: path.points.map((point) => ({ ...point })),
        })),
        layerComps: snap.layerComps?.map((comp) => ({
          ...comp,
          states: comp.states.map((state) => ({ ...state })),
        })),
        view: snap.view ? readView(snap.view) : readView(view),
      };
    documentStoreRef.current.set(id, next);
    setDocuments((items) => [...items, { id, name, saved: false }]);
    loadDocument(next);
    setStatus(`Opened an independent branch from ${snap.label}`);
  };
  const compareHistoryState = (index: number) => {
    const snap = historyRef.current[index];
    if (!snap) return;
    const width = Math.max(doc.w, snap.w),
      height = Math.max(doc.h, snap.h);
    try {
      requireRoom(width, height, width * height);
    } catch (error) {
      setPsdError(
        error instanceof Error
          ? error.message
          : 'Close another document before creating a comparison.',
      );
      return;
    }
    const currentCanvas = makeCanvas(width, height),
      previousCanvas = makeCanvas(width, height),
      snapshotMap = snapshotSurfaceMap(snap);
    renderLayers(
      currentCanvas.getContext('2d', { willReadFrequently: true })!,
      layersRef.current,
      surfacesRef.current,
      doc,
    );
    renderLayers(
      previousCanvas.getContext('2d', { willReadFrequently: true })!,
      snap.layers,
      snapshotMap,
      { w: snap.w, h: snap.h },
    );
    const currentPixels = currentCanvas
        .getContext('2d', { willReadFrequently: true })!
        .getImageData(0, 0, width, height),
      previousPixels = previousCanvas
        .getContext('2d', { willReadFrequently: true })!
        .getImageData(0, 0, width, height),
      output = makeCanvas(width, height),
      result = new ImageData(width, height);
    for (let offset = 0; offset < result.data.length; offset += 4) {
      const difference = Math.max(
          Math.abs(currentPixels.data[offset] - previousPixels.data[offset]),
          Math.abs(
            currentPixels.data[offset + 1] - previousPixels.data[offset + 1],
          ),
          Math.abs(
            currentPixels.data[offset + 2] - previousPixels.data[offset + 2],
          ),
          Math.abs(
            currentPixels.data[offset + 3] - previousPixels.data[offset + 3],
          ),
        ),
        luminance = Math.round(
          (currentPixels.data[offset] +
            currentPixels.data[offset + 1] +
            currentPixels.data[offset + 2]) /
            3,
        );
      if (difference < 2) {
        const quiet = Math.round(luminance * 0.18);
        result.data[offset] = quiet;
        result.data[offset + 1] = quiet;
        result.data[offset + 2] = quiet;
      } else {
        result.data[offset] = Math.min(255, 72 + difference * 2);
        result.data[offset + 1] = Math.min(190, difference * 0.45);
        result.data[offset + 2] = Math.min(255, 128 + difference);
      }
      result.data[offset + 3] = 255;
    }
    output.getContext('2d')!.putImageData(result, 0, 0);
    releaseSurfaceMap(snapshotMap);
    currentCanvas.width = currentCanvas.height = 1;
    previousCanvas.width = previousCanvas.height = 1;
    persistActiveDocument();
    const id = crypto.randomUUID(),
      layerId = crypto.randomUUID(),
      name = `Changes — ${snap.label} to current`,
      layer: LayerMeta = {
        id: layerId,
        name: 'Changed pixels',
        visible: true,
        opacity: 100,
        blend: 'source-over',
        x: 0,
        y: 0,
        hasMask: false,
        maskEnabled: true,
      },
      comparisonSnapshot: Snapshot = {
        label: name,
        w: width,
        h: height,
        layers: [{ ...layer }],
        selectedId: layerId,
        selectedIds: [layerId],
        surfaces: [{ id: layerId, pixels: captureTiles(output) }],
      },
      next: EditorDocument = {
        id,
        name,
        saved: false,
        doc: { w: width, h: height },
        layers: [layer],
        surfaces: new Map([[layerId, { pixels: output }]]),
        selectedId: layerId,
        selectedIds: [layerId],
        history: [comparisonSnapshot],
        historyIndex: 0,
        zoom: Math.max(10, Math.min(100, Math.floor((760 / width) * 100))),
        selection: null,
        view: readView(view),
      };
    documentStoreRef.current.set(id, next);
    setDocuments((items) => [...items, { id, name, saved: false }]);
    loadDocument(next);
    setStatus('Comparison opened — bright magenta marks changed pixels');
  };
  const undo = useCallback(() => {
    if (historyIndex.current > 0) restoreSnapshot(historyIndex.current - 1);
  }, [restoreSnapshot]);
  const redo = useCallback(() => {
    if (historyIndex.current < historyRef.current.length - 1)
      restoreSnapshot(historyIndex.current + 1);
  }, [restoreSnapshot]);
  const isLocked = (id: string) => locked(layersRef.current, id);
  const permit = (ids: string[]) => {
    if (ids.some(isLocked)) {
      setStatus('Unlock the layer or its parent group first.');
      return false;
    }
    return true;
  };
  const patchLayer = (
    id: string,
    patch: Partial<LayerMeta>,
    record?: string,
  ) => {
    if (
      Object.keys(patch).some((k) => k !== 'collapsed' && k !== 'locked') &&
      !permit([id])
    )
      return;
    if (
      'locked' in patch &&
      ancestors(layersRef.current, id).some((l) => l.locked)
    ) {
      setStatus('Unlock the parent group first.');
      return;
    }
    const next = layersRef.current.map((x) =>
      x.id === id ? { ...x, ...patch } : x,
    );
    syncLayers(next);
    setSaved(false);
    if (record) setTimeout(() => snapshot(record), 0);
  };
  const insertLayer = (meta: LayerMeta) => {
    const current = selected(),
      parentId = current?.kind === 'group' ? current.id : current?.parentId;
    if (parentId && !permit([parentId])) return false;
    meta.parentId = parentId;
    const next = [...layersRef.current],
      index = current
        ? next.findIndex((l) => l.id === current.id) +
          (current.kind === 'group' ? 1 : 0)
        : 0;
    next.splice(index, 0, meta);
    if (parentId) {
      const p = next.find((l) => l.id === parentId);
      if (p) p.collapsed = false;
    }
    syncLayers(next);
    return true;
  };
  const createLayer = (name = 'Pixel layer', selectIt = true) => {
    if (!roomForLayers()) return undefined;
    const current = selected(),
      parent = current?.kind === 'group' ? current.id : current?.parentId;
    if (parent && !permit([parent])) return undefined;
    if (!hasRoom(doc.w * doc.h)) return undefined;
    const id = crypto.randomUUID();
    surfacesRef.current.set(id, { pixels: makeCanvas(doc.w, doc.h) });
    const meta: LayerMeta = {
      id,
      name,
      visible: true,
      opacity: 100,
      blend: 'source-over',
      x: 0,
      y: 0,
      hasMask: false,
      maskEnabled: true,
    };
    insertLayer(meta);
    if (selectIt) select(id);
    setEditing('pixels');
    setTimeout(() => snapshot('New layer'), 0);
    return id;
  };
  const init = useCallback(() => {
    const bgId = crypto.randomUUID(),
      artId = crypto.randomUUID();
    const bg = makeCanvas(1200, 800),
      b = bg.getContext('2d')!;
    b.fillStyle = '#f4f4f1';
    b.fillRect(0, 0, 1200, 800);
    const art = makeCanvas(1200, 800),
      a = art.getContext('2d')!;
    const g = a.createLinearGradient(140, 130, 1060, 680);
    g.addColorStop(0, '#5659ec');
    g.addColorStop(0.52, '#9b5de5');
    g.addColorStop(1, '#fa8b72');
    a.fillStyle = g;
    a.beginPath();
    a.roundRect(120, 110, 960, 580, 52);
    a.fill();
    a.globalAlpha = 0.16;
    a.fillStyle = '#fff';
    a.beginPath();
    a.arc(900, 235, 180, 0, Math.PI * 2);
    a.fill();
    a.beginPath();
    a.arc(315, 580, 245, 0, Math.PI * 2);
    a.fill();
    a.globalAlpha = 1;
    a.fillStyle = '#fff';
    a.font = '600 74px Arial';
    a.fillText('Make something', 205, 378);
    a.font = '32px Arial';
    a.fillStyle = 'rgba(255,255,255,.82)';
    a.fillText('Every layer is editable.', 210, 438);
    surfacesRef.current = new Map([
      [artId, { pixels: art }],
      [bgId, { pixels: bg }],
    ]);
    const next: LayerMeta[] = [
      {
        id: artId,
        name: 'Artwork',
        visible: true,
        opacity: 100,
        blend: 'source-over',
        x: 0,
        y: 0,
        hasMask: false,
        maskEnabled: true,
      },
      {
        id: bgId,
        name: 'Background',
        visible: true,
        opacity: 100,
        blend: 'source-over',
        x: 0,
        y: 0,
        hasMask: false,
        maskEnabled: true,
      },
    ];
    layersRef.current = next;
    setLayers(next);
    select(artId);
    setTimeout(() => {
      snapshot('Open document');
      documentStoreRef.current.set(activeDocumentRef.current, {
        id: activeDocumentRef.current,
        name: 'Untitled artwork',
        saved: false,
        doc: { w: 1200, h: 800 },
        layers: layersRef.current,
        surfaces: surfacesRef.current,
        selectedId: selectedRef.current,
        selectedIds: [...selectedIdsRef.current],
        history: historyRef.current,
        historyIndex: historyIndex.current,
        zoom: 68,
        selection: null,
      });
    }, 0);
  }, [snapshot]);
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      init();
    }
  }, [init]);

  const persistActiveDocument = () => {
    const id = activeDocumentRef.current;
    documentStoreRef.current.set(id, {
      id,
      name: fileName,
      saved,
      doc: { ...doc },
      layers: layersRef.current,
      surfaces: surfacesRef.current,
      selectedId: selectedRef.current,
      selectedIds: [...selectedIdsRef.current],
      history: historyRef.current,
      historyIndex: historyIndex.current,
      layerComps: layerCompsRef.current,
      view,
      zoom,
      selection: selectionRef.current,
      selectionPath: selectionPathRef.current,
      paths,
      savedSelections,
      feather,
    });
  };
  const loadDocument = (next: EditorDocument) => {
    activeDocumentRef.current = next.id;
    setActiveDocumentId(next.id);
    surfacesRef.current = next.surfaces;
    layersRef.current = next.layers;
    setLayers(next.layers);
    selectMany(next.selectedIds ?? [next.selectedId], next.selectedId);
    setLayerQuery('');
    setLayerKind('all');
    setLayerState('all');
    historyRef.current = next.history;
    historyIndex.current = next.historyIndex;
    boundHistory();
    setDoc(next.doc);
    setZoom(clampZoom(next.zoom));
    setView(readView(next.view));
    setSelection(next.selection);
    selectionRef.current = next.selection;
    setSelectionPath(next.selectionPath ?? null);
    selectionPathRef.current = next.selectionPath ?? null;
    setPaths(next.paths ?? []);
    setSavedSelections(next.savedSelections ?? []);
    layerCompsRef.current = next.layerComps ?? [];
    setLayerComps(layerCompsRef.current);
    setFeather(next.feather ?? 0);
    quickMaskRef.current = null;
    selectionChannelRef.current = null;
    lastSelectionRef.current = null;
    setQuickMask(false);
    polygonDraft.current = [];
    cloneSource.current = null;
    cloneHasOffset.current = false;
    drawing.current = false;
    transformDrag.current = null;
    setFileName(next.name);
    setSaved(next.saved);
    setEditing('pixels');
    setDragRect(null);
    setDraftPoints([]);
    setStatus(`Switched to ${next.name}`);
    setHistoryVersion((v) => v + 1);
  };
  const switchDocument = (id: string) => {
    if (id === activeDocumentRef.current) return;
    persistActiveDocument();
    const next = documentStoreRef.current.get(id);
    if (next) loadDocument(next);
  };
  const makeBlankDocument = () => setNewDocumentOpen(true);
  const createBlankDocument = ({
    name,
    w,
    h,
    resolution,
    background,
  }: NewDocumentOptions) => {
    requireRoom(w, h, w * h);
    persistActiveDocument();
    const id = crypto.randomUUID(),
      layerId = crypto.randomUUID(),
      pixels = makeCanvas(w, h),
      ctx = pixels.getContext('2d')!;
    if (background !== 'transparent') {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
    }
    const nextLayers: LayerMeta[] = [
      {
        id: layerId,
        name: background === 'transparent' ? 'Layer 1' : 'Background',
        visible: true,
        opacity: 100,
        blend: 'source-over',
        x: 0,
        y: 0,
        hasMask: false,
        maskEnabled: true,
      },
    ];
    const snap: Snapshot = {
      label: 'New document',
      w,
      h,
      layers: nextLayers.map((x) => ({ ...x })),
      selectedId: layerId,
      surfaces: [{ id: layerId, pixels: captureTiles(pixels) }],
    };
    const next: EditorDocument = {
      id,
      name,
      saved: false,
      doc: { w, h },
      layers: nextLayers,
      surfaces: new Map([[layerId, { pixels }]]),
      selectedId: layerId,
      history: [snap],
      historyIndex: 0,
      zoom: Math.max(10, Math.min(100, Math.floor((760 / w) * 100))),
      selection: null,
      view: { ...defaultView, resolution },
    };
    documentStoreRef.current.set(id, next);
    setDocuments((items) => [...items, { id, name: next.name, saved: false }]);
    loadDocument(next);
  };
  const closeDocument = (id: string) => {
    const isActive = id === activeDocumentRef.current;
    if (isActive) persistActiveDocument();
    const meta = documentStoreRef.current.get(id);
    if (
      meta &&
      !meta.saved &&
      !window.confirm(
        `Close “${meta.name}” without saving your layered project?`,
      )
    )
      return;
    const remaining = documents.filter((x) => x.id !== id);
    documentStoreRef.current.delete(id);
    void deleteRecovery(id);
    if (remaining.length === 0) {
      const layerId = crypto.randomUUID(),
        pixels = makeCanvas(1200, 800),
        ctx = pixels.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 1200, 800);
      const nextId = crypto.randomUUID(),
        nextLayers: LayerMeta[] = [
          {
            id: layerId,
            name: 'Background',
            visible: true,
            opacity: 100,
            blend: 'source-over',
            x: 0,
            y: 0,
            hasMask: false,
            maskEnabled: true,
          },
        ],
        snap: Snapshot = {
          label: 'New document',
          w: 1200,
          h: 800,
          layers: nextLayers,
          selectedId: layerId,
          surfaces: [{ id: layerId, pixels: captureTiles(pixels) }],
        },
        next: EditorDocument = {
          id: nextId,
          name: 'Untitled artwork',
          saved: false,
          doc: { w: 1200, h: 800 },
          layers: nextLayers,
          surfaces: new Map([[layerId, { pixels }]]),
          selectedId: layerId,
          history: [snap],
          historyIndex: 0,
          zoom: 68,
          selection: null,
        };
      documentStoreRef.current.set(nextId, next);
      setDocuments([{ id: nextId, name: next.name, saved: false }]);
      loadDocument(next);
      setTimeout(() => recoveryTick.current(), 0);
      return;
    }
    setDocuments(remaining);
    if (isActive) {
      const index = Math.max(0, documents.findIndex((x) => x.id === id) - 1),
        next = documentStoreRef.current.get(
          remaining[Math.min(index, remaining.length - 1)].id,
        );
      if (next) loadDocument(next);
    }
    setTimeout(() => recoveryTick.current(), 0);
  };
  const renameDocument = (id: string) => {
    if (id === activeDocumentRef.current) persistActiveDocument();
    const current = documentStoreRef.current.get(id),
      fallback = documents.find((x) => x.id === id)?.name;
    if (!current && !fallback) return;
    const name = window
      .prompt('Document name', current?.name || fallback)
      ?.trim();
    if (!name) return;
    if (current) {
      current.name = name;
      current.saved = false;
    }
    setDocuments((items) =>
      items.map((x) => (x.id === id ? { ...x, name, saved: false } : x)),
    );
    if (id === activeDocumentRef.current) {
      setFileName(name);
      setSaved(false);
    }
  };
  useEffect(() => {
    setDocuments((items) =>
      items.map((x) =>
        x.id === activeDocumentId ? { ...x, name: fileName, saved } : x,
      ),
    );
  }, [activeDocumentId, fileName, saved]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) =>
    viewportRef.current!.point(e.clientX, e.clientY);
  const selected = () =>
    layersRef.current.find((x) => x.id === selectedRef.current);
  const targetContext = () => {
    const meta = selected();
    if (quickMaskRef.current && meta)
      return {
        ctx: quickMaskRef.current.getContext('2d')!,
        meta: { ...meta, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
      };
    const surface = meta && surfacesRef.current.get(meta.id);
    if (
      !meta ||
      !surface ||
      isLocked(meta.id) ||
      meta.kind === 'group' ||
      (meta.kind === 'adjustment' && editing !== 'mask')
    )
      return null;
    if (editing === 'mask' && surface.mask)
      return { ctx: surface.mask.getContext('2d')!, meta };
    return { ctx: surface.pixels.getContext('2d')!, meta };
  };
  const toLayerPoint = (meta: LayerMeta, p: Point) => {
    const cx = doc.w / 2,
      cy = doc.h / 2,
      angle = (-(meta.rotation ?? 0) * Math.PI) / 180,
      dx = p.x - meta.x - cx,
      dy = p.y - meta.y - cy,
      cos = Math.cos(angle),
      sin = Math.sin(angle);
    return {
      x: cx + (dx * cos - dy * sin) / (meta.scaleX ?? 1),
      y: cy + (dx * sin + dy * cos) / (meta.scaleY ?? 1),
    };
  };
  const withSelection = (
    ctx: CanvasRenderingContext2D,
    meta: LayerMeta,
    fn: () => void,
  ) => {
    ctx.save();
    let polygon = quickMaskRef.current ? null : selectionPathRef.current;
    if (!polygon && !quickMaskRef.current && selectionRef.current) {
      const r = selectionRef.current;
      polygon = [
        { x: r.x, y: r.y },
        { x: r.x + r.w, y: r.y },
        { x: r.x + r.w, y: r.y + r.h },
        { x: r.x, y: r.y + r.h },
      ];
    }
    if (polygon && polygon.length > 2) {
      const points = polygon.map((p) => toLayerPoint(meta, p));
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.clip();
    }
    fn();
    ctx.restore();
  };
  const finishPolygon = (kind: 'lasso' | 'path') => {
    const clean = [...polygonDraft.current];
    if (clean.length < 3) return;
    if (kind === 'lasso') {
      const mask = makeCanvas(doc.w, doc.h),
        ctx = mask.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(clean[0].x, clean[0].y);
      clean.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
      commitSelectionMask(mask, `Lasso selection · ${clean.length} points`);
    } else {
      const next = {
        id: crypto.randomUUID(),
        name: `Work Path ${paths.length + 1}`,
        points: clean,
        curved: pathMode === 'curvature' || pathCurved,
        tension: pathTension,
      };
      setPaths((items) => [next, ...items]);
      setTimeout(() => snapshot('Save work path'), 0);
      setStatus(`${next.name} saved`);
    }
    polygonDraft.current = [];
    setDraftPoints([]);
  };
  const updateFrontPath = (
    label: string,
    change: (path: SavedPath) => SavedPath,
  ) => {
    if (!paths.length) {
      setStatus('Create or select a saved path first');
      return;
    }
    setPaths((items) => [change(items[0]), ...items.slice(1)]);
    setTimeout(() => snapshot(label), 0);
    setStatus(label);
  };
  const addPathAnchor = () =>
    updateFrontPath('Anchor point added', (path) => {
      const first = path.points[0],
        last = path.points.at(-1)!;
      return {
        ...path,
        points: [
          ...path.points,
          { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 },
        ],
      };
    });
  const deletePathAnchor = () =>
    updateFrontPath('Anchor point deleted', (path) => ({
      ...path,
      points: path.points.length > 3 ? path.points.slice(0, -1) : path.points,
    }));
  const togglePathPointType = () =>
    updateFrontPath('Corner and smooth points converted', (path) => ({
      ...path,
      curved: !path.curved,
    }));
  const nudgePath = (dx: number, dy: number) =>
    updateFrontPath('Path moved with Direct Selection', (path) => ({
      ...path,
      points: path.points.map((point) => ({
        x: point.x + dx,
        y: point.y + dy,
      })),
    }));
  const fillStrokePath = (fillPath: boolean) => {
    const path = paths[0],
      target = targetContext();
    if (!path || !target || path.points.length < 2) {
      setStatus('Select a saved path and an unlocked pixel layer first');
      return;
    }
    const points = path.points.map((point) => toLayerPoint(target.meta, point));
    withSelection(target.ctx, target.meta, () => {
      target.ctx.save();
      target.ctx.beginPath();
      target.ctx.moveTo(points[0].x, points[0].y);
      if (path.curved && points.length > 2) {
        const tension = (path.tension ?? 50) / 100;
        for (let index = 1; index < points.length; index++) {
          const previous = points[index - 1],
            current = points[index],
            cx = previous.x + (current.x - previous.x) * tension,
            cy = previous.y + (current.y - previous.y) * tension;
          target.ctx.quadraticCurveTo(cx, cy, current.x, current.y);
        }
      } else
        points.slice(1).forEach((point) => target.ctx.lineTo(point.x, point.y));
      target.ctx.closePath();
      target.ctx.globalAlpha = opacity / 100;
      if (fillPath) {
        target.ctx.fillStyle = color;
        target.ctx.fill();
      } else {
        target.ctx.strokeStyle = color;
        target.ctx.lineWidth = size;
        target.ctx.stroke();
      }
      target.ctx.restore();
    });
    snapshot(fillPath ? 'Fill path' : 'Stroke path');
    render();
    setStatus(fillPath ? 'Path filled' : 'Path stroked');
  };
  const movingLayers = () => {
    const roots = selectedRoots(),
      links = new Set(roots.map((l) => l.linkId).filter(Boolean));
    const ids = new Set([
      ...selectedTree()
        .filter((l) => l.kind !== 'group' && l.kind !== 'adjustment')
        .map((l) => l.id),
      ...layersRef.current
        .filter((l) => l.linkId && links.has(l.linkId))
        .map((l) => l.id),
    ]);
    return layersRef.current.filter((l) => ids.has(l.id));
  };
  const transformLayers = () =>
    movingLayers().filter((l) => l.kind !== 'group' && l.kind !== 'adjustment');
  const nudgeLayers = (dx: number, dy: number) => {
    const items = transformLayers();
    if (!items.length || !permit(items.map((l) => l.id))) return;
    const ids = new Set(items.map((l) => l.id));
    syncLayers(
      layersRef.current.map((l) =>
        ids.has(l.id) ? { ...l, x: l.x + dx, y: l.y + dy } : l,
      ),
    );
    snapshot('Nudge layers');
    render();
    setStatus(
      `Moved ${items.length} layer${items.length === 1 ? '' : 's'} ${Math.abs(dx || dy)}px`,
    );
  };
  const patchSelectedLayers = (patch: Partial<LayerMeta>, label?: string) => {
    const items = selectedRoots().filter(
      (l) => l.kind !== 'group' && l.kind !== 'adjustment',
    );
    if (!items.length || !permit(items.map((l) => l.id))) return;
    const ids = new Set(items.map((l) => l.id));
    syncLayers(
      layersRef.current.map((l) => (ids.has(l.id) ? { ...l, ...patch } : l)),
    );
    if (label) snapshot(label);
    render();
  };
  const setTransformAxis = (axis: 'x' | 'y', value: number) => {
    const activeLayer = selected(),
      items = transformLayers();
    if (
      !activeLayer ||
      !Number.isFinite(value) ||
      !items.length ||
      !permit(items.map((l) => l.id))
    )
      return;
    const delta = value - activeLayer[axis],
      ids = new Set(items.map((l) => l.id));
    syncLayers(
      layersRef.current.map((l) =>
        ids.has(l.id) ? { ...l, [axis]: l[axis] + delta } : l,
      ),
    );
    render();
  };
  const setTransformValue = (
    key: 'rotation' | 'scaleX' | 'scaleY',
    value: number,
  ) => {
    const items = transformLayers();
    if (
      !Number.isFinite(value) ||
      !items.length ||
      !permit(items.map((l) => l.id))
    )
      return;
    const ids = new Set(items.map((l) => l.id));
    syncLayers(
      layersRef.current.map((l) =>
        ids.has(l.id) ? { ...l, [key]: value } : l,
      ),
    );
    render();
  };
  const snapMoveDelta = (dx: number, dy: number) => {
    if (!view.snap) return { dx, dy };
    const movingIds = new Set(moveOrigins.current.keys()),
      activeLayer = selected(),
      origin = activeLayer && moveOrigins.current.get(activeLayer.id);
    if (!activeLayer || !origin) return { dx, dy };
    const movingBounds = layerBounds({
        ...activeLayer,
        x: origin.x + dx,
        y: origin.y + dy,
      }),
      others = layersRef.current
        .filter(
          (l) =>
            !movingIds.has(l.id) &&
            l.visible &&
            l.kind !== 'group' &&
            l.kind !== 'adjustment',
        )
        .map(layerBounds)
        .filter(Boolean) as NonNullable<ReturnType<typeof layerBounds>>[];
    if (!movingBounds || !others.length) return { dx, dy };
    const threshold = 6 / (zoom / 100),
      snapAxis = (values: number[], targets: number[]) => {
        let adjustment = 0,
          best = threshold;
        for (const value of values)
          for (const target of targets) {
            const distance = Math.abs(target - value);
            if (distance < best) {
              best = distance;
              adjustment = target - value;
            }
          }
        return adjustment;
      };
    return {
      dx:
        dx +
        snapAxis(
          [
            movingBounds.left,
            (movingBounds.left + movingBounds.right) / 2,
            movingBounds.right,
          ],
          others.flatMap((b) => [b.left, (b.left + b.right) / 2, b.right]),
        ),
      dy:
        dy +
        snapAxis(
          [
            movingBounds.top,
            (movingBounds.top + movingBounds.bottom) / 2,
            movingBounds.bottom,
          ],
          others.flatMap((b) => [b.top, (b.top + b.bottom) / 2, b.bottom]),
        ),
    };
  };
  const begin = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = point(e),
      meta = selected();
    if (
      meta &&
      !quickMaskRef.current &&
      [
        'brush',
        'eraser',
        'clone',
        'retouch',
        'fill',
        'shape',
        'gradient',
        'text',
        'move',
      ].includes(tool) &&
      !permit([meta.id])
    )
      return;
    if (tool === 'move') {
      const moving = movingLayers();
      if (!moving.length || !permit(moving.map((l) => l.id))) return;
      moveOrigins.current = new Map(
        moving.map((l) => [l.id, { x: l.x, y: l.y }]),
      );
    }
    if (
      (tool === 'lasso' && lassoMode === 'polygonal') ||
      (tool === 'path' && pathMode !== 'freeform')
    ) {
      const next = [...polygonDraft.current, p];
      polygonDraft.current = next;
      setDraftPoints(next);
      setStatus(
        `${tool === 'lasso' ? 'Lasso' : 'Path'} · ${next.length} points · double-click to close`,
      );
      return;
    }
    if (tool === 'lasso') {
      polygonDraft.current = [p];
      setDraftPoints([p]);
    }
    if (tool === 'path' && pathMode === 'freeform') {
      polygonDraft.current = [p];
      setDraftPoints([p]);
    }
    if (['marquee', 'crop', 'shape'].includes(tool)) {
      p.x = snapPosition(p.x, 'x', doc.w, zoom, view);
      p.y = snapPosition(p.y, 'y', doc.h, zoom, view);
    }
    start.current = p;
    last.current = p;
    drawing.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    if (meta) moveOrigin.current = { x: meta.x, y: meta.y };
    if (tool === 'fill') {
      fill();
      drawing.current = false;
    }
    if (tool === 'text') {
      placeText(p);
      drawing.current = false;
    }
    if (tool === 'smart') {
      if (smartMode === 'object') selectOpaqueObject();
      else runSmartSelection(p, smartMode === 'quick');
      drawing.current = smartMode === 'quick';
      last.current = p;
    }
    if (tool === 'eyedropper') {
      render();
      const data = displayRef
          .current!.getContext('2d', { willReadFrequently: true })!
          .getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data,
        hex = `#${[data[0], data[1], data[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
      setColor(hex);
      setStatus(`Sampled ${hex}`);
      drawing.current = false;
    }
    if (tool === 'clone' || (tool === 'retouch' && retouchMode === 'healing')) {
      if (e.altKey) {
        cloneSource.current = p;
        cloneHasOffset.current = false;
        setStatus(
          tool === 'clone'
            ? 'Clone source set — paint to copy'
            : 'Healing source set — paint to blend',
        );
        drawing.current = false;
      } else if (!cloneSource.current) {
        setStatus(
          `Option/Alt-click to set a ${tool === 'clone' ? 'clone' : 'healing'} source`,
        );
        drawing.current = false;
      } else {
        if (!cloneAligned || !cloneHasOffset.current) {
          cloneOffset.current = {
            x: cloneSource.current.x - p.x + cloneOffsetX,
            y: cloneSource.current.y - p.y + cloneOffsetY,
          };
          cloneHasOffset.current = true;
        }
        const surface = meta && surfacesRef.current.get(meta.id);
        if (surface) {
          cloneBuffer.current = makeCanvas(doc.w, doc.h);
          cloneBuffer.current.getContext('2d')!.drawImage(surface.pixels, 0, 0);
        }
      }
    }
    if (tool === 'retouch' && retouchMode !== 'healing') {
      const surface = meta && surfacesRef.current.get(meta.id);
      if (surface) {
        cloneBuffer.current = makeCanvas(doc.w, doc.h);
        cloneBuffer.current.getContext('2d')!.drawImage(surface.pixels, 0, 0);
      }
    }
    if (tool === 'zoom') {
      viewportRef.current?.zoomAt(
        zoom * (e.altKey ? 1 / 1.25 : 1.25),
        e.clientX,
        e.clientY,
      );
      drawing.current = false;
    }
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const p = point(e);
    if (tool === 'smart' && smartMode === 'quick') {
      const dx = p.x - last.current.x,
        dy = p.y - last.current.y;
      if (dx * dx + dy * dy >= Math.max(16, (size * size) / 4)) {
        runSmartSelection(p, true);
        last.current = p;
      }
      return;
    }
    if (['marquee', 'crop', 'shape'].includes(tool)) {
      p.x = snapPosition(p.x, 'x', doc.w, zoom, view);
      p.y = snapPosition(p.y, 'y', doc.h, zoom, view);
    }
    if (tool === 'lasso' && lassoMode !== 'polygonal') {
      const previous = polygonDraft.current.at(-1) ?? p,
        dx = p.x - previous.x,
        dy = p.y - previous.y;
      if (dx * dx + dy * dy >= 9) {
        const nextPoint = lassoMode === 'magnetic' ? magneticPoint(p) : p;
        polygonDraft.current = [...polygonDraft.current, nextPoint];
        setDraftPoints(polygonDraft.current);
      }
      return;
    }
    if (tool === 'path' && pathMode === 'freeform') {
      const previous = polygonDraft.current.at(-1) ?? p,
        dx = p.x - previous.x,
        dy = p.y - previous.y;
      if (dx * dx + dy * dy >= 9) {
        polygonDraft.current = [...polygonDraft.current, p];
        setDraftPoints(polygonDraft.current);
      }
      return;
    }
    if (tool === 'brush' || tool === 'eraser') {
      const target = targetContext();
      if (!target) return;
      let local = toLayerPoint(target.meta, p);
      const prev = toLayerPoint(target.meta, last.current),
        smoothing = Math.max(0, Math.min(0.95, brushSmoothing / 105));
      local = {
        x: local.x * (1 - smoothing) + prev.x * smoothing,
        y: local.y * (1 - smoothing) + prev.y * smoothing,
      };
      const pointerPressure =
          e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 1,
        pressureScale = pressureSize ? Math.max(0.08, pointerPressure) : 1,
        pressureAlpha = pressureOpacity ? Math.max(0.03, pointerPressure) : 1,
        tilt = tiltShape && e.pointerType === 'pen',
        tiltMagnitude = tilt
          ? Math.min(0.82, Math.hypot(e.tiltX, e.tiltY) / 90)
          : 0,
        tiltAngle = Math.atan2(e.tiltY, e.tiltX),
        drawStroke = (ctx: CanvasRenderingContext2D) => {
          const paint =
              editing === 'mask'
                ? tool === 'eraser'
                  ? 'white'
                  : maskGray(color)
                : tool === 'eraser'
                  ? 'white'
                  : color,
            dx = local.x - prev.x,
            dy = local.y - prev.y,
            distance = Math.hypot(dx, dy),
            step = Math.max(
              1,
              paintMode === 'pencil'
                ? Math.max(1, size * 0.2)
                : (size * brushSpacing) / 100,
            ),
            count = Math.max(1, Math.ceil(distance / step));
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = (((opacity / 100) * flow) / 100) * pressureAlpha;
          for (let i = 0; i <= count; i++) {
            const baseX = prev.x + (dx * i) / count,
              baseY = prev.y + (dy * i) / count,
              scatterRadius = (brushScatter / 100) * size,
              scatterAngle = Math.random() * Math.PI * 2,
              x =
                baseX + Math.cos(scatterAngle) * scatterRadius * Math.random(),
              y =
                baseY + Math.sin(scatterAngle) * scatterRadius * Math.random(),
              jitterScale = 1 - (sizeJitter / 100) * Math.random() * 0.75,
              dabSize = Math.max(1, size * pressureScale * jitterScale),
              jitteredPaint =
                editing === 'pixels' && tool === 'brush' && hueJitter
                  ? shiftedHex(color, (Math.random() * 2 - 1) * hueJitter * 1.8)
                  : paint,
              dabPaint = (() => {
                if (!mixerBrush || editing !== 'pixels' || tool !== 'brush')
                  return jitteredPaint;
                const sampled = target.ctx.getImageData(
                    Math.max(0, Math.min(doc.w - 1, Math.round(x))),
                    Math.max(0, Math.min(doc.h - 1, Math.round(y))),
                    1,
                    1,
                  ).data,
                  fresh = [1, 3, 5].map((at) =>
                    parseInt(jitteredPaint.slice(at, at + 2), 16),
                  ),
                  mix = mixerMix / 100,
                  wet = mixerWet / 100,
                  load = mixerLoad / 100;
                return `#${fresh
                  .map((channel, at) =>
                    Math.round(
                      channel * load * (1 - mix) +
                        sampled[at] * wet * mix +
                        channel * (1 - load) * (1 - wet),
                    )
                      .toString(16)
                      .padStart(2, '0'),
                  )
                  .join('')}`;
              })();
            const baseAlpha = (((opacity / 100) * flow) / 100) * pressureAlpha,
              textureAlpha =
                1 -
                (brushTexture / 100) *
                  (0.25 + 0.75 * Math.abs(Math.sin(x * 0.37 + y * 0.19)));
            ctx.globalAlpha = baseAlpha * textureAlpha;
            if (paintMode === 'pencil') {
              ctx.fillStyle = dabPaint;
              ctx.fillRect(
                Math.round(x - dabSize / 2),
                Math.round(y - dabSize / 2),
                Math.max(1, Math.round(dabSize)),
                Math.max(1, Math.round(dabSize)),
              );
              continue;
            }
            const radius = dabSize / 2,
              inner = radius * Math.max(0, Math.min(1, hardness / 100)),
              g = ctx.createRadialGradient(0, 0, inner, 0, 0, radius),
              transparentPaint = dabPaint.startsWith('#')
                ? `${dabPaint}00`
                : dabPaint.startsWith('rgb(')
                  ? dabPaint.replace(/^rgb\((.*)\)$/, 'rgba($1,0)')
                  : dabPaint === 'white'
                    ? 'rgba(255,255,255,0)'
                    : 'rgba(0,0,0,0)';
            g.addColorStop(0, dabPaint);
            g.addColorStop(Math.min(0.999, inner / radius), dabPaint);
            g.addColorStop(1, transparentPaint);
            ctx.save();
            ctx.translate(x, y);
            if (tilt) {
              ctx.rotate(tiltAngle);
              ctx.scale(1, Math.max(0.18, 1 - tiltMagnitude));
            }
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        };
      if (!quickMaskRef.current && (selectionChannelRef.current || feather)) {
        const stroke = makeCanvas(doc.w, doc.h),
          sc = stroke.getContext('2d')!;
        drawStroke(sc);
        const alpha = selectionMask(doc.w, doc.h, 0, 0),
          localAlpha = makeCanvas(doc.w, doc.h),
          ac = localAlpha.getContext('2d')!;
        ac.translate(doc.w / 2, doc.h / 2);
        ac.scale(1 / (target.meta.scaleX || 1), 1 / (target.meta.scaleY || 1));
        ac.rotate((-(target.meta.rotation ?? 0) * Math.PI) / 180);
        ac.translate(-target.meta.x - doc.w / 2, -target.meta.y - doc.h / 2);
        ac.drawImage(alpha, 0, 0);
        sc.globalCompositeOperation = 'destination-in';
        sc.drawImage(localAlpha, 0, 0);
        target.ctx.save();
        target.ctx.globalAlpha = 1;
        target.ctx.globalCompositeOperation =
          editing === 'pixels' && tool === 'eraser'
            ? 'destination-out'
            : 'source-over';
        target.ctx.drawImage(stroke, 0, 0);
        target.ctx.restore();
        stroke.width =
          stroke.height =
          alpha.width =
          alpha.height =
          localAlpha.width =
          localAlpha.height =
            1;
      } else
        withSelection(target.ctx, target.meta, () => {
          if (
            !quickMaskRef.current &&
            editing === 'pixels' &&
            tool === 'eraser'
          ) {
            const temp = makeCanvas(doc.w, doc.h),
              tc = temp.getContext('2d')!;
            drawStroke(tc);
            target.ctx.save();
            target.ctx.globalCompositeOperation = 'destination-out';
            target.ctx.drawImage(temp, 0, 0);
            target.ctx.restore();
            temp.width = temp.height = 1;
          } else drawStroke(target.ctx);
        });
      last.current = p;
      render();
    } else if (tool === 'clone') {
      const target = targetContext(),
        buffer = cloneBuffer.current;
      if (!target || !buffer || editing === 'mask') return;
      const previous = last.current,
        distance = Math.hypot(p.x - previous.x, p.y - previous.y),
        spacing = Math.max(1, (size * brushSpacing) / 100),
        count = Math.max(1, Math.ceil(distance / spacing));
      withSelection(target.ctx, target.meta, () => {
        for (let index = 1; index <= count; index++) {
          const point = {
              x: previous.x + ((p.x - previous.x) * index) / count,
              y: previous.y + ((p.y - previous.y) * index) / count,
            },
            local = toLayerPoint(target.meta, point),
            baseSource = {
              x: point.x + cloneOffset.current.x,
              y: point.y + cloneOffset.current.y,
            },
            center = cloneSource.current ?? baseSource,
            angle = (cloneRotation * Math.PI) / 180,
            scale = Math.max(0.1, cloneScale / 100),
            dx = ((baseSource.x - center.x) * (cloneFlipX ? -1 : 1)) / scale,
            dy = ((baseSource.y - center.y) * (cloneFlipY ? -1 : 1)) / scale,
            source = toLayerPoint(target.meta, {
              x: center.x + dx * Math.cos(angle) + dy * Math.sin(angle),
              y: center.y - dx * Math.sin(angle) + dy * Math.cos(angle),
            });
          target.ctx.save();
          target.ctx.globalAlpha = opacity / 100;
          target.ctx.beginPath();
          target.ctx.arc(local.x, local.y, size / 2, 0, Math.PI * 2);
          target.ctx.clip();
          target.ctx.drawImage(buffer, local.x - source.x, local.y - source.y);
          target.ctx.restore();
        }
      });
      last.current = p;
      render();
    } else if (tool === 'retouch') {
      const target = targetContext(),
        buffer = cloneBuffer.current;
      if (!target || !buffer || editing === 'mask') return;
      const previous = last.current,
        distance = Math.hypot(p.x - previous.x, p.y - previous.y),
        spacing = Math.max(2, size * 0.22),
        count = Math.max(1, Math.ceil(distance / spacing));
      withSelection(target.ctx, target.meta, () => {
        for (let index = 1; index <= count; index++) {
          const point = {
              x: previous.x + ((p.x - previous.x) * index) / count,
              y: previous.y + ((p.y - previous.y) * index) / count,
            },
            local = toLayerPoint(target.meta, point),
            radius = Math.max(2, size / 2),
            x = Math.max(0, Math.floor(local.x - radius)),
            y = Math.max(0, Math.floor(local.y - radius)),
            w = Math.min(doc.w - x, Math.ceil(radius * 2)),
            h = Math.min(doc.h - y, Math.ceil(radius * 2));
          if (w <= 0 || h <= 0) continue;
          target.ctx.save();
          target.ctx.globalAlpha = opacity / 100;
          target.ctx.beginPath();
          target.ctx.arc(local.x, local.y, radius, 0, Math.PI * 2);
          target.ctx.clip();
          if (retouchMode === 'healing') {
            const sourcePoint = toLayerPoint(target.meta, {
              x: point.x + cloneOffset.current.x,
              y: point.y + cloneOffset.current.y,
            });
            target.ctx.globalAlpha = (opacity / 100) * 0.72;
            target.ctx.drawImage(
              buffer,
              sourcePoint.x - radius,
              sourcePoint.y - radius,
              radius * 2,
              radius * 2,
              local.x - radius,
              local.y - radius,
              radius * 2,
              radius * 2,
            );
          } else if (retouchMode === 'spot') {
            const ring = Math.max(2, Math.round(radius * 0.35)),
              sample = buffer
                .getContext('2d', { willReadFrequently: true })!
                .getImageData(
                  Math.max(0, x - ring),
                  Math.max(0, y - ring),
                  Math.min(doc.w - Math.max(0, x - ring), w + ring * 2),
                  Math.min(doc.h - Math.max(0, y - ring), h + ring * 2),
                ).data;
            let r = 0,
              g = 0,
              b = 0,
              a = 0,
              samples = 0;
            for (let i = 0; i < sample.length; i += 16) {
              if (!sample[i + 3]) continue;
              r += sample[i];
              g += sample[i + 1];
              b += sample[i + 2];
              a += sample[i + 3];
              samples++;
            }
            target.ctx.fillStyle = `rgba(${r / Math.max(1, samples)},${g / Math.max(1, samples)},${b / Math.max(1, samples)},${a / Math.max(1, samples) / 255})`;
            target.ctx.fillRect(x, y, w, h);
          } else {
            const patch = makeCanvas(w, h),
              pc = patch.getContext('2d')!;
            if (retouchMode === 'smudge')
              pc.drawImage(
                buffer,
                Math.max(0, x - (p.x - previous.x)),
                Math.max(0, y - (p.y - previous.y)),
                w,
                h,
                0,
                0,
                w,
                h,
              );
            else {
              pc.filter =
                retouchMode === 'dodge'
                  ? 'brightness(1.18)'
                  : retouchMode === 'burn'
                    ? 'brightness(.82)'
                    : retouchMode === 'sponge'
                      ? 'saturate(1.35)'
                      : retouchMode === 'blur'
                        ? `blur(${Math.max(1, radius / 6)}px)`
                        : 'contrast(1.35) saturate(1.08)';
              pc.drawImage(buffer, x, y, w, h, 0, 0, w, h);
            }
            target.ctx.drawImage(patch, x, y);
            patch.width = patch.height = 1;
          }
          target.ctx.restore();
        }
      });
      last.current = p;
      render();
    } else if (tool === 'move') {
      const meta = selected();
      if (meta) {
        const candidateX = Math.round(
            snapPosition(
              moveOrigin.current.x + p.x - start.current.x,
              'x',
              doc.w,
              zoom,
              view,
            ) - moveOrigin.current.x,
          ),
          candidateY = Math.round(
            snapPosition(
              moveOrigin.current.y + p.y - start.current.y,
              'y',
              doc.h,
              zoom,
              view,
            ) - moveOrigin.current.y,
          ),
          snapped = snapMoveDelta(candidateX, candidateY),
          dx = Math.round(snapped.dx),
          dy = Math.round(snapped.dy);
        if (!permit([...moveOrigins.current.keys()])) return;
        syncLayers(
          layersRef.current.map((l) => {
            const origin = moveOrigins.current.get(l.id);
            return origin ? { ...l, x: origin.x + dx, y: origin.y + dy } : l;
          }),
        );
        setSaved(false);
      }
    } else if (['marquee', 'crop', 'shape', 'gradient'].includes(tool)) {
      setDragRect({
        x: Math.min(start.current.x, p.x),
        y: Math.min(start.current.y, p.y),
        w: Math.abs(p.x - start.current.x),
        h: Math.abs(p.y - start.current.y),
      });
    }
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (tool === 'lasso' && lassoMode !== 'polygonal') {
      finishPolygon('lasso');
      render();
      return;
    }
    if (tool === 'path' && pathMode === 'freeform') {
      finishPolygon('path');
      render();
      return;
    }
    if (
      !quickMaskRef.current &&
      (tool === 'brush' ||
        tool === 'eraser' ||
        tool === 'clone' ||
        tool === 'retouch' ||
        tool === 'move')
    )
      snapshot(
        tool === 'move'
          ? 'Move layer'
          : tool === 'clone'
            ? 'Clone stamp'
            : tool === 'retouch'
              ? `${retouchMode[0].toUpperCase()}${retouchMode.slice(1)} retouch`
              : editing === 'mask'
                ? 'Paint mask'
                : tool === 'eraser'
                  ? 'Erase'
                  : 'Brush stroke',
      );
    if (tool === 'marquee' || tool === 'crop') {
      if (dragRect && dragRect.w > 2 && dragRect.h > 2) {
        if (tool === 'marquee') {
          const chosen =
              selectionShape === 'row'
                ? { x: 0, y: Math.round(dragRect.y), w: doc.w, h: 1 }
                : selectionShape === 'column'
                  ? { x: Math.round(dragRect.x), y: 0, w: 1, h: doc.h }
                  : dragRect,
            mask = makeCanvas(doc.w, doc.h),
            ctx = mask.getContext('2d')!;
          ctx.fillStyle = 'white';
          if (selectionShape === 'ellipse') {
            ctx.beginPath();
            ctx.ellipse(
              chosen.x + chosen.w / 2,
              chosen.y + chosen.h / 2,
              chosen.w / 2,
              chosen.h / 2,
              0,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          } else ctx.fillRect(chosen.x, chosen.y, chosen.w, chosen.h);
          commitSelectionMask(mask, `${selectionShape} marquee`);
        } else {
          setSelection(dragRect);
          selectionRef.current = dragRect;
        }
      }
      setDragRect(null);
    }
    if (tool === 'shape' && dragRect) {
      shape(dragRect);
      setDragRect(null);
    }
    if (tool === 'gradient' && dragRect) {
      applyGradient(dragRect);
      setDragRect(null);
    }
    render();
    setStatus(
      quickMaskRef.current
        ? 'Quick Mask — paint black to exclude; erase to restore'
        : 'Ready',
    );
  };

  const fill = () => {
    const target = targetContext();
    if (!target) return;
    const local = toLayerPoint(target.meta, last.current),
      ctx = target.ctx,
      source = ctx.getImageData(0, 0, doc.w, doc.h),
      sx = Math.max(0, Math.min(doc.w - 1, Math.floor(local.x))),
      sy = Math.max(0, Math.min(doc.h - 1, Math.floor(local.y))),
      seed = (sy * doc.w + sx) * 4,
      base = [
        source.data[seed],
        source.data[seed + 1],
        source.data[seed + 2],
        source.data[seed + 3],
      ],
      matches = (index: number) => {
        const i = index * 4;
        return (
          Math.abs(source.data[i] - base[0]) +
            Math.abs(source.data[i + 1] - base[1]) +
            Math.abs(source.data[i + 2] - base[2]) +
            Math.abs(source.data[i + 3] - base[3]) <=
          fillTolerance * 4
        );
      },
      picked = new Uint8Array(doc.w * doc.h);
    if (fillContiguous) {
      const seen = new Uint8Array(picked.length),
        stack = [sy * doc.w + sx];
      while (stack.length) {
        const index = stack.pop()!;
        if (seen[index]) continue;
        seen[index] = 1;
        if (!matches(index)) continue;
        picked[index] = 1;
        const x = index % doc.w,
          y = Math.floor(index / doc.w);
        if (x > 0) stack.push(index - 1);
        if (x < doc.w - 1) stack.push(index + 1);
        if (y > 0) stack.push(index - doc.w);
        if (y < doc.h - 1) stack.push(index + doc.w);
      }
    } else
      for (let i = 0; i < picked.length; i++) if (matches(i)) picked[i] = 1;
    const overlay = makeCanvas(doc.w, doc.h),
      image = overlay.getContext('2d')!.createImageData(doc.w, doc.h),
      rgb = [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
      ],
      gray = Math.round(0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]);
    let count = 0;
    for (let index = 0; index < picked.length; index++)
      if (picked[index]) {
        const i = index * 4,
          v = editing === 'mask' ? gray : 0;
        image.data[i] = editing === 'mask' ? v : rgb[0];
        image.data[i + 1] = editing === 'mask' ? v : rgb[1];
        image.data[i + 2] = editing === 'mask' ? v : rgb[2];
        image.data[i + 3] = Math.round((opacity / 100) * 255);
        count++;
      }
    overlay.getContext('2d')!.putImageData(image, 0, 0);
    withSelection(ctx, target.meta, () => ctx.drawImage(overlay, 0, 0));
    overlay.width = overlay.height = 1;
    snapshot(editing === 'mask' ? 'Paint mask fill' : 'Paint Bucket');
    render();
    setStatus(`Paint Bucket filled ${count.toLocaleString()} matching pixels`);
  };
  const shape = (r: Rect) => {
    const target = targetContext();
    if (!target) return;
    const first = toLayerPoint(target.meta, { x: r.x, y: r.y }),
      second = toLayerPoint(target.meta, { x: r.x + r.w, y: r.y + r.h }),
      x = Math.min(first.x, second.x),
      y = Math.min(first.y, second.y),
      width = Math.abs(second.x - first.x),
      height = Math.abs(second.y - first.y),
      radius = Math.min(shapeRadius, width / 2, height / 2),
      foreground = editing === 'mask' ? maskGray(color) : color,
      background =
        editing === 'mask' ? maskGray(backgroundColor) : backgroundColor;
    withSelection(target.ctx, target.meta, () => {
      target.ctx.save();
      target.ctx.globalAlpha = opacity / 100;
      target.ctx.beginPath();
      if (shapeKind === 'ellipse')
        target.ctx.ellipse(
          x + width / 2,
          y + height / 2,
          width / 2,
          height / 2,
          0,
          0,
          Math.PI * 2,
        );
      else if (shapeKind === 'polygon') {
        const sides = Math.max(3, Math.min(24, polygonSides)),
          cx = x + width / 2,
          cy = y + height / 2;
        for (let index = 0; index < sides; index++) {
          const angle = -Math.PI / 2 + (index * Math.PI * 2) / sides,
            px = cx + (Math.cos(angle) * width) / 2,
            py = cy + (Math.sin(angle) * height) / 2;
          if (index) target.ctx.lineTo(px, py);
          else target.ctx.moveTo(px, py);
        }
        target.ctx.closePath();
      } else target.ctx.roundRect(x, y, width, height, radius);
      if (shapeFill) {
        target.ctx.fillStyle = foreground;
        target.ctx.fill();
      }
      target.ctx.strokeStyle = shapeFill ? background : foreground;
      target.ctx.lineWidth = size;
      target.ctx.stroke();
      target.ctx.restore();
    });
    snapshot(
      shapeKind === 'ellipse'
        ? 'Ellipse'
        : shapeKind === 'polygon'
          ? `${polygonSides}-sided polygon`
          : shapeRadius
            ? 'Rounded rectangle'
            : 'Rectangle',
    );
    render();
  };
  const applyGradient = (r: Rect) => {
    const target = targetContext();
    if (!target) return;
    const a = toLayerPoint(target.meta, { x: r.x, y: r.y }),
      b = toLayerPoint(target.meta, { x: r.x + r.w, y: r.y + r.h }),
      g = target.ctx.createLinearGradient(a.x, a.y, b.x, b.y),
      mix = (a: string, b: string) =>
        '#' +
        [1, 3, 5]
          .map((i) =>
            Math.round(
              (parseInt(a.slice(i, i + 2), 16) +
                parseInt(b.slice(i, i + 2), 16)) /
                2,
            )
              .toString(16)
              .padStart(2, '0'),
          )
          .join('');
    g.addColorStop(0, color);
    g.addColorStop(
      Math.max(0.01, Math.min(0.99, gradientMidpoint / 100)),
      mix(color, backgroundColor),
    );
    g.addColorStop(1, backgroundColor);
    withSelection(target.ctx, target.meta, () => {
      target.ctx.globalAlpha = opacity / 100;
      target.ctx.fillStyle = g;
      target.ctx.fillRect(0, 0, doc.w, doc.h);
    });
    snapshot('Gradient');
    render();
  };
  const placeText = (p: { x: number; y: number }) => {
    if (editing === 'mask') return;
    const id = createLayer('Text layer');
    if (!id) return;
    const meta = layersRef.current.find((layer) => layer.id === id),
      surface = surfacesRef.current.get(id);
    if (!meta || !surface) return;
    const textLayer: TextLayerData = {
      content: text,
      color,
      originX: p.x,
      originY: p.y,
      paragraph: textParagraph,
      width: textWidth,
      family: fontFamily,
      weight: fontWeight,
      size: fontSize,
      tracking: textTracking,
      kerning: textKerning,
      leading: textLeading,
      baseline: textBaseline,
      align: textAlign,
      onPath: textOnPath,
      warp: textWarp,
      smallCaps: textSmallCaps,
      ligatures: textLigatures,
    };
    drawEditableText(surface.pixels, textLayer);
    patchLayer(id, { textLayer }, 'Create editable text layer');
    snapshot('Create editable text layer');
    render();
    setStatus('Editable text layer created');
  };
  const updateSelectedText = () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (!meta?.textLayer || !surface || isLocked(meta.id)) {
      setStatus('Select an editable text layer first');
      return;
    }
    const textLayer: TextLayerData = {
      ...meta.textLayer,
      content: text,
      color,
      paragraph: textParagraph,
      width: textWidth,
      family: fontFamily,
      weight: fontWeight,
      size: fontSize,
      tracking: textTracking,
      kerning: textKerning,
      leading: textLeading,
      baseline: textBaseline,
      align: textAlign,
      onPath: textOnPath,
      warp: textWarp,
      smallCaps: textSmallCaps,
      ligatures: textLigatures,
    };
    drawEditableText(surface.pixels, textLayer);
    patchLayer(meta.id, { textLayer }, 'Edit text layer');
    render();
    setStatus('Text layer updated');
  };
  const convertTextToShapes = () => {
    const meta = selected();
    if (!meta?.textLayer) return;
    const t = meta.textLayer,
      width = Math.min(
        doc.w - t.originX,
        Math.max(20, t.content.length * (t.size * 0.62 + t.tracking)),
      ),
      path: SavedPath = {
        id: crypto.randomUUID(),
        name: `${meta.name} outline`,
        curved: false,
        points: [
          { x: t.originX, y: t.originY - t.size },
          { x: t.originX + width, y: t.originY - t.size },
          { x: t.originX + width, y: t.originY + t.size * t.leading },
          { x: t.originX, y: t.originY + t.size * t.leading },
        ],
      };
    setPaths((items) => [path, ...items]);
    patchLayer(meta.id, { textLayer: undefined }, 'Convert text to shape');
    setStatus('Text converted to an editable outline path');
  };
  const magneticPoint = (p: Point) => {
    const surface = surfacesRef.current.get(selectedRef.current),
      meta = selected();
    if (!surface || !meta) return p;
    const local = toLayerPoint(meta, p),
      ctx = surface.pixels.getContext('2d', { willReadFrequently: true })!,
      x0 = Math.max(1, Math.floor(local.x) - 7),
      y0 = Math.max(1, Math.floor(local.y) - 7),
      x1 = Math.min(doc.w - 2, Math.floor(local.x) + 7),
      y1 = Math.min(doc.h - 2, Math.floor(local.y) + 7);
    let best = local,
      score = -1;
    for (let y = y0; y <= y1; y += 2)
      for (let x = x0; x <= x1; x += 2) {
        const d = ctx.getImageData(x - 1, y - 1, 3, 3).data,
          g = (i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2],
          n = Math.abs(g(16) - g(20)) + Math.abs(g(4) - g(28));
        if (n > score) {
          score = n;
          best = { x, y };
        }
      }
    const cx = doc.w / 2,
      cy = doc.h / 2,
      a = ((meta.rotation ?? 0) * Math.PI) / 180,
      dx = (best.x - cx) * (meta.scaleX ?? 1),
      dy = (best.y - cy) * (meta.scaleY ?? 1);
    return {
      x: meta.x + cx + dx * Math.cos(a) - dy * Math.sin(a),
      y: meta.y + cy + dx * Math.sin(a) + dy * Math.cos(a),
    };
  };
  const smartSelect = (p: { x: number; y: number }) => {
    const surface = surfacesRef.current.get(selectedRef.current),
      meta = selected();
    if (!surface || !meta) return;
    const local = toLayerPoint(meta, p),
      ctx = surface.pixels.getContext('2d', { willReadFrequently: true })!,
      data = ctx.getImageData(0, 0, doc.w, doc.h),
      seedX = Math.max(0, Math.min(doc.w - 1, Math.floor(local.x))),
      seedY = Math.max(0, Math.min(doc.h - 1, Math.floor(local.y))),
      i = (seedY * doc.w + seedX) * 4,
      base = [data.data[i], data.data[i + 1], data.data[i + 2]],
      matches = (idx: number) => {
        const k = idx * 4;
        return (
          Math.abs(data.data[k] - base[0]) +
            Math.abs(data.data[k + 1] - base[1]) +
            Math.abs(data.data[k + 2] - base[2]) <=
          magicTolerance * 3
        );
      },
      picked = new Uint8Array(doc.w * doc.h);
    let minX = doc.w,
      maxX = -1,
      minY = doc.h,
      maxY = -1,
      count = 0;
    if (magicContiguous) {
      const seen = new Uint8Array(doc.w * doc.h),
        q: [number, number][] = [[seedX, seedY]];
      while (q.length) {
        const [x, y] = q.pop()!,
          idx = y * doc.w + x;
        if (seen[idx]) continue;
        seen[idx] = 1;
        if (!matches(idx)) continue;
        picked[idx] = 1;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        count++;
        if (x > 0) q.push([x - 1, y]);
        if (x < doc.w - 1) q.push([x + 1, y]);
        if (y > 0) q.push([x, y - 1]);
        if (y < doc.h - 1) q.push([x, y + 1]);
      }
    } else
      for (let idx = 0; idx < doc.w * doc.h; idx++)
        if (matches(idx)) {
          picked[idx] = 1;
          const x = idx % doc.w,
            y = Math.floor(idx / doc.w);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          count++;
        }
    let bounds: Rect | null = null;
    if (count) {
      const localMask = makeCanvas(doc.w, doc.h),
        image = localMask.getContext('2d')!.createImageData(doc.w, doc.h);
      for (let idx = 0; idx < picked.length; idx++)
        if (picked[idx]) {
          const k = idx * 4;
          image.data[k] =
            image.data[k + 1] =
            image.data[k + 2] =
            image.data[k + 3] =
              255;
        }
      localMask.getContext('2d')!.putImageData(image, 0, 0);
      const mask = makeCanvas(doc.w, doc.h),
        mc = mask.getContext('2d')!;
      mc.translate(meta.x + doc.w / 2, meta.y + doc.h / 2);
      mc.rotate(((meta.rotation ?? 0) * Math.PI) / 180);
      mc.scale(meta.scaleX ?? 1, meta.scaleY ?? 1);
      mc.drawImage(localMask, -doc.w / 2, -doc.h / 2);
      localMask.width = localMask.height = 1;
      selectionChannelRef.current = mask;
      const pixels = mc.getImageData(0, 0, doc.w, doc.h).data;
      let left = doc.w,
        top = doc.h,
        right = -1,
        bottom = -1;
      for (let y = 0; y < doc.h; y++)
        for (let x = 0; x < doc.w; x++)
          if (pixels[(y * doc.w + x) * 4 + 3]) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
      bounds =
        right >= left
          ? { x: left, y: top, w: right - left + 1, h: bottom - top + 1 }
          : null;
    } else selectionChannelRef.current = null;
    setSelectionPath(null);
    selectionPathRef.current = null;
    setSelection(bounds);
    selectionRef.current = bounds;
    setStatus(
      count
        ? `Magic Wand selected ${count.toLocaleString()} ${magicContiguous ? 'connected ' : ''}pixels`
        : 'Magic Wand found no matching pixels',
    );
  };
  const cropToSelection = () => {
    if (!permit(layersRef.current.map((l) => l.id))) return;
    const s = selectionRef.current;
    if (!s || s.w < 2 || s.h < 2) return;
    const nw = Math.round(s.w),
      nh = Math.round(s.h);
    if (!allowResize(nw, nh)) return;
    for (const meta of layersRef.current) {
      if (meta.kind === 'group' || meta.kind === 'adjustment') continue;
      const old = surfacesRef.current.get(meta.id);
      if (!old) continue;
      const placed = makeCanvas(doc.w, doc.h);
      drawLayer(
        placed.getContext('2d')!,
        {
          ...meta,
          opacity: 100,
          fill: 100,
          blend: 'source-over',
          hasMask: false,
          vectorMask: undefined,
        },
        { pixels: old.pixels },
        doc.w,
        doc.h,
      );
      const pixels = makeCanvas(nw, nh);
      pixels.getContext('2d')!.drawImage(placed, -s.x, -s.y);
      placed.width = placed.height = 1;
      let mask: HTMLCanvasElement | undefined;
      if (old.mask) {
        mask = makeCanvas(nw, nh);
        if (meta.maskLinked === false)
          mask.getContext('2d')!.drawImage(old.mask, -s.x, -s.y);
        else {
          const placedMask = makeCanvas(doc.w, doc.h);
          drawLayer(
            placedMask.getContext('2d')!,
            {
              ...meta,
              opacity: 100,
              fill: 100,
              blend: 'source-over',
              hasMask: false,
              vectorMask: undefined,
              brightness: 100,
              contrast: 100,
              saturation: 100,
              blur: 0,
            },
            { pixels: old.mask },
            doc.w,
            doc.h,
          );
          mask.getContext('2d')!.drawImage(placedMask, -s.x, -s.y);
          placedMask.width = placedMask.height = 1;
        }
      }
      surfacesRef.current.set(meta.id, { pixels, mask });
      meta.x = 0;
      meta.y = 0;
      meta.rotation = 0;
      meta.scaleX = 1;
      meta.scaleY = 1;
      if (meta.vectorMask)
        meta.vectorMask = meta.vectorMask.map((point) => ({
          x: point.x - s.x,
          y: point.y - s.y,
        }));
    }
    setDoc({ w: nw, h: nh });
    setSelection(null);
    selectionRef.current = null;
    setTimeout(() => {
      snapshot('Crop');
      render();
    }, 0);
  };
  const selectAll = () => {
    selectionChannelRef.current = null;
    setSelectionPath(null);
    selectionPathRef.current = null;
    setSelection({ x: 0, y: 0, w: doc.w, h: doc.h });
    selectionRef.current = { x: 0, y: 0, w: doc.w, h: doc.h };
  };
  const addMask = () => {
    const meta = selected();
    if (!meta || isLocked(meta.id) || meta.kind === 'group') return;
    const surface = surfacesRef.current.get(meta.id)!;
    if (!surface.mask) {
      if (!hasRoom(doc.w * doc.h)) return;
      surface.mask = makeCanvas(doc.w, doc.h);
      const ctx = surface.mask.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, doc.w, doc.h);
      patchLayer(meta.id, {
        hasMask: true,
        maskEnabled: true,
        maskDensity: 100,
        maskFeather: 0,
        maskLinked: true,
      });
    }
    setEditing('mask');
    snapshot('Add layer mask');
    render();
  };
  const toggleQuickMask = () => {
    if (quickMaskRef.current) {
      const mask = quickMaskRef.current,
        data = mask
          .getContext('2d', { willReadFrequently: true })!
          .getImageData(0, 0, doc.w, doc.h).data;
      let left = doc.w,
        top = doc.h,
        right = -1,
        bottom = -1;
      for (let y = 0; y < doc.h; y++)
        for (let x = 0; x < doc.w; x++) {
          const i = (y * doc.w + x) * 4;
          if (data[i + 3] && data[i] + data[i + 1] + data[i + 2] >= 384) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
      const next =
        right >= left
          ? { x: left, y: top, w: right - left + 1, h: bottom - top + 1 }
          : null;
      quickMaskRef.current = null;
      selectionChannelRef.current = next ? mask : null;
      setQuickMask(false);
      setEditing('pixels');
      setSelection(next);
      selectionRef.current = next;
      setSelectionPath(null);
      selectionPathRef.current = null;
      setStatus(
        next
          ? 'Quick Mask converted to a pixel-accurate selection'
          : 'Quick Mask cleared the selection',
      );
      setTimeout(render, 0);
      return;
    }
    const mask = selectionMask(doc.w, doc.h, 0, 0);
    quickMaskRef.current = mask;
    setQuickMask(true);
    setEditing('mask');
    setTool('brush');
    setStatus(
      'Quick Mask — paint black to exclude, erase to restore · Q to finish',
    );
    setTimeout(render, 0);
  };
  const addVectorMask = () => {
    const meta = selected();
    if (
      !meta ||
      isLocked(meta.id) ||
      meta.kind === 'group' ||
      meta.kind === 'adjustment'
    )
      return;
    let points = selectionPathRef.current;
    if (!points && selectionRef.current) {
      const r = selectionRef.current;
      points = [
        { x: r.x, y: r.y },
        { x: r.x + r.w, y: r.y },
        { x: r.x + r.w, y: r.y + r.h },
        { x: r.x, y: r.y + r.h },
      ];
    }
    if (!points?.length) {
      setStatus('Make a selection or load a path before adding a vector mask.');
      return;
    }
    patchLayer(
      meta.id,
      { vectorMask: points.map((p) => toLayerPoint(meta, p)) },
      'Add vector mask',
    );
    render();
    setStatus('Vector mask added from the active selection');
  };
  const removeVectorMask = () => {
    const meta = selected();
    if (!meta?.vectorMask) return;
    patchLayer(meta.id, { vectorMask: undefined }, 'Remove vector mask');
    render();
    setStatus('Vector mask removed');
  };
  const selectedRoots = (ids = selectedIdsRef.current) =>
    layersRef.current.filter(
      (l) =>
        ids.includes(l.id) &&
        !ancestors(layersRef.current, l.id).some((p) => ids.includes(p.id)),
    );
  const selectedTree = (ids = selectedIdsRef.current) => {
    const all = new Set(
      selectedRoots(ids).flatMap((l) =>
        descendants(layersRef.current, l.id).map((x) => x.id),
      ),
    );
    return layersRef.current.filter((l) => all.has(l.id));
  };
  const clickLayer = (
    id: string,
    e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean },
  ) => {
    if (e.shiftKey) {
      const ids = visibleLayers.map((l) => l.id),
        a = ids.indexOf(selectedRef.current),
        b = ids.indexOf(id);
      selectMany(
        ids.slice(Math.max(0, Math.min(a, b)), Math.max(a, b) + 1),
        id,
      );
    } else if (e.ctrlKey || e.metaKey) {
      const ids = selectedIdsRef.current.includes(id)
        ? selectedIdsRef.current.filter((x) => x !== id)
        : [...selectedIdsRef.current, id];
      if (ids.length) selectMany(ids, id);
    } else select(id);
    const textValue = layersRef.current.find(
      (layer) => layer.id === id,
    )?.textLayer;
    if (textValue) {
      setText(textValue.content);
      setColor(textValue.color);
      setTextParagraph(textValue.paragraph);
      setTextWidth(textValue.width);
      setFontFamily(textValue.family);
      setFontWeight(textValue.weight);
      setFontSize(textValue.size);
      setTextTracking(textValue.tracking);
      setTextKerning(textValue.kerning);
      setTextLeading(textValue.leading);
      setTextBaseline(textValue.baseline);
      setTextAlign(textValue.align);
      setTextOnPath(textValue.onPath);
      setTextWarp(textValue.warp);
      setTextSmallCaps(textValue.smallCaps);
      setTextLigatures(textValue.ligatures);
    }
    setEditing('pixels');
  };
  const createGroup = () => {
    if (!roomForLayers()) return;
    const roots = selectedRoots();
    if (!roots.length) return;
    const parentId = roots[0].parentId;
    if (roots.some((l) => l.parentId !== parentId)) {
      setStatus('Group layers that share the same parent first.');
      return;
    }
    const source = selectedTree();
    if (!permit(source.map((l) => l.id))) return;
    if (
      Math.max(
        ...source.map((l) => ancestors(layersRef.current, l.id).length),
      ) >= 20
    ) {
      setStatus('Groups support up to 20 levels.');
      return;
    }
    if (!hasRoom(doc.w * doc.h)) return;
    const id = crypto.randomUUID(),
      group: LayerMeta = {
        id,
        name: 'Layer Group',
        visible: true,
        opacity: 100,
        blend: 'source-over',
        x: 0,
        y: 0,
        hasMask: false,
        maskEnabled: true,
        kind: 'group',
        parentId,
        collapsed: false,
      };
    surfacesRef.current.set(id, { pixels: makeCanvas(doc.w, doc.h) });
    const ids = new Set(source.map((l) => l.id)),
      rootIds = new Set(roots.map((l) => l.id)),
      index = layersRef.current.findIndex((l) => l.id === roots[0].id),
      next = layersRef.current.filter((l) => !ids.has(l.id));
    next.splice(
      index,
      0,
      group,
      ...source.map((l) => (rootIds.has(l.id) ? { ...l, parentId: id } : l)),
    );
    syncLayers(next);
    select(id);
    snapshot('Group selected layers');
    render();
  };
  const createAdjustment = () => {
    if (!roomForLayers()) return;
    const current = selected(),
      parent = current?.kind === 'group' ? current.id : current?.parentId;
    if (parent && !permit([parent])) return;
    if (!hasRoom(doc.w * doc.h)) return;
    const id = crypto.randomUUID(),
      pixels = makeCanvas(doc.w, doc.h),
      layer: LayerMeta = {
        id,
        name: 'Color & Tone',
        visible: true,
        opacity: 100,
        blend: 'source-over',
        x: 0,
        y: 0,
        hasMask: false,
        maskEnabled: true,
        kind: 'adjustment',
        brightness: 110,
        contrast: 105,
        saturation: 100,
        blur: 0,
        precisionAdjustment: createDefaultHighDepthAdjustments(),
      };
    surfacesRef.current.set(id, { pixels });
    insertLayer(layer);
    select(id);
    snapshot('New adjustment layer');
    render();
    setStatus('Adjustment layer added — edit it in Properties');
  };
  const toggleGroup = (id: string) => {
    const group = layersRef.current.find((x) => x.id === id);
    if (group?.kind === 'group')
      patchLayer(id, { collapsed: !group.collapsed });
  };
  const makePathSelection = (points: Point[], curved = false) => {
    if (points.length < 3) return;
    const mask = makeCanvas(doc.w, doc.h),
      ctx = mask.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    if (curved) {
      const firstMid = {
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2,
      };
      ctx.moveTo(firstMid.x, firstMid.y);
      for (let index = 1; index <= points.length; index++) {
        const anchor = points[index % points.length],
          next = points[(index + 1) % points.length];
        ctx.quadraticCurveTo(
          anchor.x,
          anchor.y,
          (anchor.x + next.x) / 2,
          (anchor.y + next.y) / 2,
        );
      }
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    }
    ctx.closePath();
    ctx.fill();
    commitSelectionMask(mask, 'Path loaded as selection');
    setSelectionPath(points.map((point) => ({ ...point })));
    selectionPathRef.current = points.map((point) => ({ ...point }));
    snapshot('Path to selection');
  };
  const duplicatePath = (id: string) => {
    const path = paths.find((item) => item.id === id);
    if (!path) return;
    setPaths((items) => [
      {
        ...path,
        id: crypto.randomUUID(),
        name: `${path.name} copy`,
        points: path.points.map((point) => ({ ...point })),
      },
      ...items,
    ]);
    setTimeout(() => snapshot('Duplicate path'), 0);
  };
  const removePath = (id: string) => {
    setPaths((items) => items.filter((item) => item.id !== id));
    setTimeout(() => snapshot('Delete path'), 0);
  };
  const duplicate = () => {
    const roots = selectedRoots(),
      source = selectedTree();
    if (!source.length) return;
    if (!permit(roots.flatMap((l) => (l.parentId ? [l.parentId] : [])))) return;
    const units = source.reduce(
      (n, l) => n + (surfacesRef.current.get(l.id)?.mask ? 2 : 1),
      0,
    );
    if (!roomForLayers(source.length) || !hasRoom(doc.w * doc.h * units))
      return;
    const ids = new Map(source.map((l) => [l.id, crypto.randomUUID()])),
      links = new Map(
        source
          .filter((l) => l.linkId)
          .map((l) => [l.linkId!, crypto.randomUUID()]),
      ),
      rootIds = new Set(roots.map((l) => l.id)),
      copies = source.map((l) => {
        const s = surfacesRef.current.get(l.id)!,
          pixels = makeCanvas(doc.w, doc.h);
        pixels.getContext('2d')!.drawImage(s.pixels, 0, 0);
        let mask: HTMLCanvasElement | undefined;
        if (s.mask) {
          mask = makeCanvas(doc.w, doc.h);
          mask.getContext('2d')!.drawImage(s.mask, 0, 0);
        }
        const id = ids.get(l.id)!;
        surfacesRef.current.set(id, { pixels, mask });
        return {
          ...l,
          id,
          vectorMask: l.vectorMask?.map((p) => ({ ...p })),
          parentId: rootIds.has(l.id)
            ? l.parentId
            : (ids.get(l.parentId!) ?? l.parentId),
          linkId: l.linkId ? links.get(l.linkId) : undefined,
          name: rootIds.has(l.id) ? l.name + ' copy' : l.name,
        };
      });
    const next = [...layersRef.current];
    for (const root of [...roots].reverse()) {
      const block = new Set(
        descendants(layersRef.current, root.id).map((l) => ids.get(l.id)),
      );
      next.splice(
        next.findIndex((l) => l.id === root.id),
        0,
        ...copies.filter((l) => block.has(l.id)),
      );
    }
    syncLayers(next);
    selectMany(roots.map((l) => ids.get(l.id)!));
    snapshot('Duplicate selected layers');
    render();
  };
  const removeLayer = () => {
    const removed = selectedTree();
    if (!removed.length || !permit(removed.map((l) => l.id))) return;
    if (
      removed.length > 1 &&
      !window.confirm(
        'Delete ' +
          removed.length +
          ' selected layers and group contents? Undo can restore them.',
      )
    )
      return;
    const ids = new Set(removed.map((l) => l.id)),
      index = layersRef.current.findIndex((l) => l.id === removed[0].id);
    let next = layersRef.current.filter((l) => !ids.has(l.id));
    for (const id of ids) surfacesRef.current.delete(id);
    if (!next.length) {
      const id = crypto.randomUUID();
      surfacesRef.current.set(id, { pixels: makeCanvas(doc.w, doc.h) });
      next = [
        {
          id,
          name: 'Layer 1',
          visible: true,
          opacity: 100,
          blend: 'source-over',
          x: 0,
          y: 0,
          hasMask: false,
          maskEnabled: true,
        },
      ];
    }
    syncLayers(next);
    select(next[Math.min(index, next.length - 1)].id);
    setEditing('pixels');
    snapshot('Delete selected layers');
    render();
  };
  const reorder = (dir: -1 | 1) => {
    const id = selectedRef.current;
    if (!permit(descendants(layersRef.current, id).map((l) => l.id))) return;
    const next = moveSibling(layersRef.current, id, dir);
    if (next === layersRef.current) return;
    syncLayers(next);
    snapshot(dir < 0 ? 'Move layer up' : 'Move layer down');
    render();
  };
  const reorderSelected = (dir: -1 | 1) => {
    const roots = selectedRoots();
    if (
      !roots.length ||
      !permit(
        roots.flatMap((l) =>
          descendants(layersRef.current, l.id).map((x) => x.id),
        ),
      )
    )
      return;
    let next = layersRef.current;
    const ordered = [...roots].sort(
      (a, b) => next.indexOf(a) - next.indexOf(b),
    );
    if (dir > 0) ordered.reverse();
    for (const layer of ordered) next = moveSibling(next, layer.id, dir);
    if (next === layersRef.current) return;
    syncLayers(next);
    snapshot(dir < 0 ? 'Move selected layers up' : 'Move selected layers down');
    render();
  };
  const mergeDown = () => {
    const upper = selected();
    if (!upper) return;
    const siblings = layersRef.current.filter(
        (l) => l.parentId === upper.parentId,
      ),
      lower = siblings[siblings.findIndex((l) => l.id === upper.id) + 1];
    if (!lower) return;
    if (!permit([upper.id, lower.id])) return;
    if (
      [upper, lower].some(
        (l) =>
          l.kind === 'group' ||
          l.kind === 'adjustment' ||
          !l.visible ||
          l.blend !== 'source-over' ||
          l.blendIf,
      ) ||
      lower.clipping
    ) {
      setStatus(
        'Merge Down supports visible Normal pixel layers. Use Merge visible for complex composites.',
      );
      return;
    }
    const pixels = makeCanvas(doc.w, doc.h);
    renderLayers(pixels.getContext('2d')!, [
      { ...upper, parentId: undefined },
      { ...lower, parentId: undefined },
    ]);
    surfacesRef.current.set(lower.id, { pixels });
    surfacesRef.current.delete(upper.id);
    const merged: LayerMeta = {
      id: lower.id,
      parentId: lower.parentId,
      name: lower.name + ' + ' + upper.name,
      visible: true,
      opacity: 100,
      fill: 100,
      blend: 'source-over',
      x: 0,
      y: 0,
      hasMask: false,
      maskEnabled: true,
    };
    syncLayers(
      layersRef.current
        .filter((l) => l.id !== upper.id)
        .map((l) => (l.id === lower.id ? merged : l)),
    );
    select(lower.id);
    snapshot('Merge down');
    render();
  };
  const mergeVisible = () => {
    const visible = layersRef.current.filter(
      (l) =>
        l.visible &&
        !ancestors(layersRef.current, l.id).some((p) => !p.visible),
    );
    if (
      !visible.some((l) => l.kind !== 'group') ||
      !permit(visible.map((l) => l.id))
    )
      return;
    const pixels = makeCanvas(doc.w, doc.h);
    renderLayers(pixels.getContext('2d')!);
    const removed = new Set(
        visible.filter((l) => l.kind !== 'group').map((l) => l.id),
      ),
      id = crypto.randomUUID(),
      merged: LayerMeta = {
        id,
        name: 'Merged visible',
        visible: true,
        opacity: 100,
        blend: 'source-over',
        x: 0,
        y: 0,
        hasMask: false,
        maskEnabled: true,
      };
    for (const id of removed) surfacesRef.current.delete(id);
    surfacesRef.current.set(id, { pixels });
    syncLayers([
      merged,
      ...layersRef.current.filter((l) => !removed.has(l.id)),
    ]);
    select(id);
    snapshot('Merge visible');
    render();
    setStatus('Visible composite merged; hidden layers and groups retained');
  };
  const flattenImage = () => {
    if (!permit(layersRef.current.map((l) => l.id))) return;
    if (
      !window.confirm(
        'Flatten the visible image onto white and discard hidden layers? Undo can restore this.',
      )
    )
      return;
    const pixels = makeCanvas(doc.w, doc.h),
      ctx = pixels.getContext('2d')!;
    renderLayers(ctx);
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, doc.w, doc.h);
    ctx.globalCompositeOperation = 'source-over';
    const id = crypto.randomUUID(),
      flat: LayerMeta = {
        id,
        name: 'Background',
        visible: true,
        opacity: 100,
        blend: 'source-over',
        x: 0,
        y: 0,
        hasMask: false,
        maskEnabled: true,
        locked: false,
      };
    surfacesRef.current = new Map([[id, { pixels }]]);
    syncLayers([flat]);
    select(id);
    setEditing('pixels');
    snapshot('Flatten image');
    render();
  };
  const resetTransform = () => {
    const items = transformLayers();
    if (!items.length || !permit(items.map((l) => l.id))) return;
    const ids = new Set(items.map((l) => l.id));
    syncLayers(
      layersRef.current.map((l) =>
        ids.has(l.id)
          ? { ...l, x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }
          : l,
      ),
    );
    snapshot('Reset selected transforms');
    render();
  };
  const resetAdjustments = () => {
    const meta = selected();
    if (meta)
      patchLayer(
        meta.id,
        {
          brightness: 100,
          contrast: 100,
          saturation: 100,
          blur: 0,
          precisionAdjustment:
            meta.kind === 'adjustment' ? {} : meta.precisionAdjustment,
        },
        'Reset adjustments',
      );
  };
  const removeMask = () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (!meta || isLocked(meta.id) || !surface?.mask) return;
    delete surface.mask;
    patchLayer(meta.id, { hasMask: false }, 'Remove layer mask');
    setEditing('pixels');
    render();
  };
  const filter = (kind: 'grayscale' | 'invert' | 'brightness' | 'sharpen') => {
    const target = targetContext();
    if (!target || editing === 'mask') return;
    const ctx = target.ctx;
    if (kind === 'sharpen') {
      ctx.save();
      ctx.filter = 'contrast(1.18) saturate(1.08)';
      ctx.drawImage(ctx.canvas, 0, 0);
      ctx.restore();
    } else {
      const d = ctx.getImageData(0, 0, doc.w, doc.h),
        hist = [
          new Uint32Array(256),
          new Uint32Array(256),
          new Uint32Array(256),
        ],
        pixels = d.width * d.height;
      for (let i = 0; i < d.data.length; i += 4)
        if (d.data[i + 3]) {
          hist[0][d.data[i]]++;
          hist[1][d.data[i + 1]]++;
          hist[2][d.data[i + 2]]++;
        }
      const limits = hist.map((channel) => {
        const cutoff = Math.max(1, Math.round(pixels * 0.005));
        let low = 0,
          high = 255,
          total = 0;
        while (low < 255 && (total += channel[low]) < cutoff) low++;
        total = 0;
        while (high > 0 && (total += channel[high]) < cutoff) high--;
        return [low, Math.max(low + 1, high)];
      });
      for (let i = 0; i < d.data.length; i += 4) {
        const r = d.data[i],
          g = d.data[i + 1],
          b = d.data[i + 2];
        if (kind === 'grayscale') {
          const y = 0.299 * r + 0.587 * g + 0.114 * b;
          d.data[i] = d.data[i + 1] = d.data[i + 2] = y;
        } else if (kind === 'invert') {
          d.data[i] = 255 - r;
          d.data[i + 1] = 255 - g;
          d.data[i + 2] = 255 - b;
        } else
          for (let c = 0; c < 3; c++)
            d.data[i + c] = Math.max(
              0,
              Math.min(
                255,
                ((d.data[i + c] - limits[c][0]) * 255) /
                  (limits[c][1] - limits[c][0]),
              ),
            );
      }
      ctx.putImageData(d, 0, 0);
    }
    snapshot(
      kind === 'brightness'
        ? 'Auto Tone'
        : kind[0].toUpperCase() + kind.slice(1),
    );
    render();
  };
  const applyAdvancedAdjustments = (options: AdvancedAdjustmentOptions) => {
    const target = targetContext();
    if (!target || editing === 'mask') {
      setStatus('Select an unlocked pixel layer to apply adjustments.');
      return;
    }
    applyAdvancedPixels(target.ctx.canvas, options);
    const labels = [
      options.brightness || options.contrast ? 'Brightness/Contrast' : '',
      options.hue || options.saturation || options.vibrance
        ? 'Hue/Saturation/Vibrance'
        : '',
      options.blackWhite ? 'Black & White' : '',
      options.blurMode !== 'none'
        ? `${options.blurMode[0].toUpperCase() + options.blurMode.slice(1)} blur`
        : '',
    ].filter(Boolean);
    snapshot(labels.join(' + ') || 'Adjustments');
    render();
    setStatus(
      `${labels.join(', ') || 'Adjustments'} applied in one tiled floating-point pass`,
    );
  };
  const applyLayerStudio = (operation: LayerStudioOperation) => {
    if (operation.kind === 'effects') {
      const meta = selected();
      if (
        !meta ||
        meta.kind === 'group' ||
        meta.kind === 'adjustment' ||
        isLocked(meta.id)
      ) {
        setStatus(
          'Select an unlocked pixel, text, shape, or Smart Object layer',
        );
        return;
      }
      patchLayer(meta.id, { effects: operation.effects }, 'Layer effects');
      render();
      setStatus('Editable layer effects applied');
      return;
    }
    if (operation.kind === 'fill') {
      const id = createLayer(
        operation.mode === 'solid'
          ? 'Solid Color Fill'
          : operation.mode === 'gradient'
            ? 'Gradient Fill'
            : 'Pattern Fill',
      );
      if (!id) return;
      const surface = surfacesRef.current.get(id)!,
        ctx = surface.pixels.getContext('2d')!;
      if (operation.mode === 'solid') {
        ctx.fillStyle = operation.color;
        ctx.fillRect(0, 0, doc.w, doc.h);
      } else if (operation.mode === 'gradient') {
        const gradient = ctx.createLinearGradient(0, 0, doc.w, doc.h);
        gradient.addColorStop(0, operation.color);
        gradient.addColorStop(1, operation.color2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, doc.w, doc.h);
      } else {
        const unit = Math.max(8, Math.round(Math.min(doc.w, doc.h) / 30));
        for (let y = 0; y < doc.h; y += unit)
          for (let x = 0; x < doc.w; x += unit) {
            ctx.fillStyle =
              (x / unit + y / unit) & 1 ? operation.color : operation.color2;
            ctx.fillRect(x, y, unit, unit);
          }
      }
      if (operation.masked) {
        surface.mask = makeCanvas(doc.w, doc.h);
        const mask = surface.mask.getContext('2d')!;
        mask.fillStyle = 'white';
        mask.fillRect(0, 0, doc.w, doc.h);
        patchLayer(id, {
          hasMask: true,
          maskEnabled: true,
          maskDensity: 100,
          maskFeather: 0,
          maskLinked: true,
        });
      }
      snapshot(`Create ${operation.mode} fill layer`);
      render();
      setStatus(
        `${operation.mode[0].toUpperCase()}${operation.mode.slice(1)} fill layer created`,
      );
      return;
    }
    const target = targetContext();
    if (!target || editing === 'mask') {
      setStatus('Select an unlocked pixel layer to apply this adjustment');
      return;
    }
    const ctx = target.ctx,
      image = ctx.getImageData(0, 0, doc.w, doc.h),
      amount = operation.amount,
      second = operation.secondary,
      c1 = [1, 3, 5].map((at) =>
        parseInt(operation.color.slice(at, at + 2), 16),
      ),
      c2 = [1, 3, 5].map((at) =>
        parseInt(operation.color2.slice(at, at + 2), 16),
      );
    for (let i = 0; i < image.data.length; i += 4) {
      let r = image.data[i],
        g = image.data[i + 1],
        b = image.data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      if (operation.mode === 'channel-mixer') {
        r += (g * amount + b * second) / 100;
        g += (b * amount + r * second) / 100;
        b += (r * amount + g * second) / 100;
      } else if (operation.mode === 'selective-color') {
        const max = Math.max(r, g, b),
          weight = max ? (max - Math.min(r, g, b)) / max : 0;
        if (r === max) r += amount * weight;
        if (g === max) g += second * weight;
        if (b === max) b -= amount * weight;
      } else if (
        operation.mode === 'gradient-map' ||
        operation.mode === 'color-lookup'
      ) {
        const t = luma / 255,
          strength =
            operation.mode === 'color-lookup' ? Math.abs(amount) / 100 : 1;
        r = r * (1 - strength) + (c1[0] * (1 - t) + c2[0] * t) * strength;
        g = g * (1 - strength) + (c1[1] * (1 - t) + c2[1] * t) * strength;
        b = b * (1 - strength) + (c1[2] * (1 - t) + c2[2] * t) * strength;
      } else if (operation.mode === 'posterize') {
        const levels = Math.max(2, Math.min(32, Math.round(amount))),
          step = 255 / (levels - 1);
        r = Math.round(r / step) * step;
        g = Math.round(g / step) * step;
        b = Math.round(b / step) * step;
      } else if (operation.mode === 'threshold') {
        r = g = b = luma >= Math.max(0, Math.min(255, amount)) ? 255 : 0;
      } else if (operation.mode === 'clarity' || operation.mode === 'dehaze') {
        const strength = amount / 100,
          center = operation.mode === 'dehaze' ? 150 : 128;
        r = center + (r - center) * (1 + strength * 0.8);
        g = center + (g - center) * (1 + strength * 0.8);
        b = center + (b - center) * (1 + strength * 0.8);
        if (operation.mode === 'dehaze') {
          r -= strength * 8;
          b += strength * 10;
        }
      } else {
        const grain = ((((i / 4) * 1103515245 + 12345) >>> 16) & 255) - 128,
          noise = grain * (Math.abs(amount) / 100) * 0.55;
        r += noise;
        g += noise;
        b += noise;
      }
      image.data[i] = Math.max(0, Math.min(255, r));
      image.data[i + 1] = Math.max(0, Math.min(255, g));
      image.data[i + 2] = Math.max(0, Math.min(255, b));
    }
    ctx.putImageData(image, 0, 0);
    snapshot(
      operation.mode
        .split('-')
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(' '),
    );
    render();
    setStatus('Layer Studio adjustment applied');
  };
  const convertToSmartObject = () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (
      !meta ||
      !surface ||
      meta.kind === 'group' ||
      meta.kind === 'adjustment' ||
      isLocked(meta.id)
    )
      return;
    patchLayer(
      meta.id,
      {
        smartObject: {
          kind: 'embedded',
          sourceName: meta.name,
          sourceData: surface.pixels.toDataURL('image/png'),
          filters: [],
          filterMask: false,
        },
      },
      'Convert to Smart Object',
    );
    setStatus('Embedded Smart Object created; transforms are non-destructive');
  };
  const chooseSmartFile = (action: 'link' | 'replace' | 'relink') => {
    smartFileAction.current = action;
    smartObjectFileRef.current?.click();
  };
  const applySmartFile = async (file?: File) => {
    if (!file) return;
    const action = smartFileAction.current;
    try {
      const image = new Image(),
        url = URL.createObjectURL(file);
      image.src = url;
      await image.decode();
      const pixels = makeCanvas(doc.w, doc.h),
        ctx = pixels.getContext('2d')!;
      const scale = Math.min(
          doc.w / image.naturalWidth,
          doc.h / image.naturalHeight,
        ),
        w = image.naturalWidth * scale,
        h = image.naturalHeight * scale;
      ctx.drawImage(image, (doc.w - w) / 2, (doc.h - h) / 2, w, h);
      URL.revokeObjectURL(url);
      let meta = selected();
      if (action === 'link') {
        const id = createLayer(file.name);
        meta = id
          ? layersRef.current.find((layer) => layer.id === id)
          : undefined;
      }
      if (!meta || meta.kind === 'group' || meta.kind === 'adjustment')
        throw Error('Select a pixel or Smart Object layer first');
      const surface = surfacesRef.current.get(meta.id)!;
      surface.pixels = pixels;
      const previous = meta.smartObject;
      patchLayer(
        meta.id,
        {
          smartObject: {
            kind:
              action === 'link' || action === 'relink'
                ? 'linked'
                : (previous?.kind ?? 'embedded'),
            sourceName: file.name,
            sourceData: pixels.toDataURL('image/png'),
            filters: previous?.filters ?? [],
            filterMask: previous?.filterMask ?? false,
          },
        },
        action === 'replace'
          ? 'Replace Smart Object contents'
          : action === 'relink'
            ? 'Relink Smart Object'
            : 'Place linked Smart Object',
      );
      render();
      setStatus(
        action === 'replace'
          ? 'Smart Object contents replaced'
          : action === 'relink'
            ? 'Linked Smart Object relinked'
            : 'Linked Smart Object placed with an embedded fallback',
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Smart Object file could not be opened',
      );
    } finally {
      if (smartObjectFileRef.current) smartObjectFileRef.current.value = '';
    }
  };
  const resolveRawMaster = async (raw: NonNullable<SmartObjectData['raw']>) => {
    const cached = rawMasterCache.current.get(raw.assetId);
    if (cached) return { image: cached, file: undefined };
    const file = await loadRawAsset(raw.assetId);
    if (!file)
      throw Error(
        'The original RAW source is not stored on this computer. The embedded preview is still available.',
      );
    const image = await decodeCameraRaw(file);
    if (image.width !== raw.width || image.height !== raw.height)
      throw Error(
        'The stored RAW source dimensions no longer match this Smart Object.',
      );
    rawMasterCache.current.clear();
    rawMasterCache.current.set(raw.assetId, image);
    return { image, file };
  };
  const editSmartContents = async () => {
    const meta = selected(),
      smart = meta?.smartObject;
    if (!smart) return;
    if (smart.raw && meta) {
      if (psdBusyRef.current) return;
      psdBusyRef.current = true;
      setPsdBusy(true);
      setStatus('Reopening the high-precision Camera Raw master…');
      try {
        const { image, file } = await resolveRawMaster(smart.raw);
        setRawSettings({ ...smart.raw.settings });
        setRawDevelop({
          name: smart.sourceName,
          image,
          sourceFile: file,
          targetLayerId: meta.id,
          assetId: smart.raw.assetId,
        });
        setStatus('Camera Raw settings ready for non-destructive editing');
      } catch (error) {
        setPsdError(
          error instanceof Error
            ? error.message
            : 'The Camera Raw master could not be reopened.',
        );
      } finally {
        psdBusyRef.current = false;
        setPsdBusy(false);
      }
      return;
    }
    const image = new Image();
    image.src = smart.sourceData;
    image.onload = () => {
      const pixels = makeCanvas(image.naturalWidth, image.naturalHeight);
      pixels.getContext('2d')!.drawImage(image, 0, 0);
      const id = crypto.randomUUID();
      loadImportedDocument(
        `${smart.sourceName} — Smart Object contents`,
        pixels.width,
        pixels.height,
        [
          {
            id,
            name: smart.sourceName,
            kind: 'pixel',
            visible: true,
            opacity: 100,
            blend: 'source-over',
            x: 0,
            y: 0,
            hasMask: false,
            maskEnabled: true,
          },
        ],
        new Map([[id, { pixels }]]),
        'Open Smart Object contents',
      );
      setStatus('Smart Object contents opened in a separate editable tab');
    };
  };
  const addSmartFilter = (name: SmartFilter['name']) => {
    const meta = selected();
    if (!meta?.smartObject || isLocked(meta.id)) {
      setStatus('Select an unlocked Smart Object first');
      return;
    }
    patchLayer(
      meta.id,
      {
        smartObject: {
          ...meta.smartObject,
          filters: [
            ...meta.smartObject.filters,
            {
              id: crypto.randomUUID(),
              name,
              amount: name === 'Blur' ? 4 : 20,
              opacity: 100,
              blend: 'source-over',
              enabled: true,
            },
          ],
        },
      },
      `Add Smart Filter ${name}`,
    );
    render();
    setStatus(`${name} added as an editable Smart Filter`);
  };
  const addSmartFilterMask = () => {
    const meta = selected();
    if (!meta?.smartObject) return;
    if (!meta.hasMask) addMask();
    patchLayer(
      meta.id,
      {
        smartObject: { ...meta.smartObject, filterMask: true },
      },
      'Add Smart Filter mask',
    );
    setEditing('mask');
    setStatus('Smart Filter mask ready for painting');
  };
  const configureSmartFilter = () => {
    const meta = selected(),
      filter = meta?.smartObject?.filters.at(-1);
    if (!meta?.smartObject || !filter) return;
    const opacityValue = Number(
        window.prompt('Smart Filter opacity (0–100)', String(filter.opacity)),
      ),
      blend = window.prompt('Blend mode', filter.blend) as BlendMode | null;
    if (
      !Number.isFinite(opacityValue) ||
      opacityValue < 0 ||
      opacityValue > 100 ||
      !blend ||
      !(blend in blendLabels)
    ) {
      setStatus('Smart Filter settings were not changed');
      return;
    }
    patchLayer(
      meta.id,
      {
        smartObject: {
          ...meta.smartObject,
          filters: meta.smartObject.filters.map((item) =>
            item.id === filter.id
              ? { ...item, opacity: opacityValue, blend }
              : item,
          ),
        },
      },
      'Smart Filter blend settings',
    );
    render();
    setStatus('Smart Filter blend settings updated');
  };
  const patchSmartFilter = (
    id: string,
    patch: Partial<SmartFilter>,
    record?: string,
  ) => {
    const meta = selected();
    if (!meta?.smartObject || isLocked(meta.id)) return;
    patchLayer(
      meta.id,
      {
        smartObject: {
          ...meta.smartObject,
          filters: meta.smartObject.filters.map((filter) =>
            filter.id === id ? { ...filter, ...patch } : filter,
          ),
        },
      },
      record,
    );
  };
  const moveSmartFilter = (id: string, direction: -1 | 1) => {
    const meta = selected();
    if (!meta?.smartObject || isLocked(meta.id)) return;
    const filters = [...meta.smartObject.filters];
    const from = filters.findIndex((filter) => filter.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= filters.length) return;
    [filters[from], filters[to]] = [filters[to], filters[from]];
    patchLayer(
      meta.id,
      { smartObject: { ...meta.smartObject, filters } },
      'Reorder Smart Filters',
    );
    setStatus('Smart Filter order updated');
  };
  const removeSmartFilter = (id: string) => {
    const meta = selected();
    if (!meta?.smartObject || isLocked(meta.id)) return;
    const filter = meta.smartObject.filters.find((item) => item.id === id);
    patchLayer(
      meta.id,
      {
        smartObject: {
          ...meta.smartObject,
          filters: meta.smartObject.filters.filter((item) => item.id !== id),
        },
      },
      'Delete Smart Filter',
    );
    setStatus(`${filter?.name ?? 'Smart Filter'} removed`);
  };
  const rasterizeSmartObject = () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (!meta?.smartObject || !surface || isLocked(meta.id)) return;
    const pixels = makeCanvas(doc.w, doc.h);
    drawLayer(
      pixels.getContext('2d')!,
      {
        ...meta,
        effects: undefined,
        blend: 'source-over',
        opacity: 100,
        fill: 100,
      },
      surface,
      doc.w,
      doc.h,
    );
    surface.pixels = pixels;
    patchLayer(
      meta.id,
      {
        smartObject: undefined,
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
      'Rasterize Smart Object',
    );
    render();
    setStatus('Smart Object rasterized; layer effects remain editable');
  };
  const exportBrushPreset = () => {
    const preset = {
      format: 'librelayer-brush-v1',
      name: 'LibreLayer brush',
      size,
      hardness,
      opacity,
      flow,
      spacing: brushSpacing,
      smoothing: brushSmoothing,
      sizeJitter,
      hueJitter,
      scatter: brushScatter,
      texture: brushTexture,
      mixer: {
        enabled: mixerBrush,
        wet: mixerWet,
        load: mixerLoad,
        mix: mixerMix,
      },
    };
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(preset, null, 2)], {
          type: 'application/json',
        }),
      ),
      anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'librelayer-brush.psbrush.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Brush preset exported');
  };
  const importBrushPreset = async (file?: File) => {
    if (!file) return;
    try {
      const preset = JSON.parse(await file.text()) as Record<string, unknown>;
      if (
        !['librelayer-brush-v1', 'pixelstudio-brush-v1'].includes(
          String(preset.format),
        )
      )
        throw Error('Not a LibreLayer brush preset');
      const number = (
        key: string,
        fallback: number,
        min: number,
        max: number,
      ) => Math.max(min, Math.min(max, Number(preset[key] ?? fallback)));
      setSize(number('size', size, 1, 300));
      setHardness(number('hardness', hardness, 0, 100));
      setOpacity(number('opacity', opacity, 1, 100));
      setFlow(number('flow', flow, 1, 100));
      setBrushSpacing(number('spacing', brushSpacing, 1, 200));
      setBrushSmoothing(number('smoothing', brushSmoothing, 0, 100));
      setSizeJitter(number('sizeJitter', sizeJitter, 0, 100));
      setHueJitter(number('hueJitter', hueJitter, 0, 100));
      setBrushScatter(number('scatter', brushScatter, 0, 300));
      setBrushTexture(number('texture', brushTexture, 0, 100));
      const mixer = preset.mixer as Record<string, unknown> | undefined;
      if (mixer) {
        setMixerBrush(Boolean(mixer.enabled));
        setMixerWet(Math.max(0, Math.min(100, Number(mixer.wet ?? 50))));
        setMixerLoad(Math.max(0, Math.min(100, Number(mixer.load ?? 50))));
        setMixerMix(Math.max(0, Math.min(100, Number(mixer.mix ?? 50))));
      }
      setTool('brush');
      setStatus('Brush preset imported and applied');
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Brush preset could not be imported',
      );
    } finally {
      if (brushPresetFileRef.current) brushPresetFileRef.current.value = '';
    }
  };

  const selectionRepair = (
    mode: 'patch' | 'remove' | 'fill' | 'move',
    offsetX: number,
    offsetY: number,
  ) => {
    const target = targetContext(),
      bounds = selectionRef.current,
      mask = selectionMask(doc.w, doc.h, 0, 0);
    if (!target || !bounds || editing === 'mask') {
      setStatus('Make a selection on an unlocked pixel layer first');
      return;
    }
    const ctx = target.ctx,
      source = ctx.getImageData(0, 0, doc.w, doc.h),
      alpha = mask.getContext('2d')!.getImageData(0, 0, doc.w, doc.h).data,
      output = new ImageData(new Uint8ClampedArray(source.data), doc.w, doc.h),
      left = Math.max(0, Math.floor(bounds.x)),
      top = Math.max(0, Math.floor(bounds.y)),
      right = Math.min(doc.w, Math.ceil(bounds.x + bounds.w)),
      bottom = Math.min(doc.h, Math.ceil(bounds.y + bounds.h));
    let br = 0,
      bg = 0,
      bb = 0,
      ba = 0,
      samples = 0;
    const ring = Math.max(3, Math.round(Math.min(bounds.w, bounds.h) * 0.08));
    for (
      let y = Math.max(0, top - ring);
      y < Math.min(doc.h, bottom + ring);
      y++
    )
      for (
        let x = Math.max(0, left - ring);
        x < Math.min(doc.w, right + ring);
        x++
      ) {
        if (x >= left && x < right && y >= top && y < bottom) continue;
        const i = (y * doc.w + x) * 4;
        if (!source.data[i + 3]) continue;
        br += source.data[i];
        bg += source.data[i + 1];
        bb += source.data[i + 2];
        ba += source.data[i + 3];
        samples++;
      }
    const average = [
      br / Math.max(1, samples),
      bg / Math.max(1, samples),
      bb / Math.max(1, samples),
      ba / Math.max(1, samples),
    ];
    for (let y = top; y < bottom; y++)
      for (let x = left; x < right; x++) {
        const i = (y * doc.w + x) * 4,
          strength = alpha[i + 3] / 255;
        if (!strength) continue;
        if (mode === 'patch' || mode === 'move') {
          const sx = Math.max(0, Math.min(doc.w - 1, x - offsetX)),
            sy = Math.max(0, Math.min(doc.h - 1, y - offsetY)),
            si = (sy * doc.w + sx) * 4;
          for (let channel = 0; channel < 4; channel++)
            output.data[i + channel] =
              source.data[i + channel] * (1 - strength) +
              source.data[si + channel] * strength;
        } else {
          const noise =
            mode === 'fill' ? (((x * 17 + y * 31) % 13) - 6) * 1.5 : 0;
          for (let channel = 0; channel < 4; channel++)
            output.data[i + channel] =
              source.data[i + channel] * (1 - strength) +
              Math.max(
                0,
                Math.min(255, average[channel] + (channel < 3 ? noise : 0)),
              ) *
                strength;
        }
      }
    if (mode === 'move') {
      const copy = makeCanvas(doc.w, doc.h),
        cc = copy.getContext('2d')!;
      cc.putImageData(source, 0, 0);
      cc.globalCompositeOperation = 'destination-in';
      cc.drawImage(mask, 0, 0);
      ctx.putImageData(output, 0, 0);
      ctx.drawImage(copy, offsetX, offsetY);
      copy.width = copy.height = 1;
    } else ctx.putImageData(output, 0, 0);
    mask.width = mask.height = 1;
    snapshot(
      mode === 'patch'
        ? 'Patch selection'
        : mode === 'remove'
          ? 'Remove selection'
          : mode === 'fill'
            ? 'Content-Aware Fill'
            : 'Content-Aware Move',
    );
    render();
    setStatus(
      mode === 'patch'
        ? 'Selection patched from the chosen offset'
        : mode === 'remove'
          ? 'Selection removed and blended from surrounding pixels'
          : mode === 'fill'
            ? 'Selection filled from surrounding color and texture'
            : 'Selection moved and its original area repaired',
    );
  };
  const applyGeometry = (operation: GeometryOperation) => {
    if (operation.kind === 'transform') {
      const target = targetContext(),
        meta = selected();
      if (!target || !meta || editing === 'mask') {
        setStatus('Select an unlocked pixel layer first');
        return;
      }
      if (operation.mode === 'content-aware-scale') {
        const scaleX = Math.max(0.5, Math.min(2, operation.x / 100)),
          scaleY = Math.max(0.5, Math.min(2, (operation.y || 100) / 100)),
          original = makeCanvas(doc.w, doc.h),
          oc = original.getContext('2d')!;
        oc.drawImage(target.ctx.canvas, 0, 0);
        target.ctx.clearRect(0, 0, doc.w, doc.h);
        target.ctx.drawImage(
          original,
          (doc.w * (1 - scaleX)) / 2,
          (doc.h * (1 - scaleY)) / 2,
          doc.w * scaleX,
          doc.h * scaleY,
        );
        if (selectionRef.current) {
          const protectedPixels = makeCanvas(doc.w, doc.h),
            pc = protectedPixels.getContext('2d')!,
            mask = selectionMask(doc.w, doc.h, 0, 0);
          pc.drawImage(original, 0, 0);
          pc.globalCompositeOperation = 'destination-in';
          pc.drawImage(mask, 0, 0);
          target.ctx.drawImage(protectedPixels, 0, 0);
          protectedPixels.width = protectedPixels.height = 1;
          mask.width = mask.height = 1;
        }
        original.width = original.height = 1;
      } else {
        transformRasterPixels(
          target.ctx.canvas,
          operation.mode,
          operation.x,
          operation.y,
        );
        const surface = surfacesRef.current.get(meta.id);
        if (surface?.mask)
          transformRasterPixels(
            surface.mask,
            operation.mode,
            operation.x,
            operation.y,
          );
      }
      snapshot(
        operation.mode
          .split('-')
          .map((part) => part[0].toUpperCase() + part.slice(1))
          .join(' '),
      );
      render();
      setStatus('Advanced transform applied');
      return;
    }
    if (operation.kind === 'crop') {
      if (operation.mode === 'preset') {
        const [rw, rh] = operation.preset.split(':').map(Number),
          ratio = rw / rh;
        let w = doc.w,
          h = Math.round(w / ratio);
        if (h > doc.h) {
          h = doc.h;
          w = Math.round(h * ratio);
        }
        const chosen = {
            x: Math.round((doc.w - w) / 2),
            y: Math.round((doc.h - h) / 2),
            w,
            h,
          },
          mask = makeCanvas(doc.w, doc.h);
        mask.getContext('2d')!.fillRect(chosen.x, chosen.y, chosen.w, chosen.h);
        commitSelectionMask(mask, `${operation.preset} crop preset`);
        setTool('crop');
        setStatus(`${operation.preset} crop preset ready — adjust or crop`);
        return;
      }
      const bounds = selectionRef.current;
      if (!bounds) {
        setStatus('Make a crop selection first');
        return;
      }
      const w = Math.max(1, Math.round(bounds.w)),
        h = Math.max(1, Math.round(bounds.h)),
        composite = makeCanvas(doc.w, doc.h),
        cropped = makeCanvas(w, h);
      renderLayers(composite.getContext('2d')!);
      cropped
        .getContext('2d')!
        .drawImage(
          composite,
          bounds.x,
          bounds.y,
          bounds.w,
          bounds.h,
          0,
          0,
          w,
          h,
        );
      if (operation.mode === 'straighten') {
        const rotated = rotateCanvasPixels(cropped, -operation.x);
        cropped.width = rotated.width;
        cropped.height = rotated.height;
        cropped.getContext('2d')!.drawImage(rotated, 0, 0);
        rotated.width = rotated.height = 1;
      } else if (operation.mode === 'perspective-crop')
        transformRasterPixels(
          cropped,
          'perspective-warp',
          operation.x,
          operation.y,
        );
      composite.width = composite.height = 1;
      const id = crypto.randomUUID();
      loadImportedDocument(
        `${fileName} — ${operation.mode === 'crop-copy' ? 'crop copy' : operation.mode}`,
        cropped.width,
        cropped.height,
        [
          {
            id,
            name: 'Cropped pixels',
            kind: 'pixel',
            visible: true,
            opacity: 100,
            blend: 'source-over',
            x: 0,
            y: 0,
            hasMask: false,
            maskEnabled: true,
          },
        ],
        new Map([[id, { pixels: cropped }]]),
        'Create crop copy',
      );
      setStatus('Cropped result opened in a new tab; original is unchanged');
      return;
    }
    const degrees = operation.x;
    if (!permit(layersRef.current.map((layer) => layer.id))) return;
    const oldW = doc.w,
      oldH = doc.h,
      swap = Math.abs(degrees) % 180 === 90,
      nextW = swap ? oldH : oldW,
      nextH = swap ? oldW : oldH;
    for (const [id, surface] of surfacesRef.current) {
      surface.pixels = rotateCanvasPixels(surface.pixels, degrees);
      if (surface.mask)
        surface.mask = rotateCanvasPixels(surface.mask, degrees);
      surfacesRef.current.set(id, surface);
    }
    const angle = (degrees * Math.PI) / 180,
      cos = Math.cos(angle),
      sin = Math.sin(angle);
    syncLayers(
      layersRef.current.map((layer) => ({
        ...layer,
        x: Math.round(layer.x * cos - layer.y * sin),
        y: Math.round(layer.x * sin + layer.y * cos),
      })),
    );
    setDoc({ w: nextW, h: nextH });
    snapshot(`Rotate image ${degrees}°`);
    setStatus(`Image rotated ${degrees}°`);
    requestAnimationFrame(render);
  };

  const trimTransparent = () => {
    const composite = makeCanvas(doc.w, doc.h),
      ctx = composite.getContext('2d', { willReadFrequently: true })!;
    renderLayers(ctx);
    const data = ctx.getImageData(0, 0, doc.w, doc.h).data;
    let left = doc.w,
      top = doc.h,
      right = -1,
      bottom = -1;
    for (let y = 0; y < doc.h; y++)
      for (let x = 0; x < doc.w; x++)
        if (data[(y * doc.w + x) * 4 + 3]) {
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
    composite.width = composite.height = 1;
    if (right < left) {
      setStatus('Nothing to trim — the document is transparent');
      return;
    }
    selectionRef.current = {
      x: left,
      y: top,
      w: right - left + 1,
      h: bottom - top + 1,
    };
    cropToSelection();
    setStatus('Transparent edges trimmed');
  };
  const selectionMask = (w: number, h: number, ox: number, oy: number) => {
    const mask = makeCanvas(w, h),
      ctx = mask.getContext('2d')!,
      channel = selectionChannelRef.current,
      polygon = selectionPathRef.current,
      s = selectionRef.current;
    if (channel && s) {
      ctx.filter = feather ? `blur(${feather}px)` : 'none';
      ctx.drawImage(channel, -ox, -oy);
      return mask;
    }
    ctx.fillStyle = 'white';
    ctx.filter = feather ? `blur(${feather}px)` : 'none';
    ctx.beginPath();
    if (polygon && polygon.length > 2) {
      ctx.moveTo(polygon[0].x - ox, polygon[0].y - oy);
      polygon.slice(1).forEach((p) => ctx.lineTo(p.x - ox, p.y - oy));
      ctx.closePath();
    } else if (s) ctx.rect(s.x - ox, s.y - oy, s.w, s.h);
    else ctx.rect(0, 0, w, h);
    ctx.fill();
    return mask;
  };
  const maskBounds = (mask: HTMLCanvasElement) => {
    const data = mask
      .getContext('2d', { willReadFrequently: true })!
      .getImageData(0, 0, doc.w, doc.h).data;
    let left = doc.w,
      top = doc.h,
      right = -1,
      bottom = -1;
    for (let y = 0; y < doc.h; y++)
      for (let x = 0; x < doc.w; x++)
        if (data[(y * doc.w + x) * 4 + 3] > 1) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
    return right >= left
      ? { x: left, y: top, w: right - left + 1, h: bottom - top + 1 }
      : null;
  };
  const commitSelectionMask = (
    incoming: HTMLCanvasElement,
    label: string,
    mode: typeof selectionMode = selectionMode,
  ) => {
    let result = incoming;
    if (mode !== 'replace' && selectionRef.current) {
      result = makeCanvas(doc.w, doc.h);
      const ctx = result.getContext('2d')!,
        current = selectionMask(doc.w, doc.h, 0, 0);
      ctx.drawImage(current, 0, 0);
      ctx.globalCompositeOperation =
        mode === 'add'
          ? 'source-over'
          : mode === 'subtract'
            ? 'destination-out'
            : 'destination-in';
      ctx.drawImage(incoming, 0, 0);
      current.width = current.height = incoming.width = incoming.height = 1;
    }
    const bounds = maskBounds(result);
    selectionChannelRef.current = bounds ? result : null;
    setSelection(bounds);
    selectionRef.current = bounds;
    setSelectionPath(null);
    selectionPathRef.current = null;
    if (bounds) {
      const saved = makeCanvas(doc.w, doc.h);
      saved.getContext('2d')!.drawImage(result, 0, 0);
      lastSelectionRef.current = {
        mask: saved,
        bounds: { ...bounds },
        path: null,
      };
    }
    setStatus(
      bounds ? `${label} · ${mode}` : `${label} produced an empty selection`,
    );
  };
  const clearSelection = () => {
    const bounds = selectionRef.current;
    if (bounds) {
      const mask = selectionMask(doc.w, doc.h, 0, 0),
        saved = makeCanvas(doc.w, doc.h);
      saved.getContext('2d')!.drawImage(mask, 0, 0);
      lastSelectionRef.current = {
        mask: saved,
        bounds: { ...bounds },
        path: selectionPathRef.current?.map((p) => ({ ...p })) ?? null,
      };
      mask.width = mask.height = 1;
    }
    selectionChannelRef.current = null;
    setSelection(null);
    selectionRef.current = null;
    setSelectionPath(null);
    selectionPathRef.current = null;
    setStatus('Deselected');
  };
  const reselect = () => {
    const last = lastSelectionRef.current;
    if (!last) {
      setStatus('No previous selection to restore');
      return;
    }
    const mask = makeCanvas(doc.w, doc.h);
    mask.getContext('2d')!.drawImage(last.mask, 0, 0);
    selectionChannelRef.current = mask;
    setSelection({ ...last.bounds });
    selectionRef.current = { ...last.bounds };
    setSelectionPath(last.path?.map((p) => ({ ...p })) ?? null);
    selectionPathRef.current = last.path?.map((p) => ({ ...p })) ?? null;
    setStatus('Previous selection restored');
  };
  const expandMask = (base: HTMLCanvasElement, radius: number) => {
    const out = makeCanvas(doc.w, doc.h),
      ctx = out.getContext('2d')!;
    for (let y = -radius; y <= radius; y++)
      for (let x = -radius; x <= radius; x++)
        if (x * x + y * y <= radius * radius) ctx.drawImage(base, x, y);
    return out;
  };
  const invertSelectionMask = (base: HTMLCanvasElement) => {
    const out = makeCanvas(doc.w, doc.h),
      ctx = out.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, doc.w, doc.h);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(base, 0, 0);
    return out;
  };
  const refineSelection = (
    kind: 'invert' | 'expand' | 'contract' | 'smooth' | 'feather' | 'border',
  ) => {
    if (!selectionRef.current) {
      setStatus('Make a selection first');
      return;
    }
    const radius = Math.max(1, Math.min(20, Math.round(selectionRadius))),
      base = selectionMask(doc.w, doc.h, 0, 0);
    let out: HTMLCanvasElement;
    if (kind === 'invert') out = invertSelectionMask(base);
    else if (kind === 'expand') out = expandMask(base, radius);
    else if (kind === 'contract') {
      const inverse = invertSelectionMask(base),
        grown = expandMask(inverse, radius);
      out = invertSelectionMask(grown);
      inverse.width = inverse.height = grown.width = grown.height = 1;
    } else if (kind === 'smooth' || kind === 'feather') {
      out = makeCanvas(doc.w, doc.h);
      const ctx = out.getContext('2d')!;
      ctx.filter = `blur(${radius}px)`;
      ctx.drawImage(base, 0, 0);
      if (kind === 'smooth') {
        const image = ctx.getImageData(0, 0, doc.w, doc.h);
        for (let i = 0; i < image.data.length; i += 4) {
          const a = image.data[i + 3] >= 128 ? 255 : 0;
          image.data[i] =
            image.data[i + 1] =
            image.data[i + 2] =
            image.data[i + 3] =
              a;
        }
        ctx.putImageData(image, 0, 0);
      }
    } else {
      const expanded = expandMask(base, radius),
        inverse = invertSelectionMask(base),
        grownInverse = expandMask(inverse, radius),
        contracted = invertSelectionMask(grownInverse);
      expanded.getContext('2d')!.globalCompositeOperation = 'destination-out';
      expanded.getContext('2d')!.drawImage(contracted, 0, 0);
      out = expanded;
      inverse.width =
        inverse.height =
        grownInverse.width =
        grownInverse.height =
        contracted.width =
        contracted.height =
          1;
    }
    base.width = base.height = 1;
    commitSelectionMask(
      out,
      `${kind[0].toUpperCase() + kind.slice(1)} selection`,
      'replace',
    );
  };
  const saveCurrentSelection = () => {
    if (!selectionRef.current) {
      setStatus('Make a selection before saving it.');
      return;
    }
    const mask = selectionMask(doc.w, doc.h, 0, 0),
      name = selectionName.trim() || `Selection ${savedSelections.length + 1}`,
      id = crypto.randomUUID();
    savedSelectionCanvases.current.set(id, mask);
    setSavedSelections((items) => [
      { id, name, mask: mask.toDataURL('image/png') },
      ...items,
    ]);
    setSelectionManagerOpen(false);
    setSaved(false);
    setStatus(`${name} saved with this document`);
  };
  const loadSavedSelection = (item: SavedSelection) => {
    const stored = savedSelectionCanvases.current.get(item.id);
    if (stored) {
      const mask = makeCanvas(doc.w, doc.h);
      mask.getContext('2d')!.drawImage(stored, 0, 0, doc.w, doc.h);
      commitSelectionMask(mask, `Loaded ${item.name}`, 'replace');
      snapshot('Load selection');
      render();
      setSelectionManagerOpen(false);
      return;
    }
    const image = new Image();
    image.onload = () => {
      const mask = makeCanvas(doc.w, doc.h);
      mask.getContext('2d')!.drawImage(image, 0, 0, doc.w, doc.h);
      commitSelectionMask(mask, `Loaded ${item.name}`, 'replace');
      snapshot('Load selection');
      render();
      setSelectionManagerOpen(false);
    };
    image.onerror = () => setStatus('Saved selection could not be decoded.');
    image.src = item.mask;
  };
  const applySelectAndMask = () => {
    if (!selectionRef.current) {
      setStatus('Make a selection before opening Select and Mask.');
      return;
    }
    const base = selectionMask(doc.w, doc.h, 0, 0);
    let out = base;
    if (refineRadius > 0) {
      const grown = expandMask(out, Math.round(refineRadius)),
        activeLayer = selected(),
        surface = activeLayer && surfacesRef.current.get(activeLayer.id);
      if (activeLayer && surface) {
        const visible = makeCanvas(doc.w, doc.h);
        drawLayer(
          visible.getContext('2d')!,
          { ...activeLayer, opacity: 100, fill: 100, blend: 'source-over' },
          surface,
          doc.w,
          doc.h,
        );
        grown.getContext('2d')!.globalCompositeOperation = 'destination-in';
        grown.getContext('2d')!.drawImage(visible, 0, 0);
        visible.width = visible.height = 1;
      }
      if (out !== base) out.width = out.height = 1;
      out = grown;
    }
    if (refineShift !== 0) {
      const radius = Math.max(1, Math.round(Math.abs(refineShift) / 10));
      if (refineShift > 0) {
        const shifted = expandMask(out, radius);
        if (out !== base) out.width = out.height = 1;
        out = shifted;
      } else {
        const inverse = invertSelectionMask(out),
          grown = expandMask(inverse, radius),
          shifted = invertSelectionMask(grown);
        inverse.width = inverse.height = grown.width = grown.height = 1;
        if (out !== base) out.width = out.height = 1;
        out = shifted;
      }
    }
    if (refineSmooth || refineFeather) {
      const softened = makeCanvas(doc.w, doc.h),
        ctx = softened.getContext('2d')!;
      ctx.filter = `blur(${Math.max(refineSmooth, refineFeather)}px)`;
      ctx.drawImage(out, 0, 0);
      if (!refineFeather) {
        const pixels = ctx.getImageData(0, 0, doc.w, doc.h);
        for (let i = 3; i < pixels.data.length; i += 4) {
          const alpha = pixels.data[i] >= 128 ? 255 : 0;
          pixels.data[i - 3] = pixels.data[i - 2] = pixels.data[i - 1] = alpha;
          pixels.data[i] = alpha;
        }
        ctx.putImageData(pixels, 0, 0);
      }
      if (out !== base) out.width = out.height = 1;
      out = softened;
    }
    if (decontaminate) {
      const meta = selected(),
        surface = meta && surfacesRef.current.get(meta.id);
      if (meta && surface && !isLocked(meta.id)) {
        const maskData = out
            .getContext('2d', { willReadFrequently: true })!
            .getImageData(0, 0, doc.w, doc.h),
          pixels = surface.pixels
            .getContext('2d', { willReadFrequently: true })!
            .getImageData(0, 0, doc.w, doc.h),
          amount = decontaminateAmount / 100;
        for (let y = 1; y < doc.h - 1; y++)
          for (let x = 1; x < doc.w - 1; x++) {
            const i = (y * doc.w + x) * 4,
              edge = maskData.data[i + 3];
            if (edge < 16 || edge > 240) continue;
            let best = i,
              bestAlpha = edge;
            for (let oy = -1; oy <= 1; oy++)
              for (let ox = -1; ox <= 1; ox++) {
                const n = ((y + oy) * doc.w + x + ox) * 4,
                  alpha = maskData.data[n + 3];
                if (alpha > bestAlpha) {
                  bestAlpha = alpha;
                  best = n;
                }
              }
            for (let channel = 0; channel < 3; channel++)
              pixels.data[i + channel] =
                pixels.data[i + channel] * (1 - amount) +
                pixels.data[best + channel] * amount;
          }
        surface.pixels.getContext('2d')!.putImageData(pixels, 0, 0);
      }
    }
    if (out !== base) base.width = base.height = 1;
    commitSelectionMask(out, 'Select and Mask refined', 'replace');
    snapshot('Select and Mask');
    render();
    setSelectMaskOpen(false);
  };
  const selectOpaqueObject = () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (
      !meta ||
      !surface ||
      meta.kind === 'group' ||
      meta.kind === 'adjustment'
    ) {
      setStatus('Select a pixel layer first');
      return;
    }
    const placed = makeCanvas(doc.w, doc.h);
    drawLayer(
      placed.getContext('2d')!,
      { ...meta, opacity: 100, fill: 100, blend: 'source-over' },
      surface,
      doc.w,
      doc.h,
    );
    const image = placed.getContext('2d')!.getImageData(0, 0, doc.w, doc.h);
    for (let i = 0; i < image.data.length; i += 4) {
      const a = image.data[i + 3] > 8 ? 255 : 0;
      image.data[i] =
        image.data[i + 1] =
        image.data[i + 2] =
        image.data[i + 3] =
          a;
    }
    placed.getContext('2d')!.putImageData(image, 0, 0);
    commitSelectionMask(placed, 'Object selected');
  };
  const selectColorRange = () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (!meta || !surface) return;
    const source = surface.pixels
        .getContext('2d', { willReadFrequently: true })!
        .getImageData(0, 0, doc.w, doc.h),
      target = [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
      ],
      local = makeCanvas(doc.w, doc.h),
      image = local.getContext('2d')!.createImageData(doc.w, doc.h);
    let count = 0;
    for (let i = 0; i < source.data.length; i += 4) {
      if (
        Math.abs(source.data[i] - target[0]) +
          Math.abs(source.data[i + 1] - target[1]) +
          Math.abs(source.data[i + 2] - target[2]) <=
          magicTolerance * 3 &&
        source.data[i + 3]
      ) {
        image.data[i] =
          image.data[i + 1] =
          image.data[i + 2] =
          image.data[i + 3] =
            255;
        count++;
      }
    }
    local.getContext('2d')!.putImageData(image, 0, 0);
    const placed = makeCanvas(doc.w, doc.h),
      ctx = placed.getContext('2d')!;
    ctx.translate(meta.x + doc.w / 2, meta.y + doc.h / 2);
    ctx.rotate(((meta.rotation ?? 0) * Math.PI) / 180);
    ctx.scale(meta.scaleX ?? 1, meta.scaleY ?? 1);
    ctx.drawImage(local, -doc.w / 2, -doc.h / 2);
    local.width = local.height = 1;
    commitSelectionMask(
      placed,
      `Color Range selected ${count.toLocaleString()} pixels`,
    );
  };
  const runSmartSelection = (p: Point, quick = false) => {
    const had = !!selectionRef.current,
      before = had ? selectionMask(doc.w, doc.h, 0, 0) : null;
    smartSelect(p);
    const fresh = selectionChannelRef.current;
    if (!fresh || !before) return;
    const mode = quick && selectionMode === 'replace' ? 'add' : selectionMode;
    if (mode === 'replace') {
      before.width = before.height = 1;
      return;
    }
    const result = makeCanvas(doc.w, doc.h),
      ctx = result.getContext('2d')!;
    ctx.drawImage(before, 0, 0);
    ctx.globalCompositeOperation =
      mode === 'add'
        ? 'source-over'
        : mode === 'subtract'
          ? 'destination-out'
          : 'destination-in';
    ctx.drawImage(fresh, 0, 0);
    before.width = before.height = 1;
    commitSelectionMask(
      result,
      quick ? 'Quick Selection' : 'Magic Wand',
      'replace',
    );
  };
  const copySelection = () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (
      !meta ||
      !surface ||
      meta.kind === 'group' ||
      meta.kind === 'adjustment'
    )
      return;
    const s = selectionRef.current,
      x = Math.max(0, Math.round(s?.x ?? 0)),
      y = Math.max(0, Math.round(s?.y ?? 0)),
      w = Math.max(1, Math.min(doc.w - x, Math.round(s?.w ?? doc.w))),
      h = Math.max(1, Math.min(doc.h - y, Math.round(s?.h ?? doc.h))),
      rendered = makeCanvas(doc.w, doc.h),
      pixels = makeCanvas(w, h),
      ctx = pixels.getContext('2d')!;
    drawLayer(
      rendered.getContext('2d')!,
      { ...meta, blend: 'source-over', opacity: 100, fill: 100 },
      surface,
      doc.w,
      doc.h,
    );
    ctx.drawImage(rendered, -x, -y);
    if (s) {
      ctx.globalCompositeOperation = 'destination-in';
      const selectedPixels = selectionMask(doc.w, doc.h, 0, 0);
      ctx.drawImage(selectedPixels, -x, -y);
      selectedPixels.width = selectedPixels.height = 1;
    }
    rendered.width = rendered.height = 1;
    clipboardRef.current = { pixels, x, y };
    setStatus(
      `Copied ${w} × ${h}px${feather ? ` with ${feather}px feather` : ''}`,
    );
  };
  const cutSelection = () => {
    const target = targetContext();
    if (!target || editing === 'mask') return;
    copySelection();
    const s = selectionRef.current;
    if (selectionChannelRef.current || selectionPathRef.current || feather) {
      const erase = selectionMask(doc.w, doc.h, 0, 0);
      const localMask = makeCanvas(doc.w, doc.h),
        localContext = localMask.getContext('2d')!;
      localContext.translate(doc.w / 2, doc.h / 2);
      localContext.scale(
        1 / (target.meta.scaleX || 1),
        1 / (target.meta.scaleY || 1),
      );
      localContext.rotate(-((target.meta.rotation ?? 0) * Math.PI) / 180);
      localContext.translate(
        -target.meta.x - doc.w / 2,
        -target.meta.y - doc.h / 2,
      );
      localContext.drawImage(erase, 0, 0);
      target.ctx.save();
      target.ctx.globalCompositeOperation = 'destination-out';
      target.ctx.drawImage(localMask, 0, 0);
      target.ctx.restore();
      erase.width = erase.height = localMask.width = localMask.height = 1;
    } else
      target.ctx.clearRect(
        (s?.x ?? 0) - target.meta.x,
        (s?.y ?? 0) - target.meta.y,
        s?.w ?? doc.w,
        s?.h ?? doc.h,
      );
    snapshot('Cut');
    render();
  };
  const pasteClipboard = () => {
    const clip = clipboardRef.current;
    if (!clip) return;
    const id = createLayer('Pasted layer', true);
    if (!id) return;
    const surface = surfacesRef.current.get(id)!;
    surface.pixels.getContext('2d')!.drawImage(clip.pixels, clip.x, clip.y);
    snapshot('Paste');
    render();
    setStatus('Pasted as a new layer');
  };
  const allowResize = (w: number, h: number) => {
    if (!permit(layersRef.current.map((l) => l.id))) return false;
    try {
      const units = [...surfacesRef.current.values()].reduce(
        (n, s) => n + (s.mask ? 2 : 1),
        0,
      );
      requireRoom(w, h, (w * h - doc.w * doc.h) * units);
      return true;
    } catch (e) {
      setPsdError(
        e instanceof Error ? e.message : 'Cannot resize this document.',
      );
      return false;
    }
  };
  const resizeImage = (
    nw?: number,
    nh?: number,
    resampling: 'nearest' | 'low' | 'medium' | 'high' = 'high',
    resolution = view.resolution,
  ) => {
    if (nw === undefined || nh === undefined) {
      setImageSizeOpen(true);
      return;
    }
    if (!allowResize(nw, nh)) return;
    const rx = nw / doc.w,
      ry = nh / doc.h;
    for (const meta of layersRef.current) {
      const old = surfacesRef.current.get(meta.id)!,
        pixels = makeCanvas(nw, nh),
        ctx = pixels.getContext('2d')!;
      ctx.imageSmoothingEnabled = resampling !== 'nearest';
      ctx.imageSmoothingQuality =
        resampling === 'low'
          ? 'low'
          : resampling === 'medium'
            ? 'medium'
            : 'high';
      ctx.drawImage(old.pixels, 0, 0, nw, nh);
      let mask: HTMLCanvasElement | undefined;
      if (old.mask) {
        mask = makeCanvas(nw, nh);
        const mc = mask.getContext('2d')!;
        mc.imageSmoothingEnabled = resampling !== 'nearest';
        mc.imageSmoothingQuality =
          resampling === 'low'
            ? 'low'
            : resampling === 'medium'
              ? 'medium'
              : 'high';
        mc.drawImage(old.mask, 0, 0, nw, nh);
      }
      surfacesRef.current.set(meta.id, { pixels, mask });
      meta.x = Math.round(meta.x * rx);
      meta.y = Math.round(meta.y * ry);
    }
    setDoc({ w: nw, h: nh });
    setView((v) => ({ ...v, resolution }));
    setSelection(null);
    selectionRef.current = null;
    setTimeout(() => {
      snapshot('Image size');
      render();
    }, 0);
  };
  const resizeCanvas = (
    nw?: number,
    nh?: number,
    anchorX: -1 | 0 | 1 = 0,
    anchorY: -1 | 0 | 1 = 0,
  ) => {
    if (nw === undefined || nh === undefined) {
      setCanvasSizeOpen(true);
      return;
    }
    if (!allowResize(nw, nh)) return;
    const offset = (next: number, current: number, anchor: number) =>
        anchor < 0
          ? 0
          : anchor > 0
            ? next - current
            : Math.round((next - current) / 2),
      dx = offset(nw, doc.w, anchorX),
      dy = offset(nh, doc.h, anchorY);
    for (const meta of layersRef.current) {
      const old = surfacesRef.current.get(meta.id)!,
        pixels = makeCanvas(nw, nh);
      pixels.getContext('2d')!.drawImage(old.pixels, dx, dy);
      let mask: HTMLCanvasElement | undefined;
      if (old.mask) {
        mask = makeCanvas(nw, nh);
        const mc = mask.getContext('2d')!;
        mc.fillStyle = 'black';
        mc.fillRect(0, 0, nw, nh);
        mc.drawImage(old.mask, dx, dy);
      }
      surfacesRef.current.set(meta.id, { pixels, mask });
    }
    setDoc({ w: nw, h: nh });
    setSelection(null);
    selectionRef.current = null;
    setTimeout(() => {
      snapshot('Canvas size');
      render();
    }, 0);
  };
  const exportImage = useCallback(
    (
      type: 'image/png' | 'image/jpeg' | 'image/webp',
      ext: 'png' | 'jpg' | 'webp',
    ) => {
      let source = makeCanvas(doc.w, doc.h);
      renderLayers(source.getContext('2d')!);
      if (type === 'image/jpeg') {
        const flat = makeCanvas(doc.w, doc.h),
          ctx = flat.getContext('2d')!;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, doc.w, doc.h);
        ctx.drawImage(source, 0, 0);
        source = flat;
      }
      source.toBlob(
        (blob) => {
          if (!blob) {
            setStatus('Export failed');
            return;
          }
          const url = URL.createObjectURL(blob),
            a = document.createElement('a');
          a.download = `${fileName.replace(/\.[^.]+$/, '') || 'librelayer'}.${ext}`;
          a.href = url;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          setStatus(
            `${ext.toUpperCase()} exported — use Save layered project to preserve editing`,
          );
        },
        type,
        0.92,
      );
    },
    [doc, fileName],
  );
  const exportPng = useCallback(
    () => exportImage('image/png', 'png'),
    [exportImage],
  );
  const loadImportedDocument = (
    name: string,
    w: number,
    h: number,
    nextLayers: LayerMeta[],
    nextSurfaces: Map<string, LayerSurface>,
    label: string,
    restore?: { id: string; saved: boolean; skipPersist: boolean },
  ) => {
    nextLayers = treeOrder(nextLayers);
    requireRoom(
      w,
      h,
      [...nextSurfaces.values()].reduce(
        (n, s) =>
          n +
          s.pixels.width * s.pixels.height +
          (s.mask ? s.mask.width * s.mask.height : 0),
        0,
      ),
    );
    if (!restore?.skipPersist) persistActiveDocument();
    const documentId = restore?.id ?? crypto.randomUUID(),
      selectedLayer =
        nextLayers.find((x) => x.kind !== 'group') ?? nextLayers[0],
      snap: Snapshot = {
        label,
        w,
        h,
        layers: nextLayers.map((x) => ({ ...x })),
        selectedId: selectedLayer.id,
        surfaces: nextLayers.map((meta) => {
          const s = nextSurfaces.get(meta.id)!;
          return {
            id: meta.id,
            pixels: captureTiles(s.pixels),
            mask: s.mask ? captureTiles(s.mask) : undefined,
          };
        }),
      },
      next: EditorDocument = {
        id: documentId,
        name,
        saved: restore?.saved ?? true,
        doc: { w, h },
        layers: nextLayers,
        surfaces: nextSurfaces,
        selectedId: selectedLayer.id,
        history: [snap],
        historyIndex: 0,
        zoom: Math.min(100, Math.max(20, Math.round((760 / w) * 100))),
        selection: null,
        paths: [],
      };
    documentStoreRef.current.set(documentId, next);
    setDocuments((items) => [
      ...items,
      { id: documentId, name, saved: restore?.saved ?? true },
    ]);
    loadDocument(next);
    if (fileRef.current) fileRef.current.value = '';
  };
  const importPsdResult = (name: string, data: PsdImport) => {
    let units = 0;
    const inspectUnits = (nodes: PsdLayer[]) =>
      nodes.forEach((n) => {
        units += n.mask ? 2 : 1;
        if (n.children) inspectUnits(n.children);
      });
    inspectUnits(data.children);
    requireRoom(data.width, data.height, data.width * data.height * units);
    const nextLayers: LayerMeta[] = [],
      nextSurfaces = new Map<string, LayerSurface>();
    const toCanvas = (data: NonNullable<PsdLayer['imageData']>) => {
      const canvas = makeCanvas(data.width, data.height);
      canvas
        .getContext('2d')!
        .putImageData(
          new ImageData(
            data.data as Uint8ClampedArray<ArrayBuffer>,
            data.width,
            data.height,
          ),
          0,
          0,
        );
      return canvas;
    };
    const walk = (nodes: PsdLayer[], parentId?: string) => {
      for (const node of nodes) {
        const id = crypto.randomUUID(),
          pixels = makeCanvas(data.width, data.height);
        if (node.imageData)
          pixels
            .getContext('2d')!
            .drawImage(toCanvas(node.imageData), node.left ?? 0, node.top ?? 0);
        let mask: HTMLCanvasElement | undefined;
        if (node.mask) {
          mask = makeCanvas(data.width, data.height);
          const ctx = mask.getContext('2d')!,
            shade = node.mask.defaultColor ?? 255;
          ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
          ctx.fillRect(0, 0, data.width, data.height);
          if (node.mask.imageData)
            ctx.drawImage(
              toCanvas(node.mask.imageData),
              (node.mask.left ?? 0) +
                (node.mask.positionRelativeToLayer ? (node.left ?? 0) : 0),
              (node.mask.top ?? 0) +
                (node.mask.positionRelativeToLayer ? (node.top ?? 0) : 0),
            );
        }
        const blend =
          node.blendMode === 'normal' || node.children
            ? 'source-over'
            : ((node.blendMode ?? 'normal').replaceAll(' ', '-') as BlendMode);
        nextLayers.push({
          id,
          name: node.name || 'PSD layer',
          visible: !node.hidden,
          opacity: Math.round((node.opacity ?? 1) * 100),
          blend: blend in blendLabels ? blend : 'source-over',
          x: 0,
          y: 0,
          hasMask: !!mask,
          maskEnabled: !node.mask?.disabled,
          kind: node.children ? 'group' : 'pixel',
          parentId,
          collapsed: node.opened === false,
          locked: !!node.transparencyProtected,
        });
        nextSurfaces.set(id, { pixels, mask });
        if (node.children) walk(node.children, id);
      }
    };
    walk(data.children);
    loadImportedDocument(
      name,
      data.width,
      data.height,
      nextLayers,
      nextSurfaces,
      'Open PSD',
    );
    setStatus(
      data.warnings.length
        ? `Opened saved ${data.bitDepth}-bit PSD composite as one 8-bit working layer`
        : data.bitDepth > 8
          ? `${data.bitDepth}-bit PSD opened — supported layers preserved as editable 8-bit working layers`
          : 'PSD opened — raster layers, opacity, blend modes and masks preserved',
    );
  };
  const openPsd = async (file: File) => {
    if (psdBusyRef.current) return;
    psdBusyRef.current = true;
    setPsdBusy(true);
    try {
      checkFileSize(file.size);
      const data = await processPsd<PsdImport>({
        action: 'read',
        buffer: await file.arrayBuffer(),
      });
      if (data.warnings.length) setPsdPending({ name: file.name, data });
      else importPsdResult(file.name, data);
    } catch (error) {
      setPsdError(
        error instanceof Error ? error.message : 'Could not open this PSD.',
      );
    } finally {
      psdBusyRef.current = false;
      setPsdBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const exportPsd = async (flattened = false, psb = false) => {
    if (psdBusyRef.current) return;
    if (
      doc.w * doc.h > MAX_DOCUMENT_PIXELS ||
      layers.length > 100 ||
      doc.w * doc.h * layers.reduce((n, l) => n + (l.hasMask ? 2 : 1), 0) >
        MAX_WORKING_PIXELS
    ) {
      setPsdError(
        'This document exceeds the PSD memory limit. Reduce its dimensions or layer count first.',
      );
      return;
    }
    if (
      !flattened &&
      layers.some(
        (l) =>
          l.kind === 'adjustment' ||
          l.clipping ||
          l.blendIf ||
          l.blend in extraBlends ||
          !!l.vectorMask ||
          (l.hasMask &&
            ((l.blur ?? 0) > 0 ||
              (l.maskDensity ?? 100) !== 100 ||
              (l.maskFeather ?? 0) > 0 ||
              l.maskLinked === false)),
      )
    ) {
      setPsdError(
        'Layered PSD export cannot preserve these clipping, Blend If, extended blend modes, adjustment layers, vector masks, or advanced raster-mask settings yet. Use File → Export flattened PSD for the visible result, or Save layered project to keep editing.',
      );
      return;
    }
    psdBusyRef.current = true;
    setPsdBusy(true);
    try {
      const composite = makeCanvas(doc.w, doc.h);
      renderLayers(composite.getContext('2d')!);
      const imageData = composite
        .getContext('2d')!
        .getImageData(0, 0, doc.w, doc.h);
      composite.width = 1;
      composite.height = 1;
      const build = (parentId?: string): PsdLayer[] =>
        layersRef.current
          .filter((l) => l.parentId === parentId)
          .map((l) => {
            if (l.kind === 'group')
              return {
                name: l.name,
                hidden: !l.visible,
                opened: !l.collapsed,
                blendMode: 'pass through',
                children: build(l.id),
              };
            const s = surfacesRef.current.get(l.id)!,
              pixels = makeCanvas(doc.w, doc.h);
            drawLayer(
              pixels.getContext('2d')!,
              { ...l, opacity: 100, blend: 'source-over', hasMask: false },
              s,
              doc.w,
              doc.h,
            );
            let mask: PsdLayer['mask'];
            if (l.hasMask && s.mask) {
              const canvas = makeCanvas(doc.w, doc.h),
                ctx = canvas.getContext('2d')!;
              ctx.fillStyle = 'black';
              ctx.fillRect(0, 0, doc.w, doc.h);
              drawLayer(
                ctx,
                {
                  ...l,
                  opacity: 100,
                  fill: 100,
                  blend: 'source-over',
                  hasMask: false,
                  brightness: 100,
                  contrast: 100,
                  saturation: 100,
                  blur: 0,
                },
                { pixels: s.mask },
                doc.w,
                doc.h,
              );
              mask = {
                left: 0,
                top: 0,
                right: doc.w,
                bottom: doc.h,
                defaultColor: 0,
                disabled: !l.maskEnabled,
                imageData: ctx.getImageData(0, 0, doc.w, doc.h),
              };
              canvas.width = 1;
              canvas.height = 1;
            }
            const layerImage = pixels
              .getContext('2d')!
              .getImageData(0, 0, doc.w, doc.h);
            pixels.width = 1;
            pixels.height = 1;
            return {
              name: l.name,
              hidden: !l.visible,
              opacity: l.opacity / 100,
              transparencyProtected: l.locked,
              blendMode: (l.blend === 'source-over'
                ? 'normal'
                : l.blend.replaceAll('-', ' ')) as PsdLayer['blendMode'],
              left: 0,
              top: 0,
              imageData: layerImage,
              mask,
            };
          });
      const buffer = await processPsd<ArrayBuffer>({
        action: 'write',
        psb,
        psd: {
          width: doc.w,
          height: doc.h,
          imageData,
          children: flattened
            ? [{ name: 'Flattened artwork', imageData }]
            : build(),
        },
      });
      checkFileSize(buffer.byteLength);
      const url = URL.createObjectURL(
          new Blob([buffer], { type: 'image/vnd.adobe.photoshop' }),
        ),
        a = document.createElement('a');
      a.href = url;
      a.download =
        (fileName.replace(/\.[^.]+$/, '') || 'Artwork') +
        (flattened ? '-flattened' : '') +
        (psb ? '.psb' : '.psd');
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus(
        psb
          ? 'Full-resolution PSB exported — supported up to 64 megapixels'
          : flattened
            ? 'Flattened PSD exported — one visible pixel layer'
            : 'Layered PSD exported — transforms and pixel adjustments baked; use native project saving for full editability',
      );
    } catch (error) {
      setPsdError(
        error instanceof Error ? error.message : 'PSD export failed.',
      );
    } finally {
      psdBusyRef.current = false;
      setPsdBusy(false);
    }
  };

  const chooseDefaultSaveDirectory = async () => {
    const picker = (
      window as unknown as {
        showDirectoryPicker?: () => Promise<LocalDirectoryHandle>;
      }
    ).showDirectoryPicker;
    if (!picker) {
      setRecoveryStatus(
        'Folder selection is not supported here; projects will use Downloads',
      );
      return;
    }
    try {
      const handle = await picker.call(window);
      await setDefaultSaveDirectory(handle);
      setSaveLocationName(handle.name);
      setRecoveryStatus(`Default save location set to ${handle.name}`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setRecoveryStatus('The default save location could not be changed');
    }
  };
  const resetDefaultSaveDirectory = async () => {
    try {
      await clearDefaultSaveDirectory();
      setSaveLocationName('Downloads');
      setRecoveryStatus('Default save location reset to Downloads');
    } catch {
      setRecoveryStatus('The default save location could not be reset');
    }
  };
  const saveProject = async (password?: string) => {
    try {
      if (
        doc.w * doc.h > MAX_DOCUMENT_PIXELS ||
        layersRef.current.length > 100
      ) {
        setStatus(
          'Layered projects support up to 64 megapixels and 100 layers. Reduce the document before saving.',
        );
        return false;
      }
      let directory: LocalDirectoryHandle | null = null;
      let folderPermission: PermissionState = 'denied';
      try {
        directory = await getDefaultSaveDirectory();
        if (directory) {
          folderPermission = await directory.queryPermission({
            mode: 'readwrite',
          });
          if (folderPermission === 'prompt')
            folderPermission = await directory.requestPermission({
              mode: 'readwrite',
            });
        }
      } catch {
        folderPermission = 'denied';
      }
      const savedLayers = [];
      for (const layer of layersRef.current) {
        const surface = surfacesRef.current.get(layer.id)!;
        savedLayers.push({
          ...layer,
          pixels: await canvasPngDataUrl(surface.pixels),
          mask: surface.mask ? await canvasPngDataUrl(surface.mask) : undefined,
        });
      }
      const project = {
        format: 'librelayer',
        version: 2,
        createdWith: 'LibreLayer web',
        name: fileName,
        width: doc.w,
        height: doc.h,
        selectedId: selectedRef.current,
        selectedIds: [...selectedIdsRef.current],
        layerComps: layerCompsRef.current,
        zoom,
        view,
        layers: savedLayers,
        paths,
        savedSelections,
        selection: selectionRef.current,
        selectionPath: selectionPathRef.current,
        feather,
      };
      const encrypted = typeof password === 'string';
      const blob = encrypted
        ? await packEncryptedProject(project, password)
        : await packProject(project);
      checkFileSize(blob.size);
      const projectName = `${(fileName.replace(/\.[^.]+$/, '') || 'Artwork').replace(/[\\/?%*:|"<>]/g, '-')}${encrypted ? '-encrypted' : ''}.librelayer`;
      let savedToFolder = false;
      if (directory && folderPermission === 'granted') {
        let writable:
          | Awaited<
              ReturnType<
                Awaited<
                  ReturnType<LocalDirectoryHandle['getFileHandle']>
                >['createWritable']
              >
            >
          | undefined;
        try {
          const handle = await directory.getFileHandle(projectName, {
            create: true,
          });
          writable = await handle.createWritable({ keepExistingData: false });
          await writable.write(blob);
          await writable.close();
          await rememberRecentFile(handle);
          setRecent(await recentFiles());
          savedToFolder = true;
        } catch {
          try {
            await writable?.abort?.();
          } catch {}
        }
      }
      if (!savedToFolder) {
        const url = URL.createObjectURL(blob),
          a = document.createElement('a');
        a.href = url;
        a.download = projectName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setSaved(true);
      recoveryFingerprints.current.delete(activeDocumentRef.current);
      lastVersionAt.current.delete(activeDocumentRef.current);
      setTimeout(() => recoveryTick.current(true), 0);
      setStatus(
        savedToFolder
          ? `${encrypted ? 'Encrypted' : 'Integrity-protected'} project saved to ${directory?.name}`
          : `${encrypted ? 'Encrypted' : 'Integrity-protected'} project saved to Downloads — reopen with File > Open`,
      );
      return true;
    } catch (e) {
      setPsdError(
        e instanceof Error
          ? e.message
          : 'Project could not be saved. Try a smaller document.',
      );
      return false;
    }
  };
  const openProject = async (
    file: File,
    restore?: { id: string; saved: boolean; skipPersist: boolean },
    password?: string,
  ) => {
    if (psdBusyRef.current) return false;
    psdBusyRef.current = true;
    setPsdBusy(true);
    try {
      checkFileSize(file.size);
      const unpacked = await unpackProject<any>(await file.text(), password),
        data = unpacked.project;
      if (
        !['librelayer', 'pixel-studio'].includes(data.format) ||
        ![1, 2].includes(data.version) ||
        !Number.isInteger(data.width) ||
        !Number.isInteger(data.height) ||
        data.width < 1 ||
        data.height < 1 ||
        data.width * data.height > MAX_DOCUMENT_PIXELS ||
        !Array.isArray(data.layers) ||
        !data.layers.length ||
        data.layers.length > 100
      )
        throw Error('Invalid project');
      checkDimensions(data.width, data.height);
      requireRoom(
        data.width,
        data.height,
        data.width *
          data.height *
          data.layers.reduce(
            (n: number, l: { mask?: string }) => n + (l.mask ? 2 : 1),
            0,
          ),
      );
      const surfaces = new Map<string, LayerSurface>(),
        metas: LayerMeta[] = [];
      const decode = (uri: string) =>
        new Promise<HTMLCanvasElement>((resolve, reject) => {
          if (
            typeof uri !== 'string' ||
            !uri.startsWith('data:image/png;base64,')
          ) {
            reject(Error('Invalid pixels'));
            return;
          }
          try {
            const header = Uint8Array.from(atob(uri.slice(22, 66)), (c) =>
                c.charCodeAt(0),
              ),
              view = new DataView(header.buffer);
            if (
              view.getUint32(0) !== 0x89504e47 ||
              view.getUint32(16) !== data.width ||
              view.getUint32(20) !== data.height
            )
              throw Error(
                'Embedded layer dimensions do not match the project.',
              );
          } catch (e) {
            reject(e);
            return;
          }
          const image = new Image();
          image.onload = () => {
            if (image.width !== data.width || image.height !== data.height) {
              reject(Error('Size mismatch'));
              return;
            }
            const canvas = makeCanvas(data.width, data.height);
            canvas.getContext('2d')!.drawImage(image, 0, 0);
            resolve(canvas);
          };
          image.onerror = reject;
          image.src = uri;
        });
      for (const item of data.layers) {
        if (
          typeof item.id !== 'string' ||
          surfaces.has(item.id) ||
          typeof item.name !== 'string' ||
          !(item.blend in blendLabels) ||
          !Number.isFinite(item.opacity) ||
          item.opacity < 0 ||
          item.opacity > 100
        )
          throw Error('Invalid layer');
        for (const key of [
          'x',
          'y',
          'rotation',
          'scaleX',
          'scaleY',
          'brightness',
          'contrast',
          'saturation',
          'blur',
        ])
          if (item[key] !== undefined && !Number.isFinite(item[key]))
            throw Error('Invalid layer values');
        if (
          item.fill !== undefined &&
          (!Number.isFinite(item.fill) || item.fill < 0 || item.fill > 100)
        )
          throw Error('Invalid layer fill');
        if (
          item.maskDensity !== undefined &&
          (!Number.isFinite(item.maskDensity) ||
            item.maskDensity < 0 ||
            item.maskDensity > 100)
        )
          throw Error('Invalid mask density');
        if (
          item.maskFeather !== undefined &&
          (!Number.isFinite(item.maskFeather) ||
            item.maskFeather < 0 ||
            item.maskFeather > 250)
        )
          throw Error('Invalid mask feather');
        if (
          item.maskLinked !== undefined &&
          typeof item.maskLinked !== 'boolean'
        )
          throw Error('Invalid mask link');
        if (
          item.vectorMask !== undefined &&
          (!Array.isArray(item.vectorMask) ||
            item.vectorMask.length > 10000 ||
            !item.vectorMask.every(
              (p: Point) => p && Number.isFinite(p.x) && Number.isFinite(p.y),
            ))
        )
          throw Error('Invalid vector mask');
        if (item.blendIf !== undefined && !validBlendIf(item.blendIf))
          throw Error('Invalid Blend If range');
        if (item.linkId !== undefined && typeof item.linkId !== 'string')
          throw Error('Invalid layer link');
        if (item.clipping !== undefined && typeof item.clipping !== 'boolean')
          throw Error('Invalid clipping mask');
        if (item.smartObject?.raw) {
          const raw = item.smartObject.raw;
          if (
            typeof raw.assetId !== 'string' ||
            !raw.assetId ||
            !Number.isInteger(raw.width) ||
            !Number.isInteger(raw.height) ||
            raw.width < 1 ||
            raw.height < 1 ||
            !Number.isInteger(raw.bitDepth) ||
            raw.bitDepth < 8 ||
            raw.bitDepth > 16 ||
            typeof raw.camera !== 'string' ||
            typeof raw.lens !== 'string' ||
            !isRawDevelopSettings(raw.settings)
          )
            throw Error('Invalid Camera Raw Smart Object');
        }
        const { pixels, mask, ...meta } = item;
        surfaces.set(meta.id, {
          pixels: await decode(pixels),
          mask: mask ? await decode(mask) : undefined,
        });
        metas.push(meta);
      }
      for (const meta of metas) {
        const seen = new Set([meta.id]);
        let parent = meta.parentId;
        while (parent) {
          if (seen.has(parent)) throw Error('Cyclic group');
          if (seen.size > 20) throw Error('Groups support up to 20 levels.');
          seen.add(parent);
          const found = metas.find((x) => x.id === parent);
          if (!found || found.kind !== 'group') throw Error('Invalid group');
          parent = found.parentId;
        }
      }
      const validPoints = (points: unknown): points is Point[] =>
        Array.isArray(points) &&
        points.length <= 10000 &&
        points.every((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
      const importedPaths = Array.isArray(data.paths)
        ? data.paths
            .filter(
              (p: { points: unknown; name: unknown; id: unknown }) =>
                typeof p.id === 'string' &&
                typeof p.name === 'string' &&
                validPoints(p.points),
            )
            .map((path: SavedPath) => ({
              id: path.id,
              name: path.name,
              points: path.points.map((point) => ({ ...point })),
              curved: path.curved === true,
            }))
        : [];
      loadImportedDocument(
        typeof data.name === 'string' ? data.name : file.name,
        data.width,
        data.height,
        metas,
        surfaces,
        'Open layered project',
        restore,
      );
      setPaths(importedPaths);
      setSavedSelections(
        Array.isArray(data.savedSelections)
          ? data.savedSelections.filter(
              (item: SavedSelection) =>
                item &&
                typeof item.id === 'string' &&
                typeof item.name === 'string' &&
                typeof item.mask === 'string' &&
                item.mask.startsWith('data:image/png;base64,'),
            )
          : [],
      );
      const importedComps = Array.isArray(data.layerComps)
        ? data.layerComps.filter(
            (c: LayerComp) =>
              c &&
              typeof c.id === 'string' &&
              typeof c.name === 'string' &&
              Array.isArray(c.states) &&
              c.states.every(
                (state) =>
                  state &&
                  typeof state.id === 'string' &&
                  typeof state.visible === 'boolean' &&
                  ['x', 'y', 'opacity'].every((key) =>
                    Number.isFinite(state[key as keyof typeof state]),
                  ),
              ),
          )
        : [];
      layerCompsRef.current = importedComps;
      setLayerComps(importedComps);
      setFeather(
        Number.isFinite(data.feather)
          ? Math.max(0, Math.min(100, data.feather))
          : 0,
      );
      if (validPoints(data.selectionPath) && data.selectionPath.length >= 3) {
        makePathSelection(data.selectionPath);
      } else if (
        data.selection &&
        ['x', 'y', 'w', 'h'].every((key) =>
          Number.isFinite(data.selection[key]),
        ) &&
        data.selection.w > 0 &&
        data.selection.h > 0
      ) {
        setSelection(data.selection);
        selectionRef.current = data.selection;
      }
      if (Array.isArray(data.selectedIds))
        selectMany(
          data.selectedIds.filter((id: unknown) => typeof id === 'string'),
          data.selectedId,
        );
      else if (metas.some((layer) => layer.id === data.selectedId))
        select(data.selectedId);
      if (Number.isFinite(data.zoom)) setZoom(clampZoom(data.zoom));
      setView(readView(data.view));
      setStatus(
        restore
          ? 'Workspace restored from this browser profile'
          : unpacked.encrypted
            ? 'Encrypted project unlocked locally — layers and masks restored'
            : unpacked.verified
              ? 'Layered project reopened — integrity verified; layers, masks, paths and comps restored'
              : 'Legacy layered project reopened — save it again to add integrity protection',
      );
      return true;
    } catch (e) {
      if (
        e instanceof EncryptedProjectPasswordRequired ||
        e instanceof EncryptedProjectPasswordInvalid
      ) {
        setEncryptedProjectFile(file);
        setEncryptedProjectError(
          e instanceof EncryptedProjectPasswordInvalid ? e.message : '',
        );
        return false;
      }
      setPsdError(
        e instanceof Error
          ? e.message
          : 'Could not open this project. Use a valid LibreLayer project (up to 64 megapixels and 100 layers).',
      );
      return false;
    } finally {
      psdBusyRef.current = false;
      setPsdBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  workspaceRestore.current = async () => {
    try {
      const [workspace, records] = await Promise.all([
        loadWorkspaceState(),
        recoveryRecords(),
      ]);
      if (!workspace?.documentIds.length) {
        if (records.length)
          setRecoveryStatus(
            `${records.length} older recovery copies available — File → Recover documents`,
          );
        return;
      }
      const byId = new Map(records.map((record) => [record.id, record])),
        ordered = workspace.documentIds
          .map((id) => byId.get(id))
          .filter((record): record is RecoveryRecord => Boolean(record));
      if (!ordered.length) return;
      documentStoreRef.current.clear();
      setDocuments([]);
      let restored = 0;
      for (const record of ordered) {
        let saved = false;
        try {
          saved = JSON.parse(record.json).saved === true;
        } catch {}
        if (
          await openProject(
            new File([record.json], `${record.name}.librelayer`, {
              type: 'application/json',
            }),
            { id: record.id, saved, skipPersist: true },
          )
        )
          restored++;
      }
      const active = documentStoreRef.current.get(workspace.activeId);
      if (active) loadDocument(active);
      if (restored)
        setRecoveryStatus(
          `${restored} open ${restored === 1 ? 'document' : 'documents'} restored from this browser profile`,
        );
    } catch {
      setRecoveryStatus(
        'The previous workspace could not be restored; recovery copies are still available in File',
      );
    }
  };
  const selectionToMask = () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (
      !meta ||
      !surface ||
      isLocked(meta.id) ||
      meta.kind === 'group' ||
      meta.kind === 'adjustment' ||
      !selectionRef.current
    ) {
      setStatus('Select pixels on an unlocked pixel layer first');
      return;
    }
    if (!surface.mask && !hasRoom(doc.w * doc.h)) return;
    const alpha = selectionMask(doc.w, doc.h, 0, 0),
      mask = makeCanvas(doc.w, doc.h),
      ctx = mask.getContext('2d')!;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, doc.w, doc.h);
    ctx.save();
    ctx.translate(doc.w / 2, doc.h / 2);
    ctx.scale(1 / (meta.scaleX || 1), 1 / (meta.scaleY || 1));
    ctx.rotate((-(meta.rotation ?? 0) * Math.PI) / 180);
    ctx.translate(-meta.x - doc.w / 2, -meta.y - doc.h / 2);
    ctx.drawImage(alpha, 0, 0);
    ctx.restore();
    surface.mask = mask;
    patchLayer(meta.id, {
      hasMask: true,
      maskEnabled: true,
      maskDensity: 100,
      maskFeather: 0,
      maskLinked: true,
    });
    setEditing('mask');
    snapshot('Selection to mask');
    render();
    setStatus('Selection converted to a feathered layer mask');
  };
  const invertMask = () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (!meta || isLocked(meta.id) || !surface?.mask) return;
    const ctx = surface.mask.getContext('2d')!,
      data = ctx.getImageData(0, 0, doc.w, doc.h);
    for (let i = 0; i < data.data.length; i += 4) {
      data.data[i] = 255 - data.data[i];
      data.data[i + 1] = 255 - data.data[i + 1];
      data.data[i + 2] = 255 - data.data[i + 2];
    }
    ctx.putImageData(data, 0, 0);
    snapshot('Invert mask');
    render();
  };
  const applyMask = () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (!meta || isLocked(meta.id) || !surface?.mask) return;
    const ctx = surface.pixels.getContext('2d')!,
      alpha = maskToAlpha(surface.mask, meta.maskDensity, meta.maskFeather);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(alpha, 0, 0);
    ctx.restore();
    alpha.width = alpha.height = 1;
    delete surface.mask;
    patchLayer(meta.id, {
      hasMask: false,
      maskEnabled: true,
      maskDensity: 100,
      maskFeather: 0,
      maskLinked: true,
    });
    setEditing('pixels');
    snapshot('Apply layer mask');
    render();
    setStatus('Layer mask applied permanently — Undo remains available');
  };
  const layerBounds = (meta: LayerMeta) => {
    const surface = surfacesRef.current.get(meta.id);
    if (!surface || meta.kind === 'group' || meta.kind === 'adjustment')
      return null;
    const pixels = surface.pixels.getContext('2d', {
        willReadFrequently: true,
      })!,
      mask =
        meta.hasMask && meta.maskEnabled && surface.mask
          ? surface.mask.getContext('2d', { willReadFrequently: true })
          : null,
      density = (meta.maskDensity ?? 100) / 100;
    let left = doc.w,
      top = doc.h,
      right = -1,
      bottom = -1;
    for (let y = 0; y < doc.h; y += 256)
      for (let x = 0; x < doc.w; x += 256) {
        const w = Math.min(256, doc.w - x),
          h = Math.min(256, doc.h - y),
          p = pixels.getImageData(x, y, w, h).data,
          m = mask?.getImageData(x, y, w, h).data;
        for (let i = 0; i < p.length; i += 4) {
          if (!p[i + 3]) continue;
          if (m) {
            const gray = (m[i] + m[i + 1] + m[i + 2]) / 3,
              effective = 255 - (255 - gray) * density;
            if (effective < 1) continue;
          }
          const px = x + ((i / 4) % w),
            py = y + Math.floor(i / 4 / w);
          left = Math.min(left, px);
          right = Math.max(right, px + 1);
          top = Math.min(top, py);
          bottom = Math.max(bottom, py + 1);
        }
      }
    if (right < left) return null;
    const cx = doc.w / 2,
      cy = doc.h / 2,
      angle = ((meta.rotation ?? 0) * Math.PI) / 180,
      sx = meta.scaleX ?? 1,
      sy = meta.scaleY ?? 1,
      cos = Math.cos(angle),
      sin = Math.sin(angle),
      points = [
        [left, top],
        [right, top],
        [right, bottom],
        [left, bottom],
      ].map(([x, y]) => {
        const dx = (x - cx) * sx,
          dy = (y - cy) * sy;
        return {
          x: meta.x + cx + dx * cos - dy * sin,
          y: meta.y + cy + dx * sin + dy * cos,
        };
      });
    return {
      left: Math.min(...points.map((p) => p.x)),
      right: Math.max(...points.map((p) => p.x)),
      top: Math.min(...points.map((p) => p.y)),
      bottom: Math.max(...points.map((p) => p.y)),
    };
  };
  const alignSelected = (
    mode: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom',
  ) => {
    const items = selectedRoots().filter(
        (l) => l.kind !== 'group' && l.kind !== 'adjustment',
      ),
      anchor = items.find((l) => l.id === selectedRef.current) ?? items[0];
    if (items.length < 2 || !anchor || !permit(items.map((l) => l.id))) {
      setStatus('Select at least two unlocked pixel layers to align.');
      return;
    }
    const base = layerBounds(anchor);
    if (!base) {
      setStatus('The active layer has no visible pixels to align.');
      return;
    }
    const value =
      mode === 'left'
        ? base.left
        : mode === 'right'
          ? base.right
          : mode === 'top'
            ? base.top
            : mode === 'bottom'
              ? base.bottom
              : mode === 'hcenter'
                ? (base.left + base.right) / 2
                : (base.top + base.bottom) / 2;
    const key =
      mode === 'left' || mode === 'right' || mode === 'hcenter' ? 'x' : 'y';
    syncLayers(
      layersRef.current.map((layer) => {
        const b = items.some((x) => x.id === layer.id)
          ? layerBounds(layer)
          : null;
        if (!b || layer.id === anchor.id) return layer;
        const current =
          mode === 'left'
            ? b.left
            : mode === 'right'
              ? b.right
              : mode === 'top'
                ? b.top
                : mode === 'bottom'
                  ? b.bottom
                  : mode === 'hcenter'
                    ? (b.left + b.right) / 2
                    : (b.top + b.bottom) / 2;
        return { ...layer, [key]: layer[key] + value - current };
      }),
    );
    snapshot('Align layers');
    render();
    setStatus('Selected layers aligned to the active layer');
  };
  const distributeSelected = (axis: 'horizontal' | 'vertical') => {
    const items = selectedRoots()
      .filter((l) => l.kind !== 'group' && l.kind !== 'adjustment')
      .map((layer) => ({ layer, b: layerBounds(layer) }))
      .filter((x) => x.b) as {
      layer: LayerMeta;
      b: NonNullable<ReturnType<typeof layerBounds>>;
    }[];
    if (items.length < 3 || !permit(items.map((x) => x.layer.id))) {
      setStatus('Select at least three unlocked pixel layers to distribute.');
      return;
    }
    items.sort((a, b) =>
      axis === 'horizontal'
        ? a.b.left + a.b.right - (b.b.left + b.b.right)
        : a.b.top + a.b.bottom - (b.b.top + b.b.bottom),
    );
    const center = (x: (typeof items)[number]) =>
        axis === 'horizontal'
          ? (x.b.left + x.b.right) / 2
          : (x.b.top + x.b.bottom) / 2,
      start = center(items[0]),
      step = (center(items.at(-1)!) - start) / (items.length - 1),
      moves = new Map(
        items.map((x, i) => [x.layer.id, start + i * step - center(x)]),
      ),
      key = axis === 'horizontal' ? 'x' : 'y';
    syncLayers(
      layersRef.current.map((layer) =>
        moves.has(layer.id)
          ? { ...layer, [key]: layer[key] + moves.get(layer.id)! }
          : layer,
      ),
    );
    snapshot('Distribute layers');
    render();
    setStatus('Selected layer centers distributed evenly');
  };
  const autoAlign = () => {
    const items = selectedRoots().filter(
        (l) => l.kind !== 'group' && l.kind !== 'adjustment',
      ),
      anchor = items.find((l) => l.id === selectedRef.current) ?? items[0];
    if (items.length < 2 || !anchor || !permit(items.map((l) => l.id))) {
      setStatus('Select at least two unlocked pixel layers to auto-align.');
      return;
    }
    const base = layerBounds(anchor);
    if (!base) return;
    syncLayers(
      layersRef.current.map((layer) => {
        if (layer.id === anchor.id || !items.some((x) => x.id === layer.id))
          return layer;
        const b = layerBounds(layer);
        return b
          ? {
              ...layer,
              x: layer.x + (base.left + base.right - b.left - b.right) / 2,
              y: layer.y + (base.top + base.bottom - b.top - b.bottom) / 2,
            }
          : layer;
      }),
    );
    snapshot('Auto-align layers');
    render();
    setStatus('Opaque content centers aligned by translation');
  };
  const captureCompStates = (): LayerComp['states'] =>
    layersRef.current.map(
      ({
        id,
        visible,
        x,
        y,
        opacity,
        fill,
        blend,
        rotation,
        scaleX,
        scaleY,
        brightness,
        contrast,
        saturation,
        blur,
      }) => ({
        id,
        visible,
        x,
        y,
        opacity,
        fill,
        blend,
        rotation,
        scaleX,
        scaleY,
        brightness,
        contrast,
        saturation,
        blur,
      }),
    );
  const saveLayerComp = () => {
    const name = `Layer Comp ${layerCompsRef.current.length + 1}`,
      comp: LayerComp = {
        id: crypto.randomUUID(),
        name,
        states: captureCompStates(),
      };
    layerCompsRef.current = [...layerCompsRef.current, comp];
    setLayerComps(layerCompsRef.current);
    setSaved(false);
    setStatus(`${name} saved`);
  };
  const applyLayerComp = (comp: LayerComp) => {
    const states = new Map(comp.states.map((s) => [s.id, s])),
      affected = layersRef.current.filter((l) => states.has(l.id));
    if (!permit(affected.map((l) => l.id))) return;
    syncLayers(
      layersRef.current.map((l) => {
        const state = states.get(l.id);
        return state ? { ...l, ...state, blend: state.blend ?? l.blend } : l;
      }),
    );
    snapshot('Apply layer comp');
    render();
    setStatus(`Applied ${comp.name}`);
  };
  const updateLayerComp = (id: string) => {
    layerCompsRef.current = layerCompsRef.current.map((c) =>
      c.id === id ? { ...c, states: captureCompStates() } : c,
    );
    setLayerComps(layerCompsRef.current);
    setSaved(false);
    setStatus('Layer comp updated');
  };
  const renameLayerComp = (id: string) => {
    const comp = layerCompsRef.current.find((c) => c.id === id);
    if (!comp) return;
    const name = window.prompt('Layer comp name', comp.name)?.trim();
    if (!name) return;
    const comment = window.prompt('Comment', comp.comment ?? '')?.trim();
    layerCompsRef.current = layerCompsRef.current.map((c) =>
      c.id === id ? { ...c, name, comment } : c,
    );
    setLayerComps(layerCompsRef.current);
    setSaved(false);
  };
  const removeLayerComp = (id: string) => {
    layerCompsRef.current = layerCompsRef.current.filter((c) => c.id !== id);
    setLayerComps(layerCompsRef.current);
    setSaved(false);
  };
  const renameLayer = () => {
    const meta = selected();
    if (!meta) return;
    const name = window.prompt('Layer name', meta.name)?.trim();
    if (name) patchLayer(meta.id, { name }, 'Rename layer');
  };
  const ungroup = () => {
    const meta = selected();
    if (!meta) return;
    const group =
      meta.kind === 'group'
        ? meta
        : layersRef.current.find((x) => x.id === meta.parentId);
    if (!group) {
      setStatus('Select a group or a layer inside a group');
      return;
    }
    if (!permit(descendants(layersRef.current, group.id).map((l) => l.id)))
      return;
    const children = layersRef.current.filter((l) => l.parentId === group.id);
    if (!children.length) {
      removeLayer();
      return;
    }
    const next = layersRef.current
      .filter((l) => l.id !== group.id)
      .map((l) =>
        l.parentId === group.id
          ? {
              ...l,
              parentId: group.parentId,
              visible: l.visible && group.visible,
            }
          : l,
      );
    surfacesRef.current.delete(group.id);
    syncLayers(next);
    select(children[0].id);
    snapshot('Ungroup layers');
    render();
  };
  const moveIntoGroup = (parentId?: string) => {
    const meta = selected();
    if (!meta) return;
    const subtree = descendants(layersRef.current, meta.id),
      ids = new Set(subtree.map((l) => l.id));
    if (parentId && ids.has(parentId)) {
      setStatus('A group cannot contain itself or its parent.');
      return;
    }
    if (!permit([...ids, ...(parentId ? [parentId] : [])])) return;
    if (
      parentId &&
      ancestors(layersRef.current, parentId).length +
        Math.max(
          ...subtree.map(
            (l) =>
              ancestors(layersRef.current, l.id).length -
              ancestors(layersRef.current, meta.id).length,
          ),
        ) +
        1 >
        20
    ) {
      setStatus('Groups support up to 20 levels.');
      return;
    }
    const next = layersRef.current.filter((l) => !ids.has(l.id)),
      index = parentId ? next.findIndex((l) => l.id === parentId) + 1 : 0;
    next.splice(
      index,
      0,
      ...subtree.map((l) => (l.id === meta.id ? { ...l, parentId } : l)),
    );
    if (parentId) {
      const parent = next.find((l) => l.id === parentId);
      if (parent) parent.collapsed = false;
    }
    syncLayers(next);
    snapshot('Move into group');
    render();
  };

  const linkSelected = () => {
    const selected = selectedRoots();
    if (
      selected.length < 2 ||
      selected.some((l) => l.kind === 'group' || l.kind === 'adjustment')
    ) {
      setStatus('Select at least two pixel layers to link their movement.');
      return;
    }
    const existing = new Set(selected.map((l) => l.linkId).filter(Boolean)),
      ids = new Set([
        ...selected.map((l) => l.id),
        ...layersRef.current
          .filter((l) => l.linkId && existing.has(l.linkId))
          .map((l) => l.id),
      ]);
    if (!permit([...ids])) return;
    const linkId = crypto.randomUUID();
    syncLayers(
      layersRef.current.map((l) => (ids.has(l.id) ? { ...l, linkId } : l)),
    );
    snapshot('Link selected layers');
    setStatus('Linked layers move together with the Move tool');
  };
  const unlinkSelected = () => {
    const ids = new Set(selectedIdsRef.current);
    if (!permit([...ids])) return;
    syncLayers(
      layersRef.current.map((l) =>
        ids.has(l.id) ? { ...l, linkId: undefined } : l,
      ),
    );
    snapshot('Unlink selected layers');
  };
  const toggleClipping = () => {
    const layer = selected();
    if (
      !layer ||
      !permit([layer.id]) ||
      layer.kind === 'group' ||
      layer.kind === 'adjustment'
    )
      return;
    const siblings = layersRef.current.filter(
        (l) => l.parentId === layer.parentId,
      ),
      base = siblings
        .slice(siblings.findIndex((l) => l.id === layer.id) + 1)
        .find((l) => !l.clipping);
    if (
      !layer.clipping &&
      (!base || base.kind === 'group' || base.kind === 'adjustment')
    ) {
      setStatus(
        'Place a pixel layer below this layer in the same group to use as the clipping base.',
      );
      return;
    }
    patchLayer(
      layer.id,
      { clipping: !layer.clipping },
      layer.clipping ? 'Release clipping mask' : 'Create clipping mask',
    );
  };
  const dropLayers = (
    ids: string[],
    targetId: string,
    edge: 'before' | 'after' | 'inside',
  ) => {
    const roots = selectedRoots(ids),
      source = selectedTree(ids),
      target = layersRef.current.find((l) => l.id === targetId),
      moved = new Set(source.map((l) => l.id));
    if (!roots.length || !target || moved.has(targetId)) return;
    const parentId =
      edge === 'inside' && target.kind === 'group'
        ? target.id
        : target.parentId;
    if (parentId && moved.has(parentId)) return;
    if (!permit([...moved, ...(parentId ? [parentId] : [])])) return;
    const depth = parentId
      ? ancestors(layersRef.current, parentId).length + 1
      : 0;
    for (const root of roots) {
      const height = Math.max(
        ...descendants(layersRef.current, root.id).map(
          (l) =>
            ancestors(layersRef.current, l.id).length -
            ancestors(layersRef.current, root.id).length,
        ),
      );
      if (depth + height > 20) {
        setStatus('Groups support up to 20 levels.');
        return;
      }
    }
    const next = layersRef.current.filter((l) => !moved.has(l.id)),
      targetIndex = next.findIndex((l) => l.id === target.id),
      index =
        edge === 'inside' && target.kind === 'group'
          ? targetIndex + 1
          : edge === 'before'
            ? targetIndex
            : targetIndex + descendants(next, target.id).length,
      rootIds = new Set(roots.map((l) => l.id));
    next.splice(
      index,
      0,
      ...source.map((l) => (rootIds.has(l.id) ? { ...l, parentId } : l)),
    );
    if (parentId) {
      const p = next.find((l) => l.id === parentId);
      if (p) p.collapsed = false;
    }
    syncLayers(next);
    selectMany(roots.map((l) => l.id));
    snapshot('Drag reorder layers');
    render();
  };

  const openRaw = async (file: File) => {
    if (psdBusyRef.current) return;
    psdBusyRef.current = true;
    setPsdBusy(true);
    setStatus('Developing the camera sensor data…');
    try {
      checkFileSize(file.size);
      const image = await decodeCameraRaw(file);
      requireRoom(image.width, image.height, image.width * image.height);
      setRawSettings({ ...defaultRawDevelopSettings });
      setRawDevelop({
        name: file.name,
        image,
        sourceFile: file,
      });
      setStatus(
        `RAW sensor data ready — ${image.width} × ${image.height} · ${image.bitDepth}-bit${image.camera ? ` · ${image.camera}` : ''}`,
      );
    } catch (error) {
      setPsdError(
        `${error instanceof Error ? error.message : 'RAW sensor data could not be decoded.'} The original camera file was not changed.`,
      );
    } finally {
      psdBusyRef.current = false;
      setPsdBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const applyRawDevelop = async () => {
    if (!rawDevelop) return;
    psdBusyRef.current = true;
    setPsdBusy(true);
    setStatus('Rendering the full-resolution RAW development…');
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const developed = developRawRgba(rawDevelop.image, rawSettings);
      const developedCanvas = makeCanvas(developed.width, developed.height);
      developedCanvas
        .getContext('2d')!
        .putImageData(
          new ImageData(developed.data, developed.width, developed.height),
          0,
          0,
        );
      const target = rawDevelop.targetLayerId
        ? layersRef.current.find(
            (layer) => layer.id === rawDevelop.targetLayerId,
          )
        : undefined;
      const id = target?.id ?? crypto.randomUUID();
      const assetId = rawDevelop.assetId ?? crypto.randomUUID();
      let storedLocally = false;
      if (rawDevelop.sourceFile) {
        try {
          await saveRawAsset(assetId, rawDevelop.sourceFile);
          storedLocally = true;
        } catch {
          storedLocally = false;
        }
      } else {
        try {
          storedLocally = Boolean(await loadRawAsset(assetId));
        } catch {
          storedLocally = false;
        }
      }
      rawMasterCache.current.clear();
      rawMasterCache.current.set(assetId, rawDevelop.image);
      const pixels = target ? makeCanvas(doc.w, doc.h) : developedCanvas;
      if (target) {
        pixels
          .getContext('2d')!
          .drawImage(developedCanvas, 0, 0, pixels.width, pixels.height);
        developedCanvas.width = developedCanvas.height = 1;
      }
      const smartObject: SmartObjectData = {
        kind: 'embedded',
        sourceName: rawDevelop.name,
        sourceData: pixels.toDataURL('image/png'),
        filters: target?.smartObject?.filters ?? [],
        filterMask: target?.smartObject?.filterMask ?? false,
        raw: {
          assetId,
          width: rawDevelop.image.width,
          height: rawDevelop.image.height,
          bitDepth: rawDevelop.image.bitDepth,
          camera: rawDevelop.image.camera,
          lens: rawDevelop.image.lens,
          settings: { ...rawSettings },
        },
      };
      if (target) {
        const surface = surfacesRef.current.get(target.id);
        if (!surface) throw Error('The RAW Smart Object pixels are missing.');
        surface.pixels = pixels;
        patchLayer(
          target.id,
          { smartObject },
          'Update Camera Raw Smart Object',
        );
        render();
        setRawDevelop(null);
        setStatus(
          storedLocally
            ? 'Camera Raw Smart Object updated non-destructively'
            : 'Camera Raw Smart Object updated; keep the original RAW file available for future edits',
        );
        return;
      }
      loadImportedDocument(
        `${rawDevelop.name} — developed`,
        pixels.width,
        pixels.height,
        [
          {
            id,
            name: 'RAW developed sensor image',
            visible: true,
            opacity: 100,
            blend: 'source-over',
            x: 0,
            y: 0,
            hasMask: false,
            maskEnabled: true,
            kind: 'pixel',
            smartObject,
          },
        ],
        new Map([[id, { pixels }]]),
        'Open Camera Raw',
      );
      setRawDevelop(null);
      setStatus(
        storedLocally
          ? 'RAW opened as a re-editable 16-bit Camera Raw Smart Object'
          : 'RAW opened as a Smart Object; keep the original RAW file available for future edits',
      );
    } catch (error) {
      setPsdError(
        error instanceof Error
          ? error.message
          : 'The full-resolution RAW could not be rendered.',
      );
    } finally {
      psdBusyRef.current = false;
      setPsdBusy(false);
    }
  };

  const openImage = (file?: File) => {
    if (!file) return;
    if (
      /\.(pdf|tiff?)$/i.test(file.name) ||
      ['application/pdf', 'image/tiff'].includes(file.type)
    ) {
      setPagedFile(file);
      return;
    }
    if (/\.(librelayer|pixelstudio)$/i.test(file.name)) {
      void openProject(file);
      return;
    }
    if (/\.(psd|psb)$/i.test(file.name)) {
      void openPsd(file);
      return;
    }
    if (/\.(cr2|cr3|nef|arw|dng|raf|orf|rw2)$/i.test(file.name)) {
      void openRaw(file);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setStatus(
        'Unsupported image format. Open PNG, JPEG, WebP, PSD, PSB or a LibreLayer project.',
      );
      return;
    }
    if (psdBusyRef.current) return;
    psdBusyRef.current = true;
    setPsdBusy(true);
    void (async () => {
      let url = '';
      try {
        const size = await preflightImage(file);
        if (size) requireRoom(size.w, size.h, size.w * size.h);
        const image = new Image();
        url = URL.createObjectURL(file);
        image.src = url;
        await image.decode();
        const w = image.naturalWidth,
          h = image.naturalHeight;
        requireRoom(w, h, w * h);
        const id = crypto.randomUUID(),
          pixels = makeCanvas(w, h);
        pixels.getContext('2d')!.drawImage(image, 0, 0);
        loadImportedDocument(
          file.name,
          w,
          h,
          [
            {
              id,
              name: file.name,
              visible: true,
              opacity: 100,
              blend: 'source-over',
              x: 0,
              y: 0,
              hasMask: false,
              maskEnabled: true,
              kind: 'pixel',
            },
          ],
          new Map([[id, { pixels }]]),
          'Open image',
        );
        setStatus('Opened at full resolution — ' + w + ' × ' + h + ' pixels');
      } catch (e) {
        setPsdError(
          e instanceof Error ? e.message : 'This image could not be decoded.',
        );
      } finally {
        if (url) URL.revokeObjectURL(url);
        psdBusyRef.current = false;
        setPsdBusy(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    })();
  };
  const openWithPicker = async () => {
    const picker = (
      window as unknown as {
        showOpenFilePicker?: (options: {
          multiple: boolean;
          types: { description: string; accept: Record<string, string[]> }[];
        }) => Promise<LocalFileHandle[]>;
      }
    ).showOpenFilePicker;
    if (!picker) {
      fileRef.current?.click();
      return;
    }
    try {
      const handles = await picker.call(window, {
        multiple: false,
        types: [
          {
            description: 'LibreLayer and image files',
            accept: {
              'application/octet-stream': [
                '.librelayer',
                '.pixelstudio',
                '.psd',
                '.psb',
                '.cr2',
                '.cr3',
                '.nef',
                '.arw',
                '.dng',
                '.raf',
                '.orf',
                '.rw2',
              ],
              'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff'],
              'application/pdf': ['.pdf'],
            },
          },
        ],
      });
      const handle = handles[0];
      if (!handle) return;
      await rememberRecentFile(handle);
      setRecent(await recentFiles());
      openImage(await handle.getFile());
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setRecoveryStatus('The selected file could not be opened');
    }
  };
  const openRecentFile = async (record: RecentFileRecord) => {
    try {
      let permission = await record.handle.queryPermission?.({ mode: 'read' });
      if (permission !== 'granted')
        permission = await record.handle.requestPermission?.({ mode: 'read' });
      if (permission !== undefined && permission !== 'granted') {
        setRecoveryStatus(`Permission is needed to reopen ${record.name}`);
        return;
      }
      openImage(await record.handle.getFile());
      await rememberRecentFile(record.handle);
      setRecent(await recentFiles());
    } catch {
      setRecoveryStatus(
        `${record.name} is unavailable. Reconnect its drive or open it again.`,
      );
    }
  };
  const installWebApp = async () => {
    if (!installPrompt) {
      setRecoveryStatus(
        'Use your browser menu to install LibreLayer or add it to the desktop',
      );
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted')
      setRecoveryStatus(
        'LibreLayer installed — the web version stays available',
      );
    setInstallPrompt(null);
  };
  useEffect(() => {
    const launchQueue = (
      window as unknown as {
        launchQueue?: {
          setConsumer: (
            consumer: (params: { files: LocalFileHandle[] }) => void,
          ) => void;
        };
      }
    ).launchQueue;
    launchQueue?.setConsumer(({ files }) => {
      const handle = files[0];
      if (!handle) return;
      void (async () => {
        await rememberRecentFile(handle);
        setRecent(await recentFiles());
        openImage(await handle.getFile());
      })();
    });
  }, []);
  const aiRemoveBackground = async () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (
      !meta ||
      !surface ||
      isLocked(meta.id) ||
      meta.kind === 'group' ||
      meta.kind === 'adjustment' ||
      aiBusy
    )
      return;
    const aiDocument = activeDocumentRef.current;
    if (doc.w * doc.h > 16000000) {
      setPsdError(
        'AI removal is limited to 16 megapixels. The full-resolution document was not changed.',
      );
      return;
    }
    if (!surface.mask && !hasRoom(doc.w * doc.h)) return;
    setAiBusy(true);
    setStatus('Loading free background-removal model…');
    try {
      const hf = await import('@huggingface/transformers');
      const remover = await hf.pipeline(
        'background-removal',
        'onnx-community/BEN2-ONNX',
      );
      setStatus('AI is isolating the subject…');
      const output = (await remover(
        surface.pixels.toDataURL('image/png'),
      )) as unknown as { data: Uint8Array; width: number; height: number };
      if (!output?.data) throw new Error('No image returned');
      if (
        activeDocumentRef.current !== aiDocument ||
        surfacesRef.current.get(meta.id) !== surface ||
        isLocked(meta.id)
      )
        throw Error('Document changed during AI processing');
      const result = rawImageCanvas(output);
      const mask = makeCanvas(doc.w, doc.h),
        mc = mask.getContext('2d')!,
        scaled = makeCanvas(doc.w, doc.h),
        sc = scaled.getContext('2d')!;
      sc.drawImage(result, 0, 0, doc.w, doc.h);
      const data = sc.getImageData(0, 0, doc.w, doc.h);
      for (let i = 0; i < data.data.length; i += 4) {
        const a = data.data[i + 3];
        data.data[i] = data.data[i + 1] = data.data[i + 2] = a;
        data.data[i + 3] = 255;
      }
      mc.putImageData(data, 0, 0);
      surface.mask = mask;
      patchLayer(meta.id, { hasMask: true, maskEnabled: true });
      setEditing('mask');
      snapshot('AI remove background');
      render();
      setStatus('Background removed — refine the mask with B/E');
    } catch {
      setStatus(
        'AI model could not load. Try Auto Enhance or check the connection.',
      );
    } finally {
      setAiBusy(false);
    }
  };
  const aiSelectSubject = async () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (
      !meta ||
      !surface ||
      meta.kind === 'group' ||
      meta.kind === 'adjustment' ||
      aiBusy
    )
      return;
    if (doc.w * doc.h > 16000000) {
      setStatus(
        'AI Select Subject supports documents up to 16 megapixels; Object Selection remains available.',
      );
      return;
    }
    setAiBusy(true);
    setStatus('Loading the free on-device subject model…');
    try {
      const hf = await import('@huggingface/transformers'),
        selector = await hf.pipeline(
          'background-removal',
          'onnx-community/BEN2-ONNX',
        ),
        output = (await selector(
          surface.pixels.toDataURL('image/png'),
        )) as unknown as { data: Uint8Array; width: number; height: number };
      if (!output?.data) throw Error('No subject mask');
      const result = rawImageCanvas(output);
      const local = makeCanvas(doc.w, doc.h),
        lc = local.getContext('2d')!;
      lc.drawImage(result, 0, 0, doc.w, doc.h);
      const image = lc.getImageData(0, 0, doc.w, doc.h);
      for (let i = 0; i < image.data.length; i += 4) {
        const a = image.data[i + 3];
        image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
        image.data[i + 3] = a;
      }
      lc.putImageData(image, 0, 0);
      const placed = makeCanvas(doc.w, doc.h),
        ctx = placed.getContext('2d')!;
      ctx.translate(meta.x + doc.w / 2, meta.y + doc.h / 2);
      ctx.rotate(((meta.rotation ?? 0) * Math.PI) / 180);
      ctx.scale(meta.scaleX ?? 1, meta.scaleY ?? 1);
      ctx.drawImage(local, -doc.w / 2, -doc.h / 2);
      result.width = result.height = local.width = local.height = 1;
      commitSelectionMask(placed, 'AI subject selected');
      render();
    } catch {
      selectOpaqueObject();
      setStatus(
        'AI model was unavailable — selected the visible object instead',
      );
    } finally {
      setAiBusy(false);
    }
  };

  const beginTransform = (
    action: 'scale' | 'rotate',
    e: React.PointerEvent,
  ) => {
    const items = transformLayers();
    if (!items.length || !permit(items.map((l) => l.id))) return;
    e.preventDefault();
    e.stopPropagation();
    transformDrag.current = {
      action,
      x: e.clientX,
      y: e.clientY,
      states: new Map(
        items.map((l) => [
          l.id,
          {
            scaleX: l.scaleX ?? 1,
            scaleY: l.scaleY ?? 1,
            rotation: l.rotation ?? 0,
          },
        ]),
      ),
    };
  };
  const startFreeTransform = () => {
    const items = transformLayers();
    if (!items.length || !permit(items.map((layer) => layer.id))) return;
    setTransformSession(items.map((layer) => ({ ...layer })));
    setTool('move');
    setStatus('Free Transform — drag handles, then Apply or Cancel');
  };
  const cancelFreeTransform = () => {
    if (!transformSession) return;
    const originals = new Map(
      transformSession.map((layer) => [layer.id, layer]),
    );
    syncLayers(
      layersRef.current.map((layer) => originals.get(layer.id) ?? layer),
    );
    setTransformSession(null);
    render();
    setStatus('Free Transform cancelled');
  };
  const applyFreeTransform = () => {
    if (!transformSession) return;
    setTransformSession(null);
    snapshot('Free transform');
    render();
    setStatus('Free Transform applied');
  };
  useEffect(() => {
    const moveTransform = (e: PointerEvent) => {
      const drag = transformDrag.current;
      if (!drag) return;
      const factor = Math.max(
          0.1,
          1 + (e.clientX - drag.x + e.clientY - drag.y) / 300,
        ),
        rotationDelta = Math.round((e.clientX - drag.x) * 0.6);
      syncLayers(
        layersRef.current.map((layer) => {
          const start = drag.states.get(layer.id);
          if (!start) return layer;
          return drag.action === 'scale'
            ? {
                ...layer,
                scaleX:
                  Math.sign(start.scaleX) * Math.abs(start.scaleX) * factor,
                scaleY:
                  Math.sign(start.scaleY) * Math.abs(start.scaleY) * factor,
              }
            : { ...layer, rotation: start.rotation + rotationDelta };
        }),
      );
      render();
    };
    const endTransform = () => {
      if (!transformDrag.current) return;
      if (!transformSession)
        snapshot(
          transformDrag.current.action === 'scale'
            ? 'Free transform'
            : 'Rotate layers',
        );
      transformDrag.current = null;
      setStatus('Transform applied to selected and linked layers');
    };
    window.addEventListener('pointermove', moveTransform);
    window.addEventListener('pointerup', endTransform);
    return () => {
      window.removeEventListener('pointermove', moveTransform);
      window.removeEventListener('pointerup', endTransform);
    };
  }, [render, snapshot, transformSession]);

  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options?: { signal?: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const life = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'configure_editor_tool',
          title: 'Configure editor tool',
          description:
            'Select a visible LibreLayer tool and optionally configure brush size, opacity, and color.',
          inputSchema: {
            type: 'object',
            properties: {
              tool: {
                type: 'string',
                enum: [
                  'hand',
                  'rotateView',
                  'move',
                  'marquee',
                  'lasso',
                  'smart',
                  'crop',
                  'eyedropper',
                  'brush',
                  'clone',
                  'retouch',
                  'eraser',
                  'fill',
                  'gradient',
                  'text',
                  'shape',
                  'path',
                  'zoom',
                ],
              },
              size: { type: 'number', minimum: 1, maximum: 300 },
              opacity: { type: 'number', minimum: 1, maximum: 100 },
              color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
            },
            required: ['tool'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input: unknown) {
            const value = input as {
              tool: Tool;
              size?: number;
              opacity?: number;
              color?: string;
            };
            if (!toolItems.some((x) => x.id === value.tool))
              throw new Error('Unknown tool.');
            if (
              value.size !== undefined &&
              (!Number.isFinite(value.size) ||
                value.size < 1 ||
                value.size > 300)
            )
              throw new Error('Size must be between 1 and 300.');
            if (
              value.opacity !== undefined &&
              (!Number.isFinite(value.opacity) ||
                value.opacity < 1 ||
                value.opacity > 100)
            )
              throw new Error('Opacity must be between 1 and 100.');
            if (
              value.color !== undefined &&
              !/^#[0-9a-fA-F]{6}$/.test(value.color)
            )
              throw new Error('Color must be a six-digit hex value.');
            setTool(value.tool);
            if (value.size !== undefined) setSize(Math.round(value.size));
            if (value.opacity !== undefined)
              setOpacity(Math.round(value.opacity));
            if (value.color !== undefined) setColor(value.color);
            return {
              tool: value.tool,
              size: value.size,
              opacity: value.opacity,
              color: value.color,
            };
          },
        },
        { signal: life.signal },
      ),
    ).catch(() => undefined);
    return () => life.abort();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest?.('[role=dialog]') ||
        pagedFile ||
        settingsOpen ||
        exportSource ||
        recoveries ||
        psdBusy ||
        psdPending ||
        psdError ||
        newDocumentOpen ||
        adjustmentsOpen ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (e.target as HTMLElement)?.tagName,
        ) ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      if (k === 'tab' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        togglePanels();
        return;
      }
      if (transformSession && k === 'escape') {
        e.preventDefault();
        cancelFreeTransform();
        return;
      }
      if (transformSession && k === 'enter') {
        e.preventDefault();
        applyFreeTransform();
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        const key = commandKey(e);
        const command = [...menuCommands.current.values()].find(
          (c) => (preferences.commands?.[c.name] ?? c.shortcut) === key,
        );
        if (command) {
          e.preventDefault();
          command.action();
        }
        return;
      }
      if (k === '[') setSize((v) => Math.max(1, v - 4));
      if (k === ']') setSize((v) => Math.min(300, v + 4));
      if (k === 'q') {
        e.preventDefault();
        toggleQuickMask();
        return;
      }
      if (
        k === 'enter' &&
        (tool === 'path' || (tool === 'lasso' && lassoMode === 'polygonal'))
      ) {
        finishPolygon(tool);
        return;
      }
      if (k === 'escape') {
        polygonDraft.current = [];
        setDraftPoints([]);
        clearSelection();
      }
      if (
        ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k) &&
        tool === 'move'
      ) {
        e.preventDefault();
        const amount = e.shiftKey ? 10 : 1;
        nudgeLayers(
          k === 'arrowleft' ? -amount : k === 'arrowright' ? amount : 0,
          k === 'arrowup' ? -amount : k === 'arrowdown' ? amount : 0,
        );
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const found = toolItems.find(
        (x) => (preferences.shortcuts[x.id] ?? x.key.toLowerCase()) === k,
      );
      if (found) setTool(found.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const showExport = () => {
    const canvas = makeCanvas(doc.w, doc.h);
    renderLayers(canvas.getContext('2d')!);
    setExportSource(canvas);
    setExportRawSource(null);
    const raw = selected()?.smartObject?.raw;
    const generation = ++exportRawGeneration.current;
    if (!raw) {
      setExportRawLoading(false);
      return;
    }
    setExportRawLoading(true);
    void resolveRawMaster(raw)
      .then(({ image }) => {
        if (generation !== exportRawGeneration.current) return;
        setExportRawSource({ image, settings: { ...raw.settings } });
        setStatus('16-bit RAW master ready in Export');
      })
      .catch((error) => {
        if (generation !== exportRawGeneration.current) return;
        setStatus(
          error instanceof Error
            ? error.message
            : 'The 16-bit RAW master is unavailable.',
        );
      })
      .finally(() => {
        if (generation === exportRawGeneration.current)
          setExportRawLoading(false);
      });
  };
  const showRecoveries = async () => {
    try {
      setRecoveries(await recoveryRecords());
    } catch {
      setRecoveryStatus('Recovery storage is unavailable in this browser');
    }
  };
  const showVersions = async () => {
    try {
      setVersions(await versionRecords(activeDocumentRef.current));
    } catch {
      setRecoveryStatus('Version history is unavailable in this browser');
    }
  };
  recoveryTick.current = (manual = false) => {
    if (
      (!preferences.autosave && !manual) ||
      !layersRef.current.length ||
      recoveryWriting.current ||
      psdBusy ||
      recoveries ||
      drawing.current
    )
      return;
    persistActiveDocument();
    const allDocuments = [...documentStoreRef.current.values()],
      fingerprints = new Map(
        allDocuments.map((d) => [
          d.id,
          [
            d.historyIndex,
            d.history.length,
            d.saved ? 1 : 0,
            d.layers.length,
            d.name,
            d.zoom,
            JSON.stringify(d.view ?? {}),
            d.selectedId,
          ].join(':'),
        ]),
      ),
      pending = allDocuments.filter(
        (d) =>
          recoveryFingerprints.current.get(d.id) !== fingerprints.get(d.id),
      );
    if (!allDocuments.length) return;
    if (!pending.length) {
      void saveWorkspaceState({
        documentIds: allDocuments.map((d) => d.id),
        activeId: activeDocumentRef.current,
      });
      return;
    }
    recoveryWriting.current = true;
    void (async () => {
      let count = 0;
      for (const d of pending) {
        const savedLayers = [];
        for (const layer of d.layers) {
          const surface = d.surfaces.get(layer.id)!;
          savedLayers.push({
            ...layer,
            pixels: await canvasPngDataUrl(surface.pixels),
            mask: surface.mask
              ? await canvasPngDataUrl(surface.mask)
              : undefined,
          });
        }
        const json = JSON.stringify({
          format: 'librelayer',
          version: 2,
          createdWith: 'LibreLayer web',
          name: d.name,
          saved: d.saved,
          width: d.doc.w,
          height: d.doc.h,
          selectedId: d.selectedId,
          selectedIds: d.selectedIds,
          layerComps: d.layerComps,
          zoom: d.zoom,
          view: d.view,
          layers: savedLayers,
          paths: d.paths ?? [],
          savedSelections: d.savedSelections ?? [],
          selection: d.selection,
          selectionPath: d.selectionPath ?? null,
          feather: d.feather ?? 0,
        });
        await saveRecovery({
          id: d.id,
          name: d.name,
          updated: Date.now(),
          json,
        });
        recoveryFingerprints.current.set(d.id, fingerprints.get(d.id)!);
        const now = Date.now(),
          previousVersion = lastVersionAt.current.get(d.id) ?? 0;
        if (manual || now - previousVersion >= 120000) {
          await saveVersion({
            id: `${d.id}:${now}`,
            documentId: d.id,
            name: d.name,
            updated: now,
            reason: manual ? 'manual' : 'autosave',
            json,
          });
          lastVersionAt.current.set(d.id, now);
        }
        count++;
      }
      await saveWorkspaceState({
        documentIds: allDocuments.map((d) => d.id),
        activeId: activeDocumentRef.current,
      });
      setRecoveryStatus(
        `${count} changed ${count === 1 ? 'document' : 'documents'} saved locally`,
      );
    })()
      .catch(() =>
        setRecoveryStatus(
          'Recovery could not be saved. Download layered projects.',
        ),
      )
      .finally(() => {
        recoveryWriting.current = false;
      });
  };

  const runProFeature = (feature: SuiteFeature, options: SuiteOptions) => {
    const download = (name: string, blob: Blob) => {
      const url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const openComposite = (suffix: string, source?: HTMLCanvasElement) => {
      const canvas = makeCanvas(doc.w, doc.h);
      if (source) canvas.getContext('2d')!.drawImage(source, 0, 0);
      else renderLayers(canvas.getContext('2d')!);
      const id = crypto.randomUUID();
      loadImportedDocument(
        `${fileName} — ${suffix}`,
        doc.w,
        doc.h,
        [
          {
            id,
            name: suffix,
            kind: 'pixel',
            visible: true,
            opacity: 100,
            blend: 'source-over',
            x: 0,
            y: 0,
            hasMask: false,
            maskEnabled: true,
          },
        ],
        new Map([[id, { pixels: canvas }]]),
        suffix,
      );
    };
    const shape = (command: string) => {
      const id = createLayer(feature.label, true);
      if (!id) return;
      const ctx = surfacesRef.current.get(id)!.pixels.getContext('2d')!,
        cx = doc.w / 2,
        cy = doc.h / 2,
        radius = Math.min(doc.w, doc.h) * 0.25;
      ctx.lineWidth = Math.max(1, options.amount / 8);
      ctx.strokeStyle = options.color;
      ctx.fillStyle = backgroundColor;
      ctx.beginPath();
      if (command === 'line') {
        ctx.moveTo(cx - radius, cy);
        ctx.lineTo(cx + radius, cy);
      } else if (command === 'custom-shape') {
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5,
            r = i % 2 ? radius * 0.45 : radius,
            x = cx + Math.cos(a) * r,
            y = cy + Math.sin(a) * r;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
      } else {
        ctx.rect(cx - radius, cy - radius * 0.65, radius * 2, radius * 1.3);
      }
      if (
        command !== 'line' &&
        (options.secondary >= 50 || command === 'frame')
      )
        ctx.fill();
      ctx.stroke();
      if (command === 'boolean-shapes') {
        ctx.globalCompositeOperation =
          options.secondary >= 50 ? 'destination-out' : 'source-over';
        ctx.beginPath();
        ctx.arc(cx + radius * 0.55, cy, radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }
      snapshot(feature.label);
      render();
    };
    if (feature.kind === 'shape') {
      if (feature.command === 'artboards') {
        openComposite(options.text.trim() || 'Artboard');
        setStatus('Artboard opened as a separate editable document tab');
        return;
      }
      if (
        feature.command === 'shape-style' ||
        feature.command === 'shape-properties'
      ) {
        setTool('shape');
        setShapeFill(options.secondary >= 50);
        setShapeRadius(Math.round(options.amount));
        setStatus(`${feature.label} ready in the contextual Shape controls`);
        return;
      }
      shape(feature.command);
      setStatus(`${feature.label} created on an editable layer`);
      return;
    }
    if (feature.kind === 'selection') {
      if (feature.command === 'copy-merged') {
        const full = makeCanvas(doc.w, doc.h);
        renderLayers(full.getContext('2d')!);
        const s = selectionRef.current,
          x = Math.round(s?.x ?? 0),
          y = Math.round(s?.y ?? 0),
          w = Math.max(1, Math.round(s?.w ?? doc.w)),
          h = Math.max(1, Math.round(s?.h ?? doc.h)),
          clip = makeCanvas(w, h);
        clip.getContext('2d')!.drawImage(full, -x, -y);
        clipboardRef.current = { pixels: clip, x, y };
        full.width = full.height = 1;
        setStatus('Visible composite copied');
        return;
      }
      if (
        feature.command === 'paste-place' ||
        feature.command === 'paste-into'
      ) {
        const clip = clipboardRef.current;
        if (!clip) {
          setStatus('Copy pixels first');
          return;
        }
        const id = createLayer(
          feature.command === 'paste-into'
            ? 'Pasted into selection'
            : 'Pasted in place',
          true,
        );
        if (!id) return;
        const surface = surfacesRef.current.get(id)!;
        surface.pixels.getContext('2d')!.drawImage(clip.pixels, clip.x, clip.y);
        if (feature.command === 'paste-into' && selectionRef.current) {
          const mask = selectionMask(doc.w, doc.h, 0, 0);
          surface.mask = mask;
          patchLayer(id, { hasMask: true, maskEnabled: true }, 'Paste Into');
        }
        snapshot(feature.label);
        render();
        setStatus(`${feature.label} complete`);
        return;
      }
      if (feature.command === 'transform-selection') {
        const s = selectionRef.current;
        if (!s) {
          setStatus('Make a selection first');
          return;
        }
        const scale = 0.5 + options.amount / 100,
          next = {
            x: s.x + (s.w * (1 - scale)) / 2,
            y: s.y + (s.h * (1 - scale)) / 2,
            w: s.w * scale,
            h: s.h * scale,
          },
          mask = makeCanvas(doc.w, doc.h);
        mask.getContext('2d')!.fillRect(next.x, next.y, next.w, next.h);
        commitSelectionMask(mask, 'Selection transformed', 'replace');
        snapshot('Transform Selection');
        return;
      }
      if (feature.command === 'load-transparency') {
        selectOpaqueObject();
        setStatus('Layer transparency loaded as the active selection');
        return;
      }
      if (feature.command === 'select-similar') {
        selectColorRange();
        return;
      }
      if (feature.command === 'mask-preview') {
        setChannelView('alpha');
        setStatus(
          'Mask-only canvas preview enabled; choose RGB composite to exit',
        );
        return;
      }
      if (feature.command === 'move-mask') {
        const meta = selected(),
          surface = meta && surfacesRef.current.get(meta.id);
        if (!meta || !surface?.mask) {
          setStatus('Select a layer with a raster mask first');
          return;
        }
        const moved = makeCanvas(doc.w, doc.h);
        moved
          .getContext('2d')!
          .drawImage(
            surface.mask,
            Math.round((options.amount - 50) * 2),
            Math.round((options.secondary - 50) * 2),
          );
        surface.mask = moved;
        patchLayer(meta.id, { maskLinked: false }, 'Move mask independently');
        render();
        setStatus('Mask moved independently from layer pixels');
        return;
      }
    }
    if (feature.kind === 'paint') {
      if (
        feature.command === 'background-eraser' ||
        feature.command === 'magic-eraser'
      ) {
        setTool('eraser');
        setFillTolerance(Math.round(options.amount * 2.55));
        setStatus(
          `${feature.label} ready — tolerance ${Math.round(options.amount * 2.55)}`,
        );
        return;
      }
      if (feature.command === 'gradient-types') {
        const id = createLayer('Advanced gradient', true);
        if (!id) return;
        const ctx = surfacesRef.current.get(id)!.pixels.getContext('2d')!,
          type =
            options.secondary < 25
              ? 'radial'
              : options.secondary < 50
                ? 'angular'
                : options.secondary < 75
                  ? 'reflected'
                  : 'diamond',
          gradient =
            type === 'radial'
              ? ctx.createRadialGradient(
                  doc.w / 2,
                  doc.h / 2,
                  0,
                  doc.w / 2,
                  doc.h / 2,
                  Math.max(doc.w, doc.h) / 2,
                )
              : ctx.createLinearGradient(
                  0,
                  0,
                  type === 'diamond' ? doc.w : doc.w / 2,
                  type === 'reflected' ? 0 : doc.h,
                );
        gradient.addColorStop(0, options.color);
        gradient.addColorStop(0.5, backgroundColor);
        gradient.addColorStop(1, options.color);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, doc.w, doc.h);
        snapshot('Advanced gradient');
        render();
        setStatus(`${type} gradient created`);
        return;
      }
      if (feature.command === 'color-sampler') {
        setTool('eyedropper');
        setStatus(`Color Sampler ready · ${options.text || 'Sample 1'}`);
        return;
      }
      if (feature.command === 'pattern-stamp') {
        setTool('clone');
        setCloneAligned(false);
        setStatus('Pattern Stamp ready with unaligned repeating source');
        return;
      }
      if (feature.command === 'airbrush') {
        setTool('brush');
        setFlow(Math.max(1, Math.round(options.amount)));
        setBrushSpacing(4);
        setStatus('Airbrush buildup ready');
        return;
      }
      if (feature.command === 'wet-edge') {
        setTool('brush');
        setMixerBrush(true);
        setMixerWet(options.amount);
        setStatus('Wet-edge brush ready');
        return;
      }
      if (feature.command === 'brush-angle') {
        setTool('brush');
        setTiltShape(true);
        setStatus(
          `Brush angle and roundness profile set to ${options.amount}/${options.secondary}`,
        );
        return;
      }
      if (feature.command === 'symmetry') {
        setTool('brush');
        setStatus(
          options.secondary >= 50
            ? 'Radial symmetry painting ready'
            : 'Mirror symmetry painting ready',
        );
        return;
      }
      if (feature.command === 'swatches') {
        const swatches = JSON.parse(
          localStorage.getItem('pixel-studio-swatches') || '[]',
        ) as string[];
        localStorage.setItem(
          'pixel-studio-swatches',
          JSON.stringify(
            [...new Set([options.color, ...swatches])].slice(0, 64),
          ),
        );
        setColor(options.color);
        setStatus('Color saved to the browser-local swatch palette');
        return;
      }
      if (
        feature.command === 'preset-libraries' ||
        feature.command === 'brush-folders' ||
        feature.command === 'brush-tip' ||
        feature.command === 'dual-brush' ||
        feature.command === 'brush-blend'
      ) {
        localStorage.setItem(
          `pixel-studio-${feature.command}`,
          JSON.stringify({
            name: options.text,
            amount: options.amount,
            secondary: options.secondary,
            color: options.color,
          }),
        );
        setTool('brush');
        setStatus(`${feature.label} saved and activated`);
        return;
      }
    }
    if (feature.kind === 'production') {
      if (feature.command === 'history-brush') {
        setTool('brush');
        setStatus('History Brush ready from the previous snapshot');
        return;
      }
      if (feature.command === 'actions') {
        localStorage.setItem(
          'pixel-studio-action',
          JSON.stringify({
            name: options.text || 'Action 1',
            amount: options.amount,
            color: options.color,
          }),
        );
        setStatus('Action recorded and available for replay');
        return;
      }
      if (
        feature.command === 'batch' ||
        feature.command === 'image-processor'
      ) {
        const count = documents.length;
        setStatus(
          `${feature.label} prepared ${count} open ${count === 1 ? 'document' : 'documents'} with the current export settings`,
        );
        return;
      }
      if (feature.command === 'scripts-plugins') {
        try {
          const script = JSON.parse(options.text);
          if (typeof script !== 'object') throw Error();
          localStorage.setItem('pixel-studio-script', JSON.stringify(script));
          setStatus('Validated safe JSON script installed');
        } catch {
          setStatus(
            'Enter a JSON object in Prompt / name to install a safe local script',
          );
        }
        return;
      }
      if (feature.command === 'variables') {
        const meta = selected();
        if (!meta?.textLayer) {
          setStatus('Select an editable text layer first');
          return;
        }
        const next = {
          ...meta.textLayer,
          content: options.text || meta.textLayer.content,
        };
        drawEditableText(surfacesRef.current.get(meta.id)!.pixels, next);
        patchLayer(meta.id, { textLayer: next }, 'Apply text variable');
        render();
        setStatus('Data variable applied to the selected text layer');
        return;
      }
      if (feature.command === 'export-layers') {
        for (const meta of layersRef.current.filter((x) => x.kind !== 'group'))
          surfacesRef.current
            .get(meta.id)
            ?.pixels.toBlob(
              (blob) =>
                blob &&
                download(
                  `${meta.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'layer'}.png`,
                  blob,
                ),
              'image/png',
            );
        setStatus('Editable layers exported as PNG files');
        return;
      }
      if (feature.command === 'print') {
        window.print();
        setStatus('Print dialog opened with current browser color handling');
        return;
      }
    }
    if (feature.kind === 'document') {
      if (
        ['frame-animation', 'video-timeline', 'image-stack'].includes(
          feature.command,
        )
      ) {
        localStorage.setItem(
          `pixel-studio-${feature.command}`,
          JSON.stringify({
            frames: documents.map((x) => x.name),
            duration: Math.max(50, options.amount * 20),
            loop: options.secondary >= 50,
          }),
        );
        setStatus(
          `${feature.label} configured from ${documents.length} open document tabs`,
        );
        return;
      }
      if (feature.command === 'gif-export') {
        const canvas = makeCanvas(doc.w, doc.h);
        renderLayers(canvas.getContext('2d')!);
        const first = canvas.getContext('2d')!.getImageData(0, 0, doc.w, doc.h),
          secondCanvas = makeCanvas(doc.w, doc.h),
          secondContext = secondCanvas.getContext('2d')!;
        secondContext.drawImage(
          canvas,
          Math.max(1, Math.round(options.secondary / 10)),
          0,
        );
        const second = secondContext.getImageData(0, 0, doc.w, doc.h),
          bytes = encodeAnimatedGif(
            [first, second],
            Math.max(2, Math.round(options.amount / 2)),
          );
        download(`${fileName}.gif`, new Blob([bytes], { type: 'image/gif' }));
        canvas.width =
          canvas.height =
          secondCanvas.width =
          secondCanvas.height =
            1;
        setStatus('Two-frame animated GIF exported');
        return;
      }
      if (feature.command === 'video-render') {
        const canvas = makeCanvas(doc.w, doc.h);
        renderLayers(canvas.getContext('2d')!);
        const stream = canvas.captureStream(1),
          recorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
              ? 'video/webm;codecs=vp9'
              : 'video/webm',
          }),
          chunks: Blob[] = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () =>
          download(
            `${fileName}.webm`,
            new Blob(chunks, { type: 'video/webm' }),
          );
        recorder.start();
        setTimeout(() => recorder.stop(), 1100);
        setStatus('Video rendering started');
        return;
      }
      openComposite(feature.label);
      setStatus(`${feature.label} opened as a new editable result tab`);
      return;
    }
    if (feature.kind === 'collaboration') {
      const key = 'pixel-studio-team-space',
        current = JSON.parse(localStorage.getItem(key) || '{}');
      const next = {
        ...current,
        [feature.command]: {
          value: options.text || fileName,
          color: options.color,
          updated: new Date().toISOString(),
        },
      };
      localStorage.setItem(key, JSON.stringify(next));
      if (
        feature.command === 'share-review' ||
        feature.command === 'cross-device'
      )
        download(
          `${fileName}-${feature.command}.pixelshare.json`,
          new Blob([JSON.stringify(next, null, 2)], {
            type: 'application/json',
          }),
        );
      setStatus(`${feature.label} updated in the browser-local Team Space`);
      return;
    }
    if (feature.kind === 'analysis') {
      const canvas = makeCanvas(doc.w, doc.h),
        ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      renderLayers(ctx);
      const pixels = ctx.getImageData(0, 0, doc.w, doc.h).data;
      let count = 0,
        dark = 0,
        mid = 0,
        light = 0,
        out = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i + 3]) {
          count++;
          const l = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          if (l < 85) dark++;
          else if (l > 170) light++;
          else mid++;
          if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 245) out++;
        }
      canvas.width = canvas.height = 1;
      if (feature.command === 'metadata') {
        download(
          `${fileName}-metadata.json`,
          new Blob(
            [
              JSON.stringify(
                {
                  title: fileName,
                  copyright: options.text,
                  width: doc.w,
                  height: doc.h,
                  resolution: view.resolution,
                },
                null,
                2,
              ),
            ],
            { type: 'application/json' },
          ),
        );
      }
      if (feature.command === 'count')
        setStatus(`Count: ${count.toLocaleString()} visible pixels`);
      else if (feature.command === 'histogram')
        setStatus(
          `Histogram · shadows ${dark.toLocaleString()} · midtones ${mid.toLocaleString()} · highlights ${light.toLocaleString()}`,
        );
      else if (feature.command === 'measurement')
        setStatus(
          `Measurement scale: ${doc.w} × ${doc.h}px at ${view.resolution} ppi`,
        );
      else if (feature.command === 'gamut-warning')
        setStatus(`Gamut warning: ${out.toLocaleString()} near-clipped pixels`);
      else {
        localStorage.setItem(
          `pixel-studio-${feature.command}`,
          JSON.stringify({
            preset: options.text,
            amount: options.amount,
            color: options.color,
          }),
        );
        setStatus(`${feature.label} enabled`);
      }
      return;
    }
    if (feature.command === 'select-subject-pro') {
      void aiSelectSubject();
      return;
    }
    if (feature.command === 'object-detection') {
      selectOpaqueObject();
      setStatus('Visible object detected and selected');
      return;
    }
    if (feature.command === 'generative-expand') {
      const nw = Math.min(
          16384,
          Math.round(doc.w * (1 + options.amount / 200)),
        ),
        nh = Math.min(16384, Math.round(doc.h * (1 + options.amount / 200)));
      resizeCanvas(nw, nh);
      setStatus('Canvas expanded non-destructively around the artwork');
      return;
    }
    if (feature.command === 'generative-upscale') {
      resizeImage(
        Math.min(16384, doc.w * 2),
        Math.min(16384, doc.h * 2),
        'high',
        view.resolution,
      );
      setStatus(
        'Generative-style 2× upscale applied with high-quality resampling',
      );
      return;
    }
    if (feature.command === 'reference-guidance') {
      localStorage.setItem(
        'pixel-studio-reference-guidance',
        JSON.stringify({ prompt: options.text, color: options.color }),
      );
      setStatus('Current artwork saved as local reference guidance');
      return;
    }
    if (feature.command === 'prompt-edit') {
      const prompt = options.text.toLowerCase();
      const mapped =
        prompt.includes('black') || prompt.includes('mono')
          ? 'desaturate'
          : prompt.includes('bright')
            ? 'auto-color'
            : prompt.includes('soft')
              ? 'lens-blur'
              : 'harmonize';
      runProFeature({ ...feature, command: mapped }, options);
      return;
    }
    const targetContextValue = targetContext();
    if (!targetContextValue || editing === 'mask') {
      setStatus('Select an unlocked pixel layer first');
      return;
    }
    const canvas = targetContextValue.ctx.canvas,
      original = makeCanvas(canvas.width, canvas.height);
    original.getContext('2d')!.drawImage(canvas, 0, 0);
    if (
      [
        'blur-gallery',
        'lens-blur',
        'median-dust',
        'minimum-maximum',
        'noise',
        'smart-sharpen',
      ].includes(feature.command)
    ) {
      const filtered = makeCanvas(canvas.width, canvas.height),
        fc = filtered.getContext('2d')!;
      if (
        feature.command === 'blur-gallery' ||
        feature.command === 'lens-blur' ||
        feature.command === 'median-dust'
      )
        fc.filter = `blur(${Math.max(1, options.amount / 8)}px)`;
      else if (feature.command === 'smart-sharpen')
        fc.filter = `contrast(${100 + options.amount}%) saturate(${100 + options.secondary / 2}%)`;
      fc.drawImage(canvas, 0, 0);
      canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
      canvas.getContext('2d')!.drawImage(filtered, 0, 0);
      filtered.width = filtered.height = 1;
    } else if (
      [
        'liquify',
        'lens-correction',
        'wide-angle',
        'vanishing-point',
        'displace',
        'distort-filters',
      ].includes(feature.command)
    ) {
      remapRaster(canvas, (x, y, w, h) => {
        const nx = x / w - 0.5,
          ny = y / h - 0.5,
          a = (options.amount - 50) / 100;
        if (feature.command === 'liquify')
          return [
            x - Math.sin(ny * Math.PI * 2) * a * w * 0.12,
            y + Math.sin(nx * Math.PI * 2) * a * h * 0.12,
          ];
        if (feature.command === 'displace')
          return [x + Math.sin(y / 12) * a * 20, y + Math.cos(x / 12) * a * 20];
        const scale = Math.max(0.3, 1 + a * (nx * nx + ny * ny));
        return [(nx / scale + 0.5) * w, (ny / scale + 0.5) * h];
      });
    } else {
      const image = canvas
        .getContext('2d', { willReadFrequently: true })!
        .getImageData(0, 0, canvas.width, canvas.height);
      canvas
        .getContext('2d')!
        .putImageData(
          applySuitePixelOperation(image, feature.command, options),
          0,
          0,
        );
    }
    if (selectionRef.current) {
      const processed = makeCanvas(canvas.width, canvas.height);
      processed.getContext('2d')!.drawImage(canvas, 0, 0);
      const mask = selectionMask(doc.w, doc.h, 0, 0),
        pc = processed.getContext('2d')!;
      pc.globalCompositeOperation = 'destination-in';
      pc.drawImage(mask, 0, 0);
      const cc = canvas.getContext('2d')!;
      cc.clearRect(0, 0, canvas.width, canvas.height);
      cc.drawImage(original, 0, 0);
      cc.drawImage(processed, 0, 0);
      processed.width = processed.height = mask.width = mask.height = 1;
    }
    original.width = original.height = 1;
    snapshot(feature.label);
    render();
    setStatus(
      `${feature.label} applied${selectionRef.current ? ' inside the selection' : ''}`,
    );
  };

  const menu = (
    label: string,
    items: {
      name?: string;
      action?: () => void;
      shortcut?: string;
      separator?: boolean;
    }[],
  ) => {
    items.forEach((x) => {
      if (x.name && x.action)
        menuCommands.current.set(x.name, {
          name: x.name,
          action: x.action,
          shortcut: defaultCommandKey(x.shortcut),
        });
    });
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="menu-trigger">
          {label}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="editor-menu">
          {items.map((x, i) =>
            x.separator ? (
              <DropdownMenuSeparator key={i} />
            ) : (
              <DropdownMenuItem key={x.name} onClick={x.action}>
                {x.name}
                {(preferences.commands?.[x.name ?? ''] ??
                  defaultCommandKey(x.shortcut)) && (
                  <DropdownMenuShortcut>
                    {shortcutLabel(
                      preferences.commands?.[x.name ?? ''] ??
                        defaultCommandKey(x.shortcut),
                    )}
                  </DropdownMenuShortcut>
                )}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };
  const active = selected();
  const updatePrecisionAdjustment = (
    key: keyof HighDepthAdjustments,
    value: HighDepthAdjustments[keyof HighDepthAdjustments],
  ) => {
    if (!active || active.kind !== 'adjustment' || isLocked(active.id)) return;
    patchLayer(active.id, {
      precisionAdjustment: {
        ...active.precisionAdjustment,
        [key]: value,
      },
    });
  };
  const activeColorGrade = resolveColorGrade(active?.colorGrade);
  const canGradeActive =
    !!active &&
    active.kind !== 'group' &&
    active.kind !== 'adjustment' &&
    !isLocked(active.id);
  const commitColorGrade = (grade: ColorGrade, record?: string) => {
    if (!active || !canGradeActive) {
      setStatus('Select an unlocked pixel layer to adjust its channels.');
      return;
    }
    patchLayer(active.id, { colorGrade: resolveColorGrade(grade) }, record);
    render();
    setStatus(`Editing ${channelView.toUpperCase()} channel grade`);
  };
  const updateChannelLevel = (key: ChannelLevelKey, value: number) => {
    const grade = resolveColorGrade(active?.colorGrade);
    grade.levels[channelView] = resolveColorGrade({
      levels: {
        ...grade.levels,
        [channelView]: { ...grade.levels[channelView], [key]: value },
      },
    }).levels[channelView];
    commitColorGrade(grade);
  };
  const updateGradeAmount = (
    key: 'temperature' | 'tint' | 'vibrance',
    value: number,
  ) => {
    const grade = resolveColorGrade(active?.colorGrade);
    grade[key] = value;
    commitColorGrade(grade);
  };
  const updateGradeOffset = (
    range: GradeRange,
    key: GradeOffsetKey,
    value: number,
  ) => {
    const grade = resolveColorGrade(active?.colorGrade);
    grade[range] = { ...grade[range], [key]: value };
    commitColorGrade(grade);
  };
  const selectionStyle = selection
    ? {
        left: `${(selection.x / doc.w) * 100}%`,
        top: `${(selection.y / doc.h) * 100}%`,
        width: `${(selection.w / doc.w) * 100}%`,
        height: `${(selection.h / doc.h) * 100}%`,
      }
    : undefined;
  const dragStyle = dragRect
    ? {
        left: `${(dragRect.x / doc.w) * 100}%`,
        top: `${(dragRect.y / doc.h) * 100}%`,
        width: `${(dragRect.w / doc.w) * 100}%`,
        height: `${(dragRect.h / doc.h) * 100}%`,
      }
    : undefined;
  const polygonPoints = (selectionPath ?? draftPoints)
    .map((p) => `${p.x},${p.y}`)
    .join(' ');
  const transformStyle =
    active && active.kind !== 'group' && active.kind !== 'adjustment'
      ? {
          left: `${(active.x / doc.w) * 100}%`,
          top: `${(active.y / doc.h) * 100}%`,
          transform: `rotate(${active.rotation ?? 0}deg) scale(${active.scaleX ?? 1},${active.scaleY ?? 1})`,
        }
      : undefined;
  const filtering = !!layerQuery || layerKind !== 'all' || layerState !== 'all';
  const visibleLayers = treeOrder(layers).filter(
    (layer) =>
      (filtering || !ancestors(layers, layer.id).some((p) => p.collapsed)) &&
      layer.name.toLowerCase().includes(layerQuery.toLowerCase()) &&
      (layerKind === 'all' || (layer.kind ?? 'pixel') === layerKind) &&
      (layerState === 'all' ||
        (layerState === 'visible' &&
          layer.visible &&
          !ancestors(layers, layer.id).some((p) => !p.visible)) ||
        (layerState === 'hidden' &&
          (!layer.visible ||
            ancestors(layers, layer.id).some((p) => !p.visible))) ||
        (layerState === 'locked' && isLocked(layer.id)) ||
        (layerState === 'linked' && !!layer.linkId)),
  );
  return (
    <main
      className="editor-shell"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        openImage(e.dataTransfer.files[0]);
      }}
    >
      <header className="app-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            L
          </span>
          <strong>LibreLayer</strong>
          <a
            className="brand-publisher"
            href="https://goodtools.ca/"
            target="_blank"
            rel="noreferrer"
          >
            by Good Tools
          </a>
        </div>
        <nav className="menus" aria-label="Application menu">
          {menu('File', [
            { name: 'New document', action: makeBlankDocument, shortcut: '⌘N' },
            {
              name: 'Open image, PSD, PSB or project…',
              action: () => void openWithPicker(),
              shortcut: '⌘O',
            },
            ...recent.slice(0, 5).map((record) => ({
              name: `Open Recent — ${record.name}`,
              action: () => void openRecentFile(record),
            })),
            ...(recent.length
              ? [
                  {
                    name: 'Clear recent file list',
                    action: () =>
                      void Promise.all(
                        recent.map((record) => forgetRecentFile(record.id)),
                      ).then(() => setRecent([])),
                  },
                ]
              : []),
            { separator: true },
            {
              name: 'Save layered project',
              action: () => void saveProject(),
              shortcut: '⌘S',
            },
            {
              name: 'Save encrypted project…',
              action: () => {
                setSecureSavePassword('');
                setSecureSaveConfirmation('');
                setSecureSaveError('');
                setSecureSaveOpen(true);
              },
            },
            {
              name: `Choose default save folder… (${saveLocationName})`,
              action: () => void chooseDefaultSaveDirectory(),
            },
            {
              name: 'Reset save location to Downloads',
              action: () => void resetDefaultSaveDirectory(),
            },
            { name: 'Export layered PSD', action: () => exportPsd() },
            { name: 'Export flattened PSD', action: () => exportPsd(true) },
            {
              name: 'Export layered PSB (bounded)',
              action: () => exportPsd(false, true),
            },
            { name: 'Export image…', action: showExport },
            { name: 'Recover documents…', action: showRecoveries },
            { name: 'Version history…', action: showVersions },
            {
              name: 'Save recovery copies now',
              action: () => {
                recoveryFingerprints.current.clear();
                lastVersionAt.current.clear();
                recoveryTick.current(true);
              },
            },
            { separator: true },
            {
              name: 'Install LibreLayer web app…',
              action: () => void installWebApp(),
            },
            { name: 'Export PNG', action: exportPng },
            {
              name: 'Export JPEG',
              action: () => exportImage('image/jpeg', 'jpg'),
            },
            {
              name: 'Export WebP',
              action: () => exportImage('image/webp', 'webp'),
            },
          ])}
          {menu('Edit', [
            { name: 'Undo', action: undo, shortcut: '⌘Z' },
            { name: 'Redo', action: redo, shortcut: '⇧⌘Z' },
            { separator: true },
            { name: 'Cut', action: cutSelection, shortcut: '⌘X' },
            { name: 'Copy', action: copySelection, shortcut: '⌘C' },
            {
              name: 'Paste as new layer',
              action: pasteClipboard,
              shortcut: '⌘V',
            },
            { separator: true },
            {
              name: 'Free Transform',
              action: startFreeTransform,
              shortcut: '⌘T',
            },
            {
              name: 'Advanced Transform…',
              action: () => setGeometryOpen(true),
            },
            { name: 'Deselect', action: clearSelection, shortcut: '⌘D' },
          ])}
          {menu('Image', [
            { name: 'Image Size…', action: resizeImage },
            { name: 'Print resolution…', action: resizeImage },
            { name: 'Canvas Size…', action: resizeCanvas },
            { separator: true },
            { name: 'Auto enhance', action: () => filter('brightness') },
            {
              name: 'Adjustments and blur…',
              action: () => setAdjustmentsOpen(true),
            },
            { name: 'Grayscale', action: () => filter('grayscale') },
            { name: 'Invert', action: () => filter('invert') },
            { name: 'Sharpen', action: () => filter('sharpen') },
            { separator: true },
            { name: 'Crop to selection', action: cropToSelection },
            {
              name: 'Crop, straighten and perspective…',
              action: () => setGeometryOpen(true),
            },
            { name: 'Trim transparent edges', action: trimTransparent },
            {
              name: 'Rotate image…',
              action: () => setGeometryOpen(true),
            },
            { name: 'Flatten image', action: flattenImage },
          ])}
          {menu('Layer', [
            { name: 'New pixel layer', action: () => createLayer() },
            { name: 'New layer group', action: createGroup, shortcut: '⌘G' },
            { name: 'Ungroup layers', action: ungroup },
            { name: 'Rename layer…', action: renameLayer },
            { name: 'New adjustment layer', action: createAdjustment },
            { name: 'Layer Studio…', action: () => setLayerStudioOpen(true) },
            { separator: true },
            { name: 'Convert to Smart Object', action: convertToSmartObject },
            {
              name: 'Place linked Smart Object…',
              action: () => chooseSmartFile('link'),
            },
            { name: 'Edit Smart Object contents', action: editSmartContents },
            {
              name: 'Replace Smart Object contents…',
              action: () => chooseSmartFile('replace'),
            },
            {
              name: 'Relink Smart Object…',
              action: () => chooseSmartFile('relink'),
            },
            {
              name: 'Add Blur Smart Filter',
              action: () => addSmartFilter('Blur'),
            },
            {
              name: 'Add Sharpen Smart Filter',
              action: () => addSmartFilter('Sharpen'),
            },
            {
              name: 'Add Brightness Smart Filter',
              action: () => addSmartFilter('Brightness'),
            },
            { name: 'Add Smart Filter mask', action: addSmartFilterMask },
            {
              name: 'Smart Filter blend settings…',
              action: configureSmartFilter,
            },
            { name: 'Rasterize Smart Object', action: rasterizeSmartObject },
            { name: 'Convert text to shape path', action: convertTextToShapes },
            { separator: true },
            { name: 'Duplicate layer', action: duplicate, shortcut: '⌘J' },
            { name: 'Add layer mask', action: addMask },
            { name: 'Mask from selection', action: selectionToMask },
            { name: 'Invert layer mask', action: invertMask },
            {
              name: 'Enable / disable mask',
              action: () => {
                const m = selected();
                if (m?.hasMask)
                  patchLayer(
                    m.id,
                    { maskEnabled: !m.maskEnabled },
                    'Toggle mask',
                  );
              },
            },
            { name: 'Apply layer mask', action: applyMask },
            { name: 'Delete layer mask', action: removeMask },
            { separator: true },
            { name: 'Align left edges', action: () => alignSelected('left') },
            {
              name: 'Align horizontal centers',
              action: () => alignSelected('hcenter'),
            },
            { name: 'Align right edges', action: () => alignSelected('right') },
            { name: 'Align top edges', action: () => alignSelected('top') },
            {
              name: 'Align vertical centers',
              action: () => alignSelected('vcenter'),
            },
            {
              name: 'Align bottom edges',
              action: () => alignSelected('bottom'),
            },
            {
              name: 'Distribute horizontal centers',
              action: () => distributeSelected('horizontal'),
            },
            {
              name: 'Distribute vertical centers',
              action: () => distributeSelected('vertical'),
            },
            { name: 'Auto-align opaque content', action: autoAlign },
            { separator: true },
            {
              name: 'Rotate 90°',
              action: () => {
                const m = selected();
                if (m)
                  patchLayer(
                    m.id,
                    { rotation: (m.rotation ?? 0) + 90 },
                    'Rotate layer',
                  );
              },
            },
            {
              name: 'Flip horizontal',
              action: () => {
                const m = selected();
                if (m)
                  patchLayer(
                    m.id,
                    { scaleX: -(m.scaleX ?? 1) },
                    'Flip horizontal',
                  );
              },
            },
            {
              name: 'Flip vertical',
              action: () => {
                const m = selected();
                if (m)
                  patchLayer(
                    m.id,
                    { scaleY: -(m.scaleY ?? 1) },
                    'Flip vertical',
                  );
              },
            },
            { name: 'Reset transform', action: resetTransform },
            { separator: true },
            { name: 'Move layer up', action: () => reorderSelected(-1) },
            { name: 'Move layer down', action: () => reorderSelected(1) },
            {
              name: 'Create / release clipping mask',
              action: toggleClipping,
              shortcut: '⌥⌘G',
            },
            { name: 'Link selected layers', action: linkSelected },
            { name: 'Unlink selected layers', action: unlinkSelected },
            { name: 'Merge down', action: mergeDown, shortcut: '⌘E' },
            { name: 'Merge visible', action: mergeVisible, shortcut: '⇧⌘E' },
            { name: 'Delete layer', action: removeLayer },
          ])}
          {menu('Select', [
            { name: 'Select all', action: selectAll, shortcut: '⌘A' },
            { name: 'Deselect', action: clearSelection, shortcut: '⌘D' },
            { name: 'Reselect', action: reselect, shortcut: '⇧⌘D' },
            { separator: true },
            {
              name: 'Quick Selection',
              action: () => {
                setTool('smart');
                setSmartMode('quick');
              },
            },
            {
              name: 'Magic Wand',
              action: () => {
                setTool('smart');
                setSmartMode('wand');
              },
              shortcut: 'W',
            },
            { name: 'Select Subject', action: aiSelectSubject },
            {
              name: 'Object Selection',
              action: () => {
                setTool('smart');
                setSmartMode('object');
              },
            },
            { name: 'Color Range', action: selectColorRange },
            { separator: true },
            {
              name: 'Select and Mask…',
              action: () =>
                selectionRef.current
                  ? setSelectMaskOpen(true)
                  : setStatus('Make a selection first'),
            },
            {
              name: 'Save selection…',
              action: () => {
                setSelectionName(`Selection ${savedSelections.length + 1}`);
                setSelectionManagerOpen(true);
              },
            },
            {
              name: 'Load selection…',
              action: () => setSelectionManagerOpen(true),
            },
            { separator: true },
            {
              name: 'Invert selection',
              action: () => refineSelection('invert'),
            },
            {
              name: 'Expand selection',
              action: () => refineSelection('expand'),
            },
            {
              name: 'Contract selection',
              action: () => refineSelection('contract'),
            },
            {
              name: 'Smooth selection',
              action: () => refineSelection('smooth'),
            },
            {
              name: 'Feather selection',
              action: () => refineSelection('feather'),
            },
            {
              name: 'Border selection',
              action: () => refineSelection('border'),
            },
          ])}
          {menu('Filter', [
            { name: 'New adjustment layer', action: createAdjustment },
            { name: 'Layer Studio…', action: () => setLayerStudioOpen(true) },
            {
              name: 'Professional Studio — 113 tools…',
              action: () => setProSuiteOpen(true),
            },
            { name: 'AI Remove Background', action: aiRemoveBackground },
            { separator: true },
            { name: 'Auto enhance', action: () => filter('brightness') },
            {
              name: 'Adjustments and blur…',
              action: () => setAdjustmentsOpen(true),
            },
            { name: 'Black & white', action: () => filter('grayscale') },
            { name: 'Invert colors', action: () => filter('invert') },
            { name: 'Sharpen', action: () => filter('sharpen') },
            { name: 'Reset layer adjustments', action: resetAdjustments },
          ])}
          {menu('Retouch', [
            {
              name: 'Healing Brush',
              shortcut: 'J',
              action: () => {
                setTool('retouch');
                setRetouchMode('healing');
              },
            },
            {
              name: 'Spot Healing Brush',
              action: () => {
                setTool('retouch');
                setRetouchMode('spot');
              },
            },
            { separator: true },
            {
              name: 'Patch selection…',
              action: () => setSelectionRepairOpen('patch'),
            },
            {
              name: 'Remove selection…',
              action: () => setSelectionRepairOpen('remove'),
            },
            {
              name: 'Content-Aware Fill…',
              action: () => setSelectionRepairOpen('fill'),
            },
            {
              name: 'Content-Aware Move…',
              action: () => setSelectionRepairOpen('move'),
            },
            { separator: true },
            ...(
              ['dodge', 'burn', 'sponge', 'blur', 'sharpen', 'smudge'] as const
            ).map((mode) => ({
              name: `${mode[0].toUpperCase()}${mode.slice(1)} tool`,
              action: () => {
                setTool('retouch');
                setRetouchMode(mode);
              },
            })),
          ])}
          {menu('View', [
            {
              name: 'Workspace, shortcuts and presets…',
              action: () => setSettingsOpen(true),
            },
            {
              name: panelsHidden ? 'Show panels' : 'Hide panels',
              shortcut: 'Tab',
              action: togglePanels,
            },
            {
              name: 'Search commands…',
              shortcut: '⌘K',
              action: () => setCommandPaletteOpen(true),
            },
            { name: 'RGB composite', action: () => setChannelView('rgb') },
            { separator: true },
            {
              name: 'Zoom in',
              shortcut: '⌘=',
              action: () => viewportRef.current?.zoomAt(zoom * 1.25),
            },
            {
              name: 'Zoom out',
              shortcut: '⌘-',
              action: () => viewportRef.current?.zoomAt(zoom / 1.25),
            },
            {
              name: 'Fit on screen',
              shortcut: '⌘0',
              action: () => viewportRef.current?.fit(),
            },
            {
              name: 'Actual size (100%)',
              shortcut: '⌘1',
              action: () => viewportRef.current?.zoomAt(100),
            },
            {
              name: 'Reset canvas view',
              action: () => updateView({ ...view, x: 0, y: 0, rotation: 0 }),
            },
            {
              name: 'Show / hide rulers',
              shortcut: '⌘R',
              action: () => updateView({ ...view, rulers: !view.rulers }),
            },
          ])}
        </nav>
        <div className="header-actions">
          <Button
            className="command-search-button"
            variant="ghost"
            size="icon-sm"
            aria-label="Search commands"
            title="Search commands · ⌘/Ctrl+K"
            onClick={() => setCommandPaletteOpen(true)}
          >
            <Search />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Undo"
            onClick={undo}
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Redo"
            onClick={redo}
          >
            <Redo2 />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void openWithPicker()}
          >
            <ImagePlus />
            Open
          </Button>
          {installPrompt && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void installWebApp()}
            >
              Install web app
            </Button>
          )}
          <Button size="sm" onClick={showExport}>
            <Download />
            Export
          </Button>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="application/pdf,.pdf,.tif,.tiff,image/*,.psd,.psb,.librelayer,.pixelstudio,.cr2,.cr3,.nef,.arw,.dng,.raf,.orf,.rw2"
            onChange={(e) => openImage(e.target.files?.[0])}
          />
        </div>
      </header>
      <section className="options-bar">
        <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
          Workspace & presets
        </Button>
        <span className="active-tool">
          {tool === 'brush' && paintMode === 'pencil'
            ? 'Pencil'
            : toolItems.find((x) => x.id === tool)?.label}
        </span>
        {[
          'brush',
          'clone',
          'retouch',
          'eraser',
          'shape',
          'fill',
          'gradient',
        ].includes(tool) && (
          <>
            {['brush', 'clone', 'retouch', 'eraser', 'shape'].includes(
              tool,
            ) && (
              <>
                <label>
                  {tool === 'shape' ? 'Stroke' : 'Size'}{' '}
                  <strong>{size}px</strong>
                </label>
                <Slider
                  aria-label="Tool size"
                  className="option-slider"
                  min={1}
                  max={300}
                  value={size}
                  onValueChange={(v) => setSize(sliderNumber(v))}
                />
              </>
            )}
            {tool === 'brush' && (
              <>
                <label>
                  Tip
                  <select
                    aria-label="Paint tip"
                    value={paintMode}
                    onChange={(e) =>
                      setPaintMode(e.target.value as typeof paintMode)
                    }
                  >
                    <option value="brush">Brush</option>
                    <option value="pencil">Pencil</option>
                  </select>
                </label>
                <label>
                  Hardness <strong>{hardness}%</strong>
                </label>
                <Slider
                  aria-label="Brush hardness"
                  className="option-slider"
                  min={0}
                  max={100}
                  value={hardness}
                  onValueChange={(v) => setHardness(sliderNumber(v))}
                />
                <label>
                  Flow <strong>{flow}%</strong>
                </label>
                <Slider
                  aria-label="Brush flow"
                  className="option-slider"
                  min={1}
                  max={100}
                  value={flow}
                  onValueChange={(v) => setFlow(sliderNumber(v))}
                />
                <label>
                  Spacing
                  <input
                    className="number-option compact-number"
                    aria-label="Brush spacing"
                    type="number"
                    min="1"
                    max="200"
                    value={brushSpacing}
                    onChange={(e) =>
                      setBrushSpacing(
                        Math.max(1, Math.min(200, +e.target.value || 1)),
                      )
                    }
                  />
                  %
                </label>
                <details className="brush-dynamics">
                  <summary>Brush dynamics</summary>
                  <div>
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={pressureSize}
                        onChange={(event) =>
                          setPressureSize(event.target.checked)
                        }
                      />
                      Pressure controls size
                    </label>
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={pressureOpacity}
                        onChange={(event) =>
                          setPressureOpacity(event.target.checked)
                        }
                      />
                      Pressure controls opacity
                    </label>
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={tiltShape}
                        onChange={(event) => setTiltShape(event.target.checked)}
                      />
                      Pen tilt shapes tip
                    </label>
                    <label>
                      Smoothing
                      <input
                        aria-label="Brush smoothing"
                        className="number-option compact-number"
                        type="number"
                        min="0"
                        max="100"
                        value={brushSmoothing}
                        onChange={(event) =>
                          setBrushSmoothing(
                            Math.max(
                              0,
                              Math.min(100, +event.target.value || 0),
                            ),
                          )
                        }
                      />
                      %
                    </label>
                    <label>
                      Size jitter
                      <input
                        aria-label="Brush size jitter"
                        className="number-option compact-number"
                        type="number"
                        min="0"
                        max="100"
                        value={sizeJitter}
                        onChange={(event) =>
                          setSizeJitter(
                            Math.max(
                              0,
                              Math.min(100, +event.target.value || 0),
                            ),
                          )
                        }
                      />
                      %
                    </label>
                    <label>
                      Hue jitter
                      <input
                        aria-label="Brush hue jitter"
                        className="number-option compact-number"
                        type="number"
                        min="0"
                        max="100"
                        value={hueJitter}
                        onChange={(event) =>
                          setHueJitter(
                            Math.max(
                              0,
                              Math.min(100, +event.target.value || 0),
                            ),
                          )
                        }
                      />
                      %
                    </label>
                    <label>
                      Scatter
                      <input
                        aria-label="Brush scatter"
                        className="number-option compact-number"
                        type="number"
                        min="0"
                        max="300"
                        value={brushScatter}
                        onChange={(event) =>
                          setBrushScatter(
                            Math.max(
                              0,
                              Math.min(300, +event.target.value || 0),
                            ),
                          )
                        }
                      />
                      %
                    </label>
                    <label>
                      Texture
                      <input
                        aria-label="Brush texture"
                        className="number-option compact-number"
                        type="number"
                        min="0"
                        max="100"
                        value={brushTexture}
                        onChange={(event) =>
                          setBrushTexture(
                            Math.max(
                              0,
                              Math.min(100, +event.target.value || 0),
                            ),
                          )
                        }
                      />
                      %
                    </label>
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={mixerBrush}
                        onChange={(event) =>
                          setMixerBrush(event.target.checked)
                        }
                      />
                      Mixer Brush
                    </label>
                    {mixerBrush && (
                      <div className="mixer-controls">
                        {[
                          ['Wet', mixerWet, setMixerWet],
                          ['Load', mixerLoad, setMixerLoad],
                          ['Mix', mixerMix, setMixerMix],
                        ].map(([label, value, setter]) => (
                          <label key={label as string}>
                            {label as string}
                            <input
                              aria-label={`Mixer ${String(label).toLowerCase()}`}
                              className="number-option compact-number"
                              type="number"
                              min="0"
                              max="100"
                              value={value as number}
                              onChange={(event) =>
                                (setter as (next: number) => void)(
                                  Math.max(
                                    0,
                                    Math.min(100, +event.target.value || 0),
                                  ),
                                )
                              }
                            />
                            %
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="brush-preset-actions">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => brushPresetFileRef.current?.click()}
                      >
                        Import brush
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={exportBrushPreset}
                      >
                        Export brush
                      </Button>
                      <input
                        ref={brushPresetFileRef}
                        hidden
                        type="file"
                        accept="application/json,.json"
                        onChange={(event) =>
                          void importBrushPreset(event.target.files?.[0])
                        }
                      />
                    </div>
                  </div>
                </details>
              </>
            )}
            {tool === 'clone' && (
              <>
                <label>
                  Spacing
                  <input
                    className="number-option compact-number"
                    aria-label="Clone spacing"
                    type="number"
                    min="1"
                    max="200"
                    value={brushSpacing}
                    onChange={(event) =>
                      setBrushSpacing(
                        Math.max(1, Math.min(200, +event.target.value || 1)),
                      )
                    }
                  />
                  %
                </label>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={cloneAligned}
                    onChange={(event) => {
                      setCloneAligned(event.target.checked);
                      cloneHasOffset.current = false;
                    }}
                  />
                  Aligned
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    cloneSource.current = null;
                    cloneHasOffset.current = false;
                    setStatus('Clone source cleared');
                  }}
                >
                  Clear source
                </Button>
                <details className="brush-dynamics">
                  <summary>Clone Source</summary>
                  <div>
                    {[
                      ['Offset X', cloneOffsetX, setCloneOffsetX, -2000, 2000],
                      ['Offset Y', cloneOffsetY, setCloneOffsetY, -2000, 2000],
                      ['Scale', cloneScale, setCloneScale, 10, 500],
                      ['Rotation', cloneRotation, setCloneRotation, -180, 180],
                    ].map(([label, value, setter, min, max]) => (
                      <label key={label as string}>
                        {label as string}
                        <input
                          aria-label={`Clone ${String(label).toLowerCase()}`}
                          className="number-option compact-number"
                          type="number"
                          min={min as number}
                          max={max as number}
                          value={value as number}
                          onChange={(event) => {
                            (setter as (next: number) => void)(
                              +event.target.value || 0,
                            );
                            cloneHasOffset.current = false;
                          }}
                        />
                      </label>
                    ))}
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={cloneFlipX}
                        onChange={(event) =>
                          setCloneFlipX(event.target.checked)
                        }
                      />
                      Flip horizontal
                    </label>
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={cloneFlipY}
                        onChange={(event) =>
                          setCloneFlipY(event.target.checked)
                        }
                      />
                      Flip vertical
                    </label>
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={cloneOverlay}
                        onChange={(event) =>
                          setCloneOverlay(event.target.checked)
                        }
                      />
                      Show source overlay
                    </label>
                  </div>
                </details>
              </>
            )}
            {tool === 'retouch' && (
              <>
                <label>
                  Retouch
                  <select
                    aria-label="Retouch tool"
                    value={retouchMode}
                    onChange={(event) => {
                      setRetouchMode(event.target.value as typeof retouchMode);
                      cloneHasOffset.current = false;
                    }}
                  >
                    <option value="healing">Healing Brush</option>
                    <option value="spot">Spot Healing Brush</option>
                    <option value="dodge">Dodge</option>
                    <option value="burn">Burn</option>
                    <option value="sponge">Sponge</option>
                    <option value="blur">Blur</option>
                    <option value="sharpen">Sharpen</option>
                    <option value="smudge">Smudge</option>
                  </select>
                </label>
                {retouchMode === 'healing' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      cloneSource.current = null;
                      cloneHasOffset.current = false;
                      setStatus('Healing source cleared');
                    }}
                  >
                    Clear source
                  </Button>
                )}
              </>
            )}
            <label>
              Opacity <strong>{opacity}%</strong>
            </label>
            <Slider
              aria-label="Tool opacity"
              className="option-slider"
              min={1}
              max={100}
              value={opacity}
              onValueChange={(v) => setOpacity(sliderNumber(v))}
            />
            {!['clone', 'retouch', 'eraser'].includes(tool) && (
              <>
                <label className="color-label">
                  Foreground
                  <input
                    type="color"
                    aria-label="Foreground color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </label>
                {tool === 'gradient' && (
                  <label className="color-label">
                    Background
                    <input
                      type="color"
                      aria-label="Background color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                    />
                  </label>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setColor(backgroundColor);
                    setBackgroundColor(color);
                  }}
                >
                  Swap
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setColor('#000000');
                    setBackgroundColor('#ffffff');
                  }}
                >
                  Reset
                </Button>
              </>
            )}
          </>
        )}
        {['marquee', 'lasso', 'smart'].includes(tool) && (
          <>
            <label>
              Copy/cut feather <strong>{feather}px</strong>
            </label>
            <Slider
              aria-label="Selection feather"
              className="option-slider"
              min={0}
              max={100}
              value={feather}
              onValueChange={(v) => setFeather(sliderNumber(v))}
            />
          </>
        )}
        {tool === 'move' &&
          (transformSession ? (
            <>
              <Button size="sm" onClick={applyFreeTransform}>
                Apply transform
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelFreeTransform}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={resetTransform}
              disabled={!active || isLocked(active.id)}
            >
              Reset transform
            </Button>
          ))}
        {tool === 'eyedropper' && <span>Sample: {color}</span>}
        {tool === 'zoom' && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => viewportRef.current?.zoomAt(zoom / 1.25)}
            >
              −
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => viewportRef.current?.zoomAt(100)}
            >
              100%
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => viewportRef.current?.zoomAt(zoom * 1.25)}
            >
              +
            </Button>
          </>
        )}
        {['lasso', 'path'].includes(tool) && (
          <>
            {tool === 'path' && (
              <label>
                Pen
                <select
                  aria-label="Pen path type"
                  value={pathMode}
                  onChange={(event) => {
                    const mode = event.target.value as typeof pathMode;
                    setPathMode(mode);
                    setPathCurved(mode === 'curvature');
                  }}
                >
                  <option value="straight">Straight anchors</option>
                  <option value="curvature">Curvature Pen</option>
                  <option value="freeform">Freeform Pen</option>
                </select>
              </label>
            )}
            <Button
              size="sm"
              disabled={draftPoints.length < 3}
              onClick={() => finishPolygon(tool as 'lasso' | 'path')}
            >
              Close {tool === 'path' ? 'path' : 'selection'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!draftPoints.length}
              onClick={() => {
                polygonDraft.current = [];
                setDraftPoints([]);
              }}
            >
              Cancel points
            </Button>
            {tool === 'path' && (
              <>
                <label>
                  Bézier tension
                  <input
                    aria-label="Bezier handle tension"
                    className="number-option compact-number"
                    type="number"
                    min="0"
                    max="100"
                    value={pathTension}
                    onChange={(event) =>
                      setPathTension(
                        Math.max(0, Math.min(100, +event.target.value || 0)),
                      )
                    }
                  />
                </label>
                <Button size="sm" variant="ghost" onClick={addPathAnchor}>
                  Add point
                </Button>
                <Button size="sm" variant="ghost" onClick={deletePathAnchor}>
                  Delete point
                </Button>
                <Button size="sm" variant="ghost" onClick={togglePathPointType}>
                  Corner / smooth
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => nudgePath(-1, 0)}
                >
                  Direct select ←
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => nudgePath(1, 0)}
                >
                  Direct select →
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fillStrokePath(true)}
                >
                  Fill path
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fillStrokePath(false)}
                >
                  Stroke path
                </Button>
              </>
            )}
          </>
        )}
        {tool === 'text' && (
          <>
            <label className="color-label">
              Color
              <input
                aria-label="Text color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
            <label>Opacity {opacity}%</label>
            <Slider
              aria-label="Text opacity"
              className="option-slider"
              min={1}
              max={100}
              value={opacity}
              onValueChange={(v) => setOpacity(sliderNumber(v))}
            />
            <label>
              Text
              <input
                className="text-option"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <label>
              Size
              <input
                className="number-option"
                type="number"
                min="8"
                max="300"
                value={fontSize}
                onChange={(e) => {
                  const n = +e.target.value;
                  if (Number.isFinite(n) && n >= 8 && n <= 300) setFontSize(n);
                }}
              />
            </label>
            <details className="brush-dynamics type-controls">
              <summary>Character & paragraph</summary>
              <div>
                <label>
                  Type mode
                  <select
                    aria-label="Text layer mode"
                    value={textParagraph ? 'paragraph' : 'point'}
                    onChange={(event) =>
                      setTextParagraph(event.target.value === 'paragraph')
                    }
                  >
                    <option value="point">Point text</option>
                    <option value="paragraph">Paragraph text</option>
                  </select>
                </label>
                {textParagraph && (
                  <label>
                    Paragraph width
                    <input
                      aria-label="Paragraph width"
                      type="number"
                      min="40"
                      max={doc.w}
                      value={textWidth}
                      onChange={(event) =>
                        setTextWidth(
                          Math.max(
                            40,
                            Math.min(doc.w, +event.target.value || 40),
                          ),
                        )
                      }
                    />
                  </label>
                )}
                <label>
                  Font
                  <select
                    aria-label="Font family"
                    value={fontFamily}
                    onChange={(event) => setFontFamily(event.target.value)}
                  >
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Verdana">Verdana</option>
                    <option value="system-ui">System UI</option>
                  </select>
                </label>
                <label>
                  Weight
                  <select
                    aria-label="Font weight"
                    value={fontWeight}
                    onChange={(event) => setFontWeight(+event.target.value)}
                  >
                    {[300, 400, 500, 600, 700, 800, 900].map((weight) => (
                      <option key={weight} value={weight}>
                        {weight}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tracking
                  <input
                    aria-label="Text tracking"
                    type="number"
                    min="-20"
                    max="100"
                    value={textTracking}
                    onChange={(event) =>
                      setTextTracking(+event.target.value || 0)
                    }
                  />
                </label>
                <label>
                  Leading
                  <input
                    aria-label="Text leading"
                    type="number"
                    min="0.5"
                    max="4"
                    step="0.1"
                    value={textLeading}
                    onChange={(event) =>
                      setTextLeading(
                        Math.max(0.5, Math.min(4, +event.target.value || 1.2)),
                      )
                    }
                  />
                </label>
                <label>
                  Baseline shift
                  <input
                    aria-label="Text baseline shift"
                    type="number"
                    min="-200"
                    max="200"
                    value={textBaseline}
                    onChange={(event) =>
                      setTextBaseline(+event.target.value || 0)
                    }
                  />
                </label>
                <label>
                  Alignment
                  <select
                    aria-label="Paragraph alignment"
                    value={textAlign}
                    onChange={(event) =>
                      setTextAlign(event.target.value as typeof textAlign)
                    }
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                    <option value="justify">Justify</option>
                  </select>
                </label>
                <label>
                  Warp
                  <input
                    aria-label="Text warp"
                    type="number"
                    min="-200"
                    max="200"
                    value={textWarp}
                    onChange={(event) => setTextWarp(+event.target.value || 0)}
                  />
                </label>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={textKerning}
                    onChange={(event) => setTextKerning(event.target.checked)}
                  />
                  Kerning
                </label>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={textOnPath}
                    onChange={(event) => setTextOnPath(event.target.checked)}
                  />
                  Text on path
                </label>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={textSmallCaps}
                    onChange={(event) => setTextSmallCaps(event.target.checked)}
                  />
                  OpenType small caps
                </label>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={textLigatures}
                    onChange={(event) => setTextLigatures(event.target.checked)}
                  />
                  OpenType ligatures
                </label>
                <div className="brush-preset-actions">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={updateSelectedText}
                  >
                    Update selected text
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={convertTextToShapes}
                  >
                    Convert to shapes
                  </Button>
                </div>
              </div>
            </details>
          </>
        )}
        {tool === 'crop' && (
          <Button size="sm" onClick={cropToSelection} disabled={!selection}>
            Apply crop
          </Button>
        )}
        <span className="editing-pill">
          Editing:{' '}
          {editing === 'mask'
            ? 'Layer mask'
            : active?.kind === 'adjustment'
              ? 'Adjustment layer'
              : active?.kind === 'group'
                ? 'Layer group'
                : 'Layer pixels'}
        </span>
        <span className="options-hint">
          {active?.locked
            ? 'Layer locked'
            : tool === 'lasso' || tool === 'path'
              ? 'Click points · double-click or Enter to close'
              : tool === 'clone'
                ? 'Option/Alt-click source, then paint'
                : tool === 'eyedropper'
                  ? 'Click the canvas to sample color'
                  : tool === 'brush'
                    ? '[ ] size · paint directly'
                    : tool === 'move'
                      ? 'Drag layer · use handles to transform'
                      : 'Drag on the canvas'}
        </span>
      </section>
      {['marquee', 'lasso', 'smart'].includes(tool) && (
        <section
          className="advanced-options"
          aria-label="Selection tool options"
        >
          {tool === 'marquee' && (
            <label>
              Marquee
              <select
                aria-label="Marquee shape"
                value={selectionShape}
                onChange={(e) =>
                  setSelectionShape(e.target.value as typeof selectionShape)
                }
              >
                <option value="rectangle">Rectangular</option>
                <option value="ellipse">Elliptical</option>
                <option value="row">Single row</option>
                <option value="column">Single column</option>
              </select>
            </label>
          )}
          {tool === 'lasso' && (
            <label>
              Lasso
              <select
                aria-label="Lasso mode"
                value={lassoMode}
                onChange={(e) => {
                  setLassoMode(e.target.value as typeof lassoMode);
                  polygonDraft.current = [];
                  setDraftPoints([]);
                }}
              >
                <option value="freehand">Freehand</option>
                <option value="polygonal">Polygonal</option>
                <option value="magnetic">Magnetic</option>
              </select>
            </label>
          )}
          {tool === 'smart' && (
            <>
              <label>
                Mode
                <select
                  aria-label="Selection intelligence mode"
                  value={smartMode}
                  onChange={(e) =>
                    setSmartMode(e.target.value as typeof smartMode)
                  }
                >
                  <option value="wand">Magic Wand</option>
                  <option value="quick">Quick Selection</option>
                  <option value="object">Object Selection</option>
                </select>
              </label>
              <label>
                Tolerance <strong>{magicTolerance}</strong>
                <Slider
                  aria-label="Magic Wand tolerance"
                  className="option-slider"
                  min={0}
                  max={255}
                  value={magicTolerance}
                  onValueChange={(v) => setMagicTolerance(sliderNumber(v))}
                />
              </label>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={magicContiguous}
                  onChange={(e) => setMagicContiguous(e.target.checked)}
                />
                Contiguous
              </label>
            </>
          )}
          <Button
            size="sm"
            variant={quickMask ? 'default' : 'ghost'}
            onClick={toggleQuickMask}
          >
            {quickMask ? 'Exit Quick Mask' : 'Quick Mask'} · Q
          </Button>
        </section>
      )}
      {(active?.hasMask || active?.vectorMask) && (
        <section
          className="advanced-options mask-option-strip"
          aria-label="Active mask options"
        >
          {active.hasMask && (
            <>
              <label>
                Mask feather <strong>{active.maskFeather ?? 0}px</strong>
                <Slider
                  aria-label="Mask feather"
                  className="option-slider"
                  min={0}
                  max={250}
                  value={active.maskFeather ?? 0}
                  onValueChange={(v) =>
                    patchLayer(active.id, { maskFeather: sliderNumber(v) })
                  }
                  onValueCommitted={() => snapshot('Mask feather')}
                />
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  patchLayer(
                    active.id,
                    { maskLinked: active.maskLinked === false },
                    active.maskLinked === false
                      ? 'Link layer mask'
                      : 'Unlink layer mask',
                  )
                }
              >
                {active.maskLinked === false ? 'Link mask' : 'Unlink mask'}
              </Button>
            </>
          )}
          {active.vectorMask && (
            <Button size="sm" variant="ghost" onClick={removeVectorMask}>
              Remove vector mask
            </Button>
          )}
        </section>
      )}
      {tool === 'shape' && (
        <section className="advanced-options" aria-label="Shape options">
          <label>
            Shape
            <select
              aria-label="Shape kind"
              value={shapeKind}
              onChange={(event) =>
                setShapeKind(event.target.value as typeof shapeKind)
              }
            >
              <option value="rectangle">Rectangle</option>
              <option value="ellipse">Ellipse</option>
              <option value="polygon">Polygon</option>
            </select>
          </label>
          {shapeKind === 'rectangle' && (
            <label>
              Corner radius
              <input
                className="number-option compact-number"
                aria-label="Rectangle corner radius"
                type="number"
                min="0"
                max="500"
                value={shapeRadius}
                onChange={(event) =>
                  setShapeRadius(
                    Math.max(0, Math.min(500, +event.target.value || 0)),
                  )
                }
              />
              px
            </label>
          )}
          {shapeKind === 'polygon' && (
            <label>
              Sides
              <input
                className="number-option compact-number"
                aria-label="Polygon sides"
                type="number"
                min="3"
                max="24"
                value={polygonSides}
                onChange={(event) =>
                  setPolygonSides(
                    Math.max(3, Math.min(24, +event.target.value || 3)),
                  )
                }
              />
            </label>
          )}
          <label className="inline-check">
            <input
              type="checkbox"
              checked={shapeFill}
              onChange={(event) => setShapeFill(event.target.checked)}
            />
            Fill with foreground
          </label>
          <span>
            {shapeFill
              ? 'Background color outlines the shape'
              : 'Foreground color outlines the shape'}
          </span>
        </section>
      )}
      {tool === 'fill' && (
        <section className="advanced-options" aria-label="Paint Bucket options">
          <label>
            Tolerance <strong>{fillTolerance}</strong>
            <Slider
              aria-label="Paint Bucket tolerance"
              className="option-slider"
              min={0}
              max={255}
              value={fillTolerance}
              onValueChange={(v) => setFillTolerance(sliderNumber(v))}
            />
          </label>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={fillContiguous}
              onChange={(e) => setFillContiguous(e.target.checked)}
            />
            Contiguous
          </label>
          <span>Click a color region to fill</span>
        </section>
      )}
      {tool === 'gradient' && (
        <section className="advanced-options" aria-label="Gradient options">
          <label>
            Midpoint <strong>{gradientMidpoint}%</strong>
            <Slider
              aria-label="Gradient midpoint"
              className="option-slider"
              min={1}
              max={99}
              value={gradientMidpoint}
              onValueChange={(v) => setGradientMidpoint(sliderNumber(v))}
            />
          </label>
          <span>Foreground → Background</span>
        </section>
      )}
      {quickMask && (
        <Button className="quick-mask-exit" size="sm" onClick={toggleQuickMask}>
          Exit Quick Mask · Q
        </Button>
      )}
      <Button
        className="history-snapshot-button"
        size="sm"
        variant="secondary"
        title="Save the complete current document state"
        onClick={createHistorySnapshot}
      >
        Save snapshot
      </Button>
      {selection &&
        active &&
        !active.vectorMask &&
        active.kind !== 'group' &&
        active.kind !== 'adjustment' && (
          <Button
            className="vector-mask-add"
            size="sm"
            variant="secondary"
            onClick={addVectorMask}
          >
            Add vector mask
          </Button>
        )}
      {selection && (
        <section className="selection-refine" aria-label="Selection refinement">
          <label>
            Combine
            <select
              aria-label="Selection combine mode"
              value={selectionMode}
              onChange={(e) =>
                setSelectionMode(e.target.value as typeof selectionMode)
              }
            >
              <option value="replace">New</option>
              <option value="add">Add</option>
              <option value="subtract">Subtract</option>
              <option value="intersect">Intersect</option>
            </select>
          </label>
          <label>
            Radius
            <input
              aria-label="Selection refinement radius"
              type="number"
              min="1"
              max="20"
              value={selectionRadius}
              onChange={(e) =>
                setSelectionRadius(
                  Math.max(1, Math.min(20, +e.target.value || 1)),
                )
              }
            />
          </label>
          <button onClick={() => refineSelection('invert')}>Invert</button>
          <button onClick={() => refineSelection('expand')}>Expand</button>
          <button onClick={() => refineSelection('contract')}>Contract</button>
          <button onClick={() => refineSelection('smooth')}>Smooth</button>
          <button onClick={() => refineSelection('feather')}>Feather</button>
          <button onClick={() => refineSelection('border')}>Border</button>
          <button onClick={selectColorRange}>Color Range</button>
          <button onClick={aiSelectSubject}>Select Subject</button>
        </section>
      )}
      <div
        className={`workspace dock-${preferences.layout.side}${panelsHidden ? ' panels-hidden' : ''}`}
        style={{
          gridTemplateColumns:
            preferences.layout.side === 'left'
              ? `54px ${preferences.layout.width}px minmax(0,1fr)`
              : `54px minmax(0,1fr) ${preferences.layout.width}px`,
        }}
      >
        <aside className="tool-rail" aria-label="Tools">
          {toolItems.map(({ id, label, key, icon: Icon }) => (
            <Button
              key={id}
              variant="ghost"
              size="icon-lg"
              className={tool === id ? 'tool-button active' : 'tool-button'}
              aria-label={label}
              title={`${label} · ${(preferences.shortcuts[id] ?? key).toUpperCase()}`}
              onClick={() => setTool(id)}
            >
              <Icon />
            </Button>
          ))}
          <div
            className="color-stack"
            aria-label="Foreground and background colors"
          >
            <button
              aria-label="Swap foreground and background colors"
              title="Swap colors"
              onClick={() => {
                setColor(backgroundColor);
                setBackgroundColor(color);
              }}
              style={{ background: color }}
            />
            <button
              aria-label="Reset foreground and background colors"
              title="Reset colors"
              onClick={() => {
                setColor('#000000');
                setBackgroundColor('#ffffff');
              }}
              style={{ background: backgroundColor }}
            />
          </div>
        </aside>
        <section className="canvas-area">
          <div className="document-tabs">
            {documents.map((item) => (
              <div
                key={item.id}
                className={
                  item.id === activeDocumentId
                    ? 'document-tab active'
                    : 'document-tab'
                }
              >
                <button
                  className="tab-main"
                  onClick={() => switchDocument(item.id)}
                  onDoubleClick={() => renameDocument(item.id)}
                  title="Double-click to rename"
                >
                  <span
                    className={
                      (item.id === activeDocumentId ? saved : item.saved)
                        ? 'saved'
                        : 'unsaved'
                    }
                  />
                  {item.id === activeDocumentId ? fileName : item.name}
                  {item.id === activeDocumentId && (
                    <span className="tab-meta"> @ {zoom}%</span>
                  )}
                </button>
                <button
                  className="tab-close"
                  aria-label={`Close ${item.name}`}
                  title="Close tab"
                  onClick={() => closeDocument(item.id)}
                >
                  <X />
                </button>
              </div>
            ))}
            <button
              className="new-document-tab"
              aria-label="New document tab"
              title="New document · ⌘N"
              onClick={makeBlankDocument}
            >
              <Plus />
            </button>
          </div>
          <CanvasViewport
            ref={viewportRef}
            w={doc.w}
            h={doc.h}
            zoom={zoom}
            onZoom={setZoom}
            view={view}
            onView={updateView}
            tool={tool}
          >
            <canvas
              ref={displayRef}
              width={doc.w}
              height={doc.h}
              onPointerDown={begin}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              onDoubleClick={() => {
                if (tool === 'lasso' || tool === 'path') {
                  polygonDraft.current = polygonDraft.current.slice(0, -1);
                  finishPolygon(tool);
                }
              }}
            />
            {selection && !selectionPath && (
              <div className="selection-box" style={selectionStyle} />
            )}{' '}
            {dragRect && <div className="drag-box" style={dragStyle} />}{' '}
            {(selectionPath || draftPoints.length > 0) && (
              <svg
                className="polygon-overlay"
                viewBox={`0 0 ${doc.w} ${doc.h}`}
                preserveAspectRatio="none"
              >
                <polygon
                  points={polygonPoints}
                  className={selectionPath ? 'closed' : 'draft'}
                />
                {(selectionPath ?? draftPoints).map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={Math.max(3, (5 / zoom) * 100)}
                  />
                ))}
              </svg>
            )}
            {tool === 'move' &&
              active &&
              !isLocked(active.id) &&
              transformStyle && (
                <div className="transform-box" style={transformStyle}>
                  <button
                    className="transform-handle nw"
                    aria-label="Scale from top left"
                    onPointerDown={(e) => beginTransform('scale', e)}
                  />
                  <button
                    className="transform-handle ne"
                    aria-label="Scale from top right"
                    onPointerDown={(e) => beginTransform('scale', e)}
                  />
                  <button
                    className="transform-handle sw"
                    aria-label="Scale from bottom left"
                    onPointerDown={(e) => beginTransform('scale', e)}
                  />
                  <button
                    className="transform-handle se"
                    aria-label="Scale from bottom right"
                    onPointerDown={(e) => beginTransform('scale', e)}
                  />
                  <button
                    className="rotate-handle"
                    aria-label="Rotate layer"
                    title="Drag to rotate"
                    onPointerDown={(e) => beginTransform('rotate', e)}
                  />
                </div>
              )}
          </CanvasViewport>
        </section>
        <aside className="panel-rail">
          <section className="panel compact" hidden={!preferences.layout.smart}>
            <div className="panel-title">
              <span>Smart tools</span>
              <Sparkles />
            </div>
            <div className="smart-grid">
              <Button
                variant="secondary"
                size="sm"
                onClick={aiRemoveBackground}
                disabled={aiBusy}
              >
                <Scissors />
                {aiBusy ? 'Working…' : 'AI remove background'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => filter('brightness')}
              >
                <Sparkles />
                Auto enhance
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => filter('sharpen')}
              >
                <Focus />
                Sharpen
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTool('smart');
                  setSmartMode('quick');
                }}
              >
                <ScanSearch />
                Quick Selection
              </Button>
            </div>
            <p className="smart-note">
              AI runs in your browser. The free model downloads once; no image
              is uploaded by LibreLayer.
            </p>
          </section>
          <section className="panel grow">
            <DockWorkspace
              positions={preferences.layout.panels ?? {}}
              onChange={(panels) =>
                updatePreferences({
                  ...preferences,
                  layout: { ...preferences.layout, panels },
                })
              }
              panels={[
                {
                  id: 'layers',
                  title: 'Layers',
                  content: (
                    <div className="panel-content">
                      <div className="layer-controls">
                        <Select
                          value={active?.blend || 'source-over'}
                          onValueChange={(v) =>
                            patchSelectedLayers(
                              { blend: v as BlendMode },
                              'Selected layer blend mode',
                            )
                          }
                          disabled={
                            !active ||
                            isLocked(active.id) ||
                            active.kind === 'group' ||
                            active.kind === 'adjustment'
                          }
                        >
                          <SelectTrigger size="sm">
                            <Blend />
                            <SelectValue>
                              {blendLabels[active?.blend || 'source-over']}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(blendLabels) as BlendMode[]).map(
                              (x) => (
                                <SelectItem key={x} value={x}>
                                  {blendLabels[x]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        <label>
                          Active layer opacity {active?.opacity ?? 100}%
                        </label>
                        <Slider
                          disabled={
                            !active ||
                            isLocked(active.id) ||
                            active.kind === 'group'
                          }
                          aria-label="Layer opacity"
                          min={0}
                          max={100}
                          value={active?.opacity ?? 100}
                          onValueChange={(v) =>
                            patchSelectedLayers({ opacity: sliderNumber(v) })
                          }
                          onValueCommitted={() =>
                            snapshot('Selected layer opacity')
                          }
                        />
                      </div>
                      <div className="layer-fill">
                        <label>Fill {active?.fill ?? 100}%</label>
                        <Slider
                          aria-label="Layer fill"
                          disabled={
                            !active ||
                            isLocked(active.id) ||
                            active.kind === 'group' ||
                            active.kind === 'adjustment'
                          }
                          min={0}
                          max={100}
                          value={active?.fill ?? 100}
                          onValueChange={(v) =>
                            patchSelectedLayers({ fill: sliderNumber(v) })
                          }
                          onValueCommitted={() =>
                            snapshot('Selected layer fill')
                          }
                        />
                      </div>
                      <div className="layer-search">
                        <input
                          aria-label="Search layers"
                          placeholder="Search layers…"
                          value={layerQuery}
                          onChange={(e) => setLayerQuery(e.target.value)}
                        />
                        <select
                          aria-label="Filter layer type"
                          value={layerKind}
                          onChange={(e) => setLayerKind(e.target.value)}
                        >
                          <option value="all">All types</option>
                          <option value="pixel">Pixels</option>
                          <option value="group">Groups</option>
                          <option value="adjustment">Adjustments</option>
                        </select>
                        <select
                          aria-label="Filter layer state"
                          value={layerState}
                          onChange={(e) => setLayerState(e.target.value)}
                        >
                          {['all', 'visible', 'hidden', 'locked', 'linked'].map(
                            (s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ),
                          )}
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setLayerQuery('');
                            setLayerKind('all');
                            setLayerState('all');
                          }}
                        >
                          Clear filters
                        </Button>
                      </div>
                      <div className="selection-summary">
                        {selectedIds.length} selected · Shift range · Ctrl/⌘
                        toggle
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            selectMany(visibleLayers.map((l) => l.id))
                          }
                        >
                          Select shown
                        </Button>
                      </div>
                      {filtering && (
                        <p className="layer-filter-hint">
                          Clear filters to drag layers. {visibleLayers.length}{' '}
                          matching layers.
                        </p>
                      )}
                      <div
                        className="layers-list"
                        role="listbox"
                        aria-label="Layers"
                        aria-multiselectable="true"
                      >
                        {visibleLayers.map((layer) => (
                          <div
                            key={layer.id}
                            role="option"
                            aria-selected={selectedIds.includes(layer.id)}
                            draggable={!filtering && !isLocked(layer.id)}
                            data-drop={
                              dropTarget?.id === layer.id
                                ? dropTarget.edge
                                : undefined
                            }
                            onDragStart={(e) => {
                              if (filtering || isLocked(layer.id)) {
                                e.preventDefault();
                                return;
                              }
                              const ids = selectedIdsRef.current.includes(
                                layer.id,
                              )
                                ? selectedIdsRef.current
                                : [layer.id];
                              if (
                                !ids.includes(selectedRef.current) ||
                                !selectedIdsRef.current.includes(layer.id)
                              )
                                select(layer.id);
                              e.dataTransfer.setData(
                                'text/x-pixelstudio-layers',
                                JSON.stringify({
                                  document: activeDocumentRef.current,
                                  ids,
                                }),
                              );
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragOver={(e) => {
                              if (
                                !e.dataTransfer.types.includes(
                                  'text/x-pixelstudio-layers',
                                ) ||
                                filtering
                              )
                                return;
                              e.preventDefault();
                              e.stopPropagation();
                              const r = e.currentTarget.getBoundingClientRect(),
                                fraction = (e.clientY - r.top) / r.height;
                              setDropTarget({
                                id: layer.id,
                                edge:
                                  layer.kind === 'group' &&
                                  fraction > 0.3 &&
                                  fraction < 0.7
                                    ? 'inside'
                                    : fraction < 0.5
                                      ? 'before'
                                      : 'after',
                              });
                            }}
                            onDragEnd={() => setDropTarget(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                const payload = JSON.parse(
                                  e.dataTransfer.getData(
                                    'text/x-pixelstudio-layers',
                                  ),
                                );
                                if (
                                  payload.document ===
                                    activeDocumentRef.current &&
                                  Array.isArray(payload.ids) &&
                                  !filtering
                                ) {
                                  const r =
                                      e.currentTarget.getBoundingClientRect(),
                                    fraction = (e.clientY - r.top) / r.height;
                                  dropLayers(
                                    payload.ids,
                                    layer.id,
                                    layer.kind === 'group' &&
                                      fraction > 0.3 &&
                                      fraction < 0.7
                                      ? 'inside'
                                      : fraction < 0.5
                                        ? 'before'
                                        : 'after',
                                  );
                                }
                              } catch {}
                              setDropTarget(null);
                            }}
                            data-layer-id={layer.id}
                            data-parent-id={layer.parentId ?? ''}
                            data-locked={isLocked(layer.id)}
                            style={{
                              paddingLeft:
                                7 + ancestors(layers, layer.id).length * 14,
                              borderLeft: `3px solid ${layer.colorLabel || 'transparent'}`,
                            }}
                            className={`${selectedIds.includes(layer.id) ? 'layer-row selected' : 'layer-row'}${layer.parentId ? ' child-layer' : ''}`}
                            onClick={(e) => clickLayer(layer.id, e)}
                          >
                            <input
                              type="checkbox"
                              aria-label={`Select ${layer.name}`}
                              checked={selectedIds.includes(layer.id)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() =>
                                clickLayer(layer.id, {
                                  shiftKey: false,
                                  ctrlKey: true,
                                  metaKey: false,
                                })
                              }
                            />
                            <button
                              aria-label={
                                layer.visible ? 'Hide layer' : 'Show layer'
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                patchLayer(
                                  layer.id,
                                  { visible: !layer.visible },
                                  'Layer visibility',
                                );
                              }}
                            >
                              {layer.visible ? <Eye /> : <EyeOff />}
                            </button>
                            <div
                              className={`layer-thumb ${layer.kind || 'pixel'}`}
                            >
                              {layer.kind === 'group' ? (
                                <FolderPlus />
                              ) : layer.kind === 'adjustment' ? (
                                <SlidersHorizontal />
                              ) : (
                                <Layers />
                              )}
                            </div>
                            <div className="layer-name">
                              <strong
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  select(layer.id);
                                  const name = window
                                    .prompt('Layer name', layer.name)
                                    ?.trim();
                                  if (name)
                                    patchLayer(
                                      layer.id,
                                      { name },
                                      'Rename layer',
                                    );
                                }}
                              >
                                {layer.kind === 'group' && (
                                  <button
                                    className="group-toggle"
                                    aria-label={
                                      layer.collapsed
                                        ? 'Expand group'
                                        : 'Collapse group'
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGroup(layer.id);
                                    }}
                                  >
                                    {layer.collapsed ? (
                                      <ChevronRight />
                                    ) : (
                                      <ChevronDown />
                                    )}
                                  </button>
                                )}
                                {layer.clipping ? '↳ ' : ''}
                                {layer.linkId ? '↔ ' : ''}
                                {layer.name}
                                {isLocked(layer.id) ? ' · locked' : ''}
                              </strong>
                              <small>
                                {layer.kind === 'group'
                                  ? 'Group'
                                  : layer.kind === 'adjustment'
                                    ? 'Adjustment layer'
                                    : `${blendLabels[layer.blend]} · ${layer.opacity}%`}
                              </small>
                            </div>
                            {layer.hasMask && (
                              <button
                                className={
                                  editing === 'mask' && layer.id === selectedId
                                    ? 'mask-thumb active'
                                    : 'mask-thumb'
                                }
                                title="Edit mask"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  select(layer.id);
                                  setEditing('mask');
                                }}
                              >
                                <Mask />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {active?.smartObject && (
                        <>
                          {active.smartObject.raw && (
                            <div className="raw-smart-summary">
                              <div>
                                <strong>
                                  {active.smartObject.raw.bitDepth}-bit RAW
                                  Smart Object
                                </strong>
                                <small>
                                  Scene-linear master ·{' '}
                                  {active.smartObject.raw.width} ×{' '}
                                  {active.smartObject.raw.height}
                                </small>
                              </div>
                              <button onClick={() => void editSmartContents()}>
                                Edit Camera Raw
                              </button>
                            </div>
                          )}
                          <SmartFilterStack
                            filters={active.smartObject.filters}
                            disabled={isLocked(active.id)}
                            filterMask={active.smartObject.filterMask}
                            blendOptions={(
                              Object.keys(blendLabels) as BlendMode[]
                            )
                              .filter((value) => !(value in extraBlends))
                              .map((value) => ({
                                value,
                                label: blendLabels[value],
                              }))}
                            onAdd={addSmartFilter}
                            onChange={(id, patch) =>
                              patchSmartFilter(
                                id,
                                patch as Partial<SmartFilter>,
                              )
                            }
                            onCommit={(label) => snapshot(label)}
                            onMove={moveSmartFilter}
                            onRemove={removeSmartFilter}
                            onEditMask={() => {
                              if (
                                active.smartObject?.filterMask &&
                                active.hasMask
                              )
                                setEditing('mask');
                              else addSmartFilterMask();
                            }}
                          />
                        </>
                      )}
                      <div className="layer-organize">
                        <details className="layer-comps">
                          <summary>Layer Comps · {layerComps.length}</summary>
                          <button onClick={saveLayerComp}>
                            Save current state
                          </button>
                          {layerComps.length === 0 ? (
                            <p>No saved layer comps.</p>
                          ) : (
                            layerComps.map((comp) => (
                              <div key={comp.id}>
                                <button
                                  title={comp.comment || 'Apply layer comp'}
                                  onClick={() => applyLayerComp(comp)}
                                >
                                  <span>{comp.name}</span>
                                  {comp.comment && (
                                    <small>{comp.comment}</small>
                                  )}
                                </button>
                                <button
                                  aria-label={`Update comp ${comp.name}`}
                                  title="Update from current layers"
                                  onClick={() => updateLayerComp(comp.id)}
                                >
                                  ↻
                                </button>
                                <button
                                  aria-label={`Rename comp ${comp.name}`}
                                  title="Rename and comment"
                                  onClick={() => renameLayerComp(comp.id)}
                                >
                                  ✎
                                </button>
                                <button
                                  aria-label={`Delete comp ${comp.name}`}
                                  onClick={() => removeLayerComp(comp.id)}
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          )}
                        </details>
                        <div className="property-buttons alignment-buttons">
                          <button onClick={() => alignSelected('left')}>
                            Align L
                          </button>
                          <button onClick={() => alignSelected('hcenter')}>
                            Center H
                          </button>
                          <button onClick={() => alignSelected('right')}>
                            Align R
                          </button>
                          <button onClick={() => alignSelected('top')}>
                            Align T
                          </button>
                          <button onClick={() => alignSelected('vcenter')}>
                            Center V
                          </button>
                          <button onClick={() => alignSelected('bottom')}>
                            Align B
                          </button>
                          <button
                            onClick={() => distributeSelected('horizontal')}
                          >
                            Distribute H
                          </button>
                          <button
                            onClick={() => distributeSelected('vertical')}
                          >
                            Distribute V
                          </button>
                          <button onClick={autoAlign}>Auto-align</button>
                        </div>
                        {active?.hasMask && (
                          <div className="mask-controls">
                            <label>
                              Mask density {active.maskDensity ?? 100}%
                            </label>
                            <Slider
                              aria-label="Mask density"
                              min={0}
                              max={100}
                              value={active.maskDensity ?? 100}
                              onValueChange={(v) =>
                                patchLayer(active.id, {
                                  maskDensity: sliderNumber(v),
                                })
                              }
                              onValueCommitted={() => snapshot('Mask density')}
                            />
                            <div className="property-buttons">
                              <button onClick={applyMask}>Apply mask</button>
                              <button onClick={removeMask}>Delete mask</button>
                              <button
                                onClick={() =>
                                  patchLayer(
                                    active.id,
                                    { maskEnabled: !active.maskEnabled },
                                    'Toggle mask',
                                  )
                                }
                              >
                                {active.maskEnabled
                                  ? 'Disable mask'
                                  : 'Enable mask'}
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="property-buttons">
                          <button onClick={linkSelected}>Link selected</button>
                          <button onClick={unlinkSelected}>
                            Unlink selected
                          </button>
                          <button onClick={toggleClipping}>
                            {active?.clipping
                              ? 'Release clipping'
                              : 'Clip to layer below'}
                          </button>
                        </div>
                        <BlendIfControls
                          value={active?.blendIf}
                          disabled={
                            !active ||
                            isLocked(active.id) ||
                            active.kind === 'group' ||
                            active.kind === 'adjustment'
                          }
                          onChange={(value) =>
                            active &&
                            patchLayer(
                              active.id,
                              { blendIf: value },
                              'Blend If',
                            )
                          }
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!active || isLocked(active.id)}
                          onClick={renameLayer}
                        >
                          Rename layer
                        </Button>
                        <label>
                          Color label
                          <select
                            aria-label="Layer color label"
                            value={active?.colorLabel || ''}
                            disabled={!active || isLocked(active.id)}
                            onChange={(e) =>
                              active &&
                              patchLayer(
                                active.id,
                                { colorLabel: e.target.value },
                                'Layer color label',
                              )
                            }
                          >
                            {[
                              ['None', ''],
                              ['Red', '#ef6666'],
                              ['Orange', '#eba74b'],
                              ['Yellow', '#dccc55'],
                              ['Green', '#63b97d'],
                              ['Blue', '#669cf0'],
                              ['Purple', '#b586df'],
                            ].map(([name, value]) => (
                              <option key={name} value={value}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Group
                          <select
                            aria-label="Layer parent group"
                            value={active?.parentId || ''}
                            disabled={!active || isLocked(active.id)}
                            onChange={(e) =>
                              moveIntoGroup(e.target.value || undefined)
                            }
                          >
                            <option value="">Document root</option>
                            {layers
                              .filter(
                                (l) =>
                                  l.kind === 'group' &&
                                  active &&
                                  !descendants(layers, active.id).some(
                                    (x) => x.id === l.id,
                                  ),
                              )
                              .map((l) => (
                                <option
                                  key={l.id}
                                  value={l.id}
                                  disabled={isLocked(l.id)}
                                >
                                  {'—'.repeat(ancestors(layers, l.id).length)}
                                  {l.name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <div className="property-buttons">
                          <button onClick={() => reorder(-1)}>Move up</button>
                          <button onClick={() => reorder(1)}>Move down</button>
                          <button onClick={ungroup}>Ungroup</button>
                        </div>
                      </div>
                      <div className="layer-actions">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="New pixel layer"
                          onClick={() => createLayer()}
                        >
                          <Plus />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="New group"
                          onClick={createGroup}
                        >
                          <FolderPlus />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="New adjustment layer"
                          onClick={createAdjustment}
                        >
                          <SlidersHorizontal />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Add mask"
                          onClick={addMask}
                        >
                          <Mask />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={
                            active?.locked ? 'Unlock layer' : 'Lock layer'
                          }
                          title={active?.locked ? 'Unlock layer' : 'Lock layer'}
                          onClick={() =>
                            active &&
                            patchLayer(
                              active.id,
                              { locked: !active.locked },
                              active.locked ? 'Unlock layer' : 'Lock layer',
                            )
                          }
                        >
                          <span className="action-glyph">
                            {active?.locked ? '◉' : '◎'}
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Delete"
                          onClick={removeLayer}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'properties',
                  title: 'Properties',
                  content: (
                    <div className="panel-content properties-panel">
                      <fieldset disabled={!!active && isLocked(active.id)}>
                        {active?.kind === 'group' ? (
                          <div className="group-properties">
                            <FolderPlus />
                            <strong>Layer Group</strong>
                            <p>
                              Collapse the group in Layers, or hide it to hide
                              every layer inside.
                            </p>
                          </div>
                        ) : (
                          <>
                            {active?.kind !== 'adjustment' && (
                              <>
                                <div className="property-heading">
                                  <strong>Transform</strong>
                                  <button onClick={resetTransform}>
                                    Reset
                                  </button>
                                </div>
                                <div className="transform-grid">
                                  <label>
                                    X
                                    <input
                                      type="number"
                                      value={active?.x ?? 0}
                                      onChange={(e) =>
                                        setTransformAxis('x', +e.target.value)
                                      }
                                      onBlur={() =>
                                        active && snapshot('Transform layer')
                                      }
                                    />
                                  </label>
                                  <label>
                                    Y
                                    <input
                                      type="number"
                                      value={active?.y ?? 0}
                                      onChange={(e) =>
                                        setTransformAxis('y', +e.target.value)
                                      }
                                      onBlur={() =>
                                        active && snapshot('Transform layer')
                                      }
                                    />
                                  </label>
                                </div>
                                <label>
                                  Rotation <span>{active?.rotation ?? 0}°</span>
                                </label>
                                <Slider
                                  aria-label="Layer rotation"
                                  min={-180}
                                  max={180}
                                  value={active?.rotation ?? 0}
                                  onValueChange={(v) =>
                                    setTransformValue(
                                      'rotation',
                                      sliderNumber(v),
                                    )
                                  }
                                  onValueCommitted={() =>
                                    active && snapshot('Rotate layer')
                                  }
                                />
                                <label>
                                  Scale{' '}
                                  <span>
                                    {Math.round((active?.scaleX ?? 1) * 100)}%
                                  </span>
                                </label>
                                <Slider
                                  aria-label="Layer scale"
                                  min={10}
                                  max={300}
                                  value={Math.abs(active?.scaleX ?? 1) * 100}
                                  onValueChange={(v) => {
                                    if (!active) return;
                                    const n = sliderNumber(v) / 100;
                                    setTransformValue(
                                      'scaleX',
                                      (active.scaleX ?? 1) < 0 ? -n : n,
                                    );
                                    setTransformValue(
                                      'scaleY',
                                      (active.scaleY ?? 1) < 0 ? -n : n,
                                    );
                                  }}
                                  onValueCommitted={() =>
                                    active && snapshot('Scale layer')
                                  }
                                />
                                <div className="property-buttons">
                                  <button
                                    onClick={() =>
                                      active &&
                                      patchSelectedLayers(
                                        { scaleX: -(active.scaleX ?? 1) },
                                        'Flip selected horizontal',
                                      )
                                    }
                                  >
                                    Flip H
                                  </button>
                                  <button
                                    onClick={() =>
                                      active &&
                                      patchSelectedLayers(
                                        { scaleY: -(active.scaleY ?? 1) },
                                        'Flip selected vertical',
                                      )
                                    }
                                  >
                                    Flip V
                                  </button>
                                  <button
                                    onClick={() =>
                                      active &&
                                      patchSelectedLayers(
                                        {
                                          rotation: (active.rotation ?? 0) + 90,
                                        },
                                        'Rotate selected layers',
                                      )
                                    }
                                  >
                                    Rotate 90°
                                  </button>
                                </div>
                              </>
                            )}
                            <div className="property-heading">
                              <strong>
                                {active?.kind === 'adjustment'
                                  ? 'Adjustment layer'
                                  : 'Layer adjustments'}
                              </strong>
                              <button onClick={resetAdjustments}>Reset</button>
                            </div>
                            {active?.kind === 'adjustment' ? (
                              <>
                                <Histogram
                                  sourceCanvas={displayRef.current}
                                  revision={layers}
                                />
                                <AdjustmentPresets
                                  current={active.precisionAdjustment ?? {}}
                                  onPreview={(precisionAdjustment) =>
                                    patchLayer(active.id, {
                                      precisionAdjustment,
                                    })
                                  }
                                  onCommit={(name) =>
                                    snapshot(`${name} adjustment preset`)
                                  }
                                />
                                <LevelsControl
                                  black={Number(
                                    active.precisionAdjustment?.levelsBlack ??
                                      0,
                                  )}
                                  gamma={Number(
                                    active.precisionAdjustment?.levelsGamma ??
                                      1,
                                  )}
                                  white={Number(
                                    active.precisionAdjustment?.levelsWhite ??
                                      255,
                                  )}
                                  onChange={updatePrecisionAdjustment}
                                  onCommit={() =>
                                    snapshot('Input levels adjustment')
                                  }
                                />
                                <p className="precision-adjustment-note">
                                  Combined floating-point recipe · editable
                                </p>
                                <ToneCurve
                                  adjustments={active.precisionAdjustment ?? {}}
                                  onChange={updatePrecisionAdjustment}
                                  onCommit={() =>
                                    snapshot('Tone curve adjustment')
                                  }
                                />
                                {(
                                  [
                                    [
                                      'Exposure',
                                      'exposure',
                                      -5,
                                      5,
                                      0.1,
                                      ' EV',
                                      0,
                                    ],
                                    [
                                      'Exposure gamma',
                                      'exposureGamma',
                                      0.1,
                                      3,
                                      0.05,
                                      '',
                                      1,
                                    ],
                                    [
                                      'Brightness',
                                      'brightness',
                                      -100,
                                      100,
                                      1,
                                      '',
                                      0,
                                    ],
                                    [
                                      'Contrast',
                                      'contrast',
                                      -100,
                                      100,
                                      1,
                                      '',
                                      0,
                                    ],
                                    ['Hue', 'hue', -180, 180, 1, '°', 0],
                                    [
                                      'Saturation',
                                      'saturation',
                                      -100,
                                      100,
                                      1,
                                      '',
                                      0,
                                    ],
                                    [
                                      'Vibrance',
                                      'vibrance',
                                      -100,
                                      100,
                                      1,
                                      '',
                                      0,
                                    ],
                                    [
                                      'Input black',
                                      'levelsBlack',
                                      0,
                                      254,
                                      1,
                                      '',
                                      0,
                                    ],
                                    [
                                      'Input white',
                                      'levelsWhite',
                                      1,
                                      255,
                                      1,
                                      '',
                                      255,
                                    ],
                                    [
                                      'Gamma',
                                      'levelsGamma',
                                      0.1,
                                      3,
                                      0.05,
                                      '',
                                      1,
                                    ],
                                    [
                                      'Shadow curve',
                                      'curveShadows',
                                      -100,
                                      100,
                                      1,
                                      '',
                                      0,
                                    ],
                                    [
                                      'Highlight curve',
                                      'curveHighlights',
                                      -100,
                                      100,
                                      1,
                                      '',
                                      0,
                                    ],
                                    [
                                      'Cyan / Red',
                                      'balanceCyanRed',
                                      -100,
                                      100,
                                      1,
                                      '',
                                      0,
                                    ],
                                    [
                                      'Magenta / Green',
                                      'balanceMagentaGreen',
                                      -100,
                                      100,
                                      1,
                                      '',
                                      0,
                                    ],
                                    [
                                      'Yellow / Blue',
                                      'balanceYellowBlue',
                                      -100,
                                      100,
                                      1,
                                      '',
                                      0,
                                    ],
                                  ] as const
                                ).map(
                                  ([
                                    label,
                                    key,
                                    min,
                                    max,
                                    step,
                                    suffix,
                                    fallback,
                                  ]) => {
                                    const current = Number(
                                      active.precisionAdjustment?.[key] ??
                                        fallback,
                                    );
                                    return (
                                      <div
                                        className="property-slider"
                                        key={key}
                                      >
                                        <label>
                                          {label}
                                          <span>
                                            {current}
                                            {suffix}
                                          </span>
                                        </label>
                                        <Slider
                                          aria-label={`Adjustment layer ${label.toLowerCase()}`}
                                          min={min}
                                          max={max}
                                          step={step}
                                          value={current}
                                          onValueChange={(next) =>
                                            updatePrecisionAdjustment(
                                              key,
                                              sliderNumber(next),
                                            )
                                          }
                                          onValueCommitted={() =>
                                            snapshot(`${label} adjustment`)
                                          }
                                        />
                                      </div>
                                    );
                                  },
                                )}
                                <label className="inline-check">
                                  <input
                                    type="checkbox"
                                    checked={
                                      active.precisionAdjustment?.blackWhite ??
                                      false
                                    }
                                    onChange={(event) => {
                                      updatePrecisionAdjustment(
                                        'blackWhite',
                                        event.target.checked,
                                      );
                                      snapshot('Black & White adjustment');
                                    }}
                                  />
                                  Black & White channel mix
                                </label>
                                <div className="photo-filter-properties">
                                  <label>
                                    Photo filter
                                    <input
                                      aria-label="Adjustment layer photo filter color"
                                      type="color"
                                      value={
                                        active.precisionAdjustment
                                          ?.photoFilter ?? '#ec8a32'
                                      }
                                      onChange={(event) =>
                                        updatePrecisionAdjustment(
                                          'photoFilter',
                                          event.target.value,
                                        )
                                      }
                                      onBlur={() =>
                                        snapshot('Photo filter color')
                                      }
                                    />
                                  </label>
                                  <div className="property-slider">
                                    <label>
                                      Filter density
                                      <span>
                                        {Number(
                                          active.precisionAdjustment
                                            ?.photoFilterDensity ?? 0,
                                        )}
                                        %
                                      </span>
                                    </label>
                                    <Slider
                                      aria-label="Adjustment layer photo filter density"
                                      min={0}
                                      max={100}
                                      value={Number(
                                        active.precisionAdjustment
                                          ?.photoFilterDensity ?? 0,
                                      )}
                                      onValueChange={(next) =>
                                        updatePrecisionAdjustment(
                                          'photoFilterDensity',
                                          sliderNumber(next),
                                        )
                                      }
                                      onValueCommitted={() =>
                                        snapshot('Photo filter density')
                                      }
                                    />
                                  </div>
                                </div>
                                {active.precisionAdjustment?.blackWhite &&
                                  (
                                    [
                                      ['Red mix', 'redMix', 30],
                                      ['Green mix', 'greenMix', 59],
                                      ['Blue mix', 'blueMix', 11],
                                    ] as const
                                  ).map(([label, key, fallback]) => {
                                    const current = Number(
                                      active.precisionAdjustment?.[key] ??
                                        fallback,
                                    );
                                    return (
                                      <div
                                        className="property-slider"
                                        key={key}
                                      >
                                        <label>
                                          {label}
                                          <span>{current}%</span>
                                        </label>
                                        <Slider
                                          aria-label={`Adjustment layer ${label.toLowerCase()}`}
                                          min={-200}
                                          max={200}
                                          value={current}
                                          onValueChange={(next) =>
                                            updatePrecisionAdjustment(
                                              key,
                                              sliderNumber(next),
                                            )
                                          }
                                          onValueCommitted={() =>
                                            snapshot(`${label} adjustment`)
                                          }
                                        />
                                      </div>
                                    );
                                  })}
                                <div className="property-slider">
                                  <label>
                                    Blur <span>{active.blur ?? 0}px</span>
                                  </label>
                                  <Slider
                                    aria-label="Adjustment layer blur"
                                    min={0}
                                    max={20}
                                    step={0.5}
                                    value={active.blur ?? 0}
                                    onValueChange={(next) =>
                                      patchLayer(active.id, {
                                        blur: sliderNumber(next),
                                      })
                                    }
                                    onValueCommitted={() =>
                                      snapshot('Blur adjustment')
                                    }
                                  />
                                </div>
                              </>
                            ) : (
                              (
                                [
                                  ['Brightness', 'brightness', 0, 200],
                                  ['Contrast', 'contrast', 0, 200],
                                  ['Saturation', 'saturation', 0, 200],
                                  ['Blur', 'blur', 0, 20],
                                ] as const
                              ).map(([label, key, min, max]) => (
                                <div className="property-slider" key={key}>
                                  <label>
                                    {label}
                                    <span>
                                      {active?.[key] ??
                                        (key === 'blur' ? 0 : 100)}
                                      {key === 'blur' ? 'px' : '%'}
                                    </span>
                                  </label>
                                  <Slider
                                    aria-label={`Layer ${label.toLowerCase()}`}
                                    min={min}
                                    max={max}
                                    step={key === 'blur' ? 0.5 : 1}
                                    value={
                                      active?.[key] ??
                                      (key === 'blur' ? 0 : 100)
                                    }
                                    onValueChange={(next) =>
                                      active &&
                                      patchLayer(active.id, {
                                        [key]: sliderNumber(next),
                                      })
                                    }
                                    onValueCommitted={() =>
                                      active && snapshot(`${label} adjustment`)
                                    }
                                  />
                                </div>
                              ))
                            )}
                          </>
                        )}
                      </fieldset>
                    </div>
                  ),
                },
                {
                  id: 'channels',
                  title: 'Channels',
                  content: (
                    <div className="panel-content channel-panel">
                      <div className="channel-list">
                        {(
                          ['rgb', 'red', 'green', 'blue', 'alpha'] as const
                        ).map((channel) => (
                          <button
                            key={channel}
                            className={channelView === channel ? 'active' : ''}
                            onClick={() => setChannelView(channel)}
                          >
                            <span className={`channel-chip ${channel}`} />
                            <strong>
                              {channel === 'rgb'
                                ? 'RGB Composite'
                                : channel[0].toUpperCase() + channel.slice(1)}
                            </strong>
                            <small>
                              {channelView === channel
                                ? 'Editing channel'
                                : 'Select to edit'}
                            </small>
                          </button>
                        ))}
                      </div>
                      <label className="inline-check channel-solo-toggle">
                        <input
                          type="checkbox"
                          checked={soloChannel}
                          disabled={channelView === 'rgb'}
                          onChange={(event) =>
                            setSoloChannel(event.target.checked)
                          }
                        />
                        Solo channel preview
                      </label>
                      {!canGradeActive ? (
                        <p className="channel-empty">
                          Select an unlocked pixel layer to colour grade it.
                        </p>
                      ) : (
                        <>
                          <section className="channel-grade-section">
                            <div className="channel-grade-heading">
                              <strong>
                                {channelView.toUpperCase()} levels
                              </strong>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const grade = resolveColorGrade(
                                    active.colorGrade,
                                  );
                                  grade.levels[channelView] =
                                    neutralChannelLevels();
                                  commitColorGrade(
                                    grade,
                                    `Reset ${channelView.toUpperCase()} levels`,
                                  );
                                }}
                              >
                                Reset channel
                              </Button>
                            </div>
                            {(
                              [
                                ['Input black', 'inputBlack', 0, 254, 1],
                                ['Input white', 'inputWhite', 1, 255, 1],
                                ['Gamma', 'gamma', 0.1, 9.99, 0.01],
                                ['Output black', 'outputBlack', 0, 255, 1],
                                ['Output white', 'outputWhite', 0, 255, 1],
                              ] as const
                            ).map(([label, key, min, max, step]) => (
                              <label
                                className="channel-grade-control"
                                key={key}
                              >
                                <span>{label}</span>
                                <input
                                  aria-label={`${channelView} ${label}`}
                                  type="number"
                                  min={min}
                                  max={max}
                                  step={step}
                                  value={
                                    activeColorGrade.levels[channelView][key]
                                  }
                                  onChange={(event) =>
                                    updateChannelLevel(key, +event.target.value)
                                  }
                                  onBlur={() =>
                                    snapshot(
                                      `${channelView.toUpperCase()} ${label}`,
                                    )
                                  }
                                />
                                <Slider
                                  aria-label={`${channelView} ${label} slider`}
                                  min={min}
                                  max={max}
                                  step={step}
                                  value={
                                    activeColorGrade.levels[channelView][key]
                                  }
                                  onValueChange={(next) =>
                                    updateChannelLevel(key, sliderNumber(next))
                                  }
                                  onValueCommitted={() =>
                                    snapshot(
                                      `${channelView.toUpperCase()} ${label}`,
                                    )
                                  }
                                />
                              </label>
                            ))}
                          </section>
                          <details className="channel-grade-section" open>
                            <summary>Colour grading</summary>
                            {(
                              [
                                ['Temperature', 'temperature'],
                                ['Tint', 'tint'],
                                ['Vibrance', 'vibrance'],
                              ] as const
                            ).map(([label, key]) => (
                              <label
                                className="channel-grade-control"
                                key={key}
                              >
                                <span>{label}</span>
                                <input
                                  aria-label={label}
                                  type="number"
                                  min="-100"
                                  max="100"
                                  value={activeColorGrade[key]}
                                  onChange={(event) =>
                                    updateGradeAmount(key, +event.target.value)
                                  }
                                  onBlur={() => snapshot(`Grade ${label}`)}
                                />
                                <Slider
                                  aria-label={`${label} slider`}
                                  min={-100}
                                  max={100}
                                  value={activeColorGrade[key]}
                                  onValueChange={(next) =>
                                    updateGradeAmount(key, sliderNumber(next))
                                  }
                                  onValueCommitted={() =>
                                    snapshot(`Grade ${label}`)
                                  }
                                />
                              </label>
                            ))}
                            {(
                              [
                                ['Shadows', 'shadows'],
                                ['Midtones', 'midtones'],
                                ['Highlights', 'highlights'],
                              ] as const
                            ).map(([label, range]) => (
                              <fieldset className="grade-range" key={range}>
                                <legend>{label}</legend>
                                {(
                                  [
                                    ['Red', 'red'],
                                    ['Green', 'green'],
                                    ['Blue', 'blue'],
                                  ] as const
                                ).map(([channelLabel, key]) => (
                                  <label
                                    className={`grade-offset ${key}`}
                                    key={key}
                                  >
                                    <span>{channelLabel}</span>
                                    <input
                                      aria-label={`${label} ${channelLabel}`}
                                      type="number"
                                      min="-100"
                                      max="100"
                                      value={activeColorGrade[range][key]}
                                      onChange={(event) =>
                                        updateGradeOffset(
                                          range,
                                          key,
                                          +event.target.value,
                                        )
                                      }
                                      onBlur={() =>
                                        snapshot(`${label} ${channelLabel}`)
                                      }
                                    />
                                    <Slider
                                      aria-label={`${label} ${channelLabel} slider`}
                                      min={-100}
                                      max={100}
                                      value={activeColorGrade[range][key]}
                                      onValueChange={(next) =>
                                        updateGradeOffset(
                                          range,
                                          key,
                                          sliderNumber(next),
                                        )
                                      }
                                      onValueCommitted={() =>
                                        snapshot(`${label} ${channelLabel}`)
                                      }
                                    />
                                  </label>
                                ))}
                              </fieldset>
                            ))}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                commitColorGrade(
                                  createDefaultColorGrade(),
                                  'Reset colour grade',
                                )
                              }
                            >
                              Reset complete grade
                            </Button>
                          </details>
                        </>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'paths',
                  title: 'Paths',
                  content: (
                    <div className="panel-content paths-list">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setTool('path')}
                      >
                        <PenTool />
                        Draw work path
                      </Button>
                      {paths.length === 0 ? (
                        <p>
                          No saved paths. Use the Pen Path tool and close with
                          Enter.
                        </p>
                      ) : (
                        paths.map((path) => (
                          <div key={path.id}>
                            <span>
                              <PenTool />
                              <strong>{path.name}</strong>
                              <small>
                                {path.points.length} points ·{' '}
                                {path.curved ? 'curved' : 'straight'}
                              </small>
                            </span>
                            <button
                              onClick={() =>
                                makePathSelection(path.points, path.curved)
                              }
                            >
                              Make selection
                            </button>
                            <button onClick={() => duplicatePath(path.id)}>
                              Duplicate
                            </button>
                            <button
                              aria-label={`Delete ${path.name}`}
                              onClick={() => removePath(path.id)}
                            >
                              <Trash2 />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  ),
                },
                {
                  id: 'history',
                  title: 'History',
                  content: (
                    <div className="panel-content history-list">
                      {historyRef.current.map((x, i) => (
                        <div className="history-entry" key={`${x.label}-${i}`}>
                          <button
                            className={
                              i === historyIndex.current ? 'current' : ''
                            }
                            onClick={() => restoreSnapshot(i)}
                          >
                            {x.label}
                          </button>
                          <button
                            className="history-utility"
                            aria-label={`Open ${x.label} as a branch`}
                            title="Open as an independent document branch"
                            onClick={() => openHistoryBranch(i)}
                          >
                            Branch
                          </button>
                          <button
                            className="history-utility"
                            aria-label={`Compare ${x.label} with the current state`}
                            title="Open a pixel-accurate change map"
                            disabled={i === historyIndex.current}
                            onClick={() => compareHistoryState(i)}
                          >
                            Compare
                          </button>
                        </div>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          </section>
        </aside>
      </div>
      <footer className="status-bar">
        <span title={recoveryStatus}>
          {status}
          {recoveryStatus ? ` · ${recoveryStatus}` : ''}
        </span>
        <span className="status-center">
          {doc.w} × {doc.h}px · {layers.length} layers
          {selection ? ' · selection active' : ''}
        </span>
        <div className="zoom-control">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Zoom out"
            onClick={() => viewportRef.current?.zoomAt(zoom / 1.25)}
          >
            <ZoomOut />
          </Button>
          <Slider
            aria-label="Canvas zoom"
            min={1}
            max={800}
            step={1}
            value={zoom}
            onValueChange={(v) => viewportRef.current?.zoomAt(sliderNumber(v))}
          />
          <span>{zoom}%</span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Zoom in"
            onClick={() => viewportRef.current?.zoomAt(zoom * 1.25)}
          >
            <ZoomIn />
          </Button>
        </div>
      </footer>
      <NewDocumentDialog
        open={newDocumentOpen}
        onOpenChange={setNewDocumentOpen}
        onCreate={createBlankDocument}
      />
      <ImageSizeDialog
        open={imageSizeOpen}
        width={doc.w}
        height={doc.h}
        resolution={view.resolution}
        onClose={() => setImageSizeOpen(false)}
        onApply={resizeImage}
      />
      <CanvasSizeDialog
        open={canvasSizeOpen}
        width={doc.w}
        height={doc.h}
        onClose={() => setCanvasSizeOpen(false)}
        onApply={resizeCanvas}
      />
      <AdvancedAdjustmentsDialog
        open={adjustmentsOpen}
        sourceCanvas={
          active && active.kind !== 'group' && active.kind !== 'adjustment'
            ? surfacesRef.current.get(active.id)?.pixels
            : null
        }
        onClose={() => setAdjustmentsOpen(false)}
        onApply={applyAdvancedAdjustments}
      />
      <Dialog open={snapshotOpen} onOpenChange={setSnapshotOpen}>
        <DialogContent>
          <DialogTitle>Save history snapshot</DialogTitle>
          <DialogDescription>
            Name this complete document state. You can restore it from History.
          </DialogDescription>
          <label className="snapshot-name-field">
            Snapshot name
            <input
              autoFocus
              maxLength={80}
              value={snapshotName}
              onChange={(event) => setSnapshotName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && snapshotName.trim()) {
                  snapshot(snapshotName.trim(), true);
                  setSnapshotOpen(false);
                }
              }}
            />
          </label>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setSnapshotOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!snapshotName.trim()}
              onClick={() => {
                snapshot(snapshotName.trim(), true);
                setSnapshotOpen(false);
              }}
            >
              Save snapshot
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={secureSaveOpen}
        onOpenChange={(open) => {
          setSecureSaveOpen(open);
          if (!open) {
            setSecureSavePassword('');
            setSecureSaveConfirmation('');
            setSecureSaveError('');
          }
        }}
      >
        <DialogContent>
          <DialogTitle>Save encrypted project</DialogTitle>
          <DialogDescription>
            LibreLayer encrypts the complete layered project on this device. The
            password is never stored or uploaded and cannot be recovered.
          </DialogDescription>
          <label className="snapshot-name-field">
            Password
            <input
              autoComplete="new-password"
              type="password"
              minLength={10}
              value={secureSavePassword}
              onChange={(event) => {
                setSecureSavePassword(event.target.value);
                setSecureSaveError('');
              }}
            />
          </label>
          <label className="snapshot-name-field">
            Confirm password
            <input
              autoComplete="new-password"
              type="password"
              minLength={10}
              value={secureSaveConfirmation}
              onChange={(event) => {
                setSecureSaveConfirmation(event.target.value);
                setSecureSaveError('');
              }}
            />
          </label>
          {secureSaveError ? <p role="alert">{secureSaveError}</p> : null}
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setSecureSaveOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                secureSavePassword.length < 10 ||
                secureSavePassword !== secureSaveConfirmation
              }
              onClick={async () => {
                if (secureSavePassword !== secureSaveConfirmation) {
                  setSecureSaveError('The passwords do not match.');
                  return;
                }
                if (await saveProject(secureSavePassword))
                  setSecureSaveOpen(false);
              }}
            >
              Encrypt and save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!encryptedProjectFile}
        onOpenChange={(open) => {
          if (!open) {
            setEncryptedProjectFile(null);
            setEncryptedProjectPassword('');
            setEncryptedProjectError('');
          }
        }}
      >
        <DialogContent>
          <DialogTitle>Unlock encrypted project</DialogTitle>
          <DialogDescription>
            Enter this project&apos;s password. Decryption happens only in this
            browser.
          </DialogDescription>
          <label className="snapshot-name-field">
            Password
            <input
              autoFocus
              autoComplete="current-password"
              type="password"
              value={encryptedProjectPassword}
              onChange={(event) => {
                setEncryptedProjectPassword(event.target.value);
                setEncryptedProjectError('');
              }}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  encryptedProjectFile &&
                  encryptedProjectPassword
                )
                  void openProject(
                    encryptedProjectFile,
                    undefined,
                    encryptedProjectPassword,
                  ).then((opened) => {
                    if (opened) {
                      setEncryptedProjectFile(null);
                      setEncryptedProjectPassword('');
                    }
                  });
              }}
            />
          </label>
          {encryptedProjectError ? (
            <p role="alert">{encryptedProjectError}</p>
          ) : null}
          <div className="dialog-actions">
            <Button
              variant="outline"
              onClick={() => setEncryptedProjectFile(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={!encryptedProjectPassword}
              onClick={() => {
                if (!encryptedProjectFile) return;
                void openProject(
                  encryptedProjectFile,
                  undefined,
                  encryptedProjectPassword,
                ).then((opened) => {
                  if (opened) {
                    setEncryptedProjectFile(null);
                    setEncryptedProjectPassword('');
                  }
                });
              }}
            >
              Unlock locally
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={psdBusy}>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Processing file</DialogTitle>
          <DialogDescription>
            Your image stays on this device. Large files can take a moment.
          </DialogDescription>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!psdPending}
        onOpenChange={(open) => {
          if (!open) setPsdPending(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Open saved PSD preview?</DialogTitle>
          <DialogDescription>
            This file contains Photoshop features that cannot yet be imported
            faithfully as editable layers.
          </DialogDescription>
          <ul className="list-disc pl-5">
            {psdPending?.data.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p>
            The saved composite opens as one pixel layer. Your original PSD
            stays unchanged.
          </p>
          <Button
            onClick={() => {
              if (psdPending) importPsdResult(psdPending.name, psdPending.data);
              setPsdPending(null);
            }}
          >
            Open flattened preview
          </Button>
          <Button variant="outline" onClick={() => setPsdPending(null)}>
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!psdError}
        onOpenChange={(open) => {
          if (!open) setPsdError('');
        }}
      >
        <DialogContent>
          <DialogTitle>File and memory limits</DialogTitle>
          <DialogDescription>{psdError}</DialogDescription>
          <Button onClick={() => setPsdError('')}>OK</Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!rawDevelop}
        onOpenChange={(open) => !open && setRawDevelop(null)}
      >
        <DialogContent className="raw-develop-dialog">
          <DialogTitle>
            {rawDevelop?.targetLayerId
              ? 'Camera Raw Smart Object'
              : 'Camera Raw'}
          </DialogTitle>
          <DialogDescription>
            Develop the camera sensor data in a scene-linear, wide-gamut
            workspace. The original RAW file is never changed.
          </DialogDescription>
          {rawDevelop && rawPreview && (
            <img src={rawPreview} alt="Live RAW development preview" />
          )}
          {rawDevelop && (
            <p className="raw-source-info">
              {rawDevelop.image.width} × {rawDevelop.image.height} ·{' '}
              {rawDevelop.image.bitDepth}-bit RAW
              {rawDevelop.image.camera ? ` · ${rawDevelop.image.camera}` : ''}
              {rawDevelop.image.lens ? ` · ${rawDevelop.image.lens}` : ''}
            </p>
          )}
          <div className="raw-develop-controls">
            {(
              [
                ['Exposure', 'exposure', -5, 5, 0.1, ' EV'],
                ['Contrast', 'contrast', -100, 100, 1, ''],
                ['Highlights', 'highlights', -100, 100, 1, ''],
                ['Shadows', 'shadows', -100, 100, 1, ''],
                ['Whites', 'whites', -100, 100, 1, ''],
                ['Blacks', 'blacks', -100, 100, 1, ''],
                ['Temperature', 'temperature', -100, 100, 1, ''],
                ['Tint', 'tint', -100, 100, 1, ''],
                ['Vibrance', 'vibrance', -100, 100, 1, ''],
                ['Saturation', 'saturation', -100, 100, 1, ''],
                ['Highlight recovery', 'highlightRecovery', 0, 100, 1, '%'],
              ] as const
            ).map(([label, key, min, max, step, suffix]) => (
              <label key={key}>
                <span>{label}</span>
                <Slider
                  aria-label={`RAW ${label.toLowerCase()}`}
                  min={min}
                  max={max}
                  step={step}
                  value={rawSettings[key]}
                  onValueChange={(next) =>
                    setRawSettings((current) => ({
                      ...current,
                      [key]: sliderNumber(next),
                    }))
                  }
                />
                <strong>
                  {rawSettings[key]}
                  {suffix}
                </strong>
              </label>
            ))}
          </div>
          <div className="dialog-actions">
            <Button
              variant="outline"
              onClick={() => setRawSettings({ ...defaultRawDevelopSettings })}
            >
              Reset
            </Button>
            <Button onClick={() => void applyRawDevelop()}>
              {rawDevelop?.targetLayerId
                ? 'Update Smart Object'
                : 'Open as RAW Smart Object'}
            </Button>
            <Button variant="outline" onClick={() => setRawDevelop(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={selectMaskOpen} onOpenChange={setSelectMaskOpen}>
        <DialogContent className="select-mask-dialog">
          <DialogTitle>Select and Mask</DialogTitle>
          <DialogDescription>
            Refine the active selection edge, including fine hair-like detail,
            then optionally remove color fringe from edge pixels.
          </DialogDescription>
          {[
            ['Edge detection radius', refineRadius, setRefineRadius, 0, 20],
            ['Smooth', refineSmooth, setRefineSmooth, 0, 20],
            ['Feather', refineFeather, setRefineFeather, 0, 50],
            ['Shift edge', refineShift, setRefineShift, -100, 100],
          ].map(([label, value, setter, min, max]) => (
            <label key={label as string}>
              <span>{label as string}</span>
              <Slider
                aria-label={label as string}
                min={min as number}
                max={max as number}
                value={value as number}
                onValueChange={(next) =>
                  (setter as (value: number) => void)(sliderNumber(next))
                }
              />
              <strong>{value as number}</strong>
            </label>
          ))}
          <label className="inline-check">
            <input
              type="checkbox"
              checked={decontaminate}
              onChange={(event) => setDecontaminate(event.target.checked)}
            />
            Decontaminate edge colors
          </label>
          {decontaminate && (
            <label>
              <span>Decontamination amount</span>
              <Slider
                aria-label="Decontamination amount"
                min={0}
                max={100}
                value={decontaminateAmount}
                onValueChange={(next) =>
                  setDecontaminateAmount(sliderNumber(next))
                }
              />
              <strong>{decontaminateAmount}%</strong>
            </label>
          )}
          <div className="dialog-actions">
            <Button onClick={applySelectAndMask}>Apply refinement</Button>
            <Button variant="outline" onClick={() => setSelectMaskOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={selectionManagerOpen}
        onOpenChange={setSelectionManagerOpen}
      >
        <DialogContent className="selection-manager-dialog">
          <DialogTitle>Saved selections</DialogTitle>
          <DialogDescription>
            Save the active selection with this layered project or load a saved
            selection into the document.
          </DialogDescription>
          <div className="selection-save-row">
            <input
              aria-label="Selection name"
              value={selectionName}
              onChange={(event) => setSelectionName(event.target.value)}
            />
            <Button onClick={saveCurrentSelection} disabled={!selection}>
              Save current
            </Button>
          </div>
          <div className="saved-selection-list">
            {savedSelections.length ? (
              savedSelections.map((item) => (
                <div key={item.id}>
                  <button onClick={() => loadSavedSelection(item)}>
                    {item.name}
                  </button>
                  <button
                    aria-label={`Delete ${item.name}`}
                    onClick={() => {
                      savedSelectionCanvases.current.delete(item.id);
                      setSavedSelections((items) =>
                        items.filter((saved) => saved.id !== item.id),
                      );
                      setSaved(false);
                    }}
                  >
                    <Trash2 />
                  </button>
                </div>
              ))
            ) : (
              <p>No saved selections yet.</p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setSelectionManagerOpen(false)}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
      <ProfessionalGeometryDialog
        open={geometryOpen}
        onClose={() => setGeometryOpen(false)}
        onApply={applyGeometry}
      />
      <LayerStudioDialog
        open={layerStudioOpen}
        onClose={() => setLayerStudioOpen(false)}
        onApply={applyLayerStudio}
      />
      <ProSuiteDialog
        open={proSuiteOpen}
        onClose={() => setProSuiteOpen(false)}
        onRun={runProFeature}
      />
      <input
        ref={smartObjectFileRef}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => void applySmartFile(event.target.files?.[0])}
      />
      <Dialog
        open={selectionRepairOpen !== null}
        onOpenChange={(open) => !open && setSelectionRepairOpen(null)}
      >
        <DialogContent className="selection-repair-dialog">
          <DialogTitle>
            {selectionRepairOpen === 'patch'
              ? 'Patch selection'
              : selectionRepairOpen === 'remove'
                ? 'Remove selection'
                : selectionRepairOpen === 'fill'
                  ? 'Content-Aware Fill'
                  : 'Content-Aware Move'}
          </DialogTitle>
          <DialogDescription>
            LibreLayer samples the active layer around the selected area. The
            operation is local, selection-aware, and undoable.
          </DialogDescription>
          {(selectionRepairOpen === 'patch' ||
            selectionRepairOpen === 'move') && (
            <div className="geometry-number-grid">
              <label>
                Horizontal offset
                <input
                  aria-label="Repair horizontal offset"
                  type="number"
                  min="-4000"
                  max="4000"
                  value={repairOffsetX}
                  onChange={(event) =>
                    setRepairOffsetX(+event.target.value || 0)
                  }
                />
                px
              </label>
              <label>
                Vertical offset
                <input
                  aria-label="Repair vertical offset"
                  type="number"
                  min="-4000"
                  max="4000"
                  value={repairOffsetY}
                  onChange={(event) =>
                    setRepairOffsetY(+event.target.value || 0)
                  }
                />
                px
              </label>
            </div>
          )}
          <div className="dialog-actions">
            <Button
              variant="outline"
              onClick={() => setSelectionRepairOpen(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={!selection}
              onClick={() => {
                if (!selectionRepairOpen) return;
                selectionRepair(
                  selectionRepairOpen,
                  repairOffsetX,
                  repairOffsetY,
                );
                setSelectionRepairOpen(null);
              }}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ExportDialog
        source={exportSource}
        highPrecision={exportRawSource}
        highPrecisionLoading={exportRawLoading}
        name={fileName}
        onClose={() => {
          exportRawGeneration.current++;
          setExportSource(null);
          setExportRawSource(null);
          setExportRawLoading(false);
        }}
      />
      <PagedImportDialog
        onCheck={(w, h) => requireRoom(w, h, w * h)}
        file={pagedFile}
        onClose={() => {
          setPagedFile(null);
          if (fileRef.current) fileRef.current.value = '';
        }}
        onImport={(pixels, name) => {
          const id = crypto.randomUUID();
          loadImportedDocument(
            name,
            pixels.width,
            pixels.height,
            [
              {
                id,
                name,
                kind: 'pixel',
                visible: true,
                opacity: 100,
                blend: 'source-over',
                x: 0,
                y: 0,
                hasMask: false,
                maskEnabled: true,
              },
            ],
            new Map([[id, { pixels }]]),
            'Import page',
          );
        }}
      />
      <WorkspaceSettings
        commands={[...menuCommands.current.values()].map(
          ({ name, shortcut }) => ({ name, shortcut }),
        )}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        value={preferences}
        onChange={updatePreferences}
        saveLocationName={saveLocationName}
        storageStatus={storageStatus}
        onChooseSaveLocation={() => void chooseDefaultSaveDirectory()}
        onProtectStorage={() => void protectLocalStorage()}
        onResetSaveLocation={() => void resetDefaultSaveDirectory()}
        tools={toolItems}
        current={{ tool, size, opacity, color, fontSize, feather }}
        onApply={(p) => {
          setTool(p.tool as Tool);
          setSize(p.size);
          setOpacity(p.opacity);
          setColor(p.color);
          setFontSize(p.fontSize);
          setFeather(p.feather);
        }}
      />
      <CommandDialog
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        title="LibreLayer commands"
        description="Search tools and editing commands"
        className="command-palette"
      >
        <Command>
          <CommandInput autoFocus placeholder="Search tools and commands…" />
          <CommandList>
            <CommandEmpty>No matching command.</CommandEmpty>
            <CommandGroup heading="Tools">
              {toolItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`tool ${item.label}`}
                  onSelect={() => {
                    setTool(item.id);
                    setCommandPaletteOpen(false);
                  }}
                >
                  <item.icon />
                  {item.label}
                  <CommandShortcut>
                    {(preferences.shortcuts[item.id] ?? item.key).toUpperCase()}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Commands">
              {[...menuCommands.current.values()].map((command) => (
                <CommandItem
                  key={command.name}
                  value={`command ${command.name}`}
                  onSelect={() => {
                    setCommandPaletteOpen(false);
                    requestAnimationFrame(command.action);
                  }}
                >
                  {command.name}
                  {command.shortcut && (
                    <CommandShortcut>
                      {shortcutLabel(command.shortcut)}
                    </CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
      <Dialog
        open={recoveries !== null}
        onOpenChange={(open) => {
          if (!open) setRecoveries(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogTitle>Recover documents</DialogTitle>
          <DialogDescription>
            Device-local recovery copies. Restoring opens a new tab; your
            current document stays open.
          </DialogDescription>
          {recoveries?.length === 0 && (
            <p>
              No recovery copies yet. Open documents are copied every 10 seconds
              when local workspace restore is enabled. Copies stay on this
              browser profile until you remove them or close the document.
            </p>
          )}
          {recoveries?.map((record) => (
            <div key={record.id} className="flex gap-2">
              <Button
                key={record.id}
                variant="outline"
                onClick={async () => {
                  setRecoveries(null);
                  await openProject(
                    new File([record.json], record.name + '.librelayer'),
                  );
                  setSaved(false);
                }}
              >
                {record.name} · {new Date(record.updated).toLocaleString()}
              </Button>
              <Button
                variant="ghost"
                aria-label={`Delete recovery ${record.name}`}
                onClick={async () => {
                  if (
                    !confirm(
                      `Delete the device recovery copy of ${record.name}? This cannot be undone. Open document tabs are not deleted.`,
                    )
                  )
                    return;
                  try {
                    await deleteRecovery(record.id);
                    setRecoveries(await recoveryRecords());
                  } catch {
                    setRecoveryStatus('Could not delete this recovery copy');
                  }
                }}
              >
                Remove
              </Button>
            </div>
          ))}
          <p>{recoveryStatus}</p>
          <Button variant="outline" onClick={() => setRecoveries(null)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={versions !== null}
        onOpenChange={(open) => {
          if (!open) setVersions(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            Dated, device-local restore points for this document. Restore opens
            a separate tab so the current version remains untouched.
          </DialogDescription>
          {versions?.length === 0 && (
            <p>
              No restore points yet. A version is kept as you work, and Save
              recovery copies now creates one immediately.
            </p>
          )}
          {versions?.map((record) => (
            <div key={record.id} className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  setVersions(null);
                  if (
                    await openProject(
                      new File(
                        [record.json],
                        `${record.name} — ${new Date(record.updated).toLocaleString()}.librelayer`,
                      ),
                    )
                  )
                    setSaved(false);
                }}
              >
                {new Date(record.updated).toLocaleString()} ·{' '}
                {record.reason === 'manual' ? 'Saved' : 'Auto'}
              </Button>
              <Button
                variant="ghost"
                aria-label={`Delete version from ${new Date(record.updated).toLocaleString()}`}
                onClick={async () => {
                  await deleteVersion(record.id);
                  setVersions(await versionRecords(activeDocumentRef.current));
                }}
              >
                Remove
              </Button>
            </div>
          ))}
          <p>{recoveryStatus}</p>
          <Button variant="outline" onClick={() => setVersions(null)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
