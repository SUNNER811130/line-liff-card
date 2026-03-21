import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { CardConfig } from '../content/card.config';
import { getAppMode, getPublicPageUrl, toAssetUrl } from '../lib/runtime';
import { applySeo } from '../lib/seo';

type CardPageProps = {
  config: CardConfig;
};

const buttonEntries = (config: CardConfig) => [config.button1, config.button2, config.button3];

export function CardPage({ config }: CardPageProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const mode = getAppMode();
  const pageUrl = getPublicPageUrl();

  useEffect(() => {
    applySeo(config);
  }, [config]);

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

  const handleDownload = () => {
    if (!qrDataUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${config.englishName.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
    link.click();
  };

  return (
    <main className="page-shell">
      <section className="card-layout">
        <div className="card-panel">
          <div className="media-column">
            <a className="hero-link" href={config.heroLink} target="_blank" rel="noreferrer">
              <img className="hero-image" src={toAssetUrl(config.heroImage)} alt={config.englishName} />
            </a>
          </div>

          <div className="content-column">
            <div className="topline">
              <span className="brand-chip">{config.brand}</span>
              <span className={`mode-chip mode-${mode}`}>{mode}</span>
            </div>

            <p className="english-name">{config.englishName}</p>
            <h1 className="hero-title">{config.heroTitle}</h1>
            <h2 className="main-title">{config.mainTitle}</h2>
            <p className="description">{config.description}</p>

            <ul className="bullet-list">
              {config.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>

            <div className="button-grid">
              {buttonEntries(config).map((button) => (
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
          </aside>
        )}
      </section>
    </main>
  );
}
