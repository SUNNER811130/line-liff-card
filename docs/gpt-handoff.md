# GPT Handoff

## 專案一句話

這是單一正式卡 `default` 的 LINE 電子名片站。前台與 `/admin/` 的 runtime 路徑都已接好，正式 Apps Script deployment 也已更新；目前唯一阻塞是正式 GAS 仍無法開啟指定的正式 Google Sheet，導致 runtime 資料尚未初始化成功。

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

Google 端部署與授權仍需人工完成，不要描述成 runtime backend 已完全打通。

2026-03-22 進度補充：

- 正式 `clasp` 綁定 scriptId：
  - `1e2pcZd8c56D03YSYw6JhSSDlKMZzn_ALnTToF0SupNqFE8oVKtWkvwHG`
- `clasp show-authorized-user`：
  - `sunner811130@gmail.com`
- 正式 deployment：
  - `AKfycbzFTQfZpsTiVhZOxi9v0yuYnJYfYj4orOfYqc5lQF65HCVvhkEW4axnvdmZlUP6rYhnTA`
  - 已更新到 version 7
- `.env.local` / `.env.production` 仍指向同一個正式 exec URL，這部分不用再改
- 已把 `Code.gs` 的 `health` 改成真正檢查 Sheet 可存取性，避免再出現「health 綠燈、getCard 才爆」的假健康狀態
- live `health` 現在直接回：
  - `ok: false`
  - `sheetAccessible: false`
  - `error: Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- live `getCard(default)`：
  - `Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- live `initBackend`：
  - `Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- 這表示目前真正問題已收斂成 Google 端拒絕把 `1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg` 當成可由此正式 GAS 開啟的 Spreadsheet；不是 repo 綁錯 script、不是舊 deployment、也不是前端 URL 指錯
- 下個接手者不要再重新建立 GAS 專案；請直接在現有正式 Apps Script 專案內確認：
  - 這個 ID 是否真的是 Google 試算表 ID
  - 同一帳號在 Apps Script UI 內是否還缺第一次 Spreadsheet scope 授權
