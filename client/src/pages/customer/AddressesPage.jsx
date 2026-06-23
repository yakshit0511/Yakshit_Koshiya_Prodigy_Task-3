import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import CustomerLayoutWrapper from '../../components/layout/CustomerLayoutWrapper';
import { LoadingSpinner, EmptyState, ConfirmModal } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';
import { FiHome, FiBriefcase, FiMapPin, FiCheck, FiTrash2, FiEdit } from 'react-icons/fi';

export default function AddressesPage() {
  const { user, setUser } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    label: 'Home',
    street: '',
    city: '',
    state: '',
    pincode: '',
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
      label: 'Home',
      street: '',
      city: '',
      state: '',
      pincode: '',
      isDefault: false,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingAddress(addr);
    setFormData({
      label: addr.label || 'Home',
      street: addr.street || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
      isDefault: addr.isDefault || false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.street.trim() || !formData.city.trim() || !formData.state.trim() || !formData.pincode.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!/^\d{6}$/.test(formData.pincode)) {
      toast.error('Pincode must be exactly 6 digits');
      return;
    }
    setSubmitLoading(true);
    try {
      let res;
      if (editingAddress) {
        res = await authApi.updateAddress(editingAddress._id, formData);
        toast.success('Address updated! 🏠');
      } else {
        res = await authApi.addAddress(formData);
        toast.success('Address added! 🏠');
      }
      if (res.data.addresses) {
        setUser({ ...user, addresses: res.data.addresses });
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to save address');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setDeletingId(id);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const res = await authApi.deleteAddress(deletingId);
      if (res.data.addresses) {
        setUser({ ...user, addresses: res.data.addresses });
      }
      toast.success('Address deleted successfully.');
      setDeletingId(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete address');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSetDefault = async (addr) => {
    try {
      const res = await authApi.updateAddress(addr._id, { ...addr, isDefault: true });
      if (res.data.addresses) {
        setUser({ ...user, addresses: res.data.addresses });
      }
      toast.success('Default address updated.');
    } catch (err) {
      toast.error(err.message || 'Failed to set default');
    }
  };

  const getLabelIcon = (label) => {
    switch (label) {
      case 'Home': return <FiHome />;
      case 'Work': return <FiBriefcase />;
      default: return <FiMapPin />;
    }
  };

  return (
    <CustomerLayoutWrapper title="🏠 Saved Addresses">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={handleOpenAdd}>
          ➕ Add New Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          icon="🏠"
          title="No Addresses Saved"
          description="Save your shipping addresses now for faster checkout later."
          action={
            <button className="btn btn-outline" onClick={handleOpenAdd}>
              Add Address
            </button>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {addresses.map((addr) => (
            <div
              key={addr._id}
              style={{
                background: 'var(--color-surface)',
                border: addr.isDefault ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                borderRadius: 16,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
                position: 'relative',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 10px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                    background: addr.label === 'Home' ? 'var(--color-primary-light)' : addr.label === 'Work' ? 'var(--color-accent-light)' : '#f3f4f6',
                    color: addr.label === 'Home' ? 'var(--color-primary)' : addr.label === 'Work' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  }}>
                    {getLabelIcon(addr.label)} {addr.label}
                  </span>
                  {addr.isDefault && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--badge-success-color, var(--color-success))', background: 'var(--badge-success-bg, #dcfce7)', padding: '3px 8px', borderRadius: 12 }}>
                      Default
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                  <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>Shipping Address Details:</p>
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{addr.street}</p>
                  <p style={{ margin: 0 }}>{addr.city}, {addr.state} - <strong>{addr.pincode}</strong></p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--color-border)', paddingTop: 14, marginTop: 'auto' }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleOpenEdit(addr)}>
                  <FiEdit /> Edit
                </button>
                <button className="btn btn-ghost btn-sm danger" style={{ color: 'var(--color-error)' }} onClick={() => handleDeleteClick(addr._id)}>
                  <FiTrash2 /> Delete
                </button>
                {!addr.isDefault && (
                  <button className="btn btn-outline btn-sm" onClick={() => handleSetDefault(addr)}>
                    Set Default
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingAddress ? 'Edit Address' : 'Add New Address'}
        confirmText="Save Address"
        onConfirm={handleSubmit}
        loading={submitLoading}
        message={
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Address Label</label>
              <select
                className="form-input form-select"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              >
                <option value="Home">Home 🏠</option>
                <option value="Work">Work 💼</option>
                <option value="Other">Other 📍</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Street Address <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <textarea
                className="form-input"
                rows={3}
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="Flat No, House Name, Street/Locality details"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">City <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  className="form-input"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Anand"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">State <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  className="form-input"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="e.g. Gujarat"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">PIN Code (6 digits) <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                maxLength={6}
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="e.g. 388001"
                required
              />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}>
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              <label htmlFor="isDefault" style={{ fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Set as my default shipping address
              </label>
            </div>
          </div>
        }
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Address"
        confirmText="Yes, Delete Address"
        danger
        loading={deleteLoading}
        message="Are you sure you want to delete this saved address?"
      />
    </CustomerLayoutWrapper>
  );
}
