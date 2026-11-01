// Socket-compatible transport over authenticated HTTP, supported by Sites.
// Persistent autosave remains authoritative; reconnect reuses original catch-up.
import { api } from './client';
import { uuidv4 } from '../utils/uuid';
export function io(_url?:unknown,_opts?:unknown):any {
 const listeners=new Map<string,Set<(...args:any[])=>void>>();
 const startedAt=Date.now();
 const sessionId=uuidv4();let drawingId='',since=0,closed=false,timer:ReturnType<typeof setTimeout>|undefined;
 const people=new Map<string,any>();let lastCatchup=0;
 const pending=new Map<string,any>();let sending=false;let lastCursor=0;
 const dispatch=(event:string,...args:any[])=>listeners.get(event)?.forEach(fn=>fn(...args));
 const send=async()=>{if(sending||closed||!drawingId)return;sending=true;try{for(const [event,payload]of pending){pending.delete(event);await api.post(`/drawings/${drawingId}/events?sessionId=${sessionId}`,{event,payload});}}catch{/* autosave and catch-up recover scene updates */}finally{sending=false;if(pending.size&&!closed)setTimeout(send,250);}};
 const poll=async()=>{if(closed||!drawingId)return;try{const {data}=await api.get(`/drawings/${drawingId}/events`,{params:{sessionId,since}});if(!socket.connected){socket.connected=true;dispatch('connect');}for(const e of data.events){since=Math.max(since,e.id);if(e.createdAt<startedAt)continue;if(e.sessionId!==sessionId){people.set(e.sessionId,{id:e.sessionId,name:e.payload.username||'ChatGPT',color:e.payload.color||'#6366f1',initials:'CH',isActive:true,lastSeen:Date.now()});dispatch(e.event,e.payload);}}for(const [id,peer]of people){if(Date.now()-peer.lastSeen>15000){dispatch('presence-update',[{...peer,isActive:false}]);people.delete(id);}}dispatch('presence-update',[...people.values()]);if(Date.now()-lastCatchup>5000){lastCatchup=Date.now();const {data:scene}=await api.get(`/drawings/${drawingId}`);dispatch('element-update',{elements:scene.elements,files:scene.files,persisted:true});}}catch{if(socket.connected){socket.connected=false;dispatch('disconnect');}}finally{if(!closed)timer=setTimeout(poll,1000);}};
 const socket:any={connected:true,on(event:string,fn:any){if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event)!.add(fn);return socket;},off(event:string,fn?:any){if(fn)listeners.get(event)?.delete(fn);else listeners.delete(event);return socket;},emit(event:string,payload:any,ack?:any){if(closed)return socket;if(event==='join-room'){const changed=drawingId!==payload.drawingId;drawingId=payload.drawingId;ack?.({user:{...payload.user,id:sessionId}});if(changed){if(timer)clearTimeout(timer);void poll();}return socket;}if(event==='cursor-move'){if(Date.now()-lastCursor<250)return socket;lastCursor=Date.now();}if(event==='element-update'&&pending.has(event)){const prev=pending.get(event);const elements=new Map([...prev.elements,...payload.elements].map((e:any)=>[e.id,e]));payload={...payload,elements:[...elements.values()],files:{...prev.files,...payload.files}};}pending.set(event,payload);void send();return socket;},disconnect(){closed=true;if(timer)clearTimeout(timer);socket.connected=false;listeners.clear();}};
 return socket;
}
