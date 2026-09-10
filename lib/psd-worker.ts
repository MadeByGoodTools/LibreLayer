import { readPsd, writePsd, initializeCanvas, getLayerImageData, getLayerMaskImageData, getCompositeImageData, type Layer, type Psd } from 'ag-psd';

initializeCanvas((w,h)=>new OffscreenCanvas(w,h) as unknown as HTMLCanvasElement,(w,h)=>new ImageData(w,h));

const supported = new Set(['normal','multiply','screen','overlay','darken','lighten','color dodge','color burn','hard light','soft light','difference','exclusion','hue','saturation','color','luminosity']);
const MAX_PIXELS = 24_000_000;
function bounds(w:number,h:number) {
  if (!Number.isInteger(w)||!Number.isInteger(h)||w<0||h<0||w>8192||h>8192||w*h>MAX_PIXELS) throw Error('PSD dimensions exceed the supported 8,192-pixel / 24-megapixel limits.');
}
function decode(buffer:ArrayBuffer) {
  if(buffer.byteLength<26||buffer.byteLength>128*1024*1024) throw Error('Choose a PSD smaller than 128 MB.');
  const header=new DataView(buffer);
  if(header.getUint32(0)!==0x38425053||header.getUint16(4)!==1) throw Error('Choose a standard PSD. PSB large-document files are not supported yet.');
  bounds(header.getUint32(18),header.getUint32(14));
  if(header.getUint16(22)!==8||header.getUint16(24)!==3) throw Error('Only 8-bit RGB PSD files are supported. Convert a copy in Photoshop first.');
  const psd=readPsd(buffer,{useRawData:true,useRawThumbnail:true,skipThumbnail:true,skipLinkedFilesData:true,totalMemoryLimit:256*1024*1024});
  let count=0,expandedPixels=0;
  const warnings=new Set<string>();
  const inspect=(layer:Layer,depth=0)=>{
    if(++count>100||depth>20) throw Error('PSD files may contain at most 100 layers and 20 nested groups.');
    bounds((layer.right??0)-(layer.left??0),(layer.bottom??0)-(layer.top??0));
    expandedPixels+=psd.width*psd.height*(layer.mask?2:1);
    if(expandedPixels>32_000_000) throw Error('This layered PSD needs too much memory. Reduce its size or layer count before importing.');
    if(layer.mask) bounds((layer.mask.right??0)-(layer.mask.left??0),(layer.mask.bottom??0)-(layer.mask.top??0));
    if(layer.effects||layer.adjustment||layer.clipping||layer.vectorMask||layer.vectorFill||layer.vectorStroke||layer.placedLayer||layer.text||layer.fillOpacity!==undefined&&layer.fillOpacity!==1) warnings.add('Live text, smart objects, clipping, effects, vector content or adjustment layers');
    if(layer.realMask||layer.knockout||layer.artboard) warnings.add('Additional masks, knockout blending or artboards');
    const ranges=layer.blendingRanges;
    if(ranges&&[ranges.compositeGrayBlendSource,ranges.compositeGraphBlendDestinationRange,...ranges.ranges.flatMap(r=>[r.sourceRange,r.destRange])].some(range=>range.some((v,i)=>v!==[0,0,255,255][i]))) warnings.add('Blend If ranges');
    if(layer.children&&((layer.opacity??1)!==1||layer.mask||(layer.blendMode??'pass through')!=='pass through')) warnings.add('Isolated, masked or translucent layer groups');
    if(!layer.children&&!supported.has(layer.blendMode??'normal')) warnings.add('Unsupported blend modes');
    if(layer.mask&&(layer.mask.userMaskFeather||layer.mask.userMaskDensity!==undefined&&layer.mask.userMaskDensity!==1)) warnings.add('Mask feather or density settings');
    layer.children?.forEach(child=>inspect(child,depth+1));
  };
  psd.children?.forEach(layer=>inspect(layer));
  if(warnings.size||!psd.children?.length) {
    const imageData=getCompositeImageData(psd);
    if(!imageData) throw Error('This PSD needs a saved composite preview. Resave a copy with Maximize Compatibility enabled.');
    return {width:psd.width,height:psd.height,warnings:[...warnings],children:[{name:'PSD composite',imageData}]};
  }
  const convert=(layer:Layer):Layer=>({name:layer.name,hidden:layer.hidden,opacity:layer.opacity,blendMode:layer.blendMode,left:layer.left,top:layer.top,opened:layer.opened,transparencyProtected:layer.transparencyProtected,
    children:layer.children?.map(convert),imageData:layer.children?undefined:getLayerImageData(layer),
    mask:layer.mask?{left:layer.mask.left,top:layer.mask.top,defaultColor:layer.mask.defaultColor,disabled:layer.mask.disabled,positionRelativeToLayer:layer.mask.positionRelativeToLayer,imageData:getLayerMaskImageData(layer)}:undefined});
  return {width:psd.width,height:psd.height,warnings:[],children:psd.children.map(convert)};
}
self.onmessage=(event:MessageEvent<{action:'read';buffer:ArrayBuffer}|{action:'write';psd:Psd}>)=>{
  try {
    if(event.data.action==='read') self.postMessage({ok:true,result:decode(event.data.buffer)});
    else {const result=writePsd(event.data.psd,{generateThumbnail:false,noBackground:true,trimImageData:false});self.postMessage({ok:true,result},{transfer:[result]});}
  } catch(error) {self.postMessage({ok:false,error:error instanceof Error?error.message:'PSD processing failed.'});}
};
