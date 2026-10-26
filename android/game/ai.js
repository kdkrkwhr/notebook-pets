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
  return {text,llm:{complete:(o,opts)=>text({...o,json:true},opts)},image:{async generate(){throw Error('이 화면의 새 이미지 생성은 아직 지원하지 않아요. 현재 그림은 그대로 보관해요.');}},clear(){closed=true;for(const c of controllers)c.abort();controllers.clear();}};
}
