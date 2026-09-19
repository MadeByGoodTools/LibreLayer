import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { rawDecodeOptions } from '../lib/raw-develop.ts';

type Fixture = {
  format: string;
  sensor: 'Bayer' | 'X-Trans';
  file: string;
  url: string;
  bytes: number;
  sha256: string;
  camera: RegExp;
  width: number;
  height: number;
  embeddedProfile?: boolean;
};

const fixtures: Fixture[] = [
  {
    format: 'CR2',
    sensor: 'Bayer',
    file: 'IMG_1707.CR2',
    url: 'https://raw.pixls.us/data/Canon/EOS%20350D/IMG_1707.CR2',
    bytes: 10586467,
    sha256: '8cbb84e04d93b005fe082da9c954122a612b5281af00aa088d767850f343fd38',
    camera: /Canon EOS 350D/i,
    width: 3474,
    height: 2314,
  },
  {
    format: 'CR3',
    sensor: 'Bayer',
    file: 'Canon_EOS_R5_CRAW_ISO_100_crop_nodual.CR3',
    url: 'https://raw.pixls.us/data/Canon/EOS%20R5/Canon_EOS_R5_CRAW_ISO_100_crop_nodual.CR3',
    bytes: 6975574,
    sha256: 'a5f4935e0331cc16003c0b1ab6c657272739e82175557aaae576e78a8262511b',
    camera: /Canon EOS R5/i,
    width: 5087,
    height: 3391,
  },
  {
    format: 'NEF',
    sensor: 'Bayer',
    file: '20170902_0047.NEF',
    url: 'https://raw.pixls.us/data/Nikon/D70/20170902_0047.NEF',
    bytes: 5488179,
    sha256: 'dd6405aeb33b0cd5bf66c98ba98ccbb478a765450cfd130810e470dab8d1f4b4',
    camera: /Nikon D70/i,
    width: 3039,
    height: 2014,
  },
  {
    format: 'ARW',
    sensor: 'Bayer',
    file: 'RAW_SONY_NEX3.ARW',
    url: 'https://raw.pixls.us/data/Sony/NEX-3/RAW_SONY_NEX3.ARW',
    bytes: 14713446,
    sha256: 'eeaaa6f8c246021c90c0ee29f6624e05ee6175601c85f4699e642f63a66df57d',
    camera: /Sony NEX-3/i,
    width: 4608,
    height: 3072,
  },
  {
    format: 'DNG',
    sensor: 'Bayer',
    file: '5G4A9394-compressed-lossy.DNG',
    url: 'https://raw.pixls.us/data/Adobe%20DNG%20Converter/Canon%20EOS%205D%20Mark%20III/5G4A9394-compressed-lossy.DNG',
    bytes: 6193902,
    sha256: '159326856c29073e845c3c5a9ecf98c6474f43ca15798a88ad5e2baecd0664b7',
    camera: /Canon EOS 5D Mark III/i,
    width: 5760,
    height: 3840,
    embeddedProfile: true,
  },
  {
    format: 'RAF',
    sensor: 'X-Trans',
    file: '20171229_110916.RAF',
    url: 'https://raw.pixls.us/data/Fujifilm/X-T1/20171229_110916.RAF',
    bytes: 33806336,
    sha256: 'e994a1fd6e87e392432fe146a35b0b88584dc2bd50bee2c8c7e886ac2b59fcde',
    camera: /Fujifilm X-T1/i,
    width: 4934,
    height: 3296,
  },
  {
    format: 'ORF',
    sensor: 'Bayer',
    file: 'P2082705.ORF',
    url: 'https://raw.pixls.us/data/Olympus/E-M5/P2082705.ORF',
    bytes: 14779462,
    sha256: 'b2221977cbc6eba0d3b363351072092e5647eaa0d02a5d8432b5d985b29f669f',
    camera: /Olympus E-M5/i,
    width: 4640,
    height: 3472,
  },
  {
    format: 'RW2',
    sensor: 'Bayer',
    file: '_1040800.RW2',
    url: 'https://raw.pixls.us/data/Panasonic/DMC-GH2/_1040800.RW2',
    bytes: 19520000,
    sha256: '87516d28f8594dcfd20b0577883ad0d35662efc503674b1e3688aa894d32a2c0',
    camera: /Panasonic DMC-GH2/i,
    width: 4624,
    height: 3472,
  },
];

