import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { CardConfig } from '../content/cards/types';
import {
  buildShareTargetUrl,
  createPermanentLink,
  ensureLogin,
  getConfiguredLiffId,
  getLineProfile,
  initLiff,
  isInClient,
  isLoggedIn,
  isShareAvailable,
  shareCard,
  type LineProfile,
} from '../lib/liff';
import { getAppMode, navigateToUrl, resolveActionUrl, toAssetUrl } from '../lib/runtime';
import { getCardShareUrl, getCardWebUrl } from '../lib/routes';
import { applySeo } from '../lib/seo';

type CardPageProps = {
  config: CardConfig;
};

const buttonEntries = (config: CardConfig) => [config.button1, config.button2, config.button3];

const buildFlexMessage = (config: CardConfig, shareUrl: string, fallbackUrl: string) => ({
  type: 'flex' as const,
  altText: `${config.englishName} | ${config.heroTitle}`,
  contents: {
    type: 'bubble' as const,
    hero: {
      type: 'image' as const,
      url: toAssetUrl(config.heroImage),
      size: 'full' as const,
      aspectRatio: '4:3' as const,
      aspectMode: 'cover' as const,
      action: {
        type: 'uri' as const,
        label: config.englishName,
        uri: shareUrl,
      },
    },
    body: {
      type: 'box' as const,
      layout: 'vertical' as const,
      spacing: 'md' as const,
      contents: [
        {
          type: 'text' as const,
          text: config.brand,
          size: 'xs' as const,
          weight: 'bold' as const,
          color: config.theme === 'corporate' ? '#284e86' : '#84514f',
        },
        {
          type: 'text' as const,
          text: config.mainTitle,
          wrap: true,
          weight: 'bold' as const,
          size: 'xl' as const,
          color: '#1e2530',
        },
        {
          type: 'text' as const,
          text: config.description,
          wrap: true,
          size: 'sm' as const,
          color: '#596579',
        },
        {
          type: 'separator' as const,
          margin: 'md' as const,
        },
        {
          type: 'text' as const,
          text: shareUrl,
          wrap: true,
          size: 'xs' as const,
          color: '#6e7888',
        },
      ],
    },
    footer: {
      type: 'box' as const,
      layout: 'vertical' as const,
      spacing: 'sm' as const,
      contents: buttonEntries(config).map((button) => ({
        type: 'button' as const,
        style: 'primary' as const,
        color: button.color,
        action: {
          type: 'uri' as const,
          label: button.label,
          uri: resolveActionUrl(button.url, fallbackUrl),
        },
      })),
    },
  },
});

const themeCopy = {
  corporate: {
    sectionLabel: 'Enterprise Card',
    qrTitle: 'Corporate Landing QR',
    summaryLabel: 'Business Card System',
  },
  consultant: {
    sectionLabel: 'Private Advisory Card',
    qrTitle: 'Private Consultation QR',
    summaryLabel: 'Consulting Signature Page',
  },
} as const;

