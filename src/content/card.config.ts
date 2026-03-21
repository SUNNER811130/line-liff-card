export type CardButton = {
  label: string;
  color: string;
  url: string;
};

export type CardConfig = {
  brand: string;
  englishName: string;
  heroTitle: string;
  mainTitle: string;
  description: string;
  bullets: string[];
  heroImage: string;
  heroLink: string;
  button1: CardButton;
  button2: CardButton;
  button3: CardButton;
  qrEnabled: boolean;
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
  };
};

export const cardConfig: CardConfig = {
  brand: 'ELEVATE BUSINESS CARD',
  englishName: 'Client Success Office',
  heroTitle: '品牌聯絡、服務說明與商務洽詢的正式入口',
  mainTitle: '適合對外展示、分享與導流的商務電子名片預設版型',
  description:
    '整合品牌識別、服務重點、公開網址、QR 與 LINE 分享能力，適合做為客戶初次接觸、展會交換資訊與後續預約洽詢的正式商務頁面。',
  bullets: ['商務簡報級視覺呈現', '支援 GitHub Pages 正式對外展示', '保留 LIFF 分享與外部瀏覽器 fallback'],
  heroImage: 'images/hero-placeholder.svg',
  heroLink: '#overview',
  button1: {
    label: '加入 LINE / 品牌入口',
    color: '#06c755',
    url: '#connect',
  },
  button2: {
    label: '服務介紹',
    color: '#0f4cdb',
    url: '#overview',
  },
  button3: {
    label: '預約洽詢',
    color: '#ff8a00',
    url: '#booking',
  },
  qrEnabled: true,
  seo: {
    title: 'Elevate Business Card | LINE 電子名片',
    description: '正式商務風格的 LINE 電子名片預設版型，支援公開網址、QR、LIFF 分享與外部瀏覽器 fallback。',
    ogTitle: 'Elevate Business Card | LINE 電子名片',
    ogDescription: '正式商務風格的 LINE 電子名片預設版型，支援公開網址、QR、LIFF 分享與外部瀏覽器 fallback。',
    ogImage: 'images/og-placeholder.svg',
  },
};
