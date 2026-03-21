import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { CardConfig } from '../content/cards/types';
import {
  buildShareTargetUrl,
  createPermanentLink,
  ensureLogin,
  getConfiguredLiffId,
  getEndpointFallbackUrl,
  getExpectedEndpoint,
  getLiffEntryUrl,
  getLineProfile,
  initLiff,
  isCurrentUrlWithinEndpoint,
  isInClient,
  isLoggedIn,
  isShareAvailable,
  shareCard,
  type LineProfile,
} from '../lib/liff';
import { getAppMode, getPublicPageUrl, resolveActionUrl, toAssetUrl } from '../lib/runtime';
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
        uri: resolveActionUrl(config.heroLink, fallbackUrl),
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
          color: '#0f4cdb',
        },
        {
          type: 'text' as const,
          text: config.mainTitle,
          wrap: true,
          weight: 'bold' as const,
          size: 'xl' as const,
          color: '#162033',
        },
        {
          type: 'text' as const,
          text: config.description,
          wrap: true,
          size: 'sm' as const,
          color: '#41516d',
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
          color: '#61708a',
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

export function CardPage({ config }: CardPageProps) {
  const isDevDiagnostics = !import.meta.env.PROD;
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared' | 'failed'>('idle');
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [liffInitError, setLiffInitError] = useState<string | null>(null);
  const [liffActionError, setLiffActionError] = useState<string | null>(null);
  const [lineProfile, setLineProfile] = useState<LineProfile | null>(null);
  const [profileHint, setProfileHint] = useState<string | null>(null);
  const [liffReady, setLiffReady] = useState(false);
  const [inClient, setInClient] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [shareAvailable, setShareAvailable] = useState(false);
  const [expectedEndpoint, setExpectedEndpoint] = useState(getExpectedEndpoint());
  const pageUrl = getPublicPageUrl();
  const liffId = getConfiguredLiffId();
  const liffEnabled = Boolean(liffId);
  const liffEntryUrl = getLiffEntryUrl();
  const endpointFallbackUrl = getEndpointFallbackUrl();
  const inEndpointScope = isCurrentUrlWithinEndpoint(pageUrl);
  const connectUrl = resolveActionUrl(config.button1.url, liffEntryUrl || pageUrl || expectedEndpoint);
  const overviewUrl = resolveActionUrl(config.button2.url, pageUrl || expectedEndpoint);
  const bookingUrl = resolveActionUrl(config.button3.url, pageUrl || expectedEndpoint);
  const heroUrl = resolveActionUrl(config.heroLink, pageUrl || expectedEndpoint);
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
      setExpectedEndpoint(getExpectedEndpoint());
      const result = await initLiff();
      if (!mounted) {
        return;
      }

      if (result.status === 'error') {
        setLiffInitError(result.message);
        setLiffReady(false);
        setInClient(false);
        setLoggedIn(false);
        setShareAvailable(false);
        setLineProfile(null);
        setProfileHint('目前無法啟用 LINE 個人化資訊。');
        return;
      }

      if (result.status === 'disabled') {
        setLiffReady(false);
        setLiffInitError(null);
        setInClient(false);
        setLoggedIn(false);
        setShareAvailable(false);
        setLineProfile(null);
        setProfileHint('未設定 LIFF 時，頁面會以一般公開名片模式顯示。');
        return;
      }

      setLiffInitError(null);
      setLiffReady(true);
      const nextInClient = await isInClient();
      const nextLoggedIn = await isLoggedIn();
      setInClient(nextInClient);
      setLoggedIn(nextLoggedIn);
      setShareAvailable(await isShareAvailable());

      const profileResult = await getLineProfile();
      if (!mounted) {
        return;
      }

      if (profileResult.status === 'ready') {
        setLineProfile(profileResult.profile);
        setProfileHint(null);
        return;
      }

      setLineProfile(null);
      setProfileHint(nextInClient || nextLoggedIn ? profileResult.message : '目前未進入可讀取個人資料的 LINE 情境。');
    };

    bootstrapLiff();

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
        dark: '#12305f',
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  const handleShareAction = async () => {
    setShareState('idle');
    setShareStatus(null);
    setLiffActionError(null);

    if (inClient) {
      if (!loggedIn) {
        void ensureLogin();
        setLiffActionError('尚未登入 LINE，請先登入後再分享。');
        setShareState('failed');
        return;
      }

      if (!shareAvailable) {
        setLiffActionError('目前 LINE 環境不支援 shareTargetPicker。');
        setShareState('failed');
        return;
      }

      try {
        const permanentLink = await createPermanentLink(pageUrl);
        const shareResult = await shareCard([buildFlexMessage(config, permanentLink, pageUrl)]);
        if (shareResult) {
          setShareState('shared');
          setShareStatus('已開啟 LINE 分享對象選擇器。');
        } else {
          setShareState('failed');
          setLiffActionError('已取消分享，尚未送出給好友。');
        }
      } catch (error) {
        setShareState('failed');
        setLiffActionError(
          error instanceof Error ? error.message : '分享失敗，請稍後再試。',
        );
      }
      return;
    }

    try {
      const shareUrl = await buildShareTargetUrl(pageUrl);
      window.location.assign(shareUrl);
      setShareStatus('正在切換到 LINE 開啟 LIFF。');
    } catch (error) {
      setShareState('failed');
      setLiffActionError(
        error instanceof Error ? error.message : '建立 LIFF permanent link 失敗。',
      );
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${config.englishName.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
    link.click();
  };

  const operationalStatus = (() => {
    if (!liffEnabled) {
      return '目前以公開網頁模式展示，LIFF 分享功能可在設定 LIFF ID 後啟用。';
    }

    if (!inEndpointScope) {
      return '目前網址不在 LIFF Endpoint 範圍內，畫面會退回公開頁模式，請改由正式 LIFF URL 或 GitHub Pages 根路徑進入。';
    }

    if (liffInitError) {
      return 'LIFF 設定已偵測，但目前初始化失敗，建議改由 LINE 內開啟正式連結。';
    }

    if (!inClient) {
      return '目前為外部瀏覽器模式，可先查看內容、複製網址或掃描 QR，再切換到 LINE 開啟。';
    }

    if (!loggedIn) {
      return '已進入 LINE 環境，登入後即可使用分享好友功能。';
    }

    if (!shareAvailable) {
      return '已進入 LINE，但目前容器不支援分享選擇器，名片內容仍可正常瀏覽。';
    }

    return '目前可直接透過 LIFF 將名片分享給好友或客戶。';
  })();

  const mainAction = (() => {
    if (!liffEnabled) {
      return {
        heading: 'LIFF 尚未設定',
        detail: '目前尚未設定 LIFF ID，頁面只會以一般網頁模式顯示。',
        buttonLabel: 'LIFF 尚未設定',
        disabled: true,
        onClick: undefined,
      };
    }

    if (liffInitError) {
      return {
        heading: 'LIFF 初始化失敗',
        detail: liffInitError,
        buttonLabel: inEndpointScope ? '開啟 LINE 版名片' : '前往正式展示入口',
        disabled: !(inEndpointScope ? liffEntryUrl : endpointFallbackUrl),
        onClick: () => {
          window.location.assign((inEndpointScope ? liffEntryUrl : endpointFallbackUrl) || pageUrl);
        },
      };
    }

    if (!inClient) {
      return {
        heading: '外部瀏覽器預覽模式',
        detail: inEndpointScope
          ? '目前可先檢視正式卡片內容，若要分享給 LINE 好友，請改由 LINE 開啟 LIFF 版名片。'
          : '目前網址不在 LIFF Endpoint 範圍內，請先回到正式展示入口，再切換 LINE 開啟。',
        buttonLabel: inEndpointScope ? '開啟 LINE 版名片' : '前往正式展示入口',
        disabled: !(inEndpointScope ? liffEntryUrl : endpointFallbackUrl),
        onClick: () => {
          window.location.assign((inEndpointScope ? liffEntryUrl : endpointFallbackUrl) || pageUrl);
        },
      };
    }

    if (!loggedIn) {
      return {
        heading: '請先登入 LINE',
        detail: 'LIFF 已啟動，但目前尚未登入 LINE 帳號。',
        buttonLabel: '請先登入 LINE',
        disabled: false,
        onClick: () => {
          void ensureLogin();
        },
      };
    }

    if (!shareAvailable) {
      return {
        heading: '目前環境不支援分享',
        detail: '此 LINE 版本或容器不支援 shareTargetPicker，名片仍可正常瀏覽。',
        buttonLabel: '目前環境不支援分享',
        disabled: true,
        onClick: undefined,
      };
    }

    return {
      heading: '可分享好友',
      detail: '將以 Flex Message 開啟好友分享選擇器。',
      buttonLabel: '分享好友',
      disabled: false,
      onClick: handleShareAction,
    };
  })();

  return (
    <main className="page-shell">
      <section className="card-layout">
        <div className="card-panel">
          <div className="media-column">
            <a className="hero-link" href={heroUrl} target="_blank" rel="noreferrer">
              <img className="hero-image" src={toAssetUrl(config.heroImage)} alt={config.englishName} />
            </a>
            <div className="media-overlay">
              <span className="media-badge">Official Presentation Template</span>
              <div className="media-summary">
                <p className="media-summary-label">Business Card Experience</p>
                <p className="media-summary-title">{config.englishName}</p>
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
            <h2 id="overview" className="main-title">{config.mainTitle}</h2>
            <p className="description">{config.description}</p>
            <section className="profile-panel" aria-live="polite">
              <div className="profile-panel-header">
                <p className="profile-panel-title">LINE Personalization</p>
              </div>
              {lineProfile ? (
                <div className="profile-card">
                  {lineProfile.pictureUrl ? (
                    <img
                      className="profile-avatar"
                      src={lineProfile.pictureUrl}
                      alt={`${lineProfile.displayName} avatar`}
                    />
                  ) : (
                    <div className="profile-avatar profile-avatar-fallback" aria-hidden="true">
                      {lineProfile.displayName.slice(0, 1)}
                    </div>
                  )}
                  <div className="profile-copy">
                    <p className="profile-label">目前登入 LINE 使用者</p>
                    <p className="profile-name">{lineProfile.displayName}</p>
                    <p className="profile-note">已啟用個人化顯示，頁面會依 LINE 暱稱與頭像做出對應呈現。</p>
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

            <ul className="bullet-list">
              {config.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>

            <div id="connect" className="button-grid">
              {[{ ...config.button1, url: connectUrl }, { ...config.button2, url: overviewUrl }, { ...config.button3, url: bookingUrl }].map((button) => (
                <a
                  key={button.label}
                  className="cta-button"
                  href={button.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ backgroundColor: button.color }}
                >
                  {button.label}
                </a>
              ))}
            </div>

            <section id="booking" className="liff-panel">
              <div className="liff-panel-header">
                <div>
                  <p className="liff-panel-title">Main Action</p>
                  <p className="liff-panel-subtitle">保留 LIFF 分享能力，並兼容外部瀏覽器瀏覽與導流。</p>
                </div>
                <span className={`liff-status-chip ${liffReady ? 'is-ready' : 'is-pending'}`}>
                  {liffReady ? 'ready' : 'standby'}
                </span>
              </div>

              <div className="liff-action-card">
                <p className="liff-action-eyebrow">主操作</p>
                <h3 className="liff-action-title">{mainAction.heading}</h3>
                <p className="liff-message">{mainAction.detail}</p>
                <button
                  type="button"
                  className={`utility-button utility-button-liff ${mainAction.disabled ? 'is-disabled' : ''}`}
                  onClick={mainAction.onClick}
                  disabled={mainAction.disabled}
                >
                  {mainAction.buttonLabel}
                </button>
              </div>

              {liffActionError && <p className="liff-message liff-message-error">{liffActionError}</p>}
              {shareStatus && <p className="liff-message liff-message-success">{shareStatus}</p>}

              {isDevDiagnostics ? (
                <dl className="liff-debug-panel">
                  <div>
                    <dt>hasLiffId</dt>
                    <dd>{String(liffEnabled)}</dd>
                  </div>
                  <div>
                    <dt>inClient</dt>
                    <dd>{String(inClient)}</dd>
                  </div>
                  <div>
                    <dt>loggedIn</dt>
                    <dd>{String(loggedIn)}</dd>
                  </div>
                  <div>
                    <dt>shareAvailable</dt>
                    <dd>{String(shareAvailable)}</dd>
                  </div>
                  <div>
                    <dt>hasProfile</dt>
                    <dd>{String(Boolean(lineProfile))}</dd>
                  </div>
                  <div>
                    <dt>currentUrl</dt>
                    <dd>{pageUrl}</dd>
                  </div>
                  <div>
                    <dt>expectedEndpoint</dt>
                    <dd>{expectedEndpoint}</dd>
                  </div>
                </dl>
              ) : (
                <div className="diagnostics-summary">
                  <div>
                    <p className="diagnostics-summary-title">Mode</p>
                    <p className="diagnostics-summary-text">{mode}</p>
                  </div>
                  <div>
                    <p className="diagnostics-summary-title">Entry</p>
                    <p className="diagnostics-summary-text">{inEndpointScope ? 'Endpoint OK' : 'Outside Endpoint'}</p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>

        {config.qrEnabled && (
          <aside className="qr-panel">
            <div className="qr-panel-group">
              <p className="qr-label">Public Card URL</p>
              <p className="qr-url">{pageUrl}</p>
            </div>
            <div className="qr-panel-group">
              <p className="section-heading">公開分享 QR</p>
              <div className="qr-box">
                {qrDataUrl ? <img src={qrDataUrl} alt="Card QR code" /> : <span>Generating QR...</span>}
              </div>
            </div>
            <div className="qr-panel-group">
              <p className="section-heading">分享與保存</p>
              <div className="utility-actions">
                <button type="button" className="utility-button" onClick={handleCopy}>
                  複製名片網址
                </button>
                <button type="button" className="utility-button utility-button-secondary" onClick={handleDownload}>
                  下載 QR PNG
                </button>
              </div>
            </div>
            <div className="qr-panel-group">
              <p className="section-heading">簡易狀態</p>
              {copyState === 'copied' && <p className="utility-status">網址已複製，可直接貼給客戶或同事。</p>}
              {copyState === 'failed' && <p className="utility-status">複製失敗，請改用手動複製公開網址。</p>}
              {shareState === 'copied' && <p className="utility-status">LIFF 分享連結已複製。</p>}
              {shareState === 'shared' && <p className="utility-status">已呼叫 LINE 分享流程。</p>}
              {shareState === 'failed' && !liffActionError && <p className="utility-status">LIFF 分享流程失敗，請稍後再試。</p>}
              {copyState === 'idle' && shareState === 'idle' && <p className="utility-status">{operationalStatus}</p>}
            </div>
          </aside>
        )}
      </section>
    </main>
  );
}
