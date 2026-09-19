# RAW camera release matrix

LibreLayer verifies each advertised camera-RAW family against an actual camera file rather than only testing generated pixel buffers. The fixtures come from the CC0/public-domain `raw.pixls.us` archive, are cached only in the developer's ignored `.raw-fixtures` folder, and are pinned by exact byte count and SHA-256. They are never packaged with the app or uploaded by the test.

| Family | Camera                              | Sensor / path               | Expected developed dimensions |
| ------ | ----------------------------------- | --------------------------- | ----------------------------- |
| CR2    | Canon EOS 350D                      | Bayer, camera matrix        | 3474 × 2314                   |
| CR3    | Canon EOS R5 C-RAW                  | Bayer, camera matrix        | 5087 × 3391                   |
| NEF    | Nikon D70                           | Bayer, camera matrix        | 3039 × 2014                   |
| ARW    | Sony NEX-3                          | Bayer, camera matrix        | 4608 × 3072                   |
| DNG    | Canon EOS 5D Mark III converted DNG | Bayer, embedded-DNG profile | 5760 × 3840                   |
| RAF    | Fujifilm X-T1                       | X-Trans, modified-AHD path  | 4934 × 3296                   |
| ORF    | Olympus E-M5                        | Bayer, camera matrix        | 4640 × 3472                   |
| RW2    | Panasonic DMC-GH2                   | Bayer, camera matrix        | 4624 × 3472                   |

Run `pnpm test:raw-matrix`. Each row must:

- match its pinned file size and SHA-256 before decoding;
- retain the expected camera make/model;
- decode in the expected orientation and dimensions;
- produce a three-channel `Uint16Array` with 16-bit output; and
- contain a nontrivial sampled tonal range.

This matrix proves the eight format families and both advertised sensor paths work with the bundled decoder. It does not claim that every camera model, firmware revision, or proprietary compression variant has been tested. Unsupported or damaged files must continue to fail explicitly instead of being silently treated as successful imports.
