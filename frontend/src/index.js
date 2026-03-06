import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    let isRefreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isRefreshing) return;
      isRefreshing = true;
      window.location.reload();
    });

    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');

      const activateWaitingWorker = () => {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      };

      if (reg.waiting) {
        activateWaitingWorker();
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            activateWaitingWorker();
          }
        });
      });

      setInterval(() => {
        reg.update().catch(() => {});
      }, 60 * 1000);

      console.log('SW registered:', reg.scope);
    } catch (err) {
      console.log('SW registration failed:', err);
    }
  });
}
