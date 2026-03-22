# Status Snapshot

## 已完成

- `/admin/` 已升級成真正可讀寫正式資料的後台
- 正式卡頁會優先讀 remote config
- share / Flex 流程使用與畫面相同的 runtime config
- remote 失敗或回傳壞 JSON 時會 fallback 到 bundled config
- legacy slug `demo-consultant` 仍 canonicalize 到 `default`
- 第三顆分享按鈕規則未破壞
- Apps Script + Google Sheets backend scaffold 已加入 repo

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

## 仍需人工完成

- 建立 Google Sheet
- 部署 Apps Script Web App
- 設定 Script Properties
- 把 Web App `/exec` URL 填入正式環境

## 驗證目標

- `npm test`
- `npm run build`
- `npm run lint`
- `npm run smoke:pages`
