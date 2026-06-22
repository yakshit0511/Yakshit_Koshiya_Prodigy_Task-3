import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportApi } from '../../api/supportApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import StatsCard from '../../components/common/StatsCard';
import { LoadingSpinner } from '../../components/common/index.jsx';
import { FiMessageSquare, FiAlertCircle, FiCheckCircle, FiArchive, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminSupportPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ open: 0, inProgress: 0, resolved: 0, closed: 0 });

  // Filter States
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (category) params.category = category;
      if (search) params.search = search;

      const res = await supportApi.adminGetTickets(params);
      const ticketsList = res.data.tickets || [];
      setTickets(ticketsList);

      // Compute statistics based on full fetch or separate calls
      // To get accurate global stats, let's fetch all tickets
      const allRes = await supportApi.adminGetTickets({ limit: 1000 });
      const allTix = allRes.data.tickets || [];
      const statsObj = {
        open: allTix.filter(t => t.status === 'Open').length,
        inProgress: allTix.filter(t => t.status === 'In Progress').length,
        resolved: allTix.filter(t => t.status === 'Resolved').length,
        closed: allTix.filter(t => t.status === 'Closed').length,
      };
      setStats(statsObj);
    } catch (err) {
      toast.error('Failed to load support tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchTickets();
    }, 300);
    return () => clearTimeout(handler);
  }, [search, status, priority, category]);

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setCategory('');
  };

  // Define columns for DataTable
  const columns = [
    {
      header: 'Ticket Number',
      key: 'ticketNumber',
      render: (val) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1e3a8a', fontSize: 13 }}>
          #{val}
        </span>
      )
    },
    {
      header: 'Customer',
      key: 'user.name',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.user?.name || 'Customer'}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{row.user?.email || 'N/A'}</div>
        </div>
      )
    },
    {
      header: 'Subject',
      key: 'subject',
      render: (val) => (
        <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>
          {val}
        </span>
      )
    },
    {
      header: 'Category',
      key: 'category',
      render: (val) => (
        <span style={{ fontSize: 12, background: '#f1f5f9', padding: '4px 8px', borderRadius: 4, fontWeight: 500 }}>
          {val}
        </span>
      )
    },
    {
      header: 'Priority',
      key: 'priority',
      render: (val) => <StatusBadge status={val} />
    },
    {
      header: 'Status',
      key: 'status',
      render: (val) => <StatusBadge status={val} />
    },
    {
      header: 'Created',
      key: 'createdAt',
      render: (val) => (
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        </span>
      )
    },
    {
      header: 'Last Updated',
      key: 'updatedAt',
      render: (val) => (
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          {new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      )
    },
    {
      header: 'Actions',
      key: '_id',
      sortable: false,
      render: (val) => (
        <button 
          className="btn btn-outline btn-sm"
          onClick={() => navigate(`/admin/support/${val}`)}
          style={{ padding: '4px 10px', fontSize: 12 }}
        >
          Open Chat
        </button>
      )
    }
  ];

  return (
    <AdminLayoutWrapper title="Manage Customer Tickets">
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
        <StatsCard
          title="Open Tickets"
          value={stats.open}
          icon={<FiMessageSquare />}
          color="#3b82f6"
          loading={loading}
        />
        <StatsCard
          title="In Progress"
          value={stats.inProgress}
          icon={<FiAlertCircle />}
          color="#8b5cf6"
          loading={loading}
        />
        <StatsCard
          title="Resolved"
          value={stats.resolved}
          icon={<FiCheckCircle />}
          color="#10b981"
          loading={loading}
        />
        <StatsCard
          title="Closed"
          value={stats.closed}
          icon={<FiArchive />}
          color="#64748b"
          loading={loading}
        />
      </div>

      {/* Advanced Filters */}
      <div style={{
        background: 'white',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700 }}>🔍 Filter Queue</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16
        }}>
          {/* Search */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Search Tickets</label>
            <input
              type="text"
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. TKT-1002 or John Doe"
              style={{ fontSize: 13 }}
            />
          </div>

          {/* Status */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Status</label>
            <select
              className="form-input form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ fontSize: 13 }}
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          {/* Priority */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Priority</label>
            <select
              className="form-input form-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ fontSize: 13 }}
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          {/* Category */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Category</label>
            <select
              className="form-input form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ fontSize: 13 }}
            >
              <option value="">All Categories</option>
              <option value="Order Issue">Order Issue</option>
              <option value="Payment Issue">Payment Issue</option>
              <option value="Product Issue">Product Issue</option>
              <option value="Delivery Issue">Delivery Issue</option>
              <option value="Return Request">Return Request</option>
              <option value="General Inquiry">General Inquiry</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button 
            className="btn btn-ghost" 
            onClick={handleResetFilters}
            style={{ border: '1px solid var(--color-border)', padding: '8px 16px', fontSize: 13 }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Tickets DataTable */}
      <DataTable
        columns={columns}
        data={tickets}
        loading={loading}
        searchPlaceholder="Locally filter tickets in memory..."
        searchKey={['ticketNumber', 'subject', 'user.name', 'user.email']}
        exportFilename="support_tickets_export.csv"
      />
    </AdminLayoutWrapper>
  );
}
