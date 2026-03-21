import { useEffect, useState, type MouseEvent } from 'react';
import { CardPage } from './components/CardPage';
import { cards, defaultCardSlug, getCardBySlug } from './content/cards';
import { initLiff, isInClient } from './lib/liff';
import { getAppHomePath, getCardPath, getCardShareUrl, getCardWebUrl, resolveAppRoute } from './lib/routes';
import { navigateToUrl } from './lib/runtime';
import { applyBasicSeo } from './lib/seo';

const homeTitle = 'LINE 電子名片列表';
const homeDescription = '多張可分享的 LINE 電子名片列表，支援獨立 slug、LIFF 分享、QR 與 Web fallback。';

function HomePage() {
  const [lineMode, setLineMode] = useState<'pending' | 'web' | 'liff'>('pending');

  useEffect(() => {
    applyBasicSeo(homeTitle, homeDescription);
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrapHomeLiff = async () => {
      const initResult = await initLiff();
      if (!mounted) {
        return;
      }

      if (initResult.status !== 'ready') {
        setLineMode('web');
        return;
      }

      setLineMode((await isInClient()) ? 'liff' : 'web');
    };

    void bootstrapHomeLiff();

    return () => {
      mounted = false;
    };
  }, []);

  const openCard = (event: MouseEvent<HTMLAnchorElement>, slug: string) => {
    const targetUrl = lineMode === 'liff' ? getCardShareUrl(slug) : getCardWebUrl(slug);
    event.preventDefault();
    navigateToUrl(targetUrl);
  };

  return (
    <main className="page-shell">
      <section className="list-hero">
        <div>
          <p className="list-eyebrow">Business Card Collection</p>
          <h1 className="list-title">多名片版本首頁</h1>
        </div>
        <div className="list-hero-side">
          <p className="list-description">
            列表頁會依目前環境自動選擇最穩定的入口。在 LINE 內優先走 card-specific LIFF URL，在外部瀏覽器則維持公開 Web 路由。
          </p>
          <div className="list-hero-status">
            <span className={`list-mode-pill list-mode-${lineMode}`}>
              {lineMode === 'pending' ? 'LIFF checking' : lineMode === 'liff' ? 'Open via LIFF URL' : 'Open via Web URL'}
            </span>
            <p className="list-status-note">
              {lineMode === 'pending'
                ? '等待 LIFF 初始化完成後再切換卡片，避免 secondary redirect 把畫面拉回列表。'
                : lineMode === 'liff'
                  ? '目前偵測到 LINE / LIFF 容器，開啟名片會直接使用每張卡自己的 LIFF URL。'
                  : '目前為一般瀏覽器模式，開啟名片會維持 /card/:slug 公開網址。'}
            </p>
          </div>
        </div>
      </section>

      <section className="card-list-grid">
        {cards.map((card) => {
          const webUrl = getCardWebUrl(card.slug);
          const liffUrl = getCardShareUrl(card.slug);

          return (
            <article key={card.slug} className={`list-card list-card-${card.theme}`}>
              <div className="list-card-preview">
                <div className="list-card-preview-shell">
                  <p className="list-card-brand">{card.brand}</p>
                  <h2 className="list-card-title">{card.englishName}</h2>
                  <p className="list-card-subtitle">{card.shortTagline}</p>
                </div>
              </div>

              <div className="list-card-copy">
                <p className="list-card-theme">{card.theme === 'corporate' ? '企業穩重型' : '高端顧問型'}</p>
                <p className="list-card-main">{card.mainTitle}</p>
                <p className="list-card-description">{card.description}</p>
              </div>

              <dl className="list-card-meta">
                <div>
                  <dt>Web URL</dt>
                  <dd>{webUrl}</dd>
                </div>
                <div>
                  <dt>LIFF URL</dt>
                  <dd>{liffUrl || '未設定 LIFF ID'}</dd>
                </div>
              </dl>

              <div className="list-card-actions">
                <a
                  className="list-card-button"
                  href={getCardPath(card.slug)}
                  onClick={(event) => openCard(event, card.slug)}
                  aria-label={`開啟名片 ${card.englishName}`}
                >
                  開啟名片
                </a>
              </div>
            </article>
          );
        })}
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
