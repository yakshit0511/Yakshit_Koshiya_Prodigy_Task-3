import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import { Breadcrumb, LoadingSpinner, EmptyState, Badge, ConfirmModal } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cancellation and Return State
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(false); // boolean for modal open
  const [reasonText, setReasonText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [returnOpen, setReturnOpen] = useState(false);

  const fetchOrder = () => {
    setLoading(true);
    orderApi.getOrderById(orderId)
      .then((res) => setOrder(res.data.order))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!reasonText.trim()) {
      toast.error('Please enter a reason for cancellation');
      return;
    }
    setActionLoading(true);
    try {
      await orderApi.cancelOrder(orderId, reasonText);
      toast.success('Order cancelled successfully!');
      setCancelOpen(false);
      setReasonText('');
      fetchOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnRequest = async () => {
    if (!reasonText.trim()) {
      toast.error('Please enter a reason for returning');
      return;
    }
    setActionLoading(true);
    try {
      await orderApi.requestReturn(orderId, reasonText);
      toast.success('Return request submitted!');
      setReturnOpen(false);
      setReasonText('');
      fetchOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to request return');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      const res = await orderApi.downloadInvoice(orderId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${orderId.slice(-8).toUpperCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error('Failed to download invoice');
    }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (!order) return <EmptyState icon="😕" title="Order not found" />;

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return 'success';
      case 'processing': return 'info';
      case 'shipped': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'My Orders', href: '/my-orders' },
          { label: `Order Details` },
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Order Details</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
            ID: #{order._id} | Date: {new Date(order.createdAt).toLocaleString('en-IN')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline btn-sm" onClick={handleDownloadInvoice}>
            📥 Download Invoice
          </button>
          {['Pending', 'Processing'].includes(order.orderStatus) && (
            <button className="btn btn-danger btn-sm" onClick={() => setCancelOpen(true)}>
              🚫 Cancel Order
            </button>
          )}
          {order.orderStatus === 'Delivered' && (
            <button className="btn btn-warning btn-sm" onClick={() => setReturnOpen(true)}>
              🔄 Request Return
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'flex-start' }}>
        {/* Left Side: Order Items */}
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 24 }}>
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
                <div style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                  ₹{(item.quantity * item.price).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>

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
              <span style={{ color: 'var(--color-text-secondary)' }}>Shipping Charges:</span>
              <span>₹{order.shippingPrice?.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, borderTop: '2px solid var(--color-border)', paddingTop: 8 }}>
              <span>Total Paid:</span>
              <span>₹{order.totalAmount?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Shipping & Payment details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Order Status Tracker */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Order Status</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 14 }}>Status:</span>
              <Badge variant={getStatusVariant(order.orderStatus)}>{order.orderStatus}</Badge>
            </div>
            {order.deliveredAt && (
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Delivered on: {new Date(order.deliveredAt).toLocaleString('en-IN')}
              </div>
            )}
          </div>

          {/* Shipping Address */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Shipping Address</h2>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <strong>{order.shippingAddress?.fullName}</strong>
              <div>{order.shippingAddress?.addressLine}</div>
              <div>{order.shippingAddress?.city}, {order.shippingAddress?.state}</div>
              <div>PIN: {order.shippingAddress?.pinCode}</div>
              <div style={{ marginTop: 8 }}>📞 {order.shippingAddress?.phone}</div>
            </div>
          </div>

          {/* Payment Info */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Payment Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Payment Method:</span>
                <span style={{ fontWeight: 600 }}>{order.paymentMethod}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Payment Status:</span>
                <Badge variant={order.paymentStatus === 'Paid' ? 'success' : 'danger'}>{order.paymentStatus}</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order ConfirmModal */}
      <ConfirmModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelOrder}
        title="Cancel Order"
        message={
          <div className="form-group" style={{ marginTop: 10 }}>
            <label className="form-label">Please state a reason for cancellation:</label>
            <input
              className="form-input"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="E.g., Ordered wrong item, changed my mind"
              required
            />
          </div>
        }
        confirmText="Cancel Order"
        danger
        loading={actionLoading}
      />

      {/* Return Request ConfirmModal */}
      <ConfirmModal
        isOpen={returnOpen}
        onClose={() => setReturnOpen(false)}
        onConfirm={handleReturnRequest}
        title="Request Order Return"
        message={
          <div className="form-group" style={{ marginTop: 10 }}>
            <label className="form-label">Please state a reason for returning:</label>
            <input
              className="form-input"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="E.g., Item damaged, wrong item delivered"
              required
            />
          </div>
        }
        confirmText="Request Return"
        loading={actionLoading}
      />
    </div>
  );
}
