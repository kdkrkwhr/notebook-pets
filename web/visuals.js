import {snapshot,updateVisuals} from './store.js';
import {ART,STORY,CHAT} from './data.mjs';
import {imageKey,starter,portraitEntry,normalHistory} from './model.mjs';
import {currentHomeAppearance,homeNeedsChoice,HOME_SPRITE_PROMPT} from './home-sprite.mjs';
import {dataURL} from './gemini.js';
import {parseStory} from './walk-stories.mjs';
import {journeyStory,journeyInfluence} from './journey-stories.mjs';

export function createVisuals(db,epoch,petId,ai){
  const urls=new Map(),references=new Set();let art={},closed=false;
  const guard=player=>{if(closed||(player.epoch??0)!==epoch||player.state?.pet_id!==petId)throw Error('Companion changed');};
  const pathOK=path=>typeof path==='string'&&path.startsWith(`portraits/${petId}/`)&&/^[a-zA-Z0-9/._-]+$/.test(path);
  const url=path=>urls.get(path)||'';
  async function read(){const data=await snapshot(db);guard(data.player);return data;}
  async function refresh(){
    const data=await read();art=data.visuals.art;
    for(const [path,value] of urls)if(!Object.hasOwn(data.visuals.files,path)){URL.revokeObjectURL(value);urls.delete(path);}
    for(const [path,blob] of Object.entries(data.visuals.files))if(!urls.has(path))urls.set(path,URL.createObjectURL(blob));
    return art;
  }
  async function upload(path,blob){
    if(!pathOK(path)||!(blob instanceof Blob)||blob.size>20000000||!['image/png','image/jpeg','image/webp'].includes(blob.type))throw Error('Invalid image');
    if(closed)throw Error('Companion changed');
    await updateVisuals(db,epoch,petId,v=>({...v,files:{...v.files,[path]:blob}}));
    if(urls.has(path))URL.revokeObjectURL(urls.get(path));urls.set(path,URL.createObjectURL(blob));
  }
  const api={...ai,
    storage:{
      async get({key}){if(![ART,STORY,CHAT].includes(key))throw Error('Unsupported key');const {visuals}=await read();return {exists:true,etag:String(visuals.revision),value:visuals[{[ART]:'art',[STORY]:'story',[CHAT]:'chat'}[key]]??null};},
      async set({key,value,if_match}){
        if(![ART,STORY,CHAT].includes(key)||closed)throw Error('Companion changed');
        await updateVisuals(db,epoch,petId,v=>{
          if(String(v.revision)!==if_match)throw Error('conflict');
          return {...v,[{[ART]:'art',[STORY]:'story',[CHAT]:'chat'}[key]]:value};
        });if(key===ART)art=value;
      }
    },
    files:{async download_url({path}){await refresh();if(!pathOK(path)||!url(path))throw Error('Image unavailable');return {get_url:url(path)};}}
  };
  return {api,upload,refresh,guard,art:()=>art,
    portrait:view=>url(portraitEntry(view,art)?.path)||starter(view),
    stagePortrait:(view,stage)=>url(art[imageKey(view,stage)]?.path)||starter(view),
    needsAppearance:view=>homeNeedsChoice(view,art),
    sprite:view=>{const entry=currentHomeAppearance(view,art);return entry?.format==='home-sprite-v1'?url(entry.path):{kind:'default',url:url(entry?.path)||url(portraitEntry(view,art)?.path)||starter(view)};},
    async imageOptions(view,old,source){
      const reference=source.startsWith('portraits/')?(await api.files.download_url({path:source})).get_url:source;
      const response=await fetch(reference);if(!response.ok)throw Error('Reference unavailable');
      const local=URL.createObjectURL(await response.blob());references.add(local);
      return {prompt:HOME_SPRITE_PROMPT,reference_image_urls:[local]};
    },
    async savePortrait(view,blob){
      const path=`portraits/${petId}/portrait-${crypto.randomUUID()}.png`;
      const {visuals}=await read();
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');
      if(visuals.art[imageKey(view)]?.hash===hash)return false;
      await updateVisuals(db,epoch,petId,(v,state)=>{
        if(v.revision!==visuals.revision||state.stage!==view.stage)throw Error('그림이나 성장 단계가 바뀌었어요. 다시 확인해 주세요.');
        return {...v,files:{...v.files,[path]:blob},art:{...v.art,[imageKey(view)]:{path,hash,at:Date.now()}}};
      });await refresh();return true;
    },
    clear(){closed=true;ai.clear();for(const u of [...urls.values(),...references])URL.revokeObjectURL(u);urls.clear();references.clear();}
  };
}

