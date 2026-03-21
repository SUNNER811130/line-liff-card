# Status Snapshot

## 目前完成了什麼

- `/` 直接顯示正式 `default` 卡
- `/card/default/` 是正式 canonical card route
- `/card/demo-consultant/` 保留為 legacy slug，但實際顯示與分享都收斂到正式 `default` 卡內容
- `/admin/` 已有 SPA route 與實體 `admin/index.html`，可直接在 GitHub Pages 開啟
- 第三顆按鈕固定為系統分享按鈕，仍不屬於 `config.actions`
- LINE 對話中的 Flex 電子名片 footer 已新增第 3 顆固定轉傳按鈕 `分享這張電子名片`
- 分享流程已升級為：
  - `inClient + shareAvailable` 直接送 LINE Flex 電子名片
  - LINE app 內但尚未 share-ready 時，先 handoff 到 LIFF URL，再自動嘗試 Flex 分享
  - 收件人從 Flex footer 點 `分享這張電子名片` 時，會先進 canonical LIFF share 入口，再由 LIFF 頁面觸發同一套 auto-share
  - 不在 LINE app 內時，退回 web share / LINE 文字分享 / copy link
- LIFF endpoint 與 site URL 觀念已收斂為專案根路徑
- smoke script 已補 `/admin/` build 驗證

## 現在的正式路由

- `/`
- `/card/default/`
- `/card/demo-consultant/`
- `/admin/`

正式 GitHub Pages URL：

- `https://sunner811130.github.io/line-liff-card/`
- `https://sunner811130.github.io/line-liff-card/card/default/`
- `https://sunner811130.github.io/line-liff-card/card/demo-consultant/`
- `https://sunner811130.github.io/line-liff-card/admin/`

## 分享現況

- 第三顆按鈕按下時，優先目標是 LINE Flex 電子名片，不是純網址
- Flex footer 第 3 顆按鈕只能使用 URI action，不能在 LINE 聊天氣泡內直接執行 JS
- 因此 Flex 轉傳做法是打開 `https://liff.line.me/<LIFF_ID>/card/default/?intent=share&source=flex-forward`
- `default` 與 `demo-consultant` 都會分享正式卡內容
- `demo-consultant` 的 LIFF handoff 會自動指向 canonical `default` LIFF route
- 分享 intent 以 URL `intent=share` + `intentId` 搭配 `sessionStorage` 一次性保護，避免無限 redirect / 無限 auto-share

## LIFF / Site URL 原則

- `VITE_SITE_URL` 應設為 `https://sunner811130.github.io/line-liff-card/`
- 不要再設成單一卡頁 `/card/default/`
- 這樣 LIFF endpoint 範圍可覆蓋首頁、正式卡、legacy slug 與 admin

## admin MVP 現況

- admin 正式入口：`https://sunner811130.github.io/line-liff-card/admin/`
- 可編輯內容、預覽、匯出 / 匯入 JSON、暫存 `localStorage`
- 不支援遠端存檔、寫回 repo、多人協作、權限管理
- 預覽中的第三顆按鈕仍保留正式規則，但不會真的送出分享

## 已知限制

- 若使用者完全不在 LINE app 內，仍無法 100% 保證送出 Flex；fallback 可能只會分享網址
- 若 LINE app 容器本身不支援 `shareTargetPicker`，intent handoff 後仍可能失敗
- 若 LIFF ID、Endpoint URL 或 LINE Developers Console 設定不正確，正式環境仍會退回 fallback
- 前兩顆 action 連結目前仍是 placeholder：`#contactUrl`、`#serviceUrl`

## 建議後續

1. 確認前兩顆 action 的正式連結。
2. 繼續把 admin 匯出的 JSON 與正式資料來源打通。
3. 若要追求更高 Flex 成功率，需同步驗證 LINE Developers Console 的 LIFF endpoint 與 scope 設定。
