import React, { useEffect, useState } from 'react';
import { Share, X, Plus, Download } from 'lucide-react';
import {
  INSTALL_HELP_REQUEST_EVENT,
  canInstall,
  isAlreadyInstalled,
  isIOS,
  triggerInstall,
  onInstallAvailableChange,
  onInstalledChange,
} from '../pwaInstall';

interface Props { darkMode: boolean; }

type InstallMode = 'android' | 'ios' | 'desktop';

const DISMISS_KEY = 'pwa-prompt-dismissed-until';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FIRST_PROMPT_DELAY_MS = 2500;

function getInstallMode(): InstallMode {
  if (isIOS()) return 'ios';
  return /android/i.test(navigator.userAgent) ? 'android' : 'desktop';
}

function getDesktopInstallSteps(): string[] {
  const userAgent = navigator.userAgent;
  if (/Edg\//i.test(userAgent)) {
    return [
      'Open the Settings and more menu (⋯) in Microsoft Edge.',
      'Choose Apps, then Install this site as an app.',
    ];
  }
  if (/Chrome\//i.test(userAgent)) {
    return [
      'Open the Chrome menu (⋮).',
      'Choose Cast, save, and share, then Install page as app.',
    ];
  }
  return [
    'Open your browser menu.',
    'Choose Install app or Install this site as an app.',
  ];
}

function getAndroidInstallSteps(): string[] {
  const isEmbeddedBrowser = /;\s*wv\)|\bGSA\/|FBAN|FBAV|Instagram|Line\/|TikTok/i.test(
    navigator.userAgent,
  );
  return [
    ...(isEmbeddedBrowser
      ? ['Tap “Open in Chrome browser” in this browser’s menu first.']
      : []),
    'In Chrome, open the ⋮ menu.',
    'Tap “Install app”. If it is not listed, choose “Add to Home screen”.',
  ];
}

function isDismissed() {
  const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return Date.now() < until;
}

function dismiss() {
  localStorage.setItem(DISMISS_KEY, String(Date.now() + COOLDOWN_MS));
}

