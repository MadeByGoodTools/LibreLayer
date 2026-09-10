// Budgets apply to decoded pixels, not merely the compressed file size.
export const MAX_SIDE=16384;
export const MAX_DOCUMENT_PIXELS=64_000_000;
export const MAX_WORKING_PIXELS=96_000_000;
export const MAX_FILE_BYTES=256*1024*1024;
export const HISTORY_BYTES=512*1024*1024;
export const LIMIT_DESCRIPTION='16,384 pixels per side, 64 megapixels per document, and 96 million layer/mask pixels across open documents';
export function checkDimensions(w:number,h:number){if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>MAX_SIDE||h>MAX_SIDE||w*h>MAX_DOCUMENT_PIXELS)throw Error('Image exceeds '+LIMIT_DESCRIPTION+'. No resizing was applied.');}
export function checkFileSize(bytes:number){if(bytes>MAX_FILE_BYTES)throw Error('Choose a file up to 256 MiB. Larger files require a streaming import engine.');}
