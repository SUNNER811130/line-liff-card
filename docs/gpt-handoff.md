# GPT Handoff

## 專案一句話摘要

這是單一正式 LINE 電子名片靜態站，核心不是 demo 展示，而是讓 `/`、`/card/default/`、`/card/demo-consultant/` 在 GitHub Pages 與 LIFF 間都盡可能收斂到同一張正式 Flex 電子名片分享流程。

## 目前真正重要的產品規則

- 第三顆按鈕固定是系統分享按鈕，不能被內容設定刪除或改成一般連結
- 正式卡只有 `default`
- `demo-consultant` 只是 legacy slug，相容入口，不是獨立卡
- legacy slug 分享出去也必須是正式 `default` 卡內容
- `/admin/` 是管理頁 MVP，不是真正 CMS
- `/admin/` 的正式網址是 `https://sunner811130.github.io/line-liff-card/admin/`

## 這次修正後的分享策略

1. `inClient && shareAvailable`
   - 直接 `shareTargetPicker` 送 LINE Flex 電子名片
2. 在 LINE app 內，但目前頁面還不是可直接分享的狀態
   - 第三顆按鈕先轉去 `https://liff.line.me/<LIFF_ID>/card/default/?intent=share&intentId=...`
   - LIFF 初始化成功後自動再試一次分享
3. 完全不在 LINE app 內
   - fallback 到 Web Share、LINE 文字分享頁或 copy link
   - 這些 fallback 不保證是 Flex 卡片

保護機制：

- `intentId` 一次性 token
- `sessionStorage` pending / login-requested 狀態
- auto-share 完成或失敗後會清掉 query，避免無限 redirect / 無限 auto-share

## LIFF / Endpoint 觀念

- `VITE_SITE_URL` 現在應該指向 repo root：
  - `https://sunner811130.github.io/line-liff-card/`
- 不要再指向 `/card/default/`
- 這樣首頁、正式卡、legacy slug、admin 都在同一個 LIFF Endpoint URL 範圍內
- `getCardLiffUrl('demo-consultant')` 會 canonicalize 成 `default`

## 關鍵檔案

- app / route:
  - `src/App.tsx`
  - `src/lib/routes.ts`
  - `src/lib/pages-fallback.ts`
  - `404.html`
  - `admin/index.html`
  - `card/default/index.html`
  - `card/demo-consultant/index.html`
- 分享 / LIFF:
  - `src/lib/share.ts`
  - `src/lib/liff.ts`
  - `src/components/CardPage.tsx`
- 正式內容:
  - `src/content/cards/default.ts`
  - `src/content/cards/index.ts`
- admin:
  - `src/components/AdminPage.tsx`
  - `docs/admin-mvp.md`
- 驗證:
  - `src/test/app.test.tsx`
  - `src/test/card-config.test.ts`
  - `src/test/pages-fallback.test.ts`
  - `scripts/smoke-pages.sh`

## 不要再做回去的事

- 不要把 `demo-consultant` 恢復成獨立正式卡
- 不要把第三顆分享按鈕改成一般 action
- 不要把 fallback 說成一定還是 Flex
- 不要把 `/admin/` 描述成真正可持久化 CMS
- 不要把 `VITE_SITE_URL` 再改回單一卡頁 endpoint

## 若下一位 Codex 接手，先確認什麼

1. LINE Developers Console 的 LIFF Endpoint 是否已設為 repo root。
2. 正式環境的 `VITE_LIFF_ID`、`VITE_SITE_URL` 是否一致。
3. `/admin/`、`/card/default/`、`/card/demo-consultant/` build 後是否都有實體 HTML。
4. 若使用者回報「還是只分享網址」，先分辨他是按第三顆按鈕，還是手動複製網址貼出。

## 可直接貼到新對話的摘要

這個 repo 是 `line-liff-card`，目前是單一正式卡 `default` 的 LINE 電子名片靜態站。首頁 `/` 直接顯示正式卡，`/card/default/` 是 canonical card route，`/card/demo-consultant/` 只是 legacy slug，但顯示與分享都收斂到同一張正式卡。第三顆按鈕固定是分享按鈕，不能刪除；現在分享流程是：若 `inClient && shareAvailable` 直接送 LINE Flex 卡，若在 LINE app 內但尚未 share-ready，會先 handoff 到 LIFF URL 並帶 `intent=share`，LIFF 初始化後自動再試一次分享；不在 LINE app 內才退回一般分享或網址。`VITE_SITE_URL` 應設為 `https://sunner811130.github.io/line-liff-card/`，不是單一卡頁。`/admin/` 已有實體入口 `admin/index.html`，正式網址是 `https://sunner811130.github.io/line-liff-card/admin/`。admin 仍只是本地編輯 / 預覽 / JSON 匯入匯出 MVP，不是真正 CMS。
