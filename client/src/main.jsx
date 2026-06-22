/**
 * main.jsx — App entry point.
 * Wraps the app with all providers and React Router.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CompareProvider } from './context/CompareContext';
import { NotificationProvider } from './context/NotificationContext';

import { HelmetProvider } from 'react-helmet-async';
import { initErrorTracker } from './utils/errorTracker';

// Initialize Client-side error tracking
initErrorTracker();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <CompareProvider>
                <NotificationProvider>
                  <App />
                  <Toaster
                    position="top-right"
                    gutter={8}
                    toastOptions={{
                      duration: 3000,
                      style: {
                        background: '#1e293b',
                        color: '#fff',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontFamily: 'Inter, sans-serif',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                      },
                      success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
                      error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                    }}
                  />
                </NotificationProvider>
              </CompareProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);