// Decode and bound pixels before saving a user image. Persist PNG, not SVG/HTML.
export async function portraitPNG(file){
  if(!file||file.size>10000000||!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('10MB 이하 PNG·JPEG·WebP 그림을 골라 주세요.');
  const bitmap=await createImageBitmap(file);
  try{
    if(bitmap.width*bitmap.height>16000000)throw Error('그림은 1,600만 픽셀 이하여야 해요.');
    const canvas=document.createElement('canvas'),scale=Math.min(1,1024/Math.max(bitmap.width,bitmap.height));
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('그림 변환 실패')),'image/png'));
  }finally{bitmap.close();}
}
export async function exportNotebook(db){
  const {player,visuals}=await snapshot(db);if(!player.state)throw Error('먼저 친구를 만나 주세요.');
  // Only reachable files belong in a backup; orphaned partial uploads are omitted.
  const files={};for(const entry of Object.values(visuals.art))if(entry?.path&&visuals.files[entry.path])files[entry.path]=await dataURL(visuals.files[entry.path]);
  return {format:'notebuddy-web',version:2,state:player.state,visuals:{art:visuals.art,files,story:visuals.story??null,chat:normalHistory(visuals.chat)}};
}
export async function importVisuals(backup){
  if(backup.version===1)return {revision:0,art:{},files:{}};
  const {art,files}=backup.visuals??{};
  if(!art||!files||Array.isArray(art)||Array.isArray(files)||Object.keys(art).length>40||Object.keys(files).length>40)throw Error('그림 백업 형식을 확인해 주세요.');
  const prefix=`portraits/${backup.state.pet_id}/`,decoded={};let size=0;
  for(const [path,data] of Object.entries(files)){
    if(!path.startsWith(prefix)||!/^[a-zA-Z0-9/._-]+$/.test(path)||typeof data!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data))throw Error('그림 백업 형식을 확인해 주세요.');
    size+=data.length;if(size>50000000)throw Error('그림 백업이 너무 커요.');
    const blob=await (await fetch(data)).blob(),bitmap=await createImageBitmap(blob);
    const valid=bitmap.width*bitmap.height<=16000000;bitmap.close();if(!valid)throw Error('그림이 너무 커요.');decoded[path]=blob;
  }
  for(const [key,entry] of Object.entries(art)){
    const request=(key.startsWith(backup.state.pet_id+'/home-sprite-request-stage-')||key.startsWith(backup.state.pet_id+'/evolution-source-stage-')||key.startsWith(backup.state.pet_id+'/stage-')&&key.endsWith('-evolution-request'))&&entry?.path===entry.source_path&&(Object.hasOwn(decoded,entry.path)||/^assets\/starters-v1\/[a-z0-9_]+\.png$/.test(entry.path));
    if(!key.startsWith(backup.state.pet_id+'/')||!entry||!Object.hasOwn(decoded,entry.path)&&!request)throw Error('그림 연결 정보가 올바르지 않아요.');
  }
  const story=backup.visuals.story??null;
  if(story)try{
    if(story.pet_id!==backup.state.pet_id||!Array.isArray(story.seen)||story.seen.length>64||story.seen.some(id=>typeof id!=='string'||id.length>128)||JSON.stringify(story).length>30000)throw Error();
    const c=story.current;
    if(c){
      if(c.pet_id!==story.pet_id||typeof c.id!=='string'||!['generating','ready','done'].includes(c.state)||!['ko','en'].includes(c.language)||c.state==='done'&&![0,1].includes(c.choice))throw Error();
      parseStory(JSON.stringify(c.story));
      if(c.journey){journeyStory(c.journey,c.language);journeyInfluence(c.journey,c.language);}
    }
  }catch{throw Error('산책 기록 형식을 확인해 주세요.');}
  const chat=backup.visuals.chat??[];
  if(!Array.isArray(chat)||chat.length>64||new TextEncoder().encode(JSON.stringify(chat)).length>40000)throw Error('대화 기록 형식을 확인해 주세요.');
  return {revision:0,art,files:decoded,story,chat:normalHistory(chat)};
}
