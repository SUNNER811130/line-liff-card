# Real Admin Setup

這份文件說明如何把 `/admin/` 接到真正可寫入的正式資料來源，並盡量用 repo 內 CLI 自動完成部署。

## 架構摘要

- GitHub Pages
  - 提供前台卡頁與 `/admin/`
- Apps Script Web App
  - 提供 `getCard` / `saveCard` API
- Google Sheets
  - 儲存整份 `CardConfig JSON`

## 為什麼 GitHub Pages 不能直接當真正後台

- GitHub Pages 是靜態託管，不能安全接收 `/admin/` 的正式寫入
- 前端不能持有真正 write secret
- 前端不能直接修改 repo 或 Google Sheet

所以 `/admin/` 只能當管理介面；真正的寫入端必須交給後端中介層。

## 為什麼要用 Google Sheets + Apps Script

- Google Sheets 很適合目前單卡 `CardConfig JSON` 的營運資料
- Apps Script Web App 可直接用 Google 帳號授權
- 可用 Script Properties 保存 `SHEET_ID` / `WRITE_TOKEN`
- 對目前規模比自建 DB / API 更省

## 1. 你本人需要先完成的 Google 端授權

以下步驟目前不能由 repo 假裝自動完成：

1. 安裝 `clasp`
2. `clasp login`
3. 第一次 Google OAuth 授權
4. 必要時啟用 Apps Script API / Execution API
5. 第一次確認 Web App 權限

## 2. 建立 Google Sheet

建立一份 Google Sheet，新增工作表 `cards_runtime`，首列欄位：

```text
slug | config_json | updated_at | updated_by
```

Google Sheet 建好後，保留 `SHEET_ID`。

## 3. 設定本機環境變數

```bash
export CARD_RUNTIME_SHEET_ID=你的GoogleSheetID
export CARD_RUNTIME_SHEET_NAME=cards_runtime
export CARD_ADMIN_WRITE_TOKEN=自行產生的長隨機字串
```

原則：

- 真正 write token 只放 Script Properties
- 不放進前端 repo
- 不放進前端 env

## 4. 用 CLI 建立或連接 Apps Script 專案

### 若你還沒有 Apps Script 專案

```bash
npm run gas:setup
```

這會：

1. 檢查 `clasp`
2. 檢查 `clasp login`
3. 建立 `.clasp.json`
4. 把 `gas/card-admin-webapp` 當成 `rootDir`

### 若你已有 Apps Script 專案

把 script id 放進：

- [/.clasp.json.template](/home/usersun/projects/line-liff-card/.clasp.json.template)

或直接：

```bash
export GAS_SCRIPT_ID=你的AppsScriptId
npm run gas:setup
```

## 5. 自動 push / 設定 Script Properties / deploy Web App

```bash
npm run gas:deploy
```

這支腳本會盡量自動完成：

1. `clasp push`
2. `clasp run setupScriptProperties`
3. `clasp version`
4. `clasp deploy`
5. `initBackend`
6. backend check

若失敗，常見原因通常不是 repo 問題，而是你還沒在 Google 端完成授權或 API 啟用。

## 6. 設定前端

正式環境可設定：

```bash
VITE_CARD_API_BASE_URL=https://script.google.com/macros/s/AKfycbzFTQfZpsTiVhZOxi9v0yuYnJYfYj4orOfYqc5lQF65HCVvhkEW4axnvdmZlUP6rYhnTA/exec
```

或直接在 `/admin/` 的 `API Base URL` 欄位輸入。

repo 也提供：

```bash
./scripts/print-admin-env.sh DEPLOYMENT_ID
```

用來印出可貼進 `.env.local` / CI secrets 的內容。

目前 repo 內 `.env.local` / `.env.production` 已都寫成上面這個正式 exec URL。

## 7. 使用 `/admin/`

### 載入正式資料

按 `載入正式資料`：

- 會呼叫 `getCard`
- 抓 `default` 的正式 JSON
- 經 `assertCardConfig()` 驗證
- 載入到目前草稿與預覽
- 若 backend 失敗，`/admin/` 會直接顯示錯誤，不會偷偷把 bundled 當成正式資料

### 儲存正式資料

按 `儲存到正式後台`：

- 需要 `API Base URL`
- 需要 `write token`
- 會把目前草稿整份 `CardConfig` 送去 `saveCard`
- 成功後正式卡頁與後續分享 Flex 會改用新內容
- 若 backend 仍無法存取 runtime sheet，save 會直接失敗，前台也仍只會 fallback bundled config

`/admin/` 現在也會顯示：

- API URL 狀態
- token 是否已輸入
- token 是否只暫存在 sessionStorage
- local draft 與 remote save 是不同層

## 8. 圖片規則

- `正式圖片 URL`
  - 控制卡頁主圖與 Flex hero image
