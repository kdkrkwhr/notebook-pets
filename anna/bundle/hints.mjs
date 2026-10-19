import {localeText,localeObject} from './locale.mjs';
﻿// Only secondary explanations are collapsible. Status, action costs, choices and
// destructive confirmations remain visible beside their controls.
const selectors=[
 '[data-i18n="battleRecordHelp"]','[data-i18n="chatUsage"]','[data-i18n="imageUsage"]',
 '[data-i18n="dungeonIntro"]','[data-i18n="dungeonRegionsHelp"]','[data-i18n="dungeonDate"]',
 '[data-i18n="dungeonHealthHelp"]','[data-i18n="resetTime"]','[data-i18n="artDrawHelp"]',
 '[data-i18n="artFileHelp"]','[data-i18n="artUsage"]','[data-i18n="personalityUsage"]',
 '[data-i18n="themeHelp"]','[data-i18n="walkDungeonHint"]','[data-i18n="drawVariation"]',
 '[data-item-text="notice"]','#home-usage','#home-appearance-help'
];
export function createHints(document,language){
 const hints=[];let active=null,pinned=false,hideTimer;
 function hide(){clearTimeout(hideTimer);if(active){active.text.hidden=true;active.button.setAttribute('aria-expanded','false');active=null;}pinned=false;}
 function place(){if(!active)return;const {button,text}=active,win=document.defaultView,r=button.getBoundingClientRect(),gap=8,pad=12;
  const body=win.getComputedStyle(document.body),viewport=win.visualViewport;
  const left=(viewport?.offsetLeft||0)+Math.max(pad,parseFloat(body.paddingLeft)||0),right=(viewport?.offsetLeft||0)+(viewport?.width||win.innerWidth)-Math.max(pad,parseFloat(body.paddingRight)||0);
  const top=(viewport?.offsetTop||0)+Math.max(pad,parseFloat(body.paddingTop)||0),bottom=(viewport?.offsetTop||0)+(viewport?.height||win.innerHeight)-Math.max(pad,parseFloat(body.paddingBottom)||0);
  if(r.bottom<top||r.top>bottom){hide();return;}
  text.style.maxWidth=Math.max(0,Math.min(320,right-left))+'px';text.style.maxHeight=Math.max(0,bottom-top)+'px';const box=text.getBoundingClientRect();
  text.style.left=Math.max(left,Math.min(r.left,right-box.width))+'px';
  text.style.top=Math.max(top,Math.min(bottom-box.height,r.bottom+gap+box.height<=bottom?r.bottom+gap:r.top-box.height-gap))+'px';
 }
 function show(h){clearTimeout(hideTimer);if(active!==h){hide();active=h;}h.text.hidden=false;h.button.setAttribute('aria-expanded','true');place();}
 function later(h){clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(active===h&&!pinned&&!h.button.matches(':focus-visible'))hide();},160);}
 for(const text of document.querySelectorAll(selectors.join(','))){
  const button=document.createElement('button');button.type='button';button.className='explanation-help quiet';button.textContent='ⓘ';
  text.id||=`explanation-${hints.length}`;text.classList.add('explanation-tooltip');text.setAttribute('role','tooltip');text.hidden=true;
  button.dataset.hintFor=text.id;button.setAttribute('aria-describedby',text.id);button.setAttribute('aria-expanded','false');
  const parent=text.parentElement,heading=parent.querySelector(':scope > .section-heading h2,:scope > h2,:scope > h3,:scope > .home-shop-heading h3')||parent.closest('.chat-card')?.querySelector('.card-top h2');
  if(heading){
   let row=heading.closest('.section-heading,.home-shop-heading,.card-top,.hint-title-row');
   if(!row){row=document.createElement('div');row.className='hint-title-row';heading.before(row);row.append(heading);}
   row.classList.add('hint-header');
   let group=row.querySelector(':scope > .hint-title-group');
   if(!group){const branch=[...row.children].find(child=>child.contains(heading));group=document.createElement('div');group.className='hint-title-group';branch.before(group);group.append(branch);}
   let actions=row.querySelector(':scope > .hint-header-actions');
   if(!actions){actions=document.createElement('div');actions.className='hint-header-actions';for(const child of [...row.children])if(child!==group)actions.append(child);if(actions.childElementCount)row.append(actions);}
   group.append(button);
  }else if(text.dataset.i18n==='battleRecordHelp'){
   const stats=parent.querySelector('#stats'),row=document.createElement('div');row.className='stats-help-row';stats.before(row);row.append(stats,button);
  }else{button.classList.add('hint-standalone');const tools=parent.querySelector(':scope > .art-tools');if(tools)tools.append(button);else text.before(button);}
  const h={text,button,heading:heading||parent.closest('section,dialog')?.querySelector('h2,h3')};hints.push(h);
  button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')show(h);});button.addEventListener('pointerleave',e=>{if(active===h&&!pinned&&!text.contains(e.relatedTarget)&&!button.matches(':focus-visible'))later(h);});
  text.addEventListener('pointerenter',()=>clearTimeout(hideTimer));
  text.addEventListener('pointerleave',e=>{if(active===h&&!pinned&&e.relatedTarget!==button&&!button.matches(':focus-visible'))later(h);});
  button.addEventListener('focus',()=>{if(button.matches(':focus-visible'))show(h);});button.addEventListener('blur',()=>{if(active===h)hide();});
  button.addEventListener('click',()=>{if(active===h&&pinned)hide();else{show(h);pinned=true;}});
 }
 document.addEventListener('pointerdown',e=>{if(active&&!active.button.contains(e.target)&&!active.text.contains(e.target))hide();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});document.addEventListener('close',hide,true);
 document.defaultView.addEventListener('resize',hide);document.addEventListener('scroll',place,true);
 function render(){for(const {button,heading:title}of hints){const heading=title?.textContent?.trim();button.setAttribute('aria-label',localeText(language(),language()==='ko'?`${heading||'사용'} 안내`:`About ${heading||'this feature'}`));}if(active)place();}
 render();return{render,hide};
}
