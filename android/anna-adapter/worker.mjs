import {loadPyodide} from './pyodide/pyodide.mjs';
let py;
const ready=(async()=>{
 py=await loadPyodide({indexURL:new URL('./pyodide/',import.meta.url).href});
 const read=async path=>{const r=await fetch(new URL(path,import.meta.url));if(!r.ok)throw Error('Packaged Python source unavailable');return r;};
 const files=await(await read('./python-files.json')).json();
 await Promise.all(files.map(async name=>{const path='/local/'+name;py.FS.mkdirTree(path.slice(0,path.lastIndexOf('/')));py.FS.writeFile(path,new Uint8Array(await(await read('./python/'+name)).arrayBuffer()));}));
 py.runPython("import sys; sys.path.insert(0, '/local')");py.runPython('from android_host import invoke_json');
})();
let queue=Promise.resolve();
self.onmessage=({data})=>{queue=queue.catch(()=>{}).then(async()=>{
 try{await ready;py.globals.set('request_json',JSON.stringify(data.payload));const result=JSON.parse(await py.runPythonAsync('await invoke_json(request_json)'));postMessage({id:data.id,result});}
 catch(error){postMessage({id:data.id,error:String(error)});}
});};
