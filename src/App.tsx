import { useEffect } from 'react';
import { AdminPage } from './components/AdminPage';
import { CardPage } from './components/CardPage';
import { defaultCardSlug, getCardBySlug, primaryCard } from './content/cards';
import { getAppHomePath, getCardPath, resolveAppRoute } from './lib/routes';
import { applyBasicSeo } from './lib/seo';

const notFoundTitle = '找不到電子名片';
const notFoundDescription = '指定的電子名片路徑不存在，請返回正式名片頁。';

function NotFoundPage({ slug }: { slug: string | null }) {
  useEffect(() => {
    applyBasicSeo(notFoundTitle, notFoundDescription);
  }, []);

  return (
    <main className="page-shell">
      <section className="not-found-panel">
        <p className="eyebrow">404</p>
        <h1 className="not-found-title">找不到這張電子名片</h1>
        <p className="not-found-copy">{slug ? `目前沒有「${slug}」這個頁面。` : '指定路徑不存在。'}</p>
        <div className="not-found-actions">
          <a className="action-button action-button-primary" href={getAppHomePath()}>
            返回首頁
          </a>
          <a className="action-button action-button-secondary" href={getCardPath(defaultCardSlug)}>
            開啟正式電子名片
          </a>
        </div>
      </section>
    </main>
  );
}

export function App() {
  const route = resolveAppRoute(window.location.pathname);

  if (route.kind === 'home') {
    return <CardPage config={primaryCard} />;
  }

  if (route.kind === 'admin') {
    return <AdminPage />;
  }

  if (route.kind === 'card') {
    const card = getCardBySlug(route.slug);
    return card ? <CardPage config={card} /> : <NotFoundPage slug={route.slug} />;
  }

  return <NotFoundPage slug={route.slug} />;
}
