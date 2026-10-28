import {createContext,useContext,type ReactNode} from 'react';
import {demoName,type DemoStore} from './store';
const Context=createContext<DemoStore|null>(null);
export function DemoAuth({store,children}:{store:DemoStore;children:ReactNode}){return <Context.Provider value={store}>{children}</Context.Provider>}
export function useAuth(){const store=useContext(Context);if(!store)throw Error('缺少 Demo 儲存空間');return {user:{userId:'demo-user',displayName:demoName,provider:'platform' as const,isAdmin:false,status:'approved'},liffId:null,uploadsEnabled:true,authFetch:store.request}}
export function AuthImage({photoId,alt}:{photoId:string;alt:string}){const store=useContext(Context),src=store?.photo(photoId);return src?<img src={src} alt={alt}/>:<span>照片不存在</span>}
