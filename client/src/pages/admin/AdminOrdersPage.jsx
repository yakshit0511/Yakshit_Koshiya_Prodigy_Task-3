import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderApi } from '../../api/orderApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import StatsCard from '../../components/common/StatsCard';
import { LoadingSpinner } from '../../components/common/index.jsx';
import { FiShoppingBag, FiDollarSign, FiClock, FiCalendar, FiCalendar as FiDate } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchStats = async () => {
    try {
      const res = await orderApi.adminGetStats();
      setStats(res.data.stats);
    } catch (err) {
      console.error('Failed to fetch order stats', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Query parameters for filter API
      const params = {
        limit: 1000, // retrieve all matching orders for local search & CSV download support in DataTable
      };
      if (orderStatus) params.orderStatus = orderStatus;
      if (paymentStatus) params.paymentStatus = paymentStatus;
      if (paymentMethod) params.paymentMethod = paymentMethod;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (search) params.search = search;

      const res = await orderApi.adminGetOrders(params);
      setOrders(res.data.orders || []);
    } catch (err) {
      toast.error('Failed to load orders list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchOrders();
    }, 300); // debounce search/filter changes
    return () => clearTimeout(handler);
  }, [search, orderStatus, paymentStatus, paymentMethod, dateFrom, dateTo]);

  // Handle resetting all filters
  const handleResetFilters = () => {
    setSearch('');
    setOrderStatus('');
    setPaymentStatus('');
    setPaymentMethod('');
    setDateFrom('');
    setDateTo('');
  };

  // Define columns for DataTable
  const columns = [
    {
      header: 'Order Number',
      key: 'orderNumber',
      render: (val, row) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 13, color: '#312e81' }}>
          #{val || row._id.slice(-8).toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Customer',
      key: 'user.name',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{row.user?.name || 'Guest User'}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{row.user?.email || 'No Email'}</div>
        </div>
      ),
    },
    {
      header: 'Order Date',
      key: 'createdAt',
      render: (val) => (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          {new Date(val).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      ),
    },
    {
      header: 'Items',
      key: 'orderItems',
      render: (val) => {
        const count = val?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        return <span>{count} {count === 1 ? 'item' : 'items'}</span>;
      },
    },
    {
      header: 'Total Amount',
      key: 'totalAmount',
      render: (val) => <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>₹{val?.toLocaleString('en-IN')}</span>,
    },
    {
      header: 'Method',
      key: 'paymentMethod',
      render: (val) => (
        <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--color-bg)', padding: '4px 8px', borderRadius: 4 }}>
          {val}
        </span>
      ),
    },
    {
      header: 'Payment Status',
      key: 'paymentStatus',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      header: 'Order Status',
      key: 'orderStatus',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      header: 'Actions',
      key: '_id',
      sortable: false,
      render: (val) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => navigate(`/admin/orders/${val}`)}
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            Manage
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayoutWrapper title="Manage Orders">
      {/* Stats Row */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: 20, 
          marginBottom: 30 
        }}
      >
        <StatsCard
          title="Today's Orders"
          value={stats?.orders?.today ?? 0}
          icon={<FiShoppingBag />}
          color="#3b82f6"
          loading={statsLoading}
        />
        <StatsCard
          title="Today's Revenue"
          value={`₹${(stats?.revenue?.today ?? 0).toLocaleString('en-IN')}`}
          icon={<FiDollarSign />}
          color="#10b981"
          loading={statsLoading}
        />
        <StatsCard
          title="This Week's Orders"
          value={stats?.orders?.week ?? 0}
          icon={<FiClock />}
          color="#8b5cf6"
          loading={statsLoading}
        />
        <StatsCard
          title="This Month's Revenue"
          value={`₹${(stats?.revenue?.month ?? 0).toLocaleString('en-IN')}`}
          icon={<FiDollarSign />}
          color="#f59e0b"
          loading={statsLoading}
        />
      </div>

      {/* Advanced Filters Card */}
      <div 
        style={{ 
          background: 'var(--color-surface)', 
          border: '1px solid var(--color-border)', 
          borderRadius: 12, 
          padding: 20, 
          marginBottom: 24 
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700 }}>🔍 Filter Orders</h3>
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 16 
          }}
        >
          {/* Search Input */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Order # or Customer</label>
            <input
              type="text"
              className="form-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. 52A89F or John Doe"
              style={{ fontSize: 13 }}
            />
          </div>

          {/* Order Status Select */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Order Status</label>
            <select
              className="form-input form-select"
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
              style={{ fontSize: 13 }}
            >
              <option value="">All Statuses</option>
              <option value="Placed">Placed</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Return Requested">Return Requested</option>
              <option value="Returned">Returned</option>
            </select>
          </div>

          {/* Payment Status Select */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Payment Status</label>
            <select
              className="form-input form-select"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              style={{ fontSize: 13 }}
            >
              <option value="">All</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>

          {/* Payment Method Select */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Payment Method</label>
            <select
              className="form-input form-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ fontSize: 13 }}
            >
              <option value="">All Methods</option>
              <option value="COD">Cash on Delivery (COD)</option>
              <option value="Online">Online Payments</option>
            </select>
          </div>
        </div>

        {/* Date Filters & Actions Row */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-end', 
            marginTop: 16, 
            flexWrap: 'wrap', 
            gap: 16 
          }}
        >
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Date From</label>
              <input
                type="date"
                className="form-input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ fontSize: 13, padding: '6px 12px' }}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Date To</label>
              <input
                type="date"
                className="form-input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ fontSize: 13, padding: '6px 12px' }}
              />
            </div>
          </div>

          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={handleResetFilters}
            style={{ border: '1px solid var(--color-border)', padding: '8px 16px', fontSize: 13 }}
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        searchPlaceholder="Locally filter orders in memory..."
        searchKey={['orderNumber', 'user.name', 'user.email']}
        exportFilename="orders_export.csv"
      />
    </AdminLayoutWrapper>
  );
}
