import {
  validRecipeStep,
  type EditRecipeStep,
} from './edit-recipe.ts';
import {
  applySuitePixelOperation,
  suiteFeatures,
} from './pro-suite.ts';

export const ACTION_SET_FORMAT = 'librelayer-action-set';
export const ACTION_SET_VERSION = 1;
export const DROPLET_FORMAT = 'librelayer-droplet';
export const DROPLET_VERSION = 1;

export type ActionCondition =
  | 'always'
  | 'has-selection'
  | 'no-selection'
  | 'pixel-layer'
  | 'text-layer'
  | 'landscape'
  | 'portrait'
  | 'square';

export type AutomationContext = {
  width: number;
  height: number;
  hasSelection: boolean;
  layerKind: 'pixel' | 'text' | 'shape' | 'group' | 'adjustment' | 'fill';
};

export type ActionStep = EditRecipeStep & {
  id: string;
  enabled: boolean;
  condition: ActionCondition;
  stopOnFailure: boolean;
};

export type AutomationAction = {
  id: string;
  name: string;
  steps: ActionStep[];
};

export type ActionSet = {
  format: typeof ACTION_SET_FORMAT;
  version: typeof ACTION_SET_VERSION;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  actions: AutomationAction[];
};

export type ImageProcessorOptions = {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  maxEdge: number;
  suffix: string;
};

export type AutomationDroplet = {
  format: typeof DROPLET_FORMAT;
  version: typeof DROPLET_VERSION;
  name: string;
  action: AutomationAction;
  output: ImageProcessorOptions;
};

const conditions = new Set<ActionCondition>([
  'always',
  'has-selection',
  'no-selection',
  'pixel-layer',
  'text-layer',
  'landscape',
  'portrait',
  'square',
]);

const boundedName = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') throw Error(`${fallback} name is invalid.`);
  const name = value.trim();
  if (!name || name.length > 120) throw Error(`${fallback} name is invalid.`);
  return name;
};

const boundedId = (value: unknown) => {
  if (
    typeof value !== 'string' ||
    !/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(value)
  )
    throw Error('Automation id is invalid.');
  return value;
};

export const normalizeImageProcessorOptions = (
  value: Partial<ImageProcessorOptions> = {},
): ImageProcessorOptions => {
  const format = ['png', 'jpeg', 'webp'].includes(value.format ?? '')
      ? value.format!
      : 'png',
    quality = Number(value.quality ?? 90),
    maxEdge = Number(value.maxEdge ?? 0),
    suffix = typeof value.suffix === 'string' ? value.suffix.trim() : '-edited';
  if (!Number.isFinite(quality) || quality < 1 || quality > 100)
    throw Error('Image Processor quality must be between 1 and 100.');
  if (!Number.isInteger(maxEdge) || maxEdge < 0 || maxEdge > 32768)
    throw Error('Image Processor maximum edge must be 0 to 32,768 pixels.');
  if (suffix.length > 40 || /[\\/:*?"<>|]/.test(suffix))
    throw Error('Image Processor filename suffix is invalid.');
  return { format, quality, maxEdge, suffix };
};

const normalizeStep = (value: unknown): ActionStep => {
  if (!value || typeof value !== 'object') throw Error('Action step is invalid.');
  if (!validRecipeStep(value)) throw Error('Action step command is invalid.');
  const validStep = value as ActionStep;
  if (
    typeof validStep.enabled !== 'boolean' ||
    typeof validStep.stopOnFailure !== 'boolean' ||
    !conditions.has(validStep.condition)
  )
    throw Error('Action step settings are invalid.');
  return {
    id: boundedId(validStep.id),
    command: validStep.command,
    options: { ...validStep.options },
    enabled: validStep.enabled,
    condition: validStep.condition,
    stopOnFailure: validStep.stopOnFailure,
  };
};

const normalizeAction = (value: unknown): AutomationAction => {
  if (!value || typeof value !== 'object') throw Error('Action is invalid.');
  const action = value as Partial<AutomationAction>;
  if (!Array.isArray(action.steps) || action.steps.length < 1 || action.steps.length > 100)
    throw Error('An action must contain 1 to 100 steps.');
  const steps = action.steps.map(normalizeStep);
  if (new Set(steps.map((step) => step.id)).size !== steps.length)
    throw Error('Action step ids must be unique.');
  return {
    id: boundedId(action.id),
    name: boundedName(action.name, 'Action'),
    steps,
  };
};

export function createActionSet(
  name: string,
  actions: AutomationAction[],
  id = crypto.randomUUID(),
): ActionSet {
  const now = new Date().toISOString(),
    normalized = actions.map(normalizeAction);
  if (!normalized.length || normalized.length > 50)
    throw Error('An action set must contain 1 to 50 actions.');
  if (new Set(normalized.map((action) => action.id)).size !== normalized.length)
    throw Error('Action ids must be unique.');
  return {
    format: ACTION_SET_FORMAT,
    version: ACTION_SET_VERSION,
    id: boundedId(id),
    name: boundedName(name, 'Action set'),
    createdAt: now,
    updatedAt: now,
    actions: normalized,
  };
}

export function parseActionSet(text: string): ActionSet {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw Error('This action set is not valid JSON.');
  }
  if (!value || typeof value !== 'object') throw Error('This action set is invalid.');
  const set = value as Partial<ActionSet>;
  if (
    set.format !== ACTION_SET_FORMAT ||
    set.version !== ACTION_SET_VERSION ||
    !Array.isArray(set.actions) ||
    set.actions.length < 1 ||
    set.actions.length > 50 ||
    typeof set.createdAt !== 'string' ||
    typeof set.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(set.createdAt)) ||
    !Number.isFinite(Date.parse(set.updatedAt))
  )
    throw Error('This LibreLayer action set is invalid or unsupported.');
  const result = createActionSet(
    boundedName(set.name, 'Action set'),
    set.actions.map(normalizeAction),
    boundedId(set.id),
  );
  result.createdAt = set.createdAt;
  result.updatedAt = set.updatedAt;
  return result;
}

