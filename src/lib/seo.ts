import type { CardConfig } from '../content/card.config';
import { toAssetUrl } from './runtime';

const upsertMeta = (selector: string, attribute: 'name' | 'property', value: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, selector.match(/"(.*)"/)?.[1] ?? '');
    document.head.appendChild(element);
  }

  element.content = value;
};

export const applySeo = (config: CardConfig) => {
  document.title = config.seo.title;
  upsertMeta('meta[name="description"]', 'name', config.seo.description);
  upsertMeta('meta[property="og:title"]', 'property', config.seo.ogTitle);
  upsertMeta('meta[property="og:description"]', 'property', config.seo.ogDescription);
  upsertMeta('meta[property="og:image"]', 'property', toAssetUrl(config.seo.ogImage));
};
