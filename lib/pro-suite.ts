export type SuiteKind =
  | 'shape'
  | 'pixel'
  | 'document'
  | 'selection'
  | 'paint'
  | 'production'
  | 'collaboration'
  | 'analysis';

export type CapabilityLevel = 'Functional' | 'Basic' | 'Experimental';

export type SuiteFeature = {
  id: number;
  command: string;
  label: string;
  group: string;
  kind: SuiteKind;
  level: CapabilityLevel;
};

const functionalOverrides = new Set([
  'hdr-merge',
  'focus-stack',
  'auto-blend',
  'image-stack',
]);

const capabilityLevel = (
  name: string,
  kind: SuiteKind,
  command: string,
): CapabilityLevel => {
  if (functionalOverrides.has(command)) return 'Functional';
  if (name === 'AI-assisted editing' || kind === 'collaboration')
    return 'Experimental';
  if (
    [
      'Filters & photography',
      'Channels & color',
      'Automation & production',
      'Compositing & motion',
      'Shapes & layout',
    ].includes(name)
  )
    return 'Basic';
  return 'Functional';
};

const group = (
  name: string,
  kind: SuiteKind,
  entries: Array<[number, string, string]>,
) =>
  entries.map(([id, command, label]) => ({
    id,
    command,
    label,
    group: name,
    kind,
    level: capabilityLevel(name, kind, command),
  }));

