# line-liff-card

多名片版本的 LINE 電子名片靜態站。使用 Vite、React、TypeScript 與本地設定檔管理多張名片，支援 GitHub Pages、多 slug 路由、LIFF 分享、permanent link、QR code 與外部瀏覽器 fallback。

## Requirements

- Node.js 20+
- npm 10+

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run test`
- `npm run lint`

## Routes

- `/`
  - 名片列表首頁
- `/card/default/`
  - 預設商務名片
- `/card/demo-consultant/`
  - 顧問示範名片
- `/card/:slug/`
  - 任一獨立名片頁

若 slug 不存在，會顯示 404 / fallback 畫面並提供返回首頁與預設名片入口。

## Multi-Card Content

多名片內容來源集中在：

- `src/content/cards/index.ts`
  - 管理 card collection 與 slug lookup
- `src/content/cards/default.ts`
  - `default` 名片設定
- `src/content/cards/demo-consultant.ts`
  - `demo-consultant` 名片設定
- `src/content/cards/types.ts`
  - 共用型別

首頁列表與卡片 slug 路由在：

- `src/App.tsx`
- `src/lib/routes.ts`

## Add A New Card

之後要新增一張卡，最少只要改這 2~3 個檔案：

1. 新增 `src/content/cards/<new-slug>.ts`
2. 更新 `src/content/cards/index.ts`
3. 新增 `card/<new-slug>/index.html`

其中：

- `src/content/cards/<new-slug>.ts`
  - 寫該張名片的文案、連結、圖片與 SEO
- `src/content/cards/index.ts`
  - 把新卡加入 collection
- `card/<new-slug>/index.html`
  - 讓 GitHub Pages / Vite build 輸出對應的實體頁入口

## Images

- 主視覺與 OG 圖目前放在 `public/images/`
- 若要換圖，可把檔案放到 `public/images/`，再更新對應卡片設定中的 `heroImage` 與 `seo.ogImage`

## LIFF Setup

請建立 `.env.local` 或部署環境變數：

```bash
VITE_LIFF_ID=YOUR_LIFF_ID
VITE_SITE_URL=https://<user>.github.io/line-liff-card/card/default/
```

若你要讓特定卡作為 LIFF 正式入口，`VITE_SITE_URL` 應指向該張卡的正式 URL，例如：

- `https://<user>.github.io/line-liff-card/card/default/`
- `https://<user>.github.io/line-liff-card/card/demo-consultant/`

`Endpoint URL` 必須指向實際部署頁面根路徑。LIFF `init` 與 permanent link 只會在該 URL 範圍之下成功。

### Why LIFF URL And github.io Behave Differently

- `https://liff.line.me/<LIFF_ID>` 是 LINE 管理的 LIFF 入口，會先帶你進入符合 Endpoint URL 範圍的正式頁面。
- `https://<user>.github.io/line-liff-card/card/<slug>/` 是公開網頁網址，可直接對外展示。
- 若目前網址不在 `VITE_SITE_URL` 指定的 Endpoint 範圍內，專案會退回公開頁 fallback，而不是硬做失敗的 LIFF 初始化。

### Mode Badge Meanings

- `LIFF-READY`
  - 已設定 `VITE_LIFF_ID`
  - 目前頁面位於正確 Endpoint URL 範圍
  - 但目前不在 LINE client 內
- `IN-LIFF`
  - 已在 LINE client 內成功初始化
  - 但目前容器 / 版本不支援 `shareTargetPicker`
- `SHARE-AVAILABLE`
  - 已在 LINE client 內成功初始化
  - 且 `isApiAvailable('shareTargetPicker') === true`

## GitHub Pages

本專案已內建 [`.github/workflows/deploy-pages.yml`](/home/usersun/projects/line-liff-card/.github/workflows/deploy-pages.yml)，每次 push 到 `main` 都會自動：

- `npm ci`
- `npm test`
- `npm run smoke:pages`
- 上傳 `dist`
- 部署到 GitHub Pages

`404.html` 已內建 GitHub Pages fallback，像 `/card/demo-consultant` 這類無副檔名直達路徑會被導回正確頁面。

## Verify Deployment

push 到 `main` 之後，至少確認：

1. 首頁 `/`
2. `/card/default/`
3. `/card/demo-consultant/`

都能正常載入。
