/**
 * components/layout/Footer.jsx
 */
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { FiFacebook, FiInstagram, FiPhone, FiMail, FiMapPin } from 'react-icons/fi';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) { setSubscribed(true); setEmail(''); }
  };

  return (
    <footer style={{ background: '#1e293b', color: 'rgba(255,255,255,0.85)', marginTop: 'auto' }}>
      {/* Main footer content */}
      <div className="container" style={{ padding: '48px 24px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40 }}>

        {/* Col 1 — Store info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, background: 'var(--color-primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛍️</div>
            <span style={{ fontWeight: 800, fontSize: 18, color: 'white' }}>LocalStore</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 20, color: 'rgba(255,255,255,0.6)' }}>
            Your trusted neighbourhood online store. Fresh products, fast delivery and honest prices — every day.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiMapPin size={14} /> 123 Market Street, Your City — 380001</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiPhone size={14} /> +91 98765 43210</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiMail size={14} /> support@localstore.in</span>
          </div>
        </div>

        {/* Col 2 — Quick Links */}
        <div>
          <h4 style={{ fontWeight: 700, marginBottom: 16, color: 'white', fontSize: 15 }}>Quick Links</h4>
          {[
            { to: '/', label: '🏠 Home' },
            { to: '/products', label: '🛒 Products' },
            { to: '/search', label: '🔍 Search' },
            { to: '/cart', label: '🛍️ Cart' },
            { to: '/wishlist', label: '❤️ Wishlist' },
          ].map((l) => (
            <Link key={l.to} to={l.to} style={{ display: 'block', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '5px 0', fontSize: 13, transition: 'color 0.15s' }}
              onMouseOver={(e) => e.target.style.color = 'var(--color-primary-light)'}
              onMouseOut={(e) => e.target.style.color = 'rgba(255,255,255,0.6)'}
            >{l.label}</Link>
          ))}
        </div>

        {/* Col 3 — Customer Service */}
        <div>
          <h4 style={{ fontWeight: 700, marginBottom: 16, color: 'white', fontSize: 15 }}>Customer Service</h4>
          {[
            { to: '/my-orders', label: '📦 Track Orders' },
            { to: '/support', label: '💬 Help & Support' },
            { to: '/addresses', label: '📍 My Addresses' },
            { to: '/profile', label: '👤 My Account' },
            { to: '/my-reviews', label: '⭐ My Reviews' },
          ].map((l) => (
            <Link key={l.to} to={l.to} style={{ display: 'block', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '5px 0', fontSize: 13, transition: 'color 0.15s' }}
              onMouseOver={(e) => e.target.style.color = 'var(--color-primary-light)'}
              onMouseOut={(e) => e.target.style.color = 'rgba(255,255,255,0.6)'}
            >{l.label}</Link>
          ))}
        </div>

        {/* Col 4 — Newsletter */}
        <div>
          <h4 style={{ fontWeight: 700, marginBottom: 8, color: 'white', fontSize: 15 }}>Stay Updated</h4>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
            Subscribe and get 10% off your next order + weekly deals!
          </p>
          {subscribed ? (
            <div style={{ background: 'rgba(22,163,74,0.2)', borderRadius: 8, padding: '12px 16px', color: 'var(--color-primary-light)', fontSize: 13, fontWeight: 600 }}>
              ✅ Subscribed! Check your email.
            </div>
          ) : (
            <form onSubmit={handleSubscribe}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 13, marginBottom: 8, outline: 'none' }}
              />
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Subscribe 🎁</button>
            </form>
          )}
          {/* Social icons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            {[
              { icon: <FiFacebook size={18} />, href: '#', label: 'Facebook' },
              { icon: <FiInstagram size={18} />, href: '#', label: 'Instagram' },
              { icon: '💬', href: 'https://wa.me/919876543210', label: 'WhatsApp' },
            ].map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noreferrer"
                style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.08)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', transition: 'all 0.15s', textDecoration: 'none' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                aria-label={s.label}
              >{s.icon}</a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '16px 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          © {new Date().getFullYear()} LocalStore. All rights reserved. | Built with ❤️ for our community
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Accepted payments:</span>
          {['💳 Cards', '📱 UPI', '🏦 Net Banking', '💵 COD'].map((p) => (
            <span key={p} style={{ fontSize: 11, background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: 4, color: 'rgba(255,255,255,0.6)' }}>{p}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}
