export const statuses = ['未處理','安排中','需協助','已完成'] as const;
export type Photo = {id:string; name:string};
export type Task = {id:string; title:string; date:string; assignee:string; description:string; notes:string; status:string; creator:string; photos:Photo[]; version:number; createdAt:string; updatedAt:string};
export function validDate(value:string) {
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '2100-12-31') return false;
 const d=new Date(value+'T00:00:00Z');return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;
}
