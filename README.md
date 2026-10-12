# 青山一起喝

給同事一起點青山青茶的小工具：按日期開團、分享免登入連結、自動計算杯數與金額，出發前把清單帶去門市。

[開啟 App](https://eddiechu1009-bit.github.io/peak-tea-order/) · [備用入口](https://peak-tea-order.eddiechu1009.workers.dev)

## 使用方式

1. 主揪輸入日期、名字、團名，選填截止時間，建立飲料團。
2. 點「分享填單連結」，讓同事自行選饮料、杯型、冷熱、甜度、冰量、額外加料及杯數。
3. 「大家點了什麼」可檢查名字與明細；「去買清單」依相同配置合併，支援複製、CSV 和列印。
4. 主揪出發前點「截止收單」。有自訂截止時間的團，也會由伺服器依時間停止收單。

名字可以重複，統計顯示的是不重複名字數，不是身分驗證的人數。同事只能在原填單瀏覽器修改自己的飲料；主揪可修改所有項目。主揪管理連結包含管理金鑰，請保存並避免貼到群組；同事填單連結不含金鑰。管理權限記錄在目前裝置，換裝置可使用保存的管理連結。

## 菜單與價格

來源：[青山官網所連結的信義 ATT 店菜單](https://order.nidin.shop/menu/27427)，2026-10-12 核對門市上架版本 2026-10-07。`data/att-price-reference.json` 是逐筆解析門市杯型與百貨店組合價格的獨立核對資料。

- 中／大杯、加料及燕麥奶升級依菜單計價，後端重算，不能由填單者修改金額。
- 使用 ATT 百貨店售價，而非通用菜單價格。43 款飲料／81 個杯型價格與 8 種加料已核對；例如大杯北風桂花玄米茶 50 元＋海鹽奶蓋 20 元＝70 元。
- 主揪可在修改飲料時填入現場實際單價與說明。相同配方只改名字或杯數會保留校正；同事變更配方後重新採菜單價。其他填單者不能指定單價。
- 奶蓋僅少冰；果茶不提供無糖；冬露最低半糖。
- 飲品已包含的料會另外標示；勾選加料表示額外再加一份。
- 門市供應、冷熱與現場金額需現場確認。這是彙整需求工具，不會向店家下單或線上收款。
- 非青山官方訂購服務，未收錄官方菜單圖片、商標或其他原始圖像。

## 共用與儲存

前端為原生 HTML/CSS/JavaScript，後端為 Cloudflare Worker＋獨立 D1 資料庫，GitHub Pages 與 Worker 網站可使用同一後端。不同裝置每 10 秒同步；重新回到頁面也會更新。資料留在後端，不寫入 GitHub repository。

每團使用不可猜測的 UUID 連結，沒有公開團列表；拿到連結的人可看到該團名字與飲料。主揪金鑰以雜湊儲存，連結使用 URL fragment，讀取後從網址列移除。這是連結權限的免登入工具，不是公司 SSO。勿填公司機密、電話或其他敏感資訊。

單筆最多 20 杯，每團最多 200 筆。伺服器拒絕已截止的新單；新增採固定飲料 ID 避免重送重複，修改使用版本號避免覆蓋其他修改。文字輸出跳脫、SQL 使用參數綁定、CSV 可控文字防止公式執行。

## 本機開發

需要 Node.js 22 或以上，以及 Cloudflare 帳號。

```sh
npm ci
npx wrangler d1 migrations apply peak-tea-order-db --local
npm run dev
```

開啟 `http://127.0.0.1:8787`。`public/config.js` 在 localhost 與 127.0.0.1 自動使用本機 API。

```sh
npm test
npm run test:integration
npm run test:browser
```

`TEST_URL` 可指定待測網站。測試建立獨立測試團，完成後刪除，不影響實際團購。

## 部署到自己的帳號

```sh
npx wrangler login
npx wrangler d1 create peak-tea-order-db
```

將新資料庫 ID 填入 `wrangler.jsonc`，更新 `ALLOWED_ORIGINS` 為自己的前端網站來源：

```sh
npx wrangler d1 migrations apply peak-tea-order-db --remote
npm run deploy
```

如使用 GitHub Pages，將 `public/config.js` 的正式 `API_ORIGIN` 設為剛發布的 Worker URL，再執行 `npm run prepare:pages`。GitHub Pages 使用 main 分支的 `/docs`，該目錄由 `public/` 產生；不發布後端來源、資料或本機測試目錄。

`_private/`、`.wrangler/`、環境檔與測試截圖均在 `.gitignore` 中。沒有任何服務 token 或管理金鑰需要放進程式庫。
