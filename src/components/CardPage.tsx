import { useEffect, useState } from 'react';
import liff from '@line/liff';
import QRCode from 'qrcode';
import type { CardConfig } from '../content/card.config';
import {
  buildShareTargetUrl,
  createPermanentLink,
  ensureLogin,
  getConfiguredLiffId,
  getExpectedEndpoint,
  getLiffEntryUrl,
  initLiff,
  isInClient,
  isLoggedIn,
  isShareAvailable,
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
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [shareState, setShareState] = useState<'idle' | 'copied' | 'shared' | 'failed'>('idle');
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [liffInitError, setLiffInitError] = useState<string | null>(null);
  const [liffActionError, setLiffActionError] = useState<string | null>(null);
  const [liffReady, setLiffReady] = useState(false);
  const [inClient, setInClient] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [shareAvailable, setShareAvailable] = useState(false);
  const [expectedEndpoint, setExpectedEndpoint] = useState(getExpectedEndpoint());
  const pageUrl = getPublicPageUrl();
  const liffId = getConfiguredLiffId();
  const liffEnabled = Boolean(liffId);
  const liffEntryUrl = getLiffEntryUrl();
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
        return;
      }

      if (result.status === 'disabled') {
        setLiffReady(false);
        setLiffInitError(null);
        setInClient(false);
        setLoggedIn(false);
        setShareAvailable(false);
        return;
      }

      setLiffInitError(null);
      setLiffReady(true);
      setInClient(isInClient());
      setLoggedIn(isLoggedIn());
      setShareAvailable(isShareAvailable());
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

    QRCode.toDataURL(pageUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: '#12305f',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
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
        ensureLogin();
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
        const shareResult = await liff.shareTargetPicker([buildFlexMessage(config, permanentLink, pageUrl)]);
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
        buttonLabel: '請用 LINE 開啟',
        disabled: !liffEntryUrl,
        onClick: liffEntryUrl ? () => window.location.assign(liffEntryUrl) : undefined,
      };
    }

    if (!inClient) {
      return {
        heading: '請在 LINE 中開啟',
        detail: '目前為外部瀏覽器，請改由 LINE 開啟 LIFF 才能進一步使用分享能力。',
        buttonLabel: '請用 LINE 開啟',
        disabled: !liffEntryUrl,
        onClick: liffEntryUrl ? () => window.location.assign(liffEntryUrl) : undefined,
      };
    }

    if (!loggedIn) {
      return {
        heading: '請先登入 LINE',
        detail: 'LIFF 已啟動，但目前尚未登入 LINE 帳號。',
        buttonLabel: '請先登入 LINE',
        disabled: false,
        onClick: () => {
          ensureLogin();
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
                <p className="liff-panel-title">LINE LIFF</p>
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
                  <dt>currentUrl</dt>
                  <dd>{pageUrl}</dd>
                </div>
                <div>
                  <dt>expectedEndpoint</dt>
                  <dd>{expectedEndpoint}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>

        {config.qrEnabled && (
          <aside className="qr-panel">
            <div>
              <p className="qr-label">Public Card URL</p>
              <p className="qr-url">{pageUrl}</p>
            </div>
            <div className="qr-box">
              {qrDataUrl ? <img src={qrDataUrl} alt="Card QR code" /> : <span>Generating QR...</span>}
            </div>
            <div className="utility-actions">
              <button type="button" className="utility-button" onClick={handleCopy}>
                複製名片網址
              </button>
              <button type="button" className="utility-button utility-button-secondary" onClick={handleDownload}>
                下載 QR PNG
              </button>
            </div>
            {copyState === 'copied' && <p className="utility-status">網址已複製。</p>}
            {copyState === 'failed' && <p className="utility-status">複製失敗，請手動複製。</p>}
            {shareState === 'copied' && <p className="utility-status">LIFF 分享連結已複製。</p>}
            {shareState === 'shared' && <p className="utility-status">已呼叫 LINE 分享流程。</p>}
            {shareState === 'failed' && !liffActionError && <p className="utility-status">LIFF 分享流程失敗。</p>}
          </aside>
        )}
      </section>
    </main>
  );
}
