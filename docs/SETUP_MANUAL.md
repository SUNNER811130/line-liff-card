# Setup Manual

## 1. Install

```bash
npm install
```

## 2. Local Preview

```bash
npm run dev
```

## 3. Production Build

GitHub Pages 專案頁面通常需要 repo path base：

```bash
npm run build -- --base=/line-liff-card/
```

如果 repo 名稱不同，請把 `/line-liff-card/` 換成你的 repo path。

實際部署到 GitHub Pages 時，workflow 會自動依 repo 名稱推算正確 base path，不需要手動改 workflow。

## 4. GitHub Pages Repo Settings

請在 GitHub repo 內手動設定：

1. 打開 `Settings`。
2. 點選左側 `Pages`。
3. 在 `Build and deployment` 區塊，把 `Source` 改成 `GitHub Actions`。
4. 確認預設分支是 `main`，之後 push 到 `main` 就會自動部署。

部署流程定義在 [`.github/workflows/deploy-pages.yml`](/home/usersun/projects/line-liff-card/.github/workflows/deploy-pages.yml)。

## 5. Actions Logs

如果部署失敗，請到：

1. repo 上方的 `Actions`
2. 點進 `Deploy GitHub Pages`
3. 打開失敗的 workflow run
4. 查看 `build` 或 `deploy` job 的 step logs

最常見需要先確認的是：

- `npm ci` 是否成功
- `npm test` 是否失敗
- `npm run build` 是否有 Vite base path 或 TypeScript 錯誤
- `deploy` job 是否有 Pages 權限或 Source 設定錯誤

## 6. Optional LIFF Mode

```bash
VITE_LIFF_ID=your-liff-id npm run dev
```

未提供 `VITE_LIFF_ID` 時仍可正常渲染，會顯示 `web-preview` 模式。

## 7. Card Content

請修改：

- `src/content/card.config.ts`

若要替換圖片，請把新檔案放進：

- `public/images/`

然後更新 `heroImage` 與 `seo.ogImage` 路徑。
