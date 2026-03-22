# line-liff-card

這個 repo 現在以單一正式架構為準：

- 單一 Google Spreadsheet
- 單一 bound Apps Script
- 單一 Web App exec URL
- 單一 `cards_runtime` runtime config

前台 `/card/default/`、`/admin/`、LINE 分享 Flex 全部吃同一份 `CardConfig`。

## Frontend

- Vite + React + TypeScript
- GitHub Pages 提供靜態前台與 `/admin/`
- 正式資料從 `VITE_CARD_API_BASE_URL` 指向的 bound Apps Script Web App 讀取
- 遠端失敗時 fallback 到 bundled `defaultCard`

## Backend

新的正式後端檔案在：

- [`gas/bound-card-backend/Code.gs`](/home/usersun/projects/line-liff-card/gas/bound-card-backend/Code.gs)
- [`gas/bound-card-backend/appsscript.json`](/home/usersun/projects/line-liff-card/gas/bound-card-backend/appsscript.json)
- [`gas/bound-card-backend/README.md`](/home/usersun/projects/line-liff-card/gas/bound-card-backend/README.md)

這份後端只支援：

- `health`
- `getCard`
- `saveCard`
- `createAdminSession`
- `verifyAdminSession`
- `uploadImage`

## Runtime Sheet

正式 Spreadsheet 只需要一個工作表：

```text
cards_runtime
```

表頭固定：

```text
slug | config_json | updated_at | updated_by
```

## Admin Flow

`/admin/` 現在是正式 CMS，不再保留手動輸入 exec URL 的正式操作路徑。

- 先用 `ADMIN_WRITE_SECRET` 解鎖一次
- GAS 回傳短期 `adminSession`
- session 只存在 `sessionStorage`
- 關閉分頁後失效
- 圖片透過 Google Drive folder upload

## Scripts

- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run lint`
- `npm run smoke:pages`
- `npm run gas:setup`
  - 輸出 bound Apps Script 檔案與 Script Properties 提示
- `npm run gas:deploy`
  - 輸出部署後檢查方式
- `npm run gas:check -- https://script.google.com/macros/s/DEPLOYMENT_ID/exec`
  - 驗證 `health` 與 `getCard`

## Required Env

```bash
VITE_LIFF_ID=YOUR_LIFF_ID
VITE_SITE_URL=https://sunner811130.github.io/line-liff-card/
VITE_CARD_API_BASE_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

## Manual Steps Left

1. 建立新的正式 Spreadsheet
2. 在該 Spreadsheet 內開啟 bound Apps Script
3. 建立或指定一個 Drive upload folder
4. 貼入 `gas/bound-card-backend` 的檔案
5. 補 Script Properties
6. 部署 Web App
7. 將正式 `/exec` URL 填入 `VITE_CARD_API_BASE_URL`
