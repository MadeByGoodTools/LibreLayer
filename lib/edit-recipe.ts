import {
  suiteFeatures,
  type SuiteFeature,
  type SuiteOptions,
} from './pro-suite.ts';

export type EditRecipeStep = {
  command: string;
  options: SuiteOptions;
};

export type EditRecipe = {
  format: 'librelayer-edit-recipe';
  version: 1;
  name: string;
  createdAt: string;
  steps: EditRecipeStep[];
};

const commands = new Set(suiteFeatures.map((feature) => feature.command));
const validHex = (value: unknown) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const boundedPercent = (value: unknown) =>
  Number.isFinite(value) && Number(value) >= 0 && Number(value) <= 100;

export function validRecipeStep(value: unknown): value is EditRecipeStep {
  if (!value || typeof value !== 'object') return false;
  const step = value as Partial<EditRecipeStep>,
    options = step.options as Partial<SuiteOptions> | undefined;
  return Boolean(
    typeof step.command === 'string' &&
    commands.has(step.command) &&
    options &&
    boundedPercent(options.amount) &&
    boundedPercent(options.secondary) &&
    validHex(options.color) &&
    typeof options.text === 'string' &&
    options.text.length <= 160,
  );
}

export function createEditRecipe(
  name: string,
  steps: EditRecipeStep[],
): EditRecipe {
  if (!steps.length || steps.length > 100 || !steps.every(validRecipeStep))
    throw Error('A workflow recipe must contain 1 to 100 valid editing steps.');
  return {
    format: 'librelayer-edit-recipe',
    version: 1,
    name: name.trim().slice(0, 120) || 'Untitled workflow',
    createdAt: new Date().toISOString(),
    steps: steps.map((step) => ({
      command: step.command,
      options: { ...step.options },
    })),
  };
}

export function parseEditRecipe(text: string): EditRecipe {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw Error('This workflow is not valid JSON.');
  }
  if (!value || typeof value !== 'object')
    throw Error('This workflow file is invalid.');
  const recipe = value as Partial<EditRecipe>;
  if (
    recipe.format !== 'librelayer-edit-recipe' ||
    recipe.version !== 1 ||
    typeof recipe.name !== 'string' ||
    recipe.name.length > 120 ||
    typeof recipe.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(recipe.createdAt)) ||
    !Array.isArray(recipe.steps) ||
    recipe.steps.length < 1 ||
    recipe.steps.length > 100 ||
    !recipe.steps.every(validRecipeStep)
  )
    throw Error('This LibreLayer workflow is invalid or unsupported.');
  return {
    format: 'librelayer-edit-recipe',
    version: 1,
    name: recipe.name.trim() || 'Untitled workflow',
    createdAt: recipe.createdAt,
    steps: recipe.steps.map((step) => ({
      command: step.command,
      options: { ...step.options },
    })),
  };
}

export function resolveRecipeFeature(command: string): SuiteFeature {
  const feature = suiteFeatures.find((item) => item.command === command);
  if (!feature) throw Error(`Unsupported workflow command: ${command}`);
  return feature;
}

/** Build a deterministic, device-local edit plan without sending prompt text away. */
export function planLocalEdit(
  prompt: string,
  options: SuiteOptions,
): EditRecipeStep[] {
  const normalized = prompt.toLowerCase(),
    commands: string[] = [];
  const add = (command: string) => {
    if (!commands.includes(command)) commands.push(command);
  };
  if (/black.?and.?white|monochrome|grayscale/.test(normalized))
    add('desaturate');
  if (/contrast|punch|flat|pop/.test(normalized)) add('auto-contrast');
  if (/bright|exposure|shadow|highlight|recover/.test(normalized))
    add('shadows-highlights');
  if (/white balance|warm|cool|temperature|color cast/.test(normalized))
    add('auto-color');
  if (/match|harmoni[sz]e|cohesive/.test(normalized)) add('match-color');
  if (/noise|grain|denoise|dust/.test(normalized)) add('median-dust');
  if (/sharp|detail|clarity|crisp/.test(normalized)) add('smart-sharpen');
  if (/soft|dream|glow|blur/.test(normalized)) add('blur-gallery');
  if (/vintage|film|cinematic|stylized|grade/.test(normalized))
    add('filter-gallery');
  if (/upscale|larger|enlarge|resolution/.test(normalized))
    add('generative-upscale');
  if (!commands.length) add('auto-color');
  return commands.slice(0, 8).map((command) => ({
    command,
    options: { ...options, text: prompt.slice(0, 160) },
  }));
}
