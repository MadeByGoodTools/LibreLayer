export type ExportFormat='png'|'jpeg'|'webp'|'tiff'|'pdf';
export function encodeTiff(image:ImageData):ArrayBuffer {
  const tags=12,ifdEnd=8+2+tags*12+4,bitsOffset=ifdEnd,pixelsOffset=ifdEnd+8;
  const buffer=new ArrayBuffer(pixelsOffset+image.data.length),v=new DataView(buffer);
  v.setUint16(0,0x4949,true);v.setUint16(2,42,true);v.setUint32(4,8,true);v.setUint16(8,tags,true);
  const entries=[[256,4,1,image.width],[257,4,1,image.height],[258,3,4,bitsOffset],[259,3,1,1],[262,3,1,2],[273,4,1,pixelsOffset],[274,3,1,1],[277,3,1,4],[278,4,1,image.height],[279,4,1,image.data.length],[284,3,1,1],[338,3,1,2]];
  entries.forEach(([tag,type,count,value],i)=>{const p=10+i*12;v.setUint16(p,tag,true);v.setUint16(p+2,type,true);v.setUint32(p+4,count,true);if(type===3&&count===1)v.setUint16(p+8,value,true);else v.setUint32(p+8,value,true)});
  for(let i=0;i<4;i++)v.setUint16(bitsOffset+i*2,8,true);
  new Uint8Array(buffer,pixelsOffset).set(image.data);return buffer;
}
function encodePdf(jpeg:Uint8Array,width:number,height:number):Blob {
  const encode=(s:string)=>new TextEncoder().encode(s),chunks:Uint8Array[]=[],offsets=[0];let position=0;
  const push=(b:Uint8Array)=>{chunks.push(b);position+=b.length};
  push(encode('%PDF-1.4\n'));
  const pageW=width*.75,pageH=height*.75;
  const object=(id:number,body:string,bytes?:Uint8Array)=>{offsets[id]=position;push(encode(`${id} 0 obj\n${body}`));if(bytes){push(encode('\nstream\n'));push(bytes);push(encode('\nendstream'))}push(encode('\nendobj\n'))};
  object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  object(4,`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>`,jpeg);
  const commands=encode(`q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q`);object(5,`<< /Length ${commands.length} >>`,commands);
  const xref=position;push(encode(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return new Blob(chunks as BlobPart[],{type:'application/pdf'});
}
export async function encodeImage(source:HTMLCanvasElement,format:ExportFormat,quality:number,scale:number,matte:string):Promise<Blob> {
  if(!Number.isFinite(scale)||scale<.1||scale>2||!Number.isFinite(quality)||quality<1||quality>100)throw Error('Choose a valid size and quality.');
  const w=Math.max(1,Math.round(source.width*scale)),h=Math.max(1,Math.round(source.height*scale));
  if(w>8192||h>8192||w*h>24000000)throw Error('Export exceeds 8,192 pixels per side or 24 megapixels.');
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d')!;
  if(format==='jpeg'||format==='pdf'||matte!=='transparent'){ctx.fillStyle=matte==='transparent'?'#ffffff':matte;ctx.fillRect(0,0,w,h)}
  ctx.imageSmoothingQuality='high';ctx.drawImage(source,0,0,w,h);
  if(format==='tiff')return new Blob([encodeTiff(ctx.getImageData(0,0,w,h))],{type:'image/tiff'});
  const mime=format==='pdf'?'image/jpeg':`image/${format}`;
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(result=>result&&result.type===mime?resolve(result):reject(Error('This browser cannot encode the selected format.')),mime,quality/100));
  return format==='pdf'?encodePdf(new Uint8Array(await blob.arrayBuffer()),w,h):blob;
}
