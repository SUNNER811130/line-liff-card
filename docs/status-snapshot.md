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
- Apps Script backend 已支援 `health`、`saveCard`、`initBackend`、`setupScriptProperties`、`debugOpenSheet`
- Web App deployment `AKfycbzFTQfZpsTiVhZOxi9v0yuYnJYfYj4orOfYqc5lQF65HCVvhkEW4axnvdmZlUP6rYhnTA` 已更新到 version 8
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
- 正式 deployment `AKfycbzFTQfZpsTiVhZOxi9v0yuYnJYfYj4orOfYqc5lQF65HCVvhkEW4axnvdmZlUP6rYhnTA` 已更新到 version 8
- shell env、`.env.local`、`.env.production`、deployment URL 都已對齊同一支正式 GAS
- `debugOpenSheet()` 已補回目前 repo 並 push 到正式 GAS；函式會回傳 `rawId`、`JSON.stringify(rawId)`、`rawIdLength`、`trimmedId`、`trimmedIdLength`、`cleanId`、`cleanIdLength`、`sheetName`、`DriveApp.getFileById(cleanId)`、`SpreadsheetApp.openById(cleanId)`、`getSheetByName(sheetName)` 的結果
- manifest 目前已是最小必要 scopes：
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/drive.readonly`
- `clasp run debugOpenSheet` 目前不是回傳 debug JSON，而是直接被 Google 拒絕：
  - `Unable to run script function. Please make sure you have permission to run the script function.`
- 這表示現在真正阻塞點仍在 Google 端授權/執行權限，不是 repo 端漏 push，也不是 `.clasp.json` 或 exec URL 指錯
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
- `clasp run debugOpenSheet`
  - `Unable to run script function. Please make sure you have permission to run the script function.`
- manifest 已補最小必要 scopes：
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/drive.readonly`

## 仍需人工確認

- 確認 `1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg` 真的是 Google 試算表本體 ID，而不是其他 Google Drive 檔案 ID
- 直接在 Google Apps Script UI 內，以同一個正式專案與同一個帳號手動重新授權一次，至少跑到會碰 `SpreadsheetApp.openById()` / `DriveApp.getFileById()` 的函式，確認 Google 端已完成新的 Spreadsheet + Drive scope 授權
- 建議手動步驟就是進正式 Apps Script editor 後執行 `debugOpenSheet()`，在權限視窗中同意 Spreadsheet + Drive 存取，再重新 deploy version 8 的同一支 Web App
- 若正式 Sheet 實際 ID 不是這個值，改回正確 ID 後重新執行 backend init/check

## 驗證目標

- `npm test`
- `npm run build`
- `npm run lint`
- `npm run smoke:pages`
