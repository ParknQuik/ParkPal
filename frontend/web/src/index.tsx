import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializePerformanceMonitoring } from './utils/performance';

// Initialize performance monitoring
if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
  initializePerformanceMonitoring('/api/v1/analytics/performance');
}

// Register service worker for PWA support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
