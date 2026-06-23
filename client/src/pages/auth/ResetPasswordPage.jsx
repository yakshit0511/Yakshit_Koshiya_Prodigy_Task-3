/** pages/auth/ResetPasswordPage.jsx */
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(''); setLoading(true);
    try {
      await authApi.resetPassword(token, form.password);
      toast.success('Password reset successfully! Please login.');
      navigate('/login');
    } catch (err) { setError(err.message || 'Invalid or expired reset link'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      <div className="card animate-slide-up">
        <div className="card-body">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Reset Password</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Enter your new password</p>
          </div>
          {error && <div style={{ background: 'var(--badge-error-bg, #fee2e2)', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: 'var(--badge-error-color, #dc2626)', fontSize: 14 }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>{loading ? 'Resetting…' : 'Reset Password'}</button>
            <Link to="/login" className="btn btn-ghost btn-full" style={{ marginTop: 12 }}>← Back to Login</Link>
          </form>
        </div>
      </div>
    </div>
  );
}
