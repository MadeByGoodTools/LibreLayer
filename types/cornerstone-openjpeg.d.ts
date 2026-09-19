declare module '@cornerstonejs/codec-openjpeg' {
  type FrameInfo = {
    width: number;
    height: number;
    bitsPerSample: number;
    componentCount: number;
    isSigned: boolean;
  };
  type Encoder = {
    getDecodedBuffer(info: FrameInfo): Uint8Array;
    getEncodedBuffer(): Uint8Array;
    setQuality(lossless: boolean, layers: number): void;
    setCompressionRatio(layer: number, ratio: number): void;
    setDecompositions(levels: number): void;
    encode(): void;
    delete(): void;
  };
  export default function OpenJpeg(): Promise<{
    J2KEncoder: new () => Encoder;
  }>;
}
