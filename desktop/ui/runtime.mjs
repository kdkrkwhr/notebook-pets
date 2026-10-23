let session;
export async function rpc(method,args={}){
  session ??= fetch('/session').then(async r=>{if(!r.ok)throw Error('Local service unavailable');return r.json();});
  const {token}=await session;
  const response=await fetch('/rpc',{method:'POST',headers:{'Content-Type':'application/json','X-NoteBuddy-Token':token},body:JSON.stringify({method,args})});
  const body=await response.json();
  if(body.error){const e=new Error(body.error.message);e.code=body.error.code;throw e;}
  return body.result;
}
export const AnnaAppRuntime={async connect(){
  await rpc('desktop.info');
  const bridge={};
  for(const [group,methods] of Object.entries({tools:['invoke'],storage:['get','set'],files:['upload_init','upload_finalize','download_url','list','delete'],llm:['complete'],image:['generate']})){
    bridge[group]=Object.fromEntries(methods.map(method=>[method,args=>rpc(`${group}.${method}`,args)]));
  }
  document.body.dataset.desktopReady='true';
  return bridge;
}};
