const TILE=256;
export type ImageTile={w:number;h:number;solid?:number;bytes?:Uint8ClampedArray<ArrayBuffer>};
export type TiledImage={width:number;height:number;tiles:ImageTile[]};
export type HistorySurface={id:string;pixels:TiledImage;mask?:TiledImage};
function equal(a:Uint8ClampedArray,b:Uint8ClampedArray){if(a.length!==b.length)return false;const av=new Uint32Array(a.buffer,a.byteOffset,a.length/4),bv=new Uint32Array(b.buffer,b.byteOffset,b.length/4);for(let i=0;i<av.length;i++)if(av[i]!==bv[i])return false;return true;}
export function captureTiles(canvas:HTMLCanvasElement,previous?:TiledImage):TiledImage{
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Canvas memory is unavailable. Close another document.');
 const width=canvas.width,height=canvas.height,tiles:ImageTile[]=[];
 const compatible=previous?.width===width&&previous?.height===height;
 for(let y=0;y<height;y+=TILE)for(let x=0;x<width;x+=TILE){const w=Math.min(TILE,width-x),h=Math.min(TILE,height-y),image=ctx.getImageData(x,y,w,h),words=new Uint32Array(image.data.buffer),first=words[0];let solid=true;for(let i=1;i<words.length;i++)if(words[i]!==first){solid=false;break}const old=compatible?previous!.tiles[tiles.length]:undefined;
  if(solid)tiles.push(old?.solid===first?old:{w,h,solid:first});
  else tiles.push(old?.bytes&&equal(image.data,old.bytes)?old:{w,h,bytes:image.data});
 }
 return {width,height,tiles};
}
export function restoreTiles(image:TiledImage):HTMLCanvasElement{const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas memory is unavailable.');let i=0;for(let y=0;y<image.height;y+=TILE)for(let x=0;x<image.width;x+=TILE){const tile=image.tiles[i++];if(tile.solid!==undefined){const bytes=new Uint8ClampedArray(tile.w*tile.h*4);new Uint32Array(bytes.buffer).fill(tile.solid);ctx.putImageData(new ImageData(bytes,tile.w,tile.h),x,y)}else ctx.putImageData(new ImageData(tile.bytes!,tile.w,tile.h),x,y)}return canvas;}
export function historyBytes(frames:{surfaces:HistorySurface[];selection?:TiledImage}[]){const seen=new Set<ImageTile>();let bytes=0;for(const frame of frames){for(const surface of frame.surfaces)for(const image of [surface.pixels,surface.mask])if(image)for(const tile of image.tiles)if(!seen.has(tile)){seen.add(tile);bytes+=(tile.bytes?.byteLength??4)+32}if(frame.selection)for(const tile of frame.selection.tiles)if(!seen.has(tile)){seen.add(tile);bytes+=(tile.bytes?.byteLength??4)+32}}return bytes;}
