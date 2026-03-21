# Admin Roadmap

## 背景

目前 `/admin/` 已是可用的管理頁 MVP，但本質仍是「本地編輯器 + 預覽器」。若要升級成真正可運營的後台，建議分階段進行，避免一次把靜態站、資料源、權限與部署流程全部耦合。

## Phase 1：config / JSON / admin 預覽

### 目標

- 維持現有 `CardConfig` 為單一資料模型
- admin 提供欄位編輯、即時預覽、JSON 匯入匯出
- 以本機暫存與人工套用 config 為主要流程

### 目前 repo 狀態

- 已完成大部分
- 實際入口：`/admin/`
- 正式資料來源仍是 `src/content/cards/default.ts`

### 優點

- 成本低
- 無需後端
- 資料模型可快速調整
- 適合先確認欄位、文案、版型、分享規則

### 缺點

- 不能多人共用
- 不能直接發布
- 容易出現 admin 草稿與正式 config 脫節
- 沒有權限與版本歷史

## Phase 2：Google Sheets backend 方案

### 目標

- 讓正式卡片內容可由非工程人員更新
- 以 Google Sheets 作為內容來源
- 透過安全中介層讀取或寫入

### 建議方案

- 先做 read-only：
  - Sheets -> adapter -> `CardConfig`
- 再評估 write-back：
  - Admin -> Apps Script / API -> Sheets

### 技術做法

- 新增 `card-source` adapter 層
- 保留 `assertCardConfig()` 作為資料入口驗證
- 使用 Apps Script 或自建 API 代管 credentials
- 前端不要直接存取 service account 金鑰

### 優點

- 維運門檻低
- 非工程人員易上手
- 上線速度快
- 適合單卡或少量卡片管理

### 缺點

- 欄位結構容易漂移
- 權限與審核能力有限
- 複雜資料關聯不適合
- 寫入流程若處理不好，容易有同步與驗證問題

## Phase 3：真正 CMS / API 化方案

### 目標

- 建立正式資料服務
- 支援可控的讀寫、驗證、版本、權限與多環境部署

### 可行方向

- Headless CMS
- 自建 API + database
- Git-based CMS

### 優點

- 結構最乾淨
- 可做權限、審核、版本控管
- 可支援多卡、模板、媒體管理、營運流程
- 可與其他系統整合

### 缺點

- 成本最高
- 建置期最長
- 需要更完整的產品與資料設計

## 建議優先順序

1. 先完成 Phase 1 收尾：讓 admin 輸出的 JSON 能穩定對應正式 config，並補齊真實內容。
2. 若近期需求是「非工程人員可維護內容」，優先做 Phase 2 read-only Sheets adapter。
3. 若確認未來會有多卡、多人、權限、內容流程，才進入 Phase 3。

## 結論

以目前 repo 狀態，最合理的順序不是直接跳真正 CMS，而是：

1. 先收斂正式卡片內容與資料模型
2. 再做資料來源 adapter
3. 然後才選 Sheets 或 CMS

這樣能最大化沿用目前已完成的 `CardConfig`、schema、view model 與 card 頁面實作。