- `OG Image URL`
  - 控制 OG image
- 本機選圖
  - 只做 preview
  - 不代表已上傳

## 9. 前台怎麼吃 remote config

前台卡頁現在流程：

1. 先打 Apps Script `getCard`
2. 驗證回來的 `CardConfig`
3. 成功就用 remote
4. 失敗就 fallback bundled `defaultCard`

分享流程也直接吃同一份 runtime config，所以：

- 畫面上的新文字會跟 Flex 內文一致
- 新 hero image URL 會一起反映到分享出去的 Flex
- 後續新分享出去的 Flex 會自動跟著最新 runtime config

這表示只要 remote backend 真的通了：

- `CardPage` 會使用 runtime config
- `shareDigitalCard()` / `buildFlexMessage()` 也會使用同一份 runtime config
- `/admin/` save 後重新載入時，理論上應可看到正式資料變更

## 10. 完整執行順序

```bash
npm run test
npm run build
npm run lint
npm run gas:login
export CARD_RUNTIME_SHEET_ID=...
export CARD_RUNTIME_SHEET_NAME=cards_runtime
export CARD_ADMIN_WRITE_TOKEN=...
npm run gas:setup
npm run gas:deploy
./scripts/check-runtime-backend.sh https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

然後：

1. 把 `VITE_CARD_API_BASE_URL` 放到前端正式環境
2. 重新部署 GitHub Pages
3. 開 `/admin/`
4. 用 `載入正式資料` 確認讀到正式資料
5. 修改文字或圖片 URL
6. 按 `儲存到正式後台`
7. 回正式卡頁與 LINE 分享流程驗證結果

## 11. 常見錯誤排查

- `clasp is not logged in`
  - 先跑 `npm run gas:login`
- `Failed to run setupScriptProperties`
  - 通常是 Apps Script API / Execution API 未啟用，或你還沒完成 Google 授權
- `Invalid write token`
  - `/admin/` 輸入的 token 和 Script Properties 不一致
- `Sheet header mismatch`
  - `cards_runtime` 首列欄位不是 `slug | config_json | updated_at | updated_by`
- `Card not found`
  - 先跑 `initBackend` 或 `./scripts/init-runtime-sheet.mjs`
- `/admin/` 載入失敗但正式卡頁仍正常
  - 代表前台 fallback 到 bundled config，後端本身仍要另外修
- 圖片改了但沒正式生效
  - 本機選圖只做 preview；要改正式效果，必須填可公開存取的圖片 URL
- 新分享出去的 Flex 沒更新
  - 通常代表你尚未成功儲存 remote config，或分享時還在吃舊的正式資料來源

repo 現在已提供 scaffold、前端 adapter、CLI 與文件，但不會假裝已自動替你完成 Google 端授權或已成功部署。

## 12. 2026-03-22 正式狀態

- 正式 standalone GAS `scriptId`
  - `1e2pcZd8c56D03YSYw6JhSSDlKMZzn_ALnTToF0SupNqFE8oVKtWkvwHG`
- 正式 Web App exec URL
  - `https://script.google.com/macros/s/AKfycbzFTQfZpsTiVhZOxi9v0yuYnJYfYj4orOfYqc5lQF65HCVvhkEW4axnvdmZlUP6rYhnTA/exec`
- 正式 runtime sheet
  - `SHEET_ID=1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
  - `SHEET_NAME=cards_runtime`
- shell env 目前也已對齊同一組正式資料：
  - `CARD_RUNTIME_SHEET_ID=1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
  - `CARD_RUNTIME_SHEET_NAME=cards_runtime`
  - `CARD_ADMIN_WRITE_TOKEN` 已存在
- manifest 最小必要 scopes
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/drive.readonly`
- user 已在正確正式 GAS 內手動完成 `debugOpenSheet()` 授權，且已手動更新 Web App deployment
- 但 2026-03-22 重新驗證 live backend，結果仍是：
  - `GET /exec?action=health`
    - `ok: false`
    - `sheetAccessible: false`
    - `error: Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
  - `GET /exec?action=getCard&slug=default`
    - `Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`
  - `POST initBackend`
    - `Illegal spreadsheet id or key: 1evhAzJ3lmip0Aaiy5d0pd8pXc9-uP2zsDqOqBPq5Flg`

因此這份文件的結論是：

- 不要再建立新的 GAS 專案
- 不要切到 Sheet bound script
- 目前唯一正式後端仍是 `.clasp.json` 綁定的這支 standalone GAS
- 目前唯一正式資料來源目標仍是 `LIFF Card Runtime / cards_runtime`
- repo 端的前台、`/admin/`、share/Flex wiring 已完成
- 但在 `health` 轉綠之前，`/admin/` 真實 load/save、front page remote config、與新分享出去的 Flex live 驗證都還不能算打通
