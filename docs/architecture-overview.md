# Architecture Overview

## 專案技術棧

- 前端框架：React 18
- 建置工具：Vite 6
- 語言：TypeScript
- 測試：Vitest、Testing Library、jsdom
- LINE 整合：`@line/liff`
- QR Code：`qrcode`
- 部署：GitHub Pages + GitHub Actions

## 路由結構

路由解析集中在 `src/lib/routes.ts`。

- `/`
  - `home`
  - 目前直接渲染 `primaryCard`
- `/admin/`
  - `admin`
  - 渲染 `AdminPage`
- `/card/:slug/`
  - `card`
  - 以 slug 查找 `CardConfig`
- 其他路徑
  - `not-found`

補充：

- GitHub Pages 404 fallback 由根目錄 `404.html` 處理
- SPA 入口啟動時由 `src/lib/pages-fallback.ts` 還原被轉寫的路徑
- `card/default/index.html` 與 `card/demo-consultant/index.html` 是實體頁入口，最終都載入同一個 React app

## 資料流

正式卡資料流：

1. `src/content/cards/default.ts`
2. 經 `defineCardConfig()` / `assertCardConfig()` 驗證
3. `src/content/cards/index.ts` 匯出 `primaryCard`、`cards`、slug lookup
4. `src/App.tsx` 依路由選擇 `CardPage`
5. `src/content/cards/view-model.ts` 將 `CardConfig` 轉成頁面 view model
6. `src/components/CardPage.tsx` 渲染 UI、分享、LIFF 狀態、QR Code

admin 資料流：

1. `createDefaultCardDraft()` 以 `defaultCard` 複製初始草稿
2. `AdminPage` 內部 state 持有 draft
3. `validateCardConfig()` 做前端驗證
4. `serializeCardConfig()` / `parseCardConfigJson()` 做 JSON 匯入匯出
5. `localStorage` key：`line-liff-card.admin-draft`
6. 同一份 draft 直接送進 `CardPage` 做 embedded preview

## card config 結構

主結構定義在 `src/content/cards/types.ts`：

- `id`
- `slug`
- `isPrimary`
- `legacySlugs`
- `appearance`
  - `theme`
  - `layout`
- `modules`
  - `showHighlights`
  - `showSharePanel`
  - `showQrCode`
- `photo`
  - `src`
  - `alt`
  - `link`
- `content`
  - `brandName`
  - `fullName`
  - `title`
  - `headline`
  - `subheadline`
  - `intro`
  - `highlightsTitle`
  - `highlights`
  - `actionsTitle`
  - `actionsDescription`
  - `sharePanelTitle`
- `actions`
  - 一般連結按鈕設定
- `share`
  - 分享標題、文字、按鈕文案
- `seo`
  - title / description / og 設定

目前實際上只有一份正式資料：`defaultCard`。

## share button 規則

分享規則集中在 `src/lib/card-actions.ts` 與 `src/components/CardPage.tsx`：

- `config.actions` 只代表一般按鈕
- 分享按鈕永遠由系統固定附加在最後
- 分享按鈕 key 固定為 `share`
- 分享按鈕不可透過 action 排序被插入中間
- 分享文案可來自 `config.share.buttonLabel`
- hidden action 會被濾掉，但分享按鈕仍會保留

這是重要不可破壞規則，測試已有覆蓋。

## LIFF 初始化與 fallback 流程

實作集中在 `src/lib/liff.ts` 與 `src/lib/share.ts`。

### 初始化

1. 讀取 `VITE_LIFF_ID`
2. 讀取 `VITE_SITE_URL`
3. 檢查目前 URL 是否位於 LIFF Endpoint 範圍內
4. 若符合，動態載入 LIFF SDK modules 並 `init`
5. 若不符合或未設定，回傳 `disabled` / `error` 狀態，不硬做初始化

### 分享流程

1. 若在 LINE client 且 `shareTargetPicker` 可用
   - 建立 permanent link
   - 分享 Flex Message
2. 否則若瀏覽器支援 `navigator.share`
   - 走 Web Share API
3. 否則
   - 導向 `https://line.me/R/msg/text/`
4. 若導向也不可用
   - 複製卡片連結到剪貼簿

### 重要限制

- LIFF 是否能成功，不只取決於 `VITE_LIFF_ID`，也取決於目前頁面是否在 `VITE_SITE_URL` Endpoint 範圍內
- 目前正式 slug 是 `default`；若 Endpoint URL 綁得太窄，其他 slug 只能 fallback

## 未來如何接 CMS / Google Sheets backend

目前 repo 尚未實作資料來源 adapter，但既有結構已足夠延伸。

### 建議接法

1. 新增 `src/lib/card-source/` 或等價資料來源層
2. 定義統一介面，例如：
   - `getCardBySlug(slug)`
   - `getPrimaryCard()`
   - `saveDraft()` 或 admin 寫入 API
3. 將現有 `default.ts` 視為 local source
4. 新增 Google Sheets source：
   - 讀取 sheet
   - 轉成 `CardConfig`
   - 經 `assertCardConfig()` 驗證
5. 若要寫回資料：
   - 前端不要直接持有 credentials
   - 由 Apps Script、Cloud Function 或自建 API 代寫

### Google Sheets 適合什麼階段

- 適合單人或小團隊內容維護
- 適合先驗證欄位設計與資料流程
- 不適合複雜權限、審核與高一致性需求

### 真正 CMS / API 化時可保留的部分

- `CardConfig` type
- schema 驗證
- view model
- CardPage / AdminPage 的欄位語意
- 分享與 LIFF 邏輯

要替換的主要是資料來源與寫入流程，不是整個前端頁面。
