# Status Snapshot

## 已完成

- `.clasp.json` 目前綁定正式 standalone GAS `1e2pcZd8c56D03YSYw6JhSSDlKMZzn_ALnTToF0SupNqFE8oVKtWkvwHG`
- 正式 exec URL 已固定為 `https://script.google.com/macros/s/AKfycbzFTQfZpsTiVhZOxi9v0yuYnJYfYj4orOfYqc5lQF65HCVvhkEW4axnvdmZlUP6rYhnTA/exec`
- `.env.local` 與 `.env.production` 的 `VITE_CARD_API_BASE_URL` 已與正式 exec URL 對齊
- shell env 已設為：
  - `CARD_RUNTIME_SHEET_ID=1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
  - `CARD_RUNTIME_SHEET_NAME=cards_runtime`
  - `CARD_ADMIN_WRITE_TOKEN` 已存在
- 正式卡頁程式碼會優先讀 remote config，失敗時 fallback bundled config
- `CardPage` 與 share / Flex 流程共用同一份 runtime `config`
- `/admin/` 已具備 load remote / save remote UI 與 API adapter
- Apps Script + Google Sheets backend scaffold、deploy script、backend check script 都已在 repo
- Apps Script backend 已支援 `health`、`getCard`、`saveCard`、`initBackend`、`setupScriptProperties`、`debugOpenSheet`

## 現在的正式資料來源

執行時優先順序：

1. `VITE_CARD_API_BASE_URL` 指向的遠端正式資料來源
2. bundled [src/content/cards/default.ts](/home/usersun/projects/line-liff-card/src/content/cards/default.ts)

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

- 正式 exec URL、`.clasp.json`、`.env.local`、`.env.production`、shell env 都已對齊同一組正式後端，不需要再重建 GAS 專案
- user 已手動完成 `debugOpenSheet()` 授權，且已手動更新同一支正式 Web App deployment
- 但 2026-03-22 再次 live 驗證結果仍相同：正式 Web App 一碰正式 Sheet `1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg` 就回 `Illegal spreadsheet id or key`
- 因此真正剩餘阻塞點仍在 Google 端對這份 Spreadsheet 的存取層，不是 repo 綁錯 script，也不是前端 URL 指錯
- `initBackend` 與 `getCard(default)` 仍失敗，所以目前不能 seed `default`，也不能完成 `/admin/` 正式 load/save、前台 remote config live 驗證、或分享 Flex live 驗證

## 最新驗證

- `clasp show-authorized-user`
  - `sunner811130@gmail.com`
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
- manifest 已補最小必要 scopes：
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/drive.readonly`

## 仍需人工確認

- 確認 `1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg` 的確是 `LIFF Card Runtime` 這份 Google Spreadsheet 本體 ID，而不是其他 Drive 檔案 ID
- 直接在目前 `.clasp.json` 綁定的正式 Apps Script editor 內再次執行 `debugOpenSheet()`，確認同一帳號對這份 Spreadsheet 的實際存取結果
- 若 `debugOpenSheet()` 在 Apps Script UI 內也仍失敗，就不是 repo 問題，而是這個 GAS 專案與這份 Sheet 的 Google 權限/目標 ID 仍不正確
- 只有在 `health` 轉為成功後，才應繼續做 default seed、`/admin/` load/save、前台 remote config 與分享 Flex 的 live 驗證

## 驗證目標

- `npm test`
- `npm run build`
- `npm run lint`
- `npm run smoke:pages`
