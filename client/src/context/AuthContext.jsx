/**
 * context/AuthContext.jsx
 * Global authentication state — user, token, role.
 * Auto-restores session on page load.
 * Handles login/register/logout and role-based redirects.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while restoring session
  const navigate = useNavigate();
  const location = useLocation();

  /* ---- Restore session on mount ---- */
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      authApi.getMe()
        .then((res) => setUser(res.data.user))
        .catch(() => { localStorage.removeItem('accessToken'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  /* ---- Listen for forced logout from axios interceptor ---- */
  useEffect(() => {
    const handler = () => {
      setUser(null);
      localStorage.removeItem('accessToken');
      navigate('/login');
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [navigate]);

  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    const { user: u, accessToken } = res.data;
    localStorage.setItem('accessToken', accessToken);
    setUser(u);
    toast.success(`Welcome back, ${u.name.split(' ')[0]}! 👋`);
    // Redirect: admin → dashboard, customer → previous page or home
    if (u.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
    return u;
  }, [navigate, location]);

  const register = useCallback(async (data) => {
    const res = await authApi.register(data);
    const { user: u, accessToken } = res.data;
    localStorage.setItem('accessToken', accessToken);
    setUser(u);
    toast.success('Account created successfully! 🎉');
    navigate('/');
    return u;
  }, [navigate]);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch (_) {}
    setUser(null);
    localStorage.removeItem('accessToken');
    toast.success('Logged out successfully.');
    navigate('/login');
  }, [navigate]);

  const updateProfile = useCallback(async (data) => {
    const res = await authApi.updateProfile(data);
    setUser(res.data.user);
    toast.success('Profile updated!');
    return res.data.user;
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    register,
    logout,
    updateProfile,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
