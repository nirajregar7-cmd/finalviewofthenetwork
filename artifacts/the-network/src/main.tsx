import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';
import {
  registerServiceWorker,
  unregisterAppServiceWorkerForDevelopment,
} from './registerSW';
import './pwaInstall'; // boot the global install-event capture ASAP
import { analyticsPromise } from './lib/firebase'; // initialise Firebase + Analytics

// Kick off analytics (non-blocking)
analyticsPromise.catch(() => {});

async function startApp() {
  if (
    import.meta.env.DEV &&
    (await unregisterAppServiceWorkerForDevelopment())
  ) {
    window.location.reload();
    return;
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HelmetProvider>
        <App />
        <Analytics />
      </HelmetProvider>
    </StrictMode>,
  );

  registerServiceWorker();
}

void startApp();
