import {call,state} from './native.js';
export const textReady=()=>state.ready;
export const imageReady=()=>false;
export function createAI(){
  const controllers=new Set();let closed=false;
  async function text(options,{signal}={}){
    if(closed)throw Error('친구가 바뀌었어요.');
    if(!state.ready)throw Error('설정에서 친구와 대화할 준비를 해 주세요.');
    const controller=new AbortController(),abort=()=>controller.abort();controllers.add(controller);
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();
    try{return {content:{text:await call('complete',options,controller.signal)}};}
    finally{controllers.delete(controller);signal?.removeEventListener('abort',abort);}
  }
  return {text,llm:{complete:(o,opts)=>text({...o,json:true},opts)},image:{async generate(){throw Error('이 Android판은 새 이미지를 생성하지 않아요. 원본 그림을 사용해 주세요.');}},clear(){closed=true;for(const c of controllers)c.abort();controllers.clear();}};
}