export default function InstallPrompt({ darkMode }: Props) {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<InstallMode | null>(null);
  const [showManualHelp, setShowManualHelp] = useState(false);

  useEffect(() => {
    const openInstallHelp = () => {
      if (isAlreadyInstalled()) return;
      const installMode = getInstallMode();
      setMode(installMode);
      setShowManualHelp(installMode !== 'ios' && !canInstall());
      setShow(true);
    };
    window.addEventListener(INSTALL_HELP_REQUEST_EVENT, openInstallHelp);
    const unsubscribeInstalled = onInstalledChange((installed) => {
      if (installed) {
        setShow(false);
        setShowManualHelp(false);
      }
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe: (() => void) | undefined;

    if (!isAlreadyInstalled() && !isDismissed()) {
      if (isIOS()) {
        timer = setTimeout(() => {
          if (!isDismissed() && !isAlreadyInstalled()) {
            setMode(getInstallMode());
            setShow(true);
          }
        }, FIRST_PROMPT_DELAY_MS);
      } else {
        const showAndroidPrompt = (available: boolean) => {
          if (!isDismissed() && !isAlreadyInstalled()) {
            setMode(getInstallMode());
            setShowManualHelp(!available);
            setShow(true);
          }
        };
        unsubscribe = onInstallAvailableChange(showAndroidPrompt);
        timer = setTimeout(() => showAndroidPrompt(canInstall()), FIRST_PROMPT_DELAY_MS);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe?.();
      unsubscribeInstalled();
      window.removeEventListener(INSTALL_HELP_REQUEST_EVENT, openInstallHelp);
    };
  }, []);

  const handleInstall = async () => {
    const outcome = await triggerInstall();
    if (outcome === 'unavailable') {
      setShowManualHelp(true);
    } else {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    dismiss();
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center"
        style={{
          background: 'linear-gradient(160deg, #1a0d2e 0%, #0d0d14 60%, #000000 100%)',
          borderRadius: '24px 24px 0 0',
          padding: '12px 24px 44px',
          boxShadow: '0 -8px 48px rgba(109,40,217,0.25)',
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', marginBottom: 20 }} />

        {/* Dismiss */}
        <button onClick={handleDismiss} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 20, padding: 6, cursor: 'pointer', display: 'flex' }}>
          <X size={16} color="rgba(255,255,255,0.6)" />
        </button>

        {/* App icon */}
        <div style={{ width: 76, height: 76, borderRadius: 18, overflow: 'hidden', marginBottom: 14, boxShadow: '0 4px 24px rgba(109,40,217,0.5)', border: '2px solid rgba(109,40,217,0.4)' }}>
          <img src="/icons/icon-192x192.png" alt="The Network" style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 19, margin: '0 0 5px', textAlign: 'center' }}>
          Install The Network
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', margin: '0 0 20px', lineHeight: 1.5, maxWidth: 270 }}>
          Install from your browser for quick access on your device
        </p>

        {/* iOS: step-by-step instructions */}
        {mode === 'ios' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {[
              { icon: <Share size={17} color="#818cf8" />, step: '1', text: 'Tap the Share button in Safari' },
              { icon: <Plus size={17} color="#818cf8" />, step: '2', text: 'Tap "Add to Home Screen"' },
              { icon: <Download size={17} color="#818cf8" />, step: '3', text: 'Tap "Add" to confirm' },
            ].map(({ icon, step, text }) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(129,140,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Step {step}</span>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, margin: 0, fontWeight: 500 }}>{text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Android: feature highlights + native install button */}
        {mode === 'android' && (
          <>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
              {[
                { emoji: '⚡', text: 'Loads faster than the browser' },
                { emoji: '🔔', text: 'Real-time push notifications' },
                { emoji: '🔒', text: 'Private & secure — always' },
              ].map(({ emoji, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ fontSize: 19 }}>{emoji}</span>
                  <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>{text}</span>
                </div>
              ))}
            </div>
            {!showManualHelp && (
              <button
                onClick={handleInstall}
                style={{ width: '100%', padding: '15px 0', borderRadius: 16, background: 'linear-gradient(90deg, #7c3aed 0%, #6d28d9 50%, #4f46e5 100%)', color: '#fff', fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(109,40,217,0.5)', marginBottom: 12 }}
              >
                📲  Install App
              </button>
            )}
            {showManualHelp && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 8 }}>
                {getAndroidInstallSteps().map((text, index) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(129,140,248,0.15)', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700 }}>{index + 1}</span>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 1.45 }}>{text}</span>
                  </div>
                ))}
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, textAlign: 'center', lineHeight: 1.45, margin: '2px 0 0' }}>
                  Installation is available in a supported browser; this does not download an APK.
                </p>
              </div>
            )}
          </>
        )}

        {mode === 'desktop' && (
          <div style={{ width: '100%', marginBottom: 16 }}>
            {!showManualHelp ? (
              <button
                onClick={handleInstall}
                style={{ width: '100%', padding: '15px 0', borderRadius: 16, background: 'linear-gradient(90deg, #7c3aed 0%, #6d28d9 50%, #4f46e5 100%)', color: '#fff', fontWeight: 800, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(109,40,217,0.5)' }}
              >
                Install App
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {getDesktopInstallSteps().map((text, index) => (
                  <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <span style={{ width: 28, height: 28, borderRadius: 9, background: 'rgba(129,140,248,0.15)', color: '#a5b4fc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700 }}>{index + 1}</span>
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 1.45 }}>{text}</span>
                  </div>
                ))}
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, textAlign: 'center', lineHeight: 1.45, margin: '2px 0 0' }}>
                  This installs the website as an app; it does not download an APK.
                </p>
              </div>
            )}
          </div>
        )}

        {mode === 'ios' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
            <Share size={12} />
            <span>Look for the Share icon at the bottom of Safari</span>
          </div>
        )}

        <button onClick={handleDismiss} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12, cursor: 'pointer', padding: '6px 8px', marginTop: 10 }}>
          Not now — remind me later
        </button>
      </div>
    </>
  );
}