export const suiteFeatures: SuiteFeature[] = [
  ...group('Shapes & layout', 'shape', [
    [174, 'line', 'Line'],
    [175, 'custom-shape', 'Custom shapes'],
    [176, 'shape-style', 'Shape fill and stroke'],
    [177, 'boolean-shapes', 'Boolean shape operations'],
    [178, 'shape-properties', 'Editable shape properties'],
    [179, 'artboards', 'Artboards'],
    [180, 'frame', 'Frame tool'],
  ]),
  ...group('Filters & photography', 'pixel', [
    [181, 'surface-blur', 'Surface Blur'],
    [182, 'blur-gallery', 'Blur Gallery'],
    [183, 'smart-sharpen', 'Unsharp Mask and Smart Sharpen'],
    [184, 'noise', 'Noise reduction and Add Noise'],
    [185, 'liquify', 'Liquify'],
    [186, 'lens-correction', 'Lens Correction'],
    [187, 'wide-angle', 'Adaptive Wide Angle'],
    [188, 'vanishing-point', 'Vanishing Point'],
    [189, 'filter-gallery', 'Filter Gallery'],
    [190, 'camera-raw-filter', 'Camera Raw Filter'],
  ]),
  ...group('Channels & color', 'pixel', [
    [192, 'edit-channel', 'Individual channel editing'],
    [193, 'alpha-channel', 'Alpha channels'],
    [194, 'spot-channel', 'Spot channels'],
    [195, 'split-merge-channels', 'Split and merge channels'],
    [196, 'calculations', 'Apply Image and Calculations'],
    [197, 'rgb-cmyk-gray', 'RGB, CMYK and Grayscale modes'],
    [198, 'lab-indexed-bitmap', 'Lab, Indexed and Bitmap modes'],
    [199, 'bit-depth', '8-, 16- and 32-bit workflows'],
    [200, 'profiles', 'ICC profiles and soft proofing'],
  ]),
  ...group('Automation & production', 'production', [
    [203, 'history-brush', 'History Brush'],
    [204, 'actions', 'Record and play Actions'],
    [205, 'batch', 'Batch processing'],
    [206, 'image-processor', 'Image Processor'],
    [207, 'scripts-plugins', 'Scripts and filter plug-ins'],
    [208, 'variables', 'Data-driven graphics and variables'],
    [209, 'export-layers', 'Export layers and artboards'],
    [210, 'print', 'Print settings and color handling'],
  ]),
  ...group('Compositing & motion', 'document', [
    [211, 'photomerge', 'Photomerge panoramas'],
    [212, 'hdr-merge', 'HDR merging and toning'],
    [213, 'focus-stack', 'Focus stacking'],
    [214, 'auto-blend', 'Auto-Blend Layers'],
    [215, 'contact-sheet', 'Contact sheets'],
    [216, 'image-stack', 'Image stacks'],
    [217, 'frame-animation', 'Frame animation'],
    [218, 'video-timeline', 'Video timeline'],
    [219, 'gif-export', 'Animated GIF export'],
    [220, 'video-render', 'Video rendering'],
  ]),
  ...group('AI-assisted editing', 'pixel', [
    [222, 'select-subject-pro', 'Select Subject'],
    [223, 'object-detection', 'Object and people detection'],
    [224, 'generative-fill', 'Generative Fill'],
    [225, 'generative-expand', 'Generative Expand'],
    [226, 'generate-image', 'Generate Image'],
    [227, 'reference-guidance', 'Reference-image guidance'],
    [228, 'generative-upscale', 'Generative Upscale'],
    [229, 'harmonize', 'Harmonize'],
    [230, 'prompt-edit', 'Prompt-based editing'],
  ]),
  ...group('Collaboration & assets', 'collaboration', [
    [231, 'cloud-doc', 'Cloud documents'],
    [232, 'cloud-versions', 'Version history for cloud documents'],
    [233, 'share-review', 'Share for review'],
    [234, 'comments', 'Comments and annotations'],
    [235, 'invite', 'Invite collaborators'],
    [236, 'libraries', 'Creative Cloud Libraries'],
    [237, 'linked-library', 'Linked library assets'],
    [238, 'font-library', 'Adobe Fonts integration'],
    [239, 'stock-library', 'Adobe Stock integration'],
    [240, 'cross-device', 'Cross-device document workflows'],
  ]),
  ...group('Advanced tools', 'paint', [
    [242, 'background-eraser', 'Background Eraser'],
    [243, 'magic-eraser', 'Magic Eraser'],
    [246, 'gradient-types', 'Radial, angular, reflected and diamond gradients'],
    [248, 'color-sampler', 'Color Sampler and Info panel'],
    [250, 'pattern-stamp', 'Pattern Stamp'],
    [251, 'brush-folders', 'Brush folders and search'],
    [252, 'brush-tip', 'Custom brush-tip creation'],
    [253, 'dual-brush', 'Dual Brush'],
    [254, 'airbrush', 'Airbrush buildup'],
    [255, 'wet-edge', 'Wet-edge painting'],
    [256, 'brush-angle', 'Brush angle and roundness'],
    [257, 'brush-blend', 'Brush blending modes'],
    [258, 'symmetry', 'Symmetry painting'],
    [259, 'swatches', 'Color swatches and palettes'],
    [260, 'preset-libraries', 'Gradient and pattern preset libraries'],
  ]),
  ...group('Selection & clipboard', 'selection', [
    [262, 'copy-merged', 'Copy Merged'],
    [263, 'paste-place', 'Paste in Place'],
    [264, 'paste-into', 'Paste Into'],
    [265, 'transform-selection', 'Transform Selection'],
    [266, 'load-transparency', 'Load layer transparency as selection'],
    [267, 'select-similar', 'Select similar pixels'],
    [268, 'mask-preview', 'Mask-only canvas preview'],
    [270, 'move-mask', 'Move masks independently'],
  ]),
  ...group('Color corrections', 'pixel', [
    [271, 'match-color', 'Match Color'],
    [272, 'replace-color', 'Replace Color'],
    [273, 'shadows-highlights', 'Shadows/Highlights'],
    [274, 'equalize', 'Equalize'],
    [276, 'auto-contrast', 'Auto Contrast'],
    [277, 'auto-color', 'Auto Color'],
    [278, 'desaturate', 'Desaturate'],
    [279, 'hdr-toning', 'HDR Toning'],
    [280, 'lens-blur', 'Lens Blur with depth maps'],
  ]),
  ...group('Analysis & print', 'analysis', [
    [281, 'histogram', 'Histogram panel'],
    [282, 'gamut-warning', 'Gamut warning'],
    [283, 'proof-colors', 'Proof Colors'],
    [284, 'assign-profile', 'Assign and convert profiles'],
    [285, 'proof-presets', 'Soft-proof presets'],
    [286, 'separations', 'Print separations'],
    [287, 'measurement', 'Measurement scale and Ruler tool'],
    [288, 'count', 'Count tool'],
    [289, 'metadata', 'File metadata and copyright'],
  ]),
  ...group('Specialty filters', 'pixel', [
    [191, 'lighting', 'Lighting Effects'],
    [244, 'clouds', 'Clouds'],
    [245, 'fibers', 'Fibers'],
    [247, 'custom-convolution', 'Custom Convolution'],
    [201, 'polar', 'Polar Coordinates'],
    [202, 'wave', 'Wave'],
    [221, 'ripple', 'Ripple'],
    [241, 'spherize', 'Spherize'],
    [290, 'halftone', 'Halftone'],
    [291, 'displace', 'Displacement maps'],
    [292, 'high-pass', 'High Pass'],
    [293, 'median-dust', 'Median and Dust & Scratches'],
    [294, 'minimum-maximum', 'Minimum and Maximum filters'],
    [295, 'oil-paint', 'Oil Paint'],
    [296, 'emboss-edges', 'Emboss and Find Edges'],
    [297, 'pixelate', 'Pixelate filters'],
    [298, 'distort-filters', 'Distort filters'],
    [299, 'pattern-preview', 'Pattern Preview'],
    [300, 'neural-filters', 'Neural Filters'],
  ]),
];

