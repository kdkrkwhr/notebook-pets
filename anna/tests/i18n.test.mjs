import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {messages,t,LANGUAGE_KEY,loadLanguage,saveLanguage,chatPrompt,translateDocument} from '../bundle/i18n.mjs';
import {errorText,mergeHistory} from '../bundle/model.mjs';

test('first visit defaults to English and language preference survives a reload',()=>{
  const values=new Map();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  assert.equal(loadLanguage(storage),'en');assert.equal(saveLanguage(storage,'ko'),true);
  assert.equal(loadLanguage(storage),'ko');assert.equal(values.get(LANGUAGE_KEY),'ko');
  storage.setItem(LANGUAGE_KEY,'unsupported');assert.equal(loadLanguage(storage),'en');
  assert.equal(loadLanguage({getItem(){throw new Error('blocked');}}),'en');
  assert.equal(saveLanguage(null,'ko'),false);
});
test('all UI annotations resolve in both languages, with matching placeholders',()=>{
  const html=readFileSync(new URL('../bundle/index.html',import.meta.url),'utf8');
  assert.match(html,/<html lang="en">/);
  for(const [,key] of html.matchAll(/data-(?:i18n(?:-placeholder|-aria|-alt)?|prompt)="([^"]+)"/g)){
    assert.ok(messages[key],key);assert.ok(t('en',key));assert.ok(t('ko',key));
  }
  for(const [key,[en,ko]] of Object.entries(messages)){
    assert.equal(typeof en,'string',key);assert.equal(typeof ko,'string',key);
    assert.doesNotMatch(en,/[가-힣]/,key);
    assert.deepEqual([...en.matchAll(/\{(\w+)\}/g)].map(x=>x[1]).sort(),[...ko.matchAll(/\{(\w+)\}/g)].map(x=>x[1]).sort(),key);
  }
});
test('language changes update document semantics and accessible labels',()=>{
  const leaf={textContent:'',getAttribute:()=> 'heading'};
  const input={attributes:{},getAttribute:()=> 'chatLabel',setAttribute(k,v){this.attributes[k]=v;}};
  const document={documentElement:{},querySelectorAll(selector){return selector==='[data-i18n]'?[leaf]:selector==='[data-i18n-aria]'?[input]:[];}};
  translateDocument(document,'ko');assert.equal(document.documentElement.lang,'ko');assert.equal(input.attributes['aria-label'],t('ko','chatLabel'));
  translateDocument(document,'en');assert.equal(document.title,'Notebuddy');assert.equal(leaf.textContent,t('en','heading'));
});
test('AI prompt selects the new reply language without rewriting names or memory',()=>{
  const snapshot={name:'모찌',level:1};const old=[{id:'1',role:'user',text:'반가워!',at:1}];
  const before=JSON.stringify(old);
  assert.match(chatPrompt('en',snapshot),/Reply in English/);assert.match(chatPrompt('ko',snapshot),/Reply in Korean/);
  assert.match(chatPrompt('en',snapshot),/모찌/);assert.match(chatPrompt('en',snapshot),/Never claim to execute actions/);
  assert.deepEqual(mergeHistory(old,[]),old);assert.equal(JSON.stringify(old),before);
});
test('both locales show safe errors, never raw transport messages',()=>{
  for(const language of ['en','ko']){
    assert.equal(errorText({details:{jsonrpc_code:-32021}},language),t(language,'storageError'));
    assert.equal(errorText({code:'agent_waking'},language),t(language,'runnerError'));
    assert.equal(errorText(new Error('timeout https://secret/?token=x'),language),t(language,'timeoutError'));
    assert.equal(errorText(new Error('eyJprivate'),language),t(language,'genericError'));
  }
});
