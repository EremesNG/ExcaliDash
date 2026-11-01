import {afterEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({events:[] as any[]}));
vi.mock('../src/api/client',()=>({api:{get:vi.fn(async(path:string)=>({data:path.includes('/events')?{events:state.events}:{elements:[],files:{}}})),post:vi.fn(async()=>({data:{ok:true}}))}}));
vi.mock('../src/utils/uuid',()=>({uuidv4:()=> 'test-session'}));
import {io} from '../src/api/sitesSocket';
afterEach(()=>{vi.useRealTimers();state.events=[];});
it('ignores prior restore notifications after reload and delivers subsequent notifications once',async()=>{
 vi.useFakeTimers();vi.setSystemTime(10000);
 state.events=[{id:1,createdAt:9000,sessionId:'server',event:'drawing-server-update',payload:{drawingId:'drawing'}}];
 const socket=io(),reload=vi.fn();socket.on('drawing-server-update',reload);socket.emit('join-room',{drawingId:'drawing',user:{id:'me'}});
 await vi.advanceTimersByTimeAsync(1);expect(reload).not.toHaveBeenCalled();
 state.events=[{id:2,createdAt:11000,sessionId:'server',event:'drawing-server-update',payload:{drawingId:'drawing'}}];
 await vi.advanceTimersByTimeAsync(1000);expect(reload).toHaveBeenCalledTimes(1);
 state.events=[];await vi.advanceTimersByTimeAsync(1000);expect(reload).toHaveBeenCalledTimes(1);socket.disconnect();
});