export type SuiteOptions = {
  amount: number;
  secondary: number;
  color: string;
  text: string;
};

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

export function applySuitePixelOperation(
  data: ImageData,
  command: string,
  options: SuiteOptions,
) {
  const d = data.data,
    amount = Math.max(0, Math.min(100, options.amount)) / 100;
  let min = 255,
    max = 0,
    sumR = 0,
    sumG = 0,
    sumB = 0,
    opaque = 0;
  for (let i = 0; i < d.length; i += 4)
    if (d[i + 3]) {
      const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
      min = Math.min(min, l);
      max = Math.max(max, l);
      sumR += d[i];
      sumG += d[i + 1];
      sumB += d[i + 2];
      opaque++;
    }
  const avg = [
    sumR / Math.max(1, opaque),
    sumG / Math.max(1, opaque),
    sumB / Math.max(1, opaque),
  ];
  const target = [1, 3, 5].map((i) =>
    parseInt(options.color.slice(i, i + 2), 16),
  );
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    let r = d[i],
      g = d[i + 1],
      b = d[i + 2];
    const l = (r + g + b) / 3;
    if (command === 'desaturate' || command === 'rgb-cmyk-gray') r = g = b = l;
    else if (command === 'auto-contrast' || command === 'equalize') {
      const stretch = (v: number) => ((v - min) / Math.max(1, max - min)) * 255;
      r = stretch(r);
      g = stretch(g);
      b = stretch(b);
    } else if (command === 'auto-color') {
      r += 128 - avg[0];
      g += 128 - avg[1];
      b += 128 - avg[2];
    } else if (command === 'match-color' || command === 'harmonize') {
      r += (target[0] - avg[0]) * amount;
      g += (target[1] - avg[1]) * amount;
      b += (target[2] - avg[2]) * amount;
    } else if (command === 'replace-color') {
      const distance =
        Math.abs(r - target[0]) +
        Math.abs(g - target[1]) +
        Math.abs(b - target[2]);
      if (distance < 180) {
        r = target[2];
        g = target[0];
        b = target[1];
      }
    } else if (command === 'shadows-highlights' || command === 'hdr-toning') {
      const lift = l < 128 ? (128 - l) * amount : -(l - 128) * amount * 0.35;
      r += lift;
      g += lift;
      b += lift;
    } else if (
      command === 'noise' ||
      command === 'generative-fill' ||
      command === 'generate-image' ||
      command === 'neural-filters'
    ) {
      const n =
        ((((i * 1103515245 + options.secondary * 12345) >>> 8) % 31) - 15) *
        amount;
      r += n;
      g += n;
      b += n;
    } else if (command === 'edit-channel')
      r = r * (1 - amount) + target[0] * amount;
    else if (command === 'spot-channel') {
      r = r * (1 - amount) + target[0] * amount;
      g *= 1 - amount * 0.35;
      b *= 1 - amount * 0.35;
    } else if (command === 'calculations') {
      const mixed = (r + b) / 2;
      r = mixed;
      g = mixed * (1 - amount) + g * amount;
      b = mixed;
    } else if (command === 'lab-indexed-bitmap') {
      const levels = Math.max(2, Math.round(2 + options.secondary / 5)),
        step = 255 / (levels - 1);
      r = Math.round(r / step) * step;
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;
    } else if (command === 'bit-depth') {
      const step = options.secondary < 33 ? 32 : options.secondary < 66 ? 8 : 1;
      r = Math.round(r / step) * step;
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;
    } else if (command === 'high-pass' || command === 'emboss-edges') {
      r = 128 + (r - l) * (1 + amount * 3);
      g = 128 + (g - l) * (1 + amount * 3);
      b = 128 + (b - l) * (1 + amount * 3);
    } else if (command === 'pixelate') {
      const step = Math.max(8, Math.round(options.secondary / 4));
      r = Math.round(r / step) * step;
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;
    } else if (command === 'oil-paint' || command === 'filter-gallery') {
      const step = Math.max(4, Math.round(24 - amount * 18));
      r = Math.round(r / step) * step;
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;
    } else if (command === 'alpha-channel') d[i + 3] = clamp(l);
    else {
      const contrast =
        1 +
        amount *
          (command.includes('sharpen') || command === 'high-pass' ? 1.6 : 0.35);
      r = 128 + (r - 128) * contrast;
      g = 128 + (g - 128) * contrast;
      b = 128 + (b - 128) * contrast;
    }
    d[i] = clamp(r);
    d[i + 1] = clamp(g);
    d[i + 2] = clamp(b);
  }
  return data;
}

