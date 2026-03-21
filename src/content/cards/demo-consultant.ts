import type { CardConfig } from './types';

export const demoConsultantCard: CardConfig = {
  slug: 'demo-consultant',
  theme: 'consultant',
  brand: 'ATELIER STRATEGY',
  englishName: 'Demo Consultant Studio',
  shortTagline: 'Private Advisory Practice',
  heroTitle: '高端顧問型名片，適合個人品牌、策略諮詢與預約洽談',
  mainTitle: '以更精緻的留白、排版節奏與品牌感呈現個人服務價值',
  description:
    '適合策略顧問、專業講師與高單價個人服務，讓定位、服務敘述、預約入口與分享行為集中在一張高端品牌名片頁。',
  bullets: ['留白更大，節奏更接近 editorial landing page', '適合高端顧問與個人品牌服務', '保留 LIFF 分享、公開網址與 QR 導流'],
  heroImage: 'images/hero-placeholder.svg',
  heroLink: '#overview',
  button1: {
    label: '加入顧問窗口',
    color: '#23493f',
    url: '#connect',
  },
  button2: {
    label: '閱讀服務',
    color: '#84514f',
    url: '#overview',
  },
  button3: {
    label: '預約諮詢',
    color: '#b38867',
    url: '#booking',
  },
  qrEnabled: true,
  seo: {
    title: 'Demo Consultant Studio | LINE 電子名片',
    description: '高端顧問型 LINE 電子名片，支援獨立 slug、QR、LIFF 分享與 Web fallback。',
    ogTitle: 'Demo Consultant Studio | LINE 電子名片',
    ogDescription: '高端顧問型 LINE 電子名片，支援獨立 slug、QR、LIFF 分享與 Web fallback。',
    ogImage: 'images/og-placeholder.svg',
  },
};
