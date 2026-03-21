import { useEffect, useState, type CSSProperties } from 'react';
import QRCode from 'qrcode';
import type { CardConfig } from '../content/cards/types';
import { buildCardPageViewModel } from '../content/cards/view-model';
import { ensureLogin, getConfiguredLiffId, initLiff, isInClient, isLoggedIn, isShareAvailable } from '../lib/liff';
import { toAssetUrl } from '../lib/runtime';
import { getCardWebUrl } from '../lib/routes';
import { applySeo } from '../lib/seo';
import { shareDigitalCard } from '../lib/share';

type CardPageProps = {
  config: CardConfig;
  previewMode?: boolean;
  embedded?: boolean;
};

const shareHintByState = {
  ready: '在 LINE 內可直接分享給好友，瀏覽器中則會自動改用相容分享流程。',
  login: '請先登入 LINE，之後即可直接分享這張電子名片。',
  fallback: '目前以網頁版顯示，分享時會自動切換到可用方式。',
} as const;

export function CardPage({ config, previewMode = false, embedded = false }: CardPageProps) {
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

  useEffect(() => {
    applySeo(config);
  }, [config]);

  useEffect(() => {
    if (previewMode) {
      return;
    }

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
  }, [previewMode]);

  useEffect(() => {
    if (!config.modules.showQrCode) {
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
  }, [config.modules.showQrCode, pageUrl]);

  const handleShare = async () => {
    if (previewMode) {
      setShareError(null);
      setShareMessage('目前為管理頁預覽，分享按鈕規則已保留，實際分享請回正式名片頁測試。');
      return;
    }

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

  const viewModel = buildCardPageViewModel({
    config,
    pageUrl,
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

  const PageTag = embedded ? 'div' : 'main';

  return (
    <PageTag className="page-shell">
      <section
        className={`card-surface ${viewModel.appearance.cardSurfaceClassName}`}
        style={viewModel.appearance.cssVariables as CSSProperties}
      >
        <article className={`identity-panel layout-${config.appearance.layout}`}>
          <div className="identity-copy">
            <p className="eyebrow">{viewModel.identity.brandName}</p>
            <h1 className="person-name">{viewModel.identity.fullName}</h1>
            <p className="person-title">{viewModel.identity.title}</p>
            <p className="headline">{viewModel.summary.headline}</p>
            <p className="subheadline">{viewModel.summary.subheadline}</p>
            <p className="intro">{viewModel.summary.intro}</p>
          </div>

          <a className="hero-frame" href={viewModel.photo.href} target="_blank" rel="noreferrer">
            <img className="hero-image" src={toAssetUrl(viewModel.photo.src)} alt={viewModel.photo.alt} />
          </a>
        </article>

        <section className="content-grid">
          {viewModel.modules.showHighlights ? (
            <article className="content-card">
              <p className="section-label">{viewModel.highlights.title}</p>
              <ul className="highlight-list">
                {viewModel.highlights.items.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </article>
          ) : null}

          {viewModel.modules.showSharePanel ? (
            <article className="content-card content-card-accent">
              <p className="section-label">{viewModel.sharePanel.title}</p>
              <p className="support-copy">{shareHint}</p>
              {(shareMessage || shareError) && (
                <p className={`feedback-message ${shareError ? 'is-error' : 'is-success'}`}>{shareError ?? shareMessage}</p>
              )}
            </article>
          ) : null}
        </section>

        <section id="actions" className="actions-panel">
          <div className="actions-header">
            <div>
              <p className="section-label">{viewModel.actions.title}</p>
              <h2 className="actions-title">{viewModel.summary.headline}</h2>
              <p className="support-copy actions-copy">{viewModel.actions.description}</p>
            </div>
          </div>

          <div className="action-grid">
            {viewModel.actions.items.map((action) =>
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
                  {isSharing ? '分享中...' : viewModel.shareButtonLabel}
                </button>
              ),
            )}
          </div>
        </section>

        {viewModel.modules.showQrCode && qrDataUrl ? (
          <aside className="qr-panel">
            <div>
              <p className="section-label">名片 QR Code</p>
              <p className="support-copy">適合面對面交換資訊、簡報現場展示或印刷物延伸使用。</p>
            </div>
            <img className="qr-image" src={qrDataUrl} alt={`${viewModel.identity.fullName} QR code`} />
            <button type="button" className="action-button action-button-secondary qr-download" onClick={handleDownload}>
              下載 QR Code
            </button>
          </aside>
        ) : null}
      </section>
    </PageTag>
  );
}
