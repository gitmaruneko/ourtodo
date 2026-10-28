# 本機互動 Demo

正式應用使用 Cloudflare Workers、D1 及 LINE；Demo 則是同一份任務介面的靜態建置，入口為 `demo/main.tsx`。

## 隔離方式

- `scripts/build-demo.mjs` 僅打包任務清單元件、樣式、狀態及配色，將登入模組替換為 `demo/auth.tsx`。
- `demo/store.ts` 的 request adapter 是本機函式，不呼叫 fetch。任務、配色與照片保存在 `ourtodo-demo:v1` 這一個 localStorage key，不會修改正式站的 key。
- Demo 沒有 LINE SDK、金鑰、私人任務、正式網址、Cloudflare bindings 或 API routes。
- HTML 的 CSP 使用 `connect-src 'none'`、`form-action 'none'`，阻止程式連到遠端 API；所有 JS/CSS 自站載入，圖片限自站、data 與 blob。
- build 會檢查依賴圖與產物，發現 LINE、伺服器或網路請求程式就失敗。
- localStorage 寫入失敗會顯示錯誤，不會宣稱儲存成功。重設僅取代 Demo 自己的資料。

## 建置與發布

```sh
npm ci
npm run typecheck
npm test
npm run build:demo
```

`dist-demo/` 只包含 HTML、JS、CSS 及 `.nojekyll`。把這些檔案發布到獨立公開 repository 的 main 分支，將 GitHub Pages source 設成 main、根目錄 `/`。請勿加入 `wrangler.local.json`、`.dev.vars`、資料庫、日誌或私人分支歷史。

公開站：<https://gitmaruneko.github.io/ourtodo-demo/>。建置產物 repo：<https://github.com/gitmaruneko/ourtodo-demo>。本 repo 是唯一程式碼來源；Demo repo 的 README 記錄來源提交，後續更新請重新建置發布，不要直接修改產物。

GitHub Pages 發布方式參考 [GitHub 官方說明](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 驗收

新增任務，調整狀態、日期與負責人，加入測試照片並儲存；重新整理後資料仍保留。切換群組不會混入另一群組任務。切換日曆可按日期篩選。另一個瀏覽器設定檔會載入獨立範例。重設後回到預設任務且照片移除。

執行 `tests/demo.test.mjs` 會驗證本機保存、群組隔離、無網路呼叫、照片保存、過期編輯拒絕、容量失敗及重設。
