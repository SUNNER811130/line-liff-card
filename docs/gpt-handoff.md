# GPT Handoff

## 專案一句話

這是單一正式卡 `default` 的 LINE 電子名片站。前台、`/admin/`、share/Flex 都已切到新的 standalone GAS backend 與新的 runtime Google Sheet，不再沿用任何舊 GAS deployment、舊 exec URL 或 library URL。

## 目前正式架構

- 正式 standalone GAS
  - `scriptId: 1jwSWvmqyqfl7MGSvy5kILCHHx5q2Mhrdgu3Z2FwpS-QRGhXLre2B0tls`
- 正式唯一 exec URL
  - `https://script.google.com/macros/s/AKfycby8nIoXY64uvKiWCUZI21AlZZ63o9EQ9AuYYmV320qFljfI-ZdHWMYAVNf0mKGT-CW7hg/exec`
- 正式 runtime sheet
  - 名稱：`LIFF Card Runtime v2`
  - `SHEET_ID=12epmpzbyEzdvygO2K4Qkzpak9EUk0-kSTWIDi1IqK3g`
  - `SHEET_NAME=cards_runtime`

## 一定要知道的規則

- `default` 是唯一正式卡
- `demo-consultant` 只是 legacy slug，相容入口
- 第三顆按鈕固定是分享按鈕
- library URL 不可當後台 API
- 舊 exec URL 全部 retired
- 本輪最終已不再沿用舊 sheet，而是切到新 sheet

## 目前資料流

1. 前台進入 `/` 或 `/card/:slug/`
2. `App` 呼叫 `loadRuntimeCard(slug)`
3. [card-source.ts](/home/usersun/projects/line-liff-card/src/lib/card-source.ts) 先讀新的 GAS exec URL
4. 成功就用 remote config；失敗才 fallback bundled config
5. [AdminPage.tsx](/home/usersun/projects/line-liff-card/src/components/AdminPage.tsx) 用同一個 backend 做 load/save
6. [share.ts](/home/usersun/projects/line-liff-card/src/lib/share.ts) 的 `buildFlexMessage()` / `shareDigitalCard()` 直接吃 runtime config

## GAS backend

- 位置：
  - [Code.gs](/home/usersun/projects/line-liff-card/gas/card-admin-webapp/Code.gs)
  - [appsscript.json](/home/usersun/projects/line-liff-card/gas/card-admin-webapp/appsscript.json)
- 支援：
  - `health`
  - `initBackend`
  - `getCard`
  - `saveCard`
  - `debugRuntimeAccess`
  - `createRuntimeSheet`
- 不再保留舊 `debugOpenSheet` 與舊 deployment 專屬噪音

## 腳本

- [setup-gas.sh](/home/usersun/projects/line-liff-card/scripts/setup-gas.sh)
  - 會建立新的 standalone GAS，但現在已改成先在暫存目錄 `clasp create`，避免覆蓋 repo 內 manifest
- [deploy-gas.sh](/home/usersun/projects/line-liff-card/scripts/deploy-gas.sh)
  - `clasp push --force`
  - `clasp version`
  - `clasp deploy`
  - `initBackend`
  - backend checks
- [init-runtime-sheet.mjs](/home/usersun/projects/line-liff-card/scripts/init-runtime-sheet.mjs)
- [check-runtime-backend.sh](/home/usersun/projects/line-liff-card/scripts/check-runtime-backend.sh)

## 驗證現況

- `health` ✅
- `initBackend` ✅
- `getCard(default)` ✅
- `saveCard(default)` round-trip ✅
- `/admin/` load/save 對應測試 ✅
- 前台 remote config 路徑測試 ✅
- share / Flex runtime config 路徑測試 ✅
- `npm test` ✅
- `npm run lint` ✅
- `npm run build` ✅
- `npm run smoke:pages` ✅

## 舊系統狀態

- 舊 scriptId `1e2pcZ...` 已退休
- 舊 exec `AKfycbx7...` 已退休
- 舊 exec `AKfycbz...` 已退休
- 舊 exec `AKfycbw...` 已退休
- 舊 exec `AKfycbyt...` 已退休
- 舊 sheet 已不再作為正式 runtime backend 的資料來源

## 剩餘手動步驟

- 無。這一輪新的 backend、新的 sheet、前台 env 與驗證都已完成。
