# Flex Hero Image Guidelines

## 為什麼不做「每張圖自動改整張卡片尺寸」

- LINE Flex 的 bubble 尺寸、hero 比例與可用版面是離散規格，不適合跟著每張原圖任意變形。
- `/card/default/` 與 LINE Flex 雖共用 `photo.src`，但兩個容器的排版限制不同；若讓整張卡片隨圖片比例漂移，會同時提高分享結構風險與前台回歸成本。
- 目前正式策略是「固定版型 + 可調裁切」：保留既有卡片結構，只開放調整 hero 比例、cover/contain、Flex bubble size，以及網頁端縮放 / 焦點。

## 目前正式採用策略

- 共用圖片來源：`photo.src`
- 共用可調設定：
  - `styles.heroAspectRatio`
  - `styles.heroAspectMode`
- Flex 專用設定：
  - `styles.flexBubbleSize`
- `/card/default/` 專用設定：
  - `styles.heroZoom`
  - `styles.heroFocalX`
  - `styles.heroFocalY`
- 舊資料若沒有新 keys：
  - Flex fallback 仍是 `aspectRatio: "4:3"`、`aspectMode: "cover"`、bubble `mega`
  - `/card/default/` fallback 仍維持目前正式版主視覺高度與 cover 呈現

## 哪些設定影響 Flex

- 實際 Flex hero 組裝仍在 [`src/lib/share.ts`](/home/usersun/projects/line-liff-card/src/lib/share.ts)。
- 目前實際輸出：
  - `hero.size: "full"`
  - `hero.aspectRatio`: 來自 `styles.heroAspectRatio`，空值 fallback `4:3`
  - `hero.aspectMode`: 來自 `styles.heroAspectMode`，空值 fallback `cover`
  - `bubble.size`: 來自 `styles.flexBubbleSize`，空值 fallback `mega`
- Flex 目前不直接支援與網頁等級相同的自由 focal crop，所以 `heroZoom / heroFocalX / heroFocalY` 先只作用在網頁主視覺與 admin 主視覺預覽。

## 哪些設定影響 `/card/default/`

- `/card/default/` 渲染仍在 [`src/components/CardPage.tsx`](/home/usersun/projects/line-liff-card/src/components/CardPage.tsx)，由 [`src/content/cards/view-model.ts`](/home/usersun/projects/line-liff-card/src/content/cards/view-model.ts) 接入 CSS vars。
- 實際套用規則在 [`src/lib/card-style-registry.ts`](/home/usersun/projects/line-liff-card/src/lib/card-style-registry.ts) 與 [`src/styles.css`](/home/usersun/projects/line-liff-card/src/styles.css)。
- 影響項目：
  - `styles.heroAspectRatio`: 設定時改變 hero 容器比例；空值維持目前正式版自適應高度
  - `styles.heroAspectMode`: `cover` / `contain`
  - `styles.heroZoom`: 50% ~ 150%
  - `styles.heroFocalX`, `styles.heroFocalY`: 轉成 `object-position`

## 上傳建議

- 建議比例：`4:3`
- 建議尺寸：`1200 x 900`
- 最低建議尺寸：`800 x 600`
- 建議使用清楚主體、背景不要過滿、四周保留安全留白的圖片。

## 後續若要再擴充圖片裁切能力

- 共用 fallback 與 key 解析：改 [`src/lib/card-style-registry.ts`](/home/usersun/projects/line-liff-card/src/lib/card-style-registry.ts)
- `/admin/` 控制項與預覽：改 [`src/components/AdminPage.tsx`](/home/usersun/projects/line-liff-card/src/components/AdminPage.tsx)
- `/card/default/` 視覺套用：改 [`src/styles.css`](/home/usersun/projects/line-liff-card/src/styles.css) 與 [`src/components/CardPage.tsx`](/home/usersun/projects/line-liff-card/src/components/CardPage.tsx)
- LINE Flex payload：改 [`src/lib/share.ts`](/home/usersun/projects/line-liff-card/src/lib/share.ts)
