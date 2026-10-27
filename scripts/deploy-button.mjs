import {readFileSync,writeFileSync} from 'node:fs';
const [input,flag,selectedBranch,...rest]=process.argv.slice(2);
if(!input||rest.length||(flag&&flag!=='--branch')||(flag&&!selectedBranch))throw Error('Usage: npm run add-deploy-button -- https://github.com/OWNER/REPO [--branch main]');
const branch=selectedBranch||'main';
if(!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(branch))throw Error('請使用不含斜線或空白的分支名稱。');
const url=new URL(input);
if(url.protocol!=='https:'||url.hostname!=='github.com'||!/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(url.pathname)||url.search||url.hash)throw Error('請使用公開 GitHub repository 的根網址。');
const repo=url.origin+url.pathname.replace(/\/$/,'');
const source=repo+'/tree/'+branch;
const button='[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url='+encodeURIComponent(source)+')';
const readme=readFileSync('README.md','utf8');
const result=readme.replace(/<!-- deploy-button:start -->[\s\S]*?<!-- deploy-button:end -->/,'<!-- deploy-button:start -->\n'+button+'\n<!-- deploy-button:end -->');
if(result===readme&&!readme.includes(button))throw Error('README deploy-button markers are missing.');
writeFileSync('README.md',result);
console.log('已產生 '+branch+' 分支的部署按鈕。');

