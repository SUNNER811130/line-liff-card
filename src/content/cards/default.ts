import type { CardConfig } from './types';

export const defaultCard: CardConfig = {
  slug: 'default',
  theme: 'corporate',
  brand: '品牌名稱',
  fullName: '姓名',
  title: '職稱',
  headline: '正式商務電子名片',
  intro:
    '這裡可替換為您的品牌定位、專業介紹與合作方式，讓客戶在 LINE 內或瀏覽器開啟時，都能快速理解您的角色與下一步聯絡方式。',
  highlights: ['突出品牌識別與個人職務定位', '適合首次認識、後續追蹤與商務合作交流', '支援 LINE 內分享與一般網頁開啟的相容流程'],
  heroImage: 'images/hero-placeholder.svg',
  heroLink: '#actions',
  contactAction: {
    label: '聯絡',
    url: '#connect',
  },
  bookingAction: {
    label: '預約',
    url: '#booking',
  },
  qrEnabled: true,
  seo: {
    title: '正式商務電子名片',
    description: '正式版 LINE 電子名片，支援 LINE 內分享與網頁相容開啟。',
    ogTitle: '正式商務電子名片',
    ogDescription: '正式版 LINE 電子名片，支援 LINE 內分享與網頁相容開啟。',
    ogImage: 'images/og-placeholder.svg',
  },
};
