import {catalog} from './locale-data.mjs';
export const languages=Object.freeze(['en','ko','ja','zh-Hans','zh-Hant']);
export function normalizeLocale(value){
 const id=String(value||'').replaceAll('_','-').toLowerCase();
 if(id==='ko'||id.startsWith('ko-'))return 'ko';if(id==='ja'||id.startsWith('ja-'))return 'ja';
 if(id==='zh-hant'||/^zh-(?:hant-|tw|hk|mo)/.test(id))return 'zh-Hant';
 if(id==='zh'||id==='zh-hans'||/^zh-(?:hans-|cn|sg)/.test(id))return 'zh-Hans';return 'en';
}
export const languageName=value=>({en:'English',ko:'Korean',ja:'Japanese','zh-Hans':'Simplified Chinese (use simplified characters)','zh-Hant':'Traditional Chinese (use traditional characters)'}[normalizeLocale(value)]);
const templates=[];
for(const [source,translations]of Object.entries(catalog))if(/\{p\d+\}/.test(source)){
 const keys=[],pattern=source.split(/(\{p\d+\})/).map(part=>/^\{p\d+\}$/.test(part)?(keys.push(part),'([\\s\\S]*?)'):part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('');
 templates.push({source,translations,keys,pattern:new RegExp('^'+pattern+'$')});
}
templates.sort((a,b)=>b.source.length-a.source.length);
export function localeText(language,text){
 const lang=normalizeLocale(language);if(lang==='en'||lang==='ko'||typeof text!=='string'||!text)return text;
 if(catalog[text]?.[lang])return catalog[text][lang];
 for(const entry of templates){const m=entry.pattern.exec(text);if(m&&entry.translations[lang]){const values=Object.fromEntries(entry.keys.map((k,i)=>[k,m[i+1]]));return entry.translations[lang].replace(/\{p\d+\}/g,key=>values[key]);}}
 return text;
}
export function localeObject(language,value){
 if(typeof value==='string')return localeText(language,value);
 if(Array.isArray(value))return value.map(v=>localeObject(language,v));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,localeObject(language,v)]));return value;
}
