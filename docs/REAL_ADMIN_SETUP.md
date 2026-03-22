# Real Admin Setup

這份文件描述目前正式 `/admin/` 與 runtime backend 的真實狀態。內容已改成新的 standalone GAS backend + 新的 runtime sheet，不再沿用任何舊 backend / 舊 exec / library URL。

## 正式資源

- 正式 standalone GAS `scriptId`
  - `1jwSWvmqyqfl7MGSvy5kILCHHx5q2Mhrdgu3Z2FwpS-QRGhXLre2B0tls`
- 正式唯一 Web App exec URL
  - `https://script.google.com/macros/s/AKfycby8nIoXY64uvKiWCUZI21AlZZ63o9EQ9AuYYmV320qFljfI-ZdHWMYAVNf0mKGT-CW7hg/exec`
- 正式 runtime sheet
  - 檔名：`LIFF Card Runtime v2`
  - `SHEET_ID=12epmpzbyEzdvygO2K4Qkzpak9EUk0-kSTWIDi1IqK3g`
  - `SHEET_NAME=cards_runtime`

## 關係說明

- 前台與 `/admin/` 都只打這一個 exec URL
- 這個 GAS 直接對新的 `LIFF Card Runtime v2` 寫入 `cards_runtime`
- 資料表欄位固定：

```text
slug | config_json | updated_at | updated_by
```

- 舊 backend / 舊 exec / library URL 全部視為 retired

## 後台功能

新的 GAS backend 提供：

- `GET ?action=health`
- `GET ?action=debugRuntimeAccess`
- `GET ?action=getCard&slug=default`
- `POST { action: "initBackend", ... }`
- `POST { action: "saveCard", ... }`

額外只在初始化時使用：

- `POST { action: "createRuntimeSheet", ... }`

## 初始化規則

- `initBackend` 會確認 `cards_runtime` 存在
- 如果沒有表頭，會自動建立
- 如果 `default` 不存在，會用 bundled default seed 一筆
- 如果 `default` 已存在，預設不覆蓋
- 寫入一律驗證 `write token`

## 前端切換

目前 repo 內已切換：

- [/.env.local](/home/usersun/projects/line-liff-card/.env.local)
- [/.env.production](/home/usersun/projects/line-liff-card/.env.production)

兩者的 `VITE_CARD_API_BASE_URL` 都已指向新的唯一正式 exec URL。

## `/admin/` 現在怎麼 load/save

- `載入正式資料`
  - 會呼叫 `getCard(default)`
  - 用新的 runtime sheet 資料覆蓋當前 draft
- `儲存到正式後台`
  - 會呼叫 `saveCard(default)`
  - 寫回新的 runtime sheet
- 這兩條路徑都已由測試與真實 API round-trip 驗證

## 前台與分享

- 前台 card page 透過 `loadRuntimeCard()` 讀新的 remote config
- `shareDigitalCard()` / `buildFlexMessage()` 使用同一份 runtime config
- 因此 `/admin/` save 之後，後續卡頁與新分享出去的 Flex 會吃同一份正式資料

## 驗證摘要

- `health` ✅
- `initBackend` ✅
- `getCard(default)` ✅
- `saveCard(default)` round-trip ✅
- `/admin/` load/save 測試 ✅
- 前台 remote config 測試 ✅
- 分享 Flex runtime config 測試 ✅
- `npm test` ✅
- `npm run lint` ✅
- `npm run build` ✅
- `npm run smoke:pages` ✅

## Google 手動步驟

本輪需要的 Google 手動步驟都已完成：

- `clasp login`
- 新 GAS 第一次 Spreadsheet / Drive 授權

目前沒有剩餘未完成的 Google 手動授權步驟。
