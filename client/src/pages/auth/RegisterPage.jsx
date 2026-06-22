/** pages/auth/RegisterPage.jsx */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const strengthColors = ['#e5e7eb', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e', '#16a34a'];
const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];

function getStrength(pwd) {
  let s = 0;
  if (pwd.length >= 6) s++;
  if (pwd.length >= 10) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return Math.min(s, 5);
}

const F = ({ name, form, setForm, fieldErrors, ...rest }) => (
  <div className="form-group">
    <label className="form-label">{rest.label} {rest.required && <span className="required">*</span>}</label>
    <input className={`form-input ${fieldErrors[name] ? 'error' : ''}`} {...rest} value={form[name]} onChange={(e) => setForm(f => ({ ...f, [name]: e.target.value }))} />
    {fieldErrors[name] && <p className="form-error">{fieldErrors[name]}</p>}
  </div>
);

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', agree: false });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const strength = getStrength(form.password);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Valid email required';
    if (form.phone && !form.phone.match(/^[6-9]\d{9}$/)) e.phone = 'Enter valid 10-digit Indian mobile number';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.agree) e.agree = 'You must accept the terms';
    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setError(''); setLoading(true);
    try {
      await register({ name: form.name, email: form.email, phone: form.phone, password: form.password });
    } catch (err) { setError(err.message || 'Registration failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="card animate-slide-up">
        <div className="card-body">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📝</div>
            <h1 style={{ fontSize: 26, fontWeight: 800 }}>Create Account</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4 }}>Join thousands of happy customers</p>
          </div>

          {error && <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontSize: 14 }}>❌ {error}</div>}

          <form onSubmit={handleSubmit}>
            <F name="name" label="Full Name" placeholder="Priya Sharma" required form={form} setForm={setForm} fieldErrors={fieldErrors} />
            <F name="email" type="email" label="Email Address" placeholder="you@example.com" required form={form} setForm={setForm} fieldErrors={fieldErrors} />
            <F name="phone" type="tel" label="Mobile Number" placeholder="9876543210" form={form} setForm={setForm} fieldErrors={fieldErrors} />

            {/* Password with strength */}
            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <div style={{ position: 'relative' }}>
                <input className={`form-input ${fieldErrors.password ? 'error' : ''}`} type={showPass ? 'text' : 'password'} placeholder="Min 6 characters" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                  {showPass ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {form.password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4,5].map((i) => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength ? strengthColors[strength] : '#e5e7eb', transition: 'background 0.3s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: strengthColors[strength], fontWeight: 600 }}>{strengthLabels[strength]}</span>
                </div>
              )}
              {fieldErrors.password && <p className="form-error">{fieldErrors.password}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password <span className="required">*</span></label>
              <input className={`form-input ${fieldErrors.confirmPassword ? 'error' : ''}`} type="password" placeholder="Repeat your password" value={form.confirmPassword} onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))} />
              {fieldErrors.confirmPassword && <p className="form-error">{fieldErrors.confirmPassword}</p>}
            </div>

            <label style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 20, cursor: 'pointer', alignItems: 'flex-start' }}>
              <input type="checkbox" checked={form.agree} onChange={(e) => setForm(f => ({ ...f, agree: e.target.checked }))} style={{ marginTop: 2, accentColor: 'var(--color-primary)' }} />
              <span>I agree to the <a href="#" style={{ color: 'var(--color-primary)' }}>Terms of Service</a> and <a href="#" style={{ color: 'var(--color-primary)' }}>Privacy Policy</a></span>
            </label>
            {fieldErrors.agree && <p className="form-error" style={{ marginTop: -16, marginBottom: 16 }}>{fieldErrors.agree}</p>}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? 'Creating account…' : '🎉 Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--color-text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Sign in →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
