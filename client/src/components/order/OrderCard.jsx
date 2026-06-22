import { Link } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import toast from 'react-hot-toast';
import { FiDownload, FiXCircle, FiRefreshCw, FiStar, FiChevronRight } from 'react-icons/fi';

export default function OrderCard({ order, onCancel, onReturn, onReview }) {
  const getStatusDetails = (status) => {
    switch (status) {
      case 'Placed':
        return { text: 'Placed', bg: '#eff6ff', color: '#1d4ed8' };
      case 'Confirmed':
        return { text: 'Confirmed', bg: '#e0e7ff', color: '#4338ca' };
      case 'Processing':
        return { text: 'Processing', bg: '#f3e8ff', color: '#6b21a8' };
      case 'Shipped':
        return { text: 'Shipped', bg: '#ffedd5', color: '#c2410c' };
      case 'Out for Delivery':
        return { text: 'Out for Delivery', bg: '#fef3c7', color: '#b45309' };
      case 'Delivered':
        return { text: 'Delivered', bg: '#dcfce7', color: '#15803d' };
      case 'Cancelled':
        return { text: 'Cancelled', bg: '#fee2e2', color: '#b91c1c' };
      case 'Return Requested':
        return { text: 'Return Requested', bg: '#fef9c3', color: '#a16207' };
      case 'Returned':
        return { text: 'Returned', bg: '#f3f4f6', color: '#374151' };
      default:
        return { text: status || 'Unknown', bg: '#f3f4f6', color: '#374151' };
    }
  };

  const status = getStatusDetails(order.orderStatus);
  const firstItem = order.orderItems?.[0];
  const itemsCount = order.orderItems?.length || 0;

  const handleDownloadInvoice = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await orderApi.downloadInvoice(order._id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${order._id.slice(-8).toUpperCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Invoice downloaded successfully! 📄');
    } catch (err) {
      toast.error('Failed to download invoice');
    }
  };

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--color-border)',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.2s ease',
      }}
      className="order-card-hover"
    >
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>Order #{order._id.slice(-8).toUpperCase()}</span>
            <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: status.bg, color: status.color }}>
              {status.text}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-primary)' }}>
            ₹{order.totalAmount?.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Payment: {order.paymentMethod}</div>
        </div>
      </div>

      {/* Product snapshot Row */}
      {firstItem && (
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <img
            src={firstItem.product?.images?.[0]?.url || 'https://via.placeholder.com/60x60?text=Product'}
            alt={firstItem.product?.name || 'Product'}
            style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #f1f5f9' }}
            onError={(e) => { e.target.src = 'https://via.placeholder.com/60x60?text=P'; }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {firstItem.product?.name || 'Product Snapshot'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Qty: {firstItem.quantity} &nbsp;•&nbsp; ₹{firstItem.price?.toLocaleString('en-IN')} each
            </div>
            {itemsCount > 1 && (
              <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600, marginTop: 4 }}>
                + {itemsCount - 1} more item{itemsCount > 2 ? 's' : ''} in this order
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
        <Link to={`/my-orders/${order._id}`} className="btn btn-ghost btn-sm" style={{ padding: '8px 14px' }}>
          View Details <FiChevronRight />
        </Link>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Placed', 'Confirmed'].includes(order.orderStatus) && (
            <button onClick={() => onCancel(order._id)} className="btn btn-outline btn-danger btn-sm" style={{ padding: '8px 14px', borderColor: 'var(--color-error)', color: 'var(--color-error)' }}>
              <FiXCircle /> Cancel Order
            </button>
          )}

          {order.orderStatus === 'Delivered' && (
            <>
              <button onClick={() => onReview(order)} className="btn btn-outline btn-sm" style={{ padding: '8px 14px' }}>
                <FiStar /> Write Review
              </button>
              <button onClick={() => onReturn(order._id)} className="btn btn-ghost btn-sm" style={{ padding: '8px 14px', color: 'var(--color-secondary)' }}>
                <FiRefreshCw /> Return Request
              </button>
              <button onClick={handleDownloadInvoice} className="btn btn-ghost btn-sm" style={{ padding: '8px 14px' }}>
                <FiDownload /> Invoice
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
