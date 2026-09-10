import type { Layer, Psd } from 'ag-psd';
import PsdWorker from './psd-worker?worker';
export type PsdImport={width:number;height:number;warnings:string[];children:Layer[]};
export function processPsd<T>(request:{action:'read';buffer:ArrayBuffer}|{action:'write';psd:Psd}):Promise<T> {
  return new Promise((resolve,reject)=>{
    const worker=new PsdWorker();
    const timeout=setTimeout(()=>{worker.terminate();reject(Error('PSD processing timed out. Try a smaller file.'));},45000);
    const finish=()=>{clearTimeout(timeout);worker.terminate()};
    worker.onerror=()=>{finish();reject(Error('PSD processing could not start. Reload the editor and try again.'))};
    worker.onmessage=event=>{finish();event.data.ok?resolve(event.data.result):reject(Error(event.data.error))};
    worker.postMessage(request,request.action==='read'?[request.buffer]:[]);
  });
}
