/**
 * utils/errorTracker.js
 * -----------------------------------------
 * Captures window global errors and unhandled promise rejections,
 * then forwards them to the server-side Winston logging endpoint.
 * -----------------------------------------
 */

export const initErrorTracker = () => {
  // 1. Capture global uncaught errors
  window.addEventListener('error', (event) => {
    const errorDetails = {
      error: event.error?.stack || event.message || 'Uncaught Error',
      info: `File: ${event.filename} | Line: ${event.lineno}:${event.colno}`,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    sendErrorToServer(errorDetails);
  });

  // 2. Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const errorDetails = {
      error: event.reason?.stack || event.reason?.message || String(event.reason || 'Unhandled Promise Rejection'),
      info: 'Unhandled Promise Rejection',
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    sendErrorToServer(errorDetails);
  });
};

const sendErrorToServer = (details) => {
  // Use native fetch to avoid axios interceptor overhead or loops
  fetch('/api/logs/frontend-error', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(details),
  }).catch((err) => {
    console.error('Failed to send error log to server:', err);
  });
};
