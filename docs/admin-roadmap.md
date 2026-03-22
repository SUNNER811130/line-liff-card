# Admin Roadmap

## 現況

目前 Phase 2 正式後台資料流已完成，而且 deployment automation 已補齊到可由 CLI 代跑大部分流程：

- `/admin/` 可讀寫正式後台資料
- 前台卡頁會優先讀 remote config
- share / Flex 流程與畫面共用同一份 runtime config
- 失敗時 fallback 到 bundled `defaultCard`
- repo 內已有 `clasp` setup / push / deploy / health check / runtime sheet init 腳本

## 已採用的 Phase 2 方案

- GitHub Pages 保留前台與 `/admin/`
- Google Sheets 作為正式資料儲存
- Apps Script Web App 作為安全中介層
- repo 內沿用 `CardConfig` / schema / view-model

## Phase 2 仍有哪些人工步驟

1. 安裝並登入 `clasp`
2. 建立 Google Sheet
3. 第一次 Google OAuth / Apps Script 授權
4. 必要時啟用 Apps Script API / Execution API
5. 把 `/exec` URL 填入正式環境 `VITE_CARD_API_BASE_URL`

## CLI 可自動完成什麼

- 連接或建立 Apps Script 專案
- `clasp push`
- `clasp run setupScriptProperties`
- `clasp version`
- `clasp deploy`
- 呼叫 `initBackend`
- 驗證 `health` / `getCard` / `initBackend`

## Phase 3 候選方向

若未來需要更多營運能力，再考慮：

- 媒體上傳後台
- 版本歷史
- 權限控管
- 多卡片管理
- 審核流程
- Headless CMS 或自建 API + DB

## 目前不需要重做的部分

以下結構已可直接沿用：

- `CardConfig` type
- `assertCardConfig()`
- `CardPage` UI
- `buildCardPageViewModel()`
- `shareDigitalCard()` / `buildFlexMessage()`
- legacy slug canonicalization
