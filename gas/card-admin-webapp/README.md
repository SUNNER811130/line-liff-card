# Apps Script Card Admin Web App

這個 scaffold 提供 `line-liff-card` Phase 2 正式後台需要的最小可用 backend：

- `GET ?action=getCard&slug=default`
- `POST { action: "saveCard", slug, config, writeToken, updatedBy }`
- Google Sheets 儲存整份 `CardConfig JSON`
- Script Properties 管理 sheet id / sheet name / write token

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

## 部署步驟

1. 在 Google Drive 建立 Google Sheet。
2. 開一個新的 Apps Script 專案。
3. 將 `Code.gs` 與 `appsscript.json` 貼進去。
4. 到 `Project Settings -> Script Properties` 設定上述三個值。
5. 執行一次 `doGet` 或手動跑任一函式，完成授權。
6. `Deploy -> New deployment -> Web app`
7. `Execute as`: `Me`
8. `Who has access`: `Anyone`
9. 複製部署後的 `/exec` URL，填到前端 `VITE_CARD_API_BASE_URL` 或 `/admin/` 的 API Base URL 欄位。

## 初始化正式卡資料

建議先把目前 repo 的 bundled `defaultCard` JSON 貼進 `config_json`，並將 `slug` 填 `default`。

之後 `/admin/` 便可：

- `載入正式資料`：讀這列 JSON
- `儲存到正式後台`：覆蓋同一列 JSON，並更新 `updated_at` / `updated_by`

## 前端設定

- `VITE_CARD_API_BASE_URL`
  - 可填 Apps Script Web App `/exec` URL
- `write token`
  - 不要放在前端 env
  - 由 admin 使用者手動輸入
  - 若需要，只暫存到 `sessionStorage`

## API 範例

### GET

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

## 安全原則

- 真正的 write secret 只放在 Script Properties
- 前端 repo 不存真正 token
- 後端會再驗證 `config` 基本 shape，不信任前端直接送入的 JSON
- 正式頁即使遠端失敗，前端仍會 fallback 到 bundled `defaultCard`

## 仍需人工完成的事

- 建立 Google Sheet
- 建立 Apps Script 專案
- 設 Script Properties
- 手動部署 Web App
- 把 `/exec` URL 填入正式環境或 admin 頁面

repo 內只提供可直接貼上部署的 scaffold，不會假裝已替你完成 Google 端部署。
