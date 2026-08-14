import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { reportClientError } from './api/errorlog';

window.addEventListener('error', event => {
  reportClientError({
    scope: 'window-error',
    message: event.message || 'Unhandled window error',
    stack: event.error?.stack || null,
    level: 'error',
    details: {
      filename: event.filename || null,
      lineno: event.lineno || null,
      colno: event.colno || null,
    },
  });
});

window.addEventListener('unhandledrejection', event => {
  const reason = event.reason;
  reportClientError({
    scope: 'unhandled-rejection',
    message: reason?.message || String(reason || 'Unhandled promise rejection'),
    stack: reason?.stack || null,
    level: 'error',
  });
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