export const conditionMatches = (
  condition: ActionCondition,
  context: AutomationContext,
) => {
  if (condition === 'always') return true;
  if (condition === 'has-selection') return context.hasSelection;
  if (condition === 'no-selection') return !context.hasSelection;
  if (condition === 'pixel-layer') return context.layerKind === 'pixel';
  if (condition === 'text-layer') return context.layerKind === 'text';
  if (condition === 'landscape') return context.width > context.height;
  if (condition === 'portrait') return context.height > context.width;
  return context.width === context.height;
};

export const actionExecutionPlan = (
  action: AutomationAction,
  context: AutomationContext,
) =>
  normalizeAction(action).steps.map((step) => ({
    step,
    run: step.enabled && conditionMatches(step.condition, context),
  }));

export function createDroplet(
  name: string,
  action: AutomationAction,
  output: Partial<ImageProcessorOptions>,
): AutomationDroplet {
  return {
    format: DROPLET_FORMAT,
    version: DROPLET_VERSION,
    name: boundedName(name, 'Droplet'),
    action: normalizeAction(action),
    output: normalizeImageProcessorOptions(output),
  };
}

export function parseDroplet(text: string): AutomationDroplet {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw Error('This droplet is not valid JSON.');
  }
  if (!value || typeof value !== 'object') throw Error('This droplet is invalid.');
  const droplet = value as Partial<AutomationDroplet>;
  if (droplet.format !== DROPLET_FORMAT || droplet.version !== DROPLET_VERSION)
    throw Error('This LibreLayer droplet is invalid or unsupported.');
  return createDroplet(
    boundedName(droplet.name, 'Droplet'),
    normalizeAction(droplet.action),
    normalizeImageProcessorOptions(droplet.output),
  );
}

export const processorOutputName = (
  sourceName: string,
  options: ImageProcessorOptions,
) => {
  const base = sourceName.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '-') || 'image';
  const extension = options.format === 'jpeg' ? 'jpg' : options.format;
  return `${base}${options.suffix}.${extension}`;
};

/** Run the pixel-capable portion of an action without touching the source. */
export function applyPixelAction(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  action: AutomationAction,
) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    source.length !== width * height * 4
  )
    throw Error('Image Processor received invalid pixel dimensions.');
  const context: AutomationContext = {
      width,
      height,
      hasSelection: false,
      layerKind: 'pixel',
    },
    plan = actionExecutionPlan(action, context),
    pixels = new Uint8ClampedArray(source);
  let image = { data: pixels, width, height } as ImageData,
    applied = 0,
    skipped = 0;
  for (const entry of plan) {
    const feature = suiteFeatures.find((item) => item.command === entry.step.command);
    if (!entry.run || feature?.kind !== 'pixel') {
      skipped++;
      continue;
    }
    try {
      image = applySuitePixelOperation(image, entry.step.command, entry.step.options);
      applied++;
    } catch (error) {
      if (entry.step.stopOnFailure) throw error;
      skipped++;
    }
  }
  return { pixels: new Uint8ClampedArray(image.data), applied, skipped };
}
