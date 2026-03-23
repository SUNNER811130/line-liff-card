# LIFF Sharing

## 連結類型

- 網頁連結：GitHub Pages 上的公開 permalink，例如 `/card/default-v-20260322t100000z/`。
- LIFF 連結：讓同一個 permalink 在 LINE 的 LIFF 容器中開啟。
- 直接分享：在 LIFF 可用時直接呼叫 `shareTargetPicker()` 送出 Flex Message。

## 最新正式版本的分享規則

- `/admin/` 的「直接分享最新正式版本」永遠抓最近一次成功建立的 immutable version。
- 不會抓尚未正式儲存的編輯中內容。
- 不會抓 `default` working draft 的暫時狀態。
- 「複製最新正式 LIFF 連結」與「複製最新正式網頁連結」也都指向同一筆最新正式版本。

## 歷史版本的分享規則

- 每一筆歷史版本都有自己的固定 slug。
- 複製網頁連結、複製 LIFF 連結、直接分享此版本，都會固定指向那筆版本。
- 即使之後又建立更新的正式版本，舊版連結仍維持有效。

## 為什麼 LIFF 連結不等於一般網址

- 一般網址只能保證頁面可開啟。
- `liff.init()`、`liff.permanentLink.createUrlBy()`、`liff.shareTargetPicker()` 都要求目前頁面位於 LIFF Endpoint URL 範圍內。
- 因此 `/admin/` 仍會把「複製網頁連結」與「複製 LIFF 連結 / 直接分享」分開。

## `/admin/` 的 fallback 行為

- 若目前不在 LINE app 內，或 `shareTargetPicker()` 不可用，系統不會假裝已完成直接分享。
- 這時會退回複製對應版本的 LIFF 連結。
- 使用者可以把該連結貼到 LINE 對話中，再從 LINE 內開啟並分享。

## 版本連結如何保持穩定

- LIFF permanent link 是對固定版本 permalink 建立的。
- 版本 permalink 的 slug 不變，LIFF permalink 也會固定回到同一版。
- 因此舊版 LIFF 連結不會被後續新版覆蓋。
