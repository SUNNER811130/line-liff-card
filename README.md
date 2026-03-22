# line-liff-card

以 Vite、React、TypeScript 建立的 LINE 電子名片站。現在已升級成 Phase 2 架構：

- GitHub Pages 繼續提供前台卡片頁與 `/admin/`
- 正式內容可從遠端資料來源讀取
- `/admin/` 可載入 / 儲存正式 `CardConfig`
- 遠端失敗時安全 fallback 到 repo 內 bundled config

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
  - 顯示正式卡
- `/card/default/`
  - canonical 正式卡 route
- `/card/demo-consultant/`
  - legacy slug，相容入口；仍 canonicalize 到 `default`
- `/admin/`
  - 正式內容管理頁

## Current Content Model

正式資料仍以同一份 `CardConfig` 為核心，沒有重造第二套 CMS schema。

沿用的核心檔案：

- `src/content/cards/types.ts`
- `src/content/cards/schema.ts`
- `src/content/cards/view-model.ts`
- `src/lib/share.ts`

bundled fallback：

- `src/content/cards/default.ts`
- `src/content/cards/index.ts`

runtime adapter：

- `src/lib/card-source.ts`

## Remote Content Source

前台與分享流程現在會：

1. 先嘗試讀取 `VITE_CARD_API_BASE_URL` 指向的遠端正式資料
2. 遠端回傳後仍經 `assertCardConfig()` 驗證
3. 若遠端不可用或 JSON 不合法，fallback 到 bundled `defaultCard`

這代表：

- 正式卡頁顯示的新內容，會和分享時使用的 Flex 內容一致
- 不會出現「畫面是 remote，但分享還是 bundled」的分裂

## Admin

`/admin/` 現在分成兩層：

- 本地草稿
  - 自動存於 `localStorage`
  - 支援 JSON 匯入 / 匯出
  - 本機圖片選取只做預覽
- 正式後台資料
  - 透過 API Base URL + write token 讀寫遠端資料來源
  - 可載入正式資料覆蓋草稿
  - 可把目前草稿儲存成正式內容

目前 `/admin/` 可編輯：

- 姓名
- 品牌
- 職稱
- 主標 / 副標 / 介紹文字
- 前兩顆一般按鈕
- `photo.src`
- `seo.ogImage`

重要限制：

- GitHub Pages 仍不是可寫入後端
- 前端不會直接寫 repo
- 真正的 write secret 不會放在前端 env 或 repo

## Apps Script Backend

repo 內已提供可直接部署的 scaffold：

- [gas/card-admin-webapp/Code.gs](/home/usersun/projects/line-liff-card/gas/card-admin-webapp/Code.gs)
- [gas/card-admin-webapp/appsscript.json](/home/usersun/projects/line-liff-card/gas/card-admin-webapp/appsscript.json)
- [gas/card-admin-webapp/README.md](/home/usersun/projects/line-liff-card/gas/card-admin-webapp/README.md)

建議的正式資料儲存方式：

- Google Sheets 工作表：`cards_runtime`
- 欄位：
  - `slug`
  - `config_json`
  - `updated_at`
  - `updated_by`

## Env

建立 `.env.local` 或部署環境變數：

```bash
VITE_LIFF_ID=YOUR_LIFF_ID
VITE_SITE_URL=https://sunner811130.github.io/line-liff-card/
VITE_CARD_API_BASE_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

原則：

- `VITE_CARD_API_BASE_URL` 可以放公開 Web App URL
- 不要把真正 write token 放在前端 env
- write token 由 `/admin/` 使用者手動輸入，必要時只暫存到 `sessionStorage`

## Image Strategy

- `photo.src`
  - 控制正式卡頁主圖與 Flex hero image
- `seo.ogImage`
  - 控制頁面 OG image
- 本機選圖
  - 只更新 admin 預覽
  - 不代表已上傳
  - 若沒有獨立 upload backend，就不會假裝「已上傳成功」

## LIFF / Share Behavior

第三顆按鈕仍固定是系統分享按鈕，不屬於 `config.actions`。

分享流程仍維持：

1. `inClient && shareAvailable`
   - 直接送出 LINE Flex 電子名片
2. 在 LINE app 內但還不能直接分享
   - handoff 到 canonical LIFF share route
3. 不在 LINE app 內
   - fallback 到一般分享 / LINE 文字分享 / copy link

legacy slug `demo-consultant` 仍會 canonicalize 成 `default`，這條規則沒有被改掉。

## Setup Docs

- [docs/REAL_ADMIN_SETUP.md](/home/usersun/projects/line-liff-card/docs/REAL_ADMIN_SETUP.md)
- [docs/architecture-overview.md](/home/usersun/projects/line-liff-card/docs/architecture-overview.md)
- [docs/admin-mvp.md](/home/usersun/projects/line-liff-card/docs/admin-mvp.md)
- [docs/admin-roadmap.md](/home/usersun/projects/line-liff-card/docs/admin-roadmap.md)

## Verify

部署後至少確認：

1. `/`
2. `/card/default/`
3. `/card/demo-consultant/`
4. `/admin/`

以及：

1. `/admin/` 能載入正式資料
2. `/admin/` 能儲存正式資料
3. 正式卡頁更新後會顯示 remote 新內容
4. 在 LINE app 內分享時，Flex 文字與 hero image 會跟著 remote 最新內容
5. 遠端關閉或回傳壞 JSON 時，前台仍 fallback 到 bundled config
