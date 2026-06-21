/** pages/auth/ForgotPasswordPage.jsx */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/authApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) { setError(err.message || 'Failed. Please check the email address.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <div className="card animate-slide-up">
        <div className="card-body">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Forgot Password?</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4 }}>We'll send you a reset link</p>
          </div>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 50, marginBottom: 12 }}>📧</div>
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Email Sent!</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 24 }}>We've sent a password reset link to <strong>{email}</strong>. Please check your inbox.</p>
              <Link to="/login" className="btn btn-primary btn-full">← Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div style={{ background: '#fee2e2', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 14 }}>{error}</div>}
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>{loading ? 'Sending…' : 'Send Reset Link 📧'}</button>
              <Link to="/login" className="btn btn-ghost btn-full" style={{ marginTop: 12 }}>← Back to Login</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
