# LIFF Sharing

## 一般網址 vs LIFF 網址

- 一般網址是 GitHub Pages 上的公開 permalink，例如 `/card/default/` 或 `/card/<snapshot-slug>/`。
- LIFF 網址不是另一份內容，而是讓同一個 permalink 在 LINE 的 LIFF 容器中開啟。
- 真正可穩定回到同一張卡片的 LIFF 連結，應優先使用 `liff.permanentLink.createUrlBy()` 產生。

## 為什麼一般網址不能直接等於 LIFF Flex 分享入口

- 一般網址只保證能在瀏覽器打開頁面。
- `liff.init()`、`liff.permanentLink.createUrlBy()`、`liff.shareTargetPicker()` 都要求目前頁面位於 LIFF Endpoint URL 範圍內。
- 所以使用者拿到 GitHub Pages permalink，不代表當下就能直接跳出 LINE target picker。

## live 與 snapshot 的 LIFF 分享差異

- live LIFF 連結對應 `/card/default/`，之後 live 更新後，重新打開會看到最新內容。
- snapshot LIFF 連結對應固定 snapshot slug，因此之後 live 更新也不會改掉該版本。
- admin 端直接送 Flex 時，也會依 live/snapshot 使用不同的 `pageUrl` 與 payload。

## `/admin/` 版本區按鈕用途

- `複製 live 網頁連結`：複製一般 live permalink。
- `複製 snapshot 網頁連結`：複製一般 snapshot permalink。
- `複製 live LIFF 連結`：複製 live 的 LIFF permanent link。
- `複製 snapshot LIFF 連結`：複製 snapshot 的 LIFF permanent link。
- `分享最新 live`：在 LIFF 可用時直接送出 live Flex Message。
- `分享此快照`：在 LIFF 可用時直接送出 snapshot Flex Message。

## 外部瀏覽器為什麼可能不能直接叫出 target picker

- 使用者可能不在 LINE app 內。
- 使用者可能在 LIFF 以外的外部瀏覽器。
- 目前 LINE client 可能不支援 `shareTargetPicker()`。
- 使用者可能尚未登入 LINE。

遇到這些情況時，後台會退回複製 LIFF 連結，而不是把一般網址誤當成已完成的 Flex 分享。

## 建議操作流程

1. 在 `/admin/` 完成 live/default 編輯。
2. 若要固定版本，先按 `發佈為新版本` 生成 snapshot。
3. 想給人一般瀏覽網址時，用 `複製 live 網頁連結` 或 `複製 snapshot 網頁連結`。
4. 想讓對方在 LINE 中開啟時，用 `複製 live LIFF 連結` 或 `複製 snapshot LIFF 連結`。
5. 想直接在 LINE 中發送 Flex 時，在 LIFF 環境中使用 `分享最新 live` 或 `分享此快照`。
