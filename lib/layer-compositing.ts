export type BlendRange=[number,number,number,number];
export type BlendIf={source:BlendRange;backdrop:BlendRange};
export const defaultBlendIf:BlendIf={source:[0,0,255,255],backdrop:[0,0,255,255]};
export const extraBlends={'linear-dodge':'Linear Dodge (Add)','linear-burn':'Linear Burn',subtract:'Subtract',divide:'Divide','linear-light':'Linear Light','pin-light':'Pin Light','vivid-light':'Vivid Light','hard-mix':'Hard Mix','darker-color':'Darker Color','lighter-color':'Lighter Color',dissolve:'Dissolve'};
export type ExtraBlend=keyof typeof extraBlends;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
export function rangeAlpha(value:number,[low,start,end,high]:BlendRange){if(value<low||value>high)return 0;return Math.min(start===low?1:clamp((value-low)/(start-low)),high===end?1:clamp((high-value)/(high-end)));}
export function validBlendIf(value:unknown):value is BlendIf{if(!value||typeof value!=='object')return false;return ['source','backdrop'].every(key=>{const a=(value as Record<string,unknown>)[key];return Array.isArray(a)&&a.length===4&&a.every((v,i)=>Number.isFinite(v)&&v>=0&&v<=255&&(i===0||v>=a[i-1]))});}
export function blendChannel(b:number,s:number,mode:ExtraBlend):number{switch(mode){case 'linear-dodge':return Math.min(1,b+s);case 'linear-burn':return Math.max(0,b+s-1);case 'subtract':return Math.max(0,b-s);case 'divide':return s===0?1:Math.min(1,b/s);case 'linear-light':return clamp(b+2*s-1);case 'pin-light':return s<.5?Math.min(b,2*s):Math.max(b,2*s-1);case 'vivid-light':return s<.5?(s===0?0:1-Math.min(1,(1-b)/(2*s))):(s===1?1:Math.min(1,b/(2*(1-s))));case 'hard-mix':return b+s<1?0:1;default:return s;}}
// Tile-sized reads bound temporary pixel arrays; source/backdrop remain full-resolution canvases.
export function compositePixels(target:CanvasRenderingContext2D,source:HTMLCanvasElement,mode:string,blendIf?:BlendIf){
 const sourceCtx=source.getContext('2d')!,custom=mode in extraBlends;
 for(let y=0;y<source.height;y+=256)for(let x=0;x<source.width;x+=256){const w=Math.min(256,source.width-x),h=Math.min(256,source.height-y),s=sourceCtx.getImageData(x,y,w,h),b=target.getImageData(x,y,w,h);
  for(let i=0;i<s.data.length;i+=4){let sa=s.data[i+3]/255;const ba=b.data[i+3]/255;if(blendIf){const sl=.299*s.data[i]+.587*s.data[i+1]+.114*s.data[i+2],bl=.299*b.data[i]+.587*b.data[i+1]+.114*b.data[i+2];sa*=rangeAlpha(sl,blendIf.source)*(ba===0?1:rangeAlpha(bl,blendIf.backdrop));s.data[i+3]=Math.round(sa*255)}if(!custom)continue;if(mode==='dissolve'){const p=(y+Math.floor(i/4/w))*source.width+x+(i/4)%w;let seed=Math.imul(p^0x9e3779b9,0x85ebca6b);seed^=seed>>>13;sa=(seed>>>0)/4294967296<sa?1:0}const alpha=sa+ba*(1-sa),sSum=s.data[i]+s.data[i+1]+s.data[i+2],bSum=b.data[i]+b.data[i+1]+b.data[i+2];for(let c=0;c<3;c++){const sv=s.data[i+c]/255,bv=b.data[i+c]/255,blend=mode==='darker-color'?(sSum<bSum?sv:bv):mode==='lighter-color'?(sSum>bSum?sv:bv):blendChannel(bv,sv,mode as ExtraBlend);b.data[i+c]=alpha?255*((1-sa)*ba*bv+sa*((1-ba)*sv+ba*blend))/alpha:0}b.data[i+3]=alpha*255;
  }
  if(custom)target.putImageData(b,x,y);else sourceCtx.putImageData(s,x,y);
 }
 if(!custom){target.save();target.globalAlpha=1;target.globalCompositeOperation=mode as GlobalCompositeOperation;target.drawImage(source,0,0);target.restore()}
}
