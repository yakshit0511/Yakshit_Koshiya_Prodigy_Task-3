import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import { Breadcrumb, LoadingSpinner, EmptyState, Badge } from '../../components/common/index.jsx';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderApi.getMyOrders()
      .then((res) => setOrders(res.data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'My Orders' }]} />

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>📦 My Orders</h1>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders placed yet"
          description="Browse our items and place your first order today!"
          action={
            <Link to="/products" className="btn btn-primary">
              Shop Now 🏪
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {orders.map((order) => (
            <div
              key={order._id}
              style={{
                background: 'white',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                transition: 'transform 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>Order #{order._id.slice(-8).toUpperCase()}</span>
                  <Badge variant={getStatusVariant(order.orderStatus)}>{order.orderStatus}</Badge>
                  <Badge variant={order.paymentStatus === 'Paid' ? 'success' : 'danger'}>{order.paymentStatus}</Badge>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  Placed on: {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  Items: {order.orderItems?.length || 0} items
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>
                    ₹{order.totalAmount?.toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Payment: {order.paymentMethod}</div>
                </div>
                <Link to={`/my-orders/${order._id}`} className="btn btn-outline btn-sm">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
