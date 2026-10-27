'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,CheckCheck,ExternalLink} from 'lucide-react';
export default function Setup(){
 const [origin,setOrigin]=useState('https://your-app.workers.dev'),[ready,setReady]=useState(false),[liffId,setLiffId]=useState('');
 useEffect(()=>{if(window.location.protocol==='https:')setOrigin(window.location.origin);fetch('/api/auth/config',{cache:'no-store'}).then(r=>r.json()).then((c:any)=>{setReady(c.enabled&&c.configured);setLiffId(c.liffId||'')}).catch(()=>{})},[]);
 return <main className="settings-page standalone"><a className="back-link" href="/"><ArrowLeft size={16}/>回到任務清單</a><div className="settings-heading"><div><span className="eyebrow">CONNECT WITH LINE</span><h1>讓家人用 LINE 管理待辦</h1><p>設定一次，家人即可用 LINE 名稱登入，不需另設網站密碼。</p></div><span className="brand-icon"><CheckCheck/></span></div>
 <div className="setup-status">{ready?<>LINE 登入已設定。分享專用連結：<a href={'https://liff.line.me/'+liffId}>{'https://liff.line.me/'+liffId}</a></>:<>LINE 登入尚未完成設定。先部署網站取得 HTTPS 網址，再完成下方設定。未設定完成前，LINE 模式不會開放任務或照片。</>}</div>
 <ol className="setup-steps"><li><h2>登入 LINE Developers</h2><p>以管理員自己的 LINE 帳號進入 <a href="https://developers.line.biz/console/" target="_blank" rel="noreferrer">LINE Developers Console <ExternalLink size={13}/></a>。首次使用需完成開發者註冊與條款確認。</p></li>
 <li><h2>建立 Provider 與 LINE Login channel</h2><p>以專案或組織名稱建立 Provider，再建立 LINE Login channel。Channel 名稱可填「ourtodo」，App types 選 <b>Web app</b>。不需 Messaging API 或聊天機器人。</p><p>Channel 的聯絡 Email 是開發者資料；家人登入此網站不需提供 Email。若要求隱私權政策網址，可填 <code>{origin}/privacy</code>。</p></li>
 <li><h2>新增 LIFF 應用程式</h2><p>在 channel 的 LIFF 頁籤按 Add，使用以下設定。若目前是在本機預覽，請將範例網址換成正式部署的 HTTPS 網址。</p><div className="setup-values"><div><span>LIFF app name</span><b>ourtodo</b></div><div><span>Size</span><b>Full</b></div><div><span>Endpoint URL</span><code>{origin}/</code></div><div><span>Scopes</span><b>openid、profile</b></div><div><span>Email／傳送訊息權限</span><b>不勾選</b></div><div><span>Add friend option（若有）</span><b>Off</b></div></div><p>記下新增後的 LIFF ID。本專案由 LIFF 處理登入，不需自行建立 OAuth callback。</p></li>
 <li><h2>取得三項設定</h2><p>在 channel 的 Basic settings 複製 <b>Channel ID</b> 與 <b>Your user ID</b>；LIFF ID 則在 LIFF 頁籤。Your user ID 是 U 開頭的識別碼，與給朋友搜尋的 LINE 自訂 ID 不同。</p><pre>LINE_CHANNEL_ID：Channel ID<br/>LINE_LIFF_ID：LIFF ID<br/>LINE_ADMIN_USER_ID：管理員的 Your user ID</pre><p>不需 Channel secret。請勿把 LINE 密碼、登入權杖或個人部署設定提交到公開 GitHub。</p></li>
 <li><h2>填入設定並重新部署</h2><p>自行部署的使用者，在專案資料夾執行 <code>npm run setup</code> 填入三項值，再執行 <code>npm run deploy</code>。使用 Cloudflare 網頁部署者，將三項值設定為 Worker 的環境變數或機密，再重新部署。</p><p>若網站仍有託管平台的額外登入限制，管理員須先確認 LINE 權限保護已啟用，再調整外層存取權限。不要在尚未啟用 LINE 保護前開放私人資料。</p></li>
 <li><h2>管理員測試，再讓家人加入</h2><p>先使用管理員帳號測試 LIFF 專用連結，再將 LINE Login channel 從 Developing 改為 Published。Developing 狀態僅限 channel 的 Admin 或 Tester 使用。</p><p>將 LIFF 專用連結貼到家庭群組；家人首次登入會等待核准。管理員到「成員管理」核准後，家人才能讀取任務和照片。轉貼連結不會自動取得成員權限。</p></li></ol>
 <div className="setup-links"><a href="https://developers.line.biz/en/docs/liff/getting-started/" target="_blank" rel="noreferrer">官方：建立 channel</a><a href="https://developers.line.biz/en/docs/liff/registering-liff-apps/" target="_blank" rel="noreferrer">官方：新增 LIFF</a><a href="/privacy">資料使用說明</a></div></main>;
}

