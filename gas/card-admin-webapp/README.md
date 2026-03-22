# Apps Script Card Admin Web App

這個 scaffold 提供 `line-liff-card` 正式後台需要的可部署 backend：

- `GET ?action=getCard&slug=default`
- `GET ?action=health`
- `POST { action: "saveCard", slug, config, writeToken, updatedBy }`
- `POST { action: "initBackend", writeToken, config, slug, force, seedDefault }`
- Google Sheets 儲存整份 `CardConfig JSON`
- Script Properties 管理 sheet id / sheet name / write token
- `setupScriptProperties()` 可配合 `clasp run` 自動設定 Script Properties
- `initBackend()` 可自動補齊表頭並在缺資料時寫入 bundled `default` 記錄

## 需要的 Google Sheet

建立一份 Google Sheet，工作表名稱建議使用 `cards_runtime`，首列欄位固定為：

```text
slug | config_json | updated_at | updated_by
```

如果工作表是空白，這份腳本第一次執行時會自動補齊表頭。

## Script Properties

在 Apps Script 專案中設定以下 Script Properties：

```text
CARD_RUNTIME_SHEET_ID=你的 Google Sheet ID
CARD_RUNTIME_SHEET_NAME=cards_runtime
CARD_ADMIN_WRITE_TOKEN=自行產生的長隨機字串
```

`CARD_RUNTIME_SHEET_NAME` 可省略，預設就是 `cards_runtime`。

## Repo 內自動化腳本

- [scripts/setup-gas.sh](/home/usersun/projects/line-liff-card/scripts/setup-gas.sh)
  - 檢查 `clasp`
  - 檢查 `clasp login`
  - 建立或連接 `.clasp.json`
- [scripts/deploy-gas.sh](/home/usersun/projects/line-liff-card/scripts/deploy-gas.sh)
  - `clasp push`
  - `clasp run setupScriptProperties`
  - `clasp version`
  - `clasp deploy`
  - `initBackend`
  - backend health check
- [scripts/init-runtime-sheet.mjs](/home/usersun/projects/line-liff-card/scripts/init-runtime-sheet.mjs)
  - 對 Web App 送 `initBackend`
- [scripts/check-runtime-backend.sh](/home/usersun/projects/line-liff-card/scripts/check-runtime-backend.sh)
  - 驗證 `health`
  - 驗證 `getCard`
  - 若有 token，再驗證 `initBackend` POST

## 部署步驟

1. 在 Google Drive 建立 Google Sheet。
2. 開一個新的 Apps Script 專案。
3. 將 `Code.gs` 與 `appsscript.json` 貼進去。
4. 先執行 [scripts/setup-gas.sh](/home/usersun/projects/line-liff-card/scripts/setup-gas.sh) 建立 `.clasp.json`。
5. 匯出：
   - `CARD_RUNTIME_SHEET_ID`
   - `CARD_RUNTIME_SHEET_NAME`
   - `CARD_ADMIN_WRITE_TOKEN` 或 `ADMIN_WRITE_SECRET`
   - `ADMIN_SESSION_SECRET`
   - `ADMIN_SESSION_TTL_SECONDS`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `CLOUDINARY_UPLOAD_FOLDER`
6. 執行 [scripts/deploy-gas.sh](/home/usersun/projects/line-liff-card/scripts/deploy-gas.sh)。
7. 若 `clasp run setupScriptProperties` 或 Web App 部署失敗，通常代表仍需你本人完成 Google 授權、Apps Script API / Execution API 啟用，或第一次在 Google 介面中確認權限。
8. 複製部署後的 `/exec` URL，填到前端 `VITE_CARD_API_BASE_URL` 或 `/admin/` 的 API Base URL 欄位。

## 初始化正式卡資料

現在可用 [scripts/init-runtime-sheet.mjs](/home/usersun/projects/line-liff-card/scripts/init-runtime-sheet.mjs) 或 `initBackend()`：

- 首次建立表頭
- 若 `default` 不存在，寫入 bundled default config
- 若已有正式資料，預設不覆蓋
- 只有加 `force=true` 才會覆蓋既有 `default`

## 前端設定

- `VITE_CARD_API_BASE_URL`
  - 可填 Apps Script Web App `/exec` URL
- `/admin/` 解鎖 secret
  - 不要放在前端 env
  - 由 admin 使用者在解鎖 panel 輸入
  - 前端只保留短期 `adminSession` 到 `sessionStorage`
- Cloudinary secret
  - 只放在 Script Properties
  - 前端只向 GAS 要 signed upload 所需簽章

## API 範例

### GET health

```text
GET https://script.google.com/macros/s/DEPLOYMENT_ID/exec?action=health
```

### GET card

```text
GET https://script.google.com/macros/s/DEPLOYMENT_ID/exec?action=getCard&slug=default
```

成功回應：

```json
{
  "ok": true,
  "slug": "default",
  "config": {
    "slug": "default"
  },
  "updatedAt": "2026-03-22T10:00:00.000Z",
  "updatedBy": "admin@sunner.tw",
  "source": "google-sheets"
}
```

### POST

```json
{
  "action": "saveCard",
  "slug": "default",
  "writeToken": "YOUR_WRITE_TOKEN",
  "updatedBy": "admin@sunner.tw",
  "config": {
    "...": "整份 CardConfig"
  }
}
```

### POST createAdminSession

```json
{
  "action": "createAdminSession",
  "secret": "YOUR_ADMIN_SECRET"
}
```

### POST verifyAdminSession

```json
{
  "action": "verifyAdminSession",
  "adminSession": "SIGNED_SESSION_TOKEN"
}
```

### POST signUpload

```json
{
  "action": "signUpload",
  "adminSession": "SIGNED_SESSION_TOKEN",
  "slug": "default",
  "field": "photo",
  "fileName": "hero.png"
}
```

### POST initBackend

```json
{
  "action": "initBackend",
  "slug": "default",
  "writeToken": "YOUR_WRITE_TOKEN",
  "updatedBy": "deploy-gas.sh",
  "seedDefault": true,
  "force": false,
  "config": {
    "...": "整份 CardConfig"
  }
}
```

## 安全原則

- 真正的 write secret 只放在 Script Properties
- `saveCard` 可接受 `adminSession`；舊 `writeToken` 只保留相容用途
- Cloudinary API secret 只放在 Script Properties
- 前端 repo 不存真正 token
- 後端會再驗證 `config` 基本 shape，不信任前端直接送入的 JSON
- 正式頁即使遠端失敗，前端仍會 fallback 到 bundled `defaultCard`

## 仍需人工完成的事

- 建立 Google Sheet
- 第一次 `clasp login`
- 第一次 Google OAuth 授權
- 必要時啟用 Apps Script API / Execution API
- 第一次在 Google 端確認 Web App 權限
- 把 `/exec` URL 填入正式環境或 admin 頁面

repo 內現在提供可直接推上去的 scaffold 與 CLI，但不會假裝已替你完成 Google 端授權或部署成功。
