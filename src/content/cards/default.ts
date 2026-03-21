import type { CardConfig } from './types';

export const defaultCard: CardConfig = {
  slug: 'default',
  theme: 'corporate',
  brand: 'NORTHBRIDGE CLIENT SUCCESS',
  englishName: 'Client Success Office',
  shortTagline: 'Enterprise Relationship Desk',
  heroTitle: '穩健、清楚、可直接對外使用的企業級商務名片入口',
  mainTitle: '適合顧問、業務、客戶成功與 B2B 溝通的正式展示頁',
  description:
    '以企業穩重型版面整合公司識別、服務亮點、CTA、公開網址與 QR，適合客戶初次接觸、展會交換資訊與後續商務洽詢。',
  bullets: ['企業級資訊模組與清楚層級', '保留 GitHub Pages 公開網址與 LIFF 導流', '適合業務開發、客戶成功與正式提案場景'],
  heroImage: 'images/hero-placeholder.svg',
  heroLink: '#overview',
  button1: {
    label: '聯絡品牌窗口',
    color: '#143768',
    url: '#connect',
  },
  button2: {
    label: '服務亮點',
    color: '#284e86',
    url: '#overview',
  },
  button3: {
    label: '安排會談',
    color: '#6c7d95',
    url: '#booking',
  },
  qrEnabled: true,
  seo: {
    title: 'Northbridge Client Success | LINE 電子名片',
    description: '企業穩重型 LINE 電子名片，支援公開網址、QR、LIFF 分享與外部瀏覽器 fallback。',
    ogTitle: 'Northbridge Client Success | LINE 電子名片',
    ogDescription: '企業穩重型 LINE 電子名片，支援公開網址、QR、LIFF 分享與外部瀏覽器 fallback。',
    ogImage: 'images/og-placeholder.svg',
  },
};
