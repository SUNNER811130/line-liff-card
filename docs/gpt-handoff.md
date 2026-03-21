# GPT Handoff

## 專案一句話摘要

這是一個以 Vite + React + TypeScript 建立的 LINE LIFF 電子名片靜態站，目前已收斂成單一正式卡片 + admin MVP，重點是正式可用而不是 demo 展示。

## 使用者真正要的是什麼

- 要一個可正式延續開發的電子名片 repo
- 要保留 LIFF 分享與 web fallback 的正式能力
- 要有可繼續擴充的 admin / backend 路線，而不是只做樣板頁
- 要文件與結構足夠清楚，讓下一位 GPT / Codex 直接接手
- 不要再把專案做回 demo consultant 風格、多卡展示首頁、或只為展示而存在的假互動

## 目前 repo 關鍵檔案在哪裡

- app 入口：
  - `src/main.tsx`
  - `src/App.tsx`
- 正式卡資料：
  - `src/content/cards/default.ts`
  - `src/content/cards/index.ts`
  - `src/content/cards/types.ts`
  - `src/content/cards/schema.ts`
  - `src/content/cards/view-model.ts`
- 卡片畫面：
  - `src/components/CardPage.tsx`
- admin MVP：
  - `src/components/AdminPage.tsx`
  - `src/content/cards/draft.ts`
  - `src/lib/card-validation.ts`
- 路由與 GitHub Pages fallback：
  - `src/lib/routes.ts`
  - `src/lib/pages-fallback.ts`
  - `404.html`
- LIFF / 分享：
  - `src/lib/liff.ts`
  - `src/lib/share.ts`
  - `src/lib/card-actions.ts`
- 部署與 smoke：
  - `.github/workflows/deploy-pages.yml`
  - `scripts/smoke-pages.sh`

## 重要規則

- 第三顆按鈕一定是分享按鈕，這是系統規則，不是內容規則
- 目前正式卡內容已套用為蘇彥宇 Sunner / 關係護理室版本
- `config.actions` 只放一般按鈕，不放分享按鈕
- 一般按鈕目前最多只保留前兩顆，避免分享按鈕被擠到第四顆之後
- `/` 目前不是卡片列表首頁，而是直接顯示正式卡
- `demo-consultant` 目前只是 legacy slug，不是獨立卡內容
- admin 是 MVP，不可描述成真正 CMS
- LIFF 初始化只有在 `VITE_LIFF_ID` 存在且當前 URL 位於 `VITE_SITE_URL` Endpoint 範圍內才成立
- LIFF 不可用時一定要保留 web fallback
- 前兩顆按鈕正式連結仍待使用者確認，目前是 `#contactUrl` 與 `#serviceUrl` placeholder

## 哪些東西不能再做回 demo 風格

- 不要再把首頁做回多卡 demo gallery
- 不要重新引入 `demo-consultant` 當主要展示內容
- 不要用假的聯絡資訊、假的品牌定位、假的 demo 文案包裝成正式完成
- 不要把分享按鈕改成可任意刪除或任意排序的一般 CTA
- 不要把 admin 說成已具備遠端存檔、多人協作、權限管理

## 當前未完成事項

- 前兩顆按鈕正式連結尚未確認
- 正式主視覺與 OG 圖尚未替換
- admin 與正式 config 的銜接還沒有真正打通
- 外部資料來源 adapter 尚未建立
- Google Sheets backend 尚未開始實作
- README / setup 等舊文件仍有部分多卡時期描述

## 建議下一個 Codex 任務該做什麼

最建議的下一個任務是：

1. 清理 repo 內所有仍把專案描述成多卡 demo 的文件與註解
2. 建立 `card-source` 抽象層，先把 `default.ts` 包成 local source
3. 定義 admin 匯出 JSON 如何轉成正式資料來源的流程

如果只能做一件事，優先做第 2 點，因為它會決定之後接 Google Sheets 或 CMS 的成本。

## 若要開新對話，可直接貼上的摘要段落

這個 repo 是 `line-liff-card`，目前已不是多卡 demo 專案，而是單一正式 LINE 電子名片 + `/admin/` 管理頁 MVP。正式卡內容已套用為蘇彥宇 Sunner / 關係護理室版本；首頁 `/` 直接顯示正式卡，`/card/default/` 是正式 slug，`/card/demo-consultant/` 只是 legacy slug 映射回正式卡。前兩顆按鈕目前是 `立即聯繫我` 與 `查看服務內容`，第三顆固定是系統分享按鈕，不能當一般 action 排序；正式連結仍待使用者確認，暫用 `#contactUrl`、`#serviceUrl` placeholder。LIFF 只有在 `VITE_LIFF_ID` 存在且目前 URL 落在 `VITE_SITE_URL` Endpoint 範圍時才會初始化，否則要走 web fallback。admin 目前只能本機編輯、預覽、JSON 匯入匯出與 `localStorage` 暫存，不是真正 CMS。下一步建議先抽出資料來源 adapter，再接 Google Sheets 或其他 backend。
