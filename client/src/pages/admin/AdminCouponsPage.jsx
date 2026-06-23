import { useState, useEffect } from 'react';
import { couponApi } from '../../api/reviewApi'; // couponApi is in reviewApi.js
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import AdminModal from '../../components/common/AdminModal';
import { LoadingSpinner } from '../../components/common/index.jsx';
import { FiPlus, FiEdit, FiTrash2, FiTag, FiCalendar, FiSlash, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null); // null = Add mode
  const [formLoading, setFormLoading] = useState(false);

  // Form States
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' | 'fixed'
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await couponApi.getCoupons();
      setCoupons(res.data.coupons || []);
    } catch (err) {
      toast.error('Failed to load coupons list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCoupon(null);
    setCode('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMinOrderAmount('0');
    setMaxDiscountAmount('');
    setUsageLimit('');
    // Default validFrom to today's date formatted as YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];
    setValidFrom(todayStr);
    setValidUntil('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code || '');
    setDescription(coupon.description || '');
    setDiscountType(coupon.discountType || 'percentage');
    setDiscountValue(coupon.discountValue?.toString() || '');
    setMinOrderAmount(coupon.minOrderAmount?.toString() || '0');
    setMaxDiscountAmount(coupon.maxDiscountAmount?.toString() || '');
    setUsageLimit(coupon.usageLimit?.toString() || '');
    setValidFrom(coupon.validFrom ? new Date(coupon.validFrom).toISOString().split('T')[0] : '');
    setValidUntil(coupon.validUntil ? new Date(coupon.validUntil).toISOString().split('T')[0] : '');
    setIsActive(coupon.isActive !== false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || !discountValue || !validFrom || !validUntil) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setFormLoading(true);

    const payload = {
      code: code.trim().toUpperCase(),
      description: description.trim(),
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount),
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      validFrom: new Date(validFrom).toISOString(),
      validUntil: new Date(validUntil).toISOString(),
      isActive,
    };

    try {
      if (editingCoupon) {
        await couponApi.updateCoupon(editingCoupon._id, payload);
        toast.success('Coupon updated successfully! 🎟️');
      } else {
        await couponApi.createCoupon(payload);
        toast.success('Coupon created successfully! 🎟️');
      }
      handleCloseModal();
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save coupon');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleActive = async (coupon) => {
    try {
      const nextActive = !coupon.isActive;
      await couponApi.updateCoupon(coupon._id, { ...coupon, isActive: nextActive });
      toast.success(`Coupon "${coupon.code}" is now ${nextActive ? 'Active' : 'Disabled'}.`);
      fetchCoupons();
    } catch (err) {
      toast.error('Failed to toggle coupon status.');
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Are you sure you want to delete coupon code "${code}"?`)) return;
    try {
      await couponApi.deleteCoupon(id);
      toast.success('Coupon deleted successfully.');
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete coupon');
    }
  };

  const getCouponStatus = (coupon) => {
    const now = new Date();
    if (!coupon.isActive) return 'disabled';
    if (new Date(coupon.validUntil) < now) return 'expired';
    if (new Date(coupon.validFrom) > now) return 'pending';
    return 'active';
  };

  // Define columns for DataTable
  const columns = [
    {
      header: 'Coupon Code',
      key: 'code',
      render: (val, row) => {
        const status = getCouponStatus(row);
        const isMuted = status === 'expired' || status === 'disabled';
        return (
          <span 
            style={{ 
              fontFamily: 'monospace', 
              fontWeight: 'bold', 
              fontSize: 14, 
              background: 'var(--color-bg)', 
              padding: '4px 10px', 
              borderRadius: 6,
              color: isMuted ? 'var(--color-text-muted)' : 'var(--color-accent)',
              border: '1px solid var(--color-border)',
              textDecoration: status === 'expired' ? 'line-through' : 'none'
            }}
          >
            {val}
          </span>
        );
      }
    },
    {
      header: 'Discount Details',
      key: 'discountValue',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
            {row.discountType === 'percentage' ? `${val}% Off` : `₹${val} Off`}
          </div>
          {row.discountType === 'percentage' && row.maxDiscountAmount && (
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              Max discount: ₹{row.maxDiscountAmount}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Min Cart Value',
      key: 'minOrderAmount',
      render: (val) => <span style={{ fontWeight: 600 }}>₹{val}</span>
    },
    {
      header: 'Validity Period',
      key: 'validUntil',
      render: (val, row) => (
        <div style={{ fontSize: 12 }}>
          <div>From: {new Date(row.validFrom).toLocaleDateString('en-IN')}</div>
          <div>Until: {new Date(val).toLocaleDateString('en-IN')}</div>
        </div>
      )
    },
    {
      header: 'Usage Track',
      key: 'usageLimit',
      render: (val, row) => (
        <span style={{ fontWeight: 500 }}>
          {val ? `${row.usedCount || 0} / ${val} used` : `${row.usedCount || 0} used (Unlimited)`}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'isActive',
      render: (val, row) => {
        const status = getCouponStatus(row);
        if (status === 'disabled') {
          return <span style={{ background: '#f3f4f6', color: '#4b5563', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Disabled</span>;
        }
        if (status === 'expired') {
          return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Expired</span>;
        }
        if (status === 'pending') {
          return <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Scheduled</span>;
        }
        return <span style={{ background: '#f0fdf4', color: '#15803d', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Active</span>;
      }
    },
    {
      header: 'Actions',
      key: '_id',
      sortable: false,
      render: (val, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEditModal(row)} title="Edit Coupon">
            <FiEdit size={14} />
          </button>
          <button 
            className={`btn btn-ghost btn-sm ${row.isActive ? 'warning' : 'success'}`} 
            onClick={() => handleToggleActive(row)}
            title={row.isActive ? 'Disable Coupon' : 'Enable Coupon'}
            style={{ color: row.isActive ? '#d97706' : '#16a34a' }}
          >
            {row.isActive ? <FiSlash size={14} /> : <FiCheckCircle size={14} />}
          </button>
          <button className="btn btn-ghost btn-sm danger" onClick={() => handleDelete(val, row.code)} title="Delete Coupon">
            <FiTrash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <AdminLayoutWrapper title="Manage Promotional Coupons">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: 0 }}>
            Configure and distribute discounts, usage limits, and validity parameters.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiPlus /> Create Coupon
        </button>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : (
        <DataTable
          columns={columns}
          data={coupons}
          loading={loading}
          searchPlaceholder="Search coupon codes..."
          searchKey={['code', 'description']}
          exportFilename="coupons_export.csv"
        />
      )}

      {/* Add / Edit Coupon Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCoupon ? '✏️ Edit Discount Coupon' : '🎟️ Create Promo Coupon'}
        width={550}
      >
        <form onSubmit={handleSubmit}>
          
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Coupon Code <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              placeholder="e.g. SAVINGS50"
              style={{ width: '100%', boxSizing: 'border-box', textTransform: 'uppercase' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Description
            </label>
            <textarea
              className="form-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Get ₹50 off on purchases above ₹500"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Discount Type</label>
              <select 
                className="form-input form-select" 
                value={discountType} 
                onChange={(e) => setDiscountType(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box' }}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Discount Value <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                type="number"
                className="form-input"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
                min="1"
                placeholder={discountType === 'percentage' ? 'e.g. 15' : 'e.g. 100'}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Min Cart Subtotal (₹)</label>
              <input
                type="number"
                className="form-input"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                min="0"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Max Discount Cap (₹)</label>
              <input
                type="number"
                className="form-input"
                value={maxDiscountAmount}
                onChange={(e) => setMaxDiscountAmount(e.target.value)}
                placeholder="Unlimited"
                disabled={discountType === 'fixed'}
                style={{ width: '100%', boxSizing: 'border-box', background: discountType === 'fixed' ? '#f1f5f9' : 'white' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Valid From <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                required
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Valid Until / Expiry <span style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                required
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Usage Limit</label>
              <input
                type="number"
                className="form-input"
                value={usageLimit}
                onChange={(e) => setUsageLimit(e.target.value)}
                placeholder="Unlimited"
                min="1"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', marginTop: 18 }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                />
                Is Coupon Enabled
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={handleCloseModal} disabled={formLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={formLoading}>
              {formLoading ? 'Saving...' : editingCoupon ? 'Save Changes' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </AdminModal>
    </AdminLayoutWrapper>
  );
}
