import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import './i18n';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
