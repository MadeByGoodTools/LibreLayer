'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export type NewDocumentOptions = { name: string; w: number; h: number; background: string };
const presets = [ ['Web',1200,800], ['Square',1080,1080], ['Portrait',1080,1350], ['Story',1080,1920], ['Full HD',1920,1080], ['4K',3840,2160], ['A4 · 300 dpi',2480,3508] ] as const;
export function NewDocumentDialog({open,onOpenChange,onCreate}:{open:boolean;onOpenChange:(open:boolean)=>void;onCreate:(options:NewDocumentOptions)=>void}) {
  const [name,setName]=useState('Untitled artwork');
  const [w,setW]=useState('1200'),[h,setH]=useState('800');
  const [background,setBackground]=useState('transparent');
  const [error,setError]=useState('');
  const valid=Number.isInteger(+w)&&Number.isInteger(+h)&&+w>0&&+h>0&&+w<=8192&&+h<=8192&&+w*+h<=24000000;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onKeyDown={e=>e.stopPropagation()}><DialogTitle>New document</DialogTitle><DialogDescription>Choose a preset or enter custom pixel dimensions. RGB, 8-bit.</DialogDescription>
    <form className="grid gap-4" onSubmit={e=>{e.preventDefault();if(!valid)return;try{onCreate({name:name.trim()||'Untitled artwork',w:+w,h:+h,background});setError('');onOpenChange(false)}catch{setError('Could not create this document. Try smaller dimensions.')}}}>
      <label className="grid gap-1">Name<input autoFocus className="rounded border p-2" maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
      <div className="flex flex-wrap gap-2" aria-label="Document presets">{presets.map(([label,width,height])=><Button key={label} type="button" variant={+w===width&&+h===height?'secondary':'outline'} onClick={()=>{setW(String(width));setH(String(height));setError('')}}>{label}</Button>)}</div>
      <div className="grid grid-cols-2 gap-3"><label className="grid gap-1">Width (px)<input required className="rounded border p-2 min-w-0" type="number" min={1} max={8192} step={1} value={w} onChange={e=>setW(e.target.value)}/></label><label className="grid gap-1">Height (px)<input required className="rounded border p-2 min-w-0" type="number" min={1} max={8192} step={1} value={h} onChange={e=>setH(e.target.value)}/></label></div>
      <Button type="button" variant="outline" onClick={()=>{setW(h);setH(w)}}>Swap width and height</Button>
      <label className="grid gap-1">Background<select className="rounded border p-2 bg-background" value={background} onChange={e=>setBackground(e.target.value)}><option value="transparent">Transparent</option><option value="#ffffff">White</option><option value="#000000">Black</option></select></label>
      <p className="text-muted-foreground">Up to 8,192 pixels per side and 24 megapixels total. The A4 preset sets pixel dimensions, not print metadata.</p>
      {!valid&&<p role="alert">Enter whole-number dimensions within these limits.</p>}{error&&<p role="alert">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={!valid}>Create document</Button></div>
    </form>
  </DialogContent></Dialog>;
}
