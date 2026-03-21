# Setup Manual

## 1. Install

```bash
npm install
```

## 2. Local Preview

```bash
npm run dev
```

## 3. Current Structure

目前正式卡資料來源：

- `src/content/cards/index.ts`
- `src/content/cards/default.ts`
- `src/content/cards/types.ts`

路由層：

- `/`
- `/card/default/`
- `/card/demo-consultant/`
- `/admin/`
- `/card/:slug/`

補充：

- `/` 直接顯示正式卡
- `/card/demo-consultant/` 是 legacy slug，會映射回正式 `default` 卡
- `/admin/` 是管理頁 MVP

首頁與 slug 路由在：

- `src/App.tsx`
- `src/lib/routes.ts`

## 4. Add A New Card

新增一張卡時，通常只要改這 2~3 個檔案：

1. `src/content/cards/<slug>.ts`
2. `src/content/cards/index.ts`
3. `card/<slug>/index.html`

## 5. LIFF Environment

若要本機模擬 LIFF 設定，請先準備：

```bash
VITE_LIFF_ID=YOUR_LIFF_ID
VITE_SITE_URL=https://sunner811130.github.io/line-liff-card/
```

`VITE_SITE_URL` 應該指向 repo root，不要只設成單一卡頁。這樣首頁、正式卡、legacy slug 與 `/admin/` 才都在同一個 LIFF Endpoint 範圍內。

## 6. Why LIFF URL And GitHub Pages URL Behave Differently

- `https://liff.line.me/<LIFF_ID>` 會帶入 LINE 的 LIFF 上下文
- `https://<user>.github.io/line-liff-card/card/<slug>/` 是公開展示網址
- 只有當目前頁面位於 `VITE_SITE_URL` 指定的 Endpoint URL 範圍內時，LIFF `init()` 與 permanent link 才會成功
- 若從公開正式頁在 LINE app 內按第三顆分享，專案會優先 handoff 到 LIFF，再自動嘗試分享同一張 Flex 電子名片

## 6.1 LINE Profile Personalization

若要讓頁面顯示 LINE 暱稱與頭像，請在 LINE Developers Console 確認：

- `profile` scope 已開啟
- `openid` scope 建議一併開啟

如果使用者未授權、目前未登入，或 Console scope 不足，頁面會顯示簡潔提示，例如：

- 尚未登入 LINE，登入後才會顯示個人化資訊
- 目前無法取得 LINE 個人資料，可能尚未開啟 profile scope 或使用者未授權

## 7. Production Build

```bash
npm run build
```

build 後至少要確認：

- `dist/index.html`
- `dist/admin/index.html`
- `dist/card/default/index.html`
- `dist/card/demo-consultant/index.html`
- `dist/404.html`

## 8. Tests

```bash
npm test
```

目前測試已包含：

- `/`、`/card/default/`、`/card/demo-consultant/`、`/admin/` 路由
- legacy slug 映射正式卡
- 錯誤 slug 顯示 fallback
- GitHub Pages fallback route restore
- LIFF runtime / permanent link fallback
- LIFF share intent handoff 與 auto-share

## 9. Images

若要替換圖片：

1. 將檔案放進 `public/images/`
2. 更新對應卡設定中的 `heroImage`
3. 更新 `seo.ogImage`
