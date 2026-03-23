# Codebase Map

## 1. 主要模組總覽

- `src/App.tsx`
  負責 route 解析，決定進入 `/`、`/card/:slug/`、`/admin/` 或 404。
- `src/components/CardPage.tsx`
  前台 `/card/default/` 與 admin preview 的實際渲染頁。負責 LIFF 初始化、分享按鈕、QR code 與畫面輸出。
- `src/components/AdminPage.tsx`
  正式 CMS。負責 unlock、讀取正式 runtime config、編輯本地 draft、save、upload、preview。
- `src/lib/card-source.ts`
  前後台共用的 runtime data adapter。封裝 `getCard`、`saveCard`、`createAdminSession`、`verifyAdminSession`、`uploadImage` 與 bundled fallback。
- `src/lib/card-admin-api.ts`
  Apps Script Web App request/response envelope helper。這裡是 contract 的最小邊界。
- `src/lib/share.ts`
  LINE Flex payload 組裝、share intent URL、LIFF/web fallback share 流程。
- `src/lib/liff.ts`
  LIFF SDK 初始化、endpoint 驗證、login、permanent link、shareTargetPicker。
- `src/lib/runtime.ts`
  runtime URL、asset URL、action URL fallback。
- `src/lib/routes.ts`
  canonical slug、前台/admin path、LIFF/web share URL。
- `src/lib/card-field-registry.ts`
  admin 欄位 registry。定義每個 runtime key 在 admin 的分組、標籤、說明、可編輯性。
- `src/lib/card-style-registry.ts`
  集中管理 Flex 與 `/card/default/` 共用的 style key、預設值、作用範圍與 fallback token。
- `src/lib/card-validation.ts`
  admin save 前驗證規則。
- `src/content/cards/*`
  `CardConfig` 型別、schema、bundled default seed、draft clone/parse、前台 view-model、theme preset。
- `gas/bound-card-backend/Code.gs`
  正式 Apps Script backend。維持 spreadsheet schema、admin session、save/upload contract。
- `scripts/*`
  provision、health check、smoke/build 檢查。
- `src/test/*`
  以 Vitest 鎖住 app route、admin flow、share/Flex、runtime adapter、LIFF helper 與 runtime sheet 初始化行為。

## 2. 前台 `/card/default/` 資料來源與渲染流程

1. `src/App.tsx` 透過 `resolveAppRoute()` 判斷 route。
2. 前台 route 進入 `RuntimeCardRoute`，呼叫 `loadRuntimeCard(slug)`。
3. `src/lib/card-source.ts`
   - 先以 canonical slug 找 bundled card。
   - 嘗試用 `VITE_CARD_API_BASE_URL` 向 GAS `getCard` 取正式資料。
   - 遠端失敗時 fallback 回 bundled `defaultCard`。
4. `src/components/CardPage.tsx`
   - `applySeo(config)` 寫入 title/og metadata。
   - `initLiff()` 決定是否啟用 LIFF 能力。
   - `buildCardPageViewModel()` 把 `CardConfig` 映射成 UI view model。
   - 依 `modules.showHighlights/showSharePanel/showQrCode` 控制區塊。
   - 分享按鈕交給 `shareDigitalCard()`。

## 3. `admin/` unlock / load / save / upload 流程

### unlock

1. `AdminPage` 讀 `VITE_CARD_API_BASE_URL`。
2. `handleUnlock()` 呼叫 `createAdminSession(secret)`。
3. GAS `createAdminSession` 驗證 `ADMIN_WRITE_SECRET` 後回傳 `adminSession`、`expiresAt`。
4. 前端只把 session 存到 `sessionStorage`，不保留真正 secret。

### restore

1. `AdminPage` 初次掛載時從 `sessionStorage` 取 `adminSession`。
2. 呼叫 `verifyAdminSession()` 驗證是否仍有效。
3. 若有效且沒有本地 draft 衝突，就自動 `fetchRemoteCardConfig()` 載入正式資料。

### load

1. `loadRemoteIntoDraft()` 呼叫 `fetchRemoteCardConfig(draft.slug)`。
2. 回傳資料先過 `assertCardConfig()` 與 slug 檢查。
3. 成功後以 `applyOfficialConfig()` 取代本地 draft 與 baseline。

### save

1. `handleSaveRemote()` 先檢查 `adminSession` 與 `validateCardConfig()`。
2. 呼叫 `saveRemoteCardConfig(slug, draft, { adminSession, updatedBy })`。
3. GAS `saveCard` 寫入 spreadsheet 的 `config_json`，並回傳 `updatedAt`、`updatedBy`。
4. 前端把回傳 config 當成新的 baseline，dirty state 清空。

### upload

1. `handleAssetUpload()` 先用 `prepareImageUpload(file)` 壓縮並轉 base64。
2. 呼叫 `uploadRuntimeImage()`，contract 維持 `action/uploadImage/adminSession/slug/field/fileName/mimeType/base64Data`。
3. GAS 把圖片存到 Drive folder，回傳 `publicUrl/viewUrl/downloadUrl/fileId`。
4. 前端只把 `publicUrl` 回寫到 `photo.src` 或 `seo.ogImage` 草稿欄位。

## 4. LINE 分享 Flex 資料來源與組裝流程

來源檔案：`src/lib/share.ts`

- `buildFlexMessage(config, shareUrl, pageUrl)` 使用欄位：
  - `content.fullName`
  - `content.brandName`
  - `content.title`
  - `content.intro`
  - `photo.src`
  - `actions[0].label`
  - `actions[0].url`
  - `actions[1].label`
  - `actions[1].url`
  - `slug`，用來組第三顆 forward-share 按鈕
