# Architecture Overview

## 技術棧

- React 18
- Vite 6
- TypeScript
- Vitest + Testing Library
- LINE LIFF
- Google Sheets + Apps Script Web App
- GitHub Pages

## 路由

- `/`
  - 正式卡首頁
- `/card/:slug/`
  - 卡片頁
- `/admin/`
  - 後台
- `404.html`
  - GitHub Pages fallback restore

## 正式資料流

1. 路由解析在 [src/lib/routes.ts](/home/usersun/projects/line-liff-card/src/lib/routes.ts)
2. `App` 進入卡片頁後，改由 [src/lib/card-source.ts](/home/usersun/projects/line-liff-card/src/lib/card-source.ts) 讀取 runtime config
3. `card-source` 先嘗試 remote source
4. remote 回傳後仍經 [src/content/cards/schema.ts](/home/usersun/projects/line-liff-card/src/content/cards/schema.ts) 驗證
5. 若 remote 失敗或 JSON 無效，fallback 到 bundled [src/content/cards/default.ts](/home/usersun/projects/line-liff-card/src/content/cards/default.ts)
6. 驗證後的 `CardConfig` 同時供給：
   - [src/components/CardPage.tsx](/home/usersun/projects/line-liff-card/src/components/CardPage.tsx)
   - [src/lib/share.ts](/home/usersun/projects/line-liff-card/src/lib/share.ts)
   - [src/content/cards/view-model.ts](/home/usersun/projects/line-liff-card/src/content/cards/view-model.ts)

## Admin 資料流

1. [src/components/AdminPage.tsx](/home/usersun/projects/line-liff-card/src/components/AdminPage.tsx) 持有本地草稿 state
2. 本地草稿自動存於 `localStorage`
3. `載入正式資料`
   - 呼叫 `fetchRemoteCardConfig()`
   - 讀取遠端 `CardConfig`
   - 驗證後覆蓋草稿
4. `儲存到正式後台`
   - 呼叫 `saveRemoteCardConfig()`
   - 把目前草稿送到 Apps Script backend
5. admin preview 仍直接共用 `CardPage`

## Bundled 與 Remote 的責任

bundled：

- repo 內 baseline config
- 遠端掛掉時的安全 fallback
- legacy slug canonicalization 參照點

remote：

- 正式營運中的最新電子名片內容
- `/admin/` 的正式 save/load 目標
- 前台卡頁與新分享 Flex 的最新資料來源

## Share 規則

- 第三顆按鈕固定是分享按鈕
- 不屬於 `config.actions`
- `demo-consultant` 仍 canonicalize 到 `default`
- `buildFlexMessage()` 現在吃的是 runtime config，不是硬綁 bundled `defaultCard`

## Backend Scaffold

repo 內的 Apps Script scaffold 位於：

- [gas/card-admin-webapp/Code.gs](/home/usersun/projects/line-liff-card/gas/card-admin-webapp/Code.gs)
- [gas/card-admin-webapp/appsscript.json](/home/usersun/projects/line-liff-card/gas/card-admin-webapp/appsscript.json)

資料表結構：

- `slug`
- `config_json`
- `updated_at`
- `updated_by`
