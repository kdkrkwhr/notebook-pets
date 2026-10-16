import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localURL,ollamaText,comfyImage,validateWorkflow} from '../../web/local-ai.js';
import {createAI,imageReady} from '../../web/ai.js';

const binding={promptNode:'6',promptField:'text',referenceNode:'10',outputNode:'9'};
const graph=()=>({'6':{class_type:'CLIPTextEncode',inputs:{text:'private prompt'}},'10':{class_type:'LoadImage',inputs:{image:'private.png'}},'8':{class_type:'SamplerFixture',inputs:{positive:['6',0],reference:['10',0]}},'9':{class_type:'SaveImage',inputs:{images:['8',0]}}});
const config=()=>({textProvider:'ollama',imageProvider:'comfyui',ollamaURL:'http://localhost:11434',ollamaModel:'qwen3:8b',comfyURL:'http://127.0.0.1:8188',workflow:graph(),binding,key:'DO-NOT-FORWARD'});
const options={systemPrompt:'Rules remain in the core.',messages:[{role:'user',content:{text:'hello'}}],json:true,maxTokens:500};
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});

test('same-PC origins only; never allow credentials, paths or LAN servers',()=>{
 for(const url of ['http://localhost:11434','http://127.0.0.1:8188/','http://[::1]:11434'])assert(localURL(url));
 for(const url of ['https://ollama.com','http://192.168.1.2:11434','file:///tmp/x','http://localhost:11434/api','http://key@localhost:11434','http://localhost:11434/?key=x'])assert.throws(()=>localURL(url));
});
test('Ollama native JSON mode and text modes; cloud models fail before inference',async t=>{
 const calls=[];let details={capabilities:['completion','thinking']};
 t.mock.method(globalThis,'fetch',async(url,init)=>{calls.push({url,init,body:JSON.parse(init.body)});return json(url.endsWith('/show')?details:{message:{content:'{"candidate_id":"one"}'}});});
 const ai=createAI(config);assert.equal((await ai.llm.complete(options)).content.text,'{"candidate_id":"one"}');
 let request=calls.at(-1);assert(request.url.endsWith('/api/chat'));assert.equal(request.body.format,'json');assert.equal(request.body.stream,false);assert.equal(request.body.think,false);assert.equal(request.body.messages[1].content,'hello');assert(!JSON.stringify(calls).includes('DO-NOT-FORWARD'));assert.equal(request.init.credentials,'omit');assert.equal(request.init.redirect,'error');
 await ai.text({...options,json:false});assert.equal(calls.at(-1).body.format,undefined);
 for(const remote of [{remote_host:'https://ollama.com'},{remote_model:'some-model'},{capabilities:['embedding']}]){details=remote;const before=calls.filter(c=>c.url.endsWith('/chat')).length;await assert.rejects(ai.text(options));assert.equal(calls.filter(c=>c.url.endsWith('/chat')).length,before);}
 details={};await assert.rejects(ollamaText({...config(),ollamaModel:'model:cloud'},options));
 ai.clear();await assert.rejects(ai.text(options),/Companion changed/);
});
test('API workflow requires both prompt and current reference in output graph',()=>{
 assert(validateWorkflow(graph(),binding));assert(imageReady(config()));
 for(const mutation of [g=>{delete g['8'].inputs.reference;},g=>{g['10'].class_type='URLImage';},g=>{g['9'].class_type='SomethingElse';}]){const g=graph();mutation(g);assert.throws(()=>validateWorkflow(g,binding));assert(!imageReady({...config(),workflow:g}));}
 assert(!imageReady({...config(),workflow:null}));assert(!imageReady({imageProvider:'gemini',key:''}));
});
test('ComfyUI uploads reference, binds exact prompt, submits once, selects output only',async t=>{
 const blob=new Blob(['fixture'],{type:'image/png'}),ref=URL.createObjectURL(blob),realFetch=fetch,calls=[];let submitted;
 t.mock.method(globalThis,'fetch',async(url,init)=>{
  if(String(url).startsWith('blob:'))return realFetch(url,init);
  calls.push({url,init});assert(!JSON.stringify(init).includes('DO-NOT-FORWARD'));
  if(url.endsWith('/upload/image')){assert(init.body instanceof FormData);assert.equal((await init.body.get('image').arrayBuffer()).byteLength,blob.size);return json({name:'uploaded.png',subfolder:'test',type:'input'});}
  if(url.endsWith('/prompt')){submitted=JSON.parse(init.body);return json({prompt_id:'job',node_errors:{}});}
  if(url.includes('/history/'))return json({job:{status:{completed:true,status_str:'success'},outputs:{'9':{images:[{filename:'sheet.png',type:'output',subfolder:''}]},'99':{images:[{filename:'wrong.png'}]}}}});
  if(url.includes('/view?')){assert(url.includes('filename=sheet.png'));return new Response(blob);}
  throw Error('Unexpected request');
 });
 const c=config();const output=await comfyImage(c,{prompt:'new sprite prompt',reference_image_urls:[ref]},new AbortController().signal);
 assert.equal(output.size,blob.size);assert.equal(submitted.prompt['6'].inputs.text,'new sprite prompt');assert.equal(submitted.prompt['10'].inputs.image,'test/uploaded.png');assert.equal(c.workflow['10'].inputs.image,'private.png');assert.equal(calls.filter(c=>c.url.endsWith('/prompt')).length,1);URL.revokeObjectURL(ref);
});
test('ComfyUI rejected or failed job never retries or falls back to Gemini',async t=>{
 const ref=URL.createObjectURL(new Blob(['ref'],{type:'image/png'})),realFetch=fetch,calls=[];let mode='reject';
 t.mock.method(globalThis,'fetch',async(url,init)=>{
  if(String(url).startsWith('blob:'))return realFetch(url,init);calls.push(url);assert(!url.includes('google'));
  if(url.endsWith('/upload/image'))return json({name:'ref.png',type:'input'});
  if(url.endsWith('/prompt')){if(mode==='reject')return new Response('{}',{status:400});return json({prompt_id:'job'});}
  if(url.includes('/history/'))return json({job:{status:{status_str:'error'}}});
  throw Error('Unexpected request');
 });
 const ai=createAI(config);await assert.rejects(ai.image.generate({prompt:'sheet',reference_image_urls:[ref]}));assert.equal(calls.filter(u=>u.endsWith('/prompt')).length,1);
 mode='failed';await assert.rejects(ai.image.generate({prompt:'sheet',reference_image_urls:[ref]}));assert.equal(calls.filter(u=>u.endsWith('/prompt')).length,2);ai.clear();URL.revokeObjectURL(ref);
});
test('clear aborts an in-flight local request and suppresses late responses',async t=>{
 let signal,release,seen;const started=new Promise(r=>seen=r);
 t.mock.method(globalThis,'fetch',async(url,init)=>{signal=init.signal;seen();return new Promise(r=>release=r);});
 const ai=createAI(config),request=ai.text(options);await started;ai.clear();assert(signal.aborted);release(json({capabilities:['completion']}));await assert.rejects(request);
});
