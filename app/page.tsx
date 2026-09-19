'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
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
  SelectMaskPreview,
  type SelectMaskPreviewMode,
} from '@/components/select-mask-preview';
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
  type DirtyRegion,
  type HistorySurface,
  type TiledImage,
} from '@/lib/tiled-history';
import { penIntent } from '@/lib/pointer-input';
import { resolveLinkedFile } from '@/lib/linked-smart-object';
import { assertAcyclicSmartObjectGraph } from '@/lib/smart-object-graph';
import {
  checkDimensions,
  checkFileSize,
  MAX_DOCUMENT_PIXELS,
  MAX_WORKING_PIXELS,
} from '@/lib/document-limits';
import { preflightImage } from '@/lib/image-preflight';
import {
  motionClassName,
  normalizeMotionPreference,
} from '@/lib/accessibility-preferences';
import {
  canvasFont,
  canvasFontStretch,
  canvasVariableFont,
  graphemes,
  fitTextSize,
  layoutGlyphsOnPath,
  languageOptions,
  resolveTextDirection,
  shouldDrawShapedRun,
  textWarpTransform,
  type TextDirection,
  type TextStyle,
  type TextWarpStyle,
} from '@/lib/text-engine';
import {
  commandKey,
  defaultCommandKey,
  shortcutLabel,
} from '@/lib/editor-shortcuts';
import {
  auditRecoveryStorage,
  clearDefaultSaveDirectory,
  brushTipRecords,
  deleteBrushTip,
  deleteVersion,
  forgetRecentFile,
  getDefaultSaveDirectory,
  getLinkedFileHandle,
  loadRawAsset,
  loadWorkspaceState,
  recentFiles,
  recoveryRecords,
  repairRecoveryFromVersion,
  recoverInterruptedRecoveryTransactions,
  rememberRecentFile,
  saveRecovery,
  saveRawAsset,
  saveVersion,
  saveWorkspaceState,
  saveBrushTip,
  saveLinkedFileHandle,
  setDefaultSaveDirectory,
  deleteRecovery,
  type LocalDirectoryHandle,
  type BrushTipRecord,
  type LocalFileHandle,
  type RecentFileRecord,
  type RecoveryRecord,
  type RecoveryIssue,
  type VersionRecord,
  versionRecords,
} from '@/lib/recovery';
import {
  abrAlphaToRgba,
  filterBrushTips,
  maskAlphaFromRgba,
  normalizeBrushTags,
} from '@/lib/brush-library';
import type { Layer as PsdLayer } from 'ag-psd';
import { portableTextToPsd, psdTextToPortable } from '@/lib/psd-text';
import { fillRecipeToPsd, psdFillToRecipe } from '@/lib/psd-fill';
import {
  highDepthToPsdAdjustment,
  psdAdjustmentToHighDepth,
} from '@/lib/psd-adjustment';
import { layerEffectsToPsd, psdEffectsToLayerEffects } from '@/lib/psd-effects';
import { psdToSmartObject, smartObjectToPsd } from '@/lib/psd-smart-object';
import {
  blendIfToPsd,
  portableFillOpacityToPsd,
  psdBlendIfToPortable,
  psdFillOpacityToPortable,
} from '@/lib/psd-compositing';
import { processPsd, type PsdImport } from '@/lib/psd-transfer';
import {
  EncryptedProjectPasswordInvalid,
  EncryptedProjectPasswordRequired,
  packEncryptedProject,
  packProject,
  unpackProject,
} from '@/lib/project-format';
import {
  applyColorGradeToFloat32,
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
import {
  ColorProfileDialog,
  type ColorProfileOperation,
} from '@/components/color-profile-dialog';
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
  suiteFeatures,
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
  pixelBlendModes,
  compositePixels,
  validBlendIf,
  type ExtraBlend,
  type BlendIf,
  type BlendSpace,
} from '@/lib/layer-compositing';
import { BlendIfControls } from '@/components/blend-if-controls';
import { SmartFilterStack } from '@/components/smart-filter-stack';
import { SmartObjectTransformControls } from '@/components/smart-object-transform-controls';
import {
  DistortionWorkspaceDialog,
  type DistortionWorkspaceKind,
  type DistortionWorkspaceResult,
} from '@/components/distortion-workspace-dialog';
import { Histogram } from '@/components/histogram';
import { ColorScopes } from '@/components/color-scopes';
import { AdjustmentPresets } from '@/components/adjustment-presets';
import { LevelsControl } from '@/components/levels-control';
import { ToneCurve } from '@/components/tone-curve';
import { LutControl } from '@/components/lut-control';
import { AdvancedColorControls } from '@/components/advanced-color-controls';
import { SoftProofOverlay } from '@/components/soft-proof-overlay';
import { PrintStudioDialog } from '@/components/print-studio-dialog';
import type { PrintCanvasSource } from '@/lib/print-render';
import {
  defaultFillLayerRecipe,
  normalizeFillLayerRecipe,
  type FillLayerRecipe,
} from '@/lib/fill-layer';
import {
  defaultMaskTransform,
  normalizeMaskTransform,
  type MaskTransform,
} from '@/lib/mask-transform';
import { planLayerTransfer } from '@/lib/layer-transfer';
import {
  clippingBaseId,
  groupCanPassThrough,
  type GroupIsolation,
  type KnockoutMode,
} from '@/lib/group-compositing';
import {
  marqueeBounds,
  marqueeCoverage,
  strongestEdgeInPatch,
  type MarqueeShape,
} from '@/lib/selection-geometry';
import {
  colorSimilarityWeight,
  focusWeight,
  luminosityRangeWeight,
  pixelLuminance,
  type LuminosityRange,
} from '@/lib/selection-ranges';
import {
  semanticPixelWeight,
  type SemanticSelectionTarget,
} from '@/lib/semantic-selection';
import {
  effectContourAlpha,
  effectOffset,
  normalizeLayerEffects,
} from '@/lib/layer-effects';
import {
  createPsdCompatibilityReport,
  type PsdCompatibilityReport,
} from '@/lib/psd-compatibility';
import {
  sharpenCanvasTiled,
  sharpenFloatRgba,
} from '@/lib/smart-filter-engine';
import {
  interpolateStrokeDabs,
  symmetryStrokePoints,
  type BrushSymmetry,
} from '@/lib/brush-engine';
import {
  GpuBrushRenderer,
  type BrushRendererBackend,
} from '@/lib/gpu-brush-renderer';
import {
  displayCompositeKey,
  mipChainDimensions,
  mipLevelForZoom,
} from '@/lib/composite-mip-cache';
import { correctRedEyePixels, highFrequencyPixels } from '@/lib/retouch-engine';
import {
  contentAwareFill,
  type ContentAwareSamplingMode,
} from '@/lib/content-aware';
import { contentAwareScale as scaleContentAwarePixels } from '@/lib/content-aware-scale';
import { warpSourcePoint, type WarpMode } from '@/lib/warp-engine';
import { renderLiquifyPixels } from '@/lib/liquify-engine';
import {
  createVanishingPointMapper,
  createWideAngleMapper,
  remapProjectionPixels,
} from '@/lib/projection-engine';
import {
  normalizeVersionRetention,
  saveLocationStatus,
  type SaveLocationState,
} from '@/lib/storage-policy';
import {
  hasSmartObjectTransform,
  isSmartObjectTransform,
  normalizeSmartObjectTransform,
  type SmartObjectTransform,
} from '@/lib/smart-object-transform';
import {
  historyExceedsPolicy,
  normalizeHistoryPolicy,
} from '@/lib/history-policy';
import {
  decodeCameraRaw,
  defaultRawDecodeSettings,
  defaultRawDevelopSettings,
  developRawRgba,
  isRawDevelopSettings,
  rawDemosaicModes,
  type RawDecodeSettings,
  type RawDevelopSettings,
  type RawLinearImage,
} from '@/lib/raw-develop';
import {
  defaultRawLensCorrection,
  defaultRawNoiseCorrection,
  rawLensProfiles,
  resolveRawLensProfile,
  type RawLensCorrection,
  type RawNoiseCorrection,
} from '@/lib/raw-corrections';
import {
  createRawRecipeSidecar,
  parseRawRecipeSidecar,
  serializeRawRecipeSidecar,
} from '@/lib/raw-sidecar';
import { runRawBatch } from '@/lib/raw-batch';
import type { HighPrecisionRawSource } from '@/lib/image-export';
import {
  validateEmbeddedDocument,
  type EmbeddedDocumentEnvelope,
} from '@/lib/embedded-smart-object';
import {
  filterGraphKey,
  VersionedRenderCache,
  type FilterGraphQuality,
} from '@/lib/smart-filter-cache';
import { traceAlphaContours } from '@/lib/vector-trace';
import {
  anchorsToSvgPath,
  anchorsFromPoints,
  combinePathMasks,
  convertAnchorKind,
  defaultPathStroke,
  moveAnchor,
  moveAnchorHandle,
  normalizePathStroke,
  sampleBezierAnchors,
  type BezierAnchor,
  type PathBooleanOperation,
  type PathStrokeStyle,
} from '@/lib/path-engine';
import { parseSvgDocument, serializeSvgDocument } from '@/lib/svg-path';
import { type ReferenceFilter } from '@/lib/filter-gallery';
import type { DistortFilter } from '@/lib/distort-filter';
import { parseConvolutionKernel, type RenderFilter } from '@/lib/render-filter';
import { runPixelFilterJob } from '@/lib/pixel-filter-job';
import type { PixelFilterRequest } from '@/lib/pixel-filter-core';
import {
  validateFilterPlugin,
  type FilterPluginManifest,
} from '@/lib/filter-plugin';
import type { PluginExporter } from '@/lib/plugin-platform';
import {
  JobCancelledError,
  JobWatchdogError,
  runFilterPluginJob,
} from '@/lib/filter-plugin-job';
import { runGpuCpuReferenceCheck } from '@/lib/gpu-filter-reference';
import { applyAcceleratedPixelFilter } from '@/lib/accelerated-pixel-renderer';
import {
  adaptivePerformancePolicy,
  normalizePerformanceMode,
  previewScaleForPixels,
} from '@/lib/performance-policy';
import { runPerformanceSuite } from '@/lib/performance-suite-job';
import {
  cleanScratch,
  deleteScratch,
  normalizeScratchQuota,
  scratchUsage,
  writeScratch,
  type ScratchLocation,
} from '@/lib/scratch-storage';
import {
  multiScaleExportPlan,
  normalizeArtboard,
  normalizeFrame,
  smartSpacingMoves,
  type Artboard,
  type FrameRecipe,
} from '@/lib/layout-engine';
import { normalizeToolbar, visibleToolbarIds } from '@/lib/toolbar-config';
import {
  adjustHighDepth,
  createDefaultHighDepthAdjustments,
  precisionToEncodedRgba,
  type CurveChannel,
  type ChannelLevel,
  type HighDepthAdjustments,
  type HueSaturationRangeTarget,
} from '@/lib/high-depth';
import {
  createHdrPreviewPixels,
  hdrDisplayCapability,
  normalizeHdrPreviewMode,
} from '@/lib/hdr-display';
import { runStackJob } from '@/lib/stack-job';
import type { StackMode } from '@/lib/stack-engine';
import { substituteDataVariables, type DataRecord } from '@/lib/data-driven';
import { planContactSheet } from '@/lib/contact-sheet';
import { createStoreZip, type ZipEntry } from '@/lib/zip';
import {
  WORKING_DEPTH_LABELS,
  captureWorkingSurface,
  cloneWorkingSurface,
  convertWorkingSurface,
  deserializeWorkingSurface,
  normalizeWorkingDepth,
  placeWorkingSurface,
  resizeWorkingSurface,
  serializeWorkingSurface,
  syncWorkingSurfaceFromRgba8,
  workingDepthBytesPerPixel,
  workingSurfaceFromFloat32,
  workingSurfaceFromRgba8,
  workingSurfaceToFloat32,
  workingSurfaceToRgba8,
  type HighWorkingDepth,
  type StoredWorkingSurface,
  type WorkingDepth,
  type WorkingSurface,
} from '@/lib/working-depth';
import {
  portableIccProfile,
  registerIccProfile,
  resolveColorProfile,
  normalizeColorProfile,
  type ColorProfileId,
  type PortableIccProfile,
  type RenderingIntent,
} from '@/lib/color-management';
import { runColorProfileJob } from '@/lib/color-profile-job';
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
  anchors?: BezierAnchor[];
  closed?: boolean;
  stroke?: PathStrokeStyle;
  curved?: boolean;
  tension?: number;
};

const pathAnchors = (path: SavedPath) =>
  path.anchors?.length === path.points.length
    ? path.anchors
    : anchorsFromPoints(path.points, path.curved === true, path.tension);

const traceSavedPath = (
  ctx: CanvasRenderingContext2D,
  path: SavedPath,
  mapPoint: (point: Point) => Point = (point) => point,
) => {
  const anchors = pathAnchors(path);
  if (anchors.length < 2) return false;
  const mapped = anchors.map((anchor) => ({
    ...mapPoint(anchor),
    incoming: anchor.incoming ? mapPoint(anchor.incoming) : undefined,
    outgoing: anchor.outgoing ? mapPoint(anchor.outgoing) : undefined,
  }));
  ctx.beginPath();
  ctx.moveTo(mapped[0].x, mapped[0].y);
  for (let index = 1; index < mapped.length; index++) {
    const previous = mapped[index - 1],
      current = mapped[index];
    if (previous.outgoing || current.incoming)
      ctx.bezierCurveTo(
        previous.outgoing?.x ?? previous.x,
        previous.outgoing?.y ?? previous.y,
        current.incoming?.x ?? current.x,
        current.incoming?.y ?? current.y,
        current.x,
        current.y,
      );
    else ctx.lineTo(current.x, current.y);
  }
  if (path.closed !== false) {
    const previous = mapped.at(-1)!,
      current = mapped[0];
    if (previous.outgoing || current.incoming)
      ctx.bezierCurveTo(
        previous.outgoing?.x ?? previous.x,
        previous.outgoing?.y ?? previous.y,
        current.incoming?.x ?? current.x,
        current.incoming?.y ?? current.y,
        current.x,
        current.y,
      );
    else ctx.lineTo(current.x, current.y);
    ctx.closePath();
  }
  return true;
};

const savedPathSvgData = (path: SavedPath) => {
  return anchorsToSvgPath(pathAnchors(path), path.closed !== false);
};
type SavedSelection = { id: string; name: string; mask: string };
type SmartFilter = {
  id: string;
  version?: number;
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
  linkedHandleId?: string;
  linkedStatus?: 'connected' | 'missing';
  instanceId?: string;
  dependencies?: string[];
  sourceVersion?: number;
  embeddedDocument?: EmbeddedDocumentData;
  transform?: SmartObjectTransform;
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
type EmbeddedDocumentData = Omit<
  EmbeddedDocumentEnvelope,
  'layers' | 'paths' | 'layerComps' | 'artboards'
> & {
  layers: LayerMeta[];
  paths?: SavedPath[];
  layerComps?: LayerComp[];
  artboards?: Artboard[];
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
  style: TextStyle;
  stretch: number;
  size: number;
  tracking: number;
  kerning: boolean;
  leading: number;
  baseline: number;
  align: 'left' | 'center' | 'right' | 'justify';
  onPath: boolean;
  pathMode?: 'none' | 'along' | 'inside';
  pathId?: string;
  warp: number;
  warpStyle?: TextWarpStyle;
  fit?: 'none' | 'shrink' | 'fill';
  boxHeight?: number;
  smallCaps: boolean;
  ligatures: boolean;
  direction: TextDirection;
  language: string;
  underline: boolean;
  strike: boolean;
  indent: number;
  spaceBefore: number;
  spaceAfter: number;
};
type LayerKind = 'pixel' | 'group' | 'adjustment' | 'fill';
type LayerMeta = {
  fill?: number;
  clipping?: boolean;
  blendIf?: BlendIf;
  linkId?: string;
  maskDensity?: number;
  maskFeather?: number;
  maskLinked?: boolean;
  maskOverlay?: boolean;
  maskTransform?: MaskTransform;
  vectorMask?: Point[];
  colorLabel?: string;
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  blend: BlendMode;
  blendSpace?: BlendSpace;
  groupIsolation?: GroupIsolation;
  knockout?: KnockoutMode;
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
  fillLayer?: FillLayerRecipe;
  frame?: FrameRecipe;
};
type LayerSurface = {
  pixels: HTMLCanvasElement;
  mask?: HTMLCanvasElement;
  precision?: WorkingSurface;
  backing?: TiledImage;
  maskBacking?: TiledImage;
};
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
  workingDepth?: WorkingDepth;
  sceneReferred?: boolean;
  colorProfile?: ColorProfileId;
  colorProfileData?: PortableIccProfile;
  layers: LayerMeta[];
  surfaces: HistorySurface[];
  selectedId: string;
  selection?: TiledImage;
  selectionBounds?: Rect | null;
  selectionPath?: Point[] | null;
  paths?: SavedPath[];
  artboards?: Artboard[];
  layerComps?: LayerComp[];
  view?: EditorView;
  thumbnail?: string;
};
type EditorDocument = {
  selectedIds?: string[];
  layerComps?: LayerComp[];
  view?: EditorView;
  id: string;
  name: string;
  saved: boolean;
  doc: { w: number; h: number };
  workingDepth?: WorkingDepth;
  sceneReferred?: boolean;
  colorProfile?: ColorProfileId;
  colorProfileData?: PortableIccProfile;
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
  artboards?: Artboard[];
  savedSelections?: SavedSelection[];
  smartObjectSource?: {
    parentDocumentId: string;
    instanceId: string;
  };
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
  group: 'view' | 'select' | 'paint' | 'retouch' | 'create';
}[] = [
  { id: 'hand', label: 'Hand', key: 'H', icon: Hand, group: 'view' },
  {
    id: 'rotateView',
    label: 'Rotate view',
    key: 'R',
    icon: RotateCcw,
    group: 'view',
  },
  { id: 'zoom', label: 'Zoom', key: 'Z', icon: ZoomIn, group: 'view' },
  { id: 'move', label: 'Move', key: 'V', icon: MousePointer2, group: 'select' },
  {
    id: 'marquee',
    label: 'Marquee select',
    key: 'M',
    icon: ScanSearch,
    group: 'select',
  },
  {
    id: 'lasso',
    label: 'Polygonal lasso',
    key: 'L',
    icon: LassoSelect,
    group: 'select',
  },
  {
    id: 'smart',
    label: 'Magic Wand',
    key: 'W',
    icon: WandSparkles,
    group: 'select',
  },
  { id: 'crop', label: 'Crop', key: 'C', icon: Crop, group: 'select' },
  {
    id: 'eyedropper',
    label: 'Eyedropper',
    key: 'I',
    icon: Pipette,
    group: 'select',
  },
  { id: 'brush', label: 'Brush', key: 'B', icon: Brush, group: 'paint' },
  { id: 'eraser', label: 'Eraser', key: 'E', icon: Eraser, group: 'paint' },
  { id: 'fill', label: 'Fill', key: 'G', icon: PaintBucket, group: 'paint' },
  {
    id: 'gradient',
    label: 'Gradient',
    key: 'D',
    icon: Droplets,
    group: 'paint',
  },
  {
    id: 'clone',
    label: 'Clone stamp',
    key: 'S',
    icon: Stamp,
    group: 'retouch',
  },
  {
    id: 'retouch',
    label: 'Retouch tools',
    key: 'J',
    icon: Sparkles,
    group: 'retouch',
  },
  { id: 'text', label: 'Text', key: 'T', icon: Type, group: 'create' },
  { id: 'shape', label: 'Rectangle', key: 'U', icon: Shapes, group: 'create' },
  { id: 'path', label: 'Pen path', key: 'P', icon: PenTool, group: 'create' },
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
type RenderPrecision = 'u8' | 'f16';

const canvasContext = (
  canvas: HTMLCanvasElement,
  precision: RenderPrecision = 'u8',
  willReadFrequently = false,
) =>
  canvas.getContext(
    '2d',
    precision === 'f16'
      ? ({
          colorSpace: 'srgb',
          colorType: 'float16',
          willReadFrequently,
        } as CanvasRenderingContext2DSettings)
      : { willReadFrequently },
  ) as CanvasRenderingContext2D | null;

const makeCanvas = (
  w: number,
  h: number,
  precision: RenderPrecision = 'u8',
) => {
  checkDimensions(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  if (precision === 'f16') canvasContext(c, precision);
  return c;
};

const floatImageData = (pixels: Float32Array, width: number, height: number) =>
  new (ImageData as unknown as {
    new (
      data: Float16Array,
      width: number,
      height: number,
      settings: { colorSpace: string; pixelFormat: string },
    ): ImageData;
  })(new Float16Array(pixels), width, height, {
    colorSpace: 'srgb',
    pixelFormat: 'rgba-float16',
  });

const readFloatCanvas = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const image = (
      context.getImageData as unknown as (
        x: number,
        y: number,
        width: number,
        height: number,
        settings: { colorSpace: string; pixelFormat: string },
      ) => ImageData
    )(x, y, width, height, {
      colorSpace: 'srgb',
      pixelFormat: 'rgba-float16',
    }),
    data = image.data as unknown as ArrayLike<number>;
  return Float32Array.from(data);
};

const putFloatCanvas = (
  context: CanvasRenderingContext2D,
  pixels: Float32Array,
  width: number,
  height: number,
  x = 0,
  y = 0,
) => context.putImageData(floatImageData(pixels, width, height), x, y);

let floatCanvasSupportCache: boolean | undefined;
const floatCanvasSupported = () => {
  if (floatCanvasSupportCache !== undefined) return floatCanvasSupportCache;
  if (typeof Float16Array === 'undefined') return false;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvasContext(canvas, 'f16'),
    attributes = context?.getContextAttributes?.() as
      | { colorType?: string }
      | undefined;
  canvas.width = canvas.height = 1;
  floatCanvasSupportCache = attributes?.colorType === 'float16';
  return floatCanvasSupportCache;
};

const workingSurfaceCanvas = (
  surface: WorkingSurface,
  precision: RenderPrecision,
) => {
  const canvas = makeCanvas(surface.width, surface.height, precision),
    context = canvasContext(canvas, precision)!;
  if (precision === 'f16')
    putFloatCanvas(
      context,
      workingSurfaceToFloat32(surface),
      surface.width,
      surface.height,
    );
  else
    context.putImageData(
      new ImageData(
        workingSurfaceToRgba8(surface),
        surface.width,
        surface.height,
      ),
      0,
      0,
    );
  return canvas;
};

const smartFilterRenderCache = new VersionedRenderCache<HTMLCanvasElement>(
  24_000_000,
  (canvas) => {
    canvas.width = canvas.height = 1;
  },
);

const canvasBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(Error('Canvas encoding failed')),
      'image/png',
    ),
  );

const blobCanvas = async (blob: Blob) => {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = makeCanvas(image.naturalWidth, image.naturalHeight);
    canvas.getContext('2d')!.drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const imageMaskCanvas = async (blob: Blob) => {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(
        1,
        512 / Math.max(image.naturalWidth, image.naturalHeight),
      ),
      width = Math.max(1, Math.round(image.naturalWidth * scale)),
      height = Math.max(1, Math.round(image.naturalHeight * scale)),
      canvas = makeCanvas(width, height),
      context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height),
      alpha = maskAlphaFromRgba(pixels.data);
    for (let pixel = 0; pixel < alpha.length; pixel++) {
      const at = pixel * 4;
      pixels.data[at] = pixels.data[at + 1] = pixels.data[at + 2] = 255;
      pixels.data[at + 3] = alpha[pixel];
    }
    context.putImageData(pixels, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const abrBrushMask = (
  brush: {
    shape?: Record<string, unknown>;
  },
  samples: Array<{
    id: string;
    bounds: { w: number; h: number };
    alpha: Uint8Array;
  }>,
) => {
  const shape = brush.shape ?? {},
    sample =
      shape.type === 'sampled'
        ? samples.find((item) => item.id === shape.sampledData)
        : undefined;
  if (sample) {
    const scale = Math.min(1, 512 / Math.max(sample.bounds.w, sample.bounds.h)),
      width = Math.max(1, Math.round(sample.bounds.w * scale)),
      height = Math.max(1, Math.round(sample.bounds.h * scale)),
      source = makeCanvas(sample.bounds.w, sample.bounds.h),
      sourceContext = source.getContext('2d')!,
      pixels = sourceContext.createImageData(sample.bounds.w, sample.bounds.h);
    pixels.data.set(abrAlphaToRgba(sample.alpha));
    sourceContext.putImageData(pixels, 0, 0);
    if (scale === 1) return source;
    const output = makeCanvas(width, height);
    output.getContext('2d')!.drawImage(source, 0, 0, width, height);
    source.width = source.height = 1;
    return output;
  }
  const canvas = makeCanvas(256, 256),
    context = canvas.getContext('2d')!,
    roundness = Math.max(
      0.05,
      Math.min(1, Number(shape.roundness ?? 100) / 100),
    ),
    hardness = Math.max(
      0,
      Math.min(1, Number(shape.hardness ?? shape.tipsHardness ?? 80) / 100),
    ),
    radius = 118,
    gradient = context.createRadialGradient(
      0,
      0,
      radius * hardness,
      0,
      0,
      radius,
    );
  gradient.addColorStop(0, 'white');
  gradient.addColorStop(Math.min(0.999, hardness), 'white');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.translate(128, 128);
  context.rotate((Number(shape.angle ?? 0) * Math.PI) / 180);
  context.scale(1, roundness);
  context.fillStyle = gradient;
  context.beginPath();
  if (String(shape.tipsType ?? shape.shape).includes('square'))
    context.rect(-radius, -radius, radius * 2, radius * 2);
  else if (String(shape.tipsType ?? shape.shape).includes('triangle')) {
    context.moveTo(0, -radius);
    context.lineTo(radius, radius);
    context.lineTo(-radius, radius);
    context.closePath();
  } else context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fill();
  return canvas;
};
const downloadBlob = (name: string, blob: Blob) => {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  precision: RenderPrecision = 'u8',
) => {
  const w = source.width,
    h = source.height,
    context = source.getContext('2d', { willReadFrequently: true })!;
  if (precision === 'f16') {
    const input = readFloatCanvas(context, 0, 0, w, h),
      output = new Float32Array(input.length);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const [sx, sy] = mapper(x, y, w, h),
          ix = Math.round(sx),
          iy = Math.round(sy),
          target = (y * w + x) * 4;
        if (ix < 0 || iy < 0 || ix >= w || iy >= h) continue;
        const from = (iy * w + ix) * 4;
        output[target] = input[from];
        output[target + 1] = input[from + 1];
        output[target + 2] = input[from + 2];
        output[target + 3] = input[from + 3];
      }
    putFloatCanvas(context, output, w, h);
    return;
  }
  const input = context.getImageData(0, 0, w, h),
    output = context.createImageData(w, h);
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
  preset?: 'arc' | 'flag' | 'fisheye' | 'twist',
  precision: RenderPrecision = 'u8',
) => {
  if (mode === 'content-aware-scale') return;
  remapRaster(
    canvas,
    (x, y, w, h) =>
      warpSourcePoint(
        mode as WarpMode,
        x,
        y,
        w,
        h,
        horizontal,
        vertical,
        preset,
      ),
    precision,
  );
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
const drawEditableText = (
  canvas: HTMLCanvasElement,
  input: TextLayerData,
  pathPoints?: Point[],
) => {
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const pathMode = input.pathMode ?? (input.onPath ? 'along' : 'none'),
    usablePath = pathPoints && pathPoints.length > 1 ? pathPoints : undefined,
    bounds = usablePath
      ? {
          left: Math.min(...usablePath.map((point) => point.x)),
          right: Math.max(...usablePath.map((point) => point.x)),
          top: Math.min(...usablePath.map((point) => point.y)),
          bottom: Math.max(...usablePath.map((point) => point.y)),
        }
      : undefined;
  let value = { ...input };
  if (pathMode === 'inside' && usablePath && bounds) {
    value = {
      ...value,
      paragraph: true,
      originX: bounds.left + 8,
      originY: bounds.top + input.size + 8,
      width: Math.max(20, bounds.right - bounds.left - 16),
      boxHeight: Math.max(20, bounds.bottom - bounds.top - 16),
      onPath: false,
    };
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(usablePath[0].x, usablePath[0].y);
    usablePath.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.closePath();
    ctx.clip();
  }
  if (value.paragraph && (value.fit ?? 'none') !== 'none') {
    const fit = value.fit ?? 'none',
      fitted = fitTextSize({
        preferred: fit === 'fill' ? 0 : value.size,
        min: 8,
        max: fit === 'fill' ? 300 : value.size,
        fits: (candidateSize) => {
          ctx.font = canvasFont({
            family: value.family,
            size: candidateSize,
            weight: value.weight,
            style: value.style,
          });
          let lineCount = 0,
            widest = 0;
          for (const paragraph of value.content.split('\n')) {
            let line = '';
            for (const word of paragraph.split(/\s+/)) {
              const candidate = line ? `${line} ${word}` : word,
                measured =
                  ctx.measureText(candidate).width +
                  Math.max(0, candidate.length - 1) * value.tracking;
              if (line && measured > value.width) {
                widest = Math.max(
                  widest,
                  ctx.measureText(line).width +
                    Math.max(0, line.length - 1) * value.tracking,
                );
                lineCount++;
                line = word;
              } else line = candidate;
            }
            widest = Math.max(
              widest,
              ctx.measureText(line).width +
                Math.max(0, line.length - 1) * value.tracking,
            );
            lineCount++;
          }
          return (
            widest <= value.width &&
            lineCount * candidateSize * value.leading <=
              (value.boxHeight ?? canvas.height - value.originY)
          );
        },
      });
    value.size = fitted;
    if (pathMode === 'inside' && bounds)
      value.originY = bounds.top + fitted + 8;
  }
  ctx.fillStyle = value.color;
  const fontOptions = {
    family: value.family,
    size: value.size,
    weight: value.weight,
    style: value.style ?? 'normal',
  };
  ctx.font = canvasFont(fontOptions);
  const safeFont = ctx.font;
  ctx.font = canvasVariableFont({
    ...fontOptions,
    stretch: value.stretch ?? 100,
  });
  if (ctx.font === safeFont && 'fontStretch' in ctx)
    ctx.fontStretch = canvasFontStretch(value.stretch ?? 100);
  ctx.fontKerning = value.kerning ? 'normal' : 'none';
  ctx.fontVariantCaps = value.smallCaps ? 'small-caps' : 'normal';
  ctx.textBaseline = 'alphabetic';
  ctx.direction = resolveTextDirection(
    value.content,
    value.direction ?? 'auto',
  );
  const sourceContent = value.ligatures
      ? value.content
      : value.content.replace(/f(?=[il])/g, 'f\u200c'),
    content = value.smallCaps
      ? sourceContent.toLocaleUpperCase(value.language ?? 'en')
      : sourceContent,
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
  if (pathMode === 'along' && usablePath) {
    const clusters = graphemes(
        content.replaceAll('\n', ' '),
        value.language ?? 'en',
      ),
      advances = clusters.map(
        (character) => ctx.measureText(character).width + value.tracking,
      ),
      positions = layoutGlyphsOnPath(advances, usablePath);
    clusters.forEach((character, index) => {
      const position = positions[index];
      if (!position?.visible) return;
      const warp = textWarpTransform(
        value.warpStyle ?? (value.warp ? 'wave' : 'none'),
        index / Math.max(1, clusters.length - 1),
        value.warp,
      );
      ctx.save();
      ctx.translate(position.x, position.y + value.baseline + warp.y);
      ctx.rotate(position.angle + warp.rotation);
      ctx.scale(1, warp.scaleY);
      ctx.fillText(character, -advances[index] / 2, 0);
      ctx.restore();
    });
    return;
  }
  lines.forEach((line, lineIndex) => {
    const lineIndent = lineIndex === 0 ? (value.indent ?? 0) : 0,
      width =
        ctx.measureText(line).width +
        Math.max(0, line.length - 1) * value.tracking,
      x =
        value.align === 'center'
          ? value.originX - width / 2 + lineIndent
          : value.align === 'right'
            ? value.originX - width + lineIndent
            : value.originX + lineIndent,
      y =
        value.originY +
        value.baseline +
        (value.spaceBefore ?? 0) +
        lineIndex * lineHeight +
        (lineIndex > 0 ? (value.spaceAfter ?? 0) : 0);
    let cursor = x;
    const justifyExtra =
      value.align === 'justify' && value.paragraph
        ? Math.max(0, value.width - width) /
          Math.max(1, line.split(' ').length - 1)
        : 0;
    if (
      shouldDrawShapedRun({
        tracking: value.tracking,
        justifyExtra,
        onPath: value.onPath,
        warp: value.warp,
      })
    ) {
      // One native text run preserves OpenType ligatures and complex-script shaping.
      ctx.fillText(line, cursor, y);
    } else {
      const clusters = graphemes(line, value.language ?? 'en');
      for (let index = 0; index < clusters.length; index++) {
        const character = clusters[index],
          progress = index / Math.max(1, clusters.length - 1),
          warp = textWarpTransform(
            value.warpStyle ?? (value.warp ? 'wave' : 'none'),
            progress,
            value.warp,
          );
        ctx.save();
        ctx.translate(cursor, y + warp.y);
        ctx.rotate(warp.rotation);
        ctx.scale(1, warp.scaleY);
        ctx.fillText(character, 0, 0);
        ctx.restore();
        cursor +=
          ctx.measureText(character).width +
          value.tracking +
          (character === ' ' ? justifyExtra : 0);
      }
    }
    const decorationWidth = Math.max(0, cursor === x ? width : cursor - x);
    ctx.save();
    ctx.strokeStyle = value.color;
    ctx.lineWidth = Math.max(1, value.size / 18);
    if (value.underline) {
      ctx.beginPath();
      ctx.moveTo(x, y + value.size * 0.12);
      ctx.lineTo(x + decorationWidth, y + value.size * 0.12);
      ctx.stroke();
    }
    if (value.strike) {
      ctx.beginPath();
      ctx.moveTo(x, y - value.size * 0.3);
      ctx.lineTo(x + decorationWidth, y - value.size * 0.3);
      ctx.stroke();
    }
    ctx.restore();
  });
  if (pathMode === 'inside' && usablePath) ctx.restore();
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

type BackgroundRemovalRunner = (
  input: string,
) => Promise<{ data: Uint8Array; width: number; height: number }>;
let backgroundRemovalPromise: Promise<BackgroundRemovalRunner> | null = null;
const backgroundRemovalModel = () => {
  if (!backgroundRemovalPromise)
    backgroundRemovalPromise = import('@huggingface/transformers')
      .then(async (hf) => {
        const runner = await hf.pipeline(
          'background-removal',
          'onnx-community/BEN2-ONNX',
        );
        return runner as unknown as BackgroundRemovalRunner;
      })
      .catch((error) => {
        backgroundRemovalPromise = null;
        throw error;
      });
  return backgroundRemovalPromise;
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
const positionedMaskAlpha = (
  mask: HTMLCanvasElement,
  density: number | undefined,
  feather: number | undefined,
  transform: Partial<MaskTransform> | undefined,
  width: number,
  height: number,
) => {
  const alpha = maskToAlpha(mask, density, feather),
    recipe = normalizeMaskTransform(transform);
  if (
    recipe.x === 0 &&
    recipe.y === 0 &&
    recipe.rotation === 0 &&
    recipe.scaleX === 1 &&
    recipe.scaleY === 1
  )
    return alpha;
  const placed = makeCanvas(width, height),
    context = placed.getContext('2d')!;
  context.translate(recipe.x + width / 2, recipe.y + height / 2);
  context.rotate((recipe.rotation * Math.PI) / 180);
  context.scale(recipe.scaleX, recipe.scaleY);
  context.drawImage(alpha, -width / 2, -height / 2);
  alpha.width = alpha.height = 1;
  return placed;
};
const applyEffectContour = (
  canvas: HTMLCanvasElement,
  contour: LayerEffects['contour'],
) => {
  if (contour === 'linear') return;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  for (let y = 0; y < canvas.height; y += 256)
    for (let x = 0; x < canvas.width; x += 256) {
      const width = Math.min(256, canvas.width - x),
        height = Math.min(256, canvas.height - y),
        image = context.getImageData(x, y, width, height);
      for (let index = 3; index < image.data.length; index += 4)
        image.data[index] = Math.round(
          effectContourAlpha(image.data[index] / 255, contour) * 255,
        );
      context.putImageData(image, x, y);
    }
};
const sliderNumber = (value: number | readonly number[]) =>
  Number(Array.isArray(value) ? value[0] : value);
const nativeFillCanvas = (
  input: FillLayerRecipe,
  w: number,
  h: number,
  precision: RenderPrecision = 'u8',
) => {
  const recipe = normalizeFillLayerRecipe(input),
    output = makeCanvas(w, h, precision),
    context = output.getContext('2d')!;
  if (recipe.mode === 'solid') {
    context.fillStyle = recipe.color;
    context.fillRect(0, 0, w, h);
    return output;
  }
  const offsetX = (recipe.offsetX / 100) * w,
    offsetY = (recipe.offsetY / 100) * h;
  if (recipe.mode === 'gradient') {
    const angle = (recipe.angle * Math.PI) / 180,
      radius = (Math.hypot(w, h) * recipe.scale) / 200,
      centerX = w / 2 + offsetX,
      centerY = h / 2 + offsetY,
      gradient = context.createLinearGradient(
        centerX - Math.cos(angle) * radius,
        centerY - Math.sin(angle) * radius,
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius,
      );
    gradient.addColorStop(0, recipe.color);
    gradient.addColorStop(1, recipe.color2);
    context.fillStyle = gradient;
    context.fillRect(0, 0, w, h);
    return output;
  }
  const unit = Math.max(4, Math.round(16 * (recipe.scale / 100))),
    tile = makeCanvas(unit * 2, unit * 2, precision),
    tileContext = tile.getContext('2d')!;
  tileContext.fillStyle = recipe.color;
  tileContext.fillRect(0, 0, tile.width, tile.height);
  tileContext.fillStyle = recipe.color2;
  if (recipe.pattern === 'checker') {
    tileContext.fillRect(0, 0, unit, unit);
    tileContext.fillRect(unit, unit, unit, unit);
  } else if (recipe.pattern === 'dots') {
    tileContext.beginPath();
    tileContext.arc(unit, unit, unit * 0.45, 0, Math.PI * 2);
    tileContext.fill();
  } else {
    tileContext.translate(unit, unit);
    tileContext.rotate((recipe.angle * Math.PI) / 180);
    tileContext.fillRect(-tile.width, -unit / 3, tile.width * 2, unit / 1.5);
  }
  const pattern = context.createPattern(tile, 'repeat');
  if (pattern) {
    pattern.setTransform(
      new DOMMatrix().translate(offsetX % tile.width, offsetY % tile.height),
    );
    context.fillStyle = pattern;
    context.fillRect(0, 0, w, h);
  }
  tile.width = tile.height = 1;
  return output;
};
const colorGradedCanvas = (
  source: HTMLCanvasElement,
  grade: ColorGrade | undefined,
  w: number,
  h: number,
  precision: RenderPrecision = 'u8',
) => {
  if (colorGradeIsNeutral(grade)) return source;
  const output = makeCanvas(w, h, precision),
    outputContext = output.getContext('2d')!,
    tile = makeCanvas(Math.min(256, w), Math.min(256, h), precision);
  for (let y = 0; y < h; y += 256)
    for (let x = 0; x < w; x += 256) {
      const width = Math.min(256, w - x),
        height = Math.min(256, h - y),
        tileContext = tile.getContext('2d', { willReadFrequently: true })!;
      tileContext.clearRect(0, 0, tile.width, tile.height);
      tileContext.drawImage(source, x, y, width, height, 0, 0, width, height);
      if (precision === 'f16') {
        const pixels = readFloatCanvas(tileContext, 0, 0, width, height);
        applyColorGradeToFloat32(pixels, grade);
        putFloatCanvas(tileContext, pixels, width, height);
      } else {
        const pixels = tileContext.getImageData(0, 0, width, height);
        applyColorGradeToPixels(pixels.data, grade);
        tileContext.putImageData(pixels, 0, 0);
      }
      outputContext.drawImage(tile, 0, 0, width, height, x, y, width, height);
    }
  tile.width = tile.height = 1;
  return output;
};

const sharpenFloatCanvasTiled = (
  source: HTMLCanvasElement,
  amount: number,
  tileSize = 512,
) => {
  const output = makeCanvas(source.width, source.height, 'f16'),
    sourceContext = canvasContext(source, 'f16', true)!,
    outputContext = canvasContext(output, 'f16')!;
  outputContext.drawImage(source, 0, 0);
  for (let y = 0; y < source.height; y += tileSize)
    for (let x = 0; x < source.width; x += tileSize) {
      const left = Math.max(0, x - 1),
        top = Math.max(0, y - 1),
        right = Math.min(source.width, x + tileSize + 1),
        bottom = Math.min(source.height, y + tileSize + 1),
        width = right - left,
        height = bottom - top,
        pixels = readFloatCanvas(sourceContext, left, top, width, height),
        sharpened = sharpenFloatRgba(pixels, width, height, amount),
        dirtyX = x - left,
        dirtyY = y - top,
        dirtyWidth = Math.min(tileSize, source.width - x),
        dirtyHeight = Math.min(tileSize, source.height - y),
        dirty = new Float32Array(dirtyWidth * dirtyHeight * 4);
      for (let row = 0; row < dirtyHeight; row++) {
        const from = ((dirtyY + row) * width + dirtyX) * 4,
          to = row * dirtyWidth * 4;
        dirty.set(sharpened.subarray(from, from + dirtyWidth * 4), to);
      }
      putFloatCanvas(outputContext, dirty, dirtyWidth, dirtyHeight, x, y);
    }
  return output;
};
const drawLayer = (
  ctx: CanvasRenderingContext2D,
  layer: LayerMeta,
  surface: LayerSurface,
  w: number,
  h: number,
  quality: FilterGraphQuality = 'final',
  previewPixelBudget = 2_000_000,
  precision: RenderPrecision = 'u8',
) => {
  let source =
    layer.kind === 'fill' && layer.fillLayer
      ? nativeFillCanvas(layer.fillLayer, w, h, precision)
      : precision === 'f16' && surface.precision
        ? workingSurfaceCanvas(surface.precision, precision)
        : surface.pixels;
  const masks: HTMLCanvasElement[] = [];
  if (layer.frame) {
    const recipe = normalizeFrame(layer.frame, w, h),
      frame = makeCanvas(w, h, precision),
      frameContext = frame.getContext('2d')!;
    frameContext.fillStyle = 'white';
    frameContext.beginPath();
    if (recipe.shape === 'ellipse')
      frameContext.ellipse(
        recipe.x + recipe.w / 2,
        recipe.y + recipe.h / 2,
        recipe.w / 2,
        recipe.h / 2,
        0,
        0,
        Math.PI * 2,
      );
    else if (recipe.radius > 0)
      frameContext.roundRect(
        recipe.x,
        recipe.y,
        recipe.w,
        recipe.h,
        Math.min(recipe.radius, recipe.w / 2, recipe.h / 2),
      );
    else frameContext.rect(recipe.x, recipe.y, recipe.w, recipe.h);
    frameContext.fill();
    masks.push(frame);
  }
  if (layer.vectorMask?.length && layer.vectorMask.length > 2) {
    const vector = makeCanvas(w, h, precision),
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
    const temp = makeCanvas(w, h, precision),
      tc = temp.getContext('2d')!;
    tc.drawImage(source, 0, 0);
    for (const alpha of masks) {
      tc.globalCompositeOperation = 'destination-in';
      tc.drawImage(alpha, 0, 0);
      alpha.width = alpha.height = 1;
    }
    if (source !== surface.pixels) source.width = source.height = 1;
    source = temp;
  }
  const smartObject = layer.smartObject,
    smartTransform = normalizeSmartObjectTransform(smartObject?.transform);
  if (hasSmartObjectTransform(smartTransform)) {
    const warped = makeCanvas(w, h, precision);
    warped.getContext('2d')!.drawImage(source, 0, 0);
    transformRasterPixels(
      warped,
      smartTransform.mode,
      smartTransform.horizontal,
      smartTransform.vertical,
      smartTransform.preset,
      precision,
    );
    if (source !== surface.pixels) source.width = source.height = 1;
    source = warped;
  }
  const activeSmartFilters =
      smartObject?.filters.filter((filter) => filter.enabled) ?? [],
    cacheable =
      !!smartObject &&
      !!activeSmartFilters.length &&
      !smartObject.filterMask &&
      !!smartObject.instanceId,
    cacheKey = cacheable
      ? filterGraphKey({
          instanceId: smartObject.instanceId!,
          sourceVersion: smartObject.sourceVersion ?? 1,
          width: w,
          height: h,
          quality,
          transform: smartObject?.transform,
          filters: smartObject.filters,
        }) + `:${precision}`
      : '',
    cached = cacheable ? smartFilterRenderCache.get(cacheKey) : undefined;
  if (cached) {
    const copy = makeCanvas(w, h, precision);
    copy.getContext('2d')!.drawImage(cached, 0, 0);
    if (source !== surface.pixels) source.width = source.height = 1;
    source = copy;
  } else {
    const previewScale =
      quality === 'preview'
        ? previewScaleForPixels(w * h, previewPixelBudget)
        : 1;
    if (previewScale < 1) {
      const reduced = makeCanvas(
        Math.max(1, Math.round(w * previewScale)),
        Math.max(1, Math.round(h * previewScale)),
        precision,
      );
      reduced
        .getContext('2d')!
        .drawImage(source, 0, 0, reduced.width, reduced.height);
      if (source !== surface.pixels) source.width = source.height = 1;
      source = reduced;
    }
    for (const smartFilter of activeSmartFilters) {
      const filtered =
          smartFilter.name === 'Sharpen'
            ? precision === 'f16'
              ? sharpenFloatCanvasTiled(source, smartFilter.amount)
              : sharpenCanvasTiled(source, smartFilter.amount)
            : makeCanvas(source.width, source.height, precision),
        fc = filtered.getContext('2d')!;
      if (smartFilter.name !== 'Sharpen') {
        fc.filter =
          smartFilter.name === 'Blur'
            ? `blur(${Math.max(0, smartFilter.amount)}px)`
            : `brightness(${100 + smartFilter.amount}%)`;
        fc.drawImage(source, 0, 0);
      }
      if (
        smartObject?.filterMask &&
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
      const combined = makeCanvas(source.width, source.height, precision),
        cc = combined.getContext('2d')!;
      cc.drawImage(source, 0, 0);
      cc.globalAlpha = smartFilter.opacity / 100;
      cc.globalCompositeOperation =
        smartFilter.blend as GlobalCompositeOperation;
      cc.drawImage(filtered, 0, 0);
      if (source !== surface.pixels) source.width = source.height = 1;
      filtered.width = filtered.height = 1;
      source = combined;
    }
    if (previewScale < 1) {
      const expanded = makeCanvas(w, h, precision);
      expanded.getContext('2d')!.drawImage(source, 0, 0, w, h);
      source.width = source.height = 1;
      source = expanded;
    }
    if (cacheable) {
      const stored = makeCanvas(w, h, precision);
      stored.getContext('2d')!.drawImage(source, 0, 0);
      smartFilterRenderCache.set(cacheKey, stored, w * h);
    }
  }
  const graded = colorGradedCanvas(source, layer.colorGrade, w, h, precision);
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
    const placed = makeCanvas(w, h, precision),
      pc = placed.getContext('2d')!;
    pc.filter = filter;
    pc.translate(layer.x + w / 2, layer.y + h / 2);
    pc.rotate(((layer.rotation ?? 0) * Math.PI) / 180);
    pc.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
    pc.drawImage(source, -w / 2, -h / 2);
    const alpha = positionedMaskAlpha(
      surface.mask,
      layer.maskDensity,
      layer.maskFeather,
      layer.maskTransform,
      w,
      h,
    );
    pc.globalCompositeOperation = 'destination-in';
    pc.filter = 'none';
    pc.setTransform(1, 0, 0, 1, 0, 0);
    pc.drawImage(alpha, 0, 0);
    alpha.width = alpha.height = 1;
    drawLayer(
      ctx,
      {
        ...layer,
        kind: 'pixel',
        fillLayer: undefined,
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        hasMask: false,
        vectorMask: undefined,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0,
        colorGrade: undefined,
        smartObject: undefined,
      },
      { pixels: placed },
      w,
      h,
      quality,
      previewPixelBudget,
      precision,
    );
    placed.width = placed.height = 1;
    if (source !== surface.pixels) source.width = source.height = 1;
    return;
  }
  const effects = layer.effects
    ? normalizeLayerEffects(layer.effects)
    : undefined;
  if (effects) {
    const effectSize = (effects.size * effects.scale) / 100,
      shadowOffset = effectOffset(
        effects.angle,
        effects.distance,
        effects.scale,
      ),
      drawEffectSource = (
        effectColor: string,
        blur: number,
        offsetX: number,
        offsetY: number,
      ) => {
        const rendered = makeCanvas(w, h, precision),
          renderedContext = rendered.getContext('2d')!;
        renderedContext.shadowColor = effectColor;
        renderedContext.shadowBlur = blur;
        renderedContext.shadowOffsetX = offsetX;
        renderedContext.shadowOffsetY = offsetY;
        renderedContext.drawImage(source, 0, 0);
        renderedContext.globalCompositeOperation = 'destination-out';
        renderedContext.shadowColor = 'transparent';
        renderedContext.shadowBlur = 0;
        renderedContext.shadowOffsetX = 0;
        renderedContext.shadowOffsetY = 0;
        renderedContext.drawImage(source, 0, 0);
        applyEffectContour(rendered, effects.contour);
        ctx.save();
        ctx.globalAlpha = (layer.opacity / 100) * (effects.opacity / 100);
        ctx.translate(layer.x + w / 2, layer.y + h / 2);
        ctx.rotate(((layer.rotation ?? 0) * Math.PI) / 180);
        ctx.scale(layer.scaleX ?? 1, layer.scaleY ?? 1);
        ctx.drawImage(rendered, -w / 2, -h / 2);
        ctx.restore();
        rendered.width = rendered.height = 1;
      };
    if (effects.dropShadow)
      drawEffectSource(
        effects.color,
        effectSize,
        shadowOffset.x,
        shadowOffset.y,
      );
    if (effects.outerGlow)
      drawEffectSource(effects.color, effectSize * 1.6, 0, 0);
    if (effects.stroke)
      for (const [dx, dy] of [
        [-effectSize, 0],
        [effectSize, 0],
        [0, -effectSize],
        [0, effectSize],
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
    const effectSize = (effects.size * effects.scale) / 100,
      innerOffset = effectOffset(
        effects.angle,
        effects.distance,
        effects.scale,
      ),
      overlay = makeCanvas(w, h, precision),
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
      for (let y = 0; y < h; y += Math.max(4, effectSize))
        for (let x = 0; x < w; x += Math.max(4, effectSize))
          if (((x + y) / Math.max(4, effectSize)) % 2 < 1)
            oc.fillRect(
              x,
              y,
              Math.max(2, effectSize / 2),
              Math.max(2, effectSize / 2),
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
      const inner = makeCanvas(w, h, precision),
        ic = inner.getContext('2d')!;
      ic.drawImage(source, 0, 0);
      ic.globalCompositeOperation = 'source-atop';
      ic.globalAlpha = effects.opacity / 100;
      ic.fillStyle =
        effects.innerGlow || effects.bevel
          ? effects.secondaryColor
          : effects.color;
      if (effects.satin) {
        for (let y = 0; y < h; y += Math.max(6, effectSize * 2))
          ic.fillRect(0, y, w, Math.max(2, effectSize / 2));
      } else ic.fillRect(0, 0, w, h);
      ic.globalCompositeOperation = 'destination-in';
      ic.filter = `blur(${effects.innerGlow ? effectSize : Math.max(1, effectSize / 3)}px)`;
      ic.drawImage(
        source,
        effects.innerShadow ? innerOffset.x : 0,
        effects.innerShadow ? innerOffset.y : 0,
      );
      applyEffectContour(inner, effects.contour);
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
  precision: RenderPrecision = 'u8',
) => {
  const source = makeCanvas(w, h, precision),
    adjusted = makeCanvas(w, h, precision),
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
        tile =
          precision === 'f16'
            ? readFloatCanvas(sourceContext, x, y, width, height)
            : sourceContext.getImageData(x, y, width, height),
        result = adjustHighDepth(
          {
            width,
            height,
            data: tile instanceof Float32Array ? tile : tile.data,
          },
          settings,
        );
      if (precision === 'f16') putFloatCanvas(ac, result, width, height, x, y);
      else {
        const image = tile as ImageData;
        image.data.set(precisionToEncodedRgba({ width, height, data: result }));
        ac.putImageData(image, x, y);
      }
    }
  if (layer.blur) {
    const blurred = makeCanvas(w, h, precision),
      blurredContext = blurred.getContext('2d')!;
    blurredContext.filter = `blur(${Math.max(0, layer.blur)}px)`;
    blurredContext.drawImage(adjusted, 0, 0);
    ac.clearRect(0, 0, w, h);
    ac.drawImage(blurred, 0, 0);
    blurred.width = blurred.height = 1;
  }
  if (layer.hasMask && layer.maskEnabled && surface?.mask) {
    const alpha =
      layer.maskLinked === false
        ? positionedMaskAlpha(
            surface.mask,
            layer.maskDensity,
            layer.maskFeather,
            layer.maskTransform,
            w,
            h,
          )
        : maskToAlpha(surface.mask, layer.maskDensity, layer.maskFeather);
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
    [settingsInitialTab, setSettingsInitialTab] = useState<
      'layout' | 'performance'
    >('layout'),
    [panelsHidden, setPanelsHidden] = useState(false),
    [commandPaletteOpen, setCommandPaletteOpen] = useState(false),
    [contextMenu, setContextMenu] = useState<{
      kind: 'canvas' | 'document' | 'layer';
      x: number;
      y: number;
      id?: string;
    } | null>(null);
  const toolbarPreferences = normalizeToolbar(
      toolItems.map((item) => item.id),
      preferences.toolbar,
    ),
    visibleToolItems = visibleToolbarIds(toolbarPreferences)
      .map((id) => toolItems.find((item) => item.id === id))
      .filter((item): item is (typeof toolItems)[number] => !!item);
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null),
      onKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') close();
      };
    window.addEventListener('click', close);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [contextMenu]);
  useEffect(() => {
    document.documentElement.dataset.librelayerTheme =
      preferences.theme ?? 'dark';
    return () => {
      delete document.documentElement.dataset.librelayerTheme;
    };
  }, [preferences.theme]);
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
    [recoveryIssues, setRecoveryIssues] = useState<RecoveryIssue[]>([]),
    [versions, setVersions] = useState<VersionRecord[] | null>(null),
    [recent, setRecent] = useState<RecentFileRecord[]>([]),
    [recoveryStatus, setRecoveryStatus] = useState(''),
    [storageStatus, setStorageStatus] = useState('Checking browser storage…'),
    [scratchStatus, setScratchStatus] = useState('Checking scratch storage…'),
    [performanceCheckStatus, setPerformanceCheckStatus] = useState(
      'Not run on this computer yet',
    ),
    [performanceCheckRunning, setPerformanceCheckRunning] = useState(false),
    [saveLocationName, setSaveLocationName] = useState('Downloads'),
    [saveLocationHealth, setSaveLocationHealth] = useState(
      saveLocationStatus('Downloads', 'downloads'),
    ),
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
          theme: ['dark', 'light', 'contrast'].includes(p.theme)
            ? p.theme
            : 'dark',
          interfaceScale: [85, 100, 115, 125].includes(p.interfaceScale)
            ? p.interfaceScale
            : 100,
          motion: normalizeMotionPreference(p.motion),
          hdrPreviewMode: normalizeHdrPreviewMode(p.hdrPreviewMode),
          toolbar: normalizeToolbar(
            toolItems.map((item) => item.id),
            p.toolbar,
          ),
          historyDepth: normalizeHistoryPolicy(
            p.historyDepth,
            p.historyBudgetMb,
          ).depth,
          historyBudgetMb: normalizeHistoryPolicy(
            p.historyDepth,
            p.historyBudgetMb,
          ).budgetMb,
          performanceMode: normalizePerformanceMode(p.performanceMode),
          scratchLocation: ['browser', 'save-folder'].includes(
            p.scratchLocation,
          )
            ? p.scratchLocation
            : 'browser',
          scratchQuotaMb: normalizeScratchQuota(p.scratchQuotaMb),
          versionRetention: normalizeVersionRetention(p.versionRetention),
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
  const refreshSaveLocationHealth = async () => {
    let name = 'Downloads',
      state: SaveLocationState = 'downloads';
    try {
      const handle = await getDefaultSaveDirectory();
      if (handle) {
        name = handle.name;
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        state = permission === 'granted' ? 'connected' : 'permission-needed';
      }
    } catch {
      name =
        saveLocationName === 'Downloads'
          ? 'Remembered folder'
          : saveLocationName;
      state = 'unavailable';
    }
    setSaveLocationName(name);
    setSaveLocationHealth(saveLocationStatus(name, state));
  };
  const refreshScratchStatus = async () => {
    try {
      const location = preferences.scratchLocation ?? 'browser';
      const directory =
        location === 'save-folder' ? await getDefaultSaveDirectory() : null;
      const usage = await scratchUsage(location, directory);
      setScratchStatus(
        `${Math.round(usage.bytes / 1048576).toLocaleString()} MB in ${usage.files} temporary ${usage.files === 1 ? 'file' : 'files'} · ${normalizeScratchQuota(preferences.scratchQuotaMb).toLocaleString()} MB limit`,
      );
    } catch (error) {
      setScratchStatus(
        error instanceof Error
          ? error.message
          : 'Scratch storage is unavailable',
      );
    }
  };
  const cleanLocalScratch = async () => {
    try {
      const location = preferences.scratchLocation ?? 'browser';
      const directory =
        location === 'save-folder' ? await getDefaultSaveDirectory() : null;
      const count = await cleanScratch(location, directory);
      await refreshScratchStatus();
      setRecoveryStatus(
        `${count} temporary scratch ${count === 1 ? 'file' : 'files'} removed`,
      );
    } catch (error) {
      setRecoveryStatus(
        error instanceof Error
          ? error.message
          : 'Scratch storage could not be cleaned',
      );
    }
  };
  const runLocalPerformanceCheck = async () => {
    if (performanceCheckRunning) return;
    setPerformanceCheckRunning(true);
    setPerformanceCheckStatus('Starting local worker…');
    try {
      const report = await runPerformanceSuite((progress) =>
        setPerformanceCheckStatus(
          `${progress}% · testing local tiled workloads`,
        ),
      );
      const total = report.results.reduce(
          (sum, result) => sum + result.elapsedMs,
          report.layers.elapsedMs,
        ),
        largest = report.results.at(-1)!;
      setPerformanceCheckStatus(
        `Passed in ${Math.round(total).toLocaleString()} ms · ${largest.megapixels} MP across ${largest.tiles} tiles · ${report.layers.layers} layers`,
      );
    } catch (error) {
      setPerformanceCheckStatus(
        error instanceof Error
          ? error.message
          : 'The local performance check failed.',
      );
    } finally {
      setPerformanceCheckRunning(false);
    }
  };
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('qa') !== 'performance')
      return;
    setSettingsInitialTab('performance');
    setSettingsOpen(true);
    void runLocalPerformanceCheck();
  }, []);
  useEffect(() => {
    void refreshStorageStatus().catch(() =>
      setStorageStatus('Storage details are unavailable in this browser'),
    );
  }, []);
  useEffect(() => {
    void refreshScratchStatus();
  }, [
    preferences.scratchLocation,
    preferences.scratchQuotaMb,
    saveLocationName,
  ]);
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
    void recoverInterruptedRecoveryTransactions()
      .then((count) => {
        if (count)
          setRecoveryStatus(
            `${count} interrupted recovery ${count === 1 ? 'transaction was' : 'transactions were'} safely rolled back`,
          );
      })
      .catch(() =>
        setRecoveryStatus('The local recovery journal could not be checked'),
      );
    void refreshSaveLocationHealth();
    void recentFiles()
      .then(setRecent)
      .catch(() => setRecent([]));
  }, []);
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const localPreview = ['localhost', '127.0.0.1'].includes(
        window.location.hostname,
      );
      if (process.env.NODE_ENV === 'production' && !localPreview) {
        void navigator.serviceWorker.register('/sw.js').catch(() => {});
      } else if (localPreview) {
        // Production-like local previews must also remove a previously
        // installed shell worker or they can keep serving an obsolete build.
        void navigator.serviceWorker
          .getRegistrations()
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
              sessionStorage.getItem('librelayer-local-sw-cleaned') !== 'true'
            ) {
              sessionStorage.setItem('librelayer-local-sw-cleaned', 'true');
              window.location.reload();
            } else {
              sessionStorage.removeItem('librelayer-local-sw-cleaned');
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
  const [psdReport, setPsdReport] = useState<PsdCompatibilityReport | null>(
    null,
  );
  const [newDocumentOpen, setNewDocumentOpen] = useState(false);
  const [colorProfileDialog, setColorProfileDialog] =
    useState<ColorProfileOperation | null>(null);
  const [imageSizeOpen, setImageSizeOpen] = useState(false),
    [canvasSizeOpen, setCanvasSizeOpen] = useState(false),
    [adjustmentsOpen, setAdjustmentsOpen] = useState(false),
    [snapshotOpen, setSnapshotOpen] = useState(false),
    [snapshotName, setSnapshotName] = useState(''),
    [selectMaskOpen, setSelectMaskOpen] = useState(false),
    [selectMaskTarget, setSelectMaskTarget] = useState<
      'selection' | 'layer-mask'
    >('selection'),
    [selectMaskPreviewMode, setSelectMaskPreviewMode] =
      useState<SelectMaskPreviewMode>('overlay'),
    [selectMaskPreviewOpacity, setSelectMaskPreviewOpacity] = useState(55),
    [selectMaskSmartRadius, setSelectMaskSmartRadius] = useState(true),
    [selectMaskRefineHair, setSelectMaskRefineHair] = useState(false),
    [selectMaskOutput, setSelectMaskOutput] = useState<
      'selection' | 'layer-mask' | 'new-layer-mask'
    >('selection'),
    [selectionManagerOpen, setSelectionManagerOpen] = useState(false),
    [selectionTransformOpen, setSelectionTransformOpen] = useState(false),
    [selectionTransformX, setSelectionTransformX] = useState(0),
    [selectionTransformY, setSelectionTransformY] = useState(0),
    [selectionTransformScale, setSelectionTransformScale] = useState(100),
    [geometryOpen, setGeometryOpen] = useState(false),
    [distortionWorkspace, setDistortionWorkspace] = useState<{
      kind: DistortionWorkspaceKind;
      layerId: string;
    } | null>(null),
    [layerStudioOpen, setLayerStudioOpen] = useState(false),
    [proSuiteOpen, setProSuiteOpen] = useState(false),
    [printStudioOpen, setPrintStudioOpen] = useState(false),
    [printSources, setPrintSources] = useState<PrintCanvasSource[]>([]),
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
    [contentAwareSampling, setContentAwareSampling] =
      useState<ContentAwareSamplingMode>('auto'),
    [contentAwareColor, setContentAwareColor] = useState(50),
    [contentAwareRotation, setContentAwareRotation] = useState<
      0 | 90 | 180 | 270
    >(0),
    [contentAwareScale, setContentAwareScale] = useState(100),
    [contentAwareMirror, setContentAwareMirror] = useState(false),
    [contentAwareSampleX, setContentAwareSampleX] = useState(0),
    [contentAwareSampleY, setContentAwareSampleY] = useState(0),
    [contentAwareSampleW, setContentAwareSampleW] = useState(500),
    [contentAwareSampleH, setContentAwareSampleH] = useState(500),
    [contentAwarePreview, setContentAwarePreview] = useState(''),
    [contentAwarePreviewError, setContentAwarePreviewError] = useState(''),
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
    [rawDecodeBusy, setRawDecodeBusy] = useState(false),
    [rawBatchRunning, setRawBatchRunning] = useState(false),
    [rawPreview, setRawPreview] = useState(''),
    [refineRadius, setRefineRadius] = useState(2),
    [refineSmooth, setRefineSmooth] = useState(2),
    [refineFeather, setRefineFeather] = useState(1),
    [refineShift, setRefineShift] = useState(0),
    [decontaminate, setDecontaminate] = useState(true),
    [decontaminateAmount, setDecontaminateAmount] = useState(50),
    [semanticSensitivity, setSemanticSensitivity] = useState(55);
  const rawDecodeRevision = useRef(0);
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
  const displayCompositeCache = useRef<{
    key: string;
    base?: HTMLCanvasElement;
    mips: HTMLCanvasElement[];
    dynamicRange: string;
    hdrPreview?: string;
    renderPrecision: string;
  } | null>(null);
  const releaseDisplayCompositeCache = () => {
    const cached = displayCompositeCache.current;
    if (!cached) return;
    if (cached.base) cached.base.width = cached.base.height = 1;
    for (const mip of cached.mips) mip.width = mip.height = 1;
    displayCompositeCache.current = null;
  };
  useEffect(() => () => releaseDisplayCompositeCache(), []);
  const selectMaskPreviewSourceRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const surfacesRef = useRef(new Map<string, LayerSurface>());
  const layersRef = useRef<LayerMeta[]>([]);
  const drawing = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const last = useRef({ x: 0, y: 0 });
  const brushDistanceSinceDab = useRef(0);
  const moveOrigin = useRef({ x: 0, y: 0 });
  const historyRef = useRef<Snapshot[]>([]);
  const historyIndex = useRef(-1);
  const cloneSource = useRef<{ x: number; y: number } | null>(null);
  const cloneSources = useRef<Array<{ x: number; y: number } | null>>(
    Array.from({ length: 5 }, () => null),
  );
  const cloneHasOffset = useRef(false);
  const cloneOffset = useRef({ x: 0, y: 0 });
  const cloneBuffer = useRef<HTMLCanvasElement | null>(null);
  const historyBrushBuffer = useRef<HTMLCanvasElement | null>(null);
  const gesturePaintTool = useRef<'brush' | 'eraser' | null>(null);
  const paintDirtyRegion = useRef<DirtyRegion | null>(null);
  const brushRenderer = useRef<GpuBrushRenderer | null>(null);
  const rawMasterCache = useRef(new Map<string, RawLinearImage>());
  const exportRawGeneration = useRef(0);
  const rawRecipeFileRef = useRef<HTMLInputElement>(null);
  const rawBatchFileRef = useRef<HTMLInputElement>(null);
  const rawBatchCancel = useRef(false);
  const brushPresetFileRef = useRef<HTMLInputElement>(null);
  const brushTipFileRef = useRef<HTMLInputElement>(null);
  const brushTipCanvases = useRef(new Map<string, HTMLCanvasElement>());
  const brushTipUrls = useRef(new Map<string, string>());
  const tintedBrushTips = useRef(new Map<string, HTMLCanvasElement>());
  const customFontFileRef = useRef<HTMLInputElement>(null);
  const smartObjectFileRef = useRef<HTMLInputElement>(null);
  const filterPluginFileRef = useRef<HTMLInputElement>(null);
  const smartFileAction = useRef<'link' | 'replace' | 'relink'>('link');
  const smartFilterPreviewRef = useRef(false);
  const smartFilterFinalTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  useEffect(
    () => () => {
      if (smartFilterFinalTimer.current)
        clearTimeout(smartFilterFinalTimer.current);
      smartFilterRenderCache.clear();
    },
    [],
  );
  const clipboardRef = useRef<{
    pixels: HTMLCanvasElement;
    precision?: WorkingSurface;
    x: number;
    y: number;
  } | null>(null);
  const effectsClipboardRef = useRef<LayerEffects | null>(null);
  const layerClipboardRef = useRef<{
    documentName: string;
    width: number;
    height: number;
    layers: LayerMeta[];
    rootIds: string[];
    surfaces: Map<string, LayerSurface>;
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
  const [workingDepth, setWorkingDepthState] = useState<WorkingDepth>('8u');
  const workingDepthRef = useRef<WorkingDepth>('8u');
  const [sceneReferred, setSceneReferredState] = useState(false);
  const sceneReferredRef = useRef(false);
  const [colorProfile, setColorProfileState] = useState<ColorProfileId>('srgb');
  const colorProfileRef = useRef<ColorProfileId>('srgb');
  const colorProfileDataRef = useRef<PortableIccProfile | undefined>(undefined);
  const setWorkingDepth = (depth: WorkingDepth) => {
    workingDepthRef.current = depth;
    setWorkingDepthState(depth);
  };
  const setSceneReferred = (value: boolean) => {
    sceneReferredRef.current = value;
    setSceneReferredState(value);
  };
  const setColorProfile = (
    value: ColorProfileId,
    data: PortableIccProfile | undefined = portableIccProfile(value),
  ) => {
    if (data) registerIccProfile(data);
    const normalized = normalizeColorProfile(value);
    colorProfileRef.current = normalized;
    colorProfileDataRef.current = portableIccProfile(normalized);
    setColorProfileState(normalized);
  };
  const [artboards, setArtboards] = useState<Artboard[]>([]),
    [activeArtboardId, setActiveArtboardId] = useState(''),
    [showArtboards, setShowArtboards] = useState(true),
    [assetScales, setAssetScales] = useState([1, 2, 3]);
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
  const [selectionShape, setSelectionShape] =
    useState<MarqueeShape>('rectangle');
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
    [brushAngle, setBrushAngle] = useState(0),
    [brushRoundness, setBrushRoundness] = useState(100),
    [sizeJitter, setSizeJitter] = useState(0),
    [hueJitter, setHueJitter] = useState(0),
    [opacityJitter, setOpacityJitter] = useState(0),
    [flowJitter, setFlowJitter] = useState(0),
    [brushScatter, setBrushScatter] = useState(0),
    [brushTexture, setBrushTexture] = useState(0),
    [dualBrush, setDualBrush] = useState(false),
    [dualBrushScale, setDualBrushScale] = useState(55),
    [dualBrushOffset, setDualBrushOffset] = useState(30),
    [wetEdges, setWetEdges] = useState(false),
    [airbrushBuildUp, setAirbrushBuildUp] = useState(false),
    [brushSymmetry, setBrushSymmetry] = useState<BrushSymmetry>('none'),
    [radialSymmetryCount, setRadialSymmetryCount] = useState(6),
    [brushSourceMode, setBrushSourceMode] = useState<
      'color' | 'history' | 'art-history'
    >('color'),
    [mixerWet, setMixerWet] = useState(50),
    [mixerLoad, setMixerLoad] = useState(50),
    [mixerMix, setMixerMix] = useState(50),
    [mixerBrush, setMixerBrush] = useState(false),
    [brushTips, setBrushTips] = useState<BrushTipRecord[]>([]),
    [activeBrushTipId, setActiveBrushTipId] = useState(''),
    [brushQuery, setBrushQuery] = useState(''),
    [brushFolder, setBrushFolder] = useState('all'),
    [brushFavoritesOnly, setBrushFavoritesOnly] = useState(false);
  const [paintMode, setPaintMode] = useState<'brush' | 'pencil'>('brush');
  const [brushRendererBackend, setBrushRendererBackend] =
    useState<BrushRendererBackend>('canvas2d');
  useEffect(() => {
    const renderer = new GpuBrushRenderer();
    brushRenderer.current = renderer;
    setBrushRendererBackend(renderer.backend);
    void renderer.ready.then((backend) => {
      if (brushRenderer.current === renderer) setBrushRendererBackend(backend);
    });
    return () => {
      renderer.dispose();
      if (brushRenderer.current === renderer) brushRenderer.current = null;
    };
  }, []);
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
  const [curveTargetChannel, setCurveTargetChannel] =
    useState<CurveChannel | null>(null);
  const [hueTarget, setHueTarget] = useState<HueSaturationRangeTarget | null>(
    null,
  );
  const [levelsTarget, setLevelsTarget] = useState<{
    kind: 'black' | 'gray' | 'white';
    channel: CurveChannel;
  } | null>(null);
  const [text, setText] = useState('Your text');
  const [fontSize, setFontSize] = useState(64);
  const [fileName, setFileName] = useState('Untitled artwork');
  const [saved, setSaved] = useState(true);
  const [status, setStatus] = useState('Ready');
  const [activeJob, setActiveJob] = useState<{
    id: string;
    label: string;
    progress: number;
  } | null>(null);
  const activeJobAbort = useRef<AbortController | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  useEffect(() => {
    try {
      const interrupted = localStorage.getItem('librelayer-active-job');
      if (interrupted) {
        const record = JSON.parse(interrupted) as { label?: string };
        localStorage.removeItem('librelayer-active-job');
        setStatus(
          `${record.label || 'A background operation'} ended before completion · the last intact document state was restored`,
        );
      }
    } catch {
      localStorage.removeItem('librelayer-active-job');
    }
    return () => activeJobAbort.current?.abort();
  }, []);
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
    [cloneMode, setCloneMode] = useState<'clone' | 'pattern'>('clone'),
    [activeCloneSourceSlot, setActiveCloneSourceSlot] = useState(0),
    [cloneSourceVersion, setCloneSourceVersion] = useState(0),
    [retouchMode, setRetouchMode] = useState<
      | 'healing'
      | 'spot'
      | 'dodge'
      | 'burn'
      | 'sponge'
      | 'blur'
      | 'sharpen'
      | 'smudge'
      | 'red-eye'
    >('healing'),
    [retouchSampleAll, setRetouchSampleAll] = useState(true),
    [pathCurved, setPathCurved] = useState(false),
    [pathMode, setPathMode] = useState<'straight' | 'curvature' | 'freeform'>(
      'straight',
    ),
    [pathTension, setPathTension] = useState(50),
    [selectedPathIds, setSelectedPathIds] = useState<string[]>([]),
    [selectedAnchorIndex, setSelectedAnchorIndex] = useState(0),
    [shapeKind, setShapeKind] = useState<'rectangle' | 'ellipse' | 'polygon'>(
      'rectangle',
    ),
    [polygonSides, setPolygonSides] = useState(5),
    [textParagraph, setTextParagraph] = useState(false),
    [textWidth, setTextWidth] = useState(420),
    [fontFamily, setFontFamily] = useState('Arial'),
    [fontWeight, setFontWeight] = useState(600),
    [fontStyle, setFontStyle] = useState<TextStyle>('normal'),
    [fontStretch, setFontStretch] = useState(100),
    [fontAvailable, setFontAvailable] = useState(true),
    [customFonts, setCustomFonts] = useState<string[]>([]),
    [textTracking, setTextTracking] = useState(0),
    [textKerning, setTextKerning] = useState(true),
    [textLeading, setTextLeading] = useState(1.2),
    [textBaseline, setTextBaseline] = useState(0),
    [textAlign, setTextAlign] = useState<
      'left' | 'center' | 'right' | 'justify'
    >('left'),
    [textPathMode, setTextPathMode] = useState<'none' | 'along' | 'inside'>(
      'none',
    ),
    [textPathId, setTextPathId] = useState(''),
    [textWarp, setTextWarp] = useState(0),
    [textWarpStyle, setTextWarpStyle] = useState<TextWarpStyle>('none'),
    [textFit, setTextFit] = useState<'none' | 'shrink' | 'fill'>('none'),
    [textBoxHeight, setTextBoxHeight] = useState(280),
    [textSmallCaps, setTextSmallCaps] = useState(false),
    [textLigatures, setTextLigatures] = useState(true),
    [textDirection, setTextDirection] = useState<TextDirection>('auto'),
    [textLanguage, setTextLanguage] = useState('en'),
    [textUnderline, setTextUnderline] = useState(false),
    [textStrike, setTextStrike] = useState(false),
    [textIndent, setTextIndent] = useState(0),
    [textSpaceBefore, setTextSpaceBefore] = useState(0),
    [textSpaceAfter, setTextSpaceAfter] = useState(0);
  const firstDocumentId = useRef(crypto.randomUUID());
  const activeDocumentRef = useRef(firstDocumentId.current);
  const documentStoreRef = useRef(new Map<string, EditorDocument>());
  const syncEmbeddedSourceRef = useRef<() => void>(() => {});
  const [activeDocumentId, setActiveDocumentId] = useState(
    firstDocumentId.current,
  );
  const [documents, setDocuments] = useState<
    { id: string; name: string; saved: boolean }[]
  >([{ id: firstDocumentId.current, name: 'Untitled artwork', saved: true }]);

  useEffect(() => {
    let cancelled = false;
    void brushTipRecords()
      .then(async (records) => {
        for (const record of records) {
          if (cancelled) return;
          brushTipCanvases.current.set(
            record.id,
            await blobCanvas(record.blob),
          );
          const url = URL.createObjectURL(record.blob);
          brushTipUrls.current.set(record.id, url);
        }
        if (cancelled) return;
        setBrushTips(records);
        const remembered = localStorage.getItem('librelayer-active-brush-tip');
        if (remembered && records.some((record) => record.id === remembered))
          setActiveBrushTipId(remembered);
        else localStorage.removeItem('librelayer-active-brush-tip');
      })
      .catch(() => setStatus('Saved brush tips could not be restored'));
    return () => {
      cancelled = true;
      brushTipUrls.current.forEach((url) => URL.revokeObjectURL(url));
      brushTipUrls.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!brushTips.length) return;
    if (activeBrushTipId)
      localStorage.setItem('librelayer-active-brush-tip', activeBrushTipId);
    else localStorage.removeItem('librelayer-active-brush-tip');
    tintedBrushTips.current.clear();
  }, [activeBrushTipId, brushTips.length]);

  useEffect(() => {
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled)
        setFontAvailable(
          document.fonts.check(`${fontWeight} 16px "${fontFamily}"`),
        );
    });
    return () => {
      cancelled = true;
    };
  }, [fontFamily, fontWeight, customFonts]);

  const loadCustomFont = async (file?: File) => {
    if (!file) return;
    const family = file.name
      .replace(/\.(woff2?|ttf|otf)$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim();
    if (!family) return;
    try {
      const face = new FontFace(family, await file.arrayBuffer(), {
        weight: '1 1000',
        stretch: '50% 200%',
      });
      await face.load();
      document.fonts.add(face);
      setCustomFonts((items) =>
        items.includes(family) ? items : [...items, family],
      );
      setFontFamily(family);
      setFontAvailable(true);
      setStatus(`${family} loaded locally for this editing session`);
    } catch {
      setStatus('That font could not be loaded. Try WOFF2, WOFF, TTF, or OTF.');
    } finally {
      if (customFontFileRef.current) customFontFileRef.current.value = '';
    }
  };

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
  const syncPrecisionSurface = (surface: LayerSurface) => {
    if (!surface.precision) return 0;
    if (
      surface.precision.width !== surface.pixels.width ||
      surface.precision.height !== surface.pixels.height
    )
      throw Error('High-depth backing dimensions no longer match the layer.');
    const pixels = surface.pixels
      .getContext('2d', { willReadFrequently: true })!
      .getImageData(0, 0, surface.pixels.width, surface.pixels.height).data;
    return syncWorkingSurfaceFromRgba8(surface.precision, pixels);
  };
  const createPrecisionBacking = (
    surface: LayerSurface,
    depth: HighWorkingDepth,
  ) => {
    const pixels = surface.pixels
      .getContext('2d', { willReadFrequently: true })!
      .getImageData(0, 0, surface.pixels.width, surface.pixels.height).data;
    return workingSurfaceFromRgba8(
      pixels,
      surface.pixels.width,
      surface.pixels.height,
      depth,
    );
  };
  const syncTiledBacking = (
    surface: LayerSurface,
    dirty?: { pixels?: DirtyRegion; mask?: DirtyRegion },
    previous?: { pixels?: TiledImage; mask?: TiledImage },
  ) => {
    surface.backing = captureTiles(
      surface.pixels,
      surface.backing ?? previous?.pixels,
      dirty?.pixels,
    );
    surface.pixels.dataset.tileBacked = 'true';
    surface.pixels.dataset.tileCount = String(surface.backing.tiles.length);
    if (surface.mask) {
      surface.maskBacking = captureTiles(
        surface.mask,
        surface.maskBacking ?? previous?.mask,
        dirty?.mask,
      );
      surface.mask.dataset.tileBacked = 'true';
      surface.mask.dataset.tileCount = String(surface.maskBacking.tiles.length);
    } else surface.maskBacking = undefined;
    return { pixels: surface.backing, mask: surface.maskBacking };
  };
  const surfaceMemoryUnits = (surface: LayerSurface) =>
    surface.pixels.width * surface.pixels.height +
    (surface.mask ? surface.mask.width * surface.mask.height : 0) +
    (surface.precision ? surface.precision.data.byteLength / 4 : 0);
  const currentWorkingPixels = () => {
    let pixels = 0;
    const count = (surfaces: Map<string, LayerSurface>) => {
      for (const surface of surfaces.values())
        pixels += surfaceMemoryUnits(surface);
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
    const policy = normalizeHistoryPolicy(
      preferences.historyDepth,
      preferences.historyBudgetMb,
    );
    let trimmed = false;
    for (const d of inactive)
      while (
        d.history.length > 1 &&
        historyExceedsPolicy(d.history.length, total(), policy)
      ) {
        if (d.historyIndex > 0) {
          d.history = d.history.slice(1);
          d.historyIndex--;
        } else d.history = d.history.slice(0, -1);
        trimmed = true;
      }
    while (
      historyRef.current.length > 1 &&
      historyExceedsPolicy(historyRef.current.length, total(), policy)
    ) {
      if (historyIndex.current > 0) {
        historyRef.current = historyRef.current.slice(1);
        historyIndex.current--;
      } else historyRef.current = historyRef.current.slice(0, -1);
      trimmed = true;
    }
    if (trimmed)
      setStatus(
        `Older undo steps were released to stay within ${policy.depth} states and ${policy.budgetMb.toLocaleString()} MB.`,
      );
  };
  const renderLayers = (
    ctx: CanvasRenderingContext2D,
    stack = layersRef.current,
    surfaceMap = surfacesRef.current,
    size = doc,
    quality: FilterGraphQuality = 'final',
    precision: RenderPrecision = 'u8',
  ) => {
    const device = navigator as Navigator & { deviceMemory?: number };
    const performancePolicy = adaptivePerformancePolicy({
      mode: preferences.performanceMode,
      documentPixels: size.w * size.h,
      layerCount: stack.length,
      deviceMemoryGb: device.deviceMemory,
      hardwareConcurrency: device.hardwareConcurrency,
    });
    smartFilterRenderCache.setBudget(
      Math.max(1, Math.floor((performancePolicy.cacheBudgetMb * 1048576) / 4)),
    );
    const visible = (layer: LayerMeta) =>
      layer.visible && !ancestors(stack, layer.id).some((p) => !p.visible);
    const erase = (
      target: CanvasRenderingContext2D,
      mask: HTMLCanvasElement,
    ) => {
      target.save();
      target.globalAlpha = 1;
      target.globalCompositeOperation = 'destination-out';
      target.drawImage(mask, 0, 0);
      target.restore();
    };
    const nodeAppearance = (layer: LayerMeta): HTMLCanvasElement | null => {
      if (layer.kind === 'adjustment') return null;
      const appearance = makeCanvas(size.w, size.h, precision);
      if (layer.kind === 'group') {
        const masks = paintSiblings(appearance.getContext('2d')!, layer.id);
        for (const mask of masks) mask.width = mask.height = 1;
        return appearance;
      }
      const surface = surfaceMap.get(layer.id);
      if (!surface) {
        appearance.width = appearance.height = 1;
        return null;
      }
      drawLayer(
        appearance.getContext('2d')!,
        {
          ...layer,
          opacity: 100,
          fill: 100,
          blend: 'source-over',
          blendIf: undefined,
          clipping: false,
          knockout: 'none',
        },
        surface,
        size.w,
        size.h,
        quality,
        performancePolicy.previewPixelBudget,
        precision,
      );
      return appearance;
    };
    const paintSurface = (
      target: CanvasRenderingContext2D,
      layer: LayerMeta,
      surface: LayerSurface,
      siblings: LayerMeta[],
    ) => {
      const source = makeCanvas(size.w, size.h, precision),
        sourceContext = source.getContext('2d')!;
      drawLayer(
        sourceContext,
        {
          ...layer,
          kind: 'pixel',
          blend: 'source-over',
          blendIf: undefined,
          clipping: false,
          knockout: 'none',
        },
        surface,
        size.w,
        size.h,
        quality,
        performancePolicy.previewPixelBudget,
        precision,
      );
      if (layer.clipping) {
        const baseId = clippingBaseId(siblings, layer.id),
          base = stack.find((candidate) => candidate.id === baseId),
          alpha = base && visible(base) ? nodeAppearance(base) : null;
        if (!alpha) {
          source.width = source.height = 1;
          return [] as HTMLCanvasElement[];
        }
        sourceContext.globalCompositeOperation = 'destination-in';
        sourceContext.drawImage(alpha, 0, 0);
        sourceContext.globalCompositeOperation = 'source-over';
        alpha.width = alpha.height = 1;
      }
      const knockout = layer.knockout ?? 'none',
        deepMasks: HTMLCanvasElement[] = [];
      if (knockout !== 'none') {
        erase(target, source);
        if (knockout === 'deep') {
          const mask = makeCanvas(size.w, size.h, precision);
          mask.getContext('2d')!.drawImage(source, 0, 0);
          deepMasks.push(mask);
        }
      }
      if (
        layer.blendIf ||
        pixelBlendModes.has(layer.blend) ||
        layer.blendSpace === 'linear'
      )
        compositePixels(
          target,
          source,
          layer.blend,
          layer.blendIf,
          layer.blendSpace,
          precision,
        );
      else {
        target.save();
        target.globalAlpha = 1;
        target.globalCompositeOperation =
          layer.blend as GlobalCompositeOperation;
        target.drawImage(source, 0, 0);
        target.restore();
      }
      source.width = source.height = 1;
      return deepMasks;
    };
    const paintNode = (
      target: CanvasRenderingContext2D,
      layer: LayerMeta,
      siblings: LayerMeta[],
    ): HTMLCanvasElement[] => {
      if (!visible(layer)) return [];
      if (layer.kind === 'adjustment') {
        applyAdjustment(
          target,
          layer,
          size.w,
          size.h,
          surfaceMap.get(layer.id),
          precision,
        );
        return [];
      }
      if (layer.kind === 'group') {
        if (groupCanPassThrough(layer)) return paintSiblings(target, layer.id);
        const groupCanvas = makeCanvas(size.w, size.h, precision),
          nestedDeep = paintSiblings(groupCanvas.getContext('2d')!, layer.id);
        for (const mask of nestedDeep) erase(target, mask);
        const groupSurface = surfaceMap.get(layer.id),
          applied = paintSurface(
            target,
            layer,
            { pixels: groupCanvas, mask: groupSurface?.mask },
            siblings,
          );
        groupCanvas.width = groupCanvas.height = 1;
        return [...nestedDeep, ...applied];
      }
      const surface = surfaceMap.get(layer.id);
      return surface ? paintSurface(target, layer, surface, siblings) : [];
    };
    function paintSiblings(
      target: CanvasRenderingContext2D,
      parentId?: string,
    ) {
      const siblings = stack.filter((layer) => layer.parentId === parentId),
        deepMasks: HTMLCanvasElement[] = [];
      for (const layer of [...siblings].reverse())
        deepMasks.push(...paintNode(target, layer, siblings));
      return deepMasks;
    }
    ctx.clearRect(0, 0, size.w, size.h);
    const deepMasks = paintSiblings(ctx);
    for (const mask of deepMasks) mask.width = mask.height = 1;
  };
  const renderEditableSurface = (
    stack = layersRef.current,
    surfaceMap = surfacesRef.current,
    size = doc,
    background?: string,
  ): LayerSurface => {
    const highDepth = workingDepthRef.current !== '8u',
      precision: RenderPrecision =
        highDepth && floatCanvasSupported() ? 'f16' : 'u8',
      rendered = makeCanvas(size.w, size.h, precision),
      context = canvasContext(rendered, precision, true)!;
    renderLayers(context, stack, surfaceMap, size, 'final', precision);
    if (background) {
      context.save();
      context.globalCompositeOperation = 'destination-over';
      context.fillStyle = background;
      context.fillRect(0, 0, size.w, size.h);
      context.restore();
    }
    if (!highDepth) return { pixels: rendered };
    const backing =
        precision === 'f16'
          ? workingSurfaceFromFloat32(
              readFloatCanvas(context, 0, 0, size.w, size.h),
              size.w,
              size.h,
              workingDepthRef.current as HighWorkingDepth,
            )
          : createPrecisionBacking(
              { pixels: rendered },
              workingDepthRef.current as HighWorkingDepth,
            ),
      proxy = makeCanvas(size.w, size.h);
    proxy
      .getContext('2d')!
      .putImageData(
        new ImageData(workingSurfaceToRgba8(backing), size.w, size.h),
        0,
        0,
      );
    rendered.width = rendered.height = 1;
    return { pixels: proxy, precision: backing };
  };
  const copyRenderedRegion = (
    stack: LayerMeta[],
    surfaceMap: Map<string, LayerSurface>,
    x: number,
    y: number,
    width: number,
    height: number,
    selectionMaskCanvas?: HTMLCanvasElement,
  ) => {
    const highDepth = workingDepthRef.current !== '8u',
      precision: RenderPrecision =
        highDepth && floatCanvasSupported() ? 'f16' : 'u8',
      full = makeCanvas(doc.w, doc.h, precision),
      region = makeCanvas(width, height, precision),
      regionContext = canvasContext(region, precision, true)!;
    renderLayers(
      canvasContext(full, precision, true)!,
      stack,
      surfaceMap,
      doc,
      'final',
      precision,
    );
    regionContext.drawImage(full, -x, -y);
    if (selectionMaskCanvas) {
      regionContext.globalCompositeOperation = 'destination-in';
      regionContext.drawImage(selectionMaskCanvas, -x, -y);
      regionContext.globalCompositeOperation = 'source-over';
    }
    full.width = full.height = 1;
    if (!highDepth) return { pixels: region, x, y };
    const backing =
        precision === 'f16'
          ? workingSurfaceFromFloat32(
              readFloatCanvas(regionContext, 0, 0, width, height),
              width,
              height,
              workingDepthRef.current as HighWorkingDepth,
            )
          : createPrecisionBacking(
              { pixels: region },
              workingDepthRef.current as HighWorkingDepth,
            ),
      proxy = makeCanvas(width, height);
    proxy
      .getContext('2d')!
      .putImageData(
        new ImageData(workingSurfaceToRgba8(backing), width, height),
        0,
        0,
      );
    region.width = region.height = 1;
    return { pixels: proxy, precision: backing, x, y };
  };
  const render = useCallback(
    (forceComposite = true) => {
      const out = displayRef.current;
      if (!out) return;
      if (out.width !== doc.w) out.width = doc.w;
      if (out.height !== doc.h) out.height = doc.h;
      const highDepth = workingDepthRef.current !== '8u',
        renderPrecision: RenderPrecision =
          highDepth && floatCanvasSupported() ? 'f16' : 'u8',
        quality = smartFilterPreviewRef.current ? 'preview' : 'final',
        cacheKey = displayCompositeKey({
          documentId: activeDocumentRef.current,
          width: doc.w,
          height: doc.h,
          precision: renderPrecision,
          quality,
          sceneReferred,
          profileId: colorProfileRef.current,
          hdrPreviewMode: preferences.hdrPreviewMode ?? 'auto',
          layerSignature: JSON.stringify(layersRef.current),
        }),
        cached = displayCompositeCache.current,
        reusableCache =
          !forceComposite && cached?.key === cacheKey ? cached : null,
        requestedMip = mipLevelForZoom(zoom, reusableCache?.mips.length ?? 0),
        cachedSource = reusableCache
          ? requestedMip === 0
            ? reusableCache.base
            : reusableCache.mips[requestedMip - 1]
          : undefined,
        ctx = canvasContext(out, renderPrecision, true)!;
      if (cachedSource && reusableCache) {
        ctx.clearRect(0, 0, doc.w, doc.h);
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(cachedSource, 0, 0, doc.w, doc.h);
        ctx.restore();
        if (reusableCache.dynamicRange)
          out.style.setProperty(
            'dynamic-range-limit',
            reusableCache.dynamicRange,
          );
        else out.style.removeProperty('dynamic-range-limit');
        if (reusableCache.hdrPreview)
          out.dataset.hdrPreview = reusableCache.hdrPreview;
        else delete out.dataset.hdrPreview;
        out.dataset.renderPrecision = reusableCache.renderPrecision;
        out.dataset.compositeSource =
          requestedMip === 0 ? 'cache-full' : `cache-mip-${requestedMip}`;
      } else {
        if (highDepth)
          for (const surface of surfacesRef.current.values())
            if (surface.precision) syncPrecisionSurface(surface);
        renderLayers(
          ctx,
          layersRef.current,
          surfacesRef.current,
          doc,
          quality,
          renderPrecision,
        );
        if (renderPrecision === 'f16') {
          const raw = readFloatCanvas(ctx, 0, 0, doc.w, doc.h),
            capability = hdrDisplayCapability(),
            previewMode = normalizeHdrPreviewMode(preferences.hdrPreviewMode),
            preview = sceneReferred
              ? createHdrPreviewPixels(
                  raw,
                  previewMode,
                  capability.css && capability.media && capability.float16,
                )
              : { pixels: raw, extended: false };
          putFloatCanvas(ctx, preview.pixels, doc.w, doc.h);
          out.style.setProperty(
            'dynamic-range-limit',
            preview.extended ? 'no-limit' : 'standard',
          );
          out.dataset.hdrPreview = sceneReferred
            ? preview.extended
              ? 'extended'
              : previewMode === 'highlights'
                ? 'highlights'
                : 'sdr'
            : 'display-referred';
          out.dataset.renderPrecision = 'float16';
        } else {
          out.style.removeProperty('dynamic-range-limit');
          delete out.dataset.hdrPreview;
          out.dataset.renderPrecision = 'uint8-fallback';
        }
        releaseDisplayCompositeCache();
        if (!gesturePaintTool.current) {
          const base =
              doc.w * doc.h <= 16_000_000
                ? makeCanvas(doc.w, doc.h)
                : undefined,
            mips: HTMLCanvasElement[] = [];
          if (base) base.getContext('2d')!.drawImage(out, 0, 0);
          let source: CanvasImageSource = out;
          for (const dimensions of mipChainDimensions(doc.w, doc.h)) {
            const mip = makeCanvas(dimensions.width, dimensions.height),
              mipContext = mip.getContext('2d')!;
            mipContext.imageSmoothingEnabled = true;
            mipContext.imageSmoothingQuality = 'high';
            mipContext.drawImage(source, 0, 0, mip.width, mip.height);
            mips.push(mip);
            source = mip;
          }
          displayCompositeCache.current = {
            key: cacheKey,
            base,
            mips,
            dynamicRange:
              out.style.getPropertyValue('dynamic-range-limit') || '',
            hdrPreview: out.dataset.hdrPreview,
            renderPrecision: out.dataset.renderPrecision ?? 'uint8-fallback',
          };
        }
        if (!cachedSource) out.dataset.compositeSource = 'fresh';
      }
      const activeLayer = layersRef.current.find(
          (layer) => layer.id === selectedRef.current,
        ),
        activeSurface = activeLayer && surfacesRef.current.get(activeLayer.id);
      if (
        activeLayer?.maskOverlay &&
        activeLayer.hasMask &&
        activeSurface?.mask
      ) {
        const transform =
            activeLayer.maskLinked === false
              ? activeLayer.maskTransform
              : {
                  x: activeLayer.x,
                  y: activeLayer.y,
                  rotation: activeLayer.rotation,
                  scaleX: activeLayer.scaleX,
                  scaleY: activeLayer.scaleY,
                },
          alpha = positionedMaskAlpha(
            activeSurface.mask,
            activeLayer.maskDensity,
            activeLayer.maskFeather,
            transform,
            doc.w,
            doc.h,
          ),
          overlay = makeCanvas(doc.w, doc.h),
          overlayContext = overlay.getContext('2d')!;
        overlayContext.fillStyle = 'rgba(255,35,85,.48)';
        overlayContext.fillRect(0, 0, doc.w, doc.h);
        overlayContext.globalCompositeOperation = 'destination-out';
        overlayContext.drawImage(alpha, 0, 0);
        ctx.drawImage(overlay, 0, 0);
        alpha.width = alpha.height = overlay.width = overlay.height = 1;
      }
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
    },
    [
      doc,
      channelView,
      soloChannel,
      cloneOverlay,
      tool,
      retouchMode,
      zoom,
      size,
      selectedId,
      workingDepth,
      sceneReferred,
      preferences.hdrPreviewMode,
    ],
  );
  useEffect(() => {
    render(false);
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
    (
      label: string,
      named = false,
      dirtySurface?: {
        surfaceId: string;
        pixels?: DirtyRegion;
        mask?: DirtyRegion;
      },
    ) => {
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
        workingDepth: workingDepthRef.current,
        sceneReferred: sceneReferredRef.current,
        colorProfile: colorProfileRef.current,
        colorProfileData: colorProfileDataRef.current
          ? structuredClone(colorProfileDataRef.current)
          : undefined,
        layers: layersRef.current.map((x) => ({ ...x })),
        selectedId: selectedRef.current,
        selectedIds: [...selectedIdsRef.current],
        selection: selectionCanvas
          ? dirtySurface && previous?.selection
            ? previous.selection
            : captureTiles(selectionCanvas, previous?.selection)
          : undefined,
        selectionBounds: selectionRef.current
          ? { ...selectionRef.current }
          : null,
        selectionPath: selectionPathRef.current?.map((p) => ({ ...p })) ?? null,
        paths: paths.map((path) => structuredClone(path)),
        artboards: artboards.map((artboard) => ({ ...artboard })),
        layerComps: layerComps.map((c) => ({
          ...c,
          states: c.states.map((s) => ({ ...s })),
        })),
        view: {
          ...view,
          rulerOrigin: { ...view.rulerOrigin },
          guides: view.guides.map((g) => ({ ...g })),
        },
        thumbnail: (() => {
          const source = displayRef.current;
          if (!source?.width || !source.height) return undefined;
          const scale = Math.min(1, 96 / source.width, 64 / source.height),
            thumbnail = makeCanvas(
              Math.max(1, Math.round(source.width * scale)),
              Math.max(1, Math.round(source.height * scale)),
            );
          thumbnail
            .getContext('2d')!
            .drawImage(source, 0, 0, thumbnail.width, thumbnail.height);
          const data = thumbnail.toDataURL('image/webp', 0.72);
          thumbnail.width = thumbnail.height = 1;
          return data;
        })(),
        surfaces: layersRef.current.map((meta) => {
          const s = surfacesRef.current.get(meta.id)!,
            old = previous?.surfaces.find((x) => x.id === meta.id),
            localized = dirtySurface?.surfaceId === meta.id;
          if (workingDepthRef.current !== '8u' && !s.precision)
            s.precision = createPrecisionBacking(
              s,
              workingDepthRef.current as HighWorkingDepth,
            );
          const precisionChanges = syncPrecisionSurface(s);
          const backing =
            dirtySurface && old && !localized
              ? {
                  pixels: s.backing ?? old.pixels,
                  mask: s.mask ? (s.maskBacking ?? old.mask) : undefined,
                }
              : localized && old && !dirtySurface?.pixels
                ? {
                    pixels: s.backing ?? old.pixels,
                    mask: s.mask
                      ? dirtySurface.mask
                        ? syncTiledBacking(
                            s,
                            { mask: dirtySurface.mask },
                            { pixels: old.pixels, mask: old.mask },
                          ).mask
                        : (s.maskBacking ?? old.mask)
                      : undefined,
                  }
                : syncTiledBacking(
                    s,
                    localized
                      ? {
                          pixels: dirtySurface?.pixels,
                          mask: dirtySurface?.mask,
                        }
                      : undefined,
                    { pixels: old?.pixels, mask: old?.mask },
                  );
          s.backing = backing.pixels;
          s.maskBacking = backing.mask;
          return {
            id: meta.id,
            pixels: backing.pixels,
            mask: backing.mask,
            precision: s.precision
              ? precisionChanges === 0 && old?.precision
                ? old.precision
                : cloneWorkingSurface(s.precision)
              : undefined,
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
      setTimeout(() => syncEmbeddedSourceRef.current(), 0);
    },
    [doc, paths, artboards, layerComps, view],
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
    releaseDisplayCompositeCache();
    const nextMap = new Map<string, LayerSurface>();
    for (const item of snap.surfaces) {
      const pixels = restoreTiles(item.pixels),
        mask = item.mask ? restoreTiles(item.mask) : undefined;
      nextMap.set(item.id, {
        pixels,
        mask,
        backing: item.pixels,
        maskBacking: item.mask,
        precision: item.precision
          ? cloneWorkingSurface(item.precision)
          : undefined,
      });
    }
    surfacesRef.current = nextMap;
    setDoc({ w: snap.w, h: snap.h });
    setWorkingDepth(snap.workingDepth ?? '8u');
    setSceneReferred(snap.sceneReferred === true);
    if (snap.colorProfileData) registerIccProfile(snap.colorProfileData);
    setColorProfile(
      normalizeColorProfile(snap.colorProfile),
      snap.colorProfileData,
    );
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
    if (snap.paths) setPaths(snap.paths.map((path) => structuredClone(path)));
    setArtboards((snap.artboards ?? []).map((artboard) => ({ ...artboard })));
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
    setTimeout(() => syncEmbeddedSourceRef.current(), 0);
  }, []);
  const restoreSelectedLayerFromSnapshot = (index: number) => {
    const snap = historyRef.current[index],
      id = selectedRef.current,
      currentMeta = layersRef.current.find((layer) => layer.id === id),
      historicMeta = snap?.layers.find((layer) => layer.id === id),
      historicSurface = snap?.surfaces.find((surface) => surface.id === id);
    if (!snap || !currentMeta || !historicMeta || !historicSurface) {
      setStatus('The selected layer does not exist in that history state');
      return;
    }
    if (locked(layersRef.current, id)) {
      setStatus('Unlock the selected layer before restoring it');
      return;
    }
    const previousSurface = surfacesRef.current.get(id),
      nextSurface: LayerSurface = {
        pixels: restoreTiles(historicSurface.pixels),
        mask: historicSurface.mask
          ? restoreTiles(historicSurface.mask)
          : undefined,
        precision: historicSurface.precision
          ? cloneWorkingSurface(historicSurface.precision)
          : undefined,
        backing: historicSurface.pixels,
        maskBacking: historicSurface.mask,
      },
      parentId = historicMeta.parentId
        ? layersRef.current.some((layer) => layer.id === historicMeta.parentId)
          ? historicMeta.parentId
          : currentMeta.parentId
        : undefined;
    surfacesRef.current.set(id, nextSurface);
    syncLayers(
      layersRef.current.map((layer) =>
        layer.id === id ? { ...historicMeta, parentId } : layer,
      ),
    );
    render();
    setTimeout(
      () => snapshot(`Restore ${historicMeta.name} from ${snap.label}`),
      0,
    );
    if (previousSurface) {
      previousSurface.pixels.width = previousSurface.pixels.height = 1;
      if (previousSurface.mask)
        previousSurface.mask.width = previousSurface.mask.height = 1;
    }
    setStatus(`${historicMeta.name} restored from ${snap.label}`);
  };
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
        backing: item.pixels,
        maskBacking: item.mask,
        precision: item.precision
          ? cloneWorkingSurface(item.precision)
          : undefined,
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
        workingDepth: snap.workingDepth ?? '8u',
        sceneReferred: snap.sceneReferred === true,
        colorProfile: normalizeColorProfile(snap.colorProfile),
        colorProfileData: snap.colorProfileData
          ? structuredClone(snap.colorProfileData)
          : undefined,
        layers: branchSnapshot.layers,
        surfaces,
        selectedId: snap.selectedId,
        selectedIds: branchSnapshot.selectedIds,
        history: [branchSnapshot],
        historyIndex: 0,
        zoom,
        selection: snap.selectionBounds ? { ...snap.selectionBounds } : null,
        selectionPath: snap.selectionPath?.map((point) => ({ ...point })),
        paths: snap.paths?.map((path) => structuredClone(path)),
        artboards: snap.artboards?.map((artboard) => ({ ...artboard })),
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
  const activateHistoryBrush = (artistic = false) => {
    const sourceSnapshot =
        historyRef.current[Math.max(0, historyIndex.current - 1)],
      source = sourceSnapshot?.surfaces.find(
        (surface) => surface.id === selectedRef.current,
      );
    if (!source) {
      setStatus('Create another history state on this layer first');
      return;
    }
    if (historyBrushBuffer.current)
      historyBrushBuffer.current.width = historyBrushBuffer.current.height = 1;
    historyBrushBuffer.current = restoreTiles(source.pixels);
    setBrushSourceMode(artistic ? 'art-history' : 'history');
    setTool('brush');
    setStatus(
      artistic
        ? 'Art History Brush ready from the previous layer state'
        : 'History Brush ready from the previous layer state',
    );
  };
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
      workingDepth: workingDepthRef.current,
      sceneReferred: sceneReferredRef.current,
      colorProfile: colorProfileRef.current,
      colorProfileData: colorProfileDataRef.current
        ? structuredClone(colorProfileDataRef.current)
        : undefined,
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
      artboards,
      savedSelections,
      feather,
      smartObjectSource: documentStoreRef.current.get(id)?.smartObjectSource,
    });
  };
  const embeddedDataForDocument = (
    source: EditorDocument,
  ): EmbeddedDocumentData => ({
    version: 1,
    width: source.doc.w,
    height: source.doc.h,
    workingDepth: source.workingDepth ?? '8u',
    sceneReferred: source.sceneReferred === true,
    colorProfile: normalizeColorProfile(source.colorProfile),
    colorProfileData: source.colorProfileData
      ? structuredClone(source.colorProfileData)
      : undefined,
    layers: structuredClone(source.layers),
    surfaces: source.layers.map((layer) => {
      const surface = source.surfaces.get(layer.id);
      if (!surface) throw Error('Embedded Smart Object pixels are missing');
      const sourceDepth = source.workingDepth ?? '8u';
      if (sourceDepth !== '8u' && !surface.precision)
        surface.precision = createPrecisionBacking(
          surface,
          sourceDepth as HighWorkingDepth,
        );
      syncPrecisionSurface(surface);
      return {
        id: layer.id,
        pixels: surface.pixels.toDataURL('image/png'),
        mask: surface.mask?.toDataURL('image/png'),
        workingPixels: surface.precision
          ? serializeWorkingSurface(surface.precision)
          : undefined,
      };
    }),
    selectedId: source.selectedId,
    selectedIds: [...(source.selectedIds ?? [source.selectedId])],
    paths: structuredClone(source.paths ?? []),
    layerComps: structuredClone(source.layerComps ?? []),
    artboards: structuredClone(source.artboards ?? []),
  });
  const propagateEmbeddedSource = (
    sourceId: string,
    visited = new Set<string>(),
  ) => {
    if (visited.has(sourceId))
      throw Error('Cyclic Smart Object document relationship');
    visited.add(sourceId);
    const source = documentStoreRef.current.get(sourceId),
      binding = source?.smartObjectSource;
    if (!source || !binding) return;
    const parent = documentStoreRef.current.get(binding.parentDocumentId);
    if (!parent) {
      setStatus(
        'The parent document was closed; source edits remain in this tab',
      );
      return;
    }
    const embeddedDocument = embeddedDataForDocument(source);
    validateEmbeddedDocument(embeddedDocument);
    const preview = makeCanvas(source.doc.w, source.doc.h);
    renderLayers(
      preview.getContext('2d')!,
      source.layers,
      source.surfaces,
      source.doc,
    );
    const sourceData = preview.toDataURL('image/png'),
      matching = parent.layers.filter(
        (layer) => layer.smartObject?.instanceId === binding.instanceId,
      );
    if (!matching.length) {
      preview.width = preview.height = 1;
      setStatus('The source object no longer exists in its parent document');
      return;
    }
    parent.layers = parent.layers.map((layer) =>
      layer.smartObject?.instanceId === binding.instanceId
        ? {
            ...layer,
            smartObject: {
              ...layer.smartObject,
              sourceData,
              embeddedDocument,
              sourceVersion: (layer.smartObject.sourceVersion ?? 1) + 1,
            },
          }
        : layer,
    );
    for (const layer of matching) {
      const next = makeCanvas(parent.doc.w, parent.doc.h);
      next.getContext('2d')!.drawImage(preview, 0, 0);
      const previous = parent.surfaces.get(layer.id);
      parent.surfaces.set(layer.id, {
        pixels: next,
        mask: previous?.mask,
        precision:
          (parent.workingDepth ?? '8u') === '8u'
            ? undefined
            : createPrecisionBacking(
                { pixels: next },
                (parent.workingDepth ?? '8u') as HighWorkingDepth,
              ),
      });
      if (previous) previous.pixels.width = previous.pixels.height = 1;
    }
    preview.width = preview.height = 1;
    const parentSnapshot: Snapshot = {
      label: 'Update Smart Object contents',
      w: parent.doc.w,
      h: parent.doc.h,
      workingDepth: parent.workingDepth ?? '8u',
      sceneReferred: parent.sceneReferred === true,
      colorProfile: normalizeColorProfile(parent.colorProfile),
      colorProfileData: parent.colorProfileData
        ? structuredClone(parent.colorProfileData)
        : undefined,
      layers: structuredClone(parent.layers),
      selectedId: parent.selectedId,
      selectedIds: [...(parent.selectedIds ?? [parent.selectedId])],
      paths: structuredClone(parent.paths ?? []),
      layerComps: structuredClone(parent.layerComps ?? []),
      view: parent.view ? readView(parent.view) : undefined,
      surfaces: parent.layers.map((layer) => {
        const surface = parent.surfaces.get(layer.id)!;
        return {
          id: layer.id,
          pixels: captureTiles(surface.pixels),
          mask: surface.mask ? captureTiles(surface.mask) : undefined,
          precision: surface.precision
            ? captureWorkingSurface(surface.precision)
            : undefined,
        };
      }),
    };
    parent.history = parent.history.slice(0, parent.historyIndex + 1);
    parent.history.push(parentSnapshot);
    parent.historyIndex = parent.history.length - 1;
    parent.saved = false;
    source.saved = true;
    setDocuments((items) =>
      items.map((item) =>
        item.id === parent.id
          ? { ...item, saved: false }
          : item.id === source.id
            ? { ...item, saved: true }
            : item,
      ),
    );
    if (activeDocumentRef.current === source.id) setSaved(true);
    propagateEmbeddedSource(parent.id, visited);
    setStatus(
      `Smart Object source synchronized to ${matching.length} instance${matching.length === 1 ? '' : 's'}`,
    );
  };
  syncEmbeddedSourceRef.current = () => {
    const active = documentStoreRef.current.get(activeDocumentRef.current);
    if (!active?.smartObjectSource) return;
    persistActiveDocument();
    try {
      propagateEmbeddedSource(active.id);
    } catch (error) {
      setPsdError(
        error instanceof Error
          ? error.message
          : 'Smart Object contents could not be synchronized.',
      );
    }
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
    setWorkingDepth(next.workingDepth ?? '8u');
    setSceneReferred(next.sceneReferred === true);
    if (next.colorProfileData) registerIccProfile(next.colorProfileData);
    setColorProfile(
      normalizeColorProfile(next.colorProfile),
      next.colorProfileData,
    );
    setZoom(clampZoom(next.zoom));
    setView(readView(next.view));
    setSelection(next.selection);
    selectionRef.current = next.selection;
    setSelectionPath(next.selectionPath ?? null);
    selectionPathRef.current = next.selectionPath ?? null;
    setPaths(next.paths ?? []);
    setArtboards(next.artboards ?? []);
    setActiveArtboardId(next.artboards?.[0]?.id ?? '');
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
    historyBrushBuffer.current = null;
    setBrushSourceMode('color');
    cloneSources.current = Array.from({ length: 5 }, () => null);
    setActiveCloneSourceSlot(0);
    setCloneSourceVersion((version) => version + 1);
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
    workingDepth: nextWorkingDepth,
  }: NewDocumentOptions) => {
    requireRoom(
      w,
      h,
      w *
        h *
        (1 +
          (nextWorkingDepth === '8u'
            ? 0
            : workingDepthBytesPerPixel(nextWorkingDepth) / 4)),
    );
    persistActiveDocument();
    const id = crypto.randomUUID(),
      layerId = crypto.randomUUID(),
      pixels = makeCanvas(w, h),
      ctx = pixels.getContext('2d')!;
    if (background !== 'transparent') {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
    }
    const surface: LayerSurface = {
      pixels,
      precision:
        nextWorkingDepth === '8u'
          ? undefined
          : createPrecisionBacking({ pixels }, nextWorkingDepth),
    };
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
      workingDepth: nextWorkingDepth,
      colorProfile: 'srgb',
      layers: nextLayers.map((x) => ({ ...x })),
      selectedId: layerId,
      surfaces: [
        {
          id: layerId,
          pixels: captureTiles(pixels),
          precision: surface.precision
            ? captureWorkingSurface(surface.precision)
            : undefined,
        },
      ],
    };
    const next: EditorDocument = {
      id,
      name,
      saved: false,
      doc: { w, h },
      workingDepth: nextWorkingDepth,
      colorProfile: 'srgb',
      layers: nextLayers,
      surfaces: new Map([[layerId, surface]]),
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
          colorProfile: 'srgb',
          layers: nextLayers,
          selectedId: layerId,
          surfaces: [{ id: layerId, pixels: captureTiles(pixels) }],
        },
        next: EditorDocument = {
          id: nextId,
          name: 'Untitled artwork',
          saved: false,
          doc: { w: 1200, h: 800 },
          colorProfile: 'srgb',
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
  const closeOtherDocuments = (keepId: string) => {
    if (documents.length < 2) return;
    persistActiveDocument();
    const closing = documents.filter((item) => item.id !== keepId),
      unsaved = closing.filter(
        (item) => !documentStoreRef.current.get(item.id)?.saved,
      );
    if (
      unsaved.length &&
      !window.confirm(
        `Close ${closing.length} other document${closing.length === 1 ? '' : 's'}? ${unsaved.length} ${unsaved.length === 1 ? 'has' : 'have'} unsaved changes.`,
      )
    )
      return;
    const keep = documentStoreRef.current.get(keepId);
    if (!keep) return;
    for (const item of closing) {
      documentStoreRef.current.delete(item.id);
      void deleteRecovery(item.id);
    }
    setDocuments([{ id: keep.id, name: keep.name, saved: keep.saved }]);
    if (keepId !== activeDocumentRef.current) loadDocument(keep);
    setStatus(
      `${closing.length} other document${closing.length === 1 ? '' : 's'} closed`,
    );
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
      (meta.smartObject && editing !== 'mask') ||
      ((meta.kind === 'adjustment' || meta.kind === 'fill') &&
        editing !== 'mask')
    )
      return null;
    if (editing === 'mask' && surface.mask) {
      if (meta.maskLinked === false) {
        const transform = normalizeMaskTransform(meta.maskTransform);
        return {
          ctx: surface.mask.getContext('2d')!,
          meta: {
            ...meta,
            x: transform.x,
            y: transform.y,
            rotation: transform.rotation,
            scaleX: transform.scaleX,
            scaleY: transform.scaleY,
          },
        };
      }
      return { ctx: surface.mask.getContext('2d')!, meta };
    }
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
      const id = crypto.randomUUID(),
        curved = pathMode === 'curvature' || pathCurved;
      const next = {
        id,
        name: `Work Path ${paths.length + 1}`,
        points: clean,
        anchors: anchorsFromPoints(clean, curved, pathTension),
        closed: true,
        stroke: normalizePathStroke({
          color,
          widthStart: size,
          widthEnd: size,
        }),
        curved,
        tension: pathTension,
      };
      setPaths((items) => [next, ...items]);
      setSelectedPathIds([id]);
      setSelectedAnchorIndex(0);
      setTimeout(() => snapshot('Save work path'), 0);
      setStatus(`${next.name} saved`);
    }
    polygonDraft.current = [];
    setDraftPoints([]);
  };
  const updateSelectedPath = (
    label: string,
    change: (path: SavedPath) => SavedPath,
  ) => {
    const targetId =
      selectedPathIds.find((id) => paths.some((path) => path.id === id)) ??
      paths[0]?.id;
    if (!targetId) {
      setStatus('Create or select a saved path first');
      return;
    }
    setPaths((items) =>
      items.map((path) => (path.id === targetId ? change(path) : path)),
    );
    setTimeout(() => snapshot(label), 0);
    setStatus(label);
  };
  const addPathAnchor = () =>
    updateSelectedPath('Anchor point added', (path) => {
      const anchors = pathAnchors(path),
        first = anchors[0],
        last = anchors.at(-1)!,
        next = {
          x: (first.x + last.x) / 2,
          y: (first.y + last.y) / 2,
          kind: 'corner' as const,
        },
        updated = [...anchors, next];
      setSelectedAnchorIndex(updated.length - 1);
      return {
        ...path,
        points: updated.map(({ x, y }) => ({ x, y })),
        anchors: updated,
      };
    });
  const deletePathAnchor = () =>
    updateSelectedPath('Anchor point deleted', (path) => {
      const anchors = pathAnchors(path);
      if (anchors.length <= 3) return path;
      const updated = anchors.filter(
        (_, index) =>
          index !== Math.min(selectedAnchorIndex, anchors.length - 1),
      );
      setSelectedAnchorIndex((index) => Math.min(index, updated.length - 1));
      return {
        ...path,
        points: updated.map(({ x, y }) => ({ x, y })),
        anchors: updated,
      };
    });
  const togglePathPointType = () =>
    updateSelectedPath('Anchor point converted', (path) => {
      const anchors = pathAnchors(path),
        index = Math.min(selectedAnchorIndex, anchors.length - 1),
        kind = anchors[index]?.kind === 'smooth' ? 'corner' : 'smooth',
        updated = convertAnchorKind(anchors, index, kind);
      return {
        ...path,
        curved: updated.some((anchor) => anchor.kind === 'smooth'),
        anchors: updated,
      };
    });
  const moveSelectedPathAnchor = (x: number, y: number) =>
    updateSelectedPath('Anchor moved with Direct Selection', (path) => {
      const updated = moveAnchor(pathAnchors(path), selectedAnchorIndex, x, y);
      return {
        ...path,
        points: updated.map((anchor) => ({ x: anchor.x, y: anchor.y })),
        anchors: updated,
      };
    });
  const nudgePathAnchor = (dx: number, dy: number) => {
    const path =
        paths.find((item) => selectedPathIds.includes(item.id)) ?? paths[0],
      anchor = path && pathAnchors(path)[selectedAnchorIndex];
    if (anchor) moveSelectedPathAnchor(anchor.x + dx, anchor.y + dy);
  };
  const updatePathStroke = (patch: Partial<PathStrokeStyle>) =>
    updateSelectedPath('Path stroke updated', (path) => ({
      ...path,
      stroke: normalizePathStroke({
        ...(path.stroke ?? defaultPathStroke()),
        ...patch,
      }),
    }));
  const dragPathControl = (
    pathId: string,
    index: number,
    point: Point,
    handle?: 'incoming' | 'outgoing',
  ) =>
    setPaths((items) =>
      items.map((path) => {
        if (path.id !== pathId) return path;
        const anchors = handle
          ? moveAnchorHandle(pathAnchors(path), index, handle, point.x, point.y)
          : moveAnchor(pathAnchors(path), index, point.x, point.y);
        return {
          ...path,
          curved: anchors.some((anchor) => anchor.kind === 'smooth'),
          points: anchors.map((anchor) => ({
            x: anchor.x,
            y: anchor.y,
          })),
          anchors,
        };
      }),
    );
  const fillStrokePath = (fillPath: boolean) => {
    const path =
        paths.find((item) => selectedPathIds.includes(item.id)) ?? paths[0],
      target = targetContext();
    if (!path || !target || path.points.length < 2) {
      setStatus('Select a saved path and an unlocked pixel layer first');
      return;
    }
    withSelection(target.ctx, target.meta, () => {
      target.ctx.save();
      target.ctx.globalAlpha = opacity / 100;
      if (fillPath) {
        traceSavedPath(target.ctx, path, (point) =>
          toLayerPoint(target.meta, point),
        );
        target.ctx.fillStyle = color;
        target.ctx.fill();
      } else {
        const stroke = normalizePathStroke(
          path.stroke ?? {
            color,
            widthStart: size,
            widthEnd: size,
          },
        );
        target.ctx.strokeStyle = stroke.color;
        target.ctx.lineCap = stroke.cap;
        target.ctx.lineJoin = stroke.join;
        target.ctx.setLineDash(stroke.dash);
        if (Math.abs(stroke.widthStart - stroke.widthEnd) < 0.01) {
          traceSavedPath(target.ctx, path, (point) =>
            toLayerPoint(target.meta, point),
          );
          target.ctx.lineWidth = stroke.widthStart;
          target.ctx.stroke();
        } else {
          const samples = sampleBezierAnchors(
            pathAnchors(path),
            path.closed !== false,
          ).map((point) => toLayerPoint(target.meta, point));
          let traveled = 0;
          for (let index = 1; index < samples.length; index++) {
            target.ctx.beginPath();
            target.ctx.moveTo(samples[index - 1].x, samples[index - 1].y);
            target.ctx.lineTo(samples[index].x, samples[index].y);
            target.ctx.lineDashOffset = -traveled;
            target.ctx.lineWidth =
              stroke.widthStart +
              ((stroke.widthEnd - stroke.widthStart) * index) /
                (samples.length - 1);
            target.ctx.stroke();
            traveled += Math.hypot(
              samples[index].x - samples[index - 1].x,
              samples[index].y - samples[index - 1].y,
            );
          }
        }
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
    const inputIntent = penIntent(e);
    if (inputIntent === 'ignore') return;
    if (e.button !== 0 && inputIntent === 'draw') return;
    const p = point(e),
      meta = selected();
    if (inputIntent === 'sample') {
      render();
      const data = displayRef.current
        ?.getContext('2d', { willReadFrequently: true })
        ?.getImageData(
          Math.max(0, Math.min(doc.w - 1, Math.floor(p.x))),
          Math.max(0, Math.min(doc.h - 1, Math.floor(p.y))),
          1,
          1,
        ).data;
      if (data) {
        const sampled = `#${[data[0], data[1], data[2]]
          .map((value) => value.toString(16).padStart(2, '0'))
          .join('')}`;
        setColor(sampled);
        setStatus(`Pen barrel sampled ${sampled}`);
      }
      return;
    }
    gesturePaintTool.current =
      inputIntent === 'erase' && (tool === 'brush' || tool === 'eraser')
        ? 'eraser'
        : tool === 'brush' || tool === 'eraser'
          ? tool
          : null;
    paintDirtyRegion.current = null;
    if (
      (curveTargetChannel || levelsTarget || hueTarget) &&
      meta?.kind === 'adjustment'
    ) {
      render();
      const x = Math.max(0, Math.min(doc.w - 1, Math.floor(p.x))),
        y = Math.max(0, Math.min(doc.h - 1, Math.floor(p.y))),
        sampled = displayRef.current
          ?.getContext('2d', { willReadFrequently: true })
          ?.getImageData(x, y, 1, 1).data;
      if (!sampled) return;
      const normalized = {
        red: sampled[0] / 255,
        green: sampled[1] / 255,
        blue: sampled[2] / 255,
        rgb:
          (sampled[0] * 0.2126 + sampled[1] * 0.7152 + sampled[2] * 0.0722) /
          255,
      };
      if (hueTarget) {
        const red = normalized.red,
          green = normalized.green,
          blue = normalized.blue,
          maximum = Math.max(red, green, blue),
          minimum = Math.min(red, green, blue),
          delta = maximum - minimum;
        let hue = 0;
        if (delta > 1e-7) {
          if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
          else if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
          else hue = 60 * ((red - green) / delta + 4);
        }
        hue = Math.round((hue + 360) % 360);
        const current = meta.precisionAdjustment ?? {},
          existing = current.hueSaturationRanges?.[hueTarget] ?? {
            hue: 0,
            saturation: 0,
            lightness: 0,
          };
        patchLayer(
          meta.id,
          {
            precisionAdjustment: {
              ...current,
              hueSaturationRanges: {
                ...current.hueSaturationRanges,
                [hueTarget]: {
                  ...existing,
                  center: hue,
                  width: existing.width ?? 30,
                  falloff: existing.falloff ?? 30,
                },
              },
            },
          },
          `${hueTarget} color range sampled`,
        );
        setStatus(`${hueTarget} range centered on sampled hue ${hue}°`);
        setHueTarget(null);
      } else if (curveTargetChannel) {
        const value = normalized[curveTargetChannel],
          current = meta.precisionAdjustment ?? {},
          points = [
            ...(current.curves?.[curveTargetChannel] ?? []),
            { x: value, y: value },
          ]
            .sort((a, b) => a.x - b.x)
            .slice(0, 14);
        patchLayer(
          meta.id,
          {
            precisionAdjustment: {
              ...current,
              curves: { ...current.curves, [curveTargetChannel]: points },
            },
          },
          'Targeted curve point',
        );
        setStatus(
          `${curveTargetChannel.toUpperCase()} curve point sampled at ${Math.round(value * 255)}`,
        );
        setCurveTargetChannel(null);
      } else if (levelsTarget) {
        const current = meta.precisionAdjustment ?? {},
          target = levelsTarget;
        if (target.kind === 'gray') {
          const gammaFor = (value: number) =>
            Math.max(
              0.1,
              Math.min(3, Math.log(Math.max(0.004, value)) / Math.log(0.5)),
            );
          const nextLevels = { ...current.channelLevels };
          for (const color of ['red', 'green', 'blue'] as const) {
            const previous = nextLevels[color];
            nextLevels[color] = {
              black: 0,
              white: 255,
              outputBlack: 0,
              outputWhite: 255,
              ...previous,
              gamma: gammaFor(normalized[color]),
            };
          }
          patchLayer(
            meta.id,
            { precisionAdjustment: { ...current, channelLevels: nextLevels } },
            'Neutral gray eyedropper',
          );
        } else {
          const value = Math.round(normalized[target.channel] * 255),
            key = target.kind === 'black' ? 'black' : 'white';
          if (target.channel === 'rgb')
            patchLayer(
              meta.id,
              {
                precisionAdjustment: {
                  ...current,
                  [target.kind === 'black' ? 'levelsBlack' : 'levelsWhite']:
                    value,
                },
              },
              `${target.kind} point eyedropper`,
            );
          else {
            const base: ChannelLevel = {
              black: 0,
              gamma: 1,
              white: 255,
              outputBlack: 0,
              outputWhite: 255,
              ...current.channelLevels?.[target.channel],
            };
            patchLayer(
              meta.id,
              {
                precisionAdjustment: {
                  ...current,
                  channelLevels: {
                    ...current.channelLevels,
                    [target.channel]: { ...base, [key]: value },
                  },
                },
              },
              `${target.channel} ${target.kind} point eyedropper`,
            );
          }
        }
        setStatus(
          `${target.kind} point sampled · ${target.channel.toUpperCase()}`,
        );
        setLevelsTarget(null);
      }
      return;
    }
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
    if (gesturePaintTool.current)
      brushDistanceSinceDab.current = Math.max(
        0.25,
        paintMode === 'pencil'
          ? Math.max(1, size * 0.2)
          : (size * brushSpacing) / 100,
      );
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
    if (tool === 'clone' && cloneMode === 'pattern') {
      const pattern = makeCanvas(doc.w, doc.h),
        patternContext = pattern.getContext('2d')!,
        cell = Math.max(8, Math.round(size * 0.75));
      for (let y = 0; y < doc.h; y += cell)
        for (let x = 0; x < doc.w; x += cell) {
          patternContext.fillStyle =
            (x / cell + y / cell) % 2 ? color : backgroundColor;
          patternContext.fillRect(x, y, cell, cell);
        }
      cloneBuffer.current = pattern;
      cloneSource.current = { x: 0, y: 0 };
      cloneOffset.current = { x: 0, y: 0 };
      cloneHasOffset.current = true;
    } else if (
      tool === 'clone' ||
      (tool === 'retouch' && retouchMode === 'healing')
    ) {
      if (e.altKey) {
        cloneSource.current = p;
        cloneSources.current[activeCloneSourceSlot] = { ...p };
        setCloneSourceVersion((version) => version + 1);
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
          if (retouchSampleAll)
            renderLayers(cloneBuffer.current.getContext('2d')!);
          else
            cloneBuffer.current
              .getContext('2d')!
              .drawImage(surface.pixels, 0, 0);
        }
      }
    }
    if (tool === 'retouch' && retouchMode !== 'healing') {
      const surface = meta && surfacesRef.current.get(meta.id);
      if (surface) {
        cloneBuffer.current = makeCanvas(doc.w, doc.h);
        if (retouchSampleAll)
          renderLayers(cloneBuffer.current.getContext('2d')!);
        else
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
    const paintTool = gesturePaintTool.current;
    if (paintTool) {
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
        recordDirty = (x: number, y: number, radius: number) => {
          const next = {
              x: Math.floor(x - radius - 2),
              y: Math.floor(y - radius - 2),
              width: Math.ceil(radius * 2 + 4),
              height: Math.ceil(radius * 2 + 4),
            },
            current = paintDirtyRegion.current;
          if (!current) paintDirtyRegion.current = next;
          else {
            const left = Math.min(current.x, next.x),
              top = Math.min(current.y, next.y),
              right = Math.max(current.x + current.width, next.x + next.width),
              bottom = Math.max(
                current.y + current.height,
                next.y + next.height,
              );
            paintDirtyRegion.current = {
              x: left,
              y: top,
              width: right - left,
              height: bottom - top,
            };
          }
        },
        drawStroke = (ctx: CanvasRenderingContext2D) => {
          const paint =
              editing === 'mask'
                ? paintTool === 'eraser'
                  ? 'white'
                  : maskGray(color)
                : paintTool === 'eraser'
                  ? 'white'
                  : color,
            step = Math.max(
              1,
              paintMode === 'pencil'
                ? Math.max(1, size * 0.2)
                : airbrushBuildUp
                  ? Math.min((size * brushSpacing) / 100, size * 0.04)
                  : (size * brushSpacing) / 100,
            ),
            stroke = interpolateStrokeDabs(
              prev,
              local,
              step,
              brushDistanceSinceDab.current,
            );
          brushDistanceSinceDab.current = stroke.distanceSinceLastDab;
          const renderer = brushRenderer.current,
            accelerated =
              renderer &&
              editing === 'pixels' &&
              paintMode === 'brush' &&
              brushSourceMode === 'color' &&
              !activeBrushTipId &&
              !dualBrush &&
              !mixerBrush &&
              !wetEdges &&
              brushTexture === 0 &&
              brushScatter === 0 &&
              sizeJitter === 0 &&
              hueJitter === 0 &&
              opacityJitter === 0 &&
              flowJitter === 0;
          if (displayRef.current)
            displayRef.current.dataset.brushRenderPath = accelerated
              ? 'eligible'
              : 'canvas2d-standard';
          if (accelerated && stroke.points.length) {
            const baseAlpha =
                (((opacity / 100) * flow) / 100) *
                pressureAlpha *
                (airbrushBuildUp ? 0.2 : 1),
              dabs = stroke.points.flatMap((sourcePoint) =>
                symmetryStrokePoints(
                  sourcePoint,
                  doc.w,
                  doc.h,
                  brushSymmetry,
                  radialSymmetryCount,
                ).map((point) => ({
                  x: point.x,
                  y: point.y,
                  size: Math.max(1, size * pressureScale),
                  alpha: baseAlpha,
                  angle: (brushAngle * Math.PI) / 180 + (tilt ? tiltAngle : 0),
                  roundness:
                    Math.max(0.05, brushRoundness / 100) *
                    (tilt ? Math.max(0.18, 1 - tiltMagnitude) : 1),
                })),
              ),
              tiles = renderer.render(dabs, {
                color: paint === 'white' ? '#ffffff' : paint,
                hardness: hardness / 100,
              });
            if (displayRef.current)
              displayRef.current.dataset.brushRenderPath =
                renderer.lastRenderPath;
            for (const dab of dabs) recordDirty(dab.x, dab.y, dab.size / 2);
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            for (const tile of tiles) {
              ctx.drawImage(tile.canvas, tile.x, tile.y);
              tile.release();
            }
            ctx.restore();
            return;
          }
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = (((opacity / 100) * flow) / 100) * pressureAlpha;
          for (const sourcePoint of stroke.points)
            for (const point of symmetryStrokePoints(
              sourcePoint,
              doc.w,
              doc.h,
              brushSymmetry,
              radialSymmetryCount,
            )) {
              const baseX = point.x,
                baseY = point.y,
                scatterRadius = (brushScatter / 100) * size,
                scatterAngle = Math.random() * Math.PI * 2,
                x =
                  baseX +
                  Math.cos(scatterAngle) * scatterRadius * Math.random(),
                y =
                  baseY +
                  Math.sin(scatterAngle) * scatterRadius * Math.random(),
                jitterScale = 1 - (sizeJitter / 100) * Math.random() * 0.75,
                dabSize = Math.max(1, size * pressureScale * jitterScale),
                jitteredPaint =
                  editing === 'pixels' && paintTool === 'brush' && hueJitter
                    ? shiftedHex(
                        color,
                        (Math.random() * 2 - 1) * hueJitter * 1.8,
                      )
                    : paint,
                dabPaint = (() => {
                  if (
                    !mixerBrush ||
                    editing !== 'pixels' ||
                    paintTool !== 'brush'
                  )
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
              recordDirty(x, y, dabSize * (dualBrush ? 0.85 : 0.5));
              const baseAlpha =
                  (((opacity / 100) * flow) / 100) * pressureAlpha,
                transferredAlpha =
                  (1 - (opacityJitter / 100) * Math.random()) *
                  (1 - (flowJitter / 100) * Math.random()),
                textureAlpha =
                  1 -
                  (brushTexture / 100) *
                    (0.25 + 0.75 * Math.abs(Math.sin(x * 0.37 + y * 0.19)));
              ctx.globalAlpha =
                baseAlpha *
                textureAlpha *
                transferredAlpha *
                (airbrushBuildUp ? 0.2 : 1);
              if (brushSourceMode !== 'color' && historyBrushBuffer.current) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(x, y, dabSize / 2, 0, Math.PI * 2);
                ctx.clip();
                if (brushSourceMode === 'art-history') {
                  ctx.translate(x, y);
                  ctx.rotate(Math.sin(x * 0.17 + y * 0.11) * 0.42);
                  ctx.scale(1.08, 0.92);
                  ctx.translate(-x, -y);
                }
                ctx.drawImage(historyBrushBuffer.current, 0, 0);
                ctx.restore();
                continue;
              }
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
                customTip = activeBrushTipId
                  ? brushTipCanvases.current.get(activeBrushTipId)
                  : undefined;
              if (customTip) {
                const cacheKey = `${activeBrushTipId}:${dabPaint}`;
                let tinted = tintedBrushTips.current.get(cacheKey);
                if (!tinted) {
                  if (tintedBrushTips.current.size > 24)
                    tintedBrushTips.current.clear();
                  tinted = makeCanvas(customTip.width, customTip.height);
                  const tintedContext = tinted.getContext('2d')!;
                  tintedContext.drawImage(customTip, 0, 0);
                  tintedContext.globalCompositeOperation = 'source-in';
                  tintedContext.fillStyle = dabPaint;
                  tintedContext.fillRect(0, 0, tinted.width, tinted.height);
                  tintedBrushTips.current.set(cacheKey, tinted);
                }
                const aspect = customTip.width / customTip.height,
                  width = aspect >= 1 ? dabSize : dabSize * aspect,
                  height = aspect >= 1 ? dabSize / aspect : dabSize,
                  drawCustomTip = (
                    centerX: number,
                    centerY: number,
                    scale = 1,
                    rotation = brushAngle,
                  ) => {
                    ctx.save();
                    ctx.translate(centerX, centerY);
                    ctx.rotate((rotation * Math.PI) / 180);
                    ctx.scale(1, Math.max(0.05, brushRoundness / 100));
                    if (tilt) {
                      ctx.rotate(tiltAngle);
                      ctx.scale(1, Math.max(0.18, 1 - tiltMagnitude));
                    }
                    ctx.drawImage(
                      tinted!,
                      (-width * scale) / 2,
                      (-height * scale) / 2,
                      width * scale,
                      height * scale,
                    );
                    ctx.restore();
                  };
                drawCustomTip(x, y);
                if (dualBrush) {
                  const offset = (dualBrushOffset / 100) * radius,
                    angle = (brushAngle * Math.PI) / 180;
                  ctx.save();
                  ctx.globalAlpha *= 0.72;
                  drawCustomTip(
                    x + Math.cos(angle) * offset,
                    y + Math.sin(angle) * offset,
                    dualBrushScale / 100,
                    brushAngle + 45,
                  );
                  ctx.restore();
                }
                continue;
              }
              const inner = radius * Math.max(0, Math.min(1, hardness / 100)),
                transparentPaint = dabPaint.startsWith('#')
                  ? `${dabPaint}00`
                  : dabPaint.startsWith('rgb(')
                    ? dabPaint.replace(/^rgb\((.*)\)$/, 'rgba($1,0)')
                    : dabPaint === 'white'
                      ? 'rgba(255,255,255,0)'
                      : 'rgba(0,0,0,0)';
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate((brushAngle * Math.PI) / 180);
              ctx.scale(1, Math.max(0.05, brushRoundness / 100));
              if (tilt) {
                ctx.rotate(tiltAngle);
                ctx.scale(1, Math.max(0.18, 1 - tiltMagnitude));
              }
              const g = ctx.createRadialGradient(0, 0, inner, 0, 0, radius);
              g.addColorStop(0, dabPaint);
              g.addColorStop(Math.min(0.999, inner / radius), dabPaint);
              g.addColorStop(1, transparentPaint);
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(0, 0, radius, 0, Math.PI * 2);
              ctx.fill();
              if (wetEdges) {
                ctx.globalAlpha *= 0.75;
                ctx.strokeStyle = dabPaint;
                ctx.lineWidth = Math.max(1, radius * 0.16);
                ctx.stroke();
              }
              ctx.restore();
              if (dualBrush) {
                const offset = (dualBrushOffset / 100) * radius,
                  dualRadius = radius * (dualBrushScale / 100),
                  angle = (brushAngle * Math.PI) / 180;
                ctx.save();
                ctx.globalAlpha *= 0.72;
                ctx.translate(
                  x + Math.cos(angle) * offset,
                  y + Math.sin(angle) * offset,
                );
                ctx.rotate(angle + Math.PI / 4);
                ctx.scale(1, Math.max(0.05, brushRoundness / 100));
                const dualInner =
                    dualRadius * Math.max(0, Math.min(1, hardness / 100)),
                  dualGradient = ctx.createRadialGradient(
                    0,
                    0,
                    dualInner,
                    0,
                    0,
                    dualRadius,
                  );
                dualGradient.addColorStop(0, dabPaint);
                dualGradient.addColorStop(
                  Math.min(0.999, dualInner / dualRadius),
                  dabPaint,
                );
                dualGradient.addColorStop(1, transparentPaint);
                ctx.fillStyle = dualGradient;
                ctx.beginPath();
                ctx.arc(0, 0, dualRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
              }
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
            else if (retouchMode === 'red-eye') {
              pc.drawImage(buffer, x, y, w, h, 0, 0, w, h);
              const redEye = pc.getImageData(0, 0, w, h);
              redEye.data.set(correctRedEyePixels(redEye.data));
              pc.putImageData(redEye, 0, 0);
            } else {
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
    const paintTool = gesturePaintTool.current;
    const paintDirty = paintDirtyRegion.current;
    gesturePaintTool.current = null;
    paintDirtyRegion.current = null;
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
      (paintTool === 'brush' ||
        paintTool === 'eraser' ||
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
                : paintTool === 'eraser'
                  ? 'Erase'
                  : 'Brush stroke',
        false,
        (paintTool === 'brush' || paintTool === 'eraser') && paintDirty
          ? {
              surfaceId: selectedRef.current,
              ...(editing === 'mask'
                ? { mask: paintDirty }
                : { pixels: paintDirty }),
            }
          : undefined,
      );
    if (tool === 'marquee' || tool === 'crop') {
      if (dragRect && dragRect.w > 2 && dragRect.h > 2) {
        if (tool === 'marquee') {
          const chosen = marqueeBounds(selectionShape, dragRect, doc.w, doc.h),
            mask = makeCanvas(doc.w, doc.h),
            ctx = mask.getContext('2d')!;
          if (selectionShape === 'row' || selectionShape === 'column') {
            ctx.fillStyle = 'white';
            ctx.fillRect(chosen.x, chosen.y, chosen.w, chosen.h);
          } else {
            const image = ctx.createImageData(doc.w, doc.h),
              left = Math.max(0, Math.floor(chosen.x)),
              top = Math.max(0, Math.floor(chosen.y)),
              right = Math.min(doc.w, Math.ceil(chosen.x + chosen.w)),
              bottom = Math.min(doc.h, Math.ceil(chosen.y + chosen.h));
            for (let y = top; y < bottom; y++)
              for (let x = left; x < right; x++) {
                const alpha = Math.round(
                    marqueeCoverage(selectionShape, chosen, x, y) * 255,
                  ),
                  index = (y * doc.w + x) * 4;
                image.data[index] =
                  image.data[index + 1] =
                  image.data[index + 2] =
                    255;
                image.data[index + 3] = alpha;
              }
            ctx.putImageData(image, 0, 0);
          }
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
      style: fontStyle,
      stretch: fontStretch,
      size: fontSize,
      tracking: textTracking,
      kerning: textKerning,
      leading: textLeading,
      baseline: textBaseline,
      align: textAlign,
      onPath: textPathMode === 'along',
      pathMode: textPathMode,
      pathId: textPathMode === 'none' ? undefined : textPathId || paths[0]?.id,
      warp: textWarp,
      warpStyle: textWarpStyle,
      fit: textFit,
      boxHeight: textBoxHeight,
      smallCaps: textSmallCaps,
      ligatures: textLigatures,
      direction: textDirection,
      language: textLanguage,
      underline: textUnderline,
      strike: textStrike,
      indent: textIndent,
      spaceBefore: textSpaceBefore,
      spaceAfter: textSpaceAfter,
    };
    drawEditableText(
      surface.pixels,
      textLayer,
      paths.find((path) => path.id === textLayer.pathId)?.points,
    );
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
      style: fontStyle,
      stretch: fontStretch,
      size: fontSize,
      tracking: textTracking,
      kerning: textKerning,
      leading: textLeading,
      baseline: textBaseline,
      align: textAlign,
      onPath: textPathMode === 'along',
      pathMode: textPathMode,
      pathId: textPathMode === 'none' ? undefined : textPathId || paths[0]?.id,
      warp: textWarp,
      warpStyle: textWarpStyle,
      fit: textFit,
      boxHeight: textBoxHeight,
      smallCaps: textSmallCaps,
      ligatures: textLigatures,
      direction: textDirection,
      language: textLanguage,
      underline: textUnderline,
      strike: textStrike,
      indent: textIndent,
      spaceBefore: textSpaceBefore,
      spaceAfter: textSpaceAfter,
    };
    drawEditableText(
      surface.pixels,
      textLayer,
      paths.find((path) => path.id === textLayer.pathId)?.points,
    );
    patchLayer(meta.id, { textLayer }, 'Edit text layer');
    render();
    setStatus('Text layer updated');
  };
  const convertTextToShapes = () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (!meta?.textLayer || !surface || isLocked(meta.id)) {
      setStatus('Select an unlocked editable text layer first');
      return;
    }
    const image = surface.pixels
        .getContext('2d', { willReadFrequently: true })!
        .getImageData(0, 0, surface.pixels.width, surface.pixels.height),
      contours = traceAlphaContours(image.data, image.width, image.height);
    if (!contours.length) {
      setStatus('The text has no visible glyph outlines to convert');
      return;
    }
    const cx = doc.w / 2,
      cy = doc.h / 2,
      angle = ((meta.rotation ?? 0) * Math.PI) / 180,
      cos = Math.cos(angle),
      sin = Math.sin(angle),
      toDocumentPoint = (point: Point) => {
        const dx = (point.x - cx) * (meta.scaleX ?? 1),
          dy = (point.y - cy) * (meta.scaleY ?? 1);
        return {
          x: cx + meta.x + dx * cos - dy * sin,
          y: cy + meta.y + dx * sin + dy * cos,
        };
      },
      outlines: SavedPath[] = contours.map((points, index) => ({
        id: crypto.randomUUID(),
        name: `${meta.name} outline ${index + 1}`,
        curved: false,
        points: points.map(toDocumentPoint),
      }));
    setPaths((items) => [...outlines, ...items]);
    patchLayer(meta.id, { textLayer: undefined }, 'Convert text to shape');
    setStatus(
      `Text converted to ${outlines.length} editable glyph outline${outlines.length === 1 ? '' : 's'}; appearance preserved`,
    );
  };
  const magneticPoint = (p: Point) => {
    const surface = surfacesRef.current.get(selectedRef.current),
      meta = selected();
    if (!surface || !meta) return p;
    const local = toLayerPoint(meta, p),
      ctx = surface.pixels.getContext('2d', { willReadFrequently: true })!,
      x0 = Math.max(0, Math.floor(local.x) - 8),
      y0 = Math.max(0, Math.floor(local.y) - 8),
      x1 = Math.min(doc.w, Math.floor(local.x) + 9),
      y1 = Math.min(doc.h, Math.floor(local.y) + 9),
      patch = ctx.getImageData(x0, y0, x1 - x0, y1 - y0),
      snapped = strongestEdgeInPatch(
        patch.data,
        patch.width,
        patch.height,
        x0,
        y0,
        2,
      ),
      best = snapped.score > 0 ? snapped : local;
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
        maskOverlay: false,
        maskTransform: defaultMaskTransform(),
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
      setFontStyle(textValue.style ?? 'normal');
      setFontStretch(textValue.stretch ?? 100);
      setFontSize(textValue.size);
      setTextTracking(textValue.tracking);
      setTextKerning(textValue.kerning);
      setTextLeading(textValue.leading);
      setTextBaseline(textValue.baseline);
      setTextAlign(textValue.align);
      setTextPathMode(
        textValue.pathMode ?? (textValue.onPath ? 'along' : 'none'),
      );
      setTextPathId(textValue.pathId ?? '');
      setTextWarp(textValue.warp);
      setTextWarpStyle(
        textValue.warpStyle ?? (textValue.warp ? 'wave' : 'none'),
      );
      setTextFit(textValue.fit ?? 'none');
      setTextBoxHeight(textValue.boxHeight ?? 280);
      setTextSmallCaps(textValue.smallCaps);
      setTextLigatures(textValue.ligatures);
      setTextDirection(textValue.direction ?? 'auto');
      setTextLanguage(textValue.language ?? 'en');
      setTextUnderline(textValue.underline ?? false);
      setTextStrike(textValue.strike ?? false);
      setTextIndent(textValue.indent ?? 0);
      setTextSpaceBefore(textValue.spaceBefore ?? 0);
      setTextSpaceAfter(textValue.spaceAfter ?? 0);
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
  const makePathSelection = (path: SavedPath) => {
    if (path.points.length < 3) return;
    const mask = makeCanvas(doc.w, doc.h),
      ctx = mask.getContext('2d')!;
    ctx.fillStyle = 'white';
    traceSavedPath(ctx, path);
    ctx.fill();
    commitSelectionMask(mask, 'Path loaded as selection');
    setSelectionPath(path.points.map((point) => ({ ...point })));
    selectionPathRef.current = path.points.map((point) => ({ ...point }));
    snapshot('Path to selection');
  };
  const combineSelectedPaths = (operation: PathBooleanOperation) => {
    const selectedPaths = selectedPathIds
      .map((id) => paths.find((path) => path.id === id))
      .filter((path): path is SavedPath => Boolean(path));
    if (selectedPaths.length !== 2) {
      setStatus('Select exactly two paths for a Boolean operation');
      return;
    }
    const pathMask = (path: SavedPath) => {
        const canvas = makeCanvas(doc.w, doc.h),
          context = canvas.getContext('2d')!;
        context.fillStyle = 'white';
        traceSavedPath(context, path);
        context.fill();
        const rgba = context.getImageData(0, 0, doc.w, doc.h).data,
          alpha = new Uint8ClampedArray(doc.w * doc.h);
        for (let index = 0; index < alpha.length; index++)
          alpha[index] = rgba[index * 4 + 3];
        return alpha;
      },
      alpha = combinePathMasks(
        pathMask(selectedPaths[0]),
        pathMask(selectedPaths[1]),
        operation,
      ),
      rgba = new Uint8ClampedArray(doc.w * doc.h * 4);
    for (let index = 0; index < alpha.length; index++) {
      rgba[index * 4] = 255;
      rgba[index * 4 + 1] = 255;
      rgba[index * 4 + 2] = 255;
      rgba[index * 4 + 3] = alpha[index];
    }
    const contours = traceAlphaContours(rgba, doc.w, doc.h, 24, 10_000),
      label =
        operation === 'union'
          ? 'Union'
          : operation === 'subtract'
            ? 'Subtract'
            : operation === 'intersect'
              ? 'Intersect'
              : 'Exclude overlap',
      created = contours.map<SavedPath>((points, index) => ({
        id: crypto.randomUUID(),
        name: `${label}${contours.length > 1 ? ` ${index + 1}` : ''}`,
        points,
        anchors: anchorsFromPoints(points, false),
        closed: true,
        stroke: defaultPathStroke(),
        curved: false,
      }));
    if (!created.length) {
      setStatus(`${label} produced an empty path`);
      return;
    }
    setPaths((items) => [...created, ...items]);
    setSelectedPathIds(created.map((path) => path.id));
    setSelectedAnchorIndex(0);
    setTimeout(() => snapshot(`Boolean path ${label}`), 0);
    setStatus(
      `${label} created ${created.length} editable contour${created.length === 1 ? '' : 's'}`,
    );
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
        anchors: pathAnchors(path).map((anchor) => ({
          ...anchor,
          incoming: anchor.incoming ? { ...anchor.incoming } : undefined,
          outgoing: anchor.outgoing ? { ...anchor.outgoing } : undefined,
        })),
      },
      ...items,
    ]);
    setTimeout(() => snapshot('Duplicate path'), 0);
    setStatus(`${path.name} duplicated`);
  };
  const removePath = (id: string) => {
    setPaths((items) => items.filter((item) => item.id !== id));
    setSelectedPathIds((items) => items.filter((item) => item !== id));
    setTimeout(() => snapshot('Delete path'), 0);
  };
  const importSvgPaths = async (file: File) => {
    try {
      checkFileSize(file.size);
      const imported = parseSvgDocument(await file.text()).map<SavedPath>(
        (path) => ({
          id: crypto.randomUUID(),
          name: path.name,
          points: path.anchors.map(({ x, y }) => ({ x, y })),
          anchors: path.anchors,
          closed: path.closed,
          curved: path.anchors.some((anchor) => anchor.kind === 'smooth'),
          stroke: path.stroke,
        }),
      );
      setPaths((items) => [...imported, ...items]);
      setSelectedPathIds(imported.slice(0, 2).map((path) => path.id));
      setSelectedAnchorIndex(0);
      setTimeout(() => snapshot('Import SVG paths'), 0);
      setStatus(
        `Imported ${imported.length} editable SVG path${imported.length === 1 ? '' : 's'}`,
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'SVG import failed safely',
      );
    }
  };
  const exportSvgPaths = () => {
    const chosen = selectedPathIds.length
      ? paths.filter((path) => selectedPathIds.includes(path.id))
      : paths;
    if (!chosen.length) {
      setStatus('Select or create a path before SVG export');
      return;
    }
    const svg = serializeSvgDocument(
      chosen.map((path) => ({
        name: path.name,
        anchors: pathAnchors(path),
        closed: path.closed !== false,
        stroke: normalizePathStroke(path.stroke),
      })),
      doc.w,
      doc.h,
    );
    downloadBlob(
      `${fileName.replace(/\.[^.]+$/, '') || 'LibreLayer paths'}.svg`,
      new Blob([svg], { type: 'image/svg+xml' }),
    );
    setStatus(
      `Exported ${chosen.length} vector path${chosen.length === 1 ? '' : 's'} as SVG`,
    );
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
  const copySelectedLayers = () => {
    const roots = selectedRoots(),
      source = selectedTree();
    if (!roots.length || !source.length) {
      setStatus('Select one or more layers to copy');
      return;
    }
    const copiedSurfaces = new Map<string, LayerSurface>();
    for (const layer of source) {
      const sourceSurface = surfacesRef.current.get(layer.id);
      if (!sourceSurface) continue;
      const pixels = makeCanvas(
        sourceSurface.pixels.width,
        sourceSurface.pixels.height,
      );
      pixels.getContext('2d')!.drawImage(sourceSurface.pixels, 0, 0);
      let mask: HTMLCanvasElement | undefined;
      if (sourceSurface.mask) {
        mask = makeCanvas(sourceSurface.mask.width, sourceSurface.mask.height);
        mask.getContext('2d')!.drawImage(sourceSurface.mask, 0, 0);
      }
      copiedSurfaces.set(layer.id, {
        pixels,
        mask,
        precision: sourceSurface.precision
          ? cloneWorkingSurface(sourceSurface.precision)
          : undefined,
      });
    }
    layerClipboardRef.current = {
      documentName: fileName,
      width: doc.w,
      height: doc.h,
      layers: structuredClone(source),
      rootIds: roots.map((layer) => layer.id),
      surfaces: copiedSurfaces,
    };
    setStatus(
      `${roots.length} ${roots.length === 1 ? 'layer tree' : 'layer trees'} copied from ${fileName} · switch tabs and paste`,
    );
  };
  const pasteSelectedLayers = () => {
    const clipboard = layerClipboardRef.current;
    if (!clipboard) {
      setStatus('Copy layers first');
      return;
    }
    const plan = planLayerTransfer(clipboard.layers, clipboard.rootIds, () =>
      crypto.randomUUID(),
    );
    const units = plan.layers.reduce((count, layer) => {
      const sourceId = [...plan.idMap.entries()].find(
        ([, targetId]) => targetId === layer.id,
      )?.[0];
      return (
        count + (sourceId && clipboard.surfaces.get(sourceId)?.mask ? 2 : 1)
      );
    }, 0);
    if (
      !plan.layers.length ||
      !roomForLayers(plan.layers.length) ||
      !hasRoom(doc.w * doc.h * units)
    )
      return;
    const sourceByTarget = new Map(
      [...plan.idMap.entries()].map(([sourceId, targetId]) => [
        targetId,
        sourceId,
      ]),
    );
    for (const layer of plan.layers) {
      const sourceId = sourceByTarget.get(layer.id),
        sourceSurface = sourceId ? clipboard.surfaces.get(sourceId) : undefined,
        pixels = makeCanvas(doc.w, doc.h);
      if (
        sourceSurface &&
        layer.kind !== 'group' &&
        layer.kind !== 'adjustment' &&
        layer.kind !== 'fill'
      )
        pixels.getContext('2d')!.drawImage(sourceSurface.pixels, 0, 0);
      let mask: HTMLCanvasElement | undefined;
      if (sourceSurface?.mask) {
        mask = makeCanvas(doc.w, doc.h);
        mask.getContext('2d')!.drawImage(sourceSurface.mask, 0, 0);
      }
      surfacesRef.current.set(layer.id, {
        pixels,
        mask,
        precision: sourceSurface?.precision
          ? workingDepthRef.current === '8u'
            ? undefined
            : sourceSurface.precision.width === pixels.width &&
                sourceSurface.precision.height === pixels.height
              ? convertWorkingSurface(
                  sourceSurface.precision,
                  workingDepthRef.current as HighWorkingDepth,
                )
              : createPrecisionBacking(
                  { pixels },
                  workingDepthRef.current as HighWorkingDepth,
                )
          : undefined,
      });
    }
    const insertion = Math.max(
      0,
      layersRef.current.findIndex((layer) => layer.id === selectedRef.current),
    );
    const next = [...layersRef.current];
    next.splice(insertion, 0, ...plan.layers);
    syncLayers(next);
    selectMany(plan.rootIds, plan.rootIds[0]);
    snapshot('Paste layers from document');
    render();
    setStatus(
      `${plan.rootIds.length} editable ${plan.rootIds.length === 1 ? 'layer tree' : 'layer trees'} pasted from ${clipboard.documentName} without flattening`,
    );
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
    const mergedSurface = renderEditableSurface([
      { ...upper, parentId: undefined },
      { ...lower, parentId: undefined },
    ]);
    surfacesRef.current.set(lower.id, mergedSurface);
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
    const mergedSurface = renderEditableSurface();
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
    surfacesRef.current.set(id, mergedSurface);
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
    const flattenedSurface = renderEditableSurface(
      layersRef.current,
      surfacesRef.current,
      doc,
      'white',
    );
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
    surfacesRef.current = new Map([[id, flattenedSurface]]);
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
    patchLayer(
      meta.id,
      {
        hasMask: false,
        maskOverlay: false,
        maskTransform: defaultMaskTransform(),
      },
      'Remove layer mask',
    );
    setEditing('pixels');
    render();
  };
  const updateMaskTransform = (
    patch: Partial<MaskTransform>,
    record?: string,
  ) => {
    const meta = selected();
    if (!meta?.hasMask) return;
    patchLayer(
      meta.id,
      {
        maskLinked: false,
        maskTransform: normalizeMaskTransform({
          ...normalizeMaskTransform(meta.maskTransform),
          ...patch,
        }),
      },
      record,
    );
  };
  const openActiveMaskRefinement = () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (!meta?.hasMask || !surface?.mask) {
      setStatus('Select a layer with a raster mask first');
      return;
    }
    const source = makeCanvas(doc.w, doc.h);
    renderLayers(source.getContext('2d')!);
    selectMaskPreviewSourceRef.current = source;
    setSelectMaskTarget('layer-mask');
    setSelectMaskOutput('layer-mask');
    setSelectMaskOpen(true);
  };
  const filter = async (
    kind: 'grayscale' | 'invert' | 'brightness' | 'sharpen',
  ) => {
    const target = targetContext();
    if (!target || editing === 'mask') return;
    const ctx = target.ctx;
    if (kind === 'sharpen') {
      ctx.save();
      ctx.filter = 'contrast(1.18) saturate(1.08)';
      ctx.drawImage(ctx.canvas, 0, 0);
      ctx.restore();
    } else {
      const d = ctx.getImageData(0, 0, doc.w, doc.h);
      if (kind === 'grayscale' || kind === 'invert') {
        const controller = new AbortController(),
          jobId = crypto.randomUUID();
        activeJobAbort.current?.abort();
        activeJobAbort.current = controller;
        setActiveJob({ id: jobId, label: kind, progress: 10 });
        setStatus(`Running ${kind} with the fastest local renderer…`);
        try {
          const result = await applyAcceleratedPixelFilter(
            d.data,
            d.width,
            d.height,
            kind,
            1,
            controller.signal,
            (progress) =>
              setActiveJob((current) =>
                current?.id === jobId ? { ...current, progress } : current,
              ),
          );
          if (controller.signal.aborted)
            throw new DOMException('Aborted', 'AbortError');
          ctx.putImageData(
            new ImageData(
              Uint8ClampedArray.from(result.pixels),
              d.width,
              d.height,
            ),
            0,
            0,
          );
          setActiveJob((current) =>
            current?.id === jobId ? { ...current, progress: 100 } : current,
          );
          snapshot(kind[0].toUpperCase() + kind.slice(1));
          render();
          setStatus(
            `${kind[0].toUpperCase() + kind.slice(1)} applied · ${result.backend === 'webgpu' ? 'WebGPU' : result.backend === 'wasm-simd-worker' ? 'WASM SIMD worker fallback' : result.backend === 'webgl2' ? 'WebGL2 fallback' : 'CPU fallback'}`,
          );
        } catch (error) {
          setStatus(
            error instanceof DOMException && error.name === 'AbortError'
              ? `${kind} cancelled · no pixels were changed`
              : error instanceof Error
                ? error.message
                : `${kind} failed safely`,
          );
        } finally {
          if (activeJobAbort.current === controller)
            activeJobAbort.current = null;
          setActiveJob((current) => (current?.id === jobId ? null : current));
        }
        return;
      }
      const hist = [
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
      const effects = normalizeLayerEffects(operation.effects);
      if (effects.useGlobalLight) {
        syncLayers(
          layersRef.current.map((layer) =>
            layer.id === meta.id
              ? { ...layer, effects }
              : layer.effects?.useGlobalLight
                ? {
                    ...layer,
                    effects: normalizeLayerEffects({
                      ...layer.effects,
                      angle: effects.angle,
                    }),
                  }
                : layer,
          ),
        );
        setSaved(false);
        setTimeout(() => snapshot('Layer effects and global light'), 0);
      } else patchLayer(meta.id, { effects }, 'Layer effects');
      render();
      setStatus(
        effects.useGlobalLight
          ? `Editable layer effects applied · global light ${effects.angle}° synchronized`
          : 'Editable layer effects applied',
      );
      return;
    }
    if (operation.kind === 'fill') {
      if (!roomForLayers()) return;
      const current = selected(),
        parent = current?.kind === 'group' ? current.id : current?.parentId;
      if (parent && !permit([parent])) return;
      if (!hasRoom(doc.w * doc.h)) return;
      const id = crypto.randomUUID(),
        surface: LayerSurface = { pixels: makeCanvas(doc.w, doc.h) },
        fillLayer = normalizeFillLayerRecipe({
          ...defaultFillLayerRecipe(),
          mode: operation.mode,
          color: operation.color,
          color2: operation.color2,
        }),
        layer: LayerMeta = {
          id,
          name:
            operation.mode === 'solid'
              ? 'Solid Color Fill'
              : operation.mode === 'gradient'
                ? 'Gradient Fill'
                : 'Pattern Fill',
          visible: true,
          opacity: 100,
          blend: 'source-over',
          x: 0,
          y: 0,
          hasMask: operation.masked,
          maskEnabled: true,
          maskDensity: 100,
          maskFeather: 0,
          maskLinked: true,
          maskOverlay: false,
          maskTransform: defaultMaskTransform(),
          kind: 'fill',
          parentId: parent,
          fillLayer,
        };
      if (operation.masked) {
        surface.mask = makeCanvas(doc.w, doc.h);
        const mask = surface.mask.getContext('2d')!;
        mask.fillStyle = 'white';
        mask.fillRect(0, 0, doc.w, doc.h);
      }
      surfacesRef.current.set(id, surface);
      insertLayer(layer);
      select(id);
      setEditing('pixels');
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
  const copyLayerEffects = () => {
    const meta = selected();
    if (!meta?.effects) {
      setStatus('Select a layer with effects first');
      return;
    }
    effectsClipboardRef.current = normalizeLayerEffects(meta.effects);
    setStatus('Layer effects copied');
  };
  const pasteLayerEffects = () => {
    const meta = selected(),
      copied = effectsClipboardRef.current;
    if (!meta || !copied || meta.kind === 'group' || isLocked(meta.id)) {
      setStatus('Copy effects, then select an unlocked editable layer');
      return;
    }
    applyLayerStudio({ kind: 'effects', effects: { ...copied } });
    setStatus('Layer effects pasted and remain editable');
  };
  const clearLayerEffects = () => {
    const meta = selected();
    if (!meta?.effects) return;
    patchLayer(meta.id, { effects: undefined }, 'Clear layer effects');
    render();
    setStatus('Layer effects cleared');
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
    const previousInstance = meta.smartObject?.instanceId,
      instanceId = crypto.randomUUID(),
      dependencies = previousInstance ? [previousInstance] : [];
    assertAcyclicSmartObjectGraph([
      { instanceId, dependencies },
      ...(meta.smartObject
        ? [
            {
              instanceId: previousInstance,
              dependencies: meta.smartObject.dependencies,
            },
          ]
        : []),
    ]);
    patchLayer(
      meta.id,
      {
        smartObject: {
          kind: 'embedded',
          sourceName: meta.name,
          sourceData: surface.pixels.toDataURL('image/png'),
          filters: [],
          filterMask: false,
          instanceId,
          sourceVersion: 1,
          dependencies,
        },
      },
      'Convert to Smart Object',
    );
    setStatus('Embedded Smart Object created; transforms are non-destructive');
  };
  const makeSmartObjectIndependent = () => {
    const meta = selected(),
      smart = meta?.smartObject;
    if (!meta || !smart || isLocked(meta.id)) {
      setStatus('Select an unlocked Smart Object first');
      return;
    }
    patchLayer(
      meta.id,
      {
        smartObject: {
          ...smart,
          kind: 'embedded',
          instanceId: crypto.randomUUID(),
          dependencies: [],
          linkedHandleId: undefined,
          linkedStatus: undefined,
        },
      },
      'Make Smart Object independent',
    );
    setStatus('Independent Smart Object created from the current contents');
  };
  const duplicateSmartObjectInstance = () => {
    const smart = selected()?.smartObject;
    if (!smart) {
      setStatus('Select a Smart Object first');
      return;
    }
    if (!smart.instanceId) {
      const meta = selected()!;
      patchLayer(
        meta.id,
        { smartObject: { ...smart, instanceId: crypto.randomUUID() } },
        'Prepare shared Smart Object',
      );
    }
    duplicate();
    setStatus('Shared Smart Object instance duplicated');
  };
  async function chooseSmartFile(action: 'link' | 'replace' | 'relink') {
    smartFileAction.current = action;
    const picker = (
      window as unknown as {
        showOpenFilePicker?: (options: unknown) => Promise<LocalFileHandle[]>;
      }
    ).showOpenFilePicker;
    if (!picker) {
      smartObjectFileRef.current?.click();
      return;
    }
    try {
      const [handle] = await picker({
        multiple: false,
        types: [
          {
            description: 'Images',
            accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
          },
        ],
      });
      if (handle) await applySmartFile(await handle.getFile(), handle);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setStatus('The linked image could not be selected');
    }
  }
  async function applySmartFile(file?: File, handle?: LocalFileHandle) {
    if (!file) return false;
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
      const previous = meta.smartObject,
        instanceId = previous?.instanceId ?? crypto.randomUUID(),
        sourceData = pixels.toDataURL('image/png'),
        linkedHandleId =
          action === 'link' || action === 'relink'
            ? meta.id
            : previous?.linkedHandleId,
        linkedStatus =
          handle &&
          (action === 'link' ||
            action === 'relink' ||
            previous?.kind === 'linked')
            ? 'connected'
            : action === 'link' || action === 'relink'
              ? 'missing'
              : previous?.linkedStatus,
        sourceKind =
          action === 'link' || action === 'relink'
            ? 'linked'
            : (previous?.kind ?? 'embedded'),
        historyLabel =
          action === 'replace'
            ? 'Replace Smart Object contents'
            : action === 'relink'
              ? 'Relink Smart Object'
              : 'Place linked Smart Object';
      for (const layer of layersRef.current) {
        if (
          layer.id !== meta.id &&
          (!previous?.instanceId ||
            layer.smartObject?.instanceId !== previous.instanceId)
        )
          continue;
        const surface = surfacesRef.current.get(layer.id);
        if (!surface) continue;
        const copy = makeCanvas(doc.w, doc.h);
        copy.getContext('2d')!.drawImage(pixels, 0, 0);
        surface.pixels.width = surface.pixels.height = 1;
        surface.pixels = copy;
      }
      pixels.width = pixels.height = 1;
      syncLayers(
        layersRef.current.map((layer) => {
          if (
            layer.id !== meta!.id &&
            (!previous?.instanceId ||
              layer.smartObject?.instanceId !== previous.instanceId)
          )
            return layer;
          const existing = layer.smartObject;
          return {
            ...layer,
            smartObject: {
              kind: sourceKind,
              sourceName: file.name,
              sourceData,
              filters: existing?.filters ?? [],
              filterMask: existing?.filterMask ?? false,
              linkedHandleId,
              linkedStatus,
              instanceId,
              sourceVersion: (existing?.sourceVersion ?? 1) + 1,
              dependencies: existing?.dependencies ?? [],
              raw: undefined,
            },
          };
        }),
      );
      snapshot(historyLabel);
      if (
        handle &&
        (action === 'link' ||
          action === 'relink' ||
          previous?.kind === 'linked')
      )
        await saveLinkedFileHandle(meta.id, handle);
      render();
      setStatus(
        action === 'replace'
          ? 'Smart Object contents replaced'
          : action === 'relink'
            ? 'Linked Smart Object relinked'
            : 'Linked Smart Object placed with an embedded fallback',
      );
      return true;
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Smart Object file could not be opened',
      );
      return false;
    } finally {
      if (smartObjectFileRef.current) smartObjectFileRef.current.value = '';
    }
  }
  const refreshLinkedSmartObject = async () => {
    const meta = selected(),
      smart = meta?.smartObject;
    if (!meta || smart?.kind !== 'linked') {
      setStatus('Select a linked Smart Object first');
      return;
    }
    try {
      const record = await getLinkedFileHandle(smart.linkedHandleId ?? meta.id),
        resolved = await resolveLinkedFile(record);
      smartFileAction.current = 'replace';
      if (!(await applySmartFile(resolved.file, resolved.handle)))
        throw Error('The linked image could not be decoded');
      setStatus(`${resolved.name} refreshed from its linked file`);
    } catch (error) {
      patchLayer(
        meta.id,
        { smartObject: { ...smart, linkedStatus: 'missing' } },
        'Linked file unavailable',
      );
      setStatus(
        `${error instanceof Error ? error.message : 'The linked file is unavailable'} · embedded fallback retained · use Relink`,
      );
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
    const image = await decodeCameraRaw(file, raw.settings.decode);
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
    if (smart.kind === 'linked') {
      setStatus(
        'Linked Smart Objects use Refresh, Relink, or Replace contents',
      );
      return;
    }
    const instanceId = smart.instanceId ?? crypto.randomUUID(),
      parentDocumentId = activeDocumentRef.current,
      existing = [...documentStoreRef.current.values()].find(
        (document) =>
          document.smartObjectSource?.parentDocumentId === parentDocumentId &&
          document.smartObjectSource.instanceId === instanceId,
      );
    if (existing) {
      switchDocument(existing.id);
      setStatus('Switched to the open Smart Object source document');
      return;
    }
    if (!smart.instanceId && meta)
      patchLayer(
        meta.id,
        { smartObject: { ...smart, instanceId } },
        'Prepare Smart Object source',
      );
    const decode = (uri: string, width: number, height: number) =>
      new Promise<HTMLCanvasElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          if (image.naturalWidth !== width || image.naturalHeight !== height) {
            reject(
              Error('Embedded Smart Object pixel dimensions do not match'),
            );
            return;
          }
          const pixels = makeCanvas(width, height);
          pixels.getContext('2d')!.drawImage(image, 0, 0);
          resolve(pixels);
        };
        image.onerror = () =>
          reject(Error('Embedded Smart Object pixels are invalid'));
        image.src = uri;
      });
    try {
      if (smart.embeddedDocument) {
        const embedded = validateEmbeddedDocument(
            smart.embeddedDocument,
          ) as EmbeddedDocumentData,
          nextSurfaces = new Map<string, LayerSurface>();
        for (const record of embedded.surfaces)
          nextSurfaces.set(record.id, {
            pixels: await decode(
              record.pixels,
              embedded.width,
              embedded.height,
            ),
            mask: record.mask
              ? await decode(record.mask, embedded.width, embedded.height)
              : undefined,
            precision: record.workingPixels
              ? deserializeWorkingSurface(record.workingPixels)
              : undefined,
          });
        loadImportedDocument(
          `${smart.sourceName} — Smart Object contents`,
          embedded.width,
          embedded.height,
          structuredClone(embedded.layers),
          nextSurfaces,
          'Open layered Smart Object contents',
          undefined,
          { parentDocumentId, instanceId },
          undefined,
          normalizeWorkingDepth(embedded.workingDepth),
          embedded.sceneReferred === true,
          normalizeColorProfile(embedded.colorProfile),
          embedded.colorProfileData,
        );
        const opened = documentStoreRef.current.get(activeDocumentRef.current);
        if (opened) {
          opened.selectedId = embedded.selectedId;
          opened.selectedIds = [
            ...(embedded.selectedIds ?? [embedded.selectedId]),
          ];
          opened.paths = structuredClone(embedded.paths ?? []);
          opened.layerComps = structuredClone(embedded.layerComps ?? []);
          opened.artboards = structuredClone(embedded.artboards ?? []);
          selectMany(opened.selectedIds, opened.selectedId);
          setPaths(opened.paths);
          layerCompsRef.current = opened.layerComps;
          setLayerComps(opened.layerComps);
          setArtboards(opened.artboards);
          setActiveArtboardId(opened.artboards[0]?.id ?? '');
        }
      } else {
        const image = new Image();
        image.src = smart.sourceData;
        await image.decode();
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
          undefined,
          { parentDocumentId, instanceId },
        );
      }
      setStatus('Smart Object contents opened in a linked editable tab');
    } catch (error) {
      setPsdError(
        error instanceof Error
          ? error.message
          : 'The embedded Smart Object document could not be opened.',
      );
    }
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
              version: 1,
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
              ? {
                  ...item,
                  opacity: opacityValue,
                  blend,
                  version: (item.version ?? 1) + 1,
                }
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
    smartFilterPreviewRef.current = true;
    patchLayer(
      meta.id,
      {
        smartObject: {
          ...meta.smartObject,
          filters: meta.smartObject.filters.map((filter) =>
            filter.id === id
              ? {
                  ...filter,
                  ...patch,
                  version: (filter.version ?? 1) + 1,
                }
              : filter,
          ),
        },
      },
      record,
    );
    render();
    if (smartFilterFinalTimer.current)
      clearTimeout(smartFilterFinalTimer.current);
    smartFilterFinalTimer.current = setTimeout(
      () => {
        smartFilterPreviewRef.current = false;
        smartFilterFinalTimer.current = null;
        render();
      },
      adaptivePerformancePolicy({
        mode: preferences.performanceMode,
        documentPixels: doc.w * doc.h,
        layerCount: layersRef.current.length,
        deviceMemoryGb: (navigator as Navigator & { deviceMemory?: number })
          .deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency,
      }).finalDelayMs,
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
  const storeBrushTip = async (
    record: BrushTipRecord,
    canvas: HTMLCanvasElement,
  ) => {
    await saveBrushTip(record);
    brushTipCanvases.current.set(record.id, canvas);
    const previousUrl = brushTipUrls.current.get(record.id);
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    brushTipUrls.current.set(record.id, URL.createObjectURL(record.blob));
    setBrushTips((items) =>
      [...items.filter((item) => item.id !== record.id), record].sort(
        (a, b) =>
          Number(b.favorite) - Number(a.favorite) ||
          a.name.localeCompare(b.name),
      ),
    );
  };
  const applyBrushTip = (record?: BrushTipRecord) => {
    setActiveBrushTipId(record?.id ?? '');
    if (!record) {
      setStatus('Standard round brush tip selected');
      return;
    }
    const settings = record.settings;
    if (settings?.size) setSize(Math.max(1, Math.min(300, settings.size)));
    if (settings?.angle !== undefined)
      setBrushAngle(Math.max(-180, Math.min(180, settings.angle)));
    if (settings?.roundness)
      setBrushRoundness(Math.max(5, Math.min(100, settings.roundness)));
    if (settings?.spacing)
      setBrushSpacing(Math.max(1, Math.min(200, settings.spacing)));
    if (settings?.sizeJitter !== undefined)
      setSizeJitter(Math.max(0, Math.min(100, settings.sizeJitter)));
    if (settings?.opacityJitter !== undefined)
      setOpacityJitter(Math.max(0, Math.min(100, settings.opacityJitter)));
    if (settings?.flowJitter !== undefined)
      setFlowJitter(Math.max(0, Math.min(100, settings.flowJitter)));
    if (settings?.scatter !== undefined)
      setBrushScatter(Math.max(0, Math.min(300, settings.scatter)));
    setStatus(`${record.name} selected from ${record.folder}`);
  };
  const defineBrushFromSelection = async () => {
    const bounds = selectionRef.current ?? { x: 0, y: 0, w: doc.w, h: doc.h },
      left = Math.max(0, Math.floor(bounds.x)),
      top = Math.max(0, Math.floor(bounds.y)),
      width = Math.max(1, Math.min(doc.w - left, Math.ceil(bounds.w))),
      height = Math.max(1, Math.min(doc.h - top, Math.ceil(bounds.h))),
      scale = Math.min(1, 512 / Math.max(width, height)),
      composite = makeCanvas(doc.w, doc.h),
      canvas = makeCanvas(
        Math.max(1, Math.round(width * scale)),
        Math.max(1, Math.round(height * scale)),
      );
    renderLayers(composite.getContext('2d')!);
    const context = canvas.getContext('2d', { willReadFrequently: true })!;
    context.drawImage(
      composite,
      left,
      top,
      width,
      height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height),
      alpha = maskAlphaFromRgba(pixels.data);
    for (let pixel = 0; pixel < alpha.length; pixel++) {
      const at = pixel * 4;
      pixels.data[at] = pixels.data[at + 1] = pixels.data[at + 2] = 255;
      pixels.data[at + 3] = alpha[pixel];
    }
    context.putImageData(pixels, 0, 0);
    composite.width = composite.height = 1;
    const record: BrushTipRecord = {
      id: crypto.randomUUID(),
      name: `Custom tip ${brushTips.length + 1}`,
      folder: 'Custom',
      tags: ['selection'],
      favorite: false,
      source: 'image',
      width: canvas.width,
      height: canvas.height,
      blob: await canvasBlob(canvas),
      updated: Date.now(),
    };
    await storeBrushTip(record, canvas);
    applyBrushTip(record);
    setBrushFolder('Custom');
    setStatus(
      `${record.name} defined from ${selectionRef.current ? 'the active selection' : 'the document'}`,
    );
  };
  const importBrushTips = async (file?: File) => {
    if (!file) return;
    try {
      if (/\.abr$/i.test(file.name)) {
        const { readAbr } = await import('ag-psd'),
          pack = readAbr(new Uint8Array(await file.arrayBuffer())),
          folder = file.name.replace(/\.abr$/i, '') || 'Imported ABR';
        if (!pack.brushes.length)
          throw Error('No brushes were found in this ABR file');
        let first: BrushTipRecord | undefined;
        for (let index = 0; index < pack.brushes.length; index++) {
          const brush = pack.brushes[index],
            shape = brush.shape,
            canvas = abrBrushMask(
              brush as unknown as { shape?: Record<string, unknown> },
              pack.samples,
            ),
            record: BrushTipRecord = {
              id: crypto.randomUUID(),
              name: brush.name?.trim() || `Brush ${index + 1}`,
              folder,
              tags: ['abr', String(shape.type)],
              favorite: false,
              source: 'abr',
              width: canvas.width,
              height: canvas.height,
              blob: await canvasBlob(canvas),
              updated: Date.now(),
              settings: {
                size: Number(shape.size ?? 32),
                angle: Number(shape.angle ?? 0),
                roundness: Number('roundness' in shape ? shape.roundness : 100),
                spacing: Number(shape.spacing ?? brush.spacing ?? 10),
                sizeJitter: brush.shapeDynamics?.sizeDynamics.jitter,
                opacityJitter: brush.transfer?.opacityDynamics.jitter,
                flowJitter: brush.transfer?.flowDynamics.jitter,
                scatter: brush.scatter?.scatterDynamics.jitter,
              },
            };
          await storeBrushTip(record, canvas);
          first ??= record;
        }
        applyBrushTip(first);
        setBrushFolder(folder);
        setStatus(`${pack.brushes.length} ABR brushes imported into ${folder}`);
      } else {
        const canvas = await imageMaskCanvas(file),
          record: BrushTipRecord = {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.[^.]+$/, '') || 'Custom tip',
            folder: 'Custom',
            tags: ['custom'],
            favorite: false,
            source: 'image',
            width: canvas.width,
            height: canvas.height,
            blob: await canvasBlob(canvas),
            updated: Date.now(),
          };
        await storeBrushTip(record, canvas);
        applyBrushTip(record);
        setBrushFolder('Custom');
        setStatus(`${record.name} imported as a persistent custom brush tip`);
      }
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Brush tips could not be imported',
      );
    } finally {
      if (brushTipFileRef.current) brushTipFileRef.current.value = '';
    }
  };
  const updateBrushTip = async (
    id: string,
    patch: Partial<
      Pick<BrushTipRecord, 'name' | 'folder' | 'tags' | 'favorite'>
    >,
  ) => {
    const current = brushTips.find((tip) => tip.id === id);
    if (!current) return;
    const next = { ...current, ...patch, updated: Date.now() };
    await saveBrushTip(next);
    setBrushTips((items) =>
      items.map((item) => (item.id === id ? next : item)),
    );
  };
  const removeBrushTip = async (id: string) => {
    await deleteBrushTip(id);
    brushTipCanvases.current.delete(id);
    const url = brushTipUrls.current.get(id);
    if (url) URL.revokeObjectURL(url);
    brushTipUrls.current.delete(id);
    tintedBrushTips.current.clear();
    setBrushTips((items) => items.filter((item) => item.id !== id));
    if (activeBrushTipId === id) setActiveBrushTipId('');
    setStatus('Custom brush tip removed');
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
      angle: brushAngle,
      roundness: brushRoundness,
      sizeJitter,
      hueJitter,
      opacityJitter,
      flowJitter,
      scatter: brushScatter,
      texture: brushTexture,
      wetEdges,
      airbrushBuildUp,
      symmetry: brushSymmetry,
      radialSymmetryCount,
      dualBrush: {
        enabled: dualBrush,
        scale: dualBrushScale,
        offset: dualBrushOffset,
      },
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
      setBrushAngle(number('angle', brushAngle, -180, 180));
      setBrushRoundness(number('roundness', brushRoundness, 5, 100));
      setSizeJitter(number('sizeJitter', sizeJitter, 0, 100));
      setHueJitter(number('hueJitter', hueJitter, 0, 100));
      setOpacityJitter(number('opacityJitter', opacityJitter, 0, 100));
      setFlowJitter(number('flowJitter', flowJitter, 0, 100));
      setBrushScatter(number('scatter', brushScatter, 0, 300));
      setBrushTexture(number('texture', brushTexture, 0, 100));
      setWetEdges(Boolean(preset.wetEdges));
      setAirbrushBuildUp(Boolean(preset.airbrushBuildUp));
      if (
        ['none', 'vertical', 'horizontal', 'radial'].includes(
          String(preset.symmetry),
        )
      )
        setBrushSymmetry(preset.symmetry as BrushSymmetry);
      setRadialSymmetryCount(
        number('radialSymmetryCount', radialSymmetryCount, 2, 16),
      );
      const dual = preset.dualBrush as Record<string, unknown> | undefined;
      if (dual) {
        setDualBrush(Boolean(dual.enabled));
        setDualBrushScale(
          Math.max(10, Math.min(100, Number(dual.scale ?? 55))),
        );
        setDualBrushOffset(
          Math.max(0, Math.min(200, Number(dual.offset ?? 30))),
        );
      }
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
    if (mode === 'fill') {
      let fillSource = source,
        composite: HTMLCanvasElement | null = null;
      if (contentAwareSampling === 'all-layers') {
        composite = makeCanvas(doc.w, doc.h);
        renderLayers(composite.getContext('2d')!);
        fillSource = composite
          .getContext('2d', { willReadFrequently: true })!
          .getImageData(0, 0, doc.w, doc.h);
      }
      try {
        const result = contentAwareFill(fillSource.data, alpha, doc.w, doc.h, {
          samplingMode: contentAwareSampling,
          sampleRect: {
            x: contentAwareSampleX,
            y: contentAwareSampleY,
            w: contentAwareSampleW,
            h: contentAwareSampleH,
          },
          samplePoint: {
            x: contentAwareSampleX + contentAwareSampleW / 2,
            y: contentAwareSampleY + contentAwareSampleH / 2,
          },
          colorAdaptation: contentAwareColor,
          rotation: contentAwareRotation,
          scale: contentAwareScale,
          mirror: contentAwareMirror,
        });
        const filled = ctx.createImageData(doc.w, doc.h);
        if (contentAwareSampling === 'all-layers') {
          filled.data.set(source.data);
          for (let index = 0; index < filled.data.length; index += 4) {
            if (!alpha[index + 3]) continue;
            filled.data[index] = result.pixels[index];
            filled.data[index + 1] = result.pixels[index + 1];
            filled.data[index + 2] = result.pixels[index + 2];
            filled.data[index + 3] = result.pixels[index + 3];
          }
        } else filled.data.set(result.pixels);
        ctx.putImageData(filled, 0, 0);
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : 'Content-Aware Fill could not be completed',
        );
        if (composite) composite.width = composite.height = 1;
        mask.width = mask.height = 1;
        return;
      }
      if (composite) composite.width = composite.height = 1;
      mask.width = mask.height = 1;
      snapshot('Content-Aware Fill');
      render();
      setStatus('Content-Aware Fill applied from the visible sampling preview');
      return;
    }
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
          const noise = 0;
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
          : 'Content-Aware Move',
    );
    render();
    setStatus(
      mode === 'patch'
        ? 'Selection patched from the chosen offset'
        : mode === 'remove'
          ? 'Selection removed and blended from surrounding pixels'
          : 'Selection moved and its original area repaired',
    );
  };
  const createFrequencySeparation = () => {
    const sourceLayer = selected(),
      sourceSurface = sourceLayer && surfacesRef.current.get(sourceLayer.id);
    if (
      !sourceLayer ||
      !sourceSurface ||
      sourceLayer.kind === 'group' ||
      sourceLayer.kind === 'adjustment' ||
      sourceLayer.kind === 'fill' ||
      isLocked(sourceLayer.id) ||
      !roomForLayers(4) ||
      !hasRoom(doc.w * doc.h * 4)
    ) {
      setStatus('Select an unlocked pixel or text layer first');
      return;
    }
    const groupId = crypto.randomUUID(),
      retouchId = crypto.randomUUID(),
      highId = crypto.randomUUID(),
      lowId = crypto.randomUUID(),
      low = makeCanvas(doc.w, doc.h),
      lowContext = low.getContext('2d')!;
    lowContext.filter = 'blur(8px)';
    lowContext.drawImage(sourceSurface.pixels, 0, 0);
    lowContext.filter = 'none';
    const originalPixels = sourceSurface.pixels
        .getContext('2d', { willReadFrequently: true })!
        .getImageData(0, 0, doc.w, doc.h),
      lowPixels = lowContext.getImageData(0, 0, doc.w, doc.h),
      high = makeCanvas(doc.w, doc.h),
      highContext = high.getContext('2d')!,
      highPixels = highContext.createImageData(doc.w, doc.h);
    highPixels.data.set(
      highFrequencyPixels(originalPixels.data, lowPixels.data),
    );
    highContext.putImageData(highPixels, 0, 0);
    const base = {
        visible: true,
        opacity: 100,
        x: sourceLayer.x,
        y: sourceLayer.y,
        hasMask: false,
        maskEnabled: true,
        parentId: groupId,
      },
      group: LayerMeta = {
        id: groupId,
        name: `${sourceLayer.name} · Frequency Separation`,
        visible: true,
        opacity: 100,
        blend: 'source-over',
        x: 0,
        y: 0,
        hasMask: false,
        maskEnabled: true,
        kind: 'group',
        parentId: sourceLayer.parentId,
        groupIsolation: 'pass-through',
      },
      retouch: LayerMeta = {
        ...base,
        id: retouchId,
        name: 'Retouching',
        blend: 'source-over',
      },
      highLayer: LayerMeta = {
        ...base,
        id: highId,
        name: 'High Frequency',
        blend: 'linear-light',
      },
      lowLayer: LayerMeta = {
        ...base,
        id: lowId,
        name: 'Low Frequency',
        blend: 'source-over',
      };
    surfacesRef.current.set(groupId, { pixels: makeCanvas(doc.w, doc.h) });
    surfacesRef.current.set(retouchId, { pixels: makeCanvas(doc.w, doc.h) });
    surfacesRef.current.set(highId, { pixels: high });
    surfacesRef.current.set(lowId, { pixels: low });
    const next = layersRef.current.map((layer) =>
        layer.id === sourceLayer.id ? { ...layer, visible: false } : layer,
      ),
      sourceIndex = next.findIndex((layer) => layer.id === sourceLayer.id);
    next.splice(
      Math.max(0, sourceIndex),
      0,
      group,
      retouch,
      highLayer,
      lowLayer,
    );
    syncLayers(next);
    select(retouchId);
    setTool('retouch');
    setRetouchMode('healing');
    setRetouchSampleAll(true);
    snapshot('Create frequency separation');
    render();
    setStatus(
      'Frequency separation created; paint on the blank Retouching layer',
    );
  };
  const applyGeometry = (operation: GeometryOperation) => {
    if (operation.kind === 'transform') {
      const meta = selected();
      if (
        meta?.smartObject &&
        editing !== 'mask' &&
        operation.mode !== 'content-aware-scale'
      ) {
        if (isLocked(meta.id)) {
          setStatus('Unlock the Smart Object before transforming it');
          return;
        }
        patchLayer(
          meta.id,
          {
            smartObject: {
              ...meta.smartObject,
              transform: normalizeSmartObjectTransform({
                mode: operation.mode,
                horizontal: operation.x,
                vertical: operation.y,
                preset: operation.preset,
              }),
            },
          },
          `${operation.mode
            .split('-')
            .map((part) => part[0].toUpperCase() + part.slice(1))
            .join(' ')} Smart Object`,
        );
        setStatus('Editable Smart Object transform applied');
        return;
      }
      const target = targetContext();
      if (!target || !meta || editing === 'mask') {
        setStatus('Select an unlocked pixel layer first');
        return;
      }
      if (operation.mode === 'content-aware-scale') {
        const scaleX = Math.max(0.5, Math.min(2, operation.x / 100)),
          scaleY = Math.max(0.5, Math.min(2, (operation.y || 100) / 100)),
          width = Math.max(1, Math.round(doc.w * scaleX)),
          height = Math.max(1, Math.round(doc.h * scaleY)),
          source = target.ctx.getImageData(0, 0, doc.w, doc.h),
          protection = selectionRef.current
            ? selectionMask(doc.w, doc.h, 0, 0)
            : undefined,
          protectionData = protection
            ?.getContext('2d', { willReadFrequently: true })!
            .getImageData(0, 0, doc.w, doc.h).data,
          scaled = scaleContentAwarePixels(
            { width: doc.w, height: doc.h, data: source.data },
            width,
            height,
            protectionData,
          ),
          output = makeCanvas(width, height),
          outputContext = output.getContext('2d')!,
          outputPixels = outputContext.createImageData(width, height);
        outputPixels.data.set(scaled.data);
        outputContext.putImageData(outputPixels, 0, 0);
        target.ctx.clearRect(0, 0, doc.w, doc.h);
        target.ctx.drawImage(
          output,
          Math.round((doc.w - width) / 2),
          Math.round((doc.h - height) / 2),
        );
        output.width = output.height = 1;
        if (protection) protection.width = protection.height = 1;
      } else {
        transformRasterPixels(
          target.ctx.canvas,
          operation.mode,
          operation.x,
          operation.y,
          operation.preset,
        );
        const surface = surfacesRef.current.get(meta.id);
        if (surface?.mask)
          transformRasterPixels(
            surface.mask,
            operation.mode,
            operation.x,
            operation.y,
            operation.preset,
          );
      }
      snapshot(
        operation.mode
          .split('-')
          .map((part) => part[0].toUpperCase() + part.slice(1))
          .join(' '),
      );
      render();
      setStatus(
        operation.mode === 'content-aware-scale'
          ? `Content-Aware Scale applied at ${operation.x}% × ${operation.y || 100}%${selectionRef.current ? ' with selection protection' : ''}`
          : 'Advanced transform applied',
      );
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
    requestAnimationFrame(() => render());
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
    snapshot(`${kind[0].toUpperCase() + kind.slice(1)} selection`);
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
    const maskLayer = selectMaskTarget === 'layer-mask' ? selected() : null,
      maskSurface = maskLayer && surfacesRef.current.get(maskLayer.id);
    if (selectMaskTarget === 'selection' && !selectionRef.current) {
      setStatus('Make a selection before opening Select and Mask.');
      return;
    }
    if (selectMaskTarget === 'layer-mask' && !maskSurface?.mask) {
      setStatus('The selected layer no longer has a raster mask.');
      setSelectMaskOpen(false);
      return;
    }
    const base = makeCanvas(doc.w, doc.h);
    if (maskSurface?.mask)
      base.getContext('2d')!.drawImage(maskSurface.mask, 0, 0);
    else {
      const selectionSource = selectionMask(doc.w, doc.h, 0, 0);
      base.getContext('2d')!.drawImage(selectionSource, 0, 0);
      selectionSource.width = selectionSource.height = 1;
    }
    let out = base;
    if (refineRadius > 0) {
      const grown = expandMask(out, Math.round(refineRadius)),
        activeLayer = selected(),
        surface = activeLayer && surfacesRef.current.get(activeLayer.id);
      if (selectMaskSmartRadius && activeLayer && surface) {
        const visible = makeCanvas(doc.w, doc.h);
        drawLayer(
          visible.getContext('2d')!,
          {
            ...activeLayer,
            opacity: 100,
            fill: 100,
            blend: 'source-over',
            hasMask:
              selectMaskTarget === 'layer-mask' ? false : activeLayer.hasMask,
          },
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
    if (selectMaskRefineHair && selectMaskPreviewSourceRef.current) {
      const search = expandMask(out, Math.max(3, Math.round(refineRadius + 2))),
        refined = makeCanvas(doc.w, doc.h),
        refinedContext = refined.getContext('2d')!,
        outputPixels = out
          .getContext('2d', { willReadFrequently: true })!
          .getImageData(0, 0, doc.w, doc.h),
        searchPixels = search
          .getContext('2d', { willReadFrequently: true })!
          .getImageData(0, 0, doc.w, doc.h),
        sourcePixels = selectMaskPreviewSourceRef.current
          .getContext('2d', { willReadFrequently: true })!
          .getImageData(0, 0, doc.w, doc.h);
      for (let y = 0; y < doc.h; y++)
        for (let x = 0; x < doc.w; x++) {
          const index = (y * doc.w + x) * 4;
          if (searchPixels.data[index + 3] <= outputPixels.data[index + 3])
            continue;
          const weight = semanticPixelWeight(
            'hair',
            sourcePixels.data[index],
            sourcePixels.data[index + 1],
            sourcePixels.data[index + 2],
            sourcePixels.data[index + 3],
            x / Math.max(1, doc.w - 1),
            y / Math.max(1, doc.h - 1),
            semanticSensitivity,
          );
          const alpha = Math.round(searchPixels.data[index + 3] * weight);
          if (alpha <= outputPixels.data[index + 3]) continue;
          outputPixels.data[index] =
            outputPixels.data[index + 1] =
            outputPixels.data[index + 2] =
              255;
          outputPixels.data[index + 3] = alpha;
        }
      refinedContext.putImageData(outputPixels, 0, 0);
      search.width = search.height = 1;
      if (out !== base) out.width = out.height = 1;
      out = refined;
    }
    if (out !== base) base.width = base.height = 1;
    if (selectMaskTarget === 'layer-mask' && maskLayer && maskSurface) {
      maskSurface.mask = out;
      patchLayer(maskLayer.id, { hasMask: true, maskEnabled: true });
      snapshot('Refine layer mask');
      render();
      setStatus('Layer mask edge refined nondestructively');
      setSelectMaskOpen(false);
      return;
    }
    if (selectMaskOutput === 'new-layer-mask') {
      const sourceLayer = selected(),
        sourceSurface = sourceLayer && surfacesRef.current.get(sourceLayer.id);
      if (
        !sourceLayer ||
        !sourceSurface ||
        sourceLayer.kind === 'group' ||
        sourceLayer.kind === 'adjustment' ||
        isLocked(sourceLayer.id) ||
        !roomForLayers() ||
        !hasRoom(doc.w * doc.h * 2)
      ) {
        setStatus(
          'Choose an unlocked image or fill layer for new-layer output.',
        );
        return;
      }
      const id = crypto.randomUUID(),
        pixelsCanvas = makeCanvas(doc.w, doc.h),
        pixelsContext = pixelsCanvas.getContext('2d')!;
      pixelsContext.drawImage(sourceSurface.pixels, 0, 0);
      if (decontaminate) {
        const maskData = out
            .getContext('2d', { willReadFrequently: true })!
            .getImageData(0, 0, doc.w, doc.h),
          pixels = pixelsContext.getImageData(0, 0, doc.w, doc.h),
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
        pixelsContext.putImageData(pixels, 0, 0);
      }
      const copiedLayer: LayerMeta = {
        ...structuredClone(sourceLayer),
        id,
        name: `${sourceLayer.name} refined`,
        hasMask: true,
        maskEnabled: true,
        maskLinked: true,
        linkId: undefined,
      };
      surfacesRef.current.set(id, { pixels: pixelsCanvas, mask: out });
      const next = [...layersRef.current],
        sourceIndex = next.findIndex((layer) => layer.id === sourceLayer.id);
      next.splice(Math.max(0, sourceIndex), 0, copiedLayer);
      syncLayers(next);
      select(id);
      setEditing('mask');
      snapshot('Select and Mask to new layer');
      render();
      setStatus(
        decontaminate
          ? 'Refined copy created with a layer mask and cleaned edge colors'
          : 'Refined copy created with a nondestructive layer mask',
      );
      setSelectMaskOpen(false);
      return;
    }
    if (selectMaskOutput === 'layer-mask') {
      const outputLayer = selected(),
        outputSurface = outputLayer && surfacesRef.current.get(outputLayer.id);
      if (
        !outputLayer ||
        !outputSurface ||
        outputLayer.kind === 'group' ||
        outputLayer.kind === 'adjustment' ||
        isLocked(outputLayer.id)
      ) {
        setStatus('Choose an unlocked image or fill layer for mask output.');
        return;
      }
      outputSurface.mask = out;
      patchLayer(outputLayer.id, {
        hasMask: true,
        maskEnabled: true,
        maskLinked: true,
      });
      setEditing('mask');
      snapshot('Select and Mask to layer mask');
      render();
      setStatus('Refinement applied as a nondestructive layer mask');
      setSelectMaskOpen(false);
      return;
    }
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
    const rendered = makeCanvas(doc.w, doc.h);
    drawLayer(
      rendered.getContext('2d')!,
      { ...meta, opacity: 100, fill: 100, blend: 'source-over' },
      surface,
      doc.w,
      doc.h,
    );
    const source = rendered
        .getContext('2d', { willReadFrequently: true })!
        .getImageData(0, 0, doc.w, doc.h),
      target = [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
      ] as const,
      local = makeCanvas(doc.w, doc.h),
      image = local.getContext('2d')!.createImageData(doc.w, doc.h);
    let count = 0;
    for (let i = 0; i < source.data.length; i += 4) {
      const weight = colorSimilarityWeight(
        source.data[i],
        source.data[i + 1],
        source.data[i + 2],
        target,
        magicTolerance,
      );
      if (weight > 0 && source.data[i + 3]) {
        image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
        image.data[i + 3] = Math.round(weight * source.data[i + 3]);
        count++;
      }
    }
    local.getContext('2d')!.putImageData(image, 0, 0);
    rendered.width = rendered.height = 1;
    commitSelectionMask(
      local,
      `Color Range selected ${count.toLocaleString()} softly matched pixels`,
    );
    snapshot('Color Range');
  };
  const renderedActivePixels = () => {
    const meta = selected(),
      surface = meta && surfacesRef.current.get(meta.id);
    if (!meta || !surface || meta.kind === 'group') return null;
    const canvas = makeCanvas(doc.w, doc.h);
    drawLayer(
      canvas.getContext('2d')!,
      { ...meta, opacity: 100, fill: 100, blend: 'source-over' },
      surface,
      doc.w,
      doc.h,
    );
    const pixels = canvas
      .getContext('2d', { willReadFrequently: true })!
      .getImageData(0, 0, doc.w, doc.h);
    canvas.width = canvas.height = 1;
    return pixels;
  };
  const commitWeightedRange = (
    source: ImageData,
    weightAt: (index: number, x: number, y: number) => number,
    label: string,
  ) => {
    const mask = makeCanvas(doc.w, doc.h),
      context = mask.getContext('2d')!,
      image = context.createImageData(doc.w, doc.h);
    let count = 0;
    for (let y = 0; y < doc.h; y++)
      for (let x = 0; x < doc.w; x++) {
        const index = (y * doc.w + x) * 4,
          weight = Math.max(0, Math.min(1, weightAt(index, x, y))),
          alpha = Math.round(weight * source.data[index + 3]);
        if (!alpha) continue;
        image.data[index] = image.data[index + 1] = image.data[index + 2] = 255;
        image.data[index + 3] = alpha;
        count++;
      }
    context.putImageData(image, 0, 0);
    commitSelectionMask(mask, `${label} · ${count.toLocaleString()} pixels`);
    snapshot(label);
  };
  const selectSemanticRange = (target: SemanticSelectionTarget) => {
    const source = renderedActivePixels();
    if (!source) {
      setStatus('Select an image or fill layer first');
      return;
    }
    const label = `${target[0].toUpperCase()}${target.slice(1)} mask selected locally`;
    commitWeightedRange(
      source,
      (index, x, y) =>
        semanticPixelWeight(
          target,
          source.data[index],
          source.data[index + 1],
          source.data[index + 2],
          source.data[index + 3],
          x / Math.max(1, doc.w - 1),
          y / Math.max(1, doc.h - 1),
          semanticSensitivity,
        ),
      label,
    );
  };
  const selectSimilar = () => {
    if (!selectionRef.current) {
      setStatus('Make a source selection first');
      return;
    }
    const source = renderedActivePixels();
    if (!source) return;
    const mask = selectionMask(doc.w, doc.h, 0, 0),
      selectedPixels = mask
        .getContext('2d', { willReadFrequently: true })!
        .getImageData(0, 0, doc.w, doc.h).data;
    let red = 0,
      green = 0,
      blue = 0,
      weight = 0;
    for (let i = 0; i < source.data.length; i += 4) {
      const amount = (selectedPixels[i + 3] / 255) * (source.data[i + 3] / 255);
      if (!amount) continue;
      red += source.data[i] * amount;
      green += source.data[i + 1] * amount;
      blue += source.data[i + 2] * amount;
      weight += amount;
    }
    mask.width = mask.height = 1;
    if (!weight) {
      setStatus('The source selection contains no visible pixels');
      return;
    }
    const target = [red / weight, green / weight, blue / weight] as const;
    commitWeightedRange(
      source,
      (index) =>
        colorSimilarityWeight(
          source.data[index],
          source.data[index + 1],
          source.data[index + 2],
          target,
          magicTolerance,
        ),
      'Similar colors selected',
    );
  };
  const selectLuminosityRange = (range: LuminosityRange) => {
    const source = renderedActivePixels();
    if (!source) return;
    commitWeightedRange(
      source,
      (index) =>
        luminosityRangeWeight(
          pixelLuminance(
            source.data[index],
            source.data[index + 1],
            source.data[index + 2],
          ),
          range,
          Math.max(8, magicTolerance),
        ),
      `${range[0].toUpperCase()}${range.slice(1)} luminosity range`,
    );
  };
  const selectFocusRange = () => {
    const source = renderedActivePixels();
    if (!source) return;
    commitWeightedRange(
      source,
      (_index, x, y) =>
        focusWeight(
          source.data,
          doc.w,
          doc.h,
          x,
          y,
          Math.max(8, magicTolerance / 2),
        ),
      'Focus Range selected sharp detail',
    );
  };
  const transformSelection = () => {
    if (!selectionRef.current) {
      setStatus('Make a selection first');
      return;
    }
    const source = selectionMask(doc.w, doc.h, 0, 0),
      output = makeCanvas(doc.w, doc.h),
      context = output.getContext('2d')!,
      bounds = selectionRef.current,
      centerX = bounds.x + bounds.w / 2,
      centerY = bounds.y + bounds.h / 2,
      scale = Math.max(0.01, Math.min(10, selectionTransformScale / 100));
    context.translate(
      centerX + selectionTransformX,
      centerY + selectionTransformY,
    );
    context.scale(scale, scale);
    context.drawImage(source, -centerX, -centerY);
    source.width = source.height = 1;
    commitSelectionMask(output, 'Selection transformed', 'replace');
    snapshot('Transform Selection');
    setSelectionTransformOpen(false);
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
      selectedPixels = s ? selectionMask(doc.w, doc.h, 0, 0) : undefined;
    clipboardRef.current = copyRenderedRegion(
      [
        {
          ...meta,
          parentId: undefined,
          blend: 'source-over',
          opacity: 100,
          fill: 100,
          clipping: false,
        },
      ],
      new Map([[meta.id, surface]]),
      x,
      y,
      w,
      h,
      selectedPixels,
    );
    if (selectedPixels) selectedPixels.width = selectedPixels.height = 1;
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
    if (workingDepthRef.current !== '8u') {
      const source = clip.precision
        ? convertWorkingSurface(
            clip.precision,
            workingDepthRef.current as HighWorkingDepth,
          )
        : createPrecisionBacking(
            { pixels: clip.pixels },
            workingDepthRef.current as HighWorkingDepth,
          );
      surface.precision = placeWorkingSurface(
        source,
        doc.w,
        doc.h,
        clip.x,
        clip.y,
      );
    }
    snapshot('Paste');
    render();
    setStatus('Pasted as a new layer');
  };
  const allowResize = (w: number, h: number) => {
    if (!permit(layersRef.current.map((l) => l.id))) return false;
    try {
      const units = [...surfacesRef.current.values()].reduce(
        (total, surface) =>
          total +
          (surface.mask ? 2 : 1) +
          (workingDepthRef.current === '8u'
            ? 0
            : workingDepthBytesPerPixel(workingDepthRef.current) / 4),
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
      let precision: WorkingSurface | undefined;
      if (workingDepthRef.current !== '8u') {
        if (!old.precision)
          old.precision = createPrecisionBacking(
            old,
            workingDepthRef.current as HighWorkingDepth,
          );
        syncPrecisionSurface(old);
        precision = resizeWorkingSurface(
          old.precision,
          nw,
          nh,
          resampling === 'nearest' ? 'nearest' : 'bilinear',
        );
        ctx.putImageData(
          new ImageData(workingSurfaceToRgba8(precision), nw, nh),
          0,
          0,
        );
      } else {
        ctx.imageSmoothingEnabled = resampling !== 'nearest';
        ctx.imageSmoothingQuality =
          resampling === 'low'
            ? 'low'
            : resampling === 'medium'
              ? 'medium'
              : 'high';
        ctx.drawImage(old.pixels, 0, 0, nw, nh);
      }
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
      surfacesRef.current.set(meta.id, { pixels, mask, precision });
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
      let precision: WorkingSurface | undefined;
      if (workingDepthRef.current !== '8u') {
        if (!old.precision)
          old.precision = createPrecisionBacking(
            old,
            workingDepthRef.current as HighWorkingDepth,
          );
        syncPrecisionSurface(old);
        precision = placeWorkingSurface(old.precision, nw, nh, dx, dy);
        pixels
          .getContext('2d')!
          .putImageData(
            new ImageData(workingSurfaceToRgba8(precision), nw, nh),
            0,
            0,
          );
      } else pixels.getContext('2d')!.drawImage(old.pixels, dx, dy);
      let mask: HTMLCanvasElement | undefined;
      if (old.mask) {
        mask = makeCanvas(nw, nh);
        const mc = mask.getContext('2d')!;
        mc.fillStyle = 'black';
        mc.fillRect(0, 0, nw, nh);
        mc.drawImage(old.mask, dx, dy);
      }
      surfacesRef.current.set(meta.id, { pixels, mask, precision });
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
      ext: string,
      quality = 0.92,
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
        Math.max(0, Math.min(1, quality)),
      );
    },
    [doc, fileName],
  );
  const exportPng = useCallback(
    () => exportImage('image/png', 'png'),
    [exportImage],
  );
  const exportWithPlugin = (exporter: PluginExporter) => {
    const mime =
      exporter.format === 'png'
        ? 'image/png'
        : exporter.format === 'jpeg'
          ? 'image/jpeg'
          : 'image/webp';
    exportImage(mime, exporter.extension, exporter.quality ?? 0.92);
  };
  const loadImportedDocument = (
    name: string,
    w: number,
    h: number,
    nextLayers: LayerMeta[],
    nextSurfaces: Map<string, LayerSurface>,
    label: string,
    restore?: { id: string; saved: boolean; skipPersist: boolean },
    smartObjectSource?: EditorDocument['smartObjectSource'],
    extras?: Pick<
      EditorDocument,
      'paths' | 'artboards' | 'layerComps' | 'savedSelections' | 'feather'
    >,
    nextWorkingDepth: WorkingDepth = '8u',
    sceneReferred = false,
    nextColorProfile: ColorProfileId = 'srgb',
    nextColorProfileData?: PortableIccProfile,
  ) => {
    if (nextColorProfileData) registerIccProfile(nextColorProfileData);
    nextLayers = treeOrder(nextLayers);
    requireRoom(
      w,
      h,
      [...nextSurfaces.values()].reduce(
        (total, surface) => total + surfaceMemoryUnits(surface),
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
        workingDepth: nextWorkingDepth,
        sceneReferred,
        colorProfile: nextColorProfile,
        colorProfileData: nextColorProfileData
          ? structuredClone(nextColorProfileData)
          : undefined,
        layers: nextLayers.map((x) => ({ ...x })),
        selectedId: selectedLayer.id,
        paths: structuredClone(extras?.paths ?? []),
        artboards: structuredClone(extras?.artboards ?? []),
        layerComps: structuredClone(extras?.layerComps ?? []),
        surfaces: nextLayers.map((meta) => {
          const s = nextSurfaces.get(meta.id)!;
          const backing = syncTiledBacking(s);
          return {
            id: meta.id,
            pixels: backing.pixels,
            mask: backing.mask,
            precision: s.precision
              ? captureWorkingSurface(s.precision)
              : undefined,
          };
        }),
      },
      next: EditorDocument = {
        id: documentId,
        name,
        saved: restore?.saved ?? true,
        doc: { w, h },
        workingDepth: nextWorkingDepth,
        sceneReferred,
        colorProfile: nextColorProfile,
        colorProfileData: nextColorProfileData
          ? structuredClone(nextColorProfileData)
          : undefined,
        layers: nextLayers,
        surfaces: nextSurfaces,
        selectedId: selectedLayer.id,
        history: [snap],
        historyIndex: 0,
        zoom: Math.min(100, Math.max(20, Math.round((760 / w) * 100))),
        selection: null,
        paths: structuredClone(extras?.paths ?? []),
        artboards: structuredClone(extras?.artboards ?? []),
        layerComps: structuredClone(extras?.layerComps ?? []),
        savedSelections: structuredClone(extras?.savedSelections ?? []),
        feather: extras?.feather ?? 0,
        smartObjectSource,
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
    setPsdReport(createPsdCompatibilityReport(name, data));
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
          fill: psdFillOpacityToPortable(node.fillOpacity),
          blend: blend in blendLabels ? blend : 'source-over',
          clipping: node.clipping,
          blendIf: psdBlendIfToPortable(node.blendingRanges),
          groupIsolation: node.children
            ? (node.blendMode ?? 'pass through') === 'pass through'
              ? 'pass-through'
              : 'isolated'
            : undefined,
          x: 0,
          y: 0,
          hasMask: !!mask,
          maskEnabled: !node.mask?.disabled,
          kind: node.children
            ? 'group'
            : node.adjustment && psdAdjustmentToHighDepth(node.adjustment)
              ? 'adjustment'
              : node.vectorFill?.type === 'color' ||
                  node.vectorFill?.type === 'solid'
                ? 'fill'
                : 'pixel',
          parentId,
          collapsed: node.opened === false,
          locked: !!node.transparencyProtected,
          textLayer: node.text ? psdTextToPortable(node.text) : undefined,
          fillLayer:
            node.vectorFill?.type === 'color' ||
            node.vectorFill?.type === 'solid'
              ? psdFillToRecipe(node.vectorFill)
              : undefined,
          precisionAdjustment:
            node.adjustment && psdAdjustmentToHighDepth(node.adjustment)
              ? psdAdjustmentToHighDepth(node.adjustment)
              : undefined,
          effects: node.effects
            ? psdEffectsToLayerEffects(node.effects)
            : undefined,
          smartObject: node.placedLayer
            ? (psdToSmartObject(node.placedLayer, data.linkedFiles) as
                | SmartObjectData
                | undefined)
            : undefined,
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
          (l.kind === 'adjustment' &&
            !highDepthToPsdAdjustment(l.precisionAdjustment)) ||
          (l.effects && !layerEffectsToPsd(l.effects)) ||
          (l.smartObject && !smartObjectToPsd(l.smartObject, doc.w, doc.h)) ||
          (l.kind === 'fill' && l.fillLayer?.mode === 'pattern') ||
          l.blendSpace === 'linear' ||
          (l.knockout !== undefined && l.knockout !== 'none') ||
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
        'Layered PSD export cannot preserve these extended blend modes, deep or shallow knockout, pattern fills, linked or advanced Smart Objects and Smart Filters, vector masks, or advanced raster-mask settings yet. Use File → Export flattened PSD for the visible result, or Save layered project to keep editing.',
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
      const linkedFiles = new Map<
        string,
        NonNullable<ReturnType<typeof smartObjectToPsd>>['linkedFile']
      >();
      const buildMask = (l: LayerMeta): PsdLayer['mask'] => {
        const s = surfacesRef.current.get(l.id);
        if (!l.hasMask || !s?.mask) return undefined;
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
        const mask: PsdLayer['mask'] = {
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
        return mask;
      };
      const build = (parentId?: string): PsdLayer[] =>
        layersRef.current
          .filter((l) => l.parentId === parentId)
          .map((l) => {
            if (l.kind === 'group')
              return {
                name: l.name,
                hidden: !l.visible,
                opened: !l.collapsed,
                opacity: l.opacity / 100,
                fillOpacity: portableFillOpacityToPsd(l.fill),
                clipping: l.clipping,
                blendingRanges: blendIfToPsd(l.blendIf),
                blendMode:
                  l.groupIsolation === 'isolated' ? 'normal' : 'pass through',
                mask: buildMask(l),
                children: build(l.id),
              };
            const smartObject = l.smartObject
                ? smartObjectToPsd(l.smartObject, doc.w, doc.h)
                : undefined,
              s = surfacesRef.current.get(l.id)!,
              pixels = makeCanvas(doc.w, doc.h);
            if (smartObject)
              linkedFiles.set(
                smartObject.linkedFile.id,
                smartObject.linkedFile,
              );
            drawLayer(
              pixels.getContext('2d')!,
              {
                ...l,
                opacity: 100,
                blend: 'source-over',
                hasMask: false,
                effects: undefined,
                smartObject: undefined,
              },
              s,
              doc.w,
              doc.h,
            );
            const mask = buildMask(l);
            const layerImage = pixels
              .getContext('2d')!
              .getImageData(0, 0, doc.w, doc.h);
            pixels.width = 1;
            pixels.height = 1;
            return {
              name: l.name,
              hidden: !l.visible,
              opacity: l.opacity / 100,
              fillOpacity: portableFillOpacityToPsd(l.fill),
              clipping: l.clipping,
              blendingRanges: blendIfToPsd(l.blendIf),
              transparencyProtected: l.locked,
              blendMode: (l.blend === 'source-over'
                ? 'normal'
                : l.blend.replaceAll('-', ' ')) as PsdLayer['blendMode'],
              left: 0,
              top: 0,
              imageData: layerImage,
              text: l.textLayer ? portableTextToPsd(l.textLayer) : undefined,
              vectorFill: l.fillLayer
                ? fillRecipeToPsd(l.fillLayer)
                : undefined,
              adjustment:
                l.kind === 'adjustment'
                  ? highDepthToPsdAdjustment(l.precisionAdjustment)
                  : undefined,
              effects: l.effects ? layerEffectsToPsd(l.effects) : undefined,
              placedLayer: smartObject?.placedLayer,
              mask,
            };
          });
      const children = flattened
        ? [{ name: 'Flattened artwork', imageData }]
        : build();
      const buffer = await processPsd<ArrayBuffer>({
        action: 'write',
        psb,
        psd: {
          width: doc.w,
          height: doc.h,
          imageData,
          linkedFiles: flattened ? undefined : [...linkedFiles.values()],
          children,
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
      setSaveLocationHealth(saveLocationStatus(handle.name, 'connected'));
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
      setSaveLocationHealth(saveLocationStatus('Downloads', 'downloads'));
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
        if (workingDepthRef.current !== '8u' && !surface.precision)
          surface.precision = createPrecisionBacking(
            surface,
            workingDepthRef.current as HighWorkingDepth,
          );
        syncPrecisionSurface(surface);
        savedLayers.push({
          ...layer,
          pixels: await canvasPngDataUrl(surface.pixels),
          mask: surface.mask ? await canvasPngDataUrl(surface.mask) : undefined,
          workingPixels: surface.precision
            ? serializeWorkingSurface(surface.precision)
            : undefined,
        });
      }
      const project = {
        format: 'librelayer',
        version: 2,
        createdWith: 'LibreLayer web',
        name: fileName,
        width: doc.w,
        height: doc.h,
        workingDepth: workingDepthRef.current,
        sceneReferred: sceneReferredRef.current,
        colorProfile: colorProfileRef.current,
        colorProfileData: colorProfileDataRef.current
          ? structuredClone(colorProfileDataRef.current)
          : undefined,
        selectedId: selectedRef.current,
        selectedIds: [...selectedIdsRef.current],
        layerComps: layerCompsRef.current,
        zoom,
        view,
        layers: savedLayers,
        paths,
        artboards,
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
      let savedToFolder = false,
        folderFailure = Boolean(directory && folderPermission !== 'granted');
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
          folderFailure = true;
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
          : `${folderFailure ? `${directory?.name ?? 'The remembered folder'} was unavailable; ` : ''}${encrypted ? 'Encrypted' : 'Integrity-protected'} project saved to Downloads — the folder preference was kept for reconnection`,
      );
      if (savedToFolder && directory)
        setSaveLocationHealth(saveLocationStatus(directory.name, 'connected'));
      else if (folderFailure)
        setSaveLocationHealth(
          saveLocationStatus(
            directory?.name ?? saveLocationName,
            'unavailable',
          ),
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
      const projectDepth = normalizeWorkingDepth(data.workingDepth);
      let importedColorProfileData: PortableIccProfile | undefined;
      if (data.colorProfileData !== undefined) {
        importedColorProfileData = registerIccProfile(data.colorProfileData);
        if (importedColorProfileData.id !== data.colorProfile)
          throw Error('The embedded ICC profile does not match the document.');
      }
      if (
        data.colorProfile !== undefined &&
        normalizeColorProfile(data.colorProfile) !== data.colorProfile
      )
        throw Error('Unsupported document color profile');
      if (
        (data.sceneReferred !== undefined &&
          typeof data.sceneReferred !== 'boolean') ||
        (data.sceneReferred === true && projectDepth === '8u')
      )
        throw Error('Invalid project color encoding');
      requireRoom(
        data.width,
        data.height,
        data.width *
          data.height *
          data.layers.reduce(
            (n: number, l: { mask?: string }) =>
              n +
              (l.mask ? 2 : 1) +
              (projectDepth === '8u'
                ? 0
                : workingDepthBytesPerPixel(projectDepth) / 4),
            0,
          ),
      );
      const surfaces = new Map<string, LayerSurface>(),
        metas: LayerMeta[] = [];
      assertAcyclicSmartObjectGraph(
        data.layers.map(
          (item: { smartObject?: SmartObjectData }) => item.smartObject ?? {},
        ),
      );
      for (const item of data.layers as { smartObject?: SmartObjectData }[])
        if (item.smartObject?.embeddedDocument)
          validateEmbeddedDocument(item.smartObject.embeddedDocument);
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
          item.maskOverlay !== undefined &&
          typeof item.maskOverlay !== 'boolean'
        )
          throw Error('Invalid mask overlay');
        if (item.maskTransform !== undefined) {
          const transform = item.maskTransform;
          if (
            !transform ||
            typeof transform !== 'object' ||
            !Number.isFinite(transform.x) ||
            Math.abs(transform.x) > 1_000_000 ||
            !Number.isFinite(transform.y) ||
            Math.abs(transform.y) > 1_000_000 ||
            !Number.isFinite(transform.rotation) ||
            Math.abs(transform.rotation) > 360 ||
            !Number.isFinite(transform.scaleX) ||
            transform.scaleX < 0.01 ||
            transform.scaleX > 100 ||
            !Number.isFinite(transform.scaleY) ||
            transform.scaleY < 0.01 ||
            transform.scaleY > 100
          )
            throw Error('Invalid mask transform');
        }
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
        if (
          item.blendSpace !== undefined &&
          item.blendSpace !== 'gamma' &&
          item.blendSpace !== 'linear'
        )
          throw Error('Invalid layer blend calculation');
        if (
          item.groupIsolation !== undefined &&
          item.groupIsolation !== 'pass-through' &&
          item.groupIsolation !== 'isolated'
        )
          throw Error('Invalid group compositing mode');
        if (
          item.knockout !== undefined &&
          item.knockout !== 'none' &&
          item.knockout !== 'shallow' &&
          item.knockout !== 'deep'
        )
          throw Error('Invalid knockout mode');
        if (item.linkId !== undefined && typeof item.linkId !== 'string')
          throw Error('Invalid layer link');
        if (item.clipping !== undefined && typeof item.clipping !== 'boolean')
          throw Error('Invalid clipping mask');
        if (
          item.effects !== undefined &&
          (!item.effects ||
            typeof item.effects !== 'object' ||
            Array.isArray(item.effects))
        )
          throw Error('Invalid layer effects');
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
        if (
          item.smartObject?.transform !== undefined &&
          !isSmartObjectTransform(item.smartObject.transform)
        )
          throw Error('Invalid Smart Object transform');
        const { pixels, mask, workingPixels, ...rawMeta } = item,
          meta: LayerMeta = {
            ...rawMeta,
            smartObject: rawMeta.smartObject
              ? {
                  ...rawMeta.smartObject,
                  instanceId:
                    rawMeta.smartObject.instanceId ?? crypto.randomUUID(),
                  sourceVersion: rawMeta.smartObject.sourceVersion ?? 1,
                  dependencies: rawMeta.smartObject.dependencies ?? [],
                  transform: rawMeta.smartObject.transform
                    ? normalizeSmartObjectTransform(
                        rawMeta.smartObject.transform,
                      )
                    : undefined,
                  filters: (rawMeta.smartObject.filters ?? []).map(
                    (filter: SmartFilter) => ({
                      ...filter,
                      version: filter.version ?? 1,
                    }),
                  ),
                  linkedStatus:
                    rawMeta.smartObject.kind === 'linked'
                      ? 'missing'
                      : undefined,
                }
              : undefined,
            effects: rawMeta.effects
              ? normalizeLayerEffects(rawMeta.effects)
              : undefined,
          };
        const pixelCanvas = await decode(pixels),
          precision =
            projectDepth === '8u'
              ? undefined
              : deserializeWorkingSurface(
                  workingPixels as StoredWorkingSurface,
                );
        if (
          precision &&
          (precision.depth !== projectDepth ||
            precision.width !== data.width ||
            precision.height !== data.height)
        )
          throw Error('High-depth layer pixels do not match the document.');
        if (projectDepth === '8u' && workingPixels !== undefined)
          throw Error('Unexpected high-depth pixels in an 8-bit document.');
        if (precision) {
          const proxy = pixelCanvas
              .getContext('2d', { willReadFrequently: true })!
              .getImageData(0, 0, data.width, data.height).data,
            expected = workingSurfaceToRgba8(precision);
          if (proxy.length !== expected.length)
            throw Error('High-depth display proxy has the wrong size.');
          for (let index = 0; index < proxy.length; index++)
            if (proxy[index] !== expected[index])
              throw Error(
                'High-depth display proxy does not match its backing pixels.',
              );
        }
        surfaces.set(meta.id, {
          pixels: pixelCanvas,
          mask: mask ? await decode(mask) : undefined,
          precision,
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
      const validAnchors = (anchors: unknown): anchors is BezierAnchor[] =>
        Array.isArray(anchors) &&
        anchors.length <= 10000 &&
        anchors.every(
          (anchor) =>
            anchor &&
            Number.isFinite(anchor.x) &&
            Number.isFinite(anchor.y) &&
            (anchor.kind === 'corner' || anchor.kind === 'smooth') &&
            [anchor.incoming, anchor.outgoing].every(
              (handle) =>
                handle === undefined ||
                (Number.isFinite(handle.x) && Number.isFinite(handle.y)),
            ),
        );
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
              anchors:
                validAnchors(path.anchors) &&
                path.anchors.length === path.points.length
                  ? structuredClone(path.anchors)
                  : anchorsFromPoints(
                      path.points,
                      path.curved === true,
                      path.tension,
                    ),
              closed: path.closed !== false,
              curved: path.curved === true,
              tension: Number.isFinite(path.tension) ? path.tension : 50,
              stroke: normalizePathStroke(path.stroke),
            }))
        : [];
      const importedArtboards = Array.isArray(data.artboards)
        ? data.artboards
            .filter((item: unknown) => item && typeof item === 'object')
            .slice(0, 256)
            .map((item: Partial<Artboard>) =>
              normalizeArtboard(item, data.width, data.height),
            )
        : [];
      loadImportedDocument(
        typeof data.name === 'string' ? data.name : file.name,
        data.width,
        data.height,
        metas,
        surfaces,
        'Open layered project',
        restore,
        undefined,
        undefined,
        projectDepth,
        data.sceneReferred === true,
        normalizeColorProfile(data.colorProfile),
        importedColorProfileData,
      );
      setPaths(importedPaths);
      setArtboards(importedArtboards);
      setActiveArtboardId(importedArtboards[0]?.id ?? '');
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
        makePathSelection({
          id: 'imported-selection',
          name: 'Imported selection',
          points: data.selectionPath,
          closed: true,
        });
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
        (restore
          ? 'Workspace restored from this browser profile'
          : unpacked.encrypted
            ? 'Encrypted project unlocked locally — layers and masks restored'
            : unpacked.verified
              ? 'Layered project reopened — integrity verified; layers, masks, paths and comps restored'
              : 'Legacy layered project reopened — save it again to add integrity protection') +
          ' · ' +
          WORKING_DEPTH_LABELS[projectDepth],
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
      maskOverlay: false,
      maskTransform: defaultMaskTransform(),
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
    if (meta.kind === 'fill' && meta.fillLayer) {
      const renderedFill = nativeFillCanvas(meta.fillLayer, doc.w, doc.h),
        fillContext = surface.pixels.getContext('2d')!;
      fillContext.clearRect(0, 0, doc.w, doc.h);
      fillContext.drawImage(renderedFill, 0, 0);
      renderedFill.width = renderedFill.height = 1;
    }
    const ctx = surface.pixels.getContext('2d')!;
    let alpha =
      meta.maskLinked === false
        ? positionedMaskAlpha(
            surface.mask,
            meta.maskDensity,
            meta.maskFeather,
            meta.maskTransform,
            doc.w,
            doc.h,
          )
        : maskToAlpha(surface.mask, meta.maskDensity, meta.maskFeather);
    if (meta.maskLinked === false) {
      const local = makeCanvas(doc.w, doc.h),
        localContext = local.getContext('2d')!;
      localContext.translate(doc.w / 2, doc.h / 2);
      localContext.scale(1 / (meta.scaleX || 1), 1 / (meta.scaleY || 1));
      localContext.rotate((-(meta.rotation ?? 0) * Math.PI) / 180);
      localContext.translate(-meta.x - doc.w / 2, -meta.y - doc.h / 2);
      localContext.drawImage(alpha, 0, 0);
      alpha.width = alpha.height = 1;
      alpha = local;
    }
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
      maskOverlay: false,
      maskTransform: defaultMaskTransform(),
      ...(meta.kind === 'fill'
        ? { kind: 'pixel' as const, fillLayer: undefined }
        : {}),
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
  const addArtboard = (fromSelection = false) => {
    const bounds = fromSelection ? selectionRef.current : null,
      next = normalizeArtboard(
        {
          id: crypto.randomUUID(),
          name: `Artboard ${artboards.length + 1}`,
          x: bounds?.x ?? 0,
          y: bounds?.y ?? 0,
          w: bounds?.w ?? doc.w,
          h: bounds?.h ?? doc.h,
          background: '#ffffff',
          exportEnabled: true,
        },
        doc.w,
        doc.h,
      );
    setArtboards((items) => [...items, next]);
    setActiveArtboardId(next.id);
    setShowArtboards(true);
    setTimeout(() => snapshot('Add artboard'), 0);
    setStatus(
      `${next.name} created${bounds ? ' from the active selection' : ' from the canvas'}`,
    );
  };
  const updateArtboard = (id: string, patch: Partial<Artboard>) => {
    setArtboards((items) =>
      items.map((artboard) =>
        artboard.id === id
          ? normalizeArtboard({ ...artboard, ...patch }, doc.w, doc.h)
          : artboard,
      ),
    );
    setTimeout(() => snapshot('Edit artboard'), 0);
    setSaved(false);
  };
  const removeArtboard = (id: string) => {
    setArtboards((items) => items.filter((artboard) => artboard.id !== id));
    if (activeArtboardId === id) setActiveArtboardId('');
    setTimeout(() => snapshot('Delete artboard'), 0);
    setStatus('Artboard deleted');
  };
  const addFrameToSelected = (shape: FrameRecipe['shape']) => {
    const layer = selected(),
      bounds = selectionRef.current ?? {
        x: Math.round(doc.w * 0.1),
        y: Math.round(doc.h * 0.1),
        w: Math.round(doc.w * 0.8),
        h: Math.round(doc.h * 0.8),
      };
    if (
      !layer ||
      layer.kind === 'group' ||
      layer.kind === 'adjustment' ||
      isLocked(layer.id)
    ) {
      setStatus('Select an unlocked visual layer before adding a frame');
      return;
    }
    patchLayer(
      layer.id,
      { frame: normalizeFrame({ ...bounds, shape, radius: 24 }, doc.w, doc.h) },
      'Add frame',
    );
    setStatus(
      `${shape === 'ellipse' ? 'Elliptical' : 'Rectangular'} frame clips ${layer.name} nondestructively`,
    );
  };
  const smartSpaceSelected = (axis: 'horizontal' | 'vertical') => {
    const items = selectedRoots()
      .filter((layer) => layer.kind !== 'group' && layer.kind !== 'adjustment')
      .map((layer) => ({ layer, bounds: layerBounds(layer) }))
      .filter((item) => item.bounds) as {
      layer: LayerMeta;
      bounds: NonNullable<ReturnType<typeof layerBounds>>;
    }[];
    if (items.length < 3 || !permit(items.map((item) => item.layer.id))) {
      setStatus(
        'Select at least three unlocked visual layers for smart spacing',
      );
      return;
    }
    const moves = smartSpacingMoves(
        items.map((item) => ({ id: item.layer.id, bounds: item.bounds })),
        axis,
      ),
      key = axis === 'horizontal' ? 'x' : 'y';
    syncLayers(
      layersRef.current.map((layer) =>
        moves.has(layer.id)
          ? { ...layer, [key]: layer[key] + moves.get(layer.id)! }
          : layer,
      ),
    );
    snapshot('Smart space layers');
    render();
    setStatus(
      `Selected layer edge gaps spaced evenly ${axis === 'horizontal' ? 'horizontally' : 'vertically'}`,
    );
  };
  const exportArtboardAssets = async () => {
    const plan = multiScaleExportPlan(artboards, assetScales);
    if (!plan.length) {
      setStatus('Enable an artboard and at least one export scale first');
      return;
    }
    const source = makeCanvas(doc.w, doc.h);
    renderLayers(source.getContext('2d')!);
    setStatus(`Preparing ${plan.length} artboard assets locally…`);
    for (const item of plan) {
      const artboard = artboards.find(
        (candidate) => candidate.id === item.artboardId,
      )!;
      const output = makeCanvas(item.width, item.height),
        context = output.getContext('2d')!;
      context.fillStyle = artboard.background;
      context.fillRect(0, 0, output.width, output.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(
        source,
        artboard.x,
        artboard.y,
        artboard.w,
        artboard.h,
        0,
        0,
        output.width,
        output.height,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        output.toBlob(
          (value) =>
            value ? resolve(value) : reject(Error('Asset encoding failed')),
          'image/png',
        ),
      );
      downloadBlob(item.name, blob);
      output.width = output.height = 1;
    }
    source.width = source.height = 1;
    setStatus(
      `Exported ${plan.length} artboard assets at ${assetScales.join('×, ')}×`,
    );
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
  const stackSourcesForLayers = (items: LayerMeta[]) => {
    const canvases = items.map((layer) => {
        const canvas = makeCanvas(doc.w, doc.h);
        renderLayers(
          canvas.getContext('2d')!,
          [layer],
          surfacesRef.current,
          doc,
        );
        return canvas;
      }),
      sources = canvases.map(
        (canvas) =>
          canvas
            .getContext('2d', { willReadFrequently: true })!
            .getImageData(0, 0, doc.w, doc.h).data,
      );
    canvases.forEach((canvas) => {
      canvas.width = canvas.height = 1;
    });
    return sources;
  };
  const autoAlign = async () => {
    const roots = selectedRoots().filter(
        (l) => l.kind !== 'group' && l.kind !== 'adjustment',
      ),
      anchor = roots.find((l) => l.id === selectedRef.current) ?? roots[0],
      items = anchor
        ? [anchor, ...roots.filter((layer) => layer.id !== anchor.id)]
        : roots,
      controller = new AbortController(),
      jobId = crypto.randomUUID();
    if (items.length < 2 || !anchor || !permit(items.map((l) => l.id))) {
      setStatus('Select at least two unlocked pixel layers to auto-align.');
      return;
    }
    activeJobAbort.current?.abort();
    activeJobAbort.current = controller;
    setActiveJob({ id: jobId, label: 'Auto-align layers', progress: 0 });
    setStatus('Analyzing image overlap in a background worker…');
    try {
      const result = await runStackJob(
        'align',
        stackSourcesForLayers(items),
        doc.w,
        doc.h,
        {
          signal: controller.signal,
          onProgress: (progress) =>
            setActiveJob((current) =>
              current?.id === jobId ? { ...current, progress } : current,
            ),
        },
      );
      if (result.kind !== 'aligned')
        throw Error('Alignment result was invalid.');
      const moves = new Map(
        items.map((layer, index) => [layer.id, result.translations[index]]),
      );
      syncLayers(
        layersRef.current.map((layer) => {
          const move = moves.get(layer.id);
          return move && layer.id !== anchor.id
            ? { ...layer, x: layer.x + move.x, y: layer.y + move.y }
            : layer;
        }),
      );
      snapshot('Auto-align layers');
      render();
      setStatus(`${items.length} layers aligned by image-content correlation`);
    } catch (error) {
      setStatus(
        error instanceof JobCancelledError
          ? 'Auto-align cancelled; layer positions were not changed'
          : error instanceof Error
            ? error.message
            : 'The layers could not be aligned.',
      );
    } finally {
      if (activeJobAbort.current === controller) activeJobAbort.current = null;
      setActiveJob((current) => (current?.id === jobId ? null : current));
    }
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
      const image = await decodeCameraRaw(
        file,
        defaultRawDevelopSettings.decode,
      );
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
  const redecodeRaw = async (
    decode: RawDecodeSettings,
    replacement?: RawDevelopSettings,
  ) => {
    if (!rawDevelop || rawDecodeBusy) return false;
    const revision = ++rawDecodeRevision.current;
    setRawDecodeBusy(true);
    setStatus('Reprocessing the retained RAW sensor data…');
    try {
      const file =
        rawDevelop.sourceFile ??
        (rawDevelop.assetId ? await loadRawAsset(rawDevelop.assetId) : null);
      if (!file)
        throw Error(
          'The original RAW file is required to change demosaic, white balance, or camera profile.',
        );
      const image = await decodeCameraRaw(file, decode);
      if (revision !== rawDecodeRevision.current) return false;
      setRawSettings((current) => replacement ?? { ...current, decode });
      setRawDevelop((current) =>
        current ? { ...current, image, sourceFile: file } : null,
      );
      setStatus('RAW decode recipe updated with a fresh live preview');
      return true;
    } catch (error) {
      if (revision !== rawDecodeRevision.current) return false;
      setPsdError(
        error instanceof Error
          ? error.message
          : 'The RAW sensor data could not be reprocessed.',
      );
    } finally {
      if (revision === rawDecodeRevision.current) setRawDecodeBusy(false);
    }
    return false;
  };
  const resetRawDevelop = () => {
    const next = {
      ...defaultRawDevelopSettings,
      decode: defaultRawDecodeSettings(),
    };
    if (
      JSON.stringify(rawSettings.decode ?? defaultRawDecodeSettings()) !==
      JSON.stringify(next.decode)
    ) {
      void redecodeRaw(next.decode, next);
      return;
    }
    setRawSettings(next);
  };
  const exportRawRecipe = () => {
    if (!rawDevelop) return;
    const baseName = rawDevelop.name.replace(/\.[^.]+$/, '') || 'camera-raw';
    downloadBlob(
      `${baseName}.libreRAW.json`,
      new Blob(
        [
          serializeRawRecipeSidecar(
            createRawRecipeSidecar(rawSettings, {
              camera: rawDevelop.image.camera,
              lens: rawDevelop.image.lens,
            }),
          ),
        ],
        { type: 'application/json' },
      ),
    );
    setStatus('Portable Camera Raw recipe downloaded');
  };
  const importRawRecipe = async (file?: File) => {
    if (!file || !rawDevelop || rawDecodeBusy) return;
    try {
      const recipe = parseRawRecipeSidecar(await file.text());
      const decode =
        recipe.settings.decode ?? defaultRawDevelopSettings.decode!;
      const sourceDecode =
        rawSettings.decode ?? defaultRawDevelopSettings.decode!;
      const changedDecode =
        JSON.stringify(decode) !== JSON.stringify(sourceDecode);
      if (changedDecode) {
        void redecodeRaw(decode, recipe.settings);
        return;
      }
      setRawSettings(recipe.settings);
      setStatus('Portable Camera Raw recipe applied');
    } catch (error) {
      setPsdError(
        error instanceof Error
          ? error.message
          : 'The RAW recipe could not be imported.',
      );
    } finally {
      if (rawRecipeFileRef.current) rawRecipeFileRef.current.value = '';
    }
  };
  const runRawBatchDevelop = async (files?: FileList | null) => {
    if (!files?.length || rawDecodeBusy || rawBatchRunning) return;
    rawBatchCancel.current = false;
    const sourceFiles = Array.from(files);
    setRawBatchRunning(true);
    try {
      const result = await runRawBatch(
        sourceFiles.map((file) => ({ name: file.name, source: file })),
        {
          shouldCancel: () => rawBatchCancel.current,
          decode: (file) => decodeCameraRaw(file, rawSettings.decode),
          render: (image) => {
            const developed = developRawRgba(image, rawSettings);
            const canvas = makeCanvas(developed.width, developed.height);
            canvas
              .getContext('2d')!
              .putImageData(
                new ImageData(
                  developed.data,
                  developed.width,
                  developed.height,
                ),
                0,
                0,
              );
            return canvas;
          },
          write: async (canvas, name) => {
            const blob = await new Promise<Blob>((resolve, reject) =>
              canvas.toBlob((value) => {
                if (value) resolve(value);
                else reject(Error('The developed image could not be encoded.'));
              }, 'image/png'),
            );
            const baseName = name.replace(/\.[^.]+$/, '') || 'developed';
            downloadBlob(`${baseName}-LibreLayer.png`, blob);
            canvas.width = canvas.height = 1;
          },
          onProgress: (progress) =>
            setStatus(
              `RAW batch ${progress.completed}/${progress.total} · ${progress.state} ${progress.name}`,
            ),
        },
      );
      setStatus(
        result.cancelled
          ? `RAW batch stopped after ${result.completed} file${result.completed === 1 ? '' : 's'}`
          : result.failures.length
            ? `RAW batch finished: ${result.completed} complete, ${result.failures.length} failed`
            : `RAW batch finished: ${result.completed} file${result.completed === 1 ? '' : 's'} developed locally`,
      );
    } finally {
      rawBatchCancel.current = false;
      setRawBatchRunning(false);
      if (rawBatchFileRef.current) rawBatchFileRef.current.value = '';
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
        instanceId: target?.smartObject?.instanceId ?? crypto.randomUUID(),
        sourceVersion: (target?.smartObject?.sourceVersion ?? 0) + 1,
        dependencies: target?.smartObject?.dependencies ?? [],
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
      const remover = await backgroundRemovalModel();
      setStatus('AI is isolating the subject…');
      const output = await remover(surface.pixels.toDataURL('image/png'));
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
      const selector = await backgroundRemovalModel(),
        output = await selector(surface.pixels.toDataURL('image/png'));
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
      const audit = await auditRecoveryStorage();
      setRecoveries(audit.records);
      setRecoveryIssues(audit.issues);
      if (audit.issues.length)
        setRecoveryStatus(
          `${audit.issues.length} damaged recovery ${audit.issues.length === 1 ? 'copy needs' : 'copies need'} attention`,
        );
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
  const installedFilterPlugin = () => {
    const saved = localStorage.getItem('pixel-studio-filter-plugin');
    if (!saved) return null;
    return validateFilterPlugin(JSON.parse(saved));
  };
  const applyPluginFilterManifest = async (
    plugin: FilterPluginManifest,
    amount = 100,
  ) => {
    const target = targetContext();
    if (!target || editing === 'mask') {
      setStatus('Select an unlocked pixel layer first');
      return false;
    }
    const canvas = target.ctx.canvas,
      context = canvas.getContext('2d', { willReadFrequently: true })!,
      image = context.getImageData(0, 0, canvas.width, canvas.height),
      original = makeCanvas(canvas.width, canvas.height);
    original.getContext('2d')!.putImageData(image, 0, 0);
    activeJobAbort.current?.abort();
    const controller = new AbortController(),
      jobId = crypto.randomUUID();
    activeJobAbort.current = controller;
    setActiveJob({ id: jobId, label: plugin.name, progress: 0 });
    try {
      localStorage.setItem(
        'librelayer-active-job',
        JSON.stringify({ id: jobId, label: plugin.name, started: Date.now() }),
      );
    } catch {
      // The worker remains cancelable even when the browser blocks the journal.
    }
    let scratchName: string | null = null,
      scratchDirectory: LocalDirectoryHandle | null = null;
    const scratchLocation: ScratchLocation =
      preferences.scratchLocation ?? 'browser';
    if (image.data.byteLength >= 4 * 1048576) {
      try {
        scratchDirectory =
          scratchLocation === 'save-folder'
            ? await getDefaultSaveDirectory()
            : null;
        scratchName = await writeScratch(
          jobId,
          new Blob([image.data.slice().buffer]),
          {
            location: scratchLocation,
            quotaMb: normalizeScratchQuota(preferences.scratchQuotaMb),
            saveDirectory: scratchDirectory,
          },
        );
        void refreshScratchStatus();
      } catch (error) {
        setRecoveryStatus(
          `${error instanceof Error ? error.message : 'Scratch storage is unavailable'} The filter will continue safely in memory.`,
        );
      }
    }
    setStatus(`Running ${plugin.name} locally…`);
    try {
      const result = await runFilterPluginJob(
        plugin,
        image.data,
        image.width,
        image.height,
        {
          amount,
          signal: controller.signal,
          timeoutMs: 30000,
          onProgress: (progress) =>
            setActiveJob((current) =>
              current?.id === jobId ? { ...current, progress } : current,
            ),
        },
      );
      context.putImageData(
        new ImageData(
          Uint8ClampedArray.from(result.pixels),
          image.width,
          image.height,
        ),
        0,
        0,
      );
      if (selectionRef.current) {
        const processed = makeCanvas(canvas.width, canvas.height),
          mask = selectionMask(doc.w, doc.h, 0, 0),
          processedContext = processed.getContext('2d')!;
        processedContext.drawImage(canvas, 0, 0);
        processedContext.globalCompositeOperation = 'destination-in';
        processedContext.drawImage(mask, 0, 0);
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(original, 0, 0);
        context.drawImage(processed, 0, 0);
        processed.width = processed.height = mask.width = mask.height = 1;
      }
      snapshot(plugin.name);
      render();
      setStatus(
        `${plugin.name} applied with the ${result.backend === 'wasm' ? 'WebAssembly' : 'CPU'} engine${result.warning ? ' · WebAssembly unavailable, safe fallback used' : ''}`,
      );
      return true;
    } catch (error) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(original, 0, 0);
      setStatus(
        error instanceof JobCancelledError
          ? `${plugin.name} cancelled · no pixels were changed`
          : error instanceof JobWatchdogError
            ? `${plugin.name} stopped by the safety watchdog · no pixels were changed`
            : error instanceof Error
              ? error.message
              : 'The filter plug-in failed safely',
      );
      return false;
    } finally {
      if (scratchName) {
        try {
          await deleteScratch(scratchName, scratchLocation, scratchDirectory);
          void refreshScratchStatus();
        } catch {
          setRecoveryStatus(
            'A temporary scratch file remains and can be removed in Workspace settings',
          );
        }
      }
      original.width = original.height = 1;
      if (activeJobAbort.current === controller) activeJobAbort.current = null;
      setActiveJob((current) => (current?.id === jobId ? null : current));
      try {
        const journal = JSON.parse(
          localStorage.getItem('librelayer-active-job') || 'null',
        ) as { id?: string } | null;
        if (journal?.id === jobId)
          localStorage.removeItem('librelayer-active-job');
      } catch {
        localStorage.removeItem('librelayer-active-job');
      }
    }
  };
  const applyInstalledFilterPlugin = async (amount = 100) => {
    try {
      const installed = installedFilterPlugin();
      if (!installed) {
        setStatus('Load a LibreLayer filter plug-in first');
        return;
      }
      await applyPluginFilterManifest(installed, amount);
    } catch {
      localStorage.removeItem('pixel-studio-filter-plugin');
      setStatus(
        'The installed filter plug-in was invalid and has been removed',
      );
    }
  };
  const loadFilterPlugin = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 1_500_000)
        throw new Error('Filter plug-ins must be 1.5 MB or smaller.');
      const plugin = validateFilterPlugin(JSON.parse(await file.text()));
      localStorage.setItem(
        'pixel-studio-filter-plugin',
        JSON.stringify(plugin),
      );
      setStatus(`${plugin.name} ${plugin.pluginVersion} installed locally`);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'The filter plug-in is invalid',
      );
    } finally {
      if (filterPluginFileRef.current) filterPluginFileRef.current.value = '';
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
            d.workingDepth ?? '8u',
            d.sceneReferred ? 1 : 0,
            normalizeColorProfile(d.colorProfile),
            d.colorProfileData?.sourceSha256 ?? '',
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
          const documentDepth = d.workingDepth ?? '8u';
          if (documentDepth !== '8u' && !surface.precision)
            surface.precision = createPrecisionBacking(
              surface,
              documentDepth as HighWorkingDepth,
            );
          syncPrecisionSurface(surface);
          savedLayers.push({
            ...layer,
            pixels: await canvasPngDataUrl(surface.pixels),
            mask: surface.mask
              ? await canvasPngDataUrl(surface.mask)
              : undefined,
            workingPixels: surface.precision
              ? serializeWorkingSurface(surface.precision)
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
          workingDepth: d.workingDepth ?? '8u',
          sceneReferred: d.sceneReferred === true,
          colorProfile: normalizeColorProfile(d.colorProfile),
          colorProfileData: d.colorProfileData
            ? structuredClone(d.colorProfileData)
            : undefined,
          selectedId: d.selectedId,
          selectedIds: d.selectedIds,
          layerComps: d.layerComps,
          zoom: d.zoom,
          view: d.view,
          layers: savedLayers,
          paths: d.paths ?? [],
          artboards: d.artboards ?? [],
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
          await saveVersion(
            {
              id: `${d.id}:${now}`,
              documentId: d.id,
              name: d.name,
              updated: now,
              reason: manual ? 'manual' : 'autosave',
              json,
            },
            normalizeVersionRetention(preferences.versionRetention),
          );
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

  const applyDistortionWorkspace = (result: DistortionWorkspaceResult) => {
    const workspace = distortionWorkspace,
      meta = workspace
        ? layersRef.current.find((layer) => layer.id === workspace.layerId)
        : undefined,
      surface = workspace
        ? surfacesRef.current.get(workspace.layerId)
        : undefined;
    if (
      !workspace ||
      !meta ||
      !surface ||
      (meta.kind !== undefined && meta.kind !== 'pixel') ||
      meta.textLayer ||
      meta.smartObject
    ) {
      setStatus('The workspace layer is no longer available');
      setDistortionWorkspace(null);
      return;
    }
    try {
      const context = surface.pixels.getContext('2d', {
          willReadFrequently: true,
        })!,
        source = context.getImageData(0, 0, doc.w, doc.h),
        output =
          result.kind === 'liquify'
            ? renderLiquifyPixels(source.data, result.mesh)
            : remapProjectionPixels(
                source.data,
                doc.w,
                doc.h,
                result.kind === 'wide-angle'
                  ? createWideAngleMapper(doc.w, doc.h, result.recipe)
                  : createVanishingPointMapper(doc.w, doc.h, result.recipe),
              ),
        rendered = new ImageData(output, doc.w, doc.h);
      if (selectionRef.current) {
        const processed = makeCanvas(doc.w, doc.h),
          processedContext = processed.getContext('2d')!;
        processedContext.putImageData(rendered, 0, 0);
        const mask = selectionMask(doc.w, doc.h, 0, 0);
        processedContext.globalCompositeOperation = 'destination-in';
        processedContext.drawImage(mask, 0, 0);
        context.putImageData(source, 0, 0);
        context.drawImage(processed, 0, 0);
        processed.width = processed.height = mask.width = mask.height = 1;
      } else context.putImageData(rendered, 0, 0);
      const label =
        result.kind === 'liquify'
          ? 'Liquify'
          : result.kind === 'wide-angle'
            ? 'Adaptive Wide Angle'
            : 'Vanishing Point';
      snapshot(label);
      render();
      setStatus(
        `${label} applied${selectionRef.current ? ' inside the selection' : ''}`,
      );
      setDistortionWorkspace(null);
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'The distortion could not be applied',
      );
    }
  };

  const openPrintStudio = () => {
    persistActiveDocument();
    const documents = [...documentStoreRef.current.values()].sort((a, b) =>
        a.id === activeDocumentRef.current
          ? -1
          : b.id === activeDocumentRef.current
            ? 1
            : 0,
      ),
      nextSources = documents.map((document) => {
        const full = makeCanvas(document.doc.w, document.doc.h);
        renderLayers(
          full.getContext('2d')!,
          document.layers,
          document.surfaces,
          document.doc,
        );
        const scale = Math.min(1, 4096 / Math.max(full.width, full.height)),
          output =
            scale === 1
              ? full
              : makeCanvas(
                  Math.max(1, Math.round(full.width * scale)),
                  Math.max(1, Math.round(full.height * scale)),
                );
        if (output !== full) {
          output
            .getContext('2d')!
            .drawImage(full, 0, 0, output.width, output.height);
          full.width = full.height = 1;
        }
        return { name: document.name, canvas: output };
      });
    setPrintSources(nextSources);
    setPrintStudioOpen(true);
    setProSuiteOpen(false);
    setStatus('Print Studio opened with measured paper preview');
  };

  const runProFeature = async (
    feature: SuiteFeature,
    options: SuiteOptions,
  ) => {
    if (
      ['liquify', 'wide-angle', 'vanishing-point'].includes(feature.command)
    ) {
      const meta = selected();
      if (
        !meta ||
        (meta.kind !== undefined && meta.kind !== 'pixel') ||
        meta.textLayer ||
        meta.smartObject ||
        editing === 'mask'
      ) {
        setStatus('Select an unlocked pixel layer first');
        return;
      }
      if (!permit([meta.id])) return;
      setDistortionWorkspace({
        kind: feature.command as DistortionWorkspaceKind,
        layerId: meta.id,
      });
      setProSuiteOpen(false);
      setStatus(`${feature.label} workspace opened`);
      return;
    }
    const download = (name: string, blob: Blob) => {
      const url = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const openComposite = (suffix: string, source?: HTMLCanvasElement) => {
      const width = source?.width ?? doc.w,
        height = source?.height ?? doc.h,
        canvas = makeCanvas(width, height);
      if (source) canvas.getContext('2d')!.drawImage(source, 0, 0);
      else renderLayers(canvas.getContext('2d')!);
      const id = crypto.randomUUID();
      loadImportedDocument(
        `${fileName} — ${suffix}`,
        width,
        height,
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
        addArtboard(options.secondary >= 50 && Boolean(selectionRef.current));
        setStatus('Editable artboard added to the current document');
        return;
      }
      if (feature.command === 'frame') {
        addFrameToSelected(options.secondary >= 50 ? 'ellipse' : 'rectangle');
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
        const s = selectionRef.current,
          x = Math.round(s?.x ?? 0),
          y = Math.round(s?.y ?? 0),
          w = Math.max(1, Math.round(s?.w ?? doc.w)),
          h = Math.max(1, Math.round(s?.h ?? doc.h)),
          mask = s ? selectionMask(doc.w, doc.h, 0, 0) : undefined;
        clipboardRef.current = copyRenderedRegion(
          layersRef.current,
          surfacesRef.current,
          x,
          y,
          w,
          h,
          mask,
        );
        if (mask) mask.width = mask.height = 1;
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
        if (workingDepthRef.current !== '8u') {
          const source = clip.precision
            ? convertWorkingSurface(
                clip.precision,
                workingDepthRef.current as HighWorkingDepth,
              )
            : createPrecisionBacking(
                { pixels: clip.pixels },
                workingDepthRef.current as HighWorkingDepth,
              );
          surface.precision = placeWorkingSurface(
            source,
            doc.w,
            doc.h,
            clip.x,
            clip.y,
          );
        }
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
        const transform = normalizeMaskTransform(meta.maskTransform);
        patchLayer(
          meta.id,
          {
            maskLinked: false,
            maskTransform: normalizeMaskTransform({
              ...transform,
              x: transform.x + Math.round((options.amount - 50) * 2),
              y: transform.y + Math.round((options.secondary - 50) * 2),
            }),
          },
          'Move mask independently',
        );
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
        setCloneMode('pattern');
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
        setBrushSymmetry(options.secondary >= 50 ? 'radial' : 'vertical');
        if (options.secondary >= 50)
          setRadialSymmetryCount(
            Math.max(2, Math.min(16, Math.round(options.amount / 8))),
          );
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
        activateHistoryBrush(options.secondary >= 50);
        return;
      }
      if (feature.command === 'actions') {
        setStatus('Use the Actions workspace to record and play editable sets');
        return;
      }
      if (
        feature.command === 'batch' ||
        feature.command === 'image-processor'
      ) {
        setStatus(
          'Use Image Processor to apply a saved action to selected local files',
        );
        return;
      }
      if (feature.command === 'scripts-plugins') {
        setStatus(
          'Use Local plug-in studio for permission-gated panels, filters, and exporters',
        );
        return;
      }
      if (feature.command === 'variables') {
        let dataRecords:
          | {
              __librelayerDataRecords: true;
              records: { name: string; values: DataRecord }[];
            }
          | undefined;
        try {
          const value = JSON.parse(options.text) as Partial<{
            __librelayerDataRecords: true;
            records: { name: string; values: DataRecord }[];
          }>;
          if (
            value.__librelayerDataRecords === true &&
            Array.isArray(value.records) &&
            value.records.length >= 1 &&
            value.records.length <= 25 &&
            value.records.every(
              (record) =>
                record &&
                typeof record.name === 'string' &&
                record.values &&
                typeof record.values === 'object' &&
                !Array.isArray(record.values),
            )
          )
            dataRecords = value as typeof dataRecords;
        } catch {
          dataRecords = undefined;
        }
        if (dataRecords) {
          const sourceLayers = layersRef.current,
            sourceSurfaces = surfacesRef.current,
            roots = sourceLayers
              .filter((layer) => !layer.parentId)
              .map((layer) => layer.id),
            firstRecord = dataRecords.records[0].values;
          if (
            !sourceLayers.some(
              (layer) =>
                layer.textLayer &&
                substituteDataVariables(
                  layer.textLayer.content,
                  firstRecord,
                ) !== layer.textLayer.content,
            )
          )
            throw Error(
              'No editable text layer contains a matching {{column}} variable.',
            );
          persistActiveDocument();
          let substitutions = 0;
          for (const dataRecord of dataRecords.records) {
            const plan = planLayerTransfer(sourceLayers, roots, () =>
                crypto.randomUUID(),
              ),
              nextSurfaces = new Map<string, LayerSurface>();
            for (const [sourceId, nextId] of plan.idMap) {
              const source = sourceSurfaces.get(sourceId);
              if (!source) throw Error('A source layer is missing its pixels.');
              const pixels = makeCanvas(
                source.pixels.width,
                source.pixels.height,
              );
              pixels.getContext('2d')!.drawImage(source.pixels, 0, 0);
              let mask: HTMLCanvasElement | undefined;
              if (source.mask) {
                mask = makeCanvas(source.mask.width, source.mask.height);
                mask.getContext('2d')!.drawImage(source.mask, 0, 0);
              }
              nextSurfaces.set(nextId, { pixels, mask });
            }
            const nextLayers = plan.layers.map((layer) => {
              if (!layer.textLayer) return layer;
              const content = substituteDataVariables(
                layer.textLayer.content,
                dataRecord.values,
              );
              if (content === layer.textLayer.content) return layer;
              substitutions++;
              const next = {
                  ...layer,
                  textLayer: { ...layer.textLayer, content },
                },
                surface = nextSurfaces.get(layer.id)!;
              surface.pixels.getContext('2d')!.clearRect(0, 0, doc.w, doc.h);
              drawEditableText(
                surface.pixels,
                next.textLayer,
                paths.find((path) => path.id === next.textLayer.pathId)?.points,
              );
              return next;
            });
            loadImportedDocument(
              `${fileName} — ${dataRecord.name}`,
              doc.w,
              doc.h,
              nextLayers,
              nextSurfaces,
              'Generate data variant',
              { id: crypto.randomUUID(), saved: false, skipPersist: true },
              undefined,
              {
                paths,
                artboards,
                layerComps: layerComps.map((comp) => ({
                  ...comp,
                  states: comp.states.map((state) => ({
                    ...state,
                    id: plan.idMap.get(state.id) ?? state.id,
                  })),
                })),
                savedSelections,
                feather,
              },
            );
          }
          setStatus(
            `${dataRecords.records.length} editable data variant${dataRecords.records.length === 1 ? '' : 's'} generated with ${substitutions} text substitution${substitutions === 1 ? '' : 's'}`,
          );
          return;
        }
        const meta = selected();
        if (!meta?.textLayer) {
          setStatus('Select an editable text layer first');
          return;
        }
        const next = {
          ...meta.textLayer,
          content: options.text || meta.textLayer.content,
        };
        drawEditableText(
          surfacesRef.current.get(meta.id)!.pixels,
          next,
          paths.find((path) => path.id === next.pathId)?.points,
        );
        patchLayer(meta.id, { textLayer: next }, 'Apply text variable');
        render();
        setStatus('Data variable applied to the selected text layer');
        return;
      }
      if (feature.command === 'export-layers') {
        const layerItems = layersRef.current.filter(
            (layer) => layer.kind !== 'group' && layer.kind !== 'adjustment',
          ),
          artboardPlan = multiScaleExportPlan(artboards, assetScales),
          taskCount = layerItems.length + artboardPlan.length;
        if (!taskCount) {
          setStatus(
            'Create a visual layer or enabled artboard before exporting.',
          );
          return;
        }
        const controller = new AbortController(),
          jobId = crypto.randomUUID(),
          entries: ZipEntry[] = [],
          toBlob = (canvas: HTMLCanvasElement) =>
            new Promise<Blob>((resolve, reject) =>
              canvas.toBlob(
                (blob) =>
                  blob ? resolve(blob) : reject(Error('PNG encoding failed.')),
                'image/png',
              ),
            );
        activeJobAbort.current?.abort();
        activeJobAbort.current = controller;
        setActiveJob({
          id: jobId,
          label: 'Export layers and artboards',
          progress: 0,
        });
        try {
          let completed = 0;
          for (const [index, meta] of layerItems.entries()) {
            if (controller.signal.aborted) throw new JobCancelledError();
            const bounds = layerBounds(meta);
            if (bounds) {
              const left = Math.max(0, Math.floor(bounds.left)),
                top = Math.max(0, Math.floor(bounds.top)),
                right = Math.min(doc.w, Math.ceil(bounds.right)),
                bottom = Math.min(doc.h, Math.ceil(bounds.bottom));
              if (right > left && bottom > top) {
                const full = makeCanvas(doc.w, doc.h),
                  output = makeCanvas(right - left, bottom - top);
                renderLayers(
                  full.getContext('2d')!,
                  [{ ...meta, visible: true }],
                  surfacesRef.current,
                  doc,
                );
                output
                  .getContext('2d')!
                  .drawImage(
                    full,
                    left,
                    top,
                    right - left,
                    bottom - top,
                    0,
                    0,
                    right - left,
                    bottom - top,
                  );
                entries.push({
                  name: `layers/${String(index + 1).padStart(3, '0')}-${meta.name.replace(/[^a-z0-9_-]+/gi, '-') || 'layer'}.png`,
                  data: new Uint8Array(
                    await (await toBlob(output)).arrayBuffer(),
                  ),
                });
                full.width = full.height = output.width = output.height = 1;
              }
            }
            completed++;
            setActiveJob((current) =>
              current?.id === jobId
                ? {
                    ...current,
                    progress: Math.round((completed / taskCount) * 95),
                  }
                : current,
            );
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve()),
            );
          }
          if (artboardPlan.length) {
            const source = makeCanvas(doc.w, doc.h);
            renderLayers(source.getContext('2d')!);
            for (const item of artboardPlan) {
              if (controller.signal.aborted) throw new JobCancelledError();
              const artboard = artboards.find(
                  (candidate) => candidate.id === item.artboardId,
                )!,
                output = makeCanvas(item.width, item.height),
                context = output.getContext('2d')!;
              context.fillStyle = artboard.background;
              context.fillRect(0, 0, item.width, item.height);
              context.imageSmoothingEnabled = true;
              context.imageSmoothingQuality = 'high';
              context.drawImage(
                source,
                artboard.x,
                artboard.y,
                artboard.w,
                artboard.h,
                0,
                0,
                item.width,
                item.height,
              );
              entries.push({
                name: `artboards/${item.name}`,
                data: new Uint8Array(
                  await (await toBlob(output)).arrayBuffer(),
                ),
              });
              output.width = output.height = 1;
              completed++;
              setActiveJob((current) =>
                current?.id === jobId
                  ? {
                      ...current,
                      progress: Math.round((completed / taskCount) * 95),
                    }
                  : current,
              );
              await new Promise<void>((resolve) =>
                requestAnimationFrame(() => resolve()),
              );
            }
            source.width = source.height = 1;
          }
          if (!entries.length)
            throw Error('The export sources contain no visible pixels.');
          download(
            `${fileName.replace(/\.[^.]+$/, '') || 'librelayer'}-assets.zip`,
            new Blob([createStoreZip(entries) as BlobPart], {
              type: 'application/zip',
            }),
          );
          setStatus(
            `${entries.length} layer and artboard assets exported in one ZIP`,
          );
        } catch (error) {
          setStatus(
            error instanceof JobCancelledError
              ? 'Layer and artboard export cancelled before download'
              : error instanceof Error
                ? error.message
                : 'Layer and artboard export failed safely',
          );
        } finally {
          if (activeJobAbort.current === controller)
            activeJobAbort.current = null;
          setActiveJob((current) => (current?.id === jobId ? null : current));
        }
        return;
      }
      if (feature.command === 'print') {
        openPrintStudio();
        return;
      }
    }
    if (feature.kind === 'document') {
      if (feature.command === 'photomerge') {
        const items = selectedRoots().filter(
          (layer) =>
            layer.visible &&
            layer.kind !== 'group' &&
            layer.kind !== 'adjustment' &&
            Boolean(surfacesRef.current.get(layer.id)),
        );
        if (items.length < 2) {
          setStatus(
            'Select two or more overlapping pixel layers in left-to-right order.',
          );
          return;
        }
        const controller = new AbortController(),
          jobId = crypto.randomUUID();
        activeJobAbort.current?.abort();
        activeJobAbort.current = controller;
        setActiveJob({ id: jobId, label: 'Photomerge panorama', progress: 0 });
        setStatus(
          'Registering and feathering panorama frames in a background worker…',
        );
        try {
          const result = await runStackJob(
            'panorama',
            stackSourcesForLayers(items),
            doc.w,
            doc.h,
            {
              signal: controller.signal,
              timeoutMs: 180000,
              onProgress: (progress) =>
                setActiveJob((current) =>
                  current?.id === jobId ? { ...current, progress } : current,
                ),
            },
          );
          if (result.kind !== 'panorama')
            throw Error('Panorama output was invalid.');
          const canvas = makeCanvas(result.width, result.height);
          canvas
            .getContext('2d')!
            .putImageData(
              new ImageData(
                Uint8ClampedArray.from(result.pixels),
                result.width,
                result.height,
              ),
              0,
              0,
            );
          openComposite('Photomerge panorama', canvas);
          canvas.width = canvas.height = 1;
          setStatus(
            `${items.length} frames registered and feathered into a ${result.width} × ${result.height} editable panorama`,
          );
        } catch (error) {
          setStatus(
            error instanceof JobCancelledError
              ? 'Photomerge cancelled; source layers were not changed'
              : error instanceof Error
                ? error.message
                : 'Photomerge failed safely',
          );
        } finally {
          if (activeJobAbort.current === controller)
            activeJobAbort.current = null;
          setActiveJob((current) => (current?.id === jobId ? null : current));
        }
        return;
      }
      if (feature.command === 'contact-sheet') {
        const items = selectedRoots().filter(
          (layer) =>
            layer.visible &&
            layer.kind !== 'group' &&
            layer.kind !== 'adjustment' &&
            Boolean(surfacesRef.current.get(layer.id)),
        );
        if (items.length < 2) {
          setStatus(
            'Select two or more visible pixel layers for a contact sheet.',
          );
          return;
        }
        const sources = items.flatMap((layer) => {
          const bounds = layerBounds(layer);
          if (!bounds) return [];
          return [
            {
              layer,
              left: Math.max(0, Math.floor(bounds.left)),
              top: Math.max(0, Math.floor(bounds.top)),
              right: Math.min(doc.w, Math.ceil(bounds.right)),
              bottom: Math.min(doc.h, Math.ceil(bounds.bottom)),
            },
          ];
        });
        if (sources.length < 2) {
          setStatus(
            'The selected layers do not contain enough visible pixels.',
          );
          return;
        }
        const plan = planContactSheet(
            sources.map((item) => ({
              width: item.right - item.left,
              height: item.bottom - item.top,
              label: item.layer.name,
            })),
            {
              columns: Math.max(
                1,
                Math.min(6, Math.round(1 + options.amount / 20)),
              ),
              gap: 8 + Math.round(options.secondary * 0.32),
            },
          ),
          controller = new AbortController(),
          jobId = crypto.randomUUID(),
          output = makeCanvas(plan.width, plan.height),
          context = output.getContext('2d')!;
        activeJobAbort.current?.abort();
        activeJobAbort.current = controller;
        setActiveJob({ id: jobId, label: 'Contact sheet', progress: 0 });
        try {
          context.fillStyle = options.color;
          context.fillRect(0, 0, output.width, output.height);
          const numeric = Number.parseInt(options.color.slice(1), 16),
            luminance =
              (((numeric >> 16) & 255) * 0.2126 +
                ((numeric >> 8) & 255) * 0.7152 +
                (numeric & 255) * 0.0722) /
              255;
          context.fillStyle = luminance > 0.55 ? '#111318' : '#f5f7fa';
          context.font = '13px system-ui, sans-serif';
          context.textBaseline = 'middle';
          for (const [index, source] of sources.entries()) {
            if (controller.signal.aborted) throw new JobCancelledError();
            const rendered = makeCanvas(doc.w, doc.h),
              cell = plan.cells[index];
            renderLayers(
              rendered.getContext('2d')!,
              [{ ...source.layer, visible: true }],
              surfacesRef.current,
              doc,
            );
            context.drawImage(
              rendered,
              source.left,
              source.top,
              source.right - source.left,
              source.bottom - source.top,
              cell.imageX,
              cell.imageY,
              cell.imageWidth,
              cell.imageHeight,
            );
            context.fillText(
              cell.label,
              cell.x,
              cell.y + cell.height + plan.caption / 2,
              cell.width,
            );
            rendered.width = rendered.height = 1;
            setActiveJob((current) =>
              current?.id === jobId
                ? {
                    ...current,
                    progress: Math.round(((index + 1) / sources.length) * 95),
                  }
                : current,
            );
            await new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve()),
            );
          }
          openComposite(options.text.trim() || 'Contact sheet', output);
          output.width = output.height = 1;
          setStatus(`${sources.length}-image editable contact sheet created`);
        } catch (error) {
          output.width = output.height = 1;
          setStatus(
            error instanceof JobCancelledError
              ? 'Contact sheet cancelled; no result document was created'
              : error instanceof Error
                ? error.message
                : 'Contact sheet failed safely',
          );
        } finally {
          if (activeJobAbort.current === controller)
            activeJobAbort.current = null;
          setActiveJob((current) => (current?.id === jobId ? null : current));
        }
        return;
      }
      if (
        ['auto-blend', 'focus-stack', 'hdr-merge', 'image-stack'].includes(
          feature.command,
        )
      ) {
        const items = selectedRoots().filter(
          (layer) =>
            layer.visible &&
            layer.kind !== 'group' &&
            layer.kind !== 'adjustment' &&
            Boolean(surfacesRef.current.get(layer.id)),
        );
        if (items.length < 2) {
          setStatus(
            `Select at least two visible pixel layers for ${feature.label}`,
          );
          return;
        }
        const command =
            feature.command === 'auto-blend'
              ? 'auto-blend'
              : feature.command === 'focus-stack'
                ? 'focus'
                : feature.command === 'hdr-merge'
                  ? 'hdr'
                  : 'statistical',
          modes: StackMode[] = [
            'minimum',
            'median',
            'mean',
            'maximum',
            'range',
          ],
          mode = modes[Math.min(4, Math.floor(options.secondary / 20))],
          controller = new AbortController(),
          jobId = crypto.randomUUID();
        activeJobAbort.current?.abort();
        activeJobAbort.current = controller;
        setActiveJob({ id: jobId, label: feature.label, progress: 0 });
        setStatus(`Running ${feature.label} in a background worker…`);
        try {
          const result = await runStackJob(
            command,
            stackSourcesForLayers(items),
            doc.w,
            doc.h,
            {
              mode,
              signal: controller.signal,
              timeoutMs: 120000,
              onProgress: (progress) =>
                setActiveJob((current) =>
                  current?.id === jobId ? { ...current, progress } : current,
                ),
            },
          );
          if (feature.command === 'hdr-merge') {
            if (result.kind !== 'hdr')
              throw Error('HDR merge result was invalid.');
            const precision = workingSurfaceFromFloat32(
                result.pixels,
                doc.w,
                doc.h,
                '32f',
              ),
              preview = workingSurfaceToRgba8(precision),
              canvas = makeCanvas(doc.w, doc.h),
              id = crypto.randomUUID();
            canvas
              .getContext('2d')!
              .putImageData(new ImageData(preview, doc.w, doc.h), 0, 0);
            loadImportedDocument(
              `${fileName} — ${feature.label}`,
              doc.w,
              doc.h,
              [
                {
                  id,
                  name: feature.label,
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
              new Map([[id, { pixels: canvas, precision }]]),
              'Create scene-linear HDR merge',
              undefined,
              undefined,
              undefined,
              '32f',
              true,
            );
            setStatus(
              `Scene-linear 32-bit HDR document created from ${items.length} layers · choose automatic, SDR, or highlight preview`,
            );
            return;
          }
          if (result.kind !== 'result')
            throw Error('Image-stack result was invalid.');
          const canvas = makeCanvas(doc.w, doc.h);
          canvas
            .getContext('2d')!
            .putImageData(
              new ImageData(
                Uint8ClampedArray.from(result.pixels),
                doc.w,
                doc.h,
              ),
              0,
              0,
            );
          const suffix =
            feature.command === 'image-stack'
              ? `Image Stack · ${mode}`
              : feature.label;
          openComposite(suffix, canvas);
          canvas.width = canvas.height = 1;
          setStatus(
            `${suffix} created from ${items.length} aligned-size layers as a new editable document`,
          );
        } catch (error) {
          setStatus(
            error instanceof JobCancelledError
              ? `${feature.label} cancelled; no result document was created`
              : error instanceof Error
                ? error.message
                : `${feature.label} failed safely`,
          );
        } finally {
          if (activeJobAbort.current === controller)
            activeJobAbort.current = null;
          setActiveJob((current) => (current?.id === jobId ? null : current));
        }
        return;
      }
      if (['frame-animation', 'video-timeline'].includes(feature.command)) {
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
      void runProFeature({ ...feature, command: mapped }, options);
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
    let backgroundFilterBackend:
      | 'background canvas'
      | 'background worker'
      | 'safe cooperative fallback'
      | null = null;
    const applyBackgroundFilter = async (filter: PixelFilterRequest) => {
      const context = canvas.getContext('2d', { willReadFrequently: true })!,
        image = context.getImageData(0, 0, canvas.width, canvas.height),
        controller = new AbortController(),
        jobId = crypto.randomUUID();
      activeJobAbort.current?.abort();
      activeJobAbort.current = controller;
      setActiveJob({ id: jobId, label: feature.label, progress: 0 });
      setStatus(`Running ${feature.label} in a background canvas…`);
      try {
        const result = await runPixelFilterJob(
          image.data,
          image.width,
          image.height,
          filter,
          {
            signal: controller.signal,
            timeoutMs: 120000,
            onProgress: (progress) =>
              setActiveJob((current) =>
                current?.id === jobId ? { ...current, progress } : current,
              ),
          },
        );
        context.clearRect(0, 0, image.width, image.height);
        if (result.backend === 'offscreen-worker') {
          context.drawImage(result.bitmap, 0, 0);
          result.bitmap.close();
          backgroundFilterBackend = 'background canvas';
        } else {
          context.putImageData(
            new ImageData(
              Uint8ClampedArray.from(result.pixels),
              image.width,
              image.height,
            ),
            0,
            0,
          );
          backgroundFilterBackend =
            result.backend === 'worker-array'
              ? 'background worker'
              : 'safe cooperative fallback';
        }
        return true;
      } catch (error) {
        context.clearRect(0, 0, image.width, image.height);
        context.drawImage(original, 0, 0);
        setStatus(
          error instanceof JobCancelledError
            ? `${feature.label} cancelled · no pixels were changed`
            : error instanceof JobWatchdogError
              ? `${feature.label} stopped by the safety watchdog · no pixels were changed`
              : error instanceof Error
                ? error.message
                : `${feature.label} failed safely`,
        );
        return false;
      } finally {
        if (activeJobAbort.current === controller)
          activeJobAbort.current = null;
        setActiveJob((current) => (current?.id === jobId ? null : current));
      }
    };
    if (
      [
        'blur-gallery',
        'lens-blur',
        'surface-blur',
        'noise',
        'smart-sharpen',
        'high-pass',
      ].includes(feature.command)
    ) {
      const context = canvas.getContext('2d', { willReadFrequently: true })!,
        image = context.getImageData(0, 0, canvas.width, canvas.height);
      if (feature.command === 'noise' && options.secondary >= 50)
        context.putImageData(
          applySuitePixelOperation(image, feature.command, options),
          0,
          0,
        );
      else {
        const applied = await applyBackgroundFilter({
          family: 'reference',
          operation: feature.command as ReferenceFilter,
          amount: options.amount,
          secondary: options.secondary,
        });
        if (!applied) {
          original.width = original.height = 1;
          return;
        }
      }
    } else if (
      [
        'lens-correction',
        'displace',
        'polar',
        'wave',
        'ripple',
        'spherize',
        'pixelate',
        'halftone',
      ].includes(feature.command)
    ) {
      const applied = await applyBackgroundFilter({
        family: 'distort',
        operation: feature.command as DistortFilter,
        amount: options.amount,
        secondary: options.secondary,
      });
      if (!applied) {
        original.width = original.height = 1;
        return;
      }
    } else if (
      [
        'oil-paint',
        'lighting',
        'clouds',
        'fibers',
        'filter-gallery',
        'custom-convolution',
      ].includes(feature.command)
    ) {
      const tint = [1, 3, 5].map((index) =>
        parseInt(options.color.slice(index, index + 2), 16),
      ) as [number, number, number];
      let kernel: number[];
      try {
        kernel = parseConvolutionKernel(options.text);
      } catch (error) {
        original.width = original.height = 1;
        setStatus(
          error instanceof Error
            ? error.message
            : 'The convolution kernel is invalid',
        );
        return;
      }
      const applied = await applyBackgroundFilter({
        family: 'render',
        operation: feature.command as RenderFilter,
        amount: options.amount,
        secondary: options.secondary,
        color: tint,
        kernel,
      });
      if (!applied) {
        original.width = original.height = 1;
        return;
      }
    } else if (feature.command === 'distort-filters') {
      remapRaster(canvas, (x, y, w, h) => {
        const nx = x / w - 0.5,
          ny = y / h - 0.5,
          a = (options.amount - 50) / 100;
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
    const backendSuffix = backgroundFilterBackend
      ? ' · '.concat(backgroundFilterBackend)
      : '';
    setStatus(
      `${feature.label} applied${selectionRef.current ? ' inside the selection' : ''}${backendSuffix}`,
    );
  };

  const convertDocumentWorkingDepth = (nextDepth: WorkingDepth) => {
    const currentDepth = workingDepthRef.current;
    if (nextDepth === currentDepth) {
      setStatus(`Document already uses ${WORKING_DEPTH_LABELS[nextDepth]}`);
      return;
    }
    const ranks: Record<WorkingDepth, number> = {
      '8u': 0,
      '16u': 1,
      '16f': 2,
      '32f': 3,
    };
    if (
      ranks[nextDepth] < ranks[currentDepth] &&
      !window.confirm(
        `Convert this document from ${WORKING_DEPTH_LABELS[currentDepth]} to ${WORKING_DEPTH_LABELS[nextDepth]}? Values outside the target range or precision will be clipped. Undo can restore them.`,
      )
    )
      return;
    const surfaces = [...surfacesRef.current.values()],
      currentPrecisionUnits = surfaces.reduce(
        (total, surface) =>
          total + (surface.precision?.data.byteLength ?? 0) / 4,
        0,
      ),
      targetPrecisionUnits =
        nextDepth === '8u'
          ? 0
          : surfaces.reduce(
              (total, surface) =>
                total +
                surface.pixels.width *
                  surface.pixels.height *
                  (workingDepthBytesPerPixel(nextDepth) / 4),
              0,
            ),
      additional = targetPrecisionUnits - currentPrecisionUnits;
    if (additional > 0 && !hasRoom(additional)) return;
    try {
      const converted = surfaces.map((surface) => {
        if (surface.precision) syncPrecisionSurface(surface);
        return nextDepth === '8u'
          ? undefined
          : surface.precision
            ? convertWorkingSurface(surface.precision, nextDepth)
            : createPrecisionBacking(surface, nextDepth);
      });
      surfaces.forEach((surface, index) => {
        if (converted[index]) surface.precision = converted[index];
        else delete surface.precision;
      });
      setWorkingDepth(nextDepth);
      if (nextDepth === '8u') setSceneReferred(false);
      snapshot(`Convert to ${WORKING_DEPTH_LABELS[nextDepth]}`);
      render();
      setStatus(
        `Document converted to ${WORKING_DEPTH_LABELS[nextDepth]}${nextDepth === '8u' ? '' : ' · high-depth backing is saved with the layered project'}${sceneReferredRef.current ? ' · scene-linear values retained' : ''}`,
      );
    } catch (error) {
      setPsdError(
        error instanceof Error
          ? error.message
          : 'The working-depth conversion failed safely.',
      );
    }
  };

  const applyDocumentColorProfile = async (options: {
    operation: ColorProfileOperation;
    target: ColorProfileId;
    intent: RenderingIntent;
    blackPointCompensation: boolean;
  }) => {
    const source = colorProfileRef.current,
      sourceJobProfile = portableIccProfile(source) ?? source,
      targetJobProfile = portableIccProfile(options.target) ?? options.target,
      targetName = resolveColorProfile(options.target).name;
    if (source === options.target) {
      setColorProfileDialog(null);
      setStatus(`Document already uses ${targetName}`);
      return;
    }
    if (options.operation === 'assign') {
      setColorProfile(options.target);
      snapshot(`Assign profile: ${targetName}`);
      render();
      setColorProfileDialog(null);
      setStatus(`${targetName} assigned · pixel values were not changed`);
      return;
    }
    const controller = new AbortController(),
      jobId = crypto.randomUUID(),
      surfaces = [...surfacesRef.current.values()];
    activeJobAbort.current?.abort();
    activeJobAbort.current = controller;
    setActiveJob({
      id: jobId,
      label: `Convert to ${targetName}`,
      progress: 0,
    });
    setColorProfileDialog(null);
    setStatus(`Converting document to ${targetName} in a background worker…`);
    try {
      localStorage.setItem(
        'librelayer-active-job',
        JSON.stringify({
          id: jobId,
          label: `Convert to ${targetName}`,
          started: Date.now(),
        }),
      );
    } catch {
      // Conversion remains cancelable if browser storage is unavailable.
    }
    try {
      const convertedSurfaces: {
        surface: LayerSurface;
        precision?: WorkingSurface;
        image: ImageData;
        backend: 'worker' | 'cooperative-main-thread';
      }[] = [];
      for (
        let surfaceIndex = 0;
        surfaceIndex < surfaces.length;
        surfaceIndex++
      ) {
        const surface = surfaces[surfaceIndex],
          context = surface.pixels.getContext('2d', {
            willReadFrequently: true,
          })!,
          updateProgress = (progress: number) =>
            setActiveJob((current) =>
              current?.id === jobId
                ? {
                    ...current,
                    progress: Math.round(
                      ((surfaceIndex + progress / 100) / surfaces.length) * 100,
                    ),
                  }
                : current,
            );
        if (surface.precision) {
          syncPrecisionSurface(surface);
          const result = await runColorProfileJob(
              workingSurfaceToFloat32(surface.precision),
              sourceJobProfile,
              targetJobProfile,
              options.intent,
              options.blackPointCompensation,
              { signal: controller.signal, onProgress: updateProgress },
            ),
            precision = workingSurfaceFromFloat32(
              result.pixels as Float32Array,
              surface.precision.width,
              surface.precision.height,
              surface.precision.depth,
            ),
            image = new ImageData(
              workingSurfaceToRgba8(precision),
              surface.pixels.width,
              surface.pixels.height,
            );
          convertedSurfaces.push({
            surface,
            precision,
            image,
            backend: result.backend,
          });
          continue;
        }
        const sourceImage = context.getImageData(
            0,
            0,
            surface.pixels.width,
            surface.pixels.height,
          ),
          result = await runColorProfileJob(
            sourceImage.data,
            sourceJobProfile,
            targetJobProfile,
            options.intent,
            options.blackPointCompensation,
            { signal: controller.signal, onProgress: updateProgress },
          ),
          image = new ImageData(
            new Uint8ClampedArray(result.pixels),
            sourceImage.width,
            sourceImage.height,
          );
        convertedSurfaces.push({
          surface,
          image,
          backend: result.backend,
        });
      }
      if (controller.signal.aborted) throw new JobCancelledError();
      for (const converted of convertedSurfaces) {
        if (converted.precision)
          converted.surface.precision = converted.precision;
        converted.surface.pixels
          .getContext('2d')!
          .putImageData(converted.image, 0, 0);
      }
      setColorProfile(options.target);
      snapshot(`Convert to ${targetName}`);
      render();
      setStatus(
        `Document converted to ${targetName} · ${options.intent.replaceAll('-', ' ')}${options.blackPointCompensation ? ' · black-point compensation' : ''} · ${convertedSurfaces.every((item) => item.backend === 'worker') ? 'background worker' : 'cooperative fallback'}`,
      );
    } catch (error) {
      setStatus(
        error instanceof JobCancelledError
          ? 'Color conversion cancelled; the document was not changed'
          : error instanceof Error
            ? error.message
            : 'The document color conversion failed safely.',
      );
    } finally {
      try {
        localStorage.removeItem('librelayer-active-job');
      } catch {}
      if (activeJobAbort.current === controller) activeJobAbort.current = null;
      setActiveJob((current) => (current?.id === jobId ? null : current));
      setColorProfileDialog(null);
    }
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
  const activePerformancePolicy = adaptivePerformancePolicy({
    mode: preferences.performanceMode,
    documentPixels: doc.w * doc.h,
    layerCount: layers.length,
    deviceMemoryGb:
      typeof navigator === 'undefined'
        ? undefined
        : (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    hardwareConcurrency:
      typeof navigator === 'undefined'
        ? undefined
        : navigator.hardwareConcurrency,
  });
  const brushFolders = Array.from(
      new Set(brushTips.map((tip) => tip.folder).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b)),
    visibleBrushTips = filterBrushTips(
      brushTips,
      brushQuery,
      brushFolder,
      brushFavoritesOnly,
    ),
    activeBrushTip = brushTips.find((tip) => tip.id === activeBrushTipId);
  const activeFill = normalizeFillLayerRecipe(active?.fillLayer);
  const updatePrecisionAdjustment = (
    key: keyof HighDepthAdjustments,
    value: HighDepthAdjustments[keyof HighDepthAdjustments],
  ) => {
    if (!active || active.kind !== 'adjustment' || isLocked(active.id)) return;
    const current = layersRef.current.find((layer) => layer.id === active.id);
    if (!current || current.kind !== 'adjustment') return;
    patchLayer(active.id, {
      precisionAdjustment: {
        ...current.precisionAdjustment,
        [key]: value,
      },
    });
  };
  const updateFillLayer = (patch: Partial<FillLayerRecipe>) => {
    if (!active || active.kind !== 'fill' || isLocked(active.id)) return;
    const current = normalizeFillLayerRecipe(active.fillLayer);
    patchLayer(active.id, {
      fillLayer: normalizeFillLayerRecipe({ ...current, ...patch }),
    });
  };
  const activeColorGrade = resolveColorGrade(active?.colorGrade);
  const canGradeActive =
    !!active &&
    active.kind !== 'group' &&
    active.kind !== 'adjustment' &&
    active.kind !== 'fill' &&
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
  useEffect(() => {
    if (selectionRepairOpen !== 'fill' || !selection) {
      setContentAwarePreview('');
      setContentAwarePreviewError('');
      return;
    }
    const frame = requestAnimationFrame(() => {
      const previewScale = Math.min(1, 720 / doc.w, 460 / doc.h),
        width = Math.max(1, Math.round(doc.w * previewScale)),
        height = Math.max(1, Math.round(doc.h * previewScale)),
        sourceCanvas = makeCanvas(width, height),
        sourceContext = sourceCanvas.getContext('2d')!,
        sourceFull = makeCanvas(doc.w, doc.h);
      if (contentAwareSampling === 'all-layers')
        renderLayers(sourceFull.getContext('2d')!);
      else {
        const activeLayer = selected(),
          activeSurface =
            activeLayer && surfacesRef.current.get(activeLayer.id);
        if (activeLayer && activeSurface)
          drawLayer(
            sourceFull.getContext('2d')!,
            {
              ...activeLayer,
              opacity: 100,
              fill: 100,
              blend: 'source-over',
            },
            activeSurface,
            doc.w,
            doc.h,
          );
      }
      sourceContext.drawImage(sourceFull, 0, 0, width, height);
      const maskFull = selectionMask(doc.w, doc.h, 0, 0),
        maskCanvas = makeCanvas(width, height);
      maskCanvas.getContext('2d')!.drawImage(maskFull, 0, 0, width, height);
      try {
        const sourceData = sourceContext.getImageData(0, 0, width, height),
          maskData = maskCanvas
            .getContext('2d', { willReadFrequently: true })!
            .getImageData(0, 0, width, height),
          result = contentAwareFill(
            sourceData.data,
            maskData.data,
            width,
            height,
            {
              samplingMode: contentAwareSampling,
              sampleRect: {
                x: contentAwareSampleX * previewScale,
                y: contentAwareSampleY * previewScale,
                w: contentAwareSampleW * previewScale,
                h: contentAwareSampleH * previewScale,
              },
              samplePoint: {
                x:
                  (contentAwareSampleX + contentAwareSampleW / 2) *
                  previewScale,
                y:
                  (contentAwareSampleY + contentAwareSampleH / 2) *
                  previewScale,
              },
              colorAdaptation: contentAwareColor,
              rotation: contentAwareRotation,
              scale: contentAwareScale,
              mirror: contentAwareMirror,
            },
          ),
          previewCanvas = makeCanvas(width, height),
          previewContext = previewCanvas.getContext('2d')!,
          overlayCanvas = makeCanvas(width, height),
          overlayContext = overlayCanvas.getContext('2d')!;
        const previewImage = previewContext.createImageData(width, height);
        previewImage.data.set(result.pixels);
        previewContext.putImageData(previewImage, 0, 0);
        const overlay = overlayContext.createImageData(width, height);
        for (let index = 0; index < overlay.data.length; index += 4) {
          if (result.sampled[index + 3]) {
            overlay.data[index] = 40;
            overlay.data[index + 1] = 230;
            overlay.data[index + 2] = 135;
            overlay.data[index + 3] = 72;
          }
          if (maskData.data[index + 3]) {
            overlay.data[index] = 255;
            overlay.data[index + 1] = 70;
            overlay.data[index + 2] = 105;
            overlay.data[index + 3] = 92;
          }
        }
        overlayContext.putImageData(overlay, 0, 0);
        previewContext.drawImage(overlayCanvas, 0, 0);
        setContentAwarePreview(previewCanvas.toDataURL('image/jpeg', 0.86));
        setContentAwarePreviewError('');
        overlayCanvas.width = overlayCanvas.height = 1;
        previewCanvas.width = previewCanvas.height = 1;
      } catch (error) {
        setContentAwarePreview('');
        setContentAwarePreviewError(
          error instanceof Error ? error.message : 'Preview is unavailable',
        );
      }
      sourceFull.width = sourceFull.height = 1;
      sourceCanvas.width = sourceCanvas.height = 1;
      maskFull.width = maskFull.height = 1;
      maskCanvas.width = maskCanvas.height = 1;
    });
    return () => cancelAnimationFrame(frame);
  }, [
    selectionRepairOpen,
    selection,
    selectedId,
    contentAwareSampling,
    contentAwareColor,
    contentAwareRotation,
    contentAwareScale,
    contentAwareMirror,
    contentAwareSampleX,
    contentAwareSampleY,
    contentAwareSampleW,
    contentAwareSampleH,
    doc.w,
    doc.h,
  ]);

  const renderComparisonDocument = (id: string) => {
    const comparison = documentStoreRef.current.get(id);
    if (!comparison) return null;
    const canvas = makeCanvas(comparison.doc.w, comparison.doc.h);
    renderLayers(
      canvas.getContext('2d')!,
      comparison.layers,
      comparison.surfaces,
      comparison.doc,
    );
    return canvas;
  };

  const activePath = paths.find((path) => path.id === selectedPathIds[0]),
    activePathAnchors = activePath ? pathAnchors(activePath) : [],
    activePathAnchor = activePathAnchors[selectedAnchorIndex],
    activePathStroke = normalizePathStroke(activePath?.stroke);

  return (
    <main
      className={`editor-shell theme-${preferences.theme ?? 'dark'} ui-scale-${preferences.interfaceScale ?? 100} ${motionClassName(preferences.motion)}`}
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
            { separator: true },
            { name: 'Print Studio…', action: openPrintStudio, shortcut: '⌘P' },
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
            {
              name: 'Working depth details',
              action: () =>
                setStatus(
                  `Current working depth: ${WORKING_DEPTH_LABELS[workingDepth]}`,
                ),
            },
            {
              name: 'Convert to 8-bit integer',
              action: () => convertDocumentWorkingDepth('8u'),
            },
            {
              name: 'Convert to 16-bit integer',
              action: () => convertDocumentWorkingDepth('16u'),
            },
            {
              name: 'Convert to 16-bit float',
              action: () => convertDocumentWorkingDepth('16f'),
            },
            {
              name: 'Convert to 32-bit float',
              action: () => convertDocumentWorkingDepth('32f'),
            },
            { separator: true },
            {
              name: 'Document color profile',
              action: () =>
                setStatus(
                  `Current profile: ${resolveColorProfile(colorProfile).name} · ICC v${resolveColorProfile(colorProfile).version}`,
                ),
            },
            {
              name: 'Assign Profile…',
              action: () => setColorProfileDialog('assign'),
            },
            {
              name: 'Convert to Profile…',
              action: () => setColorProfileDialog('convert'),
            },
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
            { name: 'Copy layer effects', action: copyLayerEffects },
            { name: 'Paste layer effects', action: pasteLayerEffects },
            { name: 'Clear layer effects', action: clearLayerEffects },
            { separator: true },
            { name: 'Convert to Smart Object', action: convertToSmartObject },
            {
              name: 'New shared Smart Object instance',
              action: duplicateSmartObjectInstance,
            },
            {
              name: 'Make Smart Object independent',
              action: makeSmartObjectIndependent,
            },
            {
              name: 'Place linked Smart Object…',
              action: () => void chooseSmartFile('link'),
            },
            { name: 'Edit Smart Object contents', action: editSmartContents },
            {
              name: 'Refresh linked Smart Object',
              action: () => void refreshLinkedSmartObject(),
            },
            {
              name: 'Replace Smart Object contents…',
              action: () => void chooseSmartFile('replace'),
            },
            {
              name: 'Relink Smart Object…',
              action: () => void chooseSmartFile('relink'),
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
            { name: 'Copy selected layers', action: copySelectedLayers },
            { name: 'Paste layers', action: pasteSelectedLayers },
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
            { name: 'Select People', action: aiSelectSubject },
            { name: 'Select Sky', action: () => selectSemanticRange('sky') },
            { name: 'Select Hair', action: () => selectSemanticRange('hair') },
            { name: 'Select Skin', action: () => selectSemanticRange('skin') },
            {
              name: 'Select Clothing',
              action: () => selectSemanticRange('clothing'),
            },
            {
              name: 'Object Selection',
              action: () => {
                setTool('smart');
                setSmartMode('object');
              },
            },
            { name: 'Color Range', action: selectColorRange },
            { name: 'Similar', action: selectSimilar },
            { name: 'Focus Range', action: selectFocusRange },
            {
              name: 'Luminosity Range: Shadows',
              action: () => selectLuminosityRange('shadows'),
            },
            {
              name: 'Luminosity Range: Midtones',
              action: () => selectLuminosityRange('midtones'),
            },
            {
              name: 'Luminosity Range: Highlights',
              action: () => selectLuminosityRange('highlights'),
            },
            { separator: true },
            {
              name: 'Transform Selection…',
              action: () => {
                if (!selectionRef.current) {
                  setStatus('Make a selection first');
                  return;
                }
                setSelectionTransformX(0);
                setSelectionTransformY(0);
                setSelectionTransformScale(100);
                setSelectionTransformOpen(true);
              },
            },
            {
              name: 'Grow',
              action: () => refineSelection('expand'),
            },
            {
              name: 'Select and Mask…',
              action: () => {
                if (!selectionRef.current) {
                  setStatus('Make a selection first');
                  return;
                }
                const source = makeCanvas(doc.w, doc.h);
                renderLayers(source.getContext('2d')!);
                selectMaskPreviewSourceRef.current = source;
                setSelectMaskTarget('selection');
                setSelectMaskOutput('selection');
                setSelectMaskOpen(true);
              },
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
              name: 'Professional Studio — 123 tools…',
              action: () => setProSuiteOpen(true),
            },
            ...[
              ['liquify', 'Liquify…'],
              ['wide-angle', 'Adaptive Wide Angle…'],
              ['vanishing-point', 'Vanishing Point…'],
            ].map(([command, name]) => ({
              name,
              action: () => {
                const feature = suiteFeatures.find(
                  (item) => item.command === command,
                );
                if (feature)
                  void runProFeature(feature, {
                    amount: 50,
                    secondary: 50,
                    color: '#6d8cff',
                    text: '',
                  });
              },
            })),
            { name: 'AI Remove Background', action: aiRemoveBackground },
            { separator: true },
            { name: 'Auto enhance', action: () => filter('brightness') },
            {
              name: 'Adjustments and blur…',
              action: () => setAdjustmentsOpen(true),
            },
            { separator: true },
            ...[
              ['blur-gallery', 'Blur Gallery…', 55, 50],
              ['lens-blur', 'Lens Blur…', 55, 50],
              ['surface-blur', 'Surface Blur…', 45, 55],
              ['smart-sharpen', 'Smart Sharpen…', 45, 30],
              ['high-pass', 'High Pass…', 45, 30],
              ['noise', 'Noise Reduction…', 45, 25],
            ].map(([command, name, amount, secondary]) => ({
              name: name as string,
              action: () => {
                const feature = suiteFeatures.find(
                  (item) => item.command === command,
                );
                if (feature)
                  void runProFeature(feature, {
                    amount: amount as number,
                    secondary: secondary as number,
                    color: '#6d8cff',
                    text: '',
                  });
              },
            })),
            { separator: true },
            {
              name: 'Load Filter Plug-in…',
              action: () => filterPluginFileRef.current?.click(),
            },
            {
              name: 'Run Last Filter Plug-in',
              action: () => void applyInstalledFilterPlugin(),
            },
            {
              name: 'Remove Filter Plug-in',
              action: () => {
                localStorage.removeItem('pixel-studio-filter-plugin');
                setStatus('Local filter plug-in removed');
              },
            },
            {
              name: 'Run GPU/CPU Filter Check',
              action: () => {
                try {
                  const checkCanvas = document.createElement('canvas'),
                    result = runGpuCpuReferenceCheck(checkCanvas);
                  checkCanvas.width = checkCanvas.height = 1;
                  setStatus(
                    !result.supported
                      ? 'WebGL2 is unavailable · CPU reference filters remain active'
                      : result.passed
                        ? `GPU/CPU filter check passed · maximum channel delta ${result.maximumDelta}`
                        : `GPU/CPU filter mismatch · maximum channel delta ${result.maximumDelta}`,
                  );
                } catch (error) {
                  setStatus(
                    error instanceof Error
                      ? error.message
                      : 'GPU/CPU filter check failed safely',
                  );
                }
              },
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
            {
              name: 'Frequency Separation',
              action: createFrequencySeparation,
            },
            {
              name: 'Pattern Stamp',
              action: () => {
                setTool('clone');
                setCloneMode('pattern');
                setCloneAligned(false);
                setStatus('Pattern Stamp ready');
              },
            },
            {
              name: 'History Brush',
              action: () => activateHistoryBrush(false),
            },
            {
              name: 'Art History Brush',
              action: () => activateHistoryBrush(true),
            },
            { separator: true },
            ...(
              [
                'dodge',
                'burn',
                'sponge',
                'blur',
                'sharpen',
                'smudge',
                'red-eye',
              ] as const
            ).map((mode) => ({
              name: `${mode === 'red-eye' ? 'Red Eye' : `${mode[0].toUpperCase()}${mode.slice(1)}`} tool`,
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
            {
              name: 'HDR preview · Automatic',
              action: () => {
                updatePreferences({ ...preferences, hdrPreviewMode: 'auto' });
                setStatus(
                  'HDR preview uses extended range on supported displays and tone maps safely elsewhere',
                );
              },
            },
            {
              name: 'HDR preview · SDR tone map',
              action: () => {
                updatePreferences({ ...preferences, hdrPreviewMode: 'sdr' });
                setStatus('Floating-point documents now use the SDR tone map');
              },
            },
            {
              name: 'HDR preview · Highlight map',
              action: () => {
                updatePreferences({
                  ...preferences,
                  hdrPreviewMode: 'highlights',
                });
                setStatus(
                  'HDR values above scene white are highlighted in magenta',
                );
              },
            },
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
      <section className="options-bar" aria-label="Contextual task bar">
        <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
          Workspace & presets
        </Button>
        <span className="active-tool">
          {tool === 'brush' && paintMode === 'pencil'
            ? 'Pencil'
            : toolItems.find((x) => x.id === tool)?.label}
        </span>
        <span
          className="contextual-subject"
          title="The contextual task bar follows the active tool, layer, mask, and selection"
        >
          {selectedIds.length > 1
            ? `${selectedIds.length} layers`
            : (active?.name ?? 'No active layer')}
          {' · '}
          {editing === 'mask' ? 'Mask' : selection ? 'Selection' : 'Canvas'}
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
                  Source
                  <select
                    aria-label="Brush source"
                    value={brushSourceMode}
                    onChange={(event) => {
                      const mode = event.target.value as typeof brushSourceMode;
                      if (mode !== 'color' && !historyBrushBuffer.current) {
                        setStatus('Choose History Brush from Retouch first');
                        return;
                      }
                      setBrushSourceMode(mode);
                    }}
                  >
                    <option value="color">Foreground color</option>
                    <option value="history">History</option>
                    <option value="art-history">Art History</option>
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
                    <p
                      className="brush-renderer-status"
                      aria-label={`Brush renderer ${brushRendererBackend}`}
                    >
                      {brushRendererBackend === 'webgpu'
                        ? 'WebGPU brush renderer active'
                        : brushRendererBackend === 'webgl2'
                          ? 'WebGL2 pooled texture renderer active'
                          : 'Canvas renderer fallback active'}
                    </p>
                    <section
                      className="brush-library"
                      aria-label="Brush library"
                    >
                      <div className="brush-library-heading">
                        <strong>Brush library</strong>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void defineBrushFromSelection()}
                        >
                          Define from selection
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => brushTipFileRef.current?.click()}
                        >
                          Import tips…
                        </Button>
                        <input
                          ref={brushTipFileRef}
                          className="sr-only"
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif,.abr"
                          aria-label="Import image or ABR brush tips"
                          onChange={(event) =>
                            void importBrushTips(event.target.files?.[0])
                          }
                        />
                      </div>
                      <div className="brush-library-filters">
                        <input
                          aria-label="Search brush tips"
                          placeholder="Search brushes…"
                          value={brushQuery}
                          onChange={(event) =>
                            setBrushQuery(event.target.value)
                          }
                        />
                        <select
                          aria-label="Brush folder"
                          value={brushFolder}
                          onChange={(event) =>
                            setBrushFolder(event.target.value)
                          }
                        >
                          <option value="all">All folders</option>
                          {brushFolders.map((folder) => (
                            <option key={folder} value={folder}>
                              {folder}
                            </option>
                          ))}
                        </select>
                        <label className="inline-check">
                          <input
                            type="checkbox"
                            checked={brushFavoritesOnly}
                            onChange={(event) =>
                              setBrushFavoritesOnly(event.target.checked)
                            }
                          />
                          Favorites
                        </label>
                      </div>
                      <div
                        className="brush-tip-grid"
                        aria-label="Available brush tips"
                      >
                        <button
                          type="button"
                          className={!activeBrushTipId ? 'active' : ''}
                          aria-pressed={!activeBrushTipId}
                          onClick={() => applyBrushTip()}
                        >
                          <span
                            className="round-tip-preview"
                            aria-hidden="true"
                          />
                          <span>Soft round</span>
                        </button>
                        {visibleBrushTips.map((tip) => (
                          <button
                            type="button"
                            key={tip.id}
                            className={
                              tip.id === activeBrushTipId ? 'active' : ''
                            }
                            aria-pressed={tip.id === activeBrushTipId}
                            title={`${tip.name} · ${tip.folder} · ${tip.tags.join(', ')}`}
                            onClick={() => applyBrushTip(tip)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={brushTipUrls.current.get(tip.id)}
                              alt=""
                            />
                            <span>
                              {tip.favorite ? '★ ' : ''}
                              {tip.name}
                            </span>
                          </button>
                        ))}
                      </div>
                      {activeBrushTip && (
                        <div className="brush-tip-editor">
                          <label>
                            Name
                            <input
                              aria-label="Active brush name"
                              value={activeBrushTip.name}
                              maxLength={80}
                              onChange={(event) =>
                                void updateBrushTip(activeBrushTip.id, {
                                  name: event.target.value || 'Untitled brush',
                                })
                              }
                            />
                          </label>
                          <label>
                            Folder
                            <input
                              aria-label="Active brush folder"
                              value={activeBrushTip.folder}
                              maxLength={60}
                              onChange={(event) => {
                                const folder = event.target.value || 'Custom';
                                if (brushFolder !== 'all')
                                  setBrushFolder(folder);
                                void updateBrushTip(activeBrushTip.id, {
                                  folder,
                                });
                              }}
                            />
                          </label>
                          <label>
                            Tags
                            <input
                              key={`${activeBrushTip.id}:${activeBrushTip.updated}:tags`}
                              aria-label="Active brush tags"
                              defaultValue={activeBrushTip.tags.join(', ')}
                              placeholder="ink, texture"
                              onBlur={(event) =>
                                void updateBrushTip(activeBrushTip.id, {
                                  tags: normalizeBrushTags(event.target.value),
                                })
                              }
                            />
                          </label>
                          <div className="brush-preset-actions">
                            <Button
                              size="sm"
                              variant="outline"
                              aria-pressed={activeBrushTip.favorite}
                              onClick={() =>
                                void updateBrushTip(activeBrushTip.id, {
                                  favorite: !activeBrushTip.favorite,
                                })
                              }
                            >
                              {activeBrushTip.favorite
                                ? '★ Favorite'
                                : '☆ Favorite'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                void removeBrushTip(activeBrushTip.id)
                              }
                            >
                              Remove tip
                            </Button>
                          </div>
                        </div>
                      )}
                    </section>
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
                      Tip angle
                      <input
                        aria-label="Brush tip angle"
                        className="number-option compact-number"
                        type="number"
                        min="-180"
                        max="180"
                        value={brushAngle}
                        onChange={(event) =>
                          setBrushAngle(
                            Math.max(
                              -180,
                              Math.min(180, +event.target.value || 0),
                            ),
                          )
                        }
                      />
                      °
                    </label>
                    <label>
                      Roundness
                      <input
                        aria-label="Brush tip roundness"
                        className="number-option compact-number"
                        type="number"
                        min="5"
                        max="100"
                        value={brushRoundness}
                        onChange={(event) =>
                          setBrushRoundness(
                            Math.max(
                              5,
                              Math.min(100, +event.target.value || 5),
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
                      Opacity jitter
                      <input
                        aria-label="Brush opacity jitter"
                        className="number-option compact-number"
                        type="number"
                        min="0"
                        max="100"
                        value={opacityJitter}
                        onChange={(event) =>
                          setOpacityJitter(
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
                      Flow jitter
                      <input
                        aria-label="Brush flow jitter"
                        className="number-option compact-number"
                        type="number"
                        min="0"
                        max="100"
                        value={flowJitter}
                        onChange={(event) =>
                          setFlowJitter(
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
                        checked={wetEdges}
                        onChange={(event) => setWetEdges(event.target.checked)}
                      />
                      Wet edges
                    </label>
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={airbrushBuildUp}
                        onChange={(event) =>
                          setAirbrushBuildUp(event.target.checked)
                        }
                      />
                      Airbrush buildup
                    </label>
                    <label>
                      Symmetry
                      <select
                        aria-label="Brush symmetry"
                        value={brushSymmetry}
                        onChange={(event) =>
                          setBrushSymmetry(event.target.value as BrushSymmetry)
                        }
                      >
                        <option value="none">Off</option>
                        <option value="vertical">Vertical</option>
                        <option value="horizontal">Horizontal</option>
                        <option value="radial">Radial</option>
                      </select>
                    </label>
                    {brushSymmetry === 'radial' && (
                      <label>
                        Radial count
                        <input
                          aria-label="Radial symmetry count"
                          className="number-option compact-number"
                          type="number"
                          min="2"
                          max="16"
                          value={radialSymmetryCount}
                          onChange={(event) =>
                            setRadialSymmetryCount(
                              Math.max(
                                2,
                                Math.min(16, +event.target.value || 2),
                              ),
                            )
                          }
                        />
                      </label>
                    )}
                    <label className="inline-check">
                      <input
                        type="checkbox"
                        checked={dualBrush}
                        onChange={(event) => setDualBrush(event.target.checked)}
                      />
                      Dual brush
                    </label>
                    {dualBrush && (
                      <div className="mixer-controls">
                        {[
                          [
                            'Dual scale',
                            dualBrushScale,
                            setDualBrushScale,
                            10,
                            100,
                          ],
                          [
                            'Dual offset',
                            dualBrushOffset,
                            setDualBrushOffset,
                            0,
                            200,
                          ],
                        ].map(([label, value, setter, min, max]) => (
                          <label key={label as string}>
                            {label as string}
                            <input
                              aria-label={label as string}
                              className="number-option compact-number"
                              type="number"
                              min={min as number}
                              max={max as number}
                              value={value as number}
                              onChange={(event) =>
                                (setter as (next: number) => void)(
                                  Math.max(
                                    min as number,
                                    Math.min(
                                      max as number,
                                      +event.target.value || (min as number),
                                    ),
                                  ),
                                )
                              }
                            />
                            %
                          </label>
                        ))}
                      </div>
                    )}
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
                        Import preset
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
                  Stamp
                  <select
                    aria-label="Stamp mode"
                    value={cloneMode}
                    onChange={(event) => {
                      const mode = event.target.value as typeof cloneMode;
                      setCloneMode(mode);
                      cloneHasOffset.current = false;
                      if (mode === 'pattern') setCloneAligned(false);
                    }}
                  >
                    <option value="clone">Clone Stamp</option>
                    <option value="pattern">Pattern Stamp</option>
                  </select>
                </label>
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
                    cloneSources.current[activeCloneSourceSlot] = null;
                    setCloneSourceVersion((version) => version + 1);
                    cloneHasOffset.current = false;
                    setStatus('Clone source cleared');
                  }}
                >
                  Clear source
                </Button>
                <details className="brush-dynamics">
                  <summary>Clone Source</summary>
                  <div>
                    <div
                      className="clone-source-slots"
                      aria-label="Clone source slots"
                    >
                      {cloneSources.current.map((source, index) => (
                        <button
                          type="button"
                          key={`${index}-${cloneSourceVersion}`}
                          className={
                            activeCloneSourceSlot === index ? 'active' : ''
                          }
                          aria-pressed={activeCloneSourceSlot === index}
                          aria-label={`Clone source ${index + 1}${source ? ' set' : ' empty'}`}
                          onClick={() => {
                            setActiveCloneSourceSlot(index);
                            cloneSource.current = source ? { ...source } : null;
                            cloneHasOffset.current = false;
                            setStatus(
                              source
                                ? `Clone source ${index + 1} selected`
                                : `Clone source ${index + 1} is empty · Option/Alt-click the image`,
                            );
                          }}
                        >
                          {index + 1}
                          <span>{source ? '●' : '○'}</span>
                        </button>
                      ))}
                    </div>
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
                    <option value="red-eye">Red Eye</option>
                  </select>
                </label>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={retouchSampleAll}
                    onChange={(event) =>
                      setRetouchSampleAll(event.target.checked)
                    }
                  />
                  Sample all layers
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const id = createLayer('Retouching');
                    if (id) setStatus('Blank retouch layer created');
                  }}
                >
                  New retouch layer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={createFrequencySeparation}
                >
                  Frequency separation
                </Button>
                {retouchMode === 'healing' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      cloneSource.current = null;
                      cloneSources.current[activeCloneSourceSlot] = null;
                      setCloneSourceVersion((version) => version + 1);
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
                <details className="path-direct-controls">
                  <summary>Direct selection</summary>
                  <div>
                    <label>
                      Anchor
                      <select
                        aria-label="Selected path anchor"
                        disabled={!activePathAnchors.length}
                        value={Math.min(
                          selectedAnchorIndex,
                          Math.max(0, activePathAnchors.length - 1),
                        )}
                        onChange={(event) =>
                          setSelectedAnchorIndex(+event.target.value)
                        }
                      >
                        {activePathAnchors.map((anchor, index) => (
                          <option key={index} value={index}>
                            {index + 1} · {anchor.kind}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      X
                      <input
                        aria-label="Selected anchor X"
                        className="number-option compact-number"
                        type="number"
                        value={Math.round(activePathAnchor?.x ?? 0)}
                        disabled={!activePathAnchor}
                        onChange={(event) =>
                          activePathAnchor &&
                          moveSelectedPathAnchor(
                            +event.target.value || 0,
                            activePathAnchor.y,
                          )
                        }
                      />
                    </label>
                    <label>
                      Y
                      <input
                        aria-label="Selected anchor Y"
                        className="number-option compact-number"
                        type="number"
                        value={Math.round(activePathAnchor?.y ?? 0)}
                        disabled={!activePathAnchor}
                        onChange={(event) =>
                          activePathAnchor &&
                          moveSelectedPathAnchor(
                            activePathAnchor.x,
                            +event.target.value || 0,
                          )
                        }
                      />
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!activePathAnchor}
                      onClick={togglePathPointType}
                    >
                      Convert{' '}
                      {activePathAnchor?.kind === 'smooth'
                        ? 'corner'
                        : 'smooth'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!activePathAnchor}
                      onClick={() => nudgePathAnchor(-1, 0)}
                    >
                      ← 1 px
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!activePathAnchor}
                      onClick={() => nudgePathAnchor(1, 0)}
                    >
                      1 px →
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!activePath}
                      onClick={addPathAnchor}
                    >
                      Add point
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={activePathAnchors.length <= 3}
                      onClick={deletePathAnchor}
                    >
                      Delete point
                    </Button>
                  </div>
                </details>
                <details className="path-direct-controls path-stroke-controls">
                  <summary>Stroke</summary>
                  <div>
                    <label>
                      Colour
                      <input
                        aria-label="Path stroke color"
                        type="color"
                        value={activePathStroke.color}
                        disabled={!activePath}
                        onChange={(event) =>
                          updatePathStroke({ color: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Start width
                      <input
                        aria-label="Path stroke start width"
                        className="number-option compact-number"
                        type="number"
                        min="0.1"
                        max="1000"
                        step="0.5"
                        value={activePathStroke.widthStart}
                        disabled={!activePath}
                        onChange={(event) =>
                          updatePathStroke({
                            widthStart: +event.target.value || 0.1,
                          })
                        }
                      />
                    </label>
                    <label>
                      End width
                      <input
                        aria-label="Path stroke end width"
                        className="number-option compact-number"
                        type="number"
                        min="0.1"
                        max="1000"
                        step="0.5"
                        value={activePathStroke.widthEnd}
                        disabled={!activePath}
                        onChange={(event) =>
                          updatePathStroke({
                            widthEnd: +event.target.value || 0.1,
                          })
                        }
                      />
                    </label>
                    <label>
                      Cap
                      <select
                        aria-label="Path stroke cap"
                        value={activePathStroke.cap}
                        disabled={!activePath}
                        onChange={(event) =>
                          updatePathStroke({
                            cap: event.target.value as CanvasLineCap,
                          })
                        }
                      >
                        <option value="butt">Butt</option>
                        <option value="round">Round</option>
                        <option value="square">Square</option>
                      </select>
                    </label>
                    <label>
                      Join
                      <select
                        aria-label="Path stroke join"
                        value={activePathStroke.join}
                        disabled={!activePath}
                        onChange={(event) =>
                          updatePathStroke({
                            join: event.target.value as CanvasLineJoin,
                          })
                        }
                      >
                        <option value="miter">Miter</option>
                        <option value="round">Round</option>
                        <option value="bevel">Bevel</option>
                      </select>
                    </label>
                    <label>
                      Dash
                      <select
                        aria-label="Path stroke dash"
                        value={activePathStroke.dash.join(',')}
                        disabled={!activePath}
                        onChange={(event) =>
                          updatePathStroke({
                            dash: event.target.value
                              ? event.target.value.split(',').map(Number)
                              : [],
                          })
                        }
                      >
                        <option value="">Solid</option>
                        <option value="12,8">Dashed</option>
                        <option value="2,6">Dotted</option>
                        <option value="18,6,3,6">Dash dot</option>
                      </select>
                    </label>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!activePath}
                      onClick={() => fillStrokePath(false)}
                    >
                      Paint stroke
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!activePath}
                      onClick={() => fillStrokePath(true)}
                    >
                      Fill path
                    </Button>
                  </div>
                </details>
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
                    {customFonts.map((family) => (
                      <option key={family} value={family}>
                        {family} (local)
                      </option>
                    ))}
                  </select>
                </label>
                <div className="brush-preset-actions">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => customFontFileRef.current?.click()}
                  >
                    Load local font…
                  </Button>
                  <input
                    ref={customFontFileRef}
                    className="sr-only"
                    type="file"
                    aria-label="Load local font"
                    accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                    onChange={(event) =>
                      void loadCustomFont(event.target.files?.[0])
                    }
                  />
                </div>
                {!fontAvailable && (
                  <p className="control-warning" role="status">
                    {fontFamily} is missing. A system fallback is shown; load
                    the font to preserve the design.
                  </p>
                )}
                <label>
                  Weight
                  <input
                    aria-label="Font weight"
                    type="number"
                    min="1"
                    max="1000"
                    value={fontWeight}
                    onChange={(event) =>
                      setFontWeight(
                        Math.max(1, Math.min(1000, +event.target.value || 400)),
                      )
                    }
                  />
                </label>
                <label>
                  Style
                  <select
                    aria-label="Font style"
                    value={fontStyle}
                    onChange={(event) =>
                      setFontStyle(event.target.value as TextStyle)
                    }
                  >
                    <option value="normal">Roman</option>
                    <option value="italic">Italic</option>
                    <option value="oblique">Oblique</option>
                  </select>
                </label>
                <label>
                  Width axis
                  <input
                    aria-label="Font width axis"
                    type="number"
                    min="50"
                    max="200"
                    value={fontStretch}
                    onChange={(event) =>
                      setFontStretch(
                        Math.max(50, Math.min(200, +event.target.value || 100)),
                      )
                    }
                  />
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
                  Direction
                  <select
                    aria-label="Text direction"
                    value={textDirection}
                    onChange={(event) =>
                      setTextDirection(event.target.value as TextDirection)
                    }
                  >
                    <option value="auto">Automatic</option>
                    <option value="ltr">Left to right</option>
                    <option value="rtl">Right to left</option>
                  </select>
                </label>
                <label>
                  Language
                  <select
                    aria-label="Text language"
                    value={textLanguage}
                    onChange={(event) => setTextLanguage(event.target.value)}
                  >
                    {languageOptions.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {textParagraph && (
                  <>
                    <label>
                      First-line indent
                      <input
                        aria-label="First-line indent"
                        type="number"
                        min="-500"
                        max="500"
                        value={textIndent}
                        onChange={(event) =>
                          setTextIndent(+event.target.value || 0)
                        }
                      />
                    </label>
                    <label>
                      Space before
                      <input
                        aria-label="Paragraph space before"
                        type="number"
                        min="0"
                        max="500"
                        value={textSpaceBefore}
                        onChange={(event) =>
                          setTextSpaceBefore(
                            Math.max(0, +event.target.value || 0),
                          )
                        }
                      />
                    </label>
                    <label>
                      Space after
                      <input
                        aria-label="Paragraph space after"
                        type="number"
                        min="0"
                        max="500"
                        value={textSpaceAfter}
                        onChange={(event) =>
                          setTextSpaceAfter(
                            Math.max(0, +event.target.value || 0),
                          )
                        }
                      />
                    </label>
                  </>
                )}
                <label>
                  Warp style
                  <select
                    aria-label="Text warp style"
                    value={textWarpStyle}
                    onChange={(event) =>
                      setTextWarpStyle(event.target.value as TextWarpStyle)
                    }
                  >
                    <option value="none">None</option>
                    <option value="arc">Arc</option>
                    <option value="arch">Arch</option>
                    <option value="flag">Flag</option>
                    <option value="wave">Wave</option>
                    <option value="bulge">Bulge</option>
                    <option value="fish">Fish</option>
                  </select>
                </label>
                <label>
                  Warp bend
                  <input
                    aria-label="Text warp"
                    type="number"
                    min="-200"
                    max="200"
                    value={textWarp}
                    onChange={(event) => setTextWarp(+event.target.value || 0)}
                  />
                </label>
                <label>
                  Path placement
                  <select
                    aria-label="Text path placement"
                    value={textPathMode}
                    onChange={(event) => {
                      const mode = event.target.value as typeof textPathMode;
                      setTextPathMode(mode);
                      if (mode !== 'none' && !textPathId && paths[0])
                        setTextPathId(paths[0].id);
                    }}
                  >
                    <option value="none">No path</option>
                    <option value="along" disabled={!paths.length}>
                      Along saved path
                    </option>
                    <option value="inside" disabled={!paths.length}>
                      Inside saved path
                    </option>
                  </select>
                </label>
                {textPathMode !== 'none' && (
                  <label>
                    Saved path
                    <select
                      aria-label="Text path"
                      value={textPathId}
                      onChange={(event) => setTextPathId(event.target.value)}
                    >
                      {paths.map((path) => (
                        <option key={path.id} value={path.id}>
                          {path.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {textParagraph && (
                  <>
                    <label>
                      Auto fit
                      <select
                        aria-label="Text auto fit"
                        value={textFit}
                        onChange={(event) =>
                          setTextFit(event.target.value as typeof textFit)
                        }
                      >
                        <option value="none">Off</option>
                        <option value="shrink">Shrink to fit</option>
                        <option value="fill">Fill box</option>
                      </select>
                    </label>
                    <label>
                      Text box height
                      <input
                        aria-label="Text box height"
                        type="number"
                        min="20"
                        max={doc.h}
                        value={textBoxHeight}
                        onChange={(event) =>
                          setTextBoxHeight(
                            Math.max(
                              20,
                              Math.min(doc.h, +event.target.value || 20),
                            ),
                          )
                        }
                      />
                    </label>
                  </>
                )}
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
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={textUnderline}
                    onChange={(event) => setTextUnderline(event.target.checked)}
                  />
                  Underline
                </label>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={textStrike}
                    onChange={(event) => setTextStrike(event.target.checked)}
                  />
                  Strikethrough
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
              : active?.kind === 'fill'
                ? 'Fill layer'
                : active?.kind === 'group'
                  ? 'Layer group'
                  : 'Layer pixels'}{' '}
          · RGB {WORKING_DEPTH_LABELS[workingDepth]}
          {` · ${resolveColorProfile(colorProfile).name}`}
          {workingDepth !== '8u' && ' · Float render'}
          {sceneReferred &&
            ` · HDR ${
              preferences.hdrPreviewMode === 'sdr'
                ? 'SDR preview'
                : preferences.hdrPreviewMode === 'highlights'
                  ? 'highlight map'
                  : 'automatic preview'
            }`}
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
                    {
                      maskLinked: active.maskLinked === false,
                      maskTransform: normalizeMaskTransform(
                        active.maskTransform,
                      ),
                    },
                    active.maskLinked === false
                      ? 'Link layer mask'
                      : 'Unlink layer mask',
                  )
                }
              >
                {active.maskLinked === false ? 'Link mask' : 'Unlink mask'}
              </Button>
              <Button
                size="sm"
                variant={active.maskOverlay ? 'default' : 'ghost'}
                onClick={() =>
                  patchLayer(
                    active.id,
                    { maskOverlay: !active.maskOverlay },
                    active.maskOverlay
                      ? 'Hide mask overlay'
                      : 'Show mask overlay',
                  )
                }
              >
                {active.maskOverlay ? 'Hide overlay' : 'Show overlay'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={openActiveMaskRefinement}
              >
                Refine edge…
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
              ? `calc(54px * var(--ui-scale)) calc(${preferences.layout.width}px * var(--ui-scale)) minmax(0,1fr)`
              : `calc(54px * var(--ui-scale)) minmax(0,1fr) calc(${preferences.layout.width}px * var(--ui-scale))`,
        }}
      >
        <aside className="tool-rail" aria-label="Tools">
          {visibleToolItems.map((item, index) => {
            const { id, label, key, icon: Icon } = item,
              startsGroup =
                toolbarPreferences.groupByFamily &&
                index > 0 &&
                visibleToolItems[index - 1].group !== item.group;
            return (
              <Fragment key={id}>
                {startsGroup && (
                  <span className="tool-divider" aria-hidden="true" />
                )}
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className={tool === id ? 'tool-button active' : 'tool-button'}
                  aria-label={label}
                  aria-pressed={tool === id}
                  title={`${label} · ${(preferences.shortcuts[id] ?? key).toUpperCase()}`}
                  onClick={() => {
                    setTool(id);
                    if (id === 'brush') setBrushSourceMode('color');
                    if (id === 'clone') setCloneMode('clone');
                  }}
                >
                  <Icon />
                </Button>
              </Fragment>
            );
          })}
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
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (item.id !== activeDocumentRef.current)
                    switchDocument(item.id);
                  setContextMenu({
                    kind: 'document',
                    id: item.id,
                    x: event.clientX,
                    y: event.clientY,
                  });
                }}
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
            sourceCanvas={displayRef.current}
            revision={layers}
            activeDocumentName={fileName}
            comparisonDocuments={documents
              .filter((item) => item.id !== activeDocumentId)
              .map(({ id, name }) => ({ id, name }))}
            getComparisonCanvas={renderComparisonDocument}
          >
            <canvas
              key={
                workingDepth === '16f' || workingDepth === '32f'
                  ? 'float-display'
                  : 'integer-display'
              }
              ref={displayRef}
              aria-label="Editable image canvas"
              data-tile-backed-layers={
                [...surfacesRef.current.values()].filter(
                  (surface) => surface.backing,
                ).length
              }
              className={`soft-proof-${preferences.proofMode ?? 'none'}`}
              width={doc.w}
              height={doc.h}
              onPointerDown={begin}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenu({
                  kind: 'canvas',
                  x: event.clientX,
                  y: event.clientY,
                });
              }}
              onDoubleClick={() => {
                if (tool === 'lasso' || tool === 'path') {
                  polygonDraft.current = polygonDraft.current.slice(0, -1);
                  finishPolygon(tool);
                }
              }}
            />
            <SoftProofOverlay
              sourceCanvas={displayRef.current}
              revision={layers}
              mode={preferences.proofMode ?? 'none'}
              enabled={preferences.gamutWarning ?? false}
            />
            {selection && !selectionPath && (
              <div className="selection-box" style={selectionStyle} />
            )}{' '}
            {dragRect && <div className="drag-box" style={dragStyle} />}{' '}
            {showArtboards && artboards.length > 0 && (
              <svg
                className="artboard-overlay"
                viewBox={`0 0 ${doc.w} ${doc.h}`}
                preserveAspectRatio="none"
                aria-label={`${artboards.length} artboard bounds`}
              >
                {artboards.map((artboard) => (
                  <Fragment key={artboard.id}>
                    <rect
                      className={
                        activeArtboardId === artboard.id ? 'active' : ''
                      }
                      x={artboard.x}
                      y={artboard.y}
                      width={artboard.w}
                      height={artboard.h}
                    />
                    <text x={artboard.x + 5} y={Math.max(14, artboard.y + 14)}>
                      {artboard.name}
                    </text>
                  </Fragment>
                ))}
              </svg>
            )}
            {active?.frame && (
              <svg
                className="frame-overlay"
                viewBox={`0 0 ${doc.w} ${doc.h}`}
                preserveAspectRatio="none"
                aria-label={`Frame clipping ${active.name}`}
              >
                {active.frame.shape === 'ellipse' ? (
                  <ellipse
                    cx={active.frame.x + active.frame.w / 2}
                    cy={active.frame.y + active.frame.h / 2}
                    rx={active.frame.w / 2}
                    ry={active.frame.h / 2}
                  />
                ) : (
                  <rect
                    x={active.frame.x}
                    y={active.frame.y}
                    width={active.frame.w}
                    height={active.frame.h}
                    rx={active.frame.radius}
                  />
                )}
              </svg>
            )}
            {tool === 'path' && activePath && (
              <svg
                className="saved-path-overlay"
                viewBox={`0 0 ${doc.w} ${doc.h}`}
                preserveAspectRatio="none"
                aria-label={`Editing ${activePath.name}`}
              >
                <path d={savedPathSvgData(activePath)} />
                {activePathAnchors.map((anchor, index) => (
                  <Fragment key={index}>
                    {anchor.incoming && (
                      <line
                        x1={anchor.incoming.x}
                        y1={anchor.incoming.y}
                        x2={anchor.x}
                        y2={anchor.y}
                      />
                    )}
                    {anchor.outgoing && (
                      <line
                        x1={anchor.x}
                        y1={anchor.y}
                        x2={anchor.outgoing.x}
                        y2={anchor.outgoing.y}
                      />
                    )}
                    {anchor.incoming && (
                      <circle
                        className="bezier-handle"
                        cx={anchor.incoming.x}
                        cy={anchor.incoming.y}
                        r={Math.max(2, (3 / zoom) * 100)}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          setSelectedAnchorIndex(index);
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );
                        }}
                        onPointerMove={(event) => {
                          if (
                            !event.currentTarget.hasPointerCapture(
                              event.pointerId,
                            )
                          )
                            return;
                          const next = viewportRef.current?.point(
                            event.clientX,
                            event.clientY,
                          );
                          if (next)
                            dragPathControl(
                              activePath.id,
                              index,
                              next,
                              'incoming',
                            );
                        }}
                        onPointerUp={(event) => {
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
                          setTimeout(
                            () => snapshot('Bézier handle dragged'),
                            0,
                          );
                          setStatus('Bézier handles adjusted');
                        }}
                      />
                    )}
                    {anchor.outgoing && (
                      <circle
                        className="bezier-handle"
                        cx={anchor.outgoing.x}
                        cy={anchor.outgoing.y}
                        r={Math.max(2, (3 / zoom) * 100)}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          setSelectedAnchorIndex(index);
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );
                        }}
                        onPointerMove={(event) => {
                          if (
                            !event.currentTarget.hasPointerCapture(
                              event.pointerId,
                            )
                          )
                            return;
                          const next = viewportRef.current?.point(
                            event.clientX,
                            event.clientY,
                          );
                          if (next)
                            dragPathControl(
                              activePath.id,
                              index,
                              next,
                              'outgoing',
                            );
                        }}
                        onPointerUp={(event) => {
                          event.currentTarget.releasePointerCapture(
                            event.pointerId,
                          );
                          setTimeout(
                            () => snapshot('Bézier handle dragged'),
                            0,
                          );
                          setStatus('Bézier handles adjusted');
                        }}
                      />
                    )}
                    <circle
                      className={
                        index === selectedAnchorIndex ? 'active-anchor' : ''
                      }
                      cx={anchor.x}
                      cy={anchor.y}
                      r={Math.max(3, (5 / zoom) * 100)}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setSelectedAnchorIndex(index);
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={(event) => {
                        if (
                          !event.currentTarget.hasPointerCapture(
                            event.pointerId,
                          )
                        )
                          return;
                        event.stopPropagation();
                        const next = viewportRef.current?.point(
                          event.clientX,
                          event.clientY,
                        );
                        if (!next) return;
                        dragPathControl(activePath.id, index, next);
                      }}
                      onPointerUp={(event) => {
                        if (
                          !event.currentTarget.hasPointerCapture(
                            event.pointerId,
                          )
                        )
                          return;
                        event.currentTarget.releasePointerCapture(
                          event.pointerId,
                        );
                        setTimeout(() => snapshot('Anchor dragged'), 0);
                        setStatus('Anchor moved with Direct Selection');
                      }}
                    />
                  </Fragment>
                ))}
              </svg>
            )}
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
                          <option value="fill">Fill layers</option>
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
                            onContextMenu={(event) => {
                              event.preventDefault();
                              if (!selectedIdsRef.current.includes(layer.id))
                                select(layer.id);
                              setContextMenu({
                                kind: 'layer',
                                id: layer.id,
                                x: event.clientX,
                                y: event.clientY,
                              });
                            }}
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
                              ) : layer.kind === 'fill' ? (
                                <PaintBucket />
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
                                  ? `${layer.groupIsolation ?? 'Pass-through'} group${layer.knockout && layer.knockout !== 'none' ? ` · ${layer.knockout} knockout` : ''}`
                                  : layer.kind === 'adjustment'
                                    ? 'Adjustment layer'
                                    : layer.kind === 'fill'
                                      ? `${layer.fillLayer?.mode ?? 'Solid'} fill layer`
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
                          {active.smartObject.kind === 'linked' && (
                            <div className="linked-smart-summary">
                              <div>
                                <strong>{active.smartObject.sourceName}</strong>
                                <small>
                                  {active.smartObject.linkedStatus === 'missing'
                                    ? 'Link missing · embedded fallback active'
                                    : 'Linked source · embedded fallback packaged'}
                                </small>
                              </div>
                              <button
                                onClick={() => void refreshLinkedSmartObject()}
                              >
                                Refresh
                              </button>
                              <button
                                onClick={() => void chooseSmartFile('relink')}
                              >
                                Relink…
                              </button>
                            </div>
                          )}
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
                          {active.smartObject.kind === 'embedded' &&
                            !active.smartObject.raw && (
                              <div className="linked-smart-summary">
                                <div>
                                  <strong>Embedded source document</strong>
                                  <small>
                                    {active.smartObject.embeddedDocument
                                      ? `${active.smartObject.embeddedDocument.layers.length} editable source layers`
                                      : 'Open once to create an editable layered source'}
                                  </small>
                                </div>
                                <button
                                  onClick={() => void editSmartContents()}
                                >
                                  Edit contents
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
                        <details className="layout-tools">
                          <summary>
                            Artboards &amp; layout · {artboards.length}
                          </summary>
                          <div className="layout-action-grid">
                            <button onClick={() => addArtboard(false)}>
                              Canvas artboard
                            </button>
                            <button
                              disabled={!selection}
                              onClick={() => addArtboard(true)}
                            >
                              From selection
                            </button>
                            <label className="inline-check">
                              <input
                                type="checkbox"
                                checked={showArtboards}
                                onChange={(event) =>
                                  setShowArtboards(event.target.checked)
                                }
                              />
                              Show bounds
                            </label>
                            <span className="asset-scale-options">
                              {[1, 2, 3].map((scale) => (
                                <label key={scale}>
                                  <input
                                    type="checkbox"
                                    checked={assetScales.includes(scale)}
                                    onChange={(event) =>
                                      setAssetScales((items) =>
                                        event.target.checked
                                          ? [
                                              ...new Set([...items, scale]),
                                            ].sort(
                                              (first, second) => first - second,
                                            )
                                          : items.filter(
                                              (item) => item !== scale,
                                            ),
                                      )
                                    }
                                  />
                                  {scale}×
                                </label>
                              ))}
                            </span>
                            <button
                              disabled={!artboards.length}
                              onClick={() => void exportArtboardAssets()}
                            >
                              Export assets
                            </button>
                          </div>
                          <div className="artboard-list">
                            {artboards.map((artboard) => (
                              <article
                                key={artboard.id}
                                className={
                                  activeArtboardId === artboard.id
                                    ? 'active'
                                    : ''
                                }
                              >
                                <button
                                  className="artboard-select"
                                  onClick={() =>
                                    setActiveArtboardId(artboard.id)
                                  }
                                >
                                  {artboard.name}
                                </button>
                                <label>
                                  Name
                                  <input
                                    aria-label={`${artboard.name} name`}
                                    value={artboard.name}
                                    onChange={(event) =>
                                      updateArtboard(artboard.id, {
                                        name: event.target.value,
                                      })
                                    }
                                  />
                                </label>
                                {(['x', 'y', 'w', 'h'] as const).map((key) => (
                                  <label key={key}>
                                    {key.toUpperCase()}
                                    <input
                                      aria-label={`${artboard.name} ${key}`}
                                      type="number"
                                      min={key === 'w' || key === 'h' ? 1 : 0}
                                      value={Math.round(artboard[key])}
                                      onChange={(event) =>
                                        updateArtboard(artboard.id, {
                                          [key]: +event.target.value || 0,
                                        })
                                      }
                                    />
                                  </label>
                                ))}
                                <label>
                                  Background
                                  <input
                                    aria-label={`${artboard.name} background`}
                                    type="color"
                                    value={artboard.background}
                                    onChange={(event) =>
                                      updateArtboard(artboard.id, {
                                        background: event.target.value,
                                      })
                                    }
                                  />
                                </label>
                                <label className="inline-check">
                                  <input
                                    type="checkbox"
                                    checked={artboard.exportEnabled}
                                    onChange={(event) =>
                                      updateArtboard(artboard.id, {
                                        exportEnabled: event.target.checked,
                                      })
                                    }
                                  />
                                  Export
                                </label>
                                <button
                                  aria-label={`Delete ${artboard.name}`}
                                  onClick={() => removeArtboard(artboard.id)}
                                >
                                  Delete
                                </button>
                              </article>
                            ))}
                          </div>
                          {active &&
                            active.kind !== 'group' &&
                            active.kind !== 'adjustment' && (
                              <section className="frame-controls">
                                <strong>Frame clipping</strong>
                                <button
                                  onClick={() =>
                                    addFrameToSelected('rectangle')
                                  }
                                >
                                  Rectangle
                                </button>
                                <button
                                  onClick={() => addFrameToSelected('ellipse')}
                                >
                                  Ellipse
                                </button>
                                <button
                                  disabled={!active.frame}
                                  onClick={() =>
                                    patchLayer(
                                      active.id,
                                      { frame: undefined },
                                      'Remove frame',
                                    )
                                  }
                                >
                                  Remove
                                </button>
                                {active.frame && (
                                  <small>
                                    {active.frame.w} × {active.frame.h} at{' '}
                                    {active.frame.x}, {active.frame.y} ·{' '}
                                    {active.frame.shape}
                                  </small>
                                )}
                              </section>
                            )}
                        </details>
                        <div className="property-buttons alignment-buttons">
                          <span className="alignment-key">
                            Key object: {active?.name ?? 'none'}
                          </span>
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
                          <button
                            onClick={() => smartSpaceSelected('horizontal')}
                          >
                            Space gaps H
                          </button>
                          <button
                            onClick={() => smartSpaceSelected('vertical')}
                          >
                            Space gaps V
                          </button>
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
                            <label>
                              Mask feather {active.maskFeather ?? 0}px
                            </label>
                            <Slider
                              aria-label="Properties mask feather"
                              min={0}
                              max={250}
                              value={active.maskFeather ?? 0}
                              onValueChange={(v) =>
                                patchLayer(active.id, {
                                  maskFeather: sliderNumber(v),
                                })
                              }
                              onValueCommitted={() => snapshot('Mask feather')}
                            />
                            <div className="property-buttons">
                              <button
                                onClick={() =>
                                  patchLayer(
                                    active.id,
                                    {
                                      maskLinked: active.maskLinked === false,
                                      maskTransform: normalizeMaskTransform(
                                        active.maskTransform,
                                      ),
                                    },
                                    active.maskLinked === false
                                      ? 'Link layer mask'
                                      : 'Unlink layer mask',
                                  )
                                }
                              >
                                {active.maskLinked === false
                                  ? 'Link mask'
                                  : 'Unlink mask'}
                              </button>
                              <button
                                onClick={() =>
                                  patchLayer(
                                    active.id,
                                    { maskOverlay: !active.maskOverlay },
                                    active.maskOverlay
                                      ? 'Hide mask overlay'
                                      : 'Show mask overlay',
                                  )
                                }
                              >
                                {active.maskOverlay
                                  ? 'Hide overlay'
                                  : 'Show overlay'}
                              </button>
                              <button onClick={openActiveMaskRefinement}>
                                Refine edge
                              </button>
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
                            {active.maskLinked === false && (
                              <details className="mask-transform-controls" open>
                                <summary>Independent mask transform</summary>
                                <div className="transform-grid">
                                  <label>
                                    X
                                    <input
                                      aria-label="Mask horizontal position"
                                      type="number"
                                      value={
                                        normalizeMaskTransform(
                                          active.maskTransform,
                                        ).x
                                      }
                                      onChange={(event) =>
                                        updateMaskTransform({
                                          x: Number(event.target.value),
                                        })
                                      }
                                      onBlur={() => snapshot('Move layer mask')}
                                    />
                                  </label>
                                  <label>
                                    Y
                                    <input
                                      aria-label="Mask vertical position"
                                      type="number"
                                      value={
                                        normalizeMaskTransform(
                                          active.maskTransform,
                                        ).y
                                      }
                                      onChange={(event) =>
                                        updateMaskTransform({
                                          y: Number(event.target.value),
                                        })
                                      }
                                      onBlur={() => snapshot('Move layer mask')}
                                    />
                                  </label>
                                </div>
                                <label>
                                  Rotation{' '}
                                  {
                                    normalizeMaskTransform(active.maskTransform)
                                      .rotation
                                  }
                                  °
                                </label>
                                <Slider
                                  aria-label="Mask rotation"
                                  min={-180}
                                  max={180}
                                  value={
                                    normalizeMaskTransform(active.maskTransform)
                                      .rotation
                                  }
                                  onValueChange={(value) =>
                                    updateMaskTransform({
                                      rotation: sliderNumber(value),
                                    })
                                  }
                                  onValueCommitted={() =>
                                    snapshot('Rotate layer mask')
                                  }
                                />
                                <label>
                                  Horizontal scale{' '}
                                  {Math.round(
                                    normalizeMaskTransform(active.maskTransform)
                                      .scaleX * 100,
                                  )}
                                  %
                                </label>
                                <Slider
                                  aria-label="Mask horizontal scale"
                                  min={1}
                                  max={400}
                                  value={
                                    normalizeMaskTransform(active.maskTransform)
                                      .scaleX * 100
                                  }
                                  onValueChange={(value) =>
                                    updateMaskTransform({
                                      scaleX: sliderNumber(value) / 100,
                                    })
                                  }
                                  onValueCommitted={() =>
                                    snapshot('Scale layer mask horizontally')
                                  }
                                />
                                <label>
                                  Vertical scale{' '}
                                  {Math.round(
                                    normalizeMaskTransform(active.maskTransform)
                                      .scaleY * 100,
                                  )}
                                  %
                                </label>
                                <Slider
                                  aria-label="Mask vertical scale"
                                  min={1}
                                  max={400}
                                  value={
                                    normalizeMaskTransform(active.maskTransform)
                                      .scaleY * 100
                                  }
                                  onValueChange={(value) =>
                                    updateMaskTransform({
                                      scaleY: sliderNumber(value) / 100,
                                    })
                                  }
                                  onValueCommitted={() =>
                                    snapshot('Scale layer mask vertically')
                                  }
                                />
                                <button
                                  onClick={() =>
                                    updateMaskTransform(
                                      defaultMaskTransform(),
                                      'Reset mask transform',
                                    )
                                  }
                                >
                                  Reset mask transform
                                </button>
                              </details>
                            )}
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
                        {active?.kind === 'group' && (
                          <label>
                            Group compositing
                            <select
                              aria-label="Group compositing"
                              value={active.groupIsolation ?? 'pass-through'}
                              disabled={isLocked(active.id)}
                              onChange={(event) =>
                                patchLayer(
                                  active.id,
                                  {
                                    groupIsolation: event.target
                                      .value as GroupIsolation,
                                  },
                                  'Group compositing',
                                )
                              }
                            >
                              <option value="pass-through">Pass-through</option>
                              <option value="isolated">Isolated</option>
                            </select>
                          </label>
                        )}
                        <label>
                          Knockout
                          <select
                            aria-label="Layer knockout"
                            value={active?.knockout ?? 'none'}
                            disabled={
                              !active ||
                              active.kind === 'adjustment' ||
                              isLocked(active.id)
                            }
                            onChange={(event) =>
                              active &&
                              patchLayer(
                                active.id,
                                {
                                  knockout: event.target.value as KnockoutMode,
                                },
                                'Layer knockout',
                              )
                            }
                          >
                            <option value="none">None</option>
                            <option value="shallow">Shallow</option>
                            <option value="deep">Deep</option>
                          </select>
                        </label>
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
                        <label>
                          Blend calculation
                          <select
                            aria-label="Layer blend calculation"
                            value={active?.blendSpace ?? 'gamma'}
                            disabled={
                              !active ||
                              active.kind === 'group' ||
                              active.kind === 'adjustment' ||
                              isLocked(active.id)
                            }
                            onChange={(event) =>
                              active &&
                              patchLayer(
                                active.id,
                                {
                                  blendSpace: event.target.value as BlendSpace,
                                },
                                'Layer blend calculation',
                              )
                            }
                          >
                            <option value="gamma">Gamma encoded</option>
                            <option value="linear">Linear light</option>
                          </select>
                        </label>
                        <div className="layer-effects-controls">
                          <div>
                            <strong>Layer effects</strong>
                            <span>
                              {active?.effects
                                ? `${normalizeLayerEffects(active.effects).contour} contour · ${normalizeLayerEffects(active.effects).scale}%`
                                : 'None'}
                            </span>
                          </div>
                          <div className="property-buttons">
                            <button
                              disabled={
                                !active ||
                                active.kind === 'group' ||
                                active.kind === 'adjustment' ||
                                isLocked(active.id)
                              }
                              onClick={() => setLayerStudioOpen(true)}
                            >
                              {active?.effects ? 'Edit effects' : 'Add effects'}
                            </button>
                            <button
                              disabled={!active?.effects}
                              onClick={copyLayerEffects}
                            >
                              Copy
                            </button>
                            <button
                              disabled={
                                !active ||
                                !effectsClipboardRef.current ||
                                active.kind === 'group' ||
                                active.kind === 'adjustment' ||
                                isLocked(active.id)
                              }
                              onClick={pasteLayerEffects}
                            >
                              Paste
                            </button>
                            <button
                              disabled={!active?.effects}
                              onClick={clearLayerEffects}
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                        <div className="property-buttons">
                          <button
                            disabled={!selectedIds.length}
                            onClick={copySelectedLayers}
                          >
                            Copy layers
                          </button>
                          <button
                            disabled={!layerClipboardRef.current}
                            onClick={pasteSelectedLayers}
                          >
                            Paste layers
                          </button>
                        </div>
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
                                {active?.smartObject && (
                                  <SmartObjectTransformControls
                                    value={active.smartObject.transform}
                                    onPreview={(transform) =>
                                      patchLayer(active.id, {
                                        smartObject: {
                                          ...active.smartObject!,
                                          transform,
                                        },
                                      })
                                    }
                                    onCommit={snapshot}
                                  />
                                )}
                              </>
                            )}
                            <div className="property-heading">
                              <strong>
                                {active?.kind === 'adjustment'
                                  ? 'Adjustment layer'
                                  : active?.kind === 'fill'
                                    ? 'Fill layer'
                                    : 'Layer adjustments'}
                              </strong>
                              <button
                                onClick={() => {
                                  if (active?.kind === 'fill') {
                                    updateFillLayer(defaultFillLayerRecipe());
                                    snapshot('Reset fill layer');
                                  } else resetAdjustments();
                                }}
                              >
                                Reset
                              </button>
                            </div>
                            {active?.kind === 'adjustment' ? (
                              <>
                                <Histogram
                                  sourceCanvas={displayRef.current}
                                  revision={layers}
                                />
                                <details className="scope-disclosure">
                                  <summary>Professional scopes</summary>
                                  <ColorScopes
                                    sourceCanvas={displayRef.current}
                                    revision={layers}
                                  />
                                </details>
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
                                  adjustments={active.precisionAdjustment ?? {}}
                                  onChange={updatePrecisionAdjustment}
                                  onCommit={() => snapshot('Levels adjustment')}
                                  onRequestEyedropper={(kind, channel) => {
                                    setCurveTargetChannel(null);
                                    setHueTarget(null);
                                    setLevelsTarget({ kind, channel });
                                    setStatus(
                                      `Click the image to set the ${kind} point · ${channel.toUpperCase()}`,
                                    );
                                  }}
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
                                  sourceCanvas={displayRef.current}
                                  revision={layers}
                                  onRequestTarget={(channel) => {
                                    setLevelsTarget(null);
                                    setHueTarget(null);
                                    setCurveTargetChannel(channel);
                                    setStatus(
                                      `Click the image to add a ${channel.toUpperCase()} curve point`,
                                    );
                                  }}
                                />
                                <LutControl
                                  adjustments={active.precisionAdjustment ?? {}}
                                  onChange={updatePrecisionAdjustment}
                                  onCommit={(label) => snapshot(label)}
                                />
                                <AdvancedColorControls
                                  adjustments={active.precisionAdjustment ?? {}}
                                  onChange={updatePrecisionAdjustment}
                                  onCommit={(label) => snapshot(label)}
                                  sourceCanvas={displayRef.current}
                                  onRequestHueTarget={(target) => {
                                    setCurveTargetChannel(null);
                                    setLevelsTarget(null);
                                    setHueTarget(target);
                                    setStatus(
                                      `Click the image to center the ${target} color range`,
                                    );
                                  }}
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
                            ) : active?.kind === 'fill' ? (
                              <div className="native-fill-properties">
                                <label>
                                  Fill type
                                  <select
                                    aria-label="Native fill type"
                                    value={activeFill.mode}
                                    onChange={(event) => {
                                      updateFillLayer({
                                        mode: event.target
                                          .value as FillLayerRecipe['mode'],
                                      });
                                      snapshot('Change fill type');
                                    }}
                                  >
                                    <option value="solid">Solid color</option>
                                    <option value="gradient">Gradient</option>
                                    <option value="pattern">Pattern</option>
                                  </select>
                                </label>
                                <div className="native-fill-colors">
                                  <label>
                                    Primary
                                    <input
                                      aria-label="Fill primary color"
                                      type="color"
                                      value={activeFill.color}
                                      onChange={(event) =>
                                        updateFillLayer({
                                          color: event.target.value,
                                        })
                                      }
                                      onBlur={() =>
                                        snapshot('Fill primary color')
                                      }
                                    />
                                  </label>
                                  {activeFill.mode !== 'solid' && (
                                    <label>
                                      Secondary
                                      <input
                                        aria-label="Fill secondary color"
                                        type="color"
                                        value={activeFill.color2}
                                        onChange={(event) =>
                                          updateFillLayer({
                                            color2: event.target.value,
                                          })
                                        }
                                        onBlur={() =>
                                          snapshot('Fill secondary color')
                                        }
                                      />
                                    </label>
                                  )}
                                </div>
                                {activeFill.mode === 'pattern' && (
                                  <label>
                                    Pattern
                                    <select
                                      aria-label="Fill pattern"
                                      value={activeFill.pattern}
                                      onChange={(event) => {
                                        updateFillLayer({
                                          pattern: event.target
                                            .value as FillLayerRecipe['pattern'],
                                        });
                                        snapshot('Change fill pattern');
                                      }}
                                    >
                                      <option value="checker">Checker</option>
                                      <option value="dots">Dots</option>
                                      <option value="stripes">Stripes</option>
                                    </select>
                                  </label>
                                )}
                                {activeFill.mode !== 'solid' &&
                                  (
                                    [
                                      ['Angle', 'angle', 0, 359, '°'],
                                      ['Scale', 'scale', 10, 400, '%'],
                                      [
                                        'Horizontal offset',
                                        'offsetX',
                                        -100,
                                        100,
                                        '%',
                                      ],
                                      [
                                        'Vertical offset',
                                        'offsetY',
                                        -100,
                                        100,
                                        '%',
                                      ],
                                    ] as const
                                  ).map(([label, key, min, max, suffix]) => (
                                    <div className="property-slider" key={key}>
                                      <label>
                                        {label}
                                        <span>
                                          {Math.round(activeFill[key])}
                                          {suffix}
                                        </span>
                                      </label>
                                      <Slider
                                        aria-label={`Fill ${label.toLowerCase()}`}
                                        min={min}
                                        max={max}
                                        value={activeFill[key]}
                                        onValueChange={(next) =>
                                          updateFillLayer({
                                            [key]: sliderNumber(next),
                                          })
                                        }
                                        onValueCommitted={() =>
                                          snapshot(
                                            `Fill ${label.toLowerCase()}`,
                                          )
                                        }
                                      />
                                    </div>
                                  ))}
                                <p>Native recipe · editable after reopening</p>
                              </div>
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
                        onClick={() => {
                          setTool('path');
                          setSelectedPathIds([]);
                          setSelectedAnchorIndex(0);
                          polygonDraft.current = [];
                          setDraftPoints([]);
                          setStatus('Click the canvas to draw a new work path');
                        }}
                      >
                        <PenTool />
                        Draw work path
                      </Button>
                      <section className="path-file-actions">
                        <label className="path-file-button">
                          Import SVG
                          <input
                            type="file"
                            accept="image/svg+xml,.svg"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) void importSvgPaths(file);
                              event.currentTarget.value = '';
                            }}
                          />
                        </label>
                        <button onClick={exportSvgPaths}>Export SVG</button>
                      </section>
                      <section
                        className="path-boolean-actions"
                        aria-label="Boolean path operations"
                      >
                        {(
                          [
                            ['union', 'Unite'],
                            ['subtract', 'Subtract'],
                            ['intersect', 'Intersect'],
                            ['exclude', 'Exclude'],
                          ] as const
                        ).map(([operation, label]) => (
                          <button
                            key={operation}
                            disabled={selectedPathIds.length !== 2}
                            onClick={() => combineSelectedPaths(operation)}
                          >
                            {label}
                          </button>
                        ))}
                        <small>Select exactly two paths</small>
                      </section>
                      {paths.length === 0 ? (
                        <p>
                          No saved paths. Use the Pen Path tool and close with
                          Enter.
                        </p>
                      ) : (
                        paths.map((path) => (
                          <div
                            key={path.id}
                            className={
                              selectedPathIds.includes(path.id)
                                ? 'selected'
                                : ''
                            }
                          >
                            <span>
                              <input
                                type="checkbox"
                                aria-label={`Select ${path.name} for path editing`}
                                checked={selectedPathIds.includes(path.id)}
                                onChange={(event) => {
                                  setSelectedPathIds((items) =>
                                    event.target.checked
                                      ? [
                                          path.id,
                                          ...items.filter(
                                            (item) => item !== path.id,
                                          ),
                                        ].slice(0, 2)
                                      : items.filter(
                                          (item) => item !== path.id,
                                        ),
                                  );
                                  setSelectedAnchorIndex(0);
                                }}
                              />
                              <strong>{path.name}</strong>
                              <small>
                                {path.points.length} points ·{' '}
                                {pathAnchors(path).some(
                                  (anchor) => anchor.kind === 'smooth',
                                )
                                  ? 'Bézier'
                                  : 'corner'}
                              </small>
                            </span>
                            <button onClick={() => makePathSelection(path)}>
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
                          {x.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={x.thumbnail} alt="" />
                          ) : (
                            <span
                              className="history-thumbnail-placeholder"
                              aria-hidden="true"
                            />
                          )}
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
                            aria-label={`Restore the selected layer from ${x.label}`}
                            title="Restore only the selected layer from this state"
                            disabled={
                              !selectedId ||
                              !x.layers.some((layer) => layer.id === selectedId)
                            }
                            onClick={() => restoreSelectedLayerFromSnapshot(i)}
                          >
                            Layer
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
        <div className="status-message" title={recoveryStatus}>
          <span>
            {status}
            {recoveryStatus ? ` · ${recoveryStatus}` : ''}
          </span>
          {activeJob && (
            <span className="active-job" role="status">
              <progress
                aria-label={`${activeJob.label} progress`}
                max={100}
                value={activeJob.progress}
              />
              <span>{activeJob.progress}%</span>
              <button
                type="button"
                onClick={() => activeJobAbort.current?.abort()}
              >
                Cancel
              </button>
            </span>
          )}
        </div>
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
      <ColorProfileDialog
        open={colorProfileDialog !== null}
        operation={colorProfileDialog ?? 'convert'}
        currentProfile={colorProfile}
        onClose={() => setColorProfileDialog(null)}
        onApply={applyDocumentColorProfile}
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
              disabled={rawDecodeBusy}
              onClick={exportRawRecipe}
            >
              Export recipe
            </Button>
            <Button
              variant="outline"
              disabled={rawDecodeBusy}
              onClick={() => rawRecipeFileRef.current?.click()}
            >
              Import recipe
            </Button>
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
        open={!!psdReport}
        onOpenChange={(open) => !open && setPsdReport(null)}
      >
        <DialogContent className="psd-compatibility-dialog">
          <DialogTitle>PSD compatibility report</DialogTitle>
          <DialogDescription>
            {psdReport?.fileName} · {psdReport?.dimensions}px ·{' '}
            {psdReport?.sourceDepth}-bit source
          </DialogDescription>
          {psdReport && (
            <>
              <div className={`compatibility-status ${psdReport.status}`}>
                <strong>
                  {psdReport.status === 'preserved'
                    ? 'Editable structure preserved'
                    : psdReport.status === 'converted'
                      ? 'Editable with working-depth conversion'
                      : 'Opened as a flattened saved preview'}
                </strong>
                <span>
                  {psdReport.pixelLayers} pixel layers · {psdReport.groups}{' '}
                  groups · {psdReport.masks} masks
                </span>
              </div>
              <dl className="compatibility-details">
                <div>
                  <dt>Source depth</dt>
                  <dd>{psdReport.sourceDepth}-bit</dd>
                </div>
                <div>
                  <dt>Working display</dt>
                  <dd>{psdReport.workingDepth}-bit RGBA</dd>
                </div>
              </dl>
              {psdReport.warnings.length > 0 ? (
                <ul className="compatibility-warnings">
                  {psdReport.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : (
                <p>No unsupported PSD features were reported by the decoder.</p>
              )}
              <div className="dialog-actions">
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadBlob(
                      `${psdReport.fileName}-compatibility.json`,
                      new Blob([JSON.stringify(psdReport, null, 2)], {
                        type: 'application/json',
                      }),
                    )
                  }
                >
                  Download report
                </Button>
                <Button onClick={() => setPsdReport(null)}>Done</Button>
              </div>
            </>
          )}
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
            workspace. The original RAW file is never changed. Batch develop
            exports one local PNG at a time using this recipe.
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
          <details className="raw-advanced-controls" open>
            <summary>Decode &amp; color profile</summary>
            <div className="raw-decode-grid">
              <label>
                <span>Demosaic</span>
                <select
                  aria-label="RAW demosaic quality"
                  disabled={rawDecodeBusy}
                  value={
                    rawSettings.decode?.demosaic ??
                    defaultRawDecodeSettings().demosaic
                  }
                  onChange={(event) =>
                    void redecodeRaw({
                      ...defaultRawDecodeSettings(),
                      ...rawSettings.decode,
                      demosaic: event.target
                        .value as RawDecodeSettings['demosaic'],
                    })
                  }
                >
                  {rawDemosaicModes.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>White balance source</span>
                <select
                  aria-label="RAW white balance source"
                  disabled={rawDecodeBusy}
                  value={
                    rawSettings.decode?.whiteBalance ??
                    defaultRawDecodeSettings().whiteBalance
                  }
                  onChange={(event) =>
                    void redecodeRaw({
                      ...defaultRawDecodeSettings(),
                      ...rawSettings.decode,
                      whiteBalance: event.target
                        .value as RawDecodeSettings['whiteBalance'],
                    })
                  }
                >
                  <option value="camera">As shot · camera metadata</option>
                  <option value="auto">Auto · full image</option>
                  <option value="daylight">Calibrated daylight</option>
                  <option value="tungsten">Calibrated tungsten</option>
                </select>
              </label>
              <label>
                <span>Camera profile</span>
                <select
                  aria-label="RAW camera profile"
                  disabled={rawDecodeBusy}
                  value={
                    rawSettings.decode?.cameraProfile ??
                    defaultRawDecodeSettings().cameraProfile
                  }
                  onChange={(event) =>
                    void redecodeRaw({
                      ...defaultRawDecodeSettings(),
                      ...rawSettings.decode,
                      cameraProfile: event.target
                        .value as RawDecodeSettings['cameraProfile'],
                    })
                  }
                >
                  <option value="camera-matrix">Camera color matrix</option>
                  <option value="embedded-dng">Embedded DNG/ICC profile</option>
                </select>
              </label>
            </div>
            <small className="raw-decode-note">
              {rawDecodeBusy
                ? 'Reprocessing the original sensor file…'
                : 'Decode changes reprocess the retained RAW file and remain editable in the Smart Object.'}
            </small>
          </details>
          <details className="raw-advanced-controls" open>
            <summary>Detail &amp; noise</summary>
            <div className="raw-develop-controls">
              {(
                [
                  ['Luminance denoise', 'luminance'],
                  ['Color denoise', 'chroma'],
                  ['Hot pixel removal', 'hotPixels'],
                  ['Banding removal', 'banding'],
                ] as const
              ).map(([label, key]) => (
                <label key={key}>
                  <span>{label}</span>
                  <Slider
                    aria-label={`RAW ${label.toLowerCase()}`}
                    min={0}
                    max={100}
                    value={
                      rawSettings.noise?.[key] ??
                      defaultRawNoiseCorrection()[key]
                    }
                    onValueChange={(next) =>
                      setRawSettings((current) => ({
                        ...current,
                        noise: {
                          ...defaultRawNoiseCorrection(),
                          ...current.noise,
                          [key]: sliderNumber(next),
                        } as RawNoiseCorrection,
                      }))
                    }
                  />
                  <strong>
                    {rawSettings.noise?.[key] ??
                      defaultRawNoiseCorrection()[key]}
                    %
                  </strong>
                </label>
              ))}
            </div>
          </details>
          <details className="raw-advanced-controls" open>
            <summary>Optics</summary>
            <label className="raw-profile-select">
              <span>Lens profile</span>
              <select
                aria-label="RAW lens profile"
                value={rawSettings.lensCorrection?.profileId ?? 'auto'}
                onChange={(event) =>
                  setRawSettings((current) => ({
                    ...current,
                    lensCorrection: {
                      ...defaultRawLensCorrection(),
                      ...current.lensCorrection,
                      profileId: event.target.value,
                    },
                  }))
                }
              >
                <option value="auto">Auto from lens metadata</option>
                <option value="none">No profile</option>
                {rawLensProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
              <small>
                {resolveRawLensProfile(
                  rawSettings.lensCorrection?.profileId ?? 'auto',
                  rawDevelop?.image.lens ?? '',
                )?.name ?? 'No matching local profile'}
              </small>
            </label>
            <div className="raw-develop-controls">
              {(
                [
                  ['Distortion', 'distortion', -100, 100],
                  ['Vignette', 'vignette', -100, 100],
                  ['Chromatic aberration', 'aberration', 0, 100],
                  ['Defringe', 'defringe', 0, 100],
                  ['RAW sharpening', 'sharpening', 0, 100],
                ] as const
              ).map(([label, key, min, max]) => (
                <label key={key}>
                  <span>{label}</span>
                  <Slider
                    aria-label={`RAW ${label.toLowerCase()}`}
                    min={min}
                    max={max}
                    value={
                      rawSettings.lensCorrection?.[key] ??
                      defaultRawLensCorrection()[key]
                    }
                    onValueChange={(next) =>
                      setRawSettings((current) => ({
                        ...current,
                        lensCorrection: {
                          ...defaultRawLensCorrection(),
                          ...current.lensCorrection,
                          [key]: sliderNumber(next),
                        } as RawLensCorrection,
                      }))
                    }
                  />
                  <strong>
                    {rawSettings.lensCorrection?.[key] ??
                      defaultRawLensCorrection()[key]}
                  </strong>
                </label>
              ))}
            </div>
          </details>
          <div className="dialog-actions">
            {rawBatchRunning ? (
              <Button
                variant="outline"
                onClick={() => {
                  rawBatchCancel.current = true;
                  setStatus('RAW batch will stop after the current step');
                }}
              >
                Stop batch
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={rawDecodeBusy}
                onClick={() => rawBatchFileRef.current?.click()}
              >
                Batch develop
              </Button>
            )}
            <Button
              variant="outline"
              disabled={rawDecodeBusy || rawBatchRunning}
              onClick={resetRawDevelop}
            >
              Reset
            </Button>
            <Button
              disabled={rawDecodeBusy || rawBatchRunning}
              onClick={() => void applyRawDevelop()}
            >
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
      <Dialog
        open={selectionTransformOpen}
        onOpenChange={setSelectionTransformOpen}
      >
        <DialogContent className="selection-transform-dialog">
          <DialogTitle>Transform Selection</DialogTitle>
          <DialogDescription>
            Move or scale the selection boundary without changing image pixels.
          </DialogDescription>
          <div className="transform-grid">
            <label>
              X
              <input
                aria-label="Selection horizontal offset"
                type="number"
                value={selectionTransformX}
                onChange={(event) =>
                  setSelectionTransformX(Number(event.target.value))
                }
              />
            </label>
            <label>
              Y
              <input
                aria-label="Selection vertical offset"
                type="number"
                value={selectionTransformY}
                onChange={(event) =>
                  setSelectionTransformY(Number(event.target.value))
                }
              />
            </label>
          </div>
          <label>
            Scale <strong>{selectionTransformScale}%</strong>
            <Slider
              aria-label="Selection scale"
              min={1}
              max={400}
              value={selectionTransformScale}
              onValueChange={(value) =>
                setSelectionTransformScale(sliderNumber(value))
              }
            />
          </label>
          <div className="dialog-actions">
            <Button
              variant="outline"
              onClick={() => setSelectionTransformOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={transformSelection}>Apply transform</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={selectMaskOpen} onOpenChange={setSelectMaskOpen}>
        <DialogContent className="select-mask-dialog">
          <div className="select-mask-heading">
            <div>
              <DialogTitle>Select and Mask</DialogTitle>
              <DialogDescription>
                Refine the active{' '}
                {selectMaskTarget === 'layer-mask' ? 'layer mask' : 'selection'}{' '}
                with a live, Photoshop-familiar edge preview.
              </DialogDescription>
            </div>
            <label>
              View
              <select
                aria-label="Select and Mask view mode"
                value={selectMaskPreviewMode}
                onChange={(event) =>
                  setSelectMaskPreviewMode(
                    event.target.value as SelectMaskPreviewMode,
                  )
                }
              >
                <option value="overlay">Overlay</option>
                <option value="on-black">On Black</option>
                <option value="on-white">On White</option>
                <option value="black-white">Black &amp; White</option>
                <option value="on-layers">On Layers</option>
                <option value="onion-skin">Onion Skin</option>
              </select>
            </label>
          </div>
          <div className="select-mask-workspace">
            <div className="select-mask-preview-frame">
              <SelectMaskPreview
                source={selectMaskPreviewSourceRef.current}
                mask={
                  selectMaskTarget === 'layer-mask'
                    ? ((selected() &&
                        surfacesRef.current.get(selected()!.id)?.mask) ??
                      null)
                    : selectionChannelRef.current
                }
                selection={selectionRef.current}
                mode={selectMaskPreviewMode}
                opacity={selectMaskPreviewOpacity}
                radius={refineRadius}
                smooth={refineSmooth}
                feather={refineFeather}
                shift={refineShift}
              />
              <label className="select-mask-opacity">
                Preview opacity
                <Slider
                  aria-label="Select and Mask preview opacity"
                  min={0}
                  max={100}
                  value={selectMaskPreviewOpacity}
                  onValueChange={(value) =>
                    setSelectMaskPreviewOpacity(sliderNumber(value))
                  }
                />
                <strong>{selectMaskPreviewOpacity}%</strong>
              </label>
            </div>
            <div className="select-mask-controls">
              <section>
                <h4>Edge detection</h4>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={selectMaskSmartRadius}
                    onChange={(event) =>
                      setSelectMaskSmartRadius(event.target.checked)
                    }
                  />
                  Smart Radius
                </label>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={selectMaskRefineHair}
                    onChange={(event) =>
                      setSelectMaskRefineHair(event.target.checked)
                    }
                  />
                  Refine Hair
                </label>
                {[
                  ['Radius', refineRadius, setRefineRadius, 0, 20],
                  ['Smooth', refineSmooth, setRefineSmooth, 0, 20],
                  ['Feather', refineFeather, setRefineFeather, 0, 50],
                  ['Shift Edge', refineShift, setRefineShift, -100, 100],
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
                <label>
                  <span>Detail sensitivity</span>
                  <Slider
                    aria-label="Semantic detail sensitivity"
                    min={0}
                    max={100}
                    value={semanticSensitivity}
                    onValueChange={(value) =>
                      setSemanticSensitivity(sliderNumber(value))
                    }
                  />
                  <strong>{semanticSensitivity}%</strong>
                </label>
              </section>
              <section>
                <h4>Output settings</h4>
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
                    <span>Amount</span>
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
                <label className="select-mask-output">
                  Output to
                  <select
                    aria-label="Select and Mask output"
                    value={selectMaskOutput}
                    disabled={selectMaskTarget === 'layer-mask'}
                    onChange={(event) =>
                      setSelectMaskOutput(
                        event.target.value as
                          | 'selection'
                          | 'layer-mask'
                          | 'new-layer-mask',
                      )
                    }
                  >
                    <option value="selection">Selection</option>
                    <option value="layer-mask">Layer Mask</option>
                    <option value="new-layer-mask">
                      New Layer with Layer Mask
                    </option>
                  </select>
                </label>
              </section>
            </div>
          </div>
          <div className="dialog-actions">
            <Button onClick={applySelectAndMask}>
              {selectMaskTarget === 'layer-mask'
                ? 'Apply to layer mask'
                : selectMaskOutput === 'layer-mask'
                  ? 'Create layer mask'
                  : selectMaskOutput === 'new-layer-mask'
                    ? 'Create refined layer'
                    : 'Apply refinement'}
            </Button>
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
      <DistortionWorkspaceDialog
        kind={distortionWorkspace?.kind ?? null}
        sourceCanvas={
          distortionWorkspace
            ? (surfacesRef.current.get(distortionWorkspace.layerId)?.pixels ??
              null)
            : null
        }
        width={doc.w}
        height={doc.h}
        onClose={() => setDistortionWorkspace(null)}
        onApply={applyDistortionWorkspace}
      />
      <LayerStudioDialog
        open={layerStudioOpen}
        initialEffects={active?.effects}
        onClose={() => setLayerStudioOpen(false)}
        onApply={applyLayerStudio}
      />
      <ProSuiteDialog
        open={proSuiteOpen}
        onClose={() => setProSuiteOpen(false)}
        onRun={runProFeature}
        onApplyPluginFilter={applyPluginFilterManifest}
        onPluginExport={exportWithPlugin}
        automationContext={{
          width: doc.w,
          height: doc.h,
          hasSelection: Boolean(selectionRef.current),
          layerKind: active?.textLayer
            ? 'text'
            : active?.kind === 'group'
              ? 'group'
              : active?.kind === 'adjustment'
                ? 'adjustment'
                : active?.kind === 'fill'
                  ? 'fill'
                  : 'pixel',
        }}
      />
      <PrintStudioDialog
        open={printStudioOpen}
        sources={printSources}
        onClose={() => {
          setPrintStudioOpen(false);
          printSources.forEach((source) => {
            source.canvas.width = source.canvas.height = 1;
          });
          setPrintSources([]);
        }}
      />
      <input
        ref={smartObjectFileRef}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => void applySmartFile(event.target.files?.[0])}
      />
      <input
        ref={rawRecipeFileRef}
        hidden
        type="file"
        accept=".libreRAW.json,application/json"
        onChange={(event) => void importRawRecipe(event.target.files?.[0])}
      />
      <input
        ref={rawBatchFileRef}
        hidden
        type="file"
        multiple
        accept=".arw,.cr2,.cr3,.dng,.nef,.orf,.raf,.rw2"
        onChange={(event) => void runRawBatchDevelop(event.target.files)}
      />
      <input
        ref={filterPluginFileRef}
        hidden
        type="file"
        accept=".librefilter,application/json"
        onChange={(event) => void loadFilterPlugin(event.target.files?.[0])}
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
            {selectionRepairOpen === 'fill'
              ? 'Preview the local fill and its sampling coverage. Green pixels are sampled; red pixels are replaced. Every option stays on this device and the final edit is undoable.'
              : 'LibreLayer samples the active layer around the selected area. The operation is local, selection-aware, and undoable.'}
          </DialogDescription>
          {selectionRepairOpen === 'fill' && (
            <div className="content-aware-workspace">
              <div className="content-aware-preview">
                {contentAwarePreview ? (
                  <img
                    src={contentAwarePreview}
                    alt="Live Content-Aware Fill preview with sampling overlay"
                  />
                ) : (
                  <p>{contentAwarePreviewError || 'Building live preview…'}</p>
                )}
                <span>Green sampling · Red fill target</span>
              </div>
              <div className="content-aware-controls">
                <label>
                  Sampling
                  <select
                    aria-label="Content-aware sampling mode"
                    value={contentAwareSampling}
                    onChange={(event) =>
                      setContentAwareSampling(
                        event.target.value as ContentAwareSamplingMode,
                      )
                    }
                  >
                    <option value="auto">Auto surroundings</option>
                    <option value="rectangular">Rectangular region</option>
                    <option value="custom">Custom focus point</option>
                    <option value="all-layers">All visible layers</option>
                  </select>
                </label>
                {(contentAwareSampling === 'rectangular' ||
                  contentAwareSampling === 'custom') && (
                  <div className="geometry-number-grid compact">
                    <label>
                      X
                      <input
                        aria-label="Sampling area X"
                        type="number"
                        min="0"
                        max={doc.w - 1}
                        value={contentAwareSampleX}
                        onChange={(event) =>
                          setContentAwareSampleX(+event.target.value || 0)
                        }
                      />
                    </label>
                    <label>
                      Y
                      <input
                        aria-label="Sampling area Y"
                        type="number"
                        min="0"
                        max={doc.h - 1}
                        value={contentAwareSampleY}
                        onChange={(event) =>
                          setContentAwareSampleY(+event.target.value || 0)
                        }
                      />
                    </label>
                    <label>
                      Width
                      <input
                        aria-label="Sampling area width"
                        type="number"
                        min="1"
                        max={doc.w}
                        value={contentAwareSampleW}
                        onChange={(event) =>
                          setContentAwareSampleW(+event.target.value || 1)
                        }
                      />
                    </label>
                    <label>
                      Height
                      <input
                        aria-label="Sampling area height"
                        type="number"
                        min="1"
                        max={doc.h}
                        value={contentAwareSampleH}
                        onChange={(event) =>
                          setContentAwareSampleH(+event.target.value || 1)
                        }
                      />
                    </label>
                  </div>
                )}
                <label>
                  Color adaptation <strong>{contentAwareColor}%</strong>
                  <Slider
                    aria-label="Content-aware color adaptation"
                    min={0}
                    max={100}
                    step={1}
                    value={[contentAwareColor]}
                    onValueChange={(value) =>
                      setContentAwareColor(
                        typeof value === 'number' ? value : value[0],
                      )
                    }
                  />
                </label>
                <label>
                  Rotation adaptation
                  <select
                    aria-label="Content-aware rotation adaptation"
                    value={contentAwareRotation}
                    onChange={(event) =>
                      setContentAwareRotation(
                        +event.target.value as 0 | 90 | 180 | 270,
                      )
                    }
                  >
                    <option value="0">None</option>
                    <option value="90">90°</option>
                    <option value="180">180°</option>
                    <option value="270">270°</option>
                  </select>
                </label>
                <label>
                  Scale adaptation <strong>{contentAwareScale}%</strong>
                  <Slider
                    aria-label="Content-aware scale adaptation"
                    min={25}
                    max={400}
                    step={1}
                    value={[contentAwareScale]}
                    onValueChange={(value) =>
                      setContentAwareScale(
                        typeof value === 'number' ? value : value[0],
                      )
                    }
                  />
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={contentAwareMirror}
                    onChange={(event) =>
                      setContentAwareMirror(event.target.checked)
                    }
                  />
                  Mirror source texture
                </label>
              </div>
            </div>
          )}
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
        saveLocationHealth={saveLocationHealth}
        storageStatus={storageStatus}
        onChooseSaveLocation={() => void chooseDefaultSaveDirectory()}
        onProtectStorage={() => void protectLocalStorage()}
        onRefreshStorage={() => {
          void refreshStorageStatus();
          void refreshSaveLocationHealth();
        }}
        onResetSaveLocation={() => void resetDefaultSaveDirectory()}
        scratchStatus={scratchStatus}
        onCleanScratch={() => void cleanLocalScratch()}
        performanceCheckStatus={performanceCheckStatus}
        performanceCheckRunning={performanceCheckRunning}
        onRunPerformanceCheck={() => void runLocalPerformanceCheck()}
        initialTab={settingsInitialTab}
        documentStatus={`${doc.w.toLocaleString()} × ${doc.h.toLocaleString()} px · ${layers.length} layers · ${historyRef.current.length}/${preferences.historyDepth ?? 32} history states · about ${Math.round((doc.w * doc.h * Math.max(1, layers.length) * 4) / 1048576).toLocaleString()} MB active pixels · ${activePerformancePolicy.mode} mode · ${activePerformancePolicy.pressure} pressure · ${(activePerformancePolicy.previewPixelBudget / 1_000_000).toFixed(1)} MP interactive preview`}
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
      {contextMenu && (
        <div
          className="editor-context-menu"
          role="menu"
          aria-label={`${contextMenu.kind} actions`}
          style={{
            left: Math.max(8, Math.min(contextMenu.x, window.innerWidth - 244)),
            top: Math.max(8, Math.min(contextMenu.y, window.innerHeight - 390)),
          }}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            event.preventDefault();
            const items = [
                ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  'button:not(:disabled)',
                ),
              ],
              current = items.indexOf(
                document.activeElement as HTMLButtonElement,
              ),
              direction = event.key === 'ArrowDown' ? 1 : -1;
            items[(current + direction + items.length) % items.length]?.focus();
          }}
        >
          <div className="editor-context-heading">
            {contextMenu.kind === 'document'
              ? fileName
              : contextMenu.kind === 'layer'
                ? selectedIds.length > 1
                  ? `${selectedIds.length} selected layers`
                  : (active?.name ?? 'Layer')
                : `${toolItems.find((item) => item.id === tool)?.label ?? 'Canvas'} tool`}
          </div>
          {contextMenu.kind === 'document' && (
            <>
              <button
                autoFocus
                role="menuitem"
                onClick={() => {
                  setContextMenu(null);
                  renameDocument(contextMenu.id!);
                }}
              >
                Rename document…
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setContextMenu(null);
                  void saveProject();
                }}
              >
                Save layered project… <kbd>⌘S</kbd>
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setContextMenu(null);
                  showExport();
                }}
              >
                Export image…
              </button>
              <div className="editor-context-separator" />
              <button
                role="menuitem"
                onClick={() => {
                  setContextMenu(null);
                  makeBlankDocument();
                }}
              >
                New document… <kbd>⌘N</kbd>
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setContextMenu(null);
                  closeOtherDocuments(contextMenu.id!);
                }}
                disabled={documents.length < 2}
              >
                Close other documents
              </button>
              <button
                className="destructive"
                role="menuitem"
                onClick={() => {
                  setContextMenu(null);
                  closeDocument(contextMenu.id!);
                }}
              >
                Close document
              </button>
            </>
          )}
          {contextMenu.kind === 'canvas' && (
            <>
              <button
                autoFocus
                role="menuitem"
                disabled={historyIndex.current <= 0}
                onClick={() => {
                  setContextMenu(null);
                  undo();
                }}
              >
                Undo <kbd>⌘Z</kbd>
              </button>
              <button
                role="menuitem"
                disabled={historyIndex.current >= historyRef.current.length - 1}
                onClick={() => {
                  setContextMenu(null);
                  redo();
                }}
              >
                Redo <kbd>⇧⌘Z</kbd>
              </button>
              <div className="editor-context-separator" />
              <button
                role="menuitem"
                disabled={!active || isLocked(active.id)}
                onClick={() => {
                  setContextMenu(null);
                  cutSelection();
                }}
              >
                Cut <kbd>⌘X</kbd>
              </button>
              <button
                role="menuitem"
                disabled={!active}
                onClick={() => {
                  setContextMenu(null);
                  copySelection();
                }}
              >
                Copy <kbd>⌘C</kbd>
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setContextMenu(null);
                  pasteClipboard();
                }}
              >
                Paste as new layer <kbd>⌘V</kbd>
              </button>
              <button
                role="menuitem"
                disabled={!active || isLocked(active.id)}
                onClick={() => {
                  setContextMenu(null);
                  startFreeTransform();
                }}
              >
                Free Transform <kbd>⌘T</kbd>
              </button>
              <div className="editor-context-separator" />
              <button
                role="menuitem"
                onClick={() => {
                  setContextMenu(null);
                  selectAll();
                }}
              >
                Select all <kbd>⌘A</kbd>
              </button>
              <button
                role="menuitem"
                disabled={!selection}
                onClick={() => {
                  setContextMenu(null);
                  clearSelection();
                }}
              >
                Deselect <kbd>⌘D</kbd>
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setContextMenu(null);
                  viewportRef.current?.fit();
                }}
              >
                Fit on screen <kbd>⌘0</kbd>
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setContextMenu(null);
                  viewportRef.current?.zoomAt(100);
                }}
              >
                Actual size <kbd>⌘1</kbd>
              </button>
            </>
          )}
          {contextMenu.kind === 'layer' && (
            <>
              <button
                autoFocus
                role="menuitem"
                disabled={!active || isLocked(active.id)}
                onClick={() => {
                  setContextMenu(null);
                  renameLayer();
                }}
              >
                Rename layer…
              </button>
              <button
                role="menuitem"
                disabled={!active}
                onClick={() => {
                  setContextMenu(null);
                  duplicate();
                }}
              >
                Duplicate {selectedIds.length > 1 ? 'layers' : 'layer'}{' '}
                <kbd>⌘J</kbd>
              </button>
              <button
                role="menuitem"
                disabled={!active}
                onClick={() => {
                  setContextMenu(null);
                  copySelectedLayers();
                }}
              >
                Copy {selectedIds.length > 1 ? 'layers' : 'layer'}
              </button>
              <button
                role="menuitem"
                disabled={!layerClipboardRef.current}
                onClick={() => {
                  setContextMenu(null);
                  pasteSelectedLayers();
                }}
              >
                Paste layers
              </button>
              <div className="editor-context-separator" />
              <button
                role="menuitem"
                disabled={
                  !active || active.kind === 'group' || isLocked(active.id)
                }
                onClick={() => {
                  setContextMenu(null);
                  if (active?.hasMask) removeMask();
                  else addMask();
                }}
              >
                {active?.hasMask ? 'Delete layer mask' : 'Add layer mask'}
              </button>
              <button
                role="menuitem"
                disabled={
                  !active ||
                  active.kind === 'group' ||
                  active.kind === 'adjustment' ||
                  isLocked(active.id)
                }
                onClick={() => {
                  setContextMenu(null);
                  toggleClipping();
                }}
              >
                {active?.clipping
                  ? 'Release clipping mask'
                  : 'Create clipping mask'}{' '}
                <kbd>⌥⌘G</kbd>
              </button>
              <button
                role="menuitem"
                disabled={!active}
                onClick={() => {
                  setContextMenu(null);
                  if (active)
                    patchLayer(
                      active.id,
                      { visible: !active.visible },
                      'Layer visibility',
                    );
                }}
              >
                {active?.visible ? 'Hide layer' : 'Show layer'}
              </button>
              <button
                role="menuitem"
                disabled={!active}
                onClick={() => {
                  setContextMenu(null);
                  if (active)
                    patchLayer(
                      active.id,
                      { locked: !active.locked },
                      active.locked ? 'Unlock layer' : 'Lock layer',
                    );
                }}
              >
                {active?.locked ? 'Unlock layer' : 'Lock layer'}
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setContextMenu(null);
                  createGroup();
                }}
              >
                New layer group <kbd>⌘G</kbd>
              </button>
              <button
                role="menuitem"
                disabled={!active || active.kind === 'group'}
                onClick={() => {
                  setContextMenu(null);
                  mergeDown();
                }}
              >
                Merge down <kbd>⌘E</kbd>
              </button>
              <div className="editor-context-separator" />
              <button
                className="destructive"
                role="menuitem"
                disabled={!active || isLocked(active.id)}
                onClick={() => {
                  setContextMenu(null);
                  removeLayer();
                }}
              >
                Delete {selectedIds.length > 1 ? 'layers' : 'layer'}
              </button>
            </>
          )}
        </div>
      )}
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
                    const audit = await auditRecoveryStorage();
                    setRecoveries(audit.records);
                    setRecoveryIssues(audit.issues);
                  } catch {
                    setRecoveryStatus('Could not delete this recovery copy');
                  }
                }}
              >
                Remove
              </Button>
            </div>
          ))}
          {recoveryIssues.map((issue) => (
            <div key={issue.id} className="recovery-issue" role="alert">
              <div>
                <strong>{issue.name} · damaged recovery</strong>
                <small>
                  {issue.message}
                  {issue.repairVersionUpdated
                    ? ` · intact version from ${new Date(issue.repairVersionUpdated).toLocaleString()} available`
                    : ' · no intact version available'}
                </small>
              </div>
              <Button
                variant="outline"
                disabled={!issue.repairVersionUpdated}
                onClick={async () => {
                  try {
                    await repairRecoveryFromVersion(issue.id);
                    const audit = await auditRecoveryStorage();
                    setRecoveries(audit.records);
                    setRecoveryIssues(audit.issues);
                    setRecoveryStatus(
                      `${issue.name} repaired from its newest intact version`,
                    );
                  } catch (error) {
                    setRecoveryStatus(
                      error instanceof Error
                        ? error.message
                        : 'Recovery repair failed safely',
                    );
                  }
                }}
              >
                Repair from version
              </Button>
              <Button
                variant="ghost"
                aria-label={`Remove damaged recovery ${issue.name}`}
                onClick={async () => {
                  if (
                    !confirm(
                      `Remove the damaged recovery copy of ${issue.name}? Intact dated versions are not removed.`,
                    )
                  )
                    return;
                  await deleteRecovery(issue.id);
                  const audit = await auditRecoveryStorage();
                  setRecoveries(audit.records);
                  setRecoveryIssues(audit.issues);
                }}
              >
                Remove damaged copy
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