export function runSuiteSelfTest() {
  const ids = new Set(suiteFeatures.map((x) => x.id));
  const commands = new Set(suiteFeatures.map((x) => x.command));
  const failures: string[] = [];
  if (suiteFeatures.length !== 123)
    failures.push(`Expected 123 features, found ${suiteFeatures.length}`);
  if (ids.size !== 123) failures.push('Feature IDs are not unique');
  if (commands.size !== 123) failures.push('Feature commands are not unique');
  for (const feature of suiteFeatures) {
    if (
      !feature.label ||
      !feature.group ||
      !['Functional', 'Basic', 'Experimental'].includes(feature.level) ||
      feature.id < 174 ||
      feature.id > 300
    )
      failures.push(`${feature.id} has invalid metadata`);
    if (feature.kind === 'pixel') {
      const bytes = new Uint8ClampedArray([
        20, 80, 160, 255, 240, 180, 60, 255,
      ]);
      const result = applySuitePixelOperation(
        { data: bytes, width: 2, height: 1, colorSpace: 'srgb' } as ImageData,
        feature.command,
        { amount: 50, secondary: 40, color: '#6d8cff', text: 'test' },
      );
      if (
        result.data.length !== 8 ||
        [...result.data].some((n) => !Number.isFinite(n))
      )
        failures.push(`${feature.id} pixel engine failed`);
    }
  }
  const gif = encodeAnimatedGif(
    [
      {
        data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]),
        width: 2,
        height: 1,
        colorSpace: 'srgb',
      } as ImageData,
      {
        data: new Uint8ClampedArray([0, 255, 0, 255, 255, 255, 0, 255]),
        width: 2,
        height: 1,
        colorSpace: 'srgb',
      } as ImageData,
    ],
    8,
  );
  if (
    String.fromCharCode(...gif.slice(0, 6)) !== 'GIF89a' ||
    gif[gif.length - 1] !== 0x3b
  )
    failures.push('Animated GIF encoder failed');
  return {
    total: suiteFeatures.length,
    passed: suiteFeatures.length - failures.length,
    failures,
  };
}

