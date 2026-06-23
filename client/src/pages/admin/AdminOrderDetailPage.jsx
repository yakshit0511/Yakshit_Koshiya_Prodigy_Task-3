import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { Breadcrumb, LoadingSpinner, EmptyState } from '../../components/common/index.jsx';
import StatusBadge from '../../components/common/StatusBadge';
import { FiArrowLeft, FiUser, FiMail, FiPhone, FiMapPin, FiCreditCard, FiClock, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Status states
  const [status, setStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Payment states
  const [payStatus, setPayStatus] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState(false);

  const fetchOrder = () => {
    setLoading(true);
    orderApi.adminGetOrder(id)
      .then((res) => {
        const o = res.data.order;
        setOrder(o);
        if (o) {
          setStatus(o.orderStatus);
          setPayStatus(o.paymentStatus);
        }
      })
      .catch((err) => {
        toast.error('Failed to load order detail.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleUpdateStatus = async (statusOverride) => {
    const targetStatus = statusOverride || status;
    if (!targetStatus) return;

    setUpdatingStatus(true);
    try {
      await orderApi.adminUpdateStatus(id, { newStatus: targetStatus, note: statusNote.trim() });
      toast.success(`Order status updated to ${targetStatus}!`);
      setStatusNote('');
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!payStatus) return;

    setUpdatingPayment(true);
    try {
      await orderApi.adminUpdatePayment(id, { paymentStatus: payStatus });
      toast.success(`Payment status updated to ${payStatus}!`);
      fetchOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update payment status');
    } finally {
      setUpdatingPayment(false);
    }
  };

  // Logic to determine the next status
  const getNextStatusLabel = () => {
    if (!order) return null;
    switch (order.orderStatus) {
      case 'Placed': return { next: 'Confirmed', action: 'Confirm Order' };
      case 'Confirmed': return { next: 'Processing', action: 'Mark Processing' };
      case 'Processing': return { next: 'Shipped', action: 'Mark Shipped' };
      case 'Shipped': return { next: 'Out for Delivery', action: 'Mark Out for Delivery' };
      case 'Out for Delivery': return { next: 'Delivered', action: 'Mark Delivered' };
      default: return null;
    }
  };

  const nextStatus = getNextStatusLabel();

  if (loading) {
    return (
      <AdminLayoutWrapper title="Order Details">
        <LoadingSpinner fullPage />
      </AdminLayoutWrapper>
    );
  }

  if (!order) {
    return (
      <AdminLayoutWrapper title="Order Details">
        <EmptyState icon="😕" title="Order not found" />
      </AdminLayoutWrapper>
    );
  }

  return (
    <AdminLayoutWrapper title={`Order Details: #${order.orderNumber || order._id.slice(-8).toUpperCase()}`}>
      <div style={{ marginBottom: 20 }}>
        <Link 
          to="/admin/orders" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: 14 }}
        >
          <FiArrowLeft /> Back to Orders
        </Link>
      </div>

      <Breadcrumb
        items={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Orders', href: '/admin/orders' },
          { label: `Order Info` },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: 24, alignItems: 'flex-start' }}>
        
        {/* Left Side: Items, Address, Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Order Items Snapshot Card */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
              📦 Order Items
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {order.items?.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    gap: 16, 
                    alignItems: 'center', 
                    borderBottom: idx === order.items.length - 1 ? 'none' : '1px solid var(--color-border)', 
                    paddingBottom: idx === order.items.length - 1 ? 0 : 16 
                  }}
                >
                  <img
                    src={item.productImage || 'https://via.placeholder.com/60x60?text=Product'}
                    alt={item.productName}
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                      {item.productName}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      ₹{item.price.toLocaleString('en-IN')} × {item.quantity}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--color-text)' }}>
                    ₹{item.totalPrice.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div style={{ marginTop: 24, borderTop: '2px solid var(--color-border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 350, marginLeft: 'auto' }}>
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>₹{order.subtotal?.toLocaleString('en-IN')}</span>
              </div>
              {order.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--color-success)' }}>
                  <span>Discount:</span>
                  <span style={{ fontWeight: 600 }}>-₹{order.discountAmount?.toLocaleString('en-IN')}</span>
                </div>
              )}
              {order.couponApplied?.code && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginTop: -6 }}>
                  <span>Coupon Applied:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{order.couponApplied.code}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Shipping:</span>
                <span style={{ fontWeight: 600 }}>{order.shippingCharge === 0 ? 'Free' : `₹${order.shippingCharge}`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800, borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 4 }}>
                <span>Total Paid:</span>
                <span style={{ color: '#16a34a' }}>₹{order.totalAmount?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Delivery & Shipping Snapshot Card */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
              <FiMapPin style={{ marginRight: 6 }} /> Shipping Details
            </h2>
            {order.shippingAddress ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                <div>
                  <h4 style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 6px 0' }}>Recipient Name</h4>
                  <p style={{ margin: 0, fontWeight: 600 }}>{order.shippingAddress.name}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 6px 0' }}>Contact Phone</h4>
                  <p style={{ margin: 0, fontWeight: 600 }}>{order.shippingAddress.phone}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <h4 style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 6px 0' }}>Street Address</h4>
                  <p style={{ margin: 0, fontWeight: 600, lineHeight: 1.5 }}>{order.shippingAddress.street}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 6px 0' }}>City / State</h4>
                  <p style={{ margin: 0, fontWeight: 600 }}>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 6px 0' }}>Pincode</h4>
                  <p style={{ margin: 0, fontWeight: 600, fontFamily: 'monospace' }}>{order.shippingAddress.pincode}</p>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>No shipping address provided.</p>
            )}
          </div>

          {/* Status History Timeline */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
              ⏳ Status Logs
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {order.statusHistory?.map((log, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#4f46e5', border: '3px solid #e0e7ff', marginTop: 4 }} />
                    {idx !== order.statusHistory.length - 1 && (
                      <div style={{ width: 2, height: 40, background: 'var(--color-border)', margin: '4px 0' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{log.status}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {new Date(log.changedAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {log.note && (
                      <p style={{ margin: '6px 0 0 0', background: 'var(--color-bg)', padding: 8, borderRadius: 6, fontSize: 13, color: 'var(--color-text-secondary)', borderLeft: '3px solid var(--color-border)' }}>
                        Note: {log.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Admin Updates Drawer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0' }}>📦 Order Status Manager</h2>
            
            <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 10, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Current Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>
                  {order.orderStatus}
                </span>
                <StatusBadge status={order.orderStatus} />
              </div>
            </div>
 
            {/* Next logical action stepper button */}
            {nextStatus && (
              <div style={{ marginBottom: 20, borderBottom: '1px solid var(--color-border)', paddingBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                  Recommended Next Action
                </div>
                <button 
                  className="btn btn-primary"
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 700 }}
                  onClick={() => handleUpdateStatus(nextStatus.next)}
                  disabled={updatingStatus}
                >
                  {updatingStatus ? 'Updating...' : `👉 ${nextStatus.action} (${nextStatus.next})`}
                </button>
              </div>
            )}

            {/* Manual override & status log note */}
            <div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Manual Status Override</label>
                <select 
                  className="form-input form-select" 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ fontSize: 13 }}
                >
                  <option value="Placed">Placed</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Return Requested">Return Requested</option>
                  <option value="Returned">Returned</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Update Reason / Note</label>
                <textarea 
                  className="form-input" 
                  rows={2} 
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Optional log message for customer..."
                  style={{ fontSize: 13 }}
                />
              </div>

              <button 
                className="btn btn-outline" 
                style={{ width: '100%', fontWeight: 700 }}
                onClick={() => handleUpdateStatus()}
                disabled={updatingStatus}
              >
                Save Status Update
              </button>
            </div>
          </div>

          {/* Payment Status Manager card */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0' }}>💳 Payment Manager</h2>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Method:</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{order.paymentMethod}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Current Status:</div>
              <StatusBadge status={order.paymentStatus} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Set Payment Status</label>
              <select 
                className="form-input form-select" 
                value={payStatus} 
                onChange={(e) => setPayStatus(e.target.value)}
                style={{ fontSize: 13 }}
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>

            <button 
              className="btn btn-outline"
              style={{ width: '100%', fontWeight: 700 }} 
              onClick={handleUpdatePayment} 
              disabled={updatingPayment}
            >
              {updatingPayment ? 'Saving...' : 'Save Payment Status'}
            </button>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0' }}>👤 Customer Info</h2>
            {order.user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                    {order.user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{order.user.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Registered User</div>
                  </div>
                </div>
 
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <FiMail style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ color: 'var(--color-text)' }}>{order.user.email}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <FiPhone style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ color: 'var(--color-text)' }}>{order.user.phone || 'No phone registered'}</span>
                  </div>
                </div>

                <Link 
                  to={`/admin/customers?search=${encodeURIComponent(order.user.email)}`}
                  className="btn btn-ghost"
                  style={{ width: '100%', textAlign: 'center', border: '1px solid var(--color-border)', fontSize: 12, display: 'block', textDecoration: 'none', padding: '6px 0' }}
                >
                  View Customer Record
                </Link>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 13 }}>Guest checkout or user deleted.</p>
            )}
          </div>

        </div>

      </div>
    </AdminLayoutWrapper>
  );
}