const root = fileURLToPath(new URL('../', import.meta.url));
const cache = fileURLToPath(new URL('../.raw-fixtures/', import.meta.url));

async function sha256(path: string) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(path), hash);
  return hash.digest('hex');
}

async function obtain(fixture: Fixture) {
  const path = `${cache}${fixture.file}`;
  const valid = async () => {
    try {
      return (
        (await stat(path)).size === fixture.bytes &&
        (await sha256(path)) === fixture.sha256
      );
    } catch {
      return false;
    }
  };
  if (await valid()) return path;
  await rm(path, { force: true });
  const temporary = `${path}.download`;
  await rm(temporary, { force: true });
  const response = await fetch(fixture.url, { redirect: 'follow' });
  if (!response.ok || !response.body)
    throw new Error(`Download failed (${response.status}) for ${fixture.file}`);
  await pipeline(
    Readable.fromWeb(response.body as never),
    createWriteStream(temporary),
  );
  await rename(temporary, path);
  assert.equal(
    await valid(),
    true,
    `${fixture.file} failed its size or SHA-256 check`,
  );
  return path;
}

await mkdir(cache, { recursive: true });
const librawUrl = new URL(
  '../node_modules/libraw-wasm/dist/libraw.js',
  import.meta.url,
);
const wasmPath = new URL(
  '../node_modules/libraw-wasm/dist/libraw.wasm',
  import.meta.url,
);
const { default: createLibRaw } = await import(librawUrl.href);
const librawModule = await createLibRaw({
  wasmBinary: await readFile(wasmPath),
});

const results: Array<Record<string, unknown>> = [];
for (const fixture of fixtures) {
  const path = await obtain(fixture);
  const raw = new librawModule.LibRaw();
  try {
    const bytes = await readFile(path);
    raw.open(new Uint8Array(bytes), {
      ...rawDecodeOptions({
        demosaic: fixture.sensor === 'X-Trans' ? 'modified-ahd' : 'dht',
        whiteBalance: 'camera',
        cameraProfile: fixture.embeddedProfile
          ? 'embedded-dng'
          : 'camera-matrix',
      }),
      outputBps: 16,
      outputColor: 4,
      highlight: 5,
      greenMatching: true,
      fbddNoiserd: 1,
      medPasses: 1,
      gamm: [1, 1],
      noAutoBright: true,
    });
    const started = performance.now();
    const decoded = raw.imageData();
    const metadata = raw.metadata(true);
    const camera = [metadata?.camera_make, metadata?.camera_model]
      .filter(Boolean)
      .join(' ');
    assert.equal(
      decoded.width,
      fixture.width,
      `${fixture.format} width/orientation changed`,
    );
    assert.equal(
      decoded.height,
      fixture.height,
      `${fixture.format} height/orientation changed`,
    );
    assert.equal(
      decoded.bits,
      16,
      `${fixture.format} did not produce 16-bit output`,
    );
    assert.equal(
      decoded.data instanceof Uint16Array,
      true,
      `${fixture.format} output is not Uint16Array`,
    );
    assert.match(
      camera,
      fixture.camera,
      `${fixture.format} camera metadata changed`,
    );
    let minimum = 65535,
      maximum = 0,
      total = 0,
      samples = 0;
    const stride = Math.max(1, Math.floor(decoded.data.length / 8192));
    for (let index = 0; index < decoded.data.length; index += stride) {
      const value = decoded.data[index];
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
      total += value;
      samples++;
    }
    assert.ok(
      maximum - minimum > 1024,
      `${fixture.format} output has no useful tonal range`,
    );
    results.push({
      format: fixture.format,
      sensor: fixture.sensor,
      camera,
      dimensions: `${decoded.width}x${decoded.height}`,
      bits: decoded.bits,
      sampledRange: `${minimum}-${maximum}`,
      sampledMean: Math.round(total / samples),
      decodeMs: Math.round(performance.now() - started),
    });
  } finally {
    raw.delete();
  }
}

console.table(results);
console.log(
  `RAW camera matrix passed: ${results.length}/${fixtures.length} fixtures (${root})`,
);
