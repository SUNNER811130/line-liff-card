# Setup Manual

## 1. Install

```bash
npm install
```

## 2. Local Preview

```bash
npm run dev
```

## 3. Multi-Card Structure

目前多名片資料來源：

- `src/content/cards/index.ts`
- `src/content/cards/default.ts`
- `src/content/cards/demo-consultant.ts`
- `src/content/cards/types.ts`

路由層：

- `/`
- `/card/default/`
- `/card/demo-consultant/`
- `/card/:slug/`

首頁列表與 slug 路由在：

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
VITE_SITE_URL=https://<user>.github.io/line-liff-card/card/default/
```

如果要把另一張卡當成正式入口，就把 `VITE_SITE_URL` 改成對應 slug，例如：

```bash
VITE_SITE_URL=https://<user>.github.io/line-liff-card/card/demo-consultant/
```

## 6. Why LIFF URL And GitHub Pages URL Behave Differently

- `https://liff.line.me/<LIFF_ID>` 會帶入 LINE 的 LIFF 上下文
- `https://<user>.github.io/line-liff-card/card/<slug>/` 是公開展示網址
- 只有當目前頁面位於 `VITE_SITE_URL` 指定的 Endpoint URL 範圍內時，LIFF `init()` 與 permanent link 才會成功

## 7. Production Build

```bash
npm run build
```

build 後至少要確認：

- `dist/index.html`
- `dist/card/default/index.html`
- `dist/card/demo-consultant/index.html`
- `dist/404.html`

## 8. Tests

```bash
npm test
```

目前測試已包含：

- 不同 slug 顯示不同內容
- 錯誤 slug 顯示 fallback
- GitHub Pages fallback route restore
- LIFF runtime / permanent link fallback

## 9. Images

若要替換圖片：

1. 將檔案放進 `public/images/`
2. 更新對應卡設定中的 `heroImage`
3. 更新 `seo.ogImage`
