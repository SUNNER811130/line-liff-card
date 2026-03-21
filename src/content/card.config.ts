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
  brand: 'LINE LIFF CARD',
  englishName: 'Alex Chen',
  heroTitle: 'Smart Business Profile',
  mainTitle: '把聯絡方式、服務亮點與行動入口整合成一張正式可分享的電子名片',
  description:
    '這是一個可部署到 GitHub Pages 的 LINE 電子名片 v1 靜態站。內容集中在本地設定檔，適合先快速上線展示，再視需求接上 LIFF 或後端服務。',
  bullets: ['手機優先閱讀體驗', '可快速替換文案與圖片', '支援公開網址 QR 與複製分享'],
  heroImage: 'images/hero-placeholder.svg',
  heroLink: 'https://example.com',
  button1: {
    label: '加入 LINE',
    color: '#06c755',
    url: 'https://lin.ee/example',
  },
  button2: {
    label: '官方網站',
    color: '#0f4cdb',
    url: 'https://example.com',
  },
  button3: {
    label: '預約洽詢',
    color: '#ff8a00',
    url: 'mailto:alex@example.com',
  },
  qrEnabled: true,
  seo: {
    title: 'Alex Chen | LINE 電子名片',
    description: '商務專業風格的 LINE 電子名片範例，可作為 GitHub Pages 靜態站部署。',
    ogTitle: 'Alex Chen | LINE 電子名片',
    ogDescription: '商務專業風格的 LINE 電子名片範例，可作為 GitHub Pages 靜態站部署。',
    ogImage: 'images/og-placeholder.svg',
  },
};
