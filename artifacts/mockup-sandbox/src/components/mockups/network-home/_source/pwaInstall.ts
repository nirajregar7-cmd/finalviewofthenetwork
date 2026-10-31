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

interface RelatedInstalledApp {
  platform: string;
}

interface NavigatorWithRelatedApps extends Navigator {
  getInstalledRelatedApps?: () => Promise<RelatedInstalledApp[]>;
}

const INSTALLED_STORAGE_KEY = 'the-network-pwa-installed';
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

function hasStoredInstallMarker(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(INSTALLED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function storeInstallMarker(installed: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (installed) window.localStorage.setItem(INSTALLED_STORAGE_KEY, 'true');
    else window.localStorage.removeItem(INSTALLED_STORAGE_KEY);
  } catch {
    // Standalone mode and install events still cover browsers that block storage.
  }
}

function markInstalled(confirmedThisSession = true) {
  _installed = true;
  _deferred = null;
  if (confirmedThisSession) _installConfirmedThisSession = true;
  storeInstallMarker(true);
  notify();
}

function markNotInstalled() {
  if (_installConfirmedThisSession || isStandalone()) return;
  _installed = false;
  storeInstallMarker(false);
  notify();
}

export function canInstall(): boolean {
  return !!_deferred && !isAlreadyInstalled();
}

export function isAlreadyInstalled(): boolean {
  return _installed || isStandalone() || hasStoredInstallMarker();
}

/** Refresh installed state where the browser can report installed related apps. */
export async function refreshInstalledStatus(): Promise<boolean> {
  if (isStandalone()) {
    markInstalled();
    return true;
  }

  const getInstalledRelatedApps =
    (typeof navigator !== 'undefined' &&
      (navigator as NavigatorWithRelatedApps).getInstalledRelatedApps) ||
    undefined;
  if (!getInstalledRelatedApps) return isAlreadyInstalled();

  try {
    const relatedApps = await getInstalledRelatedApps.call(navigator);
    if (_installConfirmedThisSession) return isAlreadyInstalled();

    if (relatedApps.some(app => app.platform === 'webapp')) {
      markInstalled(false);
    } else {
      markNotInstalled();
    }
  } catch {
    // Installation detection is optional; never block the web app on it.
  }

  return isAlreadyInstalled();
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
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
      storeInstallMarker(false);
      _deferred = e as BeforeInstallPromptEvent;
      notify();
    }
  });

  window.addEventListener('appinstalled', () => {
    markInstalled();
  });

  void refreshInstalledStatus();
}
