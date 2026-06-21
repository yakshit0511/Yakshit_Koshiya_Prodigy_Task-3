import { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { LoadingSpinner, EmptyState, Badge, Pagination } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCustomers = () => {
    setLoading(true);
    adminApi.getCustomers({ page, limit: 15 })
      .then((res) => {
        setCustomers(res.data.customers || []);
        setTotalPages(res.data.totalPages || 1);
      }).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  const handleToggleBlock = async (id, isBlocked) => {
    const action = isBlocked ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${action} this customer?`)) return;
    try {
      await adminApi.toggleBlockCustomer(id);
      toast.success(`Customer ${action}ed successfully`);
      fetchCustomers();
    } catch (err) {
      toast.error(err.message || `Failed to ${action} customer`);
    }
  };

  return (
    <AdminLayoutWrapper title="Manage Customers">
      {loading ? (
        <LoadingSpinner fullPage />
      ) : customers.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No customers found"
          description="Customers will appear here once they register on the store."
        />
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Customer Info</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Email Address</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Phone</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Registration Date</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                          {c.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Role: {c.role}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>{c.email}</td>
                    <td style={{ padding: '16px 20px' }}>{c.phone || '—'}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge variant={c.isBlocked ? 'danger' : 'success'}>
                        {c.isBlocked ? 'Blocked' : 'Active'}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {new Date(c.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {c.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleBlock(c._id, c.isBlocked)}
                          className={`btn btn-sm ${c.isBlocked ? 'btn-outline' : 'btn-danger'}`}
                        >
                          {c.isBlocked ? '✅ Unblock' : '🚫 Block'}
                        </button>
                      )}
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
