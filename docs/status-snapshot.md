# Status Snapshot

## 已完成

- `/admin/` 已升級成真正可讀寫正式資料的後台
- 正式卡頁會優先讀 remote config
- share / Flex 流程使用與畫面相同的 runtime config
- remote 失敗或回傳壞 JSON 時會 fallback 到 bundled config
- legacy slug `demo-consultant` 仍 canonicalize 到 `default`
- 第三顆分享按鈕規則未破壞
- Apps Script + Google Sheets backend scaffold 已加入 repo
- `clasp` / deployment / runtime sheet / backend check 自動化腳本已加入 repo
- Apps Script backend 已支援 `health`、`saveCard`、`initBackend`、`setupScriptProperties`
- Web App deployment `AKfycbzFTQfZpsTiVhZOxi9v0yuYnJYfYj4orOfYqc5lQF65HCVvhkEW4axnvdmZlUP6rYhnTA` 已更新到 version 5
- `.env.local` 與 `.env.production` 已寫入正式 `VITE_CARD_API_BASE_URL`

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
  - load remote config
  - save remote config
  - write token 手動輸入
  - token 可選擇只存 `sessionStorage`
  - 顯示 API URL 狀態
  - 顯示 token 暫存狀態

## 目前阻塞點

- 正式 `clasp` 綁定的 scriptId 為 `1e2pcZd8c56D03YSYw6JhSSDlKMZzn_ALnTToF0SupNqFE8oVKtWkvwHG`
- 正式 deployment `AKfycbzFTQfZpsTiVhZOxi9v0yuYnJYfYj4orOfYqc5lQF65HCVvhkEW4axnvdmZlUP6rYhnTA` 已更新到 version 7
- shell env、`.env.local`、`.env.production`、deployment URL 都已對齊同一支正式 GAS
- raw sheet id 已透過 `debugOpenSheet()` 驗證：`rawId` / `trimmedId` / `cleanId` 都正常，長度也是 44，已基本排除 hidden char 或格式損壞
- 真正失敗點已收斂到 `DriveApp.getFileById(cleanId)`，因此 blocker 比起 sheet id 格式，更像是正式 GAS 的 OAuth scopes / Spreadsheet authorization 尚未完整涵蓋 Drive + Spreadsheet
- 真正阻塞點不是前端 URL、不是 `.clasp.json`、也不是舊 deployment；而是這支正式 Web App 在存取正式 Sheet `1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg` 時，Google 端持續回 `Illegal spreadsheet id or key`
- `initBackend` 與 `getCard(default)` 目前都因同一個 Sheet access error 失敗，因此仍無法完成 default seed、`/admin/` 正式 load/save、前台 remote config 驗證

## 最新驗證

- `clasp show-authorized-user`
  - `sunner811130@gmail.com`
- `GET /exec?action=health`
  - 現在已改成真實檢查 Sheet 可存取性
  - live 回應：
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

- 確認 `1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg` 真的是 Google 試算表本體 ID，而不是其他 Google Drive 檔案 ID
- 直接在 Google Apps Script UI 內，以同一個正式專案與同一個帳號手動重新授權一次，至少跑到會碰 `SpreadsheetApp.openById()` / `DriveApp.getFileById()` 的函式，確認 Google 端已完成新的 Spreadsheet + Drive scope 授權
- 若正式 Sheet 實際 ID 不是這個值，改回正確 ID 後重新執行 backend init/check

## 驗證目標

- `npm test`
- `npm run build`
- `npm run lint`
- `npm run smoke:pages`
