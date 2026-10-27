import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const [command,...args]=process.argv.slice(2);
const config=existsSync('wrangler.local.json')?'wrangler.local.json':'wrangler.json';
const settings=JSON.parse(readFileSync(config,'utf8'));
if(settings.vars?.AUTH_MODE!=='line')throw Error('Standalone deployments must use AUTH_MODE=line.');
mkdirSync('work',{recursive:true});
const env={...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:resolve('work/wrangler.log')};
function run(file,args){const result=spawnSync(process.execPath,[file,...args],{stdio:'inherit',env});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
const wrangler='node_modules/wrangler/bin/wrangler.js';
const vinext='node_modules/vinext/dist/cli.js';
switch(command){
 case 'build':run(vinext,['build']);break;
 case 'dev':
 run(wrangler,['d1','migrations','apply','DB','--local','--config',config,'--persist-to','.wrangler/state']);
 run(vinext,['dev','--port','5173',...args]);break;
 case 'deploy':{
 const dry=args.includes('--dry-run');
 if(args.some(a=>!['--dry-run','--skip-build'].includes(a)))throw Error('Only --dry-run and --skip-build are supported.');
 if(!dry&&(!settings.d1_databases?.[0]?.database_id||settings.d1_databases[0].database_id==='00000000-0000-4000-8000-000000000000'))throw Error('Run npm run setup first, or use Cloudflare resource provisioning to configure DB.');
 if(!args.includes('--skip-build'))run(vinext,['build']);
 if(!existsSync('dist/server/wrangler.json'))throw Error('Build output is missing. Run npm run build.');
 if(!dry)run(wrangler,['d1','migrations','apply','DB','--remote','--config',config]);
 run(wrangler,['deploy','--config','dist/server/wrangler.json',...(dry?['--dry-run','--outdir','work/dry-run']:[])]);
 break;
 }
 default:throw Error('Expected dev, build or deploy.');
}

