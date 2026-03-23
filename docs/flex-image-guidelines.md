# Flex Hero Image Guidelines

## 實際規格

- LINE 分享 Flex hero image 目前固定在 [`src/lib/share.ts`](/home/usersun/projects/line-liff-card/src/lib/share.ts) 組裝。
- 實際設定：
  - `size: "full"`
  - `aspectRatio: "4:3"`
  - `aspectMode: "cover"`
- 目前 `/card/default/` 與 LINE Flex 共用同一個圖片來源欄位：`photo.src`。

## 上傳建議

- 建議比例：`4:3`
- 建議尺寸：`1200 x 900`
- 最低建議尺寸：`800 x 600`
- 建議使用清楚主體、背景不要過滿、四周保留安全留白的圖片。

## 安全區建議

- 人物臉部、品牌 Logo、重要文字請盡量放在中央區域。
- 四周邊緣不要放太貼邊的文字或細節，尤其上下邊緣最容易在 `cover` 裁切時被吃掉。
- 若圖片本身已內嵌標語，請保留額外邊距，避免 LINE Flex hero 裁切後只剩半行字。

## 為什麼會裁切

- LINE Flex hero 使用 `aspectMode: "cover"`，代表圖片會先填滿 `4:3` 容器，再裁掉超出的區域。
- 因此原圖只要不是 `4:3`，就一定會有不同程度的裁切。
- `/card/default/` 網頁版目前也使用同一張圖，但它是以網頁卡片主視覺框做 `object-fit: cover` 呈現，和 Flex 的裁切視窗不完全相同。

## 若後續要改比例

- Flex hero 比例與裁切模式：修改 [`src/lib/card-style-registry.ts`](/home/usersun/projects/line-liff-card/src/lib/card-style-registry.ts) 的 `FLEX_HERO_IMAGE_*` 常數。
- Flex bubble 組裝位置：確認 [`src/lib/share.ts`](/home/usersun/projects/line-liff-card/src/lib/share.ts)。
- 若想讓網頁版也完全改成相同固定比例，另外要同步調整 [`src/styles.css`](/home/usersun/projects/line-liff-card/src/styles.css) 的 `.hero-frame` / `.hero-image` 規則。
