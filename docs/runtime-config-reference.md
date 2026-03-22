# Runtime Config Reference

這份文件只用來說明正式 runtime config 欄位用途，不是第二資料源。

## 同步原則

- 前台卡片 `/`、`/card/default/`
- `/admin/`
- LINE 分享 Flex

以上三者都應該吃同一份正式 runtime config。

## 主要欄位

- `content.fullName`
  顯示在卡片主視覺與分享 Flex 名稱。
- `content.brandName`
  顯示在卡片品牌列與分享 Flex 品牌列。
- `content.title`
  顯示在姓名下方，也會進入分享文字 fallback。
- `content.headline`
  顯示在卡片主文案與按鈕區標題附近。
- `content.intro`
  卡片主文案說明文字。
- `photo.src`
  卡片主視覺與 LINE Flex hero image。
- `photo.link`
  點擊主圖後導向的網址。
- `actions[0]`, `actions[1]`
  前兩顆一般按鈕；第三顆分享按鈕固定由系統產生。
- `share.title`
  非 Flex fallback 分享標題。
- `share.text`
  Web Share / 文字分享 fallback 內容。
- `share.buttonLabel`
  前台第三顆分享按鈕文字。
- `seo.ogImage`
  社群分享預覽圖。

## Placeholder 辨識

以下內容通常代表仍在測試階段，應在正式替換前檢查：

- 含有 `placeholder` 的圖片路徑
- `#contactUrl`
- `#serviceUrl`
- `example.com` / `example.org` / `example.net`

## 正式替換建議

- 圖片使用可公開讀取的 `https` URL。
- 按鈕外連優先使用 `https`。
- 每次更新後都在 `/admin/` 先確認預覽，再儲存到正式後台。
