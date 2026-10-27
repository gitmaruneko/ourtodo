# ourtodo

手機優先、繁體中文的共用待辦網站。家人用 LINE 名稱登入，核准後一起管理任務。

React / TypeScript · Cloudflare Workers / D1 · MIT

<!-- deploy-button:start -->
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fgitmaruneko%2Fourtodo%2Ftree%2Fmain)
<!-- deploy-button:end -->

## 選擇部署版本

| 分支 | 功能 | Cloudflare 儲存需求 |
| --- | --- | --- |
| [main](https://github.com/gitmaruneko/ourtodo/tree/main) | 純文字任務；移除照片上傳介面，後端拒絕新增照片 | D1，不需 R2 |
| [with-r2](https://github.com/gitmaruneko/ourtodo/tree/with-r2) | 任務與照片上傳，支援照片預覽 | D1 + R2，需先自行開通 R2 |

目前閱讀的是 **main 純文字版本**。上方部署按鈕固定使用 main。

手動下載時，明確選擇分支：

```sh
git clone --branch main https://github.com/gitmaruneko/ourtodo.git
cd ourtodo
```

請使用各自的專案資料夾設定部署。若在同一資料夾切換分支，請重新執行 setup 與 build，避免沿用 Git 忽略的舊 wrangler.local.json 或建置結果。

## 可以做什麼

- 新增與編輯任務名稱、有效日期、負責人、詳細說明、注意事項。
- 四種狀態：未處理、安排中、需協助、已完成。
- 清單一行一筆；關鍵字、負責人、狀態與日曆日期篩選。
- 本分支不提供照片上傳；需要照片功能請選 with-r2。
- 日期前後端驗證：2026/11/31 會被拒絕。
- LINE 名稱自動帶入建立人；伺服器驗證身分並記錄帳號識別碼。
- 管理員核准成員；未登入、等待核准或停用的帳號無法讀取任務或照片。
- 多人同時修改時會拒絕過期版本，避免覆蓋別人的更新。

這是網頁應用程式，不需要 LINE 聊天機器人或 Messaging API。

## 最快開始：部署到自己的 Cloudflare

需要 Node.js 24 LTS（最低 22.13）、Cloudflare 帳號及 Git，不需要開通 R2。

1. 下載或 clone 這個 repository，開啟專案資料夾。
2. 安裝套件並登入 Cloudflare：

```sh
npm ci
npm run cf:login
```

3. 設定並部署：

```sh
npm run setup
npm run deploy
```

setup 會詢問網站名稱、建立或重用同名 D1 資料庫，將個人設定寫入 Git 忽略的 wrangler.local.json。deploy 會建置、套用尚未執行的資料表更新、部署 Worker。

目前不提供照片上傳；介面已移除上傳欄位，後端也會拒絕檔案。

**還沒有 LINE 設定？可以先留空。** 網站部署後只提供登入／設定入口，任務與照片保持封鎖。開啟部署網址的 /line-setup，完成 LINE 設定後再次執行 setup 和 deploy。

第一次部署會印出自己的 HTTPS 網址；之後不要更換 LINE channel 的 Provider，以免成員識別碼改變。

多個 Cloudflare 帳號使用者，請先選定 CLOUDFLARE_ACCOUNT_ID 再執行設定。建立資源或部署失敗時，程式會停止，不會重設或清空原有資料庫。

## 設定 LINE（只做一次）

在 [LINE Developers Console](https://developers.line.biz/console/) 建立自己的 LINE Login channel，App types 選 Web app。新增 LIFF app：Size 選 Full，Endpoint URL 填自己的 HTTPS 網址，Scopes 僅選 openid 和 profile。

需要三項值：

| 設定 | 取得位置 |
| --- | --- |
| LINE_CHANNEL_ID | Basic settings → Channel ID |
| LINE_LIFF_ID | LIFF → LIFF ID |
| LINE_ADMIN_USER_ID | Basic settings → 管理員本人的 Your user ID |

不需要 Channel secret，也不申請家人的 Email 權限。詳細步驟見 [LINE 設定與驗收](docs/LINE-SETUP.md)，部署後也可在 /line-setup 查看。

先由管理員測試，再將 channel 設為 Published，讓一般家人登入。分享 LIFF 專用連結；家人首次登入後，到網站「成員管理」核准。

## 分享給其他人部署

將這個資料夾的內容上傳為自己的公開 GitHub repository；勿上傳 node_modules、dist、.wrangler、wrangler.local.json 或 .dev.vars。

上傳後用真實 repository 網址產生部署按鈕：

```sh
npm run add-deploy-button -- https://github.com/你的帳號/你的專案 --branch main
```

指令會更新 README。提交變更後，其他人即可透過按鈕複製程式，部署到自己的 Cloudflare 帳號。按鈕不會分享原部署者的資料，也不會自動建立 LINE channel。

Cloudflare 網頁部署請使用：
- Build command：npm run build
- Deploy command：npm run deploy -- --skip-build

Cloudflare 會依 wrangler.json 配置 D1，部署指令會以 DB binding 套用 migration。LINE 設定可先留空，再到 Worker 的環境設定補上三項值並重新部署。確認 AUTH_MODE 維持 line；勿用命令列路徑覆蓋平台已配置的資源。

參考 [Cloudflare 官方部署按鈕說明](https://developers.cloudflare.com/workers/platform/deploy-buttons/)。

## 本機開發與驗證

```sh
npm ci
npm run dev
```

dev 會先套用本機資料表，再啟動網站。本機資料儲存在 .wrangler/state，與正式站分開。沒有真實 LINE 設定時可以查看設定頁；請用單元與路由測試驗證權限情境，不要為了預覽而移除登入保護。

```sh
npm run typecheck
npm test
npm run build
npm run deploy -- --dry-run
```

dry-run 不會登入、建立雲端資源或執行遠端 migration，只會檢查建置與發布包。測試以替身 LINE 回應及記憶體 SQLite 驗證權限；真實授權與 LINE 內開啟仍需用自己的 channel 測試。

## 資料與費用

任務及成員存在部署者自己的 D1。目前停用照片上傳，不會建立 R2。專案沒有代管服務，也不與原作者的資料庫連線。Cloudflare 的儲存、運算與讀寫費用依自己的帳號方案計算，請查閱 [D1 費率](https://developers.cloudflare.com/d1/platform/pricing/)。

請自行規劃任務資料備份及清理；既有部署若留有舊照片，本次更新不會刪除歷史檔案。

## 目前範圍

一個部署對應一個共用空間；已核准成員都能讀寫任務。尚無多家庭隔離、留言、通知、刪除任務、成員的唯讀角色或自動備份。

使用 Vinext beta 版本，公開使用前請依自己的需求完成驗收。升級依賴時請先在測試環境確認 LINE 登入、照片及資料表相容性。

## 貢獻與授權

歡迎提交 issue 或 Pull Request，請閱讀 [貢獻指南](CONTRIBUTING.md) 與 [安全說明](SECURITY.md)。本專案使用 [MIT License](LICENSE)；第三方套件依各自授權使用。

