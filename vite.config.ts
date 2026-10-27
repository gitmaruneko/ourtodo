import vinext from 'vinext';
import {defineConfig} from 'vite';
import {cloudflare} from '@cloudflare/vite-plugin';
import {existsSync} from 'node:fs';
const configPath=existsSync('wrangler.local.json')?'wrangler.local.json':'wrangler.json';
export default defineConfig({plugins:[vinext(),cloudflare({configPath,viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false})]});

