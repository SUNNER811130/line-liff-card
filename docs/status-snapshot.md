# Status Snapshot

## 目前完成了什麼

- 已完成單一正式卡片頁，首頁 `/` 直接顯示正式卡
- 已完成 `/card/default/` 正式路由
- 已完成 `/card/demo-consultant/` legacy 路由相容，實際映射回正式卡
- 已完成 `/admin/` 管理頁 MVP
- 已完成 `CardConfig` 型別、runtime schema 驗證、view model 轉換
- 已完成分享按鈕固定追加在最後的規則
- 已完成 LIFF 初始化與 web fallback 分享流程
- 已完成 QR Code 產生與下載
- 已完成 GitHub Pages 404 fallback 與 route restore
- 已配置 GitHub Actions：lint、test、smoke build、Pages deploy

## 目前保留了哪些技術選型

- Vite
- React 18
- TypeScript
- Vitest + Testing Library
- GitHub Pages 靜態部署
- `@line/liff`
- `qrcode`
- 本地 TS config 檔作為正式卡片資料來源
- admin 以 `localStorage + JSON import/export` 作為 MVP 方案

## 目前有哪些已知限制

- 真正正式內容仍是 placeholder 文案，尚未填入實際品牌 / 個人資料
- 目前只有一張正式卡片，`cards` collection 只有 `default`
- `demo-consultant` 已不是獨立卡，只是 legacy slug
- admin 無法寫回 repo、GitHub Pages、Sheets 或任何遠端資料源
- theme 與 layout 各只有一種選項：`executive`、`profile-right`
- admin 驗證只涵蓋部分欄位與連結格式，未形成完整商業規則驗證
- 分享 Flex Message footer 目前預設使用前兩個 action
- README / setup 類文件仍留有多卡時期描述，與現況不完全一致

## 目前有哪些待補內容

- 正式卡片真實文案、品牌資料、圖片、外部連結
- admin 與正式 config 的銜接策略
- 外部資料來源 adapter
- Google Sheets backend PoC
- 更完整的 admin 驗證與欄位約束
- 分享內容與正式品牌視覺細修
- 文件與 README 的全域一致化整理

## 最新主要路由 / 頁面

- `/`
  - 直接顯示 `primaryCard`，目前就是 `defaultCard`
- `/card/default/`
  - 正式卡片頁
- `/card/demo-consultant/`
  - legacy slug，相容入口，實際顯示正式卡片
- `/admin/`
  - 管理頁 MVP
- 其他未知路徑
  - 顯示 404 fallback

## 正式卡片現況

- 來源檔案是 `src/content/cards/default.ts`
- `default` 是唯一正式卡片 slug
- 外觀為 `executive` theme + `profile-right` layout
- 一般 action 目前只有兩顆：`聯絡`、`預約`
- 分享按鈕由系統追加在最後，不寫在 `actions` 內
- `demo-consultant` 被放在 `legacySlugs`
- 目前內容仍屬可替換樣板，不適合直接當真實品牌公開頁

## admin MVP 現況

- 可編輯基本資料、文案、圖片、action、分享文案、模組顯示
- 可即時預覽正式卡版型
- 可匯出 JSON、貼上 JSON 套用、載入 JSON 檔案、下載 JSON
- 可讀取本機圖片做前端預覽
- 會自動暫存草稿到 `localStorage`
- 不具備遠端存檔、權限、協作、審核、版本歷史

## 已知 bug / 風險

- 文件層面仍混有多卡時期敘述，容易讓新接手者誤判目前還有 `demo-consultant` 實體資料檔
- `scripts/smoke-pages.sh` 與部分測試仍保留 `dist/card/demo-consultant/index.html` 驗證，這是 legacy 相容，不代表多卡仍在營運
- 若 action 使用 placeholder 或空值，runtime 會回退到當前頁，可能掩蓋內容尚未補齊的問題
- LIFF 是否能在正式環境成功初始化，仍依賴 `.env.production` 與 LINE Developers Console 設定，repo 內無法單靠程式碼保證
- `VITE_SITE_URL` 若指向單一卡片頁，其他 slug 頁面可能不在 LIFF Endpoint 範圍內，只能走 web fallback

## 下一步建議

1. 先把正式卡片的真實內容、圖片與連結補齊，讓 `/card/default/` 可正式對外使用。
2. 明確決定未來資料來源策略：繼續 local config、接 Google Sheets，或直接做 API/CMS。
3. 將 admin 產出的 JSON 與正式 config 接軌，避免管理頁只是獨立 sandbox。
4. 清理 README、Setup、測試敘述中的多卡舊語意，降低交接成本。
5. 若確認要做後台，先實作 `card-source` adapter，再做 Google Sheets 讀取 PoC。
