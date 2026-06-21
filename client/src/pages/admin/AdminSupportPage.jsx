import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supportApi } from '../../api/supportApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { LoadingSpinner, EmptyState, Badge } from '../../components/common/index.jsx';

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchTickets = () => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;

    supportApi.adminGetTickets(params)
      .then((res) => setTickets(res.data.tickets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'info';
      case 'in progress': return 'warning';
      case 'resolved':
      case 'closed': return 'success';
      default: return 'neutral';
    }
  };

  return (
    <AdminLayoutWrapper title="Customer Support Tickets">
      {/* Tab Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Filter:</span>
        {['', 'Open', 'In Progress', 'Resolved', 'Closed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-ghost'}`}
          >
            {status || 'All Tickets'}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No support tickets found"
          description="Support tickets opened by store customers will appear here."
        />
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Ticket ID</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Customer</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Subject</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Category</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Priority</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Date Created</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>#{t._id.slice(-6).toUpperCase()}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700 }}>{t.user?.name || 'Customer'}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{t.user?.email}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>{t.subject}</td>
                    <td style={{ padding: '16px 20px' }}>{t.category}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge variant={t.priority === 'High' ? 'danger' : t.priority === 'Medium' ? 'warning' : 'neutral'}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge variant={getStatusVariant(t.status)}>{t.status}</Badge>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {new Date(t.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Link to={`/admin/support/${t._id}`} className="btn btn-outline btn-sm">
                        Open Ticket
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayoutWrapper>
  );
}
