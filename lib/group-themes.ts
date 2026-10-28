export const groupThemes=[
 {id:'sage',name:'森林綠',color:'#356353',background:'#eef5ef',ink:'#293d36',muted:'#687d70',line:'#d6e4d9',soft:'#e4efe6'},
 {id:'ocean',name:'海洋藍',color:'#27618c',background:'#eaf3fb',ink:'#253e54',muted:'#657e92',line:'#cfdfed',soft:'#deedf9'},
 {id:'lavender',name:'薰衣紫',color:'#705096',background:'#f2ecfa',ink:'#433453',muted:'#83718e',line:'#e1d5ed',soft:'#eae0f6'},
 {id:'amber',name:'暖陽橘',color:'#99551e',background:'#fff3e4',ink:'#503a2a',muted:'#8c735e',line:'#efdcc6',soft:'#fbe7cd'},
 {id:'rose',name:'玫瑰粉',color:'#a34466',background:'#fceef3',ink:'#513441',muted:'#92717f',line:'#efd5df',soft:'#f7dfe9'},
 {id:'slate',name:'石墨灰',color:'#4c6075',background:'#edf1f6',ink:'#303d4c',muted:'#758394',line:'#d5dde7',soft:'#e0e7ef'},
] as const;
export type GroupTheme=typeof groupThemes[number]['id'];
export function validGroupTheme(value:unknown):value is GroupTheme{return groupThemes.some(theme=>theme.id===value)}
export function getGroupTheme(value:unknown){return groupThemes.find(theme=>theme.id===value)||groupThemes[0]}
export function groupThemeStyle(value:unknown){
 const theme=getGroupTheme(value);
 return {'--green':theme.color,'--bg':theme.background,'--ink':theme.ink,'--muted':theme.muted,'--line':theme.line,'--surface-soft':theme.soft};
}
