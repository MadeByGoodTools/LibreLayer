'use client';
import {useEffect, useRef, useState, type ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
export type PanelPlacement={floating:boolean;x:number;y:number;width:number};
export type PanelPositions=Record<string,PanelPlacement>;
export function DockWorkspace({panels,positions,onChange}:{panels:{id:string;title:string;content:ReactNode}[];positions:PanelPositions;onChange:(positions:PanelPositions)=>void}){
 const [selected,setSelected]=useState('layers');
 const [,resize]=useState(0);
 useEffect(()=>{const update=()=>resize(n=>n+1);window.addEventListener('resize',update);return()=>window.removeEventListener('resize',update)},[]);
 const drag=useRef<{id:string;x:number;y:number;start:PanelPlacement}|null>(null);
 const [draft,setDraft]=useState<PanelPositions>({});
 const clamp=(p:PanelPlacement)=>({...p,x:Math.max(0,Math.min(p.x,window.innerWidth-Math.min(p.width,window.innerWidth))),y:Math.max(0,Math.min(p.y,window.innerHeight-80))});
 const set=(id:string,p:PanelPlacement)=>onChange({...positions,[id]:clamp(p)});
 const docked=panels.filter(p=>!positions[p.id]?.floating);
 const active=docked.some(p=>p.id===selected)?selected:docked[0]?.id;
 return <><Tabs value={active??''} onValueChange={setSelected} className="dock-tabs h-full"><TabsList variant="line" className="panel-tabs pro-tabs">{docked.map(p=><TabsTrigger key={p.id} value={p.id}>{p.title}</TabsTrigger>)}</TabsList>{!docked.length&&<p className="p-3">Panels are floating. Use Dock on a panel to return it here.</p>}{docked.map((p,i)=><TabsContent className="dock-tab-content" key={p.id} value={p.id}><div className="dock-tab-actions"><Button size="sm" variant="ghost" aria-label={`Float ${p.title} panel`} onClick={()=>set(p.id,{floating:true,x:90+i*25,y:140+i*25,width:320})}>Float panel</Button></div>{p.content}</TabsContent>)}</Tabs>
 {panels.filter(p=>positions[p.id]?.floating).map(p=>{const raw=draft[p.id]??positions[p.id],position=typeof window==='undefined'?raw:clamp(raw);return <section key={p.id} className="floating-editor-panel panel" aria-label={`${p.title} floating panel`} style={{left:position.x,top:position.y,width:position.width}}><div className="floating-panel-handle" tabIndex={0} role="button" aria-label={`Move ${p.title} panel; use arrow keys`} onKeyDown={e=>{const delta:Record<string,[number,number]>={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};if(delta[e.key]){e.preventDefault();const [x,y]=delta[e.key];set(p.id,{...position,x:position.x+x,y:position.y+y})}}} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:p.id,x:e.clientX,y:e.clientY,start:position}}} onPointerMove={e=>{const d=drag.current;if(!d||d.id!==p.id)return;setDraft({[p.id]:clamp({...d.start,x:d.start.x+e.clientX-d.x,y:d.start.y+e.clientY-d.y})})}} onPointerUp={e=>{const d=drag.current;if(!d)return;set(p.id,{...d.start,x:d.start.x+e.clientX-d.x,y:d.start.y+e.clientY-d.y});drag.current=null;setDraft({})}} onPointerCancel={()=>{drag.current=null;setDraft({})}}>{p.title} · drag to move</div><div className="floating-panel-actions"><label>Width <input aria-label={`${p.title} panel width`} type="number" min={260} max={600} value={position.width} onChange={e=>{const w=+e.target.value;if(w>=260&&w<=600)set(p.id,{...position,width:w})}}/></label><Button size="sm" variant="secondary" onClick={()=>{set(p.id,{...position,floating:false});setSelected(p.id)}}>Dock {p.title}</Button></div><div className="floating-panel-body">{p.content}</div></section>})}</>;
}
