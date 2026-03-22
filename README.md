# line-liff-card

以 Vite、React、TypeScript 建立的 LINE 電子名片站。現在 repo 已補齊到「GitHub Pages 前台 + Google Sheets + Apps Script 正式後台」的最大程度自動化部署狀態。

- GitHub Pages 繼續提供前台卡片頁與 `/admin/`
- 正式內容優先從 Google Sheets + Apps Script Web App 讀取
- `/admin/` 可載入 / 儲存正式 `CardConfig`
- 遠端失敗時安全 fallback 到 repo 內 bundled config
- repo 內提供 `clasp` / Apps Script / runtime sheet 初始化 / health check 自動化腳本

## Requirements

- Node.js 20+
- npm 10+
- `clasp` 需要由使用者本人安裝並登入 Google 帳號

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run test`
- `npm run lint`
- `npm run smoke:pages`
- `npm run gas:setup`
- `npm run gas:login`
- `npm run gas:push`
- `npm run gas:deploy`
- `npm run gas:check`

## Routes

- `/`
  - 顯示正式卡
- `/card/default/`
  - canonical 正式卡 route
- `/card/demo-consultant/`
  - legacy slug，相容入口；仍 canonicalize 到 `default`
- `/admin/`
  - 正式內容管理頁

## Current Content Model

正式資料仍以同一份 `CardConfig` 為核心，沒有重造第二套 CMS schema。

沿用的核心檔案：

- `src/content/cards/types.ts`
- `src/content/cards/schema.ts`
- `src/content/cards/view-model.ts`
- `src/lib/share.ts`

bundled fallback：

- `src/content/cards/default.ts`
- `src/content/cards/index.ts`

runtime adapter：

- `src/lib/card-source.ts`

## 為什麼不是 GitHub Pages 直接當後台

GitHub Pages 只能靜態託管，不能安全接收 `/admin/` 的正式寫入：

- 前端不能直接改 repo
- 前端不能保存真正 write secret
- 不能把 Google / GitHub 權限直接交給公開網頁

所以正式後台需要一個可驗證 token、可寫 Google Sheet、又不必另外架伺服器的中介層。

## 為什麼用 Google Sheets + Apps Script

- Google Sheets 適合目前單卡 `CardConfig JSON` 的正式營運資料
- Apps Script Web App 可提供 `getCard` / `saveCard` / `initBackend` / `health`
- 使用者本人用 Google 帳號授權即可，不需要捏造 service account 流程
- 對目前規模比重做 DB / CMS 更輕

## Remote Content Source

前台與分享流程現在會：

1. 先嘗試讀取 `VITE_CARD_API_BASE_URL` 指向的遠端正式資料
2. 遠端回傳後仍經 `assertCardConfig()` 驗證
3. 若遠端不可用或 JSON 不合法，fallback 到 bundled `defaultCard`

這代表：

- 正式卡頁顯示的新內容，會和分享時使用的 Flex 內容一致
- 不會出現「畫面是 remote，但分享還是 bundled」的分裂

## Admin

`/admin/` 現在分成兩層：

- 本地草稿
  - 自動存於 `localStorage`
  - 支援 JSON 匯入 / 匯出
  - 本機圖片選取只做預覽
- 正式後台資料
  - 透過 API Base URL + write token 讀寫遠端資料來源
  - 可載入正式資料覆蓋草稿
  - 可把目前草稿儲存成正式內容

目前 `/admin/` 可編輯：

- 姓名
- 品牌
- 職稱
- 主標 / 副標 / 介紹文字
- 前兩顆一般按鈕
- `photo.src`
- `seo.ogImage`

重要限制：

- GitHub Pages 仍不是可寫入後端
- 前端不會直接寫 repo
- 真正的 write secret 不會放在前端 env 或 repo

## Apps Script Backend

repo 內已提供可直接部署的 scaffold：

- [gas/card-admin-webapp/Code.gs](/home/usersun/projects/line-liff-card/gas/card-admin-webapp/Code.gs)
- [gas/card-admin-webapp/appsscript.json](/home/usersun/projects/line-liff-card/gas/card-admin-webapp/appsscript.json)
- [gas/card-admin-webapp/README.md](/home/usersun/projects/line-liff-card/gas/card-admin-webapp/README.md)
- [scripts/setup-gas.sh](/home/usersun/projects/line-liff-card/scripts/setup-gas.sh)
- [scripts/deploy-gas.sh](/home/usersun/projects/line-liff-card/scripts/deploy-gas.sh)
- [scripts/init-runtime-sheet.mjs](/home/usersun/projects/line-liff-card/scripts/init-runtime-sheet.mjs)
- [scripts/check-runtime-backend.sh](/home/usersun/projects/line-liff-card/scripts/check-runtime-backend.sh)
- [.clasp.json.template](/home/usersun/projects/line-liff-card/.clasp.json.template)

建議的正式資料儲存方式：

- Google Sheets 工作表：`cards_runtime`
- 欄位：
  - `slug`
  - `config_json`
  - `updated_at`
  - `updated_by`

Apps Script 現在具備：

- `doGet`
  - `action=health`
  - `action=getCard`
- `doPost`
  - `action=saveCard`
  - `action=initBackend`
- `setupScriptProperties()`
  - 配合 `clasp run` 設定 Script Properties
- `initBackend()`
  - 建立表頭
  - 可在 `default` 缺資料時寫入 bundled seed
  - 不會覆蓋既有正式資料，除非 `force=true`

## Env

建立 `.env.local` 或部署環境變數：

```bash
VITE_LIFF_ID=YOUR_LIFF_ID
VITE_SITE_URL=https://sunner811130.github.io/line-liff-card/
VITE_CARD_API_BASE_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

