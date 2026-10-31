export function isAlreadyInstalled(): boolean {
  return false;
}

export function onInstalledChange(): () => void {
  return () => {};
}

export async function triggerInstall(): Promise<'unavailable'> {
  return 'unavailable';
}

export function requestInstallHelp(): void {}
