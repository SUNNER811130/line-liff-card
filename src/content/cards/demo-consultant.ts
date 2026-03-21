import type { CardConfig } from './types';

export const demoConsultantCard: CardConfig = {
  slug: 'demo-consultant',
  brand: 'ADVISORY PRACTICE',
  englishName: 'Demo Consultant Studio',
  heroTitle: '策略顧問、簡報提案與客戶洽談的一站式名片頁',
  mainTitle: '面向專案開發、顧問服務與企業合作的展示型電子名片',
  description:
    '適合顧問型服務、專業講師或自由接案者，將服務簡介、品牌入口與預約洽詢集中在同一張可分享的 LIFF 名片頁。',
  bullets: ['適合顧問服務與企業合作提案', '支援獨立 slug 分享與 QR 展示', '保留 LIFF、Web fallback 與 permanent link'],
  heroImage: 'images/hero-placeholder.svg',
  heroLink: '#overview',
  button1: {
    label: '加入 LINE 顧問窗口',
    color: '#06c755',
    url: '#connect',
  },
  button2: {
    label: '服務方案',
    color: '#0f4cdb',
    url: '#overview',
  },
  button3: {
    label: '預約顧問諮詢',
    color: '#ff8a00',
    url: '#booking',
  },
  qrEnabled: true,
  seo: {
    title: 'Demo Consultant Studio | LINE 電子名片',
    description: '顧問型服務的 LINE 電子名片示範頁，支援獨立 slug、QR、LIFF 分享與 Web fallback。',
    ogTitle: 'Demo Consultant Studio | LINE 電子名片',
    ogDescription: '顧問型服務的 LINE 電子名片示範頁，支援獨立 slug、QR、LIFF 分享與 Web fallback。',
    ogImage: 'images/og-placeholder.svg',
  },
};
