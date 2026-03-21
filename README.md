# line-liff-card

LINE 電子名片靜態站 v1。使用 Vite、React、TypeScript 與本地設定檔產生名片內容，支援 GitHub Pages 部署、QR code、LIFF app 分享、permanent link 與沒有 `VITE_LIFF_ID` 時的 web-preview fallback。

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

正式商務電子名片的主要內容集中在以下位置：

- 文案與按鈕文字：`src/content/card.config.ts`
- 按鈕連結與 hero 連結：`src/content/card.config.ts`
- 主頁版面與區塊結構：`src/components/CardPage.tsx`
- 視覺樣式：`src/styles.css`
- 主視覺與 OG 圖：`public/images/hero-placeholder.svg`、`public/images/og-placeholder.svg`

## LIFF Setup

請建立 `.env.local` 或部署環境變數：

```bash
VITE_LIFF_ID=YOUR_LIFF_ID
VITE_SITE_URL=https://<user>.github.io/line-liff-card/
```

在 LINE Developers Console 建立 LIFF app 後，請把以下資訊填回專案：

- `LIFF ID` -> `VITE_LIFF_ID`
- `Endpoint URL` -> `VITE_SITE_URL`

`Endpoint URL` 必須指向實際部署頁面根路徑，例如 `https://<user>.github.io/line-liff-card/`。LIFF `init` 與 permanent link 都只會在這個 URL 之下的頁面工作，若開在其他路徑，畫面會顯示防呆錯誤而不是白屏。

### Why LIFF URL And github.io Behave Differently

- `https://liff.line.me/<LIFF_ID>` 是 LINE 管理的 LIFF 入口，會先帶你進入符合 Endpoint URL 範圍的正式頁面，LIFF SDK 可正常初始化。
- `https://<user>.github.io/line-liff-card/` 是公開網頁網址，外部瀏覽器可直接開啟，但只有當目前頁面仍位於 `VITE_SITE_URL` 所指定的 Endpoint URL 之下時，LIFF init 與 permanent link 才會成功。
- 如果使用者從錯誤的 github.io 子路徑、臨時網址或不在 Endpoint 範圍的頁面進入，專案會退回公開頁 fallback，不直接嘗試失敗的 LIFF runtime。

## GitHub Pages

本專案已內建 [`.github/workflows/deploy-pages.yml`](/home/usersun/projects/line-liff-card/.github/workflows/deploy-pages.yml)，每次 push 到 `main` 都會自動：

- `npm ci`
- `npm test`
- `npm run smoke:pages`
- 上傳 `dist`
- 部署到 GitHub Pages

Vite 會自動依照 GitHub repo 名稱推算 `base`，在本 repo 會落到 `/line-liff-card/`，避免 Pages 子路徑 JS/CSS 載入錯誤；若需要覆蓋，仍可自行指定 `VITE_BASE_PATH`。`404.html` 也已內建，GitHub Pages 遇到 `/card/default` 這種沒有副檔名的直達路徑時，會先補成 `/card/default/` 再載入頁面。

### Enable Pages

1. 進入 GitHub repo。
2. 打開 `Settings`。
3. 進入 `Pages`。
4. `Build and deployment` 的 `Source` 選 `GitHub Actions`。

### Verify Deployment

push 到 `main` 之後：

1. 到 repo 的 `Actions` 頁面確認 `Deploy GitHub Pages` workflow 成功。
2. 到 `Settings > Pages` 查看 `Your site is live at ...`，這裡會顯示正式網址。
3. 直接開啟 Pages 網址確認首頁與 `card/default/` 都能正常載入。

Actions 成功後，最快可從兩個地方找網址：

- repo 的 `Settings > Pages`
- 成功的 `Deploy GitHub Pages` workflow run 裡的 `deploy` job，`github-pages` environment 會顯示 URL

如果 Pages 白屏，先檢查三件事：

- `Settings > Pages` 的 `Source` 是否為 `GitHub Actions`
- `Actions` 的 `Run Pages smoke build` 是否成功，且 artifact 來源是 `dist`
- 頁面網址是否包含 repo base path，例如 `https://<user>.github.io/line-liff-card/`

### Manual Build Override

如果要在本機指定 base path，可使用：

```bash
npm run build -- --base=/YOUR_REPO_NAME/
```

`index.html` 與 `card/default/index.html` 都是實體頁面，不依賴 server rewrite。`.nojekyll` 會隨 `public/` 一起進到 `dist/`，`404.html` 則負責處理 GitHub Pages 的直達路徑 fallback。

## LIFF Test

1. 先部署到 GitHub Pages，確認正式網址可開啟。
2. 在 LINE Developers Console 把 LIFF `Endpoint URL` 設成你的正式網址。
3. 用 LINE App 開啟 LIFF URL。
4. 確認畫面顯示 `liff-ready`，並且有 `分享好友` 按鈕。
5. 點 `分享好友`，應會走 `shareTargetPicker`，送出一張 Flex Message。
6. 在外部瀏覽器開同一個頁面，應改成顯示 `複製 LIFF 分享連結`。

### Mode Badge Meanings

- `LIFF-READY`
  - 已設定 `VITE_LIFF_ID`
  - 目前頁面位於正確 Endpoint URL 範圍
  - 但目前不在 LINE client 內，通常是 github.io 或外部瀏覽器開啟
- `IN-LIFF`
  - 已在 LINE client 內成功初始化
  - 但目前容器 / 版本不支援 `shareTargetPicker`
- `SHARE-AVAILABLE`
  - 已在 LINE client 內成功初始化
  - 且 `isApiAvailable('shareTargetPicker') === true`
  - 此時最適合直接驗收分享好友流程

## Web Fallback Test

不帶 `VITE_LIFF_ID` 仍可直接預覽：

```bash
npm run dev
```

帶入 `VITE_LIFF_ID` 也可在外部瀏覽器測試 fallback：

```bash
VITE_LIFF_ID=your-liff-id VITE_SITE_URL=https://<user>.github.io/line-liff-card/ npm run dev
```

如果只是在一般瀏覽器本機開發，UI 會保留完整卡片與 QR 功能，不會因為沒有 `LIFF_ID` 而白屏。

## Production Content Notes

若要替換成你的正式客戶內容，優先修改：

- `src/content/card.config.ts`
  - `brand`：品牌標題 / badge
  - `heroTitle`：主標
  - `mainTitle`：副標
  - `description`：說明文字
  - `button1`、`button2`、`button3`：按鈕文案與連結
- `public/images/hero-placeholder.svg`
  - 替換卡片主視覺，或直接改 `heroImage` 指向你的照片 / 品牌圖
- `public/images/og-placeholder.svg`
  - 替換社群分享縮圖

如果暫時沒有正式網址，可以先使用站內 section anchor 或正式入口頁，避免把 `example.com`、`line.ee/example`、`alex@example.com` 這類 placeholder 連結帶到成品環境。
