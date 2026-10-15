import {loadPyodide} from './pyodide/pyodide.mjs';
let py;
const ready=(async()=>{
  py=await loadPyodide({indexURL:'./pyodide/'});
  py.FS.mkdir('/core');
  const modules=['engine','domain','ports','game_api','art','dungeons','collectibles','journeys','personality'];
  async function get(url){const response=await fetch(url);if(!response.ok)throw Error(`불러오기 실패: ${url}`);return response.text();}
  await Promise.all(modules.map(async name=>py.FS.writeFile(`/core/${name}.py`,await get(`./core/${name}.py`))));
  py.globals.set('rules_json',await get('./data/game_data.json'));
  py.globals.set('templates_json',await get('./data/image_prompts.json'));
  py.runPython(`import sys,json,random
sys.path.insert(0,'/core')
from game_api import transition
from ports import ExecutionContext
rules=json.loads(rules_json)
templates=json.loads(templates_json)
def execute(raw):
    p=json.loads(raw)
    ids=iter(p['ids'])
    context=ExecutionContext(rules,templates,p['now'],random.Random(p['seed']),lambda:next(ids))
    r=transition(p['state'],p['command'],context,arguments=p['arguments'],request_id=p['requestId'])
    return json.dumps(dict(result=r.result,state=r.state,changed=r.changed),ensure_ascii=False)
`);
})();
self.onmessage=async({data})=>{
  try{await ready;py.globals.set('request_json',JSON.stringify(data.payload));const result=JSON.parse(py.runPython('execute(request_json)'));postMessage({id:data.id,result});}
  catch(error){postMessage({id:data.id,error:String(error)});}
};
