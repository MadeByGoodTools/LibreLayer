export type SemanticSelectionTarget = 'sky' | 'skin' | 'hair' | 'clothing';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function rgbToHsl(red: number, green: number, blue: number) {
  const r = red / 255,
    g = green / 255,
    b = blue / 255,
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    lightness = (max + min) / 2,
    delta = max - min;
  if (!delta) return { hue: 0, saturation: 0, lightness };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue =
    max === r
      ? ((g - b) / delta) % 6
      : max === g
        ? (b - r) / delta + 2
        : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  return { hue, saturation, lightness };
}

export function semanticPixelWeight(
  target: SemanticSelectionTarget,
  red: number,
  green: number,
  blue: number,
  alpha: number,
  xRatio: number,
  yRatio: number,
  sensitivity = 50,
) {
  if (alpha <= 2) return 0;
  const { hue, saturation, lightness } = rgbToHsl(red, green, blue),
    tolerance = 0.72 + clamp01(sensitivity / 100) * 0.8,
    visible = alpha / 255;
  let score = 0;
  if (target === 'sky') {
    const blueSky = clamp01(1 - Math.abs(hue - 205) / 75),
      neutralSky = clamp01((lightness - 0.55) * 2.5) * (1 - saturation),
      upperBias = clamp01(1.15 - yRatio * 1.45);
    score =
      Math.max(blueSky * (0.45 + saturation * 0.55), neutralSky) * upperBias;
  } else if (target === 'skin') {
    const skinHue =
        hue <= 55 || hue >= 345
          ? 1 - Math.min(Math.abs(hue), Math.abs(360 - hue)) / 62
          : 0,
      channelShape =
        clamp01((red - blue + 34) / 110) * clamp01((red - green + 52) / 100),
      tone = clamp01(1 - Math.abs(lightness - 0.53) / 0.58);
    score = skinHue * channelShape * tone * (0.7 + saturation * 0.3);
  } else if (target === 'hair') {
    const darkHair = clamp01((0.63 - lightness) / 0.5),
      coloredHair =
        clamp01(saturation * 1.2) * clamp01((0.82 - lightness) / 0.65),
      headBias =
        clamp01(1.2 - yRatio * 1.15) * clamp01(1.3 - Math.abs(xRatio - 0.5));
    score = Math.max(darkHair, coloredHair * 0.72) * headBias;
  } else {
    const lowerBias = clamp01((yRatio - 0.28) * 1.55),
      skinLike = semanticPixelWeight(
        'skin',
        red,
        green,
        blue,
        alpha,
        xRatio,
        yRatio,
        50,
      ),
      material = Math.max(
        saturation * 0.95,
        clamp01(Math.abs(lightness - 0.72) * 1.35),
      );
    score = lowerBias * material * (1 - skinLike * 0.9);
  }
  return clamp01(score * tolerance) * visible;
}
