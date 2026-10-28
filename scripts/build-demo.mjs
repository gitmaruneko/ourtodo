import {build} from 'esbuild';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const result=await build({entryPoints:['demo/main.tsx'],outfile:'dist-demo/assets/demo.js',bundle:true,minify:true,format:'esm',jsx:'automatic',platform:'browser',target:['es2020'],define:{'process.env.NODE_ENV':'"production"'},alias:{'@/components/access-gate':resolve('demo/auth.tsx')},plugins:[{name:'local-fonts-only',setup(b){b.onLoad({filter:/app[\\/]globals\.css$/},async({path})=>({contents:(await readFile(path,'utf8')).replace(/^@import\s+[^\r\n]+[\r\n]+/m,''),loader:'css'}))}}],metafile:true});
const inputs=Object.keys(result.metafile.inputs);
for(const path of inputs)if(/^(app\/api\/|db\/|worker\/)|(?:line-client|line-session|wrangler|lib\/access|lib\/groups\.ts)/.test(path))throw Error('Private/server dependency in demo: '+path);
for(const path of Object.keys(result.metafile.outputs)){
 const text=await readFile(path,'utf8');
 if(/workers\.dev|liff\.line\.me|line-scdn\.net|LINE_CHANNEL|LINE_LIFF|Bearer |\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(text))throw Error('Network or LINE dependency in demo: '+path);
 if(path.endsWith('.css')&&/https?:\/\//.test(text))throw Error('External CSS dependency in demo: '+path);
}
await mkdir('dist-demo',{recursive:true});
await copyFile('demo/index.html','dist-demo/index.html');
await writeFile('dist-demo/.nojekyll','');
await writeFile('work/demo-build-inputs.json',JSON.stringify(inputs,null,2)+'\n').catch(()=>{});
console.log('Built isolated local-only demo in dist-demo (no network/LINE/server dependencies).');
