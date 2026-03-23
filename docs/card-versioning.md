# Card Versioning

## 使用者如何理解版本

- 後台只有一份「編輯中名片」。
- 每次按下「儲存正式名片」，系統都會先保存這份編輯中內容，再另外建立一份不可變更的「正式版本」。
- 正式版本會得到自己的固定網頁 permalink 與固定 LIFF permalink。
- 舊的正式版本會留在歷史版本列表中，之後仍可分享，不會被新版覆蓋。

## 系統內部怎麼實作

- internal working draft 仍然使用 `slug=default`。
- 每次儲存正式名片時，前端會呼叫既有的 `publishSnapshot` contract。
- GAS 會先把最新編輯內容寫回 `default` row，再複製出一筆 immutable version row。
- 這個 immutable row 目前仍沿用既有 snapshot slug 規則，例如 `default-v-20260322t100000z`。
- `default` 與 immutable rows 仍共用同一張 `cards_runtime` sheet，不需要搬資料。

## 最新正式版本與歷史版本

- 最新正式版本：所有 immutable versions 中，`publishedAt` 最新的一筆。
- 歷史版本：所有較早建立的 immutable versions。
- 最新正式版本會直接顯示在 `/admin/` 的狀態區與主要操作區。
- 歷史版本列表會提供複製 LIFF、複製網頁、直接分享、載入到編輯區等操作。

## 為什麼每次儲存正式名片都會產生新固定連結

- 因為每次正式儲存都會建立新的 immutable row。
- 新 row 有自己的 `slug`、`versionId`、`publishedAt`。
- 網頁 permalink 與 LIFF permalink 都是以該版本 slug 為核心建立。
- 所以第二次、第三次儲存正式名片時，都會得到新的固定連結。

## 為什麼舊連結不會消失

- 舊版本不是被覆寫，而是保留原本那一筆 immutable row。
- 舊連結仍會指向原本的版本 slug。
- 後續更新只會改 `default` 與建立新的 immutable row，不會回寫舊版本。
- GAS 仍會拒絕對 immutable version row 直接執行編輯與圖片上傳。

## `/admin/` 的實際操作

1. 在編輯區修改內容。
2. 按下「儲存正式名片」。
3. 系統會自動：
   - 儲存編輯中名片
   - 建立新的正式版本
   - 刷新最新正式版本資訊
   - 顯示最新正式網頁連結
   - 顯示最新正式 LIFF 連結
4. 若要重用舊版內容，可從歷史版本按「載入到編輯區」。
5. 載入到編輯區只會更新 working draft，不會直接改寫正式資料，直到再次按下「儲存正式名片」。

## 一般網址、LIFF 連結、直接分享的差別

- 複製最新正式網頁連結：取得固定網頁 permalink，任何瀏覽器都能開。
- 複製最新正式 LIFF 連結：取得固定版本的 LIFF permanent link，適合貼回 LINE 對話內開啟。
- 直接分享最新正式版本：在 LIFF 可用時直接送出最新版 Flex；若不在可分享環境，會退回複製該版本 LIFF 連結。
- 歷史版本的三種操作完全相同，只是目標改成對應的舊版本。
