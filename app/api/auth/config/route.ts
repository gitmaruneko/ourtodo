import {lineConfig} from '@/lib/access';
import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({...lineConfig(),uploadsEnabled:Boolean(env.BUCKET)},{headers:{'Cache-Control':'no-store'}});}

