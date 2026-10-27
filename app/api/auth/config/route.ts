import {lineConfig} from '@/lib/access';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({...lineConfig(),uploadsEnabled:false},{headers:{'Cache-Control':'no-store'}});}

