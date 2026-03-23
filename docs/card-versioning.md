# Card Versioning

## live card 與 snapshot card

- `slug=default` 仍是唯一的 live card。`/card/default/` 永遠代表目前最新正式版本。
- 每次從 `/admin/` 按下「發佈為新版本」，系統會先把目前 draft 寫回 live/default，再複製一份 immutable snapshot row 到同一張 `cards_runtime` sheet。
- snapshot row 會有自己的 `slug`、`versionId`、`publishedAt`，例如 `default-v-20260322t100000z`。

## 分享規則

- 分享 live：連到 `/card/default/`，之後後台再更新，打開的人會看到最新 live。
- 分享 snapshot：連到 `/card/<snapshot-slug>/`，之後後台再更新 live，也不會覆蓋這個 snapshot。
- 舊卡再轉傳：如果原始連結是 snapshot permalink，再轉傳仍會是同一個 snapshot slug；如果原始連結是 live/default，再轉傳仍會指向最新 live。

## 後台操作

1. 解鎖 `/admin/`。
2. 編輯 live/default 內容，必要時先確認預覽。
3. 按「發佈為新版本」。
4. 系統會：
   - 儲存目前 live/default
   - 建立新的 snapshot row
   - 生成固定 permalink
   - 在版本列表中顯示新 snapshot
5. 可用「複製目前分享連結」、「分享最新 live」或「分享此快照」取得連結。

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
