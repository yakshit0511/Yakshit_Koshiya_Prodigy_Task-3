/** pages/auth/LoginPage.jsx */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiEyeOff, FiLogIn } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', rememberMe: false });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login({ email: form.email, password: form.password });
    } catch (err) { setError(err.message || 'Invalid email or password'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 440, margin: '0 auto' }}>
      <div className="card animate-slide-up">
        <div className="card-body">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
            <h1 style={{ fontSize: 26, fontWeight: 800 }}>Welcome Back!</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4 }}>Sign in to your LocalStore account</p>
          </div>

          {error && <div style={{ background: 'var(--badge-error-bg, #fee2e2)', border: '1px solid var(--color-error)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: 'var(--badge-error-color, #dc2626)', fontSize: 14 }}>❌ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address <span className="required">*</span></label>
              <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                Password <Link to="/forgot-password" style={{ fontWeight: 400, fontSize: 12 }}>Forgot password?</Link>
              </label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPass ? 'text' : 'password'} placeholder="Your password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  {showPass ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.rememberMe} onChange={(e) => setForm(f => ({ ...f, rememberMe: e.target.checked }))} style={{ accentColor: 'var(--color-primary)' }} />
              Remember me for 30 days
            </label>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? 'Signing in…' : <><FiLogIn size={16} /> Sign In</>}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Register now →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
