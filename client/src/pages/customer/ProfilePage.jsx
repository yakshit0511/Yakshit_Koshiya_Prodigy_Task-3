import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import { orderApi } from '../../api/orderApi';
import CustomerLayoutWrapper from '../../components/layout/CustomerLayoutWrapper';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff, FiEdit, FiCamera, FiCheck, FiX, FiAward, FiShoppingBag, FiDollarSign } from 'react-icons/fi';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const fileInputRef = useRef(null);

  // Profile Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.profilePhoto?.url || '');
  const [profileLoading, setProfileLoading] = useState(false);

  // Password States
  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  // Stats States
  const [ordersCount, setOrdersCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    orderApi.getMyOrders()
      .then((res) => {
        const orders = res.data.orders || [];
        setOrdersCount(orders.length);
        const spent = orders.reduce((sum, o) => {
          if (o.orderStatus !== 'Cancelled') {
            return sum + (o.totalAmount || 0);
          }
          return sum;
        }, 0);
        setTotalSpent(spent);
      })
      .catch(() => {});
  }, []);

  const handleAvatarClick = () => {
    if (isEditing) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size cannot exceed 2MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setProfileLoading(true);

    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('phone', phone);
      if (avatarFile) {
        fd.append('profilePhoto', avatarFile);
      }
      await updateProfile(fd);
      setIsEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setAvatarPreview(user?.profilePhoto?.url || '');
    setAvatarFile(null);
    setIsEditing(false);
  };

  const handlePassChange = (e) => {
    setPassData({ ...passData, [e.target.name]: e.target.value });
  };

  // Password strength logic
  const getPasswordStrength = (pw) => {
    if (!pw) return { score: 0, text: 'No Password', color: '#cbd5e1' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    switch (score) {
      case 0:
      case 1:
        return { score, text: 'Weak', color: 'var(--color-error)' };
      case 2:
        return { score, text: 'Medium', color: 'var(--color-warning)' };
      case 3:
      case 4:
        return { score, text: 'Strong', color: 'var(--color-success)' };
      default:
        return { score: 0, text: 'Weak', color: 'var(--color-error)' };
    }
  };

  const strength = getPasswordStrength(passData.newPassword);

  const handlePassSubmit = async (e) => {
    e.preventDefault();
    if (passData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passData.newPassword !== passData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setPassLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: passData.currentPassword,
        newPassword: passData.newPassword,
      });
      toast.success('Password updated successfully! 🔐');
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <CustomerLayoutWrapper>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        {/* Profile Card & Info */}
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', mdDirection: 'row', gap: 32 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center' }}>
              {/* Photo */}
              <div style={{ position: 'relative', width: 120, height: 120, cursor: isEditing ? 'pointer' : 'default' }} onClick={handleAvatarClick}>
                <img
                  src={avatarPreview || 'https://via.placeholder.com/120x120?text=Profile'}
                  alt="Avatar"
                  style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary-light)' }}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/120x120?text=User'; }}
                />
                {isEditing && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 20 }}>
                    <FiCamera />
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              {/* Text Fields */}
              <div style={{ flex: 1, minWidth: 260 }}>
                {!isEditing ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <h2 style={{ fontSize: 22, fontWeight: 800 }}>{user?.name}</h2>
                      <button onClick={() => setIsEditing(true)} className="btn btn-outline btn-sm">
                        <FiEdit /> Edit Profile
                      </button>
                    </div>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>📧 <strong>Email:</strong> {user?.email}</p>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 4 }}>📞 <strong>Phone:</strong> {user?.phone || 'Not added yet'}</p>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>🌱 Member since: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recently'}</p>
                  </>
                ) : (
                  <form onSubmit={handleProfileSave}>
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">Full Name</label>
                      <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">Phone Number</label>
                      <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter 10-digit number" />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={profileLoading}>
                        <FiCheck /> {profileLoading ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={handleCancelEdit} disabled={profileLoading}>
                        <FiX /> Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Spent/Orders Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, borderTop: '1px solid var(--color-border)', paddingTop: 24, marginTop: 12 }}>
              <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  <FiShoppingBag />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{ordersCount}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Total Orders</div>
                </div>
              </div>
              <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--color-secondary-light)', color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  <FiDollarSign />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>₹{totalSpent.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Total Spent</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card" style={{ maxWidth: 500 }}>
          <div className="card-header">
            <h3 className="card-title">🔐 Change Password</h3>
          </div>
          <div className="card-body">
            <form onSubmit={handlePassSubmit}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    className="form-input"
                    name="currentPassword"
                    value={passData.currentPassword}
                    onChange={handlePassChange}
                    required
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                    {showCurrent ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="form-input"
                    name="newPassword"
                    value={passData.newPassword}
                    onChange={handlePassChange}
                    required
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                    {showNew ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {/* Strength Meter */}
                {passData.newPassword && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Password Strength:</span>
                      <span style={{ fontWeight: 600, color: strength.color }}>{strength.text}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(strength.score / 4) * 100}%`, background: strength.color, transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    className="form-input"
                    name="confirmPassword"
                    value={passData.confirmPassword}
                    onChange={handlePassChange}
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                    {showConfirm ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={passLoading}>
                {passLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </CustomerLayoutWrapper>
  );
}
