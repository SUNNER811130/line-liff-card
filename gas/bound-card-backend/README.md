# Bound Card Backend

這是新的正式後端版本，前提是：

- 一張正式 Google Spreadsheet
- 同一張表內的 bound Apps Script
- 同一個 Web App `/exec` URL
- 同一份 `cards_runtime` runtime config

不要再建立 standalone GAS，也不要再接 Cloudinary。

## 會用到的 Spreadsheet

在正式 Spreadsheet 內保留一個工作表：

```text
cards_runtime
```

表頭固定為：

```text
slug | config_json | updated_at | updated_by
```

正式資料只需要一列：

```text
slug = default
```

## Script Properties

在 bound Apps Script 內設定：

```text
ADMIN_WRITE_SECRET=管理員解鎖密碼
ADMIN_SESSION_SECRET=另一組長隨機字串
ADMIN_SESSION_TTL_SECONDS=3600
DRIVE_UPLOAD_FOLDER_ID=Google Drive folder id
```

## 支援 action

- `GET ?action=health`
- `GET ?action=getCard&slug=default`
- `POST { action: "createAdminSession", secret }`
- `POST { action: "verifyAdminSession", adminSession }`
- `POST { action: "saveCard", slug, adminSession, updatedBy, config }`
- `POST { action: "uploadImage", slug, field, adminSession, fileName, mimeType, base64Data }`

`field` 目前支援：

- `photo`
- `ogImage`

## 圖片流程

1. 前端先將圖片壓縮到合理尺寸
2. 前端送 `base64Data` 到 `uploadImage`
3. GAS 驗證 `adminSession`
4. GAS 寫入指定 Drive folder
5. GAS 將檔案分享為 `Anyone with the link`
6. 回傳 `fileId`、`publicUrl`、`viewUrl`、`downloadUrl`
7. 前端將 `publicUrl` 寫回同一份 runtime config

## Bound Apps Script 貼檔方式

1. 在正式 Spreadsheet 開啟「擴充功能 -> Apps Script」
2. 用這個目錄的 [`Code.gs`](/home/usersun/projects/line-liff-card/gas/bound-card-backend/Code.gs) 覆蓋預設 `Code.gs`
3. 用這個目錄的 [`appsscript.json`](/home/usersun/projects/line-liff-card/gas/bound-card-backend/appsscript.json) 覆蓋 manifest
4. 設定 Script Properties
5. 部署為 Web App

## 驗證

部署後可用：

- `npm run gas:check -- https://script.google.com/macros/s/DEPLOYMENT_ID/exec`

或直接打：

- `GET /exec?action=health`
- `GET /exec?action=getCard&slug=default`
