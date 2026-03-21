# Setup Manual

## 1. Install

```bash
npm install
```

## 2. Local Preview

```bash
npm run dev
```

若要本機模擬 LIFF 設定，請先準備環境變數：

```bash
VITE_LIFF_ID=YOUR_LIFF_ID
VITE_SITE_URL=https://<user>.github.io/line-liff-card/
```

`VITE_SITE_URL` 要和你在 LINE Developers Console 設定的 LIFF `Endpoint URL` 一致。

## 3. Production Build

GitHub Pages 專案頁面通常需要 repo path base：

```bash
npm run build -- --base=/line-liff-card/
```

如果 repo 名稱不同，請把 `/line-liff-card/` 換成你的 repo path。

實際部署到 GitHub Pages 時，workflow 會自動依 repo 名稱推算正確 base path，不需要手動改 workflow。
本 repo 名稱是 `line-liff-card`，成功部署後的 base path 應為 `/line-liff-card/`。

## 4. GitHub Pages Repo Settings

請在 GitHub repo 內手動設定：

1. 打開 `Settings`。
2. 點選左側 `Pages`。
3. 在 `Build and deployment` 區塊，把 `Source` 改成 `GitHub Actions`。
4. 確認預設分支是 `main`，之後 push 到 `main` 就會自動部署。

部署流程定義在 [`.github/workflows/deploy-pages.yml`](/home/usersun/projects/line-liff-card/.github/workflows/deploy-pages.yml)。

GitHub Pages 成功條件：

- `Settings > Pages` 的 `Source` 為 `GitHub Actions`
- `Deploy GitHub Pages` workflow 的 `build` 與 `deploy` 兩個 jobs 都成功
- `build` job 的 `Upload Pages artifact` 上傳的是 `dist`
- 打開 `https://<user>.github.io/line-liff-card/` 與 `https://<user>.github.io/line-liff-card/card/default/` 都能載入

## 5. Actions Logs

如果部署失敗，請到：

1. repo 上方的 `Actions`
2. 點進 `Deploy GitHub Pages`
3. 打開失敗的 workflow run
4. 查看 `build` 或 `deploy` job 的 step logs

最常見需要先確認的是：

- `npm ci` 是否成功
- `npm test` 是否失敗
- `Run Pages smoke build` 是否失敗，這一步會執行 build 並確認 `dist/index.html` 與 `dist/card/default/index.html`
- `deploy` job 是否有 Pages 權限或 Source 設定錯誤

如果 workflow 失敗，優先看這兩個步驟：

- `build` job 的 `Run unit tests`
- `build` job 的 `Run Pages smoke build`

## 6. Create LIFF App

在 LINE Developers Console 建立 LIFF app 後，請把這兩個值填回專案：

- `LIFF ID` -> `VITE_LIFF_ID`
- `Endpoint URL` -> `VITE_SITE_URL`

建議 `Endpoint URL` 使用 GitHub Pages 正式網址根路徑，例如：

```text
https://<user>.github.io/line-liff-card/
```

原因：

- `liff.init()` 只能在 `Endpoint URL` 與其子路徑下執行
- `liff.permanentLink.createUrlBy()` 也只能替這個範圍內的頁面建立連結
- 如果網址跑到 `Endpoint URL` 外，本專案會直接顯示防呆錯誤訊息

## 7. LIFF Test

1. 完成部署後，用正式網址更新 LIFF `Endpoint URL`。
2. 在 LINE Developers Console 複製 LIFF URL。
3. 用手機 LINE 開啟該 LIFF URL。
4. 進頁後確認：
   - 名片正常顯示
   - 有 `分享好友` 按鈕
   - 點擊後會開啟 `shareTargetPicker`
   - 分享內容是一張 Flex Message
5. 若在 dev mode，本頁底部會顯示 LIFF debug panel，可檢查：
   - `inClient`
   - `loggedIn`
   - `shareAvailable`
   - `current URL`

## 8. Web Fallback Test

1. 在桌機或手機外部瀏覽器打開同一個網址。
2. 畫面應仍可正常 render，不應白屏。
3. 若已有 `VITE_LIFF_ID`，應顯示 `複製 LIFF 分享連結`。
4. 若完全沒設 `VITE_LIFF_ID`，仍會保留 web-preview mode 與原本公開網址 / QR 功能。

## 9. Optional LIFF Mode

```bash
VITE_LIFF_ID=your-liff-id VITE_SITE_URL=https://<user>.github.io/line-liff-card/ npm run dev
```

未提供 `VITE_LIFF_ID` 時仍可正常渲染，會顯示 `web-preview` 模式。

## 10. Card Content

正式展示版的內容主要來自：

- `src/content/card.config.ts`
  - `brand`：品牌標題 / badge
  - `heroTitle`：主標
  - `mainTitle`：副標
  - `description`：說明文字
  - `button1`、`button2`、`button3`：按鈕文案與連結

若要替換圖片，請把新檔案放進：

- `public/images/`

然後更新 `heroImage` 與 `seo.ogImage` 路徑。

目前正式展示版的主頁結構與呈現位置：

- `src/components/CardPage.tsx`
  - 公開網址區
  - QR 區
  - 主操作區塊
  - status / diagnostics
- `src/styles.css`
  - 按鈕高度、間距、卡片比例與手機優先樣式
