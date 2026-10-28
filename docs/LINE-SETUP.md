# LINE 登入設定與驗收

本專案使用 LIFF 官方 SDK 與伺服器端 ID token 驗證，不要求網站密碼、不收集 LINE Email，也不需 Channel secret。

## 建立自己的 LINE 設定

1. 登入 [LINE Developers Console](https://developers.line.biz/console/)，建立自己的 Provider 與 LINE Login channel。
2. App types 選 Web app，填寫開發者自己的聯絡資訊。
3. 到 LIFF 頁籤新增應用程式，Size 選 Full。
4. Endpoint URL 填自己的正式 HTTPS 網址，例如 https://your-app.workers.dev/。
5. Scopes 僅選 openid、profile；不選 email 或 chat_message.write。
6. 複製 Channel ID、LIFF ID，以及同一 Provider 下管理員本人的 Your user ID。
7. 執行 npm run setup 填入設定，再執行 npm run deploy。Cloudflare 網頁部署者可將設定加入 Worker 環境設定並重新部署。
8. 管理員先從 LIFF URL 測試，再將 channel 設為 Published，讓一般家人登入。Developing 只允許 channel Admin 或 Tester。

Your user ID 為 U 開頭的帳號識別碼，不是你給朋友搜尋的 LINE 自訂 ID。不要把管理員設為第一位登入者；必須明確指定。

## 啟用前後驗收

- 設定缺漏或 LINE 驗證失敗時，任務、照片與成員 API 必須拒絕存取。
- 管理員第一次登入可直接使用；其他帳號由有效群組邀請連結登入時，會自動核准並加入該群組；沒有邀請來源時仍保持待核准。
- 等待核准或已停用的帳號不能讀取任務、照片，不能核准其他人。
- 有效邀請連結只加入對應群組，不會取得其他群組或管理員權限；無效、過期、已更新的連結不得核准帳號。
- 網站管理員仍可核准沒有邀請來源的帳號；核准帳號本身不等同加入所有群組。
- 核准及加入群組其中任一操作失敗時，兩者都必須回復。
- 新任務的建立人採用驗證過的 LINE 名稱及識別碼，不能由表單偽造。
- 停用成員後，下一個 API 請求應被拒絕。已下載或已看過的內容無法追溯收回。
- 重新整理及換裝置後，確認任務與照片仍可讀取。
- LINE 內與外部瀏覽器都要測試；同意授權的畫面由 LINE 決定。

## 實作與權限

ID token 以 Authorization: Bearer 傳送到同源 API，再由伺服器送到 LINE 官方 verify endpoint。伺服器檢查 issuer、audience、subject、expiry 與 profile name；不接受前端自行傳入的名稱當成身分證明。

成功的驗證最多快取 60 秒，快取 key 為 token 的 SHA-256 摘要；每次 API 仍查詢 D1 成員狀態。照片以帶授權標頭的 fetch 載入 Blob，token 不出現在圖片網址中。

同一網站可建立多個群組，透過群組專屬邀請連結加入及切換清單。一般 LIFF 或首頁連結不會依 LINE 聊天室自動建立空間，也不會讀取聊天室成員。各群組的任務、負責人選項與照片存取都需驗證群組資格。

獨立部署預設強制 LINE 模式，不依賴 Sites 或 ChatGPT 登入。原始程式保留受信任託管平台的可選 adapter，但獨立部署工具拒絕啟用該模式；不應把外部傳入的平台身分標頭視為可信來源。

## 官方文件

- [建立 channel](https://developers.line.biz/en/docs/liff/getting-started/)
- [新增 LIFF app](https://developers.line.biz/en/docs/liff/registering-liff-apps/)
- [安全使用 LINE 個人資料](https://developers.line.biz/en/docs/liff/using-user-profile/)
- [LINE Login API](https://developers.line.biz/en/reference/line-login/)

