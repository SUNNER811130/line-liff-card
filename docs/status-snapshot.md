# Status Snapshot

## 已完成

- `.clasp.json` 目前綁定正式 standalone GAS `1e2pcZd8c56D03YSYw6JhSSDlKMZzn_ALnTToF0SupNqFE8oVKtWkvwHG`
- 正式 exec URL 已收斂到新的乾淨 Web App deployment：`https://script.google.com/macros/s/AKfycbx7wAggK7H4G8CCfgfz6uy2ABOHI-GVSUt-fWvEJL7fy-7hFKlPVEZj9nm8x1J7yA6cHA/exec`
- `.env.local` 與 `.env.production` 的 `VITE_CARD_API_BASE_URL` 已與正式 exec URL 對齊
- library URL 已確認不是前台 `VITE_CARD_API_BASE_URL`，也不是 runtime backend API
- shell env 已設為：
  - `CARD_RUNTIME_SHEET_ID=1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
  - `CARD_RUNTIME_SHEET_NAME=cards_runtime`
  - `CARD_ADMIN_WRITE_TOKEN` 已存在
- 正式卡頁程式碼會優先讀 remote config，失敗時 fallback bundled config
- `CardPage` 與 share / Flex 流程共用同一份 runtime `config`
- `/admin/` 已具備 load remote / save remote UI 與 API adapter
- Apps Script + Google Sheets backend scaffold、deploy script、backend check script 都已在 repo
- Apps Script backend 已支援 `health`、`getCard`、`saveCard`、`initBackend`、`setupScriptProperties`、`debugOpenSheet`、`debugRuntimeAccess`

## 現在的正式資料來源

執行時優先順序：

1. `VITE_CARD_API_BASE_URL` 指向的遠端正式資料來源
2. bundled [src/content/cards/default.ts](/home/usersun/projects/line-liff-card/src/content/cards/default.ts)

目前只承認這一個正式 backend exec URL：

- `https://script.google.com/macros/s/AKfycbx7wAggK7H4G8CCfgfz6uy2ABOHI-GVSUt-fWvEJL7fy-7hFKlPVEZj9nm8x1J7yA6cHA/exec`

舊的 `AKfycbz...` / `AKfycbw...` / `AKfycbyt...` deployment 僅作為歷史資訊；不要把 library URL 當成 backend API。

## 後台現況

- 本地草稿：
  - `localStorage`
  - JSON 匯入匯出
  - 本機圖片預覽
- 正式後台：
  - UI 可發出 load remote config
  - UI 可發出 save remote config
  - write token 手動輸入
  - token 可選擇只存 `sessionStorage`
  - 顯示 API URL 狀態
  - 顯示 token 暫存狀態

## 目前阻塞點

- `.clasp.json`、新的 `.env.local`、新的 `.env.production` 都已收斂到同一個乾淨正式 deployment，不需要再重建 GAS 專案
- Apps Script UI 內新的正式 deployment `AKfycbx7...` 已人工確認：
  - `Type = Web app`
  - `Execute as = Me (sunner811130@gmail.com)`
  - `Who has access = Anyone`
  - Google 這次沒有再跳 deployment runtime 授權畫面，已視為正常
- 已完成：
  - `clasp push --force`
  - version `11`
  - 舊正式 deployment `AKfycbz...` 更新到 `@11`
  - 同一個 scriptId 下新建乾淨 deployment `AKfycbx7... @11`
- `debugRuntimeAccess` 已證明 live Web App 正在吃最新 code、最新 scope、正確 scriptId、正確 exec URL、正確 sheetId / sheetName
- 新舊兩個 live `/exec` 都仍回同樣的 `Illegal spreadsheet id or key`
- 因此 stale deployment、live version 沒吃到最新 code、library URL、隱藏字元這些 repo 端問題都已排除；真正剩餘阻塞點已收斂到 Google live Web App execute-as / deployment runtime access 這一層
- `initBackend` 與 `getCard(default)` 仍失敗，所以目前不能 seed `default`，也不能完成 `/admin/` 正式 load/save、前台 remote config live 驗證、或分享 Flex live 驗證

## 最新驗證

- `clasp show-authorized-user`
  - `sunner811130@gmail.com`
- `clasp deployments`
  - `AKfycbytTueKUprCfCD98C8MO_hdjYig5qxnzhy7LfdfA6-X @HEAD`
  - `AKfycbw4Ls51MGcC_VgYU6NilBE2YMabfiLPEHvrjYf6r_3GCGu2vGS-w0WB5Yy9oz597uDW @2`
  - `AKfycbzFTQfZpsTiVhZOxi9v0yuYnJYfYj4orOfYqc5lQF65HCVvhkEW4axnvdmZlUP6rYhnTA @11`
  - `AKfycbx7wAggK7H4G8CCfgfz6uy2ABOHI-GVSUt-fWvEJL7fy-7hFKlPVEZj9nm8x1J7yA6cHA @11`
- 唯一正式 backend exec URL
  - `https://script.google.com/macros/s/AKfycbx7wAggK7H4G8CCfgfz6uy2ABOHI-GVSUt-fWvEJL7fy-7hFKlPVEZj9nm8x1J7yA6cHA/exec`
- `GET /exec?action=debugRuntimeAccess`
  - `ok: true`
  - `scriptId: 1e2pcZd8c56D03YSYw6JhSSDlKMZzn_ALnTToF0SupNqFE8oVKtWkvwHG`
  - `serviceUrl` 已對應新的正式 exec URL
  - `sheetIdSanitized: false`
  - `sheetNameSanitized: false`
  - `sheetAccessible: false`
  - `error: Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- `GET /exec?action=health`
  - 現在已改成真實檢查 Sheet 可存取性
  - 2026-03-22 live 回應仍是：
    - `ok: false`
    - `sheetAccessible: false`
    - `error: Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- `GET /exec?action=getCard&slug=default`
  - `Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- `POST initBackend`
  - `Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- `POST saveCard`
  - `Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- `/admin/`
  - repo 端 load/save wiring 與測試都已通過
  - 但 live `load remote` 會卡在 `getCard(default)` 同一個 Spreadsheet 錯誤
  - live `save remote` 會卡在 `saveCard` 同一個 Spreadsheet 錯誤
- 前台 remote config / share Flex
  - 程式碼路徑都使用同一份 runtime config
  - 但 live remote backend 未通，所以目前實際執行仍會 fallback bundled config
- manifest 已補最小必要 scopes：
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/drive.readonly`

## 結論

- 唯一正式 backend exec URL 已確認為 `AKfycbx7.../exec`
- `.env.local` 與 `.env.production` 已對齊這個 URL
- repo 端 wiring、測試、build、lint、smoke 都已完成
- 但 live backend 仍無法打開 `cards_runtime`，所以：
  - `default` 尚未成功 seed 到正式 runtime sheet
  - `/admin/` live load/save 仍不可用
  - 前台 live 仍只會 fallback bundled config
  - 新分享出去的 Flex 目前也不可能吃到 live runtime config
- 因此目前剩餘問題已不在 repo 端，也不是舊 deployment / library URL / env 指錯

## 驗證目標

- `npm test`
- `npm run build`
- `npm run lint`
- `npm run smoke:pages`
