# Card Versioning

## live card 與 snapshot card

- `slug=default` 仍是唯一的 live card。`/card/default/` 永遠代表目前最新正式版本。
- 每次從 `/admin/` 按下「發佈為新版本」，系統會先把目前 draft 寫回 live/default，再複製一份 immutable snapshot row 到同一張 `cards_runtime` sheet。
- snapshot row 會有自己的 `slug`、`versionId`、`publishedAt`，例如 `default-v-20260322t100000z`。

## 分享規則

- 分享 live 一般網址：連到 `/card/default/`，之後後台再更新，打開的人會看到最新 live。
- 分享 snapshot 一般網址：連到 `/card/<snapshot-slug>/`，之後後台再更新 live，也不會覆蓋這個 snapshot。
- 分享 live LIFF：仍然對應 live/default，但會先轉成 LIFF permanent link，再由 LINE 開啟同一張正式卡片。
- 分享 snapshot LIFF：對應固定 snapshot slug 的 LIFF permanent link，之後 live 再更新也不會漂移。
- 舊卡再轉傳：如果原始連結是 snapshot permalink，再轉傳仍會是同一個 snapshot slug；如果原始連結是 live/default，再轉傳仍會指向最新 live。
- 直接送 Flex Message 時，live 與 snapshot 都會沿用自己的 slug/pageUrl，因此連出去的 hero 與 footer URI 也會維持同一版。

## 後台操作

1. 解鎖 `/admin/`。
2. 編輯 live/default 內容，必要時先確認預覽。
3. 按「發佈為新版本」。
4. 系統會：
   - 儲存目前 live/default
   - 建立新的 snapshot row
   - 生成固定 permalink
   - 在版本列表中顯示新 snapshot
5. 後台版本區會提供：
   - `複製 live 網頁連結`
   - `複製 snapshot 網頁連結`
   - `複製 live LIFF 連結`
   - `複製 snapshot LIFF 連結`
   - `分享最新 live`
   - `分享此快照`

## 為什麼一般網址不等於 LIFF 分享入口

- 一般網址只是公開網頁 permalink，任何瀏覽器都能開。
- LIFF 分享入口需要先進入 LIFF Endpoint URL 範圍，才能使用 `liff.init()`、`permanentLink.createUrlBy()` 與 `shareTargetPicker()`。
- 因此 `/admin/` 內必須把「複製網頁連結」和「複製 LIFF 連結 / 直接用 LIFF 分享」分開，否則使用者會誤以為 GitHub Pages permalink 就能直接叫出 LINE 分享器。

## 後台按鈕用途

- `複製 live 網頁連結`：拿到最新 live/default 的公開網址。
- `複製 snapshot 網頁連結`：拿到固定 snapshot permalink。
- `複製 live LIFF 連結`：建立 live/default 的 LIFF permanent link，適合貼回 LINE 對話再開啟。
- `複製 snapshot LIFF 連結`：建立固定 snapshot 的 LIFF permanent link。
- `分享最新 live`：在 LIFF 可用時直接呼叫 `shareTargetPicker()` 發送 live Flex。
- `分享此快照`：在 LIFF 可用時直接呼叫 `shareTargetPicker()` 發送 snapshot Flex。

## 外部瀏覽器 fallback

- 若目前不在 LINE LIFF 容器，或 LINE client 不支援 `shareTargetPicker()`，後台不會假裝已送出 Flex。
- 系統會改為複製對應版本的 LIFF 連結，並提示使用者把連結貼到 LINE 中開啟後再分享。
- 尚未發佈 snapshot 時，snapshot 相關按鈕會維持 disabled，不會誤導成有固定版可分享。

## 為什麼舊版不會再被覆蓋

- live 與 snapshot 是不同 slug rows。
- snapshot row 的 `version.kind` 會標記為 `snapshot`。
- GAS backend 會拒絕對 snapshot row 執行 `saveCard` 與 `uploadImage`，避免後續誤寫。

## 目前資料來源

- Sheet: `cards_runtime`
- Columns: `slug | config_json | updated_at | updated_by`
- live/default 與所有 snapshot 都放在同一張 sheet，不需要搬遷舊資料。

## 未來擴充建議

- 若要加「刪除版本 / 重新命名版本 / 標記版本備註」，優先從 [`gas/bound-card-backend/Code.gs`](/home/usersun/projects/line-liff-card/gas/bound-card-backend/Code.gs) 的 `listCards_` / `publishSnapshot_` 延伸。
- 若要把版本列表做得更完整，前端入口在 [`src/components/AdminPage.tsx`](/home/usersun/projects/line-liff-card/src/components/AdminPage.tsx)。
- 若要新增更多 permalink 規則或分享模式，維持 [`src/lib/share.ts`](/home/usersun/projects/line-liff-card/src/lib/share.ts) 以 slug 為核心，不要繞開既有 LIFF handoff 流程。
