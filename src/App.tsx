import { useEffect } from 'react';
import { CardPage } from './components/CardPage';
import { cards, defaultCardSlug, getCardBySlug } from './content/cards';
import { applyBasicSeo } from './lib/seo';
import { getAppHomePath, getCardPath, resolveAppRoute } from './lib/routes';

const homeTitle = 'LINE 電子名片列表';
const homeDescription = '多張可分享的 LINE 電子名片列表，支援獨立 slug、LIFF 分享、QR 與 Web fallback。';

function HomePage() {
  useEffect(() => {
    applyBasicSeo(homeTitle, homeDescription);
  }, []);

  return (
    <main className="page-shell">
      <section className="list-hero">
        <p className="list-eyebrow">Business Card Collection</p>
        <h1 className="list-title">多名片版本首頁</h1>
        <p className="list-description">
          從同一個 repo 管理多張可展示、可分享、可掃 QR 的 LINE 電子名片。每張卡都對應自己的 slug 路由與 LIFF 分享入口。
        </p>
      </section>

      <section className="card-list-grid">
        {cards.map((card) => (
          <article key={card.slug} className="list-card">
            <p className="list-card-brand">{card.brand}</p>
            <h2 className="list-card-title">{card.englishName}</h2>
            <p className="list-card-subtitle">{card.mainTitle}</p>
            <p className="list-card-url">{getCardPath(card.slug)}</p>
            <div className="list-card-actions">
              <a className="list-card-button" href={getCardPath(card.slug)}>
                開啟名片
              </a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function NotFoundPage({ slug }: { slug: string | null }) {
  useEffect(() => {
    applyBasicSeo('404 | 找不到名片', '指定的電子名片 slug 不存在，請回到名片列表頁重新選擇。');
  }, []);

  return (
    <main className="page-shell">
      <section className="not-found-panel">
        <p className="list-eyebrow">404 / Fallback</p>
        <h1 className="list-title">找不到這張名片</h1>
        <p className="list-description">
          {slug ? `slug「${slug}」不存在。` : '指定路徑不存在。'}請回到列表頁，或直接開啟預設名片。
        </p>
        <div className="not-found-actions">
          <a className="list-card-button" href={getAppHomePath()}>
            返回名片列表
          </a>
          <a className="list-card-button list-card-button-secondary" href={getCardPath(defaultCardSlug)}>
            開啟預設名片
          </a>
        </div>
      </section>
    </main>
  );
}

export function App() {
  const route = resolveAppRoute(window.location.pathname);

  if (route.kind === 'home') {
    return <HomePage />;
  }

  if (route.kind === 'card') {
    const card = getCardBySlug(route.slug);
    return card ? <CardPage config={card} /> : <NotFoundPage slug={route.slug} />;
  }

  return <NotFoundPage slug={route.slug} />;
}
