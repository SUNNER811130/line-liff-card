# Project Charter

## 專案名稱

`line-liff-card`

## 專案目標

建立一個可正式對外使用的 LINE 電子名片專案，核心是：

- 在 LINE LIFF 內可分享、可作為正式名片入口
- 在一般瀏覽器中也能正常開啟與分享，不因 LIFF 條件不足而失效
- 以靜態站為基礎，先把卡片結構、分享規則與管理頁 MVP 穩定下來
- 為後續接 Google Sheets 或真正 CMS 保留乾淨的資料結構

## 核心方向

- 先收斂成單一正式卡片，不再以 demo 展示為主
- 以前端靜態站 + 本地 config 為正式來源
- 後台目前只做 admin MVP：編輯、預覽、JSON 匯入匯出、本機暫存
- 分享流程必須同時兼容 LIFF 與 web fallback
- 資料模型要能延伸到外部資料來源，但目前不假裝已有後端

## 現階段範圍

- 正式卡片頁：`/`、`/card/default/`
- legacy 路由相容：`/card/demo-consultant/` 目前映射回 `default` 卡
- admin MVP：`/admin/`
- GitHub Pages 部署
- 404 fallback 與 GitHub Pages 路徑還原
- LIFF 初始化、LINE 分享、web fallback 分享
- 單一卡片資料結構 `CardConfig`

## 非目標

- 不是多人協作 CMS
- 不是可直接寫回 repo 的線上後台
- 不是已完成的 Google Sheets backend
- 不是多卡內容營運平台
- 不是以 demo consultant 風格為主的展示站
- 不是完整權限系統、審核系統、版本管理系統

## 使用者明確要求

依目前 repo 狀態與既有脈絡，使用者真正要求可整理為：

- 專案需維持正式、可交付、可延續開發的方向
- 不要再回到 demo / 展示樣板導向
- admin 頁先做成 MVP，但要為後續資料來源擴充預留結構
- 分享按鈕與 LIFF 邏輯必須保留正式規則
- 文件要能讓下一位 GPT / Codex / 開發者快速接手，不靠口頭補充

## 前台 / 後台 / 分享 / LIFF / Web Fallback 原則

### 前台原則

- 前台以正式電子名片為核心，不再以卡片列表首頁為主
- `/` 目前直接顯示 `primaryCard`
- `/card/:slug/` 仍保留 slug 路由能力，但目前只有一張正式卡
- 內容與樣式以正式商務卡片為基準，不做 demo 感文案與假資料體驗包裝

### 後台原則

- `/admin/` 是管理頁 MVP，不是正式 CMS
- 可編輯、即時預覽、JSON 匯入匯出、本機 `localStorage` 暫存
- 不直接寫回 GitHub Pages、repo 或遠端資料庫
- 後續若接後端，應沿用既有 `CardConfig` schema 與驗證流程

### 分享原則

- 一般 action button 由 `config.actions` 控制
- 分享按鈕不是資料自由排序的一般按鈕，而是系統固定追加在最後
- 分享按鈕必須保留，不應被改成一般 demo CTA
- 分享文案可由 `config.share.buttonLabel` 改字，但位置規則不可破壞

### LIFF 原則

- 只有在設定 `VITE_LIFF_ID` 且目前 URL 位於 `VITE_SITE_URL` Endpoint 範圍內時，才嘗試正式 LIFF 初始化
- 若不符合 Endpoint 範圍，不硬做失敗初始化
- LIFF 可用時優先走 `shareTargetPicker` 與 permanent link
- LIFF 只是一種執行環境，不應讓頁面脫離 LIFF 後失效

### Web fallback 原則

- 非 LINE client、未登入、未設定 LIFF、或 LIFF API 不可用時，頁面仍需可正常展示
- 分享流程依序退回：
  1. LIFF `shareTargetPicker`
  2. `navigator.share`
  3. `line.me/R/msg/text`
  4. 複製連結
- fallback 是正式能力，不是臨時替代方案
