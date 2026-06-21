import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import { Breadcrumb, Modal, Badge } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

export default function AddressesPage() {
  const { user, setUser } = useAuth();
  const [addresses, setAddresses] = useState(user?.addresses || []);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null); // null means adding
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    addressLine: '',
    city: '',
    state: '',
    pinCode: '',
    isDefault: false,
  });

  useEffect(() => {
    if (user) {
      setAddresses(user.addresses || []);
    }
  }, [user]);

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setFormData({
      fullName: '',
      phone: '',
      addressLine: '',
      city: '',
      state: '',
      pinCode: '',
      isDefault: false,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingAddress(addr);
    setFormData({
      fullName: addr.fullName || '',
      phone: addr.phone || '',
      addressLine: addr.addressLine || '',
      city: addr.city || '',
      state: addr.state || '',
      pinCode: addr.pinCode || '',
      isDefault: addr.isDefault || false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      let res;
      if (editingAddress) {
        res = await authApi.updateAddress(editingAddress._id, formData);
        toast.success('Address updated!');
      } else {
        res = await authApi.addAddress(formData);
        toast.success('Address added!');
      }
      setUser(res.data.user);
      setModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save address');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      const res = await authApi.deleteAddress(id);
      setUser(res.data.user);
      toast.success('Address deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete address');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      const res = await authApi.setDefaultAddress(id);
      setUser(res.data.user);
      toast.success('Default address updated');
    } catch (err) {
      toast.error(err.message || 'Failed to set default address');
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Addresses' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>🏠 Shipping Addresses</h1>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          ➕ Add New Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div style={{ background: 'white', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Addresses Saved</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 20 }}>Save your shipping address now for a faster checkout later.</p>
          <button className="btn btn-primary" onClick={handleOpenAdd}>
            Add Your First Address
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {addresses.map((addr) => (
            <div
              key={addr._id}
              style={{
                background: 'white',
                border: addr.isDefault ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 20,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{addr.fullName}</span>
                  {addr.isDefault && <Badge variant="success">Default</Badge>}
                </div>
                <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                  <div>{addr.addressLine}</div>
                  <div>{addr.city}, {addr.state}</div>
                  <div>PIN: {addr.pinCode}</div>
                  <div style={{ marginTop: 8 }}>📞 Phone: {addr.phone}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--color-border)', paddingTop: 14, marginTop: 'auto' }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleOpenEdit(addr)}>
                  ✏️ Edit
                </button>
                <button className="btn btn-ghost btn-sm danger" onClick={() => handleDelete(addr._id)}>
                  🗑️ Delete
                </button>
                {!addr.isDefault && (
                  <button className="btn btn-outline btn-sm" onClick={() => handleSetDefault(addr._id)}>
                    Set Default
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingAddress ? 'Edit Address' : 'Add New Address'} width={450}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input
              className="form-input"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="E.g., Priya Sharma"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Phone Number <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input
              type="tel"
              className="form-input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="10-digit mobile number"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address Line <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input
              className="form-input"
              value={formData.addressLine}
              onChange={(e) => setFormData({ ...formData, addressLine: e.target.value })}
              placeholder="Flat/House No., Building, Street Name"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">City <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input
                className="form-input"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">State <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input
                className="form-input"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">PIN Code <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input
              type="number"
              className="form-input"
              value={formData.pinCode}
              onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="isDefault" style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Make this my default shipping address</label>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={submitLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitLoading}>
              {submitLoading ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
