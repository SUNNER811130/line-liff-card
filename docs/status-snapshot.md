# Status Snapshot

## 2026-03-22 最新正式狀態

- 新唯一正式 standalone GAS `scriptId`
  - `1jwSWvmqyqfl7MGSvy5kILCHHx5q2Mhrdgu3Z2FwpS-QRGhXLre2B0tls`
- 新唯一正式 Web App exec URL
  - `https://script.google.com/macros/s/AKfycby8nIoXY64uvKiWCUZI21AlZZ63o9EQ9AuYYmV320qFljfI-ZdHWMYAVNf0mKGT-CW7hg/exec`
- 新正式 runtime sheet
  - 檔名：`LIFF Card Runtime v2`
  - `SHEET_ID=12epmpzbyEzdvygO2K4Qkzpak9EUk0-kSTWIDi1IqK3g`
  - `SHEET_NAME=cards_runtime`

## 已完成

- 舊 GAS backend deployment 已放棄，不再使用
- 舊 exec URL：
  - `AKfycbx7...`
  - `AKfycbz...`
  - `AKfycbw...`
  - `AKfycbyt...`
  全部視為 retired
- library URL 不再視為前台 API，也不再列入正式架構
- `.clasp.json` 已指向新的 standalone GAS `1jwSW...`
- `.env.local` 與 `.env.production` 已切到新的唯一正式 exec URL
- GAS backend 已收斂為：
  - `doGet(e)`
  - `doPost(e)`
  - `action=health`
  - `action=initBackend`
  - `action=getCard`
  - `action=saveCard`
  - `action=debugRuntimeAccess`
  - `action=createRuntimeSheet`
- manifest 已收斂為最小必要設定：
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/drive.readonly`
- 新 backend 已直接連到新的正式 runtime sheet，而不是舊 sheet
- `default` 已 seed 到新 sheet，且後續 `initBackend` 不會覆蓋既有 `default`

## 後台驗證

- `GET /exec?action=health`
  - `ok: true`
  - `configured.sheetId: 12epmpzbyEzdvygO2K4Qkzpak9EUk0-kSTWIDi1IqK3g`
  - `configured.sheetName: cards_runtime`
  - `sheetAccessible: true`
  - `spreadsheetName: LIFF Card Runtime v2`
  - `runningInLiveWebApp: true`
- `GET /exec?action=debugRuntimeAccess`
  - `ok: true`
  - `scriptId: 1jwSWvmqyqfl7MGSvy5kILCHHx5q2Mhrdgu3Z2FwpS-QRGhXLre2B0tls`
  - `serviceUrl` 已對應新的唯一 exec URL
  - `sheetAccessible: true`
- `POST initBackend`
  - 首次 `seededDefault: true`
  - 後續 smoke check `seededDefault: false`
- `GET /exec?action=getCard&slug=default`
  - `ok: true`
- `POST saveCard`
  - round-trip 已成功
  - `updatedBy: codex-save-verify-2026-03-22`

## 前台現況

- 前台 remote config 來源已切到新 exec URL
- `/admin/` load/save 使用新 backend
- `CardPage` 透過 `loadRuntimeCard()` 讀 remote config
- `shareDigitalCard()` / `buildFlexMessage()` 使用同一份 runtime config
- 相關測試已通過：
  - `AdminPage > loads official remote data into the current draft`
  - `AdminPage > saves the current draft to the official remote backend`
  - `share.test.ts`
  - `card-source.test.ts`

## 驗證結果

- `npm test` ✅
- `npm run lint` ✅
- `npm run build` ✅
- `npm run smoke:pages` ✅

## 手動 Google 步驟

- 本輪已完成：
  - `clasp login` / OAuth
  - 新 GAS 首次 Spreadsheet / Drive 授權
- 目前沒有剩餘必做的 Google 手動授權步驟

## 備註

- 這次最終採用的是新的 runtime sheet，而不是沿用舊正式 sheet；這是依照本輪最後決策調整的正式狀態。