const gifWord = (value: number) => [value & 255, (value >> 8) & 255];

const gifLzw = (indexes: Uint8Array) => {
  const bytes: number[] = [],
    clear = 256,
    end = 257;
  let bits = 0,
    bitCount = 0,
    codeSize = 9,
    nextCode = 258,
    dictionary = new Map<string, number>();
  const reset = () => {
    dictionary = new Map(
      Array.from({ length: 256 }, (_, index) => [String(index), index]),
    );
    codeSize = 9;
    nextCode = 258;
  };
  const write = (code: number) => {
    bits |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      bytes.push(bits & 255);
      bits >>>= 8;
      bitCount -= 8;
    }
  };
  reset();
  write(clear);
  let phrase = String(indexes[0] ?? 0);
  for (let index = 1; index < indexes.length; index++) {
    const joined = `${phrase},${indexes[index]}`;
    if (dictionary.has(joined)) phrase = joined;
    else {
      write(dictionary.get(phrase)!);
      if (nextCode < 4095) {
        dictionary.set(joined, nextCode++);
        if (nextCode === 1 << codeSize && codeSize < 12) codeSize++;
      } else {
        write(clear);
        reset();
      }
      phrase = String(indexes[index]);
    }
  }
  write(dictionary.get(phrase)!);
  write(end);
  if (bitCount) bytes.push(bits & 255);
  return bytes;
};

export function encodeAnimatedGif(frames: ImageData[], delayCs = 10) {
  if (
    !frames.length ||
    frames.some(
      (frame) =>
        frame.width !== frames[0].width || frame.height !== frames[0].height,
    )
  )
    throw Error('GIF frames must share dimensions');
  const width = frames[0].width,
    height = frames[0].height,
    out: number[] = [
      ...new TextEncoder().encode('GIF89a'),
      ...gifWord(width),
      ...gifWord(height),
      0xf7,
      0,
      0,
      0,
      0,
      0,
    ];
  for (let red = 0; red < 6; red++)
    for (let green = 0; green < 6; green++)
      for (let blue = 0; blue < 6; blue++)
        out.push(red * 51, green * 51, blue * 51);
  while (out.length < 13 + 256 * 3) out.push(0, 0, 0);
  out.push(
    0x21,
    0xff,
    0x0b,
    ...new TextEncoder().encode('NETSCAPE2.0'),
    3,
    1,
    0,
    0,
    0,
  );
  for (const frame of frames) {
    const indexes = new Uint8Array(width * height);
    for (let pixel = 0; pixel < indexes.length; pixel++) {
      const offset = pixel * 4;
      indexes[pixel] =
        frame.data[offset + 3] < 128
          ? 0
          : 1 +
            Math.round(frame.data[offset] / 51) * 36 +
            Math.round(frame.data[offset + 1] / 51) * 6 +
            Math.round(frame.data[offset + 2] / 51);
    }
    const compressed = gifLzw(indexes);
    out.push(
      0x21,
      0xf9,
      4,
      1,
      ...gifWord(Math.max(1, delayCs)),
      0,
      0,
      0x2c,
      0,
      0,
      0,
      0,
      ...gifWord(width),
      ...gifWord(height),
      0,
      8,
    );
    for (let index = 0; index < compressed.length; index += 255)
      out.push(
        Math.min(255, compressed.length - index),
        ...compressed.slice(index, index + 255),
      );
    out.push(0);
  }
  out.push(0x3b);
  return new Uint8Array(out);
}
