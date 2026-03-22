# GPT Handoff

## 專案一句話

這是單一正式卡 `default` 的 LINE 電子名片站。前台與 `/admin/` 的 runtime 路徑都已接好，正式 Apps Script deployment 與前端 env 也都已指向同一個正式 exec URL；library URL 已確認不是前台 API。現在唯一阻塞仍是正式 GAS 無法開啟指定的正式 Google Sheet，導致 runtime 資料尚未初始化成功。

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

正式 backend 只承認這一個 exec URL：

- `https://script.google.com/macros/s/AKfycbx7wAggK7H4G8CCfgfz6uy2ABOHI-GVSUt-fWvEJL7fy-7hFKlPVEZj9nm8x1J7yA6cHA/exec`

不要把 library URL 當成 backend API；若看到舊 deployment，只能當歷史資訊。

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
  - `debugOpenSheet()`
  - `action=debugRuntimeAccess`

不要描述成 runtime backend 已完全打通。repo 端 wiring 已完成，但 live backend 仍未通。

2026-03-22 進度補充：

- 正式 `clasp` 綁定 scriptId：
  - `1e2pcZd8c56D03YSYw6JhSSDlKMZzn_ALnTToF0SupNqFE8oVKtWkvwHG`
- `clasp show-authorized-user`：
  - `sunner811130@gmail.com`
- 已完成 `clasp push --force`
- 已把既有正式 deployment 更新到 `AKfycbz... @11`
- 已在同一個 scriptId 下新建乾淨 deployment：
  - `AKfycbx7wAggK7H4G8CCfgfz6uy2ABOHI-GVSUt-fWvEJL7fy-7hFKlPVEZj9nm8x1J7yA6cHA @11`
- 唯一正式 exec URL：
  - `https://script.google.com/macros/s/AKfycbx7wAggK7H4G8CCfgfz6uy2ABOHI-GVSUt-fWvEJL7fy-7hFKlPVEZj9nm8x1J7yA6cHA/exec`
- `.env.local` / `.env.production` 都已指向同一個正式 exec URL，這部分已對齊
- shell env 也已對齊：
  - `CARD_RUNTIME_SHEET_ID=1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
  - `CARD_RUNTIME_SHEET_NAME=cards_runtime`
  - `CARD_ADMIN_WRITE_TOKEN` 已存在
- 已把 `Code.gs` 的 `health` 改成真正檢查 Sheet 可存取性，避免再出現「health 綠燈、getCard 才爆」的假健康狀態
- 已新增 `debugRuntimeAccess`，live 可直接回報 scriptId / serviceUrl / configured sheetId / sheetAccessible
- 但 2026-03-22 live `health` 仍直接回：
  - `ok: false`
  - `sheetAccessible: false`
  - `error: Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- live `debugRuntimeAccess`：
  - `ok: true`
  - `scriptId: 1e2pcZd8c56D03YSYw6JhSSDlKMZzn_ALnTToF0SupNqFE8oVKtWkvwHG`
  - `serviceUrl` 就是新的正式 exec URL
  - `sheetIdSanitized: false`
  - `sheetAccessible: false`
  - `error: Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- live `getCard(default)`：
  - `Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- live `initBackend`：
  - `Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- live `saveCard(default)`：
  - `Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
- `debugOpenSheet()` 仍保留在正式 GAS，可用來驗證 editor 手動執行時是否能打開目標 Sheet
- manifest 已顯式補上最小必要 scopes：
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/drive.readonly`
- 新舊兩個 live deployment 都回同樣錯誤，且 `debugRuntimeAccess` 已證明 live 正在吃最新 code；因此 stale deployment、舊版本、隱藏字元、前端 env、library URL 都已排除
- 目前真正剩餘問題只收斂到 Google live Web App execute-as / deployment runtime access
- `/admin/` 真正 load/save 目前都還不能 live 成功：
  - load 受阻於 `getCard(default)` 同一錯誤
  - save 受阻於 `saveCard(default)` 同一錯誤
- 前台 remote config / share Flex 雖然 wiring 都吃同一份 runtime config，但在 live backend 未通前，實際仍只會 fallback bundled config
- 下個接手者不要再重新建立 GAS 專案；現在只剩一個 Google UI 手動步驟：
  - 在同一支正式 standalone GAS 的 Apps Script UI 內，對新的 deployment `AKfycbx7...` 進入 Manage deployments
  - 確認它是 `Web app`
  - 確認 `Execute as: Me (sunner811130@gmail.com)`
  - 確認 `Who has access: Anyone`
  - 按一次重新部署 / 更新，若跳 deployment runtime 授權同意畫面，就完成那次同意
