# Codebase Map

## 主要模組

- `src/App.tsx`
  處理 `/`、`/card/:slug/`、`/admin/` 與 404 route。
- `src/components/CardPage.tsx`
  前台卡片頁與分享按鈕實作。`/card/default/` 繼續代表目前最新正式內容。
- `src/components/AdminPage.tsx`
  後台 CMS。現在對使用者呈現為「編輯中名片 + 正式版本 + 歷史版本」模型。
- `src/lib/card-source.ts`
  前後台共用的 remote adapter，封裝 `getCard`、`listCards`、`publishSnapshot`、`uploadImage`、admin session。
- `src/lib/card-admin-api.ts`
  Apps Script request/response envelope helper，維持 production GAS contract。
- `src/lib/share.ts`
  Flex payload、LIFF permalink、網頁 permalink、直接分享 fallback。
- `src/lib/routes.ts`
  版本 slug 對應的 card path、web URL、LIFF URL。
- `src/lib/runtime.ts`
  runtime URL 與資產 URL helper。
- `gas/bound-card-backend/Code.gs`
  正式 Spreadsheet/GAS backend。internal 仍維持 `default` live row + immutable version rows。

## 目前真實資料流

### 前台 `/card/default/`

1. `App.tsx` 解析 route。
2. `loadRuntimeCard('default')` 先試遠端 `getCard`，失敗時 fallback bundled default。
3. `CardPage.tsx` 使用拿到的 `CardConfig` 渲染前台與分享 UI。

### 後台編輯中名片

1. `AdminPage.tsx` 維持一份可編輯 draft。
2. internal working draft 仍使用 `slug=default`。
3. 圖片上傳仍直接寫回 `default` row，保持既有 `/admin/ unlock / save / upload` contract。

### 儲存正式名片

1. 使用者按「儲存正式名片」。
2. `AdminPage.tsx` 呼叫 `publishSnapshotCard()`。
3. `card-source.ts` 送出 `action=publishSnapshot` 到 GAS。
4. `Code.gs` 先把目前內容寫回 `default` row。
5. `Code.gs` 再建立一筆 immutable version row，沿用既有 snapshot slug 規則。
6. 前端把回傳結果視為「最新正式版本」，立即刷新最新正式 web/LIFF/分享入口。

## `default` 的實際角色

- 對使用者：代表「編輯中名片」的 internal working draft。
- 對前台：`/card/default/` 仍代表最新正式內容。
- 對後端：仍是唯一可編輯 row，所有 immutable versions 都從這一筆複製出來。

## immutable version 的實際角色

- 仍使用既有 snapshot row 機制。
- 每筆版本有自己的 `slug`、`versionId`、`publishedAt`。
- permalink 與 LIFF permalink 都以該版本 slug 建立。
- 歷史版本可讀、可分享、可載入回編輯區，但不直接覆寫原版本。

## 哪些邏輯保留 internal implementation

- `publishSnapshot` action 名稱
- `snapshot` slug 規則
- `version.kind = live | snapshot`
- `default` 與 immutable versions 共用同一張 `cards_runtime` sheet

以上都仍保留，因為它們已經是 production GAS 與 permalink 相容基礎；只是 `/admin/` UI 不再把這些詞直接暴露給一般使用者。
