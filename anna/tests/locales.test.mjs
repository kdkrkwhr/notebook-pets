import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../bundle/locale-data.mjs';
import {languages,normalizeLocale,localeText,languageName} from '../bundle/locale.mjs';
import {messages,t,chatPrompt,saveLanguage,loadLanguage} from '../bundle/i18n.mjs';
import {reactionPrompt} from '../bundle/reactions.mjs';
import {storyPrompt,basicStory} from '../bundle/walk-stories.mjs';
import {evolutionSystem} from '../bundle/evolution.mjs';
import {journeyStory} from '../bundle/journey-stories.mjs';
const added=['ja','zh-Hans','zh-Hant'],slots=s=>[...s.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort();
test('all new locales cover every public UI message and preserve interpolation fields',()=>{
 for(const lang of added)for(const[key,[en]]of Object.entries(messages)){
  assert.ok(catalog[en]?.[lang],`${lang}:${key}`);assert.deepEqual(slots(catalog[en][lang]),slots(en),`${lang}:${key}`);
  assert.ok(!/\?{3,}/.test(catalog[en][lang]),`${lang}:${key}: encoding damage`);
 }
 for(const[en,translations]of Object.entries(catalog))for(const lang of added)assert.deepEqual(slots(translations[lang]),slots(en),`${lang}:${en}`);
});
test('locale aliases and preference recovery preserve five distinct languages',()=>{
 assert.deepEqual(languages,['en','ko','ja','zh-Hans','zh-Hant']);assert.equal(normalizeLocale('zh-TW'),'zh-Hant');assert.equal(normalizeLocale('zh_CN'),'zh-Hans');assert.equal(normalizeLocale('ja-JP'),'ja');assert.equal(normalizeLocale('bad'),'en');
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 for(const lang of languages){saveLanguage(storage,lang);assert.equal(loadLanguage(storage),lang);}
 assert.equal(localeText('ja',"Feed's home & garden"),'Feedの家と庭');
 assert.equal(t('zh-Hant','diary'),catalog[messages.diary[0]]['zh-Hant']);
});
test('all AI prompts request the selected output script while preserving user names and stored history',()=>{
 for(const lang of languages){
  const expected=languageName(lang),event={language:lang,status:{name:'Feed'},command:'feed',result:'Meal time complete.'};
  assert.ok(chatPrompt(lang,{name:'Feed'}).includes(expected));assert.ok(reactionPrompt(event).includes(expected));assert.ok(storyPrompt({language:lang,name:'Feed'}).includes(expected));assert.ok(evolutionSystem(lang).includes(expected));
 }
});
test('free fallback walk choices and authoritative chapters are localized without AI',()=>{
 for(const lang of added){const story=basicStory(lang);assert.ok(/[\u3040-\u30ff\u3400-\u9fff]/.test(story.title));assert.equal(story.choices.length,2);
  for(const arc of ['trail','garden','shelter','river','workshop','market'])for(let chapter=0;chapter<3;chapter++){
   const x=journeyStory({arc,chapter,previous_choice:null,prepared:true,variant:0},lang);assert.ok(/[\u3040-\u30ff\u3400-\u9fff]/.test(x.title));assert.equal(x.choices.length,2);assert.ok(x.choices.every(c=>/[\u3040-\u30ff\u3400-\u9fff]/.test(c.label)));
  }
 }
});
