// Browser-direct BYOK. Keys live only in the settings input, never in saves.
export async function dataURL(blob){
  return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});
}
export function createGemini(settings){
  const controllers=new Set(),urls=new Set();let closed=false;
  async function request(model,body,timeout,signal){
    if(closed)throw Error('Companion changed');
    const key=settings().key;
    if(!key)throw Error('설정에서 Gemini API 키를 입력해 주세요.');
    if(!/^gemini-[a-zA-Z0-9._-]{1,100}$/.test(model))throw Error('모델 이름을 확인해 주세요.');
    const controller=new AbortController();controllers.add(controller);
    const abort=()=>controller.abort();if(signal?.aborted)controller.abort();signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,{
        method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:controller.signal,body:JSON.stringify(body)
      });
      if(!response.ok)throw Error(`AI 요청 실패 (${response.status}). 키·모델·할당량을 확인해 주세요.`);
      const result=await response.json();if(closed)throw Error('Companion changed');return result;
    }finally{clearTimeout(timer);controllers.delete(controller);signal?.removeEventListener('abort',abort);}
  }
  return {
    llm:{async complete(options,{signal}={}){
      const result=await request(settings().model,{
        systemInstruction:{parts:[{text:options.systemPrompt}]},
        contents:options.messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:typeof m.content==='string'?m.content:m.content.text}]})),
        generationConfig:{maxOutputTokens:options.maxTokens??1024,temperature:options.temperature??.35,...(options.json===false?{}:{responseMimeType:'application/json'})}
      },60000,signal);
      return {content:{text:result.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text??'').join('')??''}};
    }},
    image:{async generate(options,{signal}={}){
      const references=[];
      for(const url of options.reference_image_urls??[]){
        // References are local Blob URLs; never ask a provider to fetch private URLs.
        if(!url.startsWith('blob:'))throw Error('Invalid local reference');
        const response=await fetch(url);if(!response.ok)throw Error('그림을 읽지 못했어요.');
        const blob=await response.blob();references.push({inlineData:{mimeType:blob.type,data:(await dataURL(blob)).split(',')[1]}});
      }
      const result=await request(settings().imageModel,{
        contents:[{role:'user',parts:[{text:options.prompt},...references]}],
        generationConfig:{responseModalities:['TEXT','IMAGE'],imageConfig:{aspectRatio:'1:1'}}
      },240000,signal);
      const part=result.candidates?.[0]?.content?.parts?.find(p=>!p.thought&&(p.inlineData||p.inline_data));
      const inline=part?.inlineData??part?.inline_data,mime=inline?.mimeType??inline?.mime_type;
      if(!inline?.data||!['image/png','image/jpeg','image/webp'].includes(mime)||inline.data.length>28000000)throw Error('이미지 응답이 없거나 너무 커요.');
      const blob=await (await fetch(`data:${mime};base64,${inline.data}`)).blob();
      const url=URL.createObjectURL(blob);urls.add(url);return {images:[{url}]};
    }},
    clear(){closed=true;for(const c of controllers)c.abort();for(const url of urls)URL.revokeObjectURL(url);controllers.clear();urls.clear();}
  };
}
