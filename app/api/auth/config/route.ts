import {lineConfig} from '@/lib/access';
export const dynamic='force-dynamic';
export async function GET(){return Response.json(lineConfig(),{headers:{'Cache-Control':'no-store'}});}

