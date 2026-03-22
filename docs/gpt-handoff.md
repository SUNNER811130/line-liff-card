# GPT Handoff

## 專案一句話

這是單一正式卡 `default` 的 LINE 電子名片站。前台與 `/admin/` 的 runtime 路徑都已接好，Apps Script deployment 也已更新到正式 exec URL；目前唯一阻塞是 Google Sheet ID / 權限未通，導致正式 runtime 資料尚未初始化成功。

## 先確認的產品規則

- 第三顆按鈕固定是系統分享按鈕，不能變成一般 action
- `default` 是唯一正式卡
- `demo-consultant` 只是 legacy slug，相容入口
- legacy slug 分享出去也必須收斂到 canonical `default`
- `/admin/` 已不是單純 MVP，本地草稿與正式後台資料已拆開
- GitHub Pages 仍不是可寫入後端

## 目前架構關鍵點

- bundled source：
  - [src/content/cards/default.ts](/home/usersun/projects/line-liff-card/src/content/cards/default.ts)
- runtime adapter：
  - [src/lib/card-source.ts](/home/usersun/projects/line-liff-card/src/lib/card-source.ts)
- 前台 route loader：
  - [src/App.tsx](/home/usersun/projects/line-liff-card/src/App.tsx)
- admin：
  - [src/components/AdminPage.tsx](/home/usersun/projects/line-liff-card/src/components/AdminPage.tsx)
- share / Flex：
  - [src/lib/share.ts](/home/usersun/projects/line-liff-card/src/lib/share.ts)
- GAS deploy scripts：
  - [scripts/setup-gas.sh](/home/usersun/projects/line-liff-card/scripts/setup-gas.sh)
  - [scripts/deploy-gas.sh](/home/usersun/projects/line-liff-card/scripts/deploy-gas.sh)
  - [scripts/init-runtime-sheet.mjs](/home/usersun/projects/line-liff-card/scripts/init-runtime-sheet.mjs)
  - [scripts/check-runtime-backend.sh](/home/usersun/projects/line-liff-card/scripts/check-runtime-backend.sh)

## 現在的正式資料路徑

1. 前台進入 `/` 或 `/card/:slug/`
2. `App` 呼叫 `loadRuntimeCard(slug)`
3. `card-source` 優先抓 remote backend
4. remote JSON 經 `assertCardConfig()`
5. 成功就用 remote；失敗就 fallback bundled
6. `CardPage` 與 `shareDigitalCard()` 都吃同一份 runtime config

## Admin 規則

- 本地草稿：
  - `localStorage`
  - JSON import/export
  - 本機圖片預覽
- 正式後台：
  - API Base URL
  - write token
  - `載入正式資料`
  - `儲存到正式後台`
- token 可選擇只暫存 `sessionStorage`

## 圖片規則

- `photo.src`
  - 正式卡頁主圖
  - Flex hero image
- `seo.ogImage`
  - OG image
- 本機選圖只做 preview

## Apps Script

scaffold：

- [gas/card-admin-webapp/Code.gs](/home/usersun/projects/line-liff-card/gas/card-admin-webapp/Code.gs)
- [gas/card-admin-webapp/README.md](/home/usersun/projects/line-liff-card/gas/card-admin-webapp/README.md)
- `Code.gs` 已支援：
  - `action=health`
  - `action=getCard`
  - `action=saveCard`
  - `action=initBackend`
  - `setupScriptProperties()`

Google 端部署與授權仍需人工完成，不要描述成 repo 已自動部署成功。

2026-03-22 進度補充：

- 已把 deployment `AKfycbzFTQfZpsTiVhZOxi9v0yuYnJYfYj4orOfYqc5lQF65HCVvhkEW4axnvdmZlUP6rYhnTA` 更新到 version 5
- `clasp push --force` 後新版 bootstrap 邏輯已上線；`initBackend` 不再先卡在 `CARD_ADMIN_WRITE_TOKEN is not configured`
- 目前最新錯誤是 `Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- 下個接手者不要再花時間排查 deployment / bootstrap；先請使用者確認正確的 Google Sheet ID 與 sharing 權限
