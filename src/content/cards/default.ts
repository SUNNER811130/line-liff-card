import { defineCardConfig } from './schema';

export const defaultCard = defineCardConfig({
  id: 'formal-business-card',
  slug: 'default',
  isPrimary: true,
  legacySlugs: ['demo-consultant'],
  appearance: {
    theme: 'executive',
    layout: 'profile-right',
  },
  modules: {
    showHighlights: true,
    showSharePanel: true,
    showQrCode: true,
  },
  photo: {
    src: 'images/hero-placeholder.svg',
    alt: '正式電子名片主視覺',
    link: '#actions',
  },
  content: {
    brandName: '品牌名稱',
    fullName: '姓名',
    title: '職稱',
    headline: '正式商務電子名片',
    subheadline: '可持續更新、可對外使用、可作為後續後台資料來源',
    intro:
      '這裡可替換為您的品牌定位、專業介紹與合作方式，讓客戶在 LINE 內或瀏覽器開啟時，都能快速理解您的角色與下一步聯絡方式。',
    highlightsTitle: '專業簡介',
    highlights: ['突出品牌識別與個人職務定位', '適合首次認識、後續追蹤與商務合作交流', '支援 LINE 內分享與一般網頁開啟的相容流程'],
    actionsTitle: '主要操作',
    actionsDescription: '一般按鈕由設定資料控制，分享按鈕由系統固定附加在最後。',
    sharePanelTitle: '分享說明',
  },
  actions: [
    {
      id: 'contact',
      label: '聯絡',
      url: '#connect',
      tone: 'primary',
      enabled: true,
    },
    {
      id: 'booking',
      label: '預約',
      url: '#booking',
      tone: 'secondary',
      enabled: true,
    },
  ],
  share: {
    title: '正式商務電子名片',
    text: '歡迎透過這張電子名片認識我並進一步聯絡。',
  },
  seo: {
    title: '正式商務電子名片',
    description: '正式版 LINE 電子名片，支援 LINE 內分享與網頁相容開啟。',
    ogTitle: '正式商務電子名片',
    ogDescription: '正式版 LINE 電子名片，支援 LINE 內分享與網頁相容開啟。',
    ogImage: 'images/og-placeholder.svg',
  },
});
