# Admin MVP

## 這版後台能做什麼

- 透過 `/admin/` 編輯電子名片主要內容
- 即時預覽正式名片版型
- 編輯姓名、職稱、品牌、主標、副標、介紹文字
- 編輯一般按鈕文案、連結與是否顯示
- 調整模組顯示，例如專業簡介、分享說明、QR Code
- 選擇主題與版型預留欄位
- 輸入圖片網址
- 讀取本機圖片做前端預覽
- 匯出目前設定成 JSON
- 匯入 JSON 回填並套用
- 重設回預設卡片內容
- 將草稿暫存到 `localStorage`

## 這版後台不能做什麼

- 不能直接寫回 GitHub repo 檔案
- 不能直接更新 GitHub Pages 已部署內容
- 不能多人共用同一份資料
- 不能做權限管理、登入、審核、版本歷史
- 不能上傳圖片到正式儲存空間
- 不能提供真正的後台持久化存檔

## 為什麼 GitHub Pages 下不能直接當真正 CMS

GitHub Pages 本質上是靜態檔案託管。前端在瀏覽器中執行時：

- 沒有安全的 repo 寫入權限
- 不能直接修改部署中的原始碼檔案
- 即使可以呼叫 GitHub API，也需要敏感憑證，不能安全放在純前端靜態站
- 因此只能做到「本地編輯、預覽、匯出設定」，不能做真正的線上持久化 CMS

這也是本版採用「可編輯管理頁 + 即時預覽 + JSON 匯出/匯入」模式的原因。

## 下一步如何升級為 Google Sheets 後台版

建議升級路徑：

1. 保留目前共用的 `CardConfig schema`
2. 新增一個讀寫 adapter，例如 `src/lib/card-source/`
3. 將目前 `default.ts` 視為 local source
4. 新增 Google Sheets source，負責：
   - 讀取 sheet 資料
   - 轉成 `CardConfig`
   - 經過既有 schema guard 驗證
5. 若要從 admin 寫回：
   - 建立 Apps Script 或自建 API
   - 由後端持有 credentials
   - 前端只呼叫安全 API，不直接接觸敏感金鑰
6. 前台讀取端可逐步改成：
   - local config
   - Sheets API
   - Git-based CMS
   - 自建資料庫 API

目前這版已經先把：

- schema
- 驗證
- view model
- 前後台共用卡片規則

整理完成，後續可直接往真正的資料來源 adapter 延伸。
