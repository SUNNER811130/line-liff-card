# Admin MVP

## 正式入口

- GitHub Pages: `https://sunner811130.github.io/line-liff-card/admin/`
- 本機開發: `/admin/`

這次已補上實體 `admin/index.html`，不只依賴 SPA route restore；因此在 GitHub Pages 直接開 `/admin/` 的風險比之前低。

## 這版後台能做什麼

- 編輯電子名片主要內容
- 編輯前兩顆一般按鈕
- 保留第三顆固定分享按鈕規則
- 即時預覽正式卡版型
- 匯入 / 匯出 JSON
- 下載 JSON
- 讀取本機圖片做前端預覽
- 重設回預設卡內容
- 將草稿暫存到 `localStorage`

## 分享測試規則

- admin 預覽中的第三顆按鈕仍保留正式規則
- 但 admin 預覽不會真的送出分享
- 正式站第三顆按鈕才會：
  - 優先嘗試 LINE Flex 電子名片
  - 必要時 handoff 到 LIFF 再自動分享
  - 最後才退回一般網址分享 fallback

## 這版後台不能做什麼

- 不能直接寫回 GitHub repo
- 不能直接更新 GitHub Pages 已部署內容
- 不能遠端持久化存檔
- 不能多人共用同一份資料
- 不能做權限管理、審核、版本歷史
- 不能把圖片上傳到正式儲存空間

## 為什麼 GitHub Pages 下不能直接當真正 CMS

GitHub Pages 是靜態檔案託管。瀏覽器中的前端程式：

- 沒有安全的 repo 寫入權限
- 不能直接修改已部署的原始碼
- 不能安全持有 GitHub token 或其他敏感憑證

所以目前只能做本地編輯、預覽、匯出 / 匯入，不適合包裝成真正的線上 CMS。

## 後續升級方向

1. 保留 `CardConfig schema` 與目前 view-model 結構。
2. 抽出正式資料來源 adapter。
3. 將 admin 匯出的 JSON 接到正式資料來源流程。
4. 若要真正寫回，新增 Apps Script / API / CMS 後端，由後端持有 credentials。
