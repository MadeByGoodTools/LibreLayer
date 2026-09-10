import {checkDimensions,checkFileSize} from './document-limits';
export async function preflightImage(file:File){checkFileSize(file.size);const bytes=new Uint8Array(await file.slice(0,1024*1024).arrayBuffer()),v=new DataView(bytes.buffer);let size:{w:number;h:number}|undefined;
 if(bytes.length>=24&&v.getUint32(0)===0x89504e47)size={w:v.getUint32(16),h:v.getUint32(20)};
 else if(bytes.length>=10&&String.fromCharCode(...bytes.slice(0,3))==='GIF')size={w:v.getUint16(6,true),h:v.getUint16(8,true)};
 else if(bytes.length>=30&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'){const kind=String.fromCharCode(...bytes.slice(12,16));if(kind==='VP8X')size={w:1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16),h:1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16)};else if(kind==='VP8L')size={w:1+bytes[21]+((bytes[22]&63)<<8),h:1+(bytes[22]>>6)+(bytes[23]<<2)+((bytes[24]&15)<<10)};else if(kind==='VP8 ')size={w:v.getUint16(26,true)&16383,h:v.getUint16(28,true)&16383};}
 else if(bytes[0]===255&&bytes[1]===216){let p=2;while(p+4<bytes.length){if(bytes[p++]!==255)continue;while(bytes[p]===255)p++;const marker=bytes[p++];if(marker===0xd9||marker===0xda)break;const n=v.getUint16(p);if(n<2)break;if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)&&p+7<bytes.length){size={w:v.getUint16(p+5),h:v.getUint16(p+3)};break}p+=n;}}
 if(size)checkDimensions(size.w,size.h);return size;
}
