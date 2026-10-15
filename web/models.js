// Browser-direct metadata request only; no generation or proxy server.
export async function listModels(key,signal){
  const available=new Map();let token='';
  for(let page=0;page<4;page++){
    const url=new URL('https://generativelanguage.googleapis.com/v1beta/models');
    url.searchParams.set('pageSize','1000');if(token)url.searchParams.set('pageToken',token);
    const response=await fetch(url,{headers:{'x-goog-api-key':key},signal});
    if(!response.ok)throw Error(`Model list request failed (${response.status})`);
    const data=await response.json();if(!Array.isArray(data.models))throw Error('Invalid model list');
    for(const model of data.models){
      const id=typeof model.name==='string'?model.name.replace(/^models\//,''):'';
      if(/^gemini-[a-zA-Z0-9._-]{1,90}$/.test(id)&&!/(?:image|tts|embedding)/i.test(id)&&Array.isArray(model.supportedGenerationMethods)&&model.supportedGenerationMethods.includes('generateContent'))
        available.set(id,{id,label:typeof model.displayName==='string'?model.displayName.slice(0,160):id});
    }
    token=data.nextPageToken??'';if(typeof token!=='string'||token.length>2048)throw Error('Invalid model page');
    if(!token)return [...available.values()].sort((a,b)=>a.label.localeCompare(b.label));
  }
  throw Error('Incomplete model list');
}
