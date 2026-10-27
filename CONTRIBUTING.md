# 參與貢獻

歡迎提交問題回報與 Pull Request。請使用繁體中文或英文描述重現步驟、預期結果、實際結果與瀏覽器版本，避免附上真實家庭資料或登入權杖。

建議使用 Node.js 24 LTS。

```sh
npm ci
npm run typecheck
npm test
npm run build
```

資料表修改請執行 npm run db:generate，提交新的 SQL 與 Drizzle metadata，勿修改已套用的 migration。保留舊資料相容性。

權限相關修改請同時驗證匿名、等待核准、已核准、停用及管理員情境；照片端點必須套用相同保護。不要加入第一位登入者自動成為管理員的行為。

不接受把個人 LINE ID、Cloudflare account ID、資料庫 ID、機密或任務資料直接寫入範本的修改。

