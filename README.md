# line-liff-card

LINE 電子名片靜態站 v1。使用 Vite、React、TypeScript 與本地設定檔產生名片內容，支援 GitHub Pages 部署、QR code、複製網址與 LIFF 預留模式。

## Requirements

- Node.js 20+
- npm 10+

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run test`
- `npm run lint`

## Content Editing

主要文案與按鈕設定集中在 `src/content/card.config.ts`。

## GitHub Pages

本專案已內建 [`.github/workflows/deploy-pages.yml`](/home/usersun/projects/line-liff-card/.github/workflows/deploy-pages.yml)，每次 push 到 `main` 都會自動：

- `npm ci`
- `npm test`
- `npm run build`
- 上傳 `dist`
- 部署到 GitHub Pages

Vite 會自動依照 GitHub repo 名稱推算 `base`，避免 Pages 子路徑資源載入錯誤；若需要覆蓋，仍可自行指定 `VITE_BASE_PATH`。

### Enable Pages

1. 進入 GitHub repo。
2. 打開 `Settings`。
3. 進入 `Pages`。
4. `Build and deployment` 的 `Source` 選 `GitHub Actions`。

### Verify Deployment

push 到 `main` 之後：

1. 到 repo 的 `Actions` 頁面確認 `Deploy GitHub Pages` workflow 成功。
2. 到 `Settings > Pages` 查看 `Your site is live at ...`。
3. 直接開啟 Pages 網址確認首頁與 `card/default/` 都能正常載入。

### Manual Build Override

如果要在本機指定 base path，可使用：

```bash
npm run build -- --base=/YOUR_REPO_NAME/
```

`index.html` 與 `card/default/index.html` 都是實體頁面，不依賴 server rewrite。`.nojekyll` 會隨 `public/` 一起進到 `dist/`。

## LIFF Ready

若提供 `VITE_LIFF_ID`，介面會自動切換為 `liff-ready` 模式：

```bash
VITE_LIFF_ID=your-liff-id npm run dev
```
