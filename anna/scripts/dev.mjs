import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// The Python harness writes JSON to stdout; Node reads it as UTF-8 on every OS.
const cli=fileURLToPath(new URL('../node_modules/@anna-ai/cli/dist/cli.js',import.meta.url));
const child=spawn(process.execPath,[cli,'dev','--port','5180',...process.argv.slice(2)],{
 stdio:'inherit',env:{...process.env,PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8'}
});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
