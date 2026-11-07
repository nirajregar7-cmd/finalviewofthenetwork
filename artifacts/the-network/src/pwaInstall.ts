/**
 * Global PWA install singleton.
 * Captures `beforeinstallprompt` as early as possible (before any React tree
 * mounts) so we never miss the event, and exposes it to the whole app.
 */

type Listener = (available: boolean) => void;
type InstalledListener = (installed: boolean) => void;

export const INSTALL_HELP_REQUEST_EVENT = 'network:install-help-requested';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let _deferred: BeforeInstallPromptEvent | null = null;
let _installed = false;
let _installConfirmedThisSession = false;
const _listeners = new Set<Listener>();
const _installedListeners = new Set<InstalledListener>();

function notify() {
  _listeners.forEach(fn => fn(canInstall()));
  _installedListeners.forEach(fn => fn(isAlreadyInstalled()));
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function markInstalled(confirmedThisSession = true) {
  _installed = true;
  _deferred = null;
  if (confirmedThisSession) _installConfirmedThisSession = true;
  notify();
}

export function canInstall(): boolean {
  return !!_deferred && !isAlreadyInstalled();
}

export function isAlreadyInstalled(): boolean {
  return _installed || isStandalone();
}

/** Refresh installed state when this page is running as an installed app. */
export async function refreshInstalledStatus(): Promise<boolean> {
  if (isStandalone()) {
    markInstalled();
  }
  return isAlreadyInstalled();
}

export function isIOS(): boolean {
  const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isAppleMobile && !(window as any).MSStream;
}

/** Call the native install prompt. Returns 'accepted' | 'dismissed' | 'unavailable'. */
export async function triggerInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (isAlreadyInstalled()) return 'accepted';
  if (!_deferred) return 'unavailable';
  const prompt = _deferred;
  _deferred = null; // consumed — Chrome only allows one call
  notify();
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') markInstalled();
    else notify();
    return outcome;
  } catch {
    return 'unavailable';
  }
}

export function onInstallAvailableChange(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function onInstalledChange(fn: InstalledListener): () => void {
  _installedListeners.add(fn);
  fn(isAlreadyInstalled());
  return () => _installedListeners.delete(fn);
}

export function requestInstallHelp(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(INSTALL_HELP_REQUEST_EVENT));
  }
}

// ── Boot: wire up events as early as possible ────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    if (!_installConfirmedThisSession) {
      _installed = false;
      _deferred = e as BeforeInstallPromptEvent;
      notify();
    }
  });

  window.addEventListener('appinstalled', () => {
    markInstalled();
  });

  void refreshInstalledStatus();
}
