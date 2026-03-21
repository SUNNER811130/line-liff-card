export type CardButton = {
  label: string;
  color: string;
  url: string;
};

export type CardConfig = {
  slug: string;
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
