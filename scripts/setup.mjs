import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const local='wrangler.local.json';
const flags=process.argv.slice(2);
if(flags.some(f=>f!=='--without-photos'))throw Error('Supported option: --without-photos');
const photosEnabled=!flags.includes('--without-photos');
const config=JSON.parse(readFileSync(existsSync(local)?local:'wrangler.json','utf8'));
const rl=createInterface({input:stdin,output:stdout});
const ask=async(label,value='',privateValue=false)=>{
 const answer=(await rl.question(label+(value?(privateValue?'（Enter 沿用已設定值）':' ['+value+']'):'（可稍後填寫）')+': ')).trim();
 return answer||value;
};
try{
 console.log('ourtodo — 設定自己的 Cloudflare 部署');
 console.log('只會建立／連結資料庫，不會刪除資料。尚未建立 LIFF 時可先留空，部署後到 /line-setup 完成設定。');
 const name=await ask('網站名稱',config.name||'ourtodo');
 if(!/^[a-z][a-z0-9-]{1,48}[a-z0-9]$/.test(name))throw Error('名稱需 3–50 字，只能用小寫英文字母、數字與連字號。');
 const channel=await ask('LINE Channel ID',config.vars?.LINE_CHANNEL_ID||'');
 const liff=await ask('LIFF ID',config.vars?.LINE_LIFF_ID||'');
 const admin=await ask('管理員 Your user ID',config.vars?.LINE_ADMIN_USER_ID||'',true);
 if(channel&&!/^\d+$/.test(channel))throw Error('Channel ID 應為數字。');
 if(liff&&!/^\d+-[A-Za-z0-9]+$/.test(liff))throw Error('LIFF ID 格式應為 數字-識別碼。');
 if(admin&&!/^U[a-f0-9]{32}$/.test(admin))throw Error('Your user ID 應為 U 加 32 位十六進位字元。');
 config.name=name;config.vars={AUTH_MODE:'line',LINE_CHANNEL_ID:channel,LINE_LIFF_ID:liff,LINE_ADMIN_USER_ID:admin};
 config.d1_databases=[{binding:'DB',database_name:name+'-db',migrations_dir:'drizzle'}];
 config.r2_buckets=photosEnabled?[{binding:'BUCKET',bucket_name:name+'-photos'}]:[];
 mkdirSync('work',{recursive:true});
 const env={...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:resolve('work/wrangler.log')};
 function cf(args,capture=false){
 const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js',...args],{stdio:capture?['ignore','pipe','pipe']:'inherit',encoding:'utf8',env});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error(capture?'無法讀取 Cloudflare 資料庫。請先執行 npm run cf:login；多帳號使用者需設定 CLOUDFLARE_ACCOUNT_ID。':'Cloudflare 操作失敗，請檢查前面的訊息。');
 return result.stdout;
 }
 const list=()=>JSON.parse(cf(['d1','list','--json'],true));
 let databases=list(),found=databases.find(d=>d.name===name+'-db');
 if(!found){cf(['d1','create',name+'-db']);databases=list();found=databases.find(d=>d.name===name+'-db');}
 if(!found?.uuid)throw Error('找不到新資料庫識別碼，設定尚未寫入。重新執行 setup 即可重用已建立的資料庫。');
 config.d1_databases[0].database_id=found.uuid;
 writeFileSync(local,JSON.stringify(config,null,2)+'\n',{mode:0o600});
 console.log('已儲存到 wrangler.local.json（Git 會忽略）。');
 console.log(photosEnabled?'接著執行 npm run deploy。Wrangler 會確認／建立 R2 照片空間；帳號需先開通 R2。':'接著執行 npm run deploy。此部署不使用 R2，照片上傳會停用。');
 console.log('若三項 LINE 設定尚未齊全，網站只顯示設定入口，不會開放任務。');
}finally{rl.close()}

