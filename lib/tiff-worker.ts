import UTIF from 'utif';
self.onmessage = (
  event: MessageEvent<{ buffer: ArrayBuffer; page?: number }>,
) => {
  try {
    const { buffer, page } = event.data;
    if (buffer.byteLength > 256 * 1024 * 1024)
      throw Error('TIFF import is limited to 256 MiB.');
    const ifds = UTIF.decode(buffer);
    if (!ifds.length || ifds.length > 200)
      throw Error('Choose a TIFF with 1–200 pages.');
    const dimension = (ifd: (typeof ifds)[number], tag: string) =>
      Number((ifd[tag] as number[] | undefined)?.[0]);
    const pages = ifds.map((ifd) => ({
      width: dimension(ifd, 't256'),
      height: dimension(ifd, 't257'),
      bitDepth: Math.max(...((ifd.t258 as number[] | undefined) ?? [1])),
      name:
        String((ifd.t285 as string[] | undefined)?.[0] ?? '')
          .replaceAll('\0', '')
          .trim() || undefined,
    }));
    if (page === undefined) {
      self.postMessage({ ok: true, pages });
      return;
    }
    if (!Number.isInteger(page) || page < 1 || page > ifds.length)
      throw Error('Choose an available TIFF page.');
    const ifd = ifds[page - 1],
      { width, height } = pages[page - 1];
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > 16384 ||
      height > 16384 ||
      width * height > 64_000_000
    )
      throw Error('TIFF page exceeds 16,384 pixels per side or 64 megapixels.');
    const depth = ifd.t258 as number[] | undefined;
    if (depth?.some((n) => n !== 1 && n !== 8 && n !== 16))
      throw Error(
        'This editor opens 1-bit, 8-bit or 16-bit TIFF pages. Convert 32-bit TIFFs first.',
      );
    UTIF.decodeImage(buffer, ifd);
    const rgba = UTIF.toRGBA8(ifd);
    if (rgba.length !== width * height * 4)
      throw Error('TIFF pixels could not be decoded.');
    self.postMessage(
      {
        ok: true,
        width,
        height,
        orientation: dimension(ifd, 't274') || 1,
        rgba,
      },
      { transfer: [rgba.buffer] },
    );
  } catch (e) {
    self.postMessage({
      ok: false,
      error: e instanceof Error ? e.message : 'TIFF import failed.',
    });
  }
};
