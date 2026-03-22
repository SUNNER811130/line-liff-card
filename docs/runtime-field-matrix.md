# Runtime Field Matrix

本文件依照目前程式碼掃描結果整理 `cards_runtime` 欄位實際用途，掃描範圍包含：

- `src/components/AdminPage.tsx`
- `src/lib/card-admin-api.ts`
- `src/lib/card-source.ts`
- `src/lib/share.ts`
- `src/components/CardPage.tsx`
- `src/content/cards/view-model.ts`
- `src/lib/card-actions.ts`
- `src/lib/seo.ts`
- `src/lib/routes.ts`

## Scope Legend

- `both`: `/card/default/` 與 LINE Flex 共用同一份 runtime config
- `web`: 只影響 `/card/default/` 或瀏覽器分享 fallback
- `system`: system / metadata / internal / SEO / reserved

## Shared Fields

| Key | Scope | Actual usage | Source |
| --- | --- | --- | --- |
| `content.fullName` | `both` | 前台姓名、Flex `altText`、Flex 名稱、LINE 文字分享 fallback | `src/content/cards/view-model.ts`, `src/lib/share.ts` |
| `content.title` | `both` | 前台職稱、Flex 內文、LINE 文字分享 fallback | `src/content/cards/view-model.ts`, `src/lib/share.ts` |
| `content.brandName` | `both` | 前台品牌列、Flex 品牌列、Web Share title fallback | `src/content/cards/view-model.ts`, `src/lib/share.ts` |
| `content.intro` | `both` | 前台介紹區、Flex 摘要 | `src/content/cards/view-model.ts`, `src/lib/share.ts` |
| `photo.src` | `both` | 前台 hero image、Flex hero image | `src/content/cards/view-model.ts`, `src/lib/share.ts` |
| `actions.0.label` | `both` | 前台第一顆 CTA、Flex footer 第一顆按鈕 | `src/lib/card-actions.ts`, `src/lib/share.ts` |
| `actions.0.url` | `both` | 前台第一顆 CTA、Flex footer 第一顆按鈕導向 | `src/lib/card-actions.ts`, `src/lib/share.ts` |
| `actions.1.label` | `both` | 前台第二顆 CTA、Flex footer 第二顆按鈕 | `src/lib/card-actions.ts`, `src/lib/share.ts` |
| `actions.1.url` | `both` | 前台第二顆 CTA、Flex footer 第二顆按鈕導向 | `src/lib/card-actions.ts`, `src/lib/share.ts` |
| `slug` | `both` | `/card/:slug/` 路由、遠端讀寫 slug、LIFF share intent URL canonicalization | `src/lib/card-source.ts`, `src/lib/share.ts`, `src/lib/routes.ts` |

## Web-only Fields

| Key | Scope | Actual usage | Source |
| --- | --- | --- | --- |
| `content.headline` | `web` | 前台主標、Web Share text fallback 第二來源 | `src/content/cards/view-model.ts`, `src/lib/share.ts` |
| `content.subheadline` | `web` | 前台副標 | `src/content/cards/view-model.ts`, `src/components/CardPage.tsx` |
| `content.highlightsTitle` | `web` | 前台 highlights 區塊標題 | `src/content/cards/view-model.ts`, `src/components/CardPage.tsx` |
| `content.highlights` | `web` | 前台 highlights 清單 | `src/content/cards/view-model.ts`, `src/components/CardPage.tsx` |
| `content.actionsTitle` | `web` | 前台 actions 區標題 | `src/content/cards/view-model.ts`, `src/components/CardPage.tsx` |
| `content.actionsDescription` | `web` | 前台 actions 區說明 | `src/content/cards/view-model.ts`, `src/components/CardPage.tsx` |
| `content.sharePanelTitle` | `web` | 前台 share panel 標題 | `src/content/cards/view-model.ts`, `src/components/CardPage.tsx` |
| `modules.showHighlights` | `web` | 控制 highlights 區塊顯示 | `src/components/CardPage.tsx` |
| `modules.showSharePanel` | `web` | 控制 share panel 顯示 | `src/components/CardPage.tsx` |
| `modules.showQrCode` | `web` | 控制 QR Code 區塊顯示與 QR 生成流程 | `src/components/CardPage.tsx` |
| `photo.alt` | `web` | 前台 `img alt`、管理台預覽備援 | `src/content/cards/view-model.ts`, `src/components/AdminPage.tsx` |
| `photo.link` | `web` | 前台 hero image 點擊導向 | `src/content/cards/view-model.ts` |
| `actions.0.tone` | `web` | 前台第一顆按鈕樣式 | `src/lib/card-actions.ts` |
| `actions.0.enabled` | `web` | 前台第一顆按鈕是否顯示 | `src/lib/card-actions.ts` |
| `actions.1.tone` | `web` | 前台第二顆按鈕樣式 | `src/lib/card-actions.ts` |
| `actions.1.enabled` | `web` | 前台第二顆按鈕是否顯示 | `src/lib/card-actions.ts` |
| `share.buttonLabel` | `web` | 前台第三顆分享按鈕文案 | `src/content/cards/view-model.ts`, `src/components/CardPage.tsx` |
| `share.title` | `web` | Web Share API fallback title | `src/lib/share.ts` |
| `share.text` | `web` | Web Share API / LINE 文字分享 fallback text | `src/lib/share.ts` |
| `appearance.theme` | `web` | 前台 theme preset 選擇 | `src/content/cards/view-model.ts` |
| `appearance.layout` | `web` | 前台 layout className | `src/components/CardPage.tsx` |

## System / Metadata / Reserved

| Key | Scope | Status | Actual usage | Source |
| --- | --- | --- | --- | --- |
| `id` | `system` | internal | bundled card identity、本地草稿 storage key | `src/content/cards/draft.ts` |
| `isPrimary` | `system` | reserved | bundled 預設卡片標記 | `src/content/cards/index.ts` |
| `legacySlugs` | `system` | reserved | 舊 slug 對應 canonical slug | `src/content/cards/index.ts`, `src/lib/routes.ts` |
| `actions.0.id` | `system` | internal | actions key、fallback action normalize | `src/components/AdminPage.tsx`, `src/lib/card-actions.ts` |
| `actions.1.id` | `system` | internal | actions key、fallback action normalize | `src/components/AdminPage.tsx`, `src/lib/card-actions.ts` |
| `seo.title` | `system` | SEO | `document.title` | `src/lib/seo.ts` |
| `seo.description` | `system` | SEO | `meta[name=description]` | `src/lib/seo.ts` |
| `seo.ogTitle` | `system` | SEO | `meta[property=og:title]`、管理台 OG 圖預覽 alt fallback | `src/lib/seo.ts`, `src/components/AdminPage.tsx` |
| `seo.ogDescription` | `system` | SEO | `meta[property=og:description]` | `src/lib/seo.ts` |
| `seo.ogImage` | `system` | SEO | `meta[property=og:image]`、管理台分享圖預覽 | `src/lib/seo.ts`, `src/components/AdminPage.tsx` |

## Unused / Reserved Notes

- 目前 `CardConfig` 內沒有完全 `unused` 且從未被任何前端程式讀取的欄位。
- `legacySlugs`、`isPrimary`、`id`、`actions[*].id` 屬於 internal / reserved，不應在 UX 重整時改動資料結構或推測新語意。
- `updatedBy`、`updatedAt`、`adminSession` 不屬於 `cards_runtime` schema，本次僅作為 `/admin/` 操作 metadata 使用；API contract 維持既有 `saveCard` / `uploadImage` / unlock 流程。