export function CardPage({ config }: CardPageProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [shareState, setShareState] = useState<'idle' | 'shared' | 'failed'>('idle');
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [liffInitError, setLiffInitError] = useState<string | null>(null);
  const [liffActionError, setLiffActionError] = useState<string | null>(null);
  const [lineProfile, setLineProfile] = useState<LineProfile | null>(null);
  const [profileHint, setProfileHint] = useState<string | null>(null);
  const [liffReady, setLiffReady] = useState(false);
  const [inClient, setInClient] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [shareAvailable, setShareAvailable] = useState(false);
  const liffEnabled = Boolean(getConfiguredLiffId());
  const pageUrl = getCardWebUrl(config.slug);
  const liffUrl = getCardShareUrl(config.slug);
  const shareUrl = liffUrl || pageUrl;
  const connectUrl = resolveActionUrl(config.button1.url, pageUrl);
  const overviewUrl = resolveActionUrl(config.button2.url, pageUrl);
  const bookingUrl = resolveActionUrl(config.button3.url, pageUrl);
  const heroUrl = resolveActionUrl(config.heroLink, pageUrl);
  const mode = getAppMode({
    hasLiffId: liffEnabled,
    inClient,
    shareAvailable,
    initFailed: Boolean(liffInitError),
  });

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

      if (result.status === 'error') {
        setLiffInitError(result.message);
        setLiffReady(false);
        setProfileHint('目前無法啟用 LINE 個人化資訊。');
        return;
      }

      if (result.status === 'disabled') {
        setLiffReady(false);
        setProfileHint('未設定 LIFF 時，頁面會以一般公開名片模式顯示。');
        return;
      }

      const nextInClient = await isInClient();
      const nextLoggedIn = await isLoggedIn();
      const nextShareAvailable = await isShareAvailable();
      const profileResult = await getLineProfile();

      if (!mounted) {
        return;
      }

      setLiffInitError(null);
      setLiffReady(true);
      setInClient(nextInClient);
      setLoggedIn(nextLoggedIn);
      setShareAvailable(nextShareAvailable);

      if (profileResult.status === 'ready') {
        setLineProfile(profileResult.profile);
        setProfileHint(null);
        return;
      }

      setLineProfile(null);
      setProfileHint(nextInClient || nextLoggedIn ? profileResult.message : '目前未進入可讀取個人資料的 LINE 情境。');
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
        dark: config.theme === 'corporate' ? '#163863' : '#23493f',
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
  }, [config.qrEnabled, config.theme, pageUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
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

  const handleShare = async () => {
    setShareState('idle');
    setShareStatus(null);
    setLiffActionError(null);

    if (inClient) {
      if (!loggedIn) {
        void ensureLogin();
        setShareState('failed');
        setLiffActionError('尚未登入 LINE，請先登入後再分享。');
        return;
      }

      if (!shareAvailable) {
        setShareState('failed');
        setLiffActionError('目前 LINE 環境不支援 shareTargetPicker。');
        return;
      }

      try {
        const permanentLink = await createPermanentLink(pageUrl);
        const shared = await shareCard([buildFlexMessage(config, permanentLink, pageUrl)]);
        if (shared) {
          setShareState('shared');
          setShareStatus('已開啟 LINE 分享對象選擇器。');
        } else {
          setShareState('failed');
          setLiffActionError('已取消分享，尚未送出給好友。');
        }
      } catch (error) {
        setShareState('failed');
        setLiffActionError(error instanceof Error ? error.message : '分享失敗，請稍後再試。');
      }
      return;
    }

    try {
      navigateToUrl(await buildShareTargetUrl(pageUrl));
      setShareStatus('正在切換到 LINE 開啟 LIFF 名片。');
    } catch (error) {
      setShareState('failed');
      setLiffActionError(error instanceof Error ? error.message : '建立分享入口失敗。');
    }
  };

  const mainAction = (() => {
    if (!liffEnabled) {
      return {
        label: 'LIFF 尚未設定',
        detail: '目前只提供公開網頁模式與 QR。',
        disabled: true,
        onClick: undefined,
      };
    }

    if (inClient && loggedIn && shareAvailable) {
      return {
        label: '分享好友',
        detail: '使用 shareTargetPicker 傳送這張名片。',
        disabled: false,
        onClick: handleShare,
      };
    }

    if (inClient && !loggedIn) {
      return {
        label: '請先登入 LINE',
        detail: '登入後即可使用分享好友與個人化資料。',
        disabled: false,
        onClick: () => {
          void ensureLogin();
        },
      };
    }

    return {
      label: '在 LINE 中開啟名片',
        detail: '外部瀏覽器會改導向 card-specific LIFF URL，避免回跳列表。',
        disabled: false,
        onClick: () => {
          navigateToUrl(shareUrl);
        },
      };
  })();

  const operationalStatus = (() => {
    if (!liffEnabled) {
      return '目前以公開網頁模式展示。';
    }

    if (liffInitError) {
      return 'LIFF 初始化失敗，請改由正式 LIFF URL 開啟。';
    }

    if (!inClient) {
      return '目前為外部瀏覽器模式，可檢視內容、複製網址或切回 LINE。';
    }

    if (!loggedIn) {
      return '已在 LINE 內，但尚未登入 LINE 帳號。';
    }

    if (!shareAvailable) {
      return '已在 LINE 內，但目前容器不支援 shareTargetPicker。';
    }

    return '目前可直接分享好友，且已保留 LIFF 個人化資訊顯示。';
  })();

  return (
    <main className={`page-shell theme-${config.theme}`}>
      <section className={`card-layout card-layout-${config.theme}`}>
        <article className={`card-panel card-panel-${config.theme}`} data-theme={config.theme}>
          <div className="media-column">
            <a className="hero-link" href={heroUrl} target="_blank" rel="noreferrer">
              <img className="hero-image" src={toAssetUrl(config.heroImage)} alt={config.englishName} />
            </a>
            <div className="media-overlay">
              <span className="media-badge">{themeCopy[config.theme].sectionLabel}</span>
              <div className="media-summary">
                <p className="media-summary-label">{themeCopy[config.theme].summaryLabel}</p>
                <p className="media-summary-title">{config.shortTagline}</p>
              </div>
            </div>
          </div>

          <div className="content-column">
            <div className="topline">
              <span className="brand-chip">{config.brand}</span>
              <span className={`mode-chip mode-${mode.toLowerCase()}`}>{mode}</span>
            </div>

            <p className="english-name">{config.englishName}</p>
            <h1 className="hero-title">{config.heroTitle}</h1>
            <p className="main-title">{config.mainTitle}</p>
            <p className="description">{config.description}</p>

            <section className="profile-panel">
              <div className="profile-panel-header">
                <p className="profile-panel-title">LIFF badge / 狀態區</p>
              </div>
              {lineProfile ? (
                <div className="profile-card">
                  {lineProfile.pictureUrl ? (
                    <img className="profile-avatar" src={lineProfile.pictureUrl} alt={lineProfile.displayName} />
                  ) : (
                    <div className="profile-avatar profile-avatar-fallback">{lineProfile.displayName.slice(0, 1)}</div>
                  )}
                  <div className="profile-copy">
                    <p className="profile-label">目前登入 LINE 使用者</p>
                    <p className="profile-name">{lineProfile.displayName}</p>
                    <p className="profile-note">個人化顯示已啟用，分享時仍維持卡片版面。</p>
                  </div>
                </div>
              ) : (
                <p className="profile-note">{profileHint ?? '目前未顯示個人化資訊。'}</p>
              )}
            </section>

            <div className="status-strip" aria-live="polite">
              <span className="status-strip-label">Status</span>
              <p className="status-strip-text">{operationalStatus}</p>
            </div>

            <section id="overview" className="info-block">
              <p className="section-heading">Overview</p>
              <ul className="bullet-list">
                {config.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </section>

            <section id="connect" className="action-block">
              <div className="action-block-header">
                <p className="section-heading">主操作區</p>
                <p className="action-block-copy">保留分享好友、品牌導流與公開網址 fallback。</p>
              </div>
              <div className="button-grid">
                {[{ ...config.button1, url: connectUrl }, { ...config.button2, url: overviewUrl }, { ...config.button3, url: bookingUrl }].map((button) => (
                  <a
                    key={button.label}
                    className={`cta-button cta-button-${config.theme}`}
                    href={button.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ backgroundColor: button.color }}
                  >
                    {button.label}
                  </a>
                ))}
              </div>
            </section>

            <section id="booking" className="liff-panel">
              <div className="liff-panel-header">
                <div>
                  <p className="liff-panel-title">Main Action</p>
                  <p className="liff-panel-subtitle">LINE 內與外部瀏覽器分開處理，但都維持同一張卡的正式入口。</p>
                </div>
                <span className={`liff-status-chip ${liffReady ? 'is-ready' : 'is-pending'}`}>
                  {liffReady ? 'ready' : 'standby'}
                </span>
              </div>

              <div className="liff-action-card">
                <p className="liff-action-eyebrow">分享行為</p>
                <h2 className="liff-action-title">{mainAction.label}</h2>
                <p className="liff-message">{mainAction.detail}</p>
                <button
                  type="button"
                  className={`utility-button utility-button-liff utility-button-${config.theme}`}
                  onClick={mainAction.onClick}
                  disabled={mainAction.disabled}
                >
                  {mainAction.label}
                </button>
              </div>

              {liffActionError && <p className="liff-message liff-message-error">{liffActionError}</p>}
              {shareStatus && (
                <p className={`liff-message ${shareState === 'shared' ? 'liff-message-success' : ''}`}>{shareStatus}</p>
              )}
            </section>
          </div>
        </article>

        <aside className={`qr-panel qr-panel-${config.theme}`}>
          <section className="qr-card">
            <p className="qr-label">{themeCopy[config.theme].qrTitle}</p>
            <h2 className="qr-title">Public URL</h2>
            <p className="public-url">{pageUrl}</p>
            <div className="utility-actions">
              <button type="button" className="utility-button utility-button-secondary" onClick={handleCopy}>
                {copyState === 'copied' ? '已複製公開網址' : copyState === 'failed' ? '複製失敗，請重試' : '複製公開網址'}
              </button>
              <button type="button" className="utility-button utility-button-secondary" onClick={handleShare}>
                {inClient ? '分享好友' : '切到 LINE 開啟'}
              </button>
            </div>
          </section>

          <section className="link-matrix">
            <div>
              <p className="qr-label">Web URL</p>
              <p className="link-matrix-value">{pageUrl}</p>
            </div>
            <div>
              <p className="qr-label">LIFF URL</p>
              <p className="link-matrix-value">{liffUrl || '未設定 LIFF ID'}</p>
            </div>
            <div>
              <p className="qr-label">Share URL</p>
              <p className="link-matrix-value">{shareUrl}</p>
            </div>
          </section>

          {config.qrEnabled && qrDataUrl ? (
            <section className="qr-card">
              <img className="qr-image" src={qrDataUrl} alt={`${config.englishName} QR code`} />
              <button type="button" className="utility-button utility-button-secondary" onClick={handleDownload}>
                下載 QR Code
              </button>
            </section>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
