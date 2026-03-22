# Real Admin Setup

這份文件說明如何把 `/admin/` 接到真正可寫入的正式資料來源。

## 架構摘要

- GitHub Pages
  - 提供前台卡頁與 `/admin/`
- Apps Script Web App
  - 提供 `getCard` / `saveCard` API
- Google Sheets
  - 儲存整份 `CardConfig JSON`

## 1. 建立 Google Sheet

建立一份 Google Sheet，新增工作表 `cards_runtime`，首列欄位：

```text
slug | config_json | updated_at | updated_by
```

先放一列正式資料：

- `slug`: `default`
- `config_json`: 目前 bundled `defaultCard` 的整份 JSON

## 2. 建立 Apps Script 專案

把以下檔案內容貼到 Apps Script：

- [gas/card-admin-webapp/Code.gs](/home/usersun/projects/line-liff-card/gas/card-admin-webapp/Code.gs)
- [gas/card-admin-webapp/appsscript.json](/home/usersun/projects/line-liff-card/gas/card-admin-webapp/appsscript.json)

## 3. 設定 Script Properties

在 Apps Script 專案中設定：

```text
CARD_RUNTIME_SHEET_ID=你的 Sheet ID
CARD_RUNTIME_SHEET_NAME=cards_runtime
CARD_ADMIN_WRITE_TOKEN=自行產生的長隨機字串
```

原則：

- 真正 write token 只放 Script Properties
- 不放進前端 repo
- 不放進前端 env

## 4. 部署 Web App

1. `Deploy -> New deployment`
2. Type 選 `Web app`
3. `Execute as`: `Me`
4. `Who has access`: `Anyone`
5. 複製 `/exec` URL

## 5. 設定前端

正式環境可設定：

```bash
VITE_CARD_API_BASE_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

或直接在 `/admin/` 的 `API Base URL` 欄位輸入。

## 6. 使用 `/admin/`

### 載入正式資料

按 `載入正式資料`：

- 會呼叫 `getCard`
- 抓 `default` 的正式 JSON
- 經 `assertCardConfig()` 驗證
- 載入到目前草稿與預覽

### 儲存正式資料

按 `儲存到正式後台`：

- 需要 `API Base URL`
- 需要 `write token`
- 會把目前草稿整份 `CardConfig` 送去 `saveCard`
- 成功後正式卡頁與後續分享 Flex 會改用新內容

## 7. 圖片規則

- `正式圖片 URL`
  - 控制卡頁主圖與 Flex hero image
- `OG Image URL`
  - 控制 OG image
- 本機選圖
  - 只做 preview
  - 不代表已上傳

## 8. 前台怎麼吃 remote config

前台卡頁現在流程：

1. 先打 Apps Script `getCard`
2. 驗證回來的 `CardConfig`
3. 成功就用 remote
4. 失敗就 fallback bundled `defaultCard`

分享流程也直接吃同一份 runtime config，所以：

- 畫面上的新文字會跟 Flex 內文一致
- 新 hero image URL 會一起反映到分享出去的 Flex

## 9. 仍需人工完成的事

- Google Sheet 建立與初始化資料
- Apps Script 專案建立
- Script Properties 設定
- Web App 部署
- 正式環境 env 設定

repo 只提供 scaffold、前端 adapter 與文件，不會假裝已自動替你完成 Google 端部署。
