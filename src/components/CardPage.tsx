import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { CardConfig } from '../content/cards/types';
import { buildCardActionItems } from '../lib/card-actions';
import { ensureLogin, getConfiguredLiffId, initLiff, isInClient, isLoggedIn, isShareAvailable } from '../lib/liff';
import { resolveActionUrl, toAssetUrl } from '../lib/runtime';
import { getCardWebUrl } from '../lib/routes';
import { applySeo } from '../lib/seo';
import { shareDigitalCard } from '../lib/share';

type CardPageProps = {
  config: CardConfig;
};

const shareHintByState = {
  ready: '在 LINE 內可直接分享給好友，瀏覽器中則會自動改用相容分享流程。',
  login: '請先登入 LINE，之後即可直接分享這張電子名片。',
  fallback: '目前以網頁版顯示，分享時會自動切換到可用方式。',
} as const;

export function CardPage({ config }: CardPageProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [liffReady, setLiffReady] = useState(false);
  const [inClient, setInClient] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [shareAvailable, setShareAvailable] = useState(false);
  const [liffInitError, setLiffInitError] = useState<string | null>(null);
  const liffEnabled = Boolean(getConfiguredLiffId());
  const pageUrl = getCardWebUrl(config.slug);
  const heroUrl = resolveActionUrl(config.heroLink, pageUrl);
  const contactUrl = resolveActionUrl(config.contactAction.url, pageUrl);
  const bookingUrl = resolveActionUrl(config.bookingAction.url, pageUrl);

  useEffect(() => {
    applySeo(config);
  }, [config]);

  useEffect(() => {
    let mounted = true;

    const bootstrapLiff = async () => {
      const result = await initLiff();
      if (!mounted) {
        return;
      }

      if (result.status !== 'ready') {
        setLiffReady(false);
        setLiffInitError(result.status === 'error' ? result.message : null);
        return;
      }

      const [nextInClient, nextLoggedIn, nextShareAvailable] = await Promise.all([
        isInClient(),
        isLoggedIn(),
        isShareAvailable(),
      ]);

      if (!mounted) {
        return;
      }

      setLiffReady(true);
      setLiffInitError(null);
      setInClient(nextInClient);
      setLoggedIn(nextLoggedIn);
      setShareAvailable(nextShareAvailable);
    };

    void bootstrapLiff();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!config.qrEnabled) {
      return;
    }

    let mounted = true;

    QRCode.toDataURL(pageUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: '#17355e',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (mounted) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (mounted) {
          setQrDataUrl('');
        }
      });

    return () => {
      mounted = false;
    };
  }, [config.qrEnabled, pageUrl]);

  const handleShare = async () => {
    setIsSharing(true);
    setShareMessage(null);
    setShareError(null);

    if (inClient && liffEnabled && !loggedIn) {
      void ensureLogin();
      setIsSharing(false);
      setShareError('請先登入 LINE 後再分享。');
      return;
    }

    try {
      const result = await shareDigitalCard({
        config,
        pageUrl,
        inClient,
        shareAvailable,
      });
      setShareMessage(result.message);
    } catch (error) {
      setShareError(error instanceof Error ? error.message : '目前無法分享電子名片，請稍後再試。');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${config.slug}-qr.png`;
    link.click();
  };

  const actionItems = buildCardActionItems({
    config,
    contactUrl,
    bookingUrl,
    onShare: handleShare,
    shareDisabled: isSharing,
  });

  const shareHint = (() => {
    if (inClient && loggedIn && shareAvailable) {
      return shareHintByState.ready;
    }

    if (inClient && liffReady && !loggedIn) {
      return shareHintByState.login;
    }

    if (liffInitError) {
      return shareHintByState.fallback;
    }

    return liffEnabled ? shareHintByState.fallback : '目前可作為正式電子名片頁使用，之後可再補上 LINE 分享設定。';
  })();

  return (
    <main className="page-shell">
      <section className="card-surface">
        <article className="identity-panel">
          <div className="identity-copy">
            <p className="eyebrow">{config.brand}</p>
            <h1 className="person-name">{config.fullName}</h1>
            <p className="person-title">{config.title}</p>
            <p className="headline">{config.headline}</p>
            <p className="intro">{config.intro}</p>
          </div>

          <a className="hero-frame" href={heroUrl} target="_blank" rel="noreferrer">
            <img className="hero-image" src={toAssetUrl(config.heroImage)} alt={config.fullName} />
          </a>
        </article>

        <section className="content-grid">
          <article className="content-card">
            <p className="section-label">專業簡介</p>
            <ul className="highlight-list">
              {config.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          </article>

          <article className="content-card content-card-accent">
            <p className="section-label">分享說明</p>
            <p className="support-copy">{shareHint}</p>
            {(shareMessage || shareError) && (
              <p className={`feedback-message ${shareError ? 'is-error' : 'is-success'}`}>{shareError ?? shareMessage}</p>
            )}
          </article>
        </section>

        <section id="actions" className="actions-panel">
          <div className="actions-header">
            <div>
              <p className="section-label">主要操作</p>
              <h2 className="actions-title">保持正式、直接、可立即聯絡</h2>
            </div>
          </div>

          <div className="action-grid">
            {actionItems.map((action) =>
              action.kind === 'link' ? (
                <a
                  key={action.key}
                  className={`action-button action-button-${action.tone}`}
                  href={action.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {action.label}
                </a>
              ) : (
                <button
                  key={action.key}
                  type="button"
                  className="action-button action-button-share"
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {isSharing ? '分享中...' : action.label}
                </button>
              ),
            )}
          </div>
        </section>

        {config.qrEnabled && qrDataUrl ? (
          <aside className="qr-panel">
            <div>
              <p className="section-label">名片 QR Code</p>
              <p className="support-copy">適合面對面交換資訊、簡報現場展示或印刷物延伸使用。</p>
            </div>
            <img className="qr-image" src={qrDataUrl} alt={`${config.fullName} QR code`} />
            <button type="button" className="action-button action-button-secondary qr-download" onClick={handleDownload}>
              下載 QR Code
            </button>
          </aside>
        ) : null}
      </section>
    </main>
  );
}
