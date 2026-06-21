import { useState, useEffect } from 'react';
import { couponApi } from '../../api/reviewApi'; // couponApi is in reviewApi.js or couponApi.js. We created couponApi.js so let's import from '../../api/couponApi'!
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { LoadingSpinner, EmptyState, Badge } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState('Percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [usageLimit, setUsageLimit] = useState('');

  const fetchCoupons = () => {
    setLoading(true);
    couponApi.getCoupons()
      .then((res) => setCoupons(res.data.coupons || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const resetForm = () => {
    setCode('');
    setDiscountType('Percentage');
    setDiscountValue('');
    setMinOrderAmount('0');
    setMaxDiscountAmount('');
    setExpiryDate('');
    setUsageLimit('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || !discountValue) return;
    setFormLoading(true);

    const payload = {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount),
      maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      expiryDate: expiryDate || null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
    };

    try {
      await couponApi.createCoupon(payload);
      toast.success('Coupon created successfully! 🎟️');
      resetForm();
      fetchCoupons();
    } catch (err) {
      toast.error(err.message || 'Failed to create coupon');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this coupon code?')) return;
    try {
      await couponApi.deleteCoupon(id);
      toast.success('Coupon deleted');
      fetchCoupons();
    } catch (err) {
      toast.error(err.message || 'Failed to delete coupon');
    }
  };

  return (
    <AdminLayoutWrapper title="Manage Promotional Coupons">
      {loading ? (
        <LoadingSpinner fullPage />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 32, alignItems: 'flex-start' }}>
          {/* Coupon list */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
            {coupons.length === 0 ? (
              <EmptyState icon="🎟️" title="No coupons active" description="Create a coupon to offer store discounts." />
            ) : (
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '16px 20px', fontWeight: 700 }}>Code</th>
                    <th style={{ padding: '16px 20px', fontWeight: 700 }}>Discount</th>
                    <th style={{ padding: '16px 20px', fontWeight: 700 }}>Min Order</th>
                    <th style={{ padding: '16px 20px', fontWeight: 700 }}>Expires</th>
                    <th style={{ padding: '16px 20px', fontWeight: 700 }}>Limit</th>
                    <th style={{ padding: '16px 20px', fontWeight: 700 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '16px 20px', fontWeight: 800, letterSpacing: 0.5 }}>{c.code}</td>
                      <td style={{ padding: '16px 20px', fontWeight: 700 }}>
                        {c.discountType === 'Percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                      </td>
                      <td style={{ padding: '16px 20px' }}>₹{c.minOrderAmount}</td>
                      <td style={{ padding: '16px 20px', fontSize: 13 }}>
                        {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString('en-IN') : 'Never'}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {c.usageLimit ? `${c.usedCount || 0} / ${c.usageLimit}` : 'Unlimited'}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <button className="btn btn-ghost btn-sm danger" onClick={() => handleDelete(c._id)}>
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Coupon creation form */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🎟️ Create Promo Coupon</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Coupon Code <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  className="form-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="E.g., FESTIVE30"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Discount Type</label>
                  <select className="form-input form-select" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Value <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input
                    type="number"
                    className="form-input"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    required
                    min="1"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Min Order (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Discount (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    placeholder="Leave empty for none"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Usage Limit</label>
                  <input
                    type="number"
                    className="form-input"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} disabled={formLoading || !code.trim() || !discountValue}>
                {formLoading ? 'Creating...' : 'Create Promo Coupon'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayoutWrapper>
  );
}
