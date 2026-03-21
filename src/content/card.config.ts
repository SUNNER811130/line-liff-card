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
  brand: 'BUSINESS CONTACT CARD',
  englishName: 'Alex Chen',
  heroTitle: 'Professional Contact Gateway',
  mainTitle: '整合聯絡方式、品牌介紹與洽詢入口的正式商務電子名片',
  description:
    '適用於商務開發、品牌介紹與客戶初次接觸。頁面保留專業視覺與行動導流能力，並可透過 LIFF 在 LINE 內直接分享給好友。',
  bullets: ['正式商務視覺版型', '支援 GitHub Pages 對外展示', '支援 LIFF 分享與公開網址 QR'],
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
    title: 'Alex Chen | LINE 電子名片',
    description: '正式商務風格的 LINE 電子名片，可部署到 GitHub Pages 並支援 LIFF 分享。',
    ogTitle: 'Alex Chen | LINE 電子名片',
    ogDescription: '正式商務風格的 LINE 電子名片，可部署到 GitHub Pages 並支援 LIFF 分享。',
    ogImage: 'images/og-placeholder.svg',
  },
};
