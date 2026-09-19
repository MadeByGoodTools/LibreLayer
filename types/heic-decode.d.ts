declare module 'heic-decode' {
  export default function decode(options: { buffer: ArrayBuffer }): Promise<{
    width: number;
    height: number;
    data: Uint8ClampedArray;
  }>;
}
