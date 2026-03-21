# line-liff-card

以 Vite、React、TypeScript 建立的 LINE 電子名片靜態站。現在已收斂為單一正式卡片 `default`、legacy slug `demo-consultant`、以及可直接在 GitHub Pages 開啟的 `/admin/` 管理頁 MVP。

## Requirements

- Node.js 20+
- npm 10+

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run test`
- `npm run lint`
- `npm run smoke:pages`

## Routes

- `/`
  - 直接顯示正式卡內容
- `/card/default/`
  - 正式卡 canonical URL
- `/card/demo-consultant/`
  - legacy slug，相容入口；實際顯示與分享的都是正式 `default` 卡
- `/admin/`
  - 管理頁 MVP

正式站 URL：

- `https://sunner811130.github.io/line-liff-card/`
- `https://sunner811130.github.io/line-liff-card/card/default/`
- `https://sunner811130.github.io/line-liff-card/card/demo-consultant/`
- `https://sunner811130.github.io/line-liff-card/admin/`

## Share Behavior

第三顆按鈕固定是系統分享按鈕，不屬於 `config.actions`，也不能在 admin 中刪除。

LINE 對話中的 Flex 電子名片 footer 現在也有第 3 顆固定按鈕：

- label: `分享這張電子名片`
- action: 開啟 canonical LIFF share 入口，再自動觸發既有 `shareTargetPicker`

實際分享流程：

1. 若目前在 LINE app 內，且 LIFF `shareTargetPicker` 可用：
   - 直接送出同一張 LINE Flex 電子名片
2. 若目前在 LINE app 內，但還沒進入可直接分享的 LIFF 狀態：
   - 會先轉到對應的 LIFF URL，附帶一次性的 `?intent=share&intentId=...`
   - LIFF 初始化成功後會自動再試一次 `shareTargetPicker`
3. 若收件人是在 LINE 對話中點 Flex 卡片 footer 的 `分享這張電子名片`：
   - Flex button 只能用 URI action，不能在聊天氣泡內直接執行 JS
   - 因此會先開 canonical LIFF card route，附帶 `?intent=share&source=flex-forward`
   - LIFF 頁面接手後會補上一次性 `intentId`，再沿用同一套 auto-share guard 與 `shareTargetPicker`
4. 若完全不在 LINE app 內：
   - 退回一般 Web Share、LINE 文字分享頁或複製連結
   - 這些 fallback 不保證會是 LINE Flex 電子名片

重點差異：

- 按第三顆分享按鈕：優先嘗試 LINE Flex 電子名片流程
- 手動複製網址貼出去：通常只會是網址，不是 Flex 卡片

## Content Source

正式卡資料集中在：

- `src/content/cards/default.ts`
- `src/content/cards/index.ts`

目前只有一張正式卡：

- slug: `default`
- legacy slug: `demo-consultant`

`demo-consultant` 只是相容入口，不再有獨立內容檔。

## LIFF Setup

請建立 `.env.local` 或部署環境變數：

```bash
VITE_LIFF_ID=YOUR_LIFF_ID
VITE_SITE_URL=https://sunner811130.github.io/line-liff-card/
```

重要原則：

- `VITE_SITE_URL` 應設定為專案根路徑，不要只指向單一卡頁
- 這樣 `/`、`/card/default/`、`/card/demo-consultant/`、`/admin/` 都在同一個 LIFF Endpoint 範圍內
- `getCardLiffUrl('demo-consultant')` 會自動收斂到正式 `default` LIFF 分享入口
- canonical share 入口是 `getCardLiffUrl(slug)` 收斂後的 `https://liff.line.me/<LIFF_ID>/card/default/`

LIFF URL 與公開網址的關係：

- `https://liff.line.me/<LIFF_ID>` 或 `https://liff.line.me/<LIFF_ID>/card/default/`
  - 進入 LIFF 分享流程
- `https://sunner811130.github.io/line-liff-card/card/default/`
  - 公開正式頁
- 從公開正式頁在 LINE app 內按第三顆分享
  - 會優先 handoff 到 LIFF，再自動嘗試分享同一張 Flex 卡

## Admin MVP

管理頁入口：

- `https://sunner811130.github.io/line-liff-card/admin/`

這一版可做：

- 編輯卡片內容與前兩顆一般按鈕
- 保留第三顆固定分享按鈕規則
- 即時預覽正式卡版型
- 匯入 / 匯出 JSON
- 將草稿暫存於瀏覽器 `localStorage`

這一版不能做：

- 直接寫回 repo 或 GitHub Pages
- 遠端持久化存檔
- 權限管理 / 多人協作

## GitHub Pages

本專案已提供：

- `404.html` route restore
- `card/default/index.html`
- `card/demo-consultant/index.html`
- `admin/index.html`

因此 GitHub Pages 可以直接開啟 `/admin/`、`/card/default/`、`/card/demo-consultant/`，也能處理 SPA fallback。

## Verify Deployment

部署後至少確認：

1. `/`
2. `/card/default/`
3. `/card/demo-consultant/`
4. `/admin/`

以及：

1. 在 LINE app 內從上述正式頁按第三顆分享，會優先嘗試 LINE Flex 電子名片
2. `demo-consultant` 分享出去仍是正式 `default` 卡內容
3. 從收到的 Flex 卡片點 `分享這張電子名片`，也應回到 canonical `default` LIFF share 入口
4. 不在 LINE app 內時，fallback 訊息明確表示可能只會分享網址