- hero image 使用 `toAssetUrl(config.photo.src)`
- footer 第一、二顆按鈕 URL 用 `resolveActionUrl(action.url, pageUrl)`
- footer 第三顆按鈕固定文案 `分享這張電子名片`，URL 來自 `buildFlexForwardShareUrl(config.slug)`

實際 share 流程：

1. `CardPage.handleShare()` 呼叫 `shareDigitalCard()`
2. 若在 LINE client 且 `shareTargetPicker` 可用：
   - `createPermanentLink(pageUrl)`
   - `shareCard([buildFlexMessage(...)])`
3. 若在 LINE client 但不能直接 share：
   - 轉到 `buildLiffShareIntentUrl(config.slug)`，進入 handoff flow
4. 若不在 LINE client：
   - 先試 `navigator.share`
   - 再 fallback 到 LINE 文字分享 URL
   - 最後 fallback 到 copy link

## 5. runtime config 主要欄位如何流向 UI / share

- `content.*`
  - `fullName/brandName/title` 同時進 web UI 與 Flex。
  - `headline/subheadline/highlights/actionsTitle/actionsDescription/sharePanelTitle` 只影響 web UI。
  - `intro` 同時進 web UI 與 Flex 內文。
- `photo.src`
  - 前台主視覺與 Flex hero 共用。
- `photo.alt`
  - 只影響 web `<img alt>` 與 admin preview。
- `photo.link`
  - 只影響 web 圖片點擊。
- `actions[0..1]`
  - label/url 同時進 web CTA 與 Flex footer。
  - tone/enabled 主要影響 web；Flex footer 樣式固定。
- `share.buttonLabel/title/text`
  - buttonLabel 影響 web 第三顆分享按鈕。
  - title/text 只影響 web share fallback。
- `seo.*`
  - 進 `applySeo()`，不進 Flex 畫面。
- `modules.*`
  - 只控制 web 區塊顯示。

## 6. 核心檔案責任

- `src/components/AdminPage.tsx`
  UI、local draft、session restore、remote load/save/upload orchestration。
- `src/components/admin-page-helpers.ts`
  AdminPage 純函式：draft 正規化、欄位錯誤、session label、upload 後 draft patch。
- `src/lib/card-source.ts`
  嚴格保留 GAS API contract 的資料存取層。
- `src/lib/card-admin-api.ts`
  POST header、GET URL、error envelope、config envelope 解析。
- `src/lib/share.ts`
  Flex payload 與 share fallback 順序。
- `src/lib/liff.ts`
  LIFF SDK 載入與 endpoint 邊界檢查。
- `src/content/cards/view-model.ts`
  CardConfig -> CardPageViewModel 純映射。
- `src/lib/card-actions.ts`
  前台前兩顆 CTA 與第三顆 share button 組裝。
- `gas/bound-card-backend/Code.gs`
  正式資料來源與唯一 save/upload contract 定義。

## 7. 哪些檔案可安全擴充，哪些不適合直接亂改

較適合擴充：

- `src/lib/card-field-registry.ts`
  新增 admin 欄位顯示規則時優先從這裡掛。
- `src/content/cards/view-model.ts`
  新增純 UI 映射可先放這層。
- `src/lib/card-actions.ts`
  若只整理前台按鈕 view model，可先在這層擴充。
- `src/components/admin-page-helpers.ts`
  AdminPage 純 helper 優先放這裡，不要持續把邏輯塞回主檔。

高風險，不適合直接亂改：

- `src/lib/share.ts`
  直接影響 LINE Flex payload、分享 fallback 與 LIFF handoff。
- `src/lib/card-source.ts`
  直接接正式 exec URL 與 GAS contract。
- `gas/bound-card-backend/Code.gs`
  直接決定正式 Spreadsheet schema、save/upload session contract。
- `src/components/CardPage.tsx`
  直接影響 `/card/default/` 實際畫面與 share 觸發時機。
- `src/components/AdminPage.tsx`
  雖可整理，但 unlock/save/upload/load 流程耦合度高，要用小步重構。

## 8. 目前程式碼風險點

- `AdminPage.tsx` 超過 1200 行，UI/render、remote flow、session、import/export、upload 混在同檔。
- `renderField()` 是大型 switch，後續加欄位很容易持續膨脹。
- `CardPage.tsx` 同時處理 LIFF bootstrap、自動 share handoff、QR code、頁面渲染，責任偏多。
- `share.ts` 的 share intent state 使用 URL + sessionStorage 雙軌維持，若後續新增分享模式容易互相污染。
- `card-source.ts` 的 remote adapter 與 error message 雖已集中，但 contract 依賴 GAS envelope，改動容錯時要非常保守。
- `card-field-registry.ts` 與 `AdminPage.renderField()` 分離，新增欄位時必須同步兩邊，否則 registry 會有欄位但畫面不會實際綁定。
- repo 有一些 scripts / GAS 相關未追蹤或已修改檔案，這輪未碰，以免和正式部署流程交叉污染。

## 9. 後續新增功能建議優先掛載位置

- 新增 admin 欄位：
  先加在 `src/lib/card-field-registry.ts`，再在 `AdminPage` 對應 group 裡補綁定邏輯。
- 新增純資料轉換：
  優先放 `src/content/cards/view-model.ts`、`src/lib/card-actions.ts`、`src/components/admin-page-helpers.ts`。
- 新增前台區塊：
  先看 `CardPage` 是否只是讀既有 `viewModel`。若是，優先從 `view-model.ts` 擴充。
- 新增 share fallback：
  優先集中在 `src/lib/share.ts`，不要散落到 `CardPage`。
- 新增後台 API：
  先在 `src/lib/card-admin-api.ts` 定義 envelope/request 型別，再由 `src/lib/card-source.ts` 封裝。
