import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { Breadcrumb, LoadingSpinner, EmptyState, Badge } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
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
      }).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleUpdateStatus = async () => {
    setUpdatingStatus(true);
    try {
      await orderApi.adminUpdateStatus(id, { orderStatus: status });
      toast.success('Order status updated!');
      fetchOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdatePayment = async () => {
    setUpdatingPayment(true);
    try {
      await orderApi.adminUpdatePayment(id, { paymentStatus: payStatus });
      toast.success('Payment status updated!');
      fetchOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to update payment status');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'success';
      case 'processing': return 'info';
      case 'shipped': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'neutral';
    }
  };

  if (loading) return <AdminLayoutWrapper title="Order Details"><LoadingSpinner fullPage /></AdminLayoutWrapper>;
  if (!order) return <AdminLayoutWrapper title="Order Details"><EmptyState icon="😕" title="Order not found" /></AdminLayoutWrapper>;

  return (
    <AdminLayoutWrapper title={`Order #${order._id.slice(-8).toUpperCase()}`}>
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Orders', href: '/admin/orders' },
          { label: `Order Details` },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'flex-start' }}>
        {/* Left column: Items and Totals */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Order Items */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Order Items</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {order.orderItems?.map((item) => (
                <div key={item._id} style={{ display: 'flex', gap: 16, alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
                  <img
                    src={item.product?.images?.[0]?.url || 'https://via.placeholder.com/60x60?text=P'}
                    alt={item.product?.name || 'Product'}
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }}
                  />
                  <div style={{ flex: 1 }}>
                    <Link to={`/products/${item.product?.slug}`} style={{ textDecoration: 'none', color: 'var(--color-text)', fontWeight: 700 }}>
                      {item.product?.name || 'Product deleted'}
                    </Link>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      Qty: {item.quantity} × ₹{item.price}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800 }}>
                    ₹{(item.quantity * item.price).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320, marginLeft: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Items Subtotal:</span>
                <span>₹{order.itemsPrice?.toLocaleString('en-IN')}</span>
              </div>
              {order.discountPrice > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: 'var(--color-success)' }}>
                  <span>Discount:</span>
                  <span>-₹{order.discountPrice?.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Shipping:</span>
                <span>₹{order.shippingPrice?.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, borderTop: '2px solid var(--color-border)', paddingTop: 8 }}>
                <span>Total Amount:</span>
                <span>₹{order.totalAmount?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Customer & Shipping Info</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Customer Details</h3>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                  <div><strong>Name:</strong> {order.user?.name}</div>
                  <div><strong>Email:</strong> {order.user?.email}</div>
                  <div><strong>Phone:</strong> {order.user?.phone || '—'}</div>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Delivery Address</h3>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                  <strong>{order.shippingAddress?.fullName}</strong>
                  <div>{order.shippingAddress?.addressLine}</div>
                  <div>{order.shippingAddress?.city}, {order.shippingAddress?.state}</div>
                  <div>PIN: {order.shippingAddress?.pinCode}</div>
                  <div style={{ marginTop: 4 }}>📞 Phone: {order.shippingAddress?.phone}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Admin Status Updaters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Order Status Update */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Order Status</h2>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Current: </span>
              <Badge variant={getStatusVariant(order.orderStatus)}>{order.orderStatus}</Badge>
            </div>
            <div className="form-group">
              <select className="form-input form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleUpdateStatus} disabled={updatingStatus}>
              {updatingStatus ? 'Updating...' : 'Update Status'}
            </button>
          </div>

          {/* Payment Status Update */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Payment Status</h2>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Current: </span>
              <Badge variant={order.paymentStatus === 'Paid' ? 'success' : 'danger'}>{order.paymentStatus}</Badge>
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
              Method: <strong>{order.paymentMethod}</strong>
            </div>
            <div className="form-group">
              <select className="form-input form-select" value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleUpdatePayment} disabled={updatingPayment}>
              {updatingPayment ? 'Updating...' : 'Update Payment'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayoutWrapper>
  );
}
