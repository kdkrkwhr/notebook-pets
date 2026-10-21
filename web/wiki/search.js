const root=new URL(document.body.dataset.wikiRoot,location.href);
const input=document.querySelector('#wiki-search'),status=document.querySelector('#search-status'),results=document.querySelector('#search-results');
let index;
function show(){
 const query=input.value.trim().toLocaleLowerCase();results.replaceChildren();results.hidden=!query;
 if(!query){status.textContent='기능 해설과 코드 관계 문서의 제목·본문을 검색할 수 있어요.';return;}
 if(!index){status.textContent='검색 색인을 불러오지 못했어요. 목차를 이용하거나 페이지를 새로 열어 주세요.';return;}
 const words=query.split(/\s+/),found=index.filter(page=>words.every(word=>(page.title+' '+page.text).toLocaleLowerCase().includes(word)))
  .sort((a,b)=>Number(b.title.toLocaleLowerCase().includes(query))-Number(a.title.toLocaleLowerCase().includes(query))||Number(a.kind==='graphify')-Number(b.kind==='graphify'));
 status.textContent=found.length?`${found.length}개 문서를 찾았어요.${found.length>20?' 처음 20개를 표시해요. 검색어를 더 입력해 범위를 좁혀 보세요.':''}`:'검색 결과가 없어요. 다른 단어나 파일 이름을 입력해 보세요.';
 for(const page of found.slice(0,20)){
  const li=document.createElement('li'),link=document.createElement('a'),tag=document.createElement('span'),description=document.createElement('p');
  link.href=new URL(page.url,root);link.textContent=page.title;tag.className='result-kind';tag.textContent=page.kind==='guide'?'기능 해설':'Graphify';
  const at=page.text.toLocaleLowerCase().indexOf(words[0]);description.textContent=page.text.slice(Math.max(0,at-35),Math.max(0,at-35)+160).replace(/\s+/g,' ');
  li.append(tag,link,description);results.append(li);
 }
}
input.addEventListener('input',show);
document.querySelector('#clear-search').addEventListener('click',()=>{input.value='';show();input.focus();});
try{const response=await fetch(new URL('search-index.json',root));if(!response.ok)throw Error();index=await response.json();document.body.dataset.searchReady='true';if(input.value)show();}
catch{status.textContent='검색 색인을 불러오지 못했어요. 목차에서 문서를 읽을 수 있어요.';}
