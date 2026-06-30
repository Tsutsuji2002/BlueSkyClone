import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './i18n';
import { setupFetchInterceptor } from './utils/fetchInterceptor';

console.log('[Bootstrap] React app starting...');
console.log('[Bootstrap] Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  location: window.location.href
});

try {
  // Initialize global fetch interceptor for auto-logout
  setupFetchInterceptor();
  console.log('[Bootstrap] Fetch interceptor initialized');

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  const root = ReactDOM.createRoot(rootElement as HTMLElement);
  console.log('[Bootstrap] React root created');

  // Suppress ResizeObserver loop errors
  window.addEventListener('error', (e) => {
    if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
      const resizeObserverErrGuid = 'f6431796-c061-4d4a-b648-7dc07b20e200';
      if (window.hasOwnProperty(resizeObserverErrGuid)) {
        e.stopImmediatePropagation();
        e.stopPropagation();
      }
      // In some browsers it's just a string, in others it's an Error event
      if (e.message.includes('ResizeObserver')) {
        e.stopImmediatePropagation();
      }
    }
  });

  // Also handle unhandled promise rejections if needed
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason?.message?.includes('ResizeObserver')) {
      e.stopImmediatePropagation();
    }
  });

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('[Bootstrap] React render called');
} catch (error) {
  console.error('[Bootstrap] Fatal error during initialization:', error);
  
  // Show error on page if React fails to mount
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: white; font-family: system-ui;">
        <div style="max-width: 500px; padding: 32px; text-align: center;">
          <h1 style="color: #ef4444; margin-bottom: 16px;">Application Error</h1>
          <p style="color: #64748b; margin-bottom: 24px;">Failed to initialize the application. Check the browser console for details.</p>
          <button onclick="location.reload()" style="background: #0085ff; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer;">Reload Page</button>
        </div>
      </div>
    `;
  }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
