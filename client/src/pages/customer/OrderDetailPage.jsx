import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import { reviewApi } from '../../api/reviewApi';
import { Breadcrumb, LoadingSpinner, EmptyState, ConfirmModal } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiDownload, FiXCircle, FiRefreshCw, FiHelpCircle, FiCheck, FiStar, FiMessageSquare } from 'react-icons/fi';

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  const [reviewProduct, setReviewProduct] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);

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

  const handleDownloadInvoice = async () => {
    try {
      const res = await orderApi.downloadInvoice(orderId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${order?.orderNumber || orderId.slice(-8).toUpperCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Invoice downloaded! 📄');
    } catch (err) {
      toast.error('Failed to download invoice');
    }
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please enter a cancellation reason');
      return;
    }
    setCancelLoading(true);
    try {
      await orderApi.cancelOrder(orderId, cancelReason);
      toast.success('Order cancelled successfully!');
      setCancelOpen(false);
      fetchOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReturnRequest = async () => {
    if (!returnReason.trim()) {
      toast.error('Please enter a return reason');
      return;
    }
    setReturnLoading(true);
    try {
      await orderApi.requestReturn(orderId, returnReason);
      toast.success('Return request submitted!');
      setReturnOpen(false);
      fetchOrder();
    } catch (err) {
      toast.error(err.message || 'Failed to request return');
    } finally {
      setReturnLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewProduct) return;
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      toast.error('Please fill in review details');
      return;
    }
    setReviewLoading(true);
    try {
      const fd = new FormData();
      fd.append('productId', reviewProduct._id);
      fd.append('rating', reviewRating);
      fd.append('title', reviewTitle);
      fd.append('comment', reviewComment);
      reviewImages.forEach(file => {
        fd.append('images', file);
      });

      await reviewApi.createReview(fd);
      toast.success('Review submitted successfully! ⭐');
      setReviewProduct(null);
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (!order) return <EmptyState icon="😕" title="Order not found" />;

  // Stepper steps configuration
  const steps = ['Placed', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
  const isOrderCancelled = order.orderStatus === 'Cancelled';

  // Find when status changed
  const getStatusTimestamp = (statusName) => {
    const record = order.statusHistory?.find(h => h.status === statusName);
    return record ? new Date(record.changedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : null;
  };

  const getStatusNote = (statusName) => {
    const record = order.statusHistory?.find(h => h.status === statusName);
    return record?.note || '';
  };

  // Determine current active index in steps
  const currentStepIndex = steps.indexOf(order.orderStatus);

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'My Orders', href: '/my-orders' },
          { label: `Order ${order.orderNumber || orderId.slice(-8).toUpperCase()}` },
        ]}
      />

      {/* Back button and title */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/my-orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
          <FiArrowLeft /> Back to My Orders
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>Order #{order.orderNumber || orderId.slice(-8).toUpperCase()}</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4 }}>
              Placed on {new Date(order.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={handleDownloadInvoice}>
              <FiDownload /> Download Invoice
            </button>
            {['Placed', 'Confirmed'].includes(order.orderStatus) && (
              <button className="btn btn-danger btn-sm" onClick={() => setCancelOpen(true)}>
                <FiXCircle /> Cancel Order
              </button>
            )}
            {order.orderStatus === 'Delivered' && (
              <button className="btn btn-secondary btn-sm" onClick={() => setReturnOpen(true)}>
                <FiRefreshCw /> Request Return
              </button>
            )}
            <Link to="/support" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-primary)' }}>
              <FiHelpCircle /> Need Help?
            </Link>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', lgDirection: 'row', gridTemplateColumns: 'minmax(0, 2.2fr) 1.2fr', gap: 32 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Order Timeline Stepper */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24 }}>Order Status Timeline</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: 32 }}>
              {/* Stepper Vertical Line */}
              <div style={{
                position: 'absolute',
                left: 11,
                top: 14,
                bottom: 14,
                width: 2,
                background: '#cbd5e1',
                zIndex: 0
              }} />

              {/* Steps Mapping */}
              {steps.map((step, idx) => {
                const timestamp = getStatusTimestamp(step);
                const note = getStatusNote(step);
                const isCompleted = !!timestamp;
                const isCurrent = order.orderStatus === step;

                return (
                  <div key={step} style={{ display: 'flex', gap: 16, marginBottom: idx === steps.length - 1 ? 0 : 28, position: 'relative', zIndex: 1 }}>
                    {/* Circle Indicator */}
                    <div style={{
                      position: 'absolute',
                      left: -32,
                      top: 2,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: isCompleted ? 'var(--color-success)' : isCurrent ? 'var(--color-primary-light)' : 'white',
                      border: `2px solid ${isCompleted ? 'var(--color-success)' : isCurrent ? 'var(--color-primary)' : '#cbd5e1'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: 10,
                      boxShadow: isCurrent ? '0 0 0 4px rgba(22,163,74,0.2)' : 'none',
                    }}>
                      {isCompleted ? <FiCheck size={12} /> : isCurrent ? (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', animation: 'pulse 1.5s infinite' }} />
                      ) : null}
                    </div>

                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: isCompleted ? 'var(--color-text)' : 'var(--color-text-secondary)' }}>
                        {step}
                      </div>
                      {timestamp && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                          Completed on {timestamp}
                        </div>
                      )}
                      {note && (
                        <div style={{ fontSize: 11, color: 'var(--color-secondary)', marginTop: 2, fontWeight: 500 }}>
                          Note: {note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Cancelled Step (if applicable) */}
              {isOrderCancelled && (
                <div style={{ display: 'flex', gap: 16, marginTop: 20, position: 'relative', zIndex: 1 }}>
                  <div style={{
                    position: 'absolute',
                    left: -32,
                    top: 2,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'var(--color-error)',
                    border: '2px solid var(--color-error)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 10
                  }}>
                    ✕
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-error)' }}>
                      Order Cancelled
                    </div>
                    {getStatusTimestamp('Cancelled') && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        Cancelled on {getStatusTimestamp('Cancelled')}
                      </div>
                    )}
                    {order.cancelReason && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', background: '#fee2e240', padding: '6px 12px', borderRadius: 6, marginTop: 4 }}>
                        Reason: "{order.cancelReason}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Section */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Order Items</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {order.items?.map((item) => (
                <div key={item.product?._id || item.productName} style={{ display: 'flex', gap: 16, alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
                  <img
                    src={item.productImage || 'https://via.placeholder.com/60x60?text=Product'}
                    alt={item.productName}
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #f1f5f9' }}
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/60x60?text=P'; }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {item.productName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                      Qty: {item.quantity} &nbsp;•&nbsp; ₹{item.price?.toLocaleString('en-IN')} each
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                      ₹{item.totalPrice?.toLocaleString('en-IN')}
                    </div>
                    {order.orderStatus === 'Delivered' && (
                      <button
                        onClick={() => setReviewProduct(item.product)}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '6px 12px' }}
                      >
                        Write Review
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Shipping Address */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Shipping Address</h2>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <div style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: 'var(--color-primary-light)', color: 'var(--color-primary)', marginBottom: 8 }}>
                📦 Delivery Address
              </div>
              <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{order.shippingAddress?.name}</div>
              <div style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
                {order.shippingAddress?.street}
              </div>
              <div style={{ color: 'var(--color-text-secondary)' }}>
                {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.pincode}
              </div>
              <div style={{ color: 'var(--color-text-secondary)', marginTop: 8 }}>
                📞 Phone: {order.shippingAddress?.phone}
              </div>
            </div>
          </div>

          {/* Payment Card */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Payment Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Payment Method:</span>
                <span style={{ fontWeight: 600 }}>{order.paymentMethod}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Payment Status:</span>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 700,
                  background: order.paymentStatus === 'Paid' ? '#dcfce7' : '#fee2e2',
                  color: order.paymentStatus === 'Paid' ? '#16a34a' : '#ef4444'
                }}>
                  {order.paymentStatus}
                </span>
              </div>
              {order.paymentDetails?.transactionId && (
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  <strong>Txn ID:</strong> <span style={{ fontFamily: 'monospace' }}>{order.paymentDetails.transactionId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Order Summary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Subtotal:</span>
                <span>₹{order.subtotal?.toLocaleString('en-IN')}</span>
              </div>
              {order.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
                  <span>Discount {order.couponApplied?.code && `(${order.couponApplied.code})`}:</span>
                  <span>-₹{order.discountAmount?.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Shipping:</span>
                <span>{order.shippingCharge === 0 ? 'Free' : `₹${order.shippingCharge}`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, borderTop: '2px solid var(--color-border)', paddingTop: 10, marginTop: 4 }}>
                <span>Total Amount:</span>
                <span>₹{order.totalAmount?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Reason Modal */}
      <ConfirmModal
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelOrder}
        title="Cancel Order"
        confirmText="Confirm Cancellation"
        danger
        loading={cancelLoading}
        message={
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Please state a reason for cancellation:</label>
            <textarea
              className="form-input"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="E.g., Ordered wrong items, changed my mind"
              rows={3}
              required
            />
          </div>
        }
      />

      {/* Return Request Modal */}
      <ConfirmModal
        isOpen={returnOpen}
        onClose={() => setReturnOpen(false)}
        onConfirm={handleReturnRequest}
        title="Request Return"
        confirmText="Submit Return Request"
        loading={returnLoading}
        message={
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Please state a reason for returning:</label>
            <textarea
              className="form-input"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="E.g., Item damaged, incorrect product size"
              rows={3}
              required
            />
          </div>
        }
      />

      {/* Write Review Modal */}
      <ConfirmModal
        isOpen={!!reviewProduct}
        onClose={() => setReviewProduct(null)}
        title="Write a Review"
        confirmText="Submit Review"
        onConfirm={handleReviewSubmit}
        loading={reviewLoading}
        message={
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reviewProduct && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={reviewProduct.images?.[0]?.url || 'https://via.placeholder.com/40x40?text=P'}
                  alt={reviewProduct.name}
                  style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                />
                <span style={{ fontWeight: 700, fontSize: 14 }}>Reviewing "{reviewProduct.name}"</span>
              </div>
            )}

            {/* Rating */}
            <div>
              <label className="form-label">Rating</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    style={{ fontSize: 24, color: star <= reviewRating ? '#f59e0b' : '#cbd5e1', cursor: 'pointer' }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Review Title</label>
              <input
                className="form-input"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="E.g., Highly recommended / Good quality"
                required
              />
            </div>

            {/* Comment */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Review Comment</label>
              <textarea
                className="form-input"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Write your review comments here..."
                rows={4}
                required
              />
            </div>

            {/* Images */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Upload Images (optional, max 3)</label>
              <input
                type="file"
                className="form-input"
                multiple
                accept="image/*"
                onChange={handleImageChange}
              />
              {reviewImages.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  {reviewImages.length} images selected
                </div>
              )}
            </div>
          </div>
        }
      />

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
