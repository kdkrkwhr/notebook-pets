// Presentation only. The elapsed clock never predicts completion or retries work.
const words={
 ko:{image:'이미지를 생성하고 있어요…',ai:'AI 응답을 준비하고 있어요…',chat:'친구가 답장을 생각하고 있어요…',save:'결과를 저장하고 있어요…',download:'완성된 이미지를 불러오고 있어요…',validate:'픽셀 동작을 확인하고 있어요…',load:'진행 상태를 확인하고 있어요…',imageHelp:'이미지 생성은 몇 분 걸릴 수 있어요. 이 창을 열어 두세요.',aiHelp:'응답을 기다리고 있어요. 같은 요청을 다시 보내지 않아도 돼요.',saveHelp:'저장이 끝날 때까지 이 창을 유지해 주세요.',loadHelp:'완료되면 다음 단계가 표시돼요.',slow:'아직 응답을 기다리고 있어요. 이 창을 유지해 주세요. 같은 요청을 다시 보내지 않아도 돼요.',elapsed:'경과'},
 en:{image:'Creating your image…',ai:'Preparing the AI response…',chat:'Your friend is thinking of a reply…',save:'Saving the result…',download:'Loading the finished image…',validate:'Checking the pixel movement…',load:'Checking your progress…',imageHelp:'Image generation can take a few minutes. Keep this window open.',aiHelp:'Waiting for a response. You do not need to send the request again.',saveHelp:'Keep this window open until saving finishes.',loadHelp:'The next step will appear when this finishes.',slow:'Still waiting for the result. Keep this window open; you do not need to send the request again.',elapsed:'Elapsed'}
};
export function createActivity(target,language){
 const d=target.ownerDocument,win=d.defaultView,note=d.createElement('div'),hint=d.createElement('span'),clock=d.createElement('span');
 note.className='activity-note';note.hidden=true;note.id=target.id+'-activity';hint.className='activity-hint';hint.setAttribute('role','status');hint.setAttribute('aria-live','polite');clock.className='activity-clock';clock.setAttribute('aria-hidden','true');note.append(hint,clock);target.after(note);
 let kind=null,timer=null,started=0,ownLabel=false;
 const text=()=>words[language()==='ko'?'ko':'en'];
 function render(){
  if(!kind)return;const w=text(),elapsed=Math.max(0,Math.floor((win.performance.now()-started)/1000));
  if(ownLabel&&target.textContent!==w[kind])target.textContent=w[kind];
  const help=elapsed>=30&&['image','ai','chat','load'].includes(kind)?w.slow:kind==='image'?w.imageHelp:['ai','chat'].includes(kind)?w.aiHelp:kind==='save'?w.saveHelp:w.loadHelp;
  if(hint.textContent!==help)hint.textContent=help;
  clock.textContent=`${w.elapsed} ${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`;
 }
 function set(next,label){
  if(!next){kind=null;win.clearInterval(timer);timer=null;note.hidden=true;target.classList.remove('activity-running');target.removeAttribute('data-activity');return;}
  if(!kind){started=win.performance.now();timer=win.setInterval(render,1000);}
  kind=next;ownLabel=label===undefined;if(!ownLabel)target.textContent=label;
  target.hidden=false;target.classList.add('activity-running');target.dataset.activity=kind;note.hidden=false;render();
 }
 return {set,render,clear:()=>set(null)};
}
