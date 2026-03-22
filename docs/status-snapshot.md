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

- backend `health` 可回應，但 Script Properties 尚未完整初始化
- `initBackend` 已能進入新版 bootstrap 流程，但 Google 端回 `Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- 在確認正確 Google Sheet ID 或該 Sheet 已共享給部署帳號 `sunner811130@gmail.com` 前，無法完成 default seed、`/admin/` 正式 load/save、前台 remote config 驗證

## 仍需人工確認

- 確認 Google Sheet ID 是否正確
- 確認該 Sheet 是否可由 Apps Script 部署帳號 `sunner811130@gmail.com` 存取
- 若使用的是另一份 Sheet，補上正確 ID 後重新執行 backend init/check

## 驗證目標

- `npm test`
- `npm run build`
- `npm run lint`
- `npm run smoke:pages`
