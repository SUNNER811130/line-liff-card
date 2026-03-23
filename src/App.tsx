import { useEffect, useState } from 'react';
import { AdminPage } from './components/AdminPage';
import { CardPage } from './components/CardPage';
import { defaultCardSlug } from './content/cards';
import type { CardConfig } from './content/cards/types';
import { CardNotFoundError, getBundledPrimaryCard, loadRuntimeCard } from './lib/card-source';
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

function LoadingPage() {
  useEffect(() => {
    applyBasicSeo('載入電子名片中', '正在載入正式電子名片內容。');
  }, []);

  return (
    <main className="page-shell">
      <section className="not-found-panel">
        <p className="eyebrow">Loading</p>
        <h1 className="not-found-title">正在載入電子名片</h1>
        <p className="not-found-copy">系統正在確認正式資料來源，若遠端不可用會自動改用 bundled config。</p>
      </section>
    </main>
  );
}

function RuntimeCardRoute({ slug }: { slug: string }) {
  const [config, setConfig] = useState<CardConfig | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    setConfig(null);
    setMissing(false);

    void loadRuntimeCard(slug)
      .then((result) => {
        if (active) {
          setConfig(result.config);
        }
      })
      .catch((error) => {
        if (active) {
          if (error instanceof CardNotFoundError) {
            setMissing(true);
            return;
          }

          setConfig(getBundledPrimaryCard());
        }
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (missing) {
    return <NotFoundPage slug={slug} />;
  }

  return config ? <CardPage config={config} /> : <LoadingPage />;
}

export function App() {
  const route = resolveAppRoute(window.location.pathname);

  if (route.kind === 'home') {
    return <RuntimeCardRoute slug={defaultCardSlug} />;
  }

  if (route.kind === 'admin') {
    return <AdminPage />;
  }

  if (route.kind === 'card') {
    return <RuntimeCardRoute slug={route.slug} />;
  }

  return <NotFoundPage slug={route.slug} />;
}
