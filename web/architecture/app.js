const $=selector=>document.querySelector(selector);
const paths={
 web:[
  ['01 / INTERFACE','행동을 고르고','밥 주기, 산책, 대화 같은 행동을 화면에서 요청해요.','web/app.js'],
  ['02 / WORKER','Python에 전달하고','Web Worker 안의 Pyodide가 공통 게임 API를 실행해요.','web/worker.js'],
  ['03 / SHARED CORE','규칙을 확인하고','상태·보상·진화 조건을 검증하고 다음 상태를 계산해요.','engine/game_api.py'],
  ['04 / PERSISTENCE','브라우저에 기록해요','IndexedDB에 revision을 확인해 저장하고 화면을 갱신해요.','web/store.js']
 ],
 anna:[
  ['01 / INTERFACE','행동을 고르고','Anna 안의 화면에서 돌봄과 모험을 요청해요.','anna/bundle/app.js'],
  ['02 / ADAPTER','플랫폼을 연결하고','도구가 사용자 저장 상태를 읽어 게임 작업자로 전달해요.','anna/executas/notebuddy/notebuddy_plugin.py'],
  ['03 / SHARED CORE','같은 규칙을 실행하고','작업자가 공통 Python API를 실행하고 표시할 결과를 만들어요.','anna/executas/notebuddy/game_worker.py'],
  ['04 / PERSISTENCE','Anna에 기록해요','플랫폼의 APS 저장과 요청 영수증으로 상태와 재시도를 관리해요.','anna/executas/notebuddy/receipts.py']
 ]
};
let metadata;
function sourceLink(path){return `https://github.com/kdkrkwhr/notebook-pets/blob/${metadata.revision}/${path}`;}
function renderFlow(platform){
 $('#flow').replaceChildren(...paths[platform].map(([number,title,description,path])=>{
  const item=document.createElement('li');
  for(const [tag,text,className] of [['span',number,'step-number'],['h3',title,''],['p',description,'']]){
   const element=document.createElement(tag);element.textContent=text;element.className=className;item.append(element);
  }
  const link=document.createElement('a');link.href=sourceLink(path);link.textContent=path;link.target='_blank';link.rel='noopener';item.append(link);return item;
 }));
 document.querySelectorAll('[data-platform]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.platform===platform)));
}
function renderFiles(){
 const query=$('#file-search').value.trim().toLowerCase(),files=metadata.files.filter(path=>path.toLowerCase().includes(query));
 $('#file-status').textContent=`${files.length} / ${metadata.fileCount}개 파일`;
 $('#files').replaceChildren(...files.map(path=>{const item=document.createElement('li'),link=document.createElement('a');link.href=sourceLink(path);link.textContent=path;link.target='_blank';link.rel='noopener';item.append(link);return item;}));
 if(!files.length){const item=document.createElement('li');item.className='empty';item.textContent='일치하는 파일이 없어요. 다른 이름으로 검색해 보세요.';$('#files').append(item);}
}
try{
 const response=await fetch('./metadata.json');if(!response.ok)throw Error(`HTTP ${response.status}`);metadata=await response.json();
 for(const [id,key] of [['file-count','fileCount'],['node-count','nodeCount'],['edge-count','edgeCount']])$('#'+id).textContent=metadata[key].toLocaleString('ko-KR');
 $('#revision').textContent=metadata.revision.slice(0,7);$('#revision').href=`https://github.com/kdkrkwhr/notebook-pets/commit/${metadata.revision}`;
 $('#source-date').textContent=`소스 커밋 ${new Date(metadata.sourceDate).toLocaleDateString('ko-KR')} · 분석 ${new Date(metadata.generatedAt).toLocaleDateString('ko-KR')}`;
 $('#snapshot-status').textContent='release-web · 로컬 코드 분석';$('#tool-version').textContent=`v${metadata.graphifyVersion}`;
 document.querySelectorAll('[data-platform]').forEach(button=>button.addEventListener('click',()=>renderFlow(button.dataset.platform)));
 $('#file-search').addEventListener('input',renderFiles);
 $('#clear-search').addEventListener('click',()=>{$('#file-search').value='';renderFiles();$('#file-search').focus();});
 document.querySelectorAll('[data-search]').forEach(button=>button.addEventListener('click',()=>{$('#file-search').value=button.dataset.search;renderFiles();$('#file-search').focus({preventScroll:true});}));
 renderFlow('web');renderFiles();
}catch(error){$('#snapshot-status').textContent='분석 정보를 불러오지 못했어요. 새로고침하거나 아래 그래프를 직접 열어 주세요.';console.error(error);}
