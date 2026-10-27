import {readFileSync,writeFileSync} from 'node:fs';
const input=process.argv[2];
if(!input)throw Error('Usage: npm run add-deploy-button -- https://github.com/OWNER/REPO');
const url=new URL(input);
if(url.protocol!=='https:'||url.hostname!=='github.com'||!/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(url.pathname)||url.search||url.hash)throw Error('請使用公開 GitHub repository 的根網址。');
const repo=url.origin+url.pathname.replace(/\/$/,'');
const button='[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url='+encodeURIComponent(repo)+')';
const readme=readFileSync('README.md','utf8');
const result=readme.replace(/<!-- deploy-button:start -->[\s\S]*?<!-- deploy-button:end -->/,'<!-- deploy-button:start -->\n'+button+'\n<!-- deploy-button:end -->');
if(result===readme&&!readme.includes(button))throw Error('README deploy-button markers are missing.');
writeFileSync('README.md',result);
console.log('已將真正的部署按鈕寫入 README；請提交並上傳變更。');

