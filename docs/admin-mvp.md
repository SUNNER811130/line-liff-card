# Admin Phase 2

`/admin/` 已不再只是「本地編輯器 + 預覽器」。

現在它同時包含兩層：

## 1. 本地草稿層

- 自動存到 `localStorage`
- 可匯入 / 匯出 JSON
- 可用本機圖片做預覽
- 允許暫時不合法的欄位內容，錯誤會顯示在 validator 區，而不是直接崩潰

## 2. 正式後台層

- 透過 `VITE_CARD_API_BASE_URL` 或手動輸入 API Base URL
- `載入正式資料`：從遠端資料來源抓正式 `CardConfig`
- `儲存到正式後台`：把目前草稿寫回遠端正式資料來源
- write token 由使用者手動輸入
- 若需要，只暫存到 `sessionStorage`

## 目前可編輯欄位

- 姓名
- 品牌名稱
- 職稱
- 主標
- 副標
- 介紹文字
- 前兩顆一般按鈕
- `photo.src`
- `seo.ogImage`

## 圖片規則

- 本機選圖只更新 preview
- 沒有正式 upload backend 時，不會假裝圖片已上傳
- 正式頁與 Flex hero image 最終仍以 URL 欄位為準

## 預覽規則

- admin preview 與正式卡頁共用同一套 `CardPage` / `view-model`
- 第三顆分享按鈕規則仍保留
- preview mode 不會真的送出分享

## 現在不能做的事

- 不能直接寫 GitHub repo
- 不能讓前端持有真正 secret
- 不能自動完成 Google 端部署

## 相關檔案

- [src/components/AdminPage.tsx](/home/usersun/projects/line-liff-card/src/components/AdminPage.tsx)
- [src/lib/card-source.ts](/home/usersun/projects/line-liff-card/src/lib/card-source.ts)
- [docs/REAL_ADMIN_SETUP.md](/home/usersun/projects/line-liff-card/docs/REAL_ADMIN_SETUP.md)
