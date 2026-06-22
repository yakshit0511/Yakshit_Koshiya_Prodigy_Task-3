import { useState, useEffect } from 'react';
import { orderApi } from '../../api/orderApi';
import { reviewApi } from '../../api/reviewApi';
import CustomerLayoutWrapper from '../../components/layout/CustomerLayoutWrapper';
import OrderCard from '../../components/order/OrderCard';
import { LoadingSpinner, EmptyState, ConfirmModal } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';
import { FiStar } from 'react-icons/fi';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  // Cancel Modal states
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Return Modal states
  const [returnOrderId, setReturnOrderId] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  // Review Modal states
  const [reviewOrder, setReviewOrder] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchOrders = () => {
    setLoading(true);
    orderApi.getMyOrders()
      .then((res) => setOrders(res.data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const tabs = ['All', 'Placed', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

  const getFilteredOrders = () => {
    if (activeTab === 'All') return orders;
    return orders.filter(o => o.orderStatus === activeTab);
  };

  const getTabCount = (tab) => {
    if (tab === 'All') return orders.length;
    return orders.filter(o => o.orderStatus === tab).length;
  };

  const handleCancelClick = (orderId) => {
    setCancelOrderId(orderId);
    setCancelReason('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please enter a cancellation reason');
      return;
    }
    setCancelLoading(true);
    try {
      await orderApi.cancelOrder(cancelOrderId, cancelReason);
      toast.success('Order cancelled successfully! 🛑');
      setCancelOrderId(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReturnClick = (orderId) => {
    setReturnOrderId(orderId);
    setReturnReason('');
  };

  const handleConfirmReturn = async () => {
    if (!returnReason.trim()) {
      toast.error('Please enter a return reason');
      return;
    }
    setReturnLoading(true);
    try {
      await orderApi.requestReturn(returnOrderId, returnReason);
      toast.success('Return request submitted! 🔄');
      setReturnOrderId(null);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to request return');
    } finally {
      setReturnLoading(false);
    }
  };

  const handleReviewClick = (order) => {
    setReviewOrder(order);
    if (order.orderItems?.length === 1) {
      setSelectedProduct(order.orderItems[0].product);
    } else {
      setSelectedProduct(null);
    }
    setReviewRating(5);
    setReviewTitle('');
    setReviewComment('');
    setReviewImages([]);
  };

  const handleImageChange = (e) => {
    setReviewImages(Array.from(e.target.files));
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!reviewTitle.trim() || !reviewComment.trim()) {
      toast.error('Please fill in both title and comment');
      return;
    }
    setReviewLoading(true);
    try {
      const fd = new FormData();
      fd.append('productId', selectedProduct._id);
      fd.append('rating', reviewRating);
      fd.append('title', reviewTitle);
      fd.append('comment', reviewComment);
      reviewImages.forEach(file => {
        fd.append('images', file);
      });

      await reviewApi.createReview(fd);
      toast.success('Thank you for your review! ⭐');
      setReviewOrder(null);
      setSelectedProduct(null);
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  const filteredOrders = getFilteredOrders();

  return (
    <CustomerLayoutWrapper title="📦 My Orders">
      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: 8,
        marginBottom: 24,
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          const count = getTabCount(tab);
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                background: isActive ? 'var(--color-primary-light)' : 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab}</span>
              <span style={{
                background: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                color: isActive ? 'white' : 'var(--color-text-secondary)',
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 9999,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Orders List */}
      {loading ? (
        <LoadingSpinner />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon="📦"
          title={`No ${activeTab !== 'All' ? activeTab.toLowerCase() : ''} orders found`}
          description="Browse our fresh selection and order some items!"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              onCancel={handleCancelClick}
              onReturn={handleReturnClick}
              onReview={handleReviewClick}
            />
          ))}
        </div>
      )}

      {/* Cancel Reason Modal */}
      <ConfirmModal
        isOpen={!!cancelOrderId}
        onClose={() => setCancelOrderId(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Order"
        confirmText="Yes, Cancel Order"
        danger
        loading={cancelLoading}
        message={
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Please tell us why you want to cancel:</label>
            <textarea
              className="form-input"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Change of mind, ordered incorrect product quantity"
              rows={3}
              required
            />
          </div>
        }
      />

      {/* Return Reason Modal */}
      <ConfirmModal
        isOpen={!!returnOrderId}
        onClose={() => setReturnOrderId(null)}
        onConfirm={handleConfirmReturn}
        title="Request Return"
        confirmText="Submit Return Request"
        loading={returnLoading}
        message={
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">Reason for returning this item:</label>
            <textarea
              className="form-input"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g., Product is damaged, not as described"
              rows={3}
              required
            />
          </div>
        }
      />

      {/* Write Review Modal */}
      <ConfirmModal
        isOpen={!!reviewOrder}
        onClose={() => { setReviewOrder(null); setSelectedProduct(null); }}
        title="Write a Review"
        confirmText="Submit Review"
        hideFooter={!selectedProduct}
        onConfirm={handleReviewSubmit}
        loading={reviewLoading}
        message={
          <div style={{ marginTop: 12 }}>
            {/* Step 1: Select Product if multiple */}
            {!selectedProduct ? (
              <div>
                <p className="form-label">Select a product to review:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {reviewOrder?.orderItems?.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => setSelectedProduct(item.product)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        border: '1px solid var(--color-border)',
                        borderRadius: 10,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                    >
                      <img
                        src={item.product?.images?.[0]?.url || 'https://via.placeholder.com/40x40?text=P'}
                        alt={item.product?.name}
                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{item.product?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Step 2: Fill out review form */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img
                    src={selectedProduct.images?.[0]?.url || 'https://via.placeholder.com/40x40?text=P'}
                    alt={selectedProduct.name}
                    style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Reviewing "{selectedProduct.name}"</div>
                    {reviewOrder.orderItems.length > 1 && (
                      <button
                        onClick={() => setSelectedProduct(null)}
                        style={{ color: 'var(--color-primary)', fontSize: 11, fontWeight: 600, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        ← Select different product
                      </button>
                    )}
                  </div>
                </div>

                {/* Rating Selection */}
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
                    placeholder="E.g., Great fresh taste! / Highly recommended"
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
                    placeholder="Provide details about quality, packaging, delivery etc."
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
            )}
          </div>
        }
      />
    </CustomerLayoutWrapper>
  );
}
