export type CardLinkAction = {
  label: string;
  url: string;
};

export type CardConfig = {
  slug: string;
  theme: 'corporate' | 'consultant';
  brand: string;
  fullName: string;
  title: string;
  headline: string;
  intro: string;
  highlights: string[];
  heroImage: string;
  heroLink: string;
  contactAction: CardLinkAction;
  bookingAction: CardLinkAction;
  qrEnabled: boolean;
  seo: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
  };
};
