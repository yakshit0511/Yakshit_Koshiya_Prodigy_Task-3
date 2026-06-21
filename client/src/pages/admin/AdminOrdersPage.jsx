import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { LoadingSpinner, EmptyState, Badge, Pagination } from '../../components/common/index.jsx';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = () => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (status) params.orderStatus = status;

    orderApi.adminGetOrders(params)
      .then((res) => {
        setOrders(res.data.orders || []);
        setTotalPages(res.data.totalPages || 1);
      }).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [page, status]);

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
    <AdminLayoutWrapper title="Manage Orders">
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Filter by status:</span>
        {['', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`btn btn-sm ${status === s ? 'btn-primary' : 'btn-ghost'}`}
          >
            {s || 'All Orders'}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders found"
          description="There are no orders matching the selected status."
        />
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Order ID</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Customer</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Date</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Total</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Payment Method</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Payment Status</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Order Status</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>#{o._id.slice(-8).toUpperCase()}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700 }}>{o.user?.name || 'Guest User'}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{o.user?.email}</div>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {new Date(o.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 700 }}>₹{o.totalAmount?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '16px 20px' }}>{o.paymentMethod}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge variant={o.paymentStatus === 'Paid' ? 'success' : 'danger'}>{o.paymentStatus}</Badge>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge variant={getStatusVariant(o.orderStatus)}>{o.orderStatus}</Badge>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Link to={`/admin/orders/${o._id}`} className="btn btn-outline btn-sm">
                        View / Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
        </div>
      )}
    </AdminLayoutWrapper>
  );
}