原則：

- `VITE_CARD_API_BASE_URL` 可以放公開 Web App URL
- 不要把真正 write token 放在前端 env
- write token 由 `/admin/` 使用者手動輸入，必要時只暫存到 `sessionStorage`

## 哪些步驟 Codex / CLI 可以做

- 掃描 repo 目前狀態
- 建立 `.clasp.json`
- `clasp push`
- 建 version
- 建立或更新 deployment
- 盡量用 `clasp run setupScriptProperties` 寫入 Script Properties
- 呼叫 `initBackend` 建立 runtime sheet 表頭與 seed 資料
- 驗證 `health` / `getCard` / `initBackend`
- 更新前端、文件、測試

## 哪些步驟仍需你本人做 Google 授權

- 安裝並登入 `clasp`
- 第一次 Google OAuth 授權
- 必要時啟用 Apps Script API / Execution API
- 第一次建立 Google Sheet
- 第一次確認 Apps Script Web App 權限

## 建議執行順序

1. `npm install`
2. `npm run test`
3. `npm run build`
4. `npm run lint`
5. `npm run gas:login`
6. 建立 Google Sheet，取得 `SHEET_ID`
7. `export CARD_RUNTIME_SHEET_ID=...`
8. `export CARD_RUNTIME_SHEET_NAME=cards_runtime`
9. `export CARD_ADMIN_WRITE_TOKEN=...`
10. `npm run gas:setup`
11. `npm run gas:deploy`
12. `npm run gas:check -- https://script.google.com/macros/s/DEPLOYMENT_ID/exec`
13. 把 `VITE_CARD_API_BASE_URL` 寫到正式前端環境後重新部署 Pages

## Image Strategy

- `photo.src`
  - 控制正式卡頁主圖與 Flex hero image
- `seo.ogImage`
  - 控制頁面 OG image
- 本機選圖
  - 只更新 admin 預覽
  - 不代表已上傳
  - 若沒有獨立 upload backend，就不會假裝「已上傳成功」

## LIFF / Share Behavior

第三顆按鈕仍固定是系統分享按鈕，不屬於 `config.actions`。

分享流程仍維持：

1. `inClient && shareAvailable`
   - 直接送出 LINE Flex 電子名片
2. 在 LINE app 內但還不能直接分享
   - handoff 到 canonical LIFF share route
3. 不在 LINE app 內
   - fallback 到一般分享 / LINE 文字分享 / copy link

legacy slug `demo-consultant` 仍會 canonicalize 成 `default`，這條規則沒有被改掉。

## Setup Docs

- [docs/REAL_ADMIN_SETUP.md](/home/usersun/projects/line-liff-card/docs/REAL_ADMIN_SETUP.md)
- [docs/architecture-overview.md](/home/usersun/projects/line-liff-card/docs/architecture-overview.md)
- [docs/admin-mvp.md](/home/usersun/projects/line-liff-card/docs/admin-mvp.md)
- [docs/admin-roadmap.md](/home/usersun/projects/line-liff-card/docs/admin-roadmap.md)

## Verify

部署後至少確認：

1. `/`
2. `/card/default/`
3. `/card/demo-consultant/`
4. `/admin/`

以及：

1. `/admin/` 能載入正式資料
2. `/admin/` 能儲存正式資料
3. 正式卡頁更新後會顯示 remote 新內容
4. 在 LINE app 內分享時，Flex 文字與 hero image 會跟著 remote 最新內容
5. 遠端關閉或回傳壞 JSON 時，前台仍 fallback 到 bundled config
