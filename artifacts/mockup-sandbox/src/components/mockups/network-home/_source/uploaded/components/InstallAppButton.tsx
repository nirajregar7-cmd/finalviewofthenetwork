import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  isAlreadyInstalled,
  onInstalledChange,
  requestInstallHelp,
  triggerInstall,
} from '../../pwaInstall';

interface InstallAppButtonProps {
  className: string;
  id: string;
}

export function InstallAppButton({ className, id }: InstallAppButtonProps) {
  const [isInstalled, setIsInstalled] = useState(
    () => typeof window !== 'undefined' && isAlreadyInstalled(),
  );
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => onInstalledChange(setIsInstalled), []);

  const handleInstall = async () => {
    if (isPrompting) return;
    if (isAlreadyInstalled()) {
      setIsInstalled(true);
      return;
    }

    setIsPrompting(true);
    try {
      const result = await triggerInstall();
      if (result === 'accepted') {
        setIsInstalled(true);
      } else if (result === 'unavailable') {
        requestInstallHelp();
      }
    } catch {
      requestInstallHelp();
    } finally {
      setIsPrompting(false);
    }
  };

  if (isInstalled) return null;

  return (
    <button
      type="button"
      id={id}
      onClick={handleInstall}
      disabled={isPrompting}
      className={className}
      aria-label="Install The Network app"
      aria-busy={isPrompting}
      title="Install The Network on your device"
    >
      <Download className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>Install app</span>
    </button>
  );
}