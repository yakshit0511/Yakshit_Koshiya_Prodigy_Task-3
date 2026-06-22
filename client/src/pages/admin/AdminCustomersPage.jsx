import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import AdminModal from '../../components/common/AdminModal';
import { LoadingSpinner } from '../../components/common/index.jsx';
import { FiUser, FiMail, FiPhone, FiCalendar, FiShoppingBag, FiDollarSign, FiStar, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminCustomersPage() {
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [filterBlockStatus, setFilterBlockStatus] = useState('all'); // all, active, blocked

  // Customer Detail Modal States
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [activeTab, setActiveTab] = useState('orders'); // orders | reviews | tickets

  // Fetch all customers (limit 1000 for local DataTable functionalities)
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (filterBlockStatus === 'active') params.isBlocked = 'false';
      if (filterBlockStatus === 'blocked') params.isBlocked = 'true';
      if (search) params.search = search;

      const res = await adminApi.getCustomers(params);
      setCustomers(res.data.customers || []);
    } catch (err) {
      toast.error('Failed to load customers list.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger search fetch with debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(handler);
  }, [search, filterBlockStatus]);

  // Handle linking to customer search from orders page query string ?search=email
  useEffect(() => {
    const searchQueryParam = searchParams.get('search');
    if (searchQueryParam) {
      setSearch(searchQueryParam);
    }
  }, [searchParams]);

  // Block/Unblock toggle
  const handleToggleBlock = async (id, name, isBlocked) => {
    const action = isBlocked ? 'unblock' : 'block';
    if (!window.confirm(`Are you sure you want to ${action} customer "${name}"?`)) return;

    try {
      await adminApi.toggleBlockCustomer(id);
      toast.success(`Customer "${name}" has been ${action}ed.`);
      fetchCustomers();
      // If modal is open for this customer, refresh detailed data
      if (selectedCustomerId === id) {
        fetchCustomerDetail(id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || `Failed to ${action} customer`);
    }
  };

  // Fetch specific customer logs for detail modal
  const fetchCustomerDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await adminApi.getCustomer(id);
      setCustomerDetail(res.data);
    } catch (err) {
      toast.error('Failed to load customer profile details.');
      setIsDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenDetailModal = (customerId) => {
    setSelectedCustomerId(customerId);
    setCustomerDetail(null);
    setActiveTab('orders');
    setIsDetailModalOpen(true);
    fetchCustomerDetail(customerId);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedCustomerId(null);
    setCustomerDetail(null);
  };

  // Columns for main customers DataTable
  const columns = [
    {
      header: 'Customer',
      key: 'name',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: row.isBlocked ? '#ffe4e6' : '#dcfce7',
            color: row.isBlocked ? '#e11d48' : '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14,
            border: `1px solid ${row.isBlocked ? '#fecdd3' : '#bbf7d0'}`
          }}>
            {val?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{val}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Member ID: {row._id.slice(-8).toUpperCase()}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Email Address',
      key: 'email',
      render: (val) => <span style={{ color: '#475569', fontSize: 13 }}>{val}</span>
    },
    {
      header: 'Phone Number',
      key: 'phone',
      render: (val) => <span style={{ color: '#475569', fontSize: 13 }}>{val || '—'}</span>
    },
    {
      header: 'Registration',
      key: 'createdAt',
      render: (val) => (
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          {new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      header: 'Total Orders',
      key: 'totalOrders',
      render: (val) => <strong style={{ color: 'var(--color-text)' }}>{val}</strong>
    },
    {
      header: 'Total Spent',
      key: 'totalSpent',
      render: (val) => <strong style={{ color: '#16a34a' }}>₹{val.toLocaleString('en-IN')}</strong>
    },
    {
      header: 'Status',
      key: 'isBlocked',
      render: (val) => (
        <StatusBadge status={val ? 'inactive' : 'active'} />
      )
    },
    {
      header: 'Actions',
      key: '_id',
      sortable: false,
      render: (val, row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => handleOpenDetailModal(val)}
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            View Profile
          </button>
          {row.role !== 'admin' && (
            <button
              className={`btn btn-sm ${row.isBlocked ? 'btn-ghost' : 'danger'}`}
              onClick={() => handleToggleBlock(val, row.name, row.isBlocked)}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                border: row.isBlocked ? '1px solid var(--color-border)' : 'none',
                background: row.isBlocked ? '#f1f5f9' : 'var(--color-error-light)',
                color: row.isBlocked ? '#475569' : 'var(--color-error)'
              }}
            >
              {row.isBlocked ? '✅ Unblock' : '🚫 Block'}
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <AdminLayoutWrapper title="Manage Customers">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: 0 }}>
          Moderate customer accounts, view complete activity logs, and configure block access.
        </p>
      </div>

      {/* Filters Toolbar */}
      <div style={{
        background: 'white',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16
      }}>
        {/* Search */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Search Customers</label>
          <input
            type="text"
            className="form-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={{ fontSize: 13 }}
          />
        </div>

        {/* Block filter */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Filter by Status</label>
          <select
            className="form-input form-select"
            value={filterBlockStatus}
            onChange={(e) => setFilterBlockStatus(e.target.value)}
            style={{ fontSize: 13 }}
          >
            <option value="all">All Accounts</option>
            <option value="active">Active Only</option>
            <option value="blocked">Blocked Only</option>
          </select>
        </div>
      </div>

      {/* Main Customers List */}
      <DataTable
        columns={columns}
        data={customers}
        loading={loading}
        searchPlaceholder="Filter records locally in memory..."
        searchKey={['name', 'email', 'phone']}
        exportFilename="customers_export.csv"
      />

      {/* Customer Detail Profile Modal */}
      <AdminModal
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
        title="👤 Customer Profile Logs"
        width={750}
      >
        {detailLoading ? (
          <div style={{ padding: 48 }}><LoadingSpinner /></div>
        ) : customerDetail ? (
          <div>
            {/* Header info card */}
            <div style={{
              display: 'flex',
              gap: 20,
              alignItems: 'center',
              background: '#f8fafc',
              padding: 20,
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              marginBottom: 24
            }}>
              <div style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: customerDetail.customer?.isBlocked ? '#ffe4e6' : '#dcfce7',
                color: customerDetail.customer?.isBlocked ? '#e11d48' : '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 22,
                border: `2px solid ${customerDetail.customer?.isBlocked ? '#fecdd3' : '#bbf7d0'}`
              }}>
                {customerDetail.customer?.name?.charAt(0).toUpperCase()}
              </div>

              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{customerDetail.customer?.name}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiMail /> {customerDetail.customer?.email}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiPhone /> {customerDetail.customer?.phone || 'No phone'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><FiCalendar /> Registered {new Date(customerDetail.customer?.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>

              <div>
                <StatusBadge status={customerDetail.customer?.isBlocked ? 'inactive' : 'active'} />
              </div>
            </div>

            {/* Financial Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 24
            }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px 20px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ background: '#16a34a', color: 'white', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiDollarSign size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Total Spent</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#14532d' }}>₹{customerDetail.orderStats?.totalSpent?.toLocaleString('en-IN') || 0}</div>
                </div>
              </div>

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '16px 20px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ background: '#3b82f6', color: 'white', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiShoppingBag size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Orders Placed</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1e3a8a' }}>{customerDetail.orderStats?.totalOrders || 0} orders</div>
                </div>
              </div>
            </div>

            {/* Logs sub-tabs switcher */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 20 }}>
              <button
                className={`btn btn-sm ${activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('orders')}
                style={{ padding: '8px 16px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <FiShoppingBag /> Order History ({customerDetail.recentOrders?.length || 0})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'reviews' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('reviews')}
                style={{ padding: '8px 16px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <FiStar /> Reviews Submitted ({customerDetail.reviews?.length || 0})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'tickets' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('tickets')}
                style={{ padding: '8px 16px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <FiMessageSquare /> Support Tickets ({customerDetail.tickets?.length || 0})
              </button>
            </div>

            {/* Tab contents */}
            <div style={{ maxHeight: 250, overflowY: 'auto', paddingRight: 4 }}>
              
              {/* Order history tab */}
              {activeTab === 'orders' && (
                <div>
                  {(!customerDetail.recentOrders || customerDetail.recentOrders.length === 0) ? (
                    <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 24, margin: 0 }}>No orders found for this customer.</p>
                  ) : (
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                          <th style={{ padding: '10px 14px' }}>Order Number</th>
                          <th style={{ padding: '10px 14px' }}>Date</th>
                          <th style={{ padding: '10px 14px' }}>Total Amount</th>
                          <th style={{ padding: '10px 14px' }}>Payment</th>
                          <th style={{ padding: '10px 14px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerDetail.recentOrders.map(ord => (
                          <tr key={ord._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>
                              <a href={`/admin/orders/${ord._id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                                #{ord.orderNumber || ord._id.slice(-8).toUpperCase()}
                              </a>
                            </td>
                            <td style={{ padding: '10px 14px' }}>{new Date(ord.createdAt).toLocaleDateString('en-IN')}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>₹{ord.totalAmount.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '10px 14px', fontSize: 12 }}>{ord.paymentMethod}</td>
                            <td style={{ padding: '10px 14px' }}><StatusBadge status={ord.orderStatus} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Reviews history tab */}
              {activeTab === 'reviews' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(!customerDetail.reviews || customerDetail.reviews.length === 0) ? (
                    <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 24, margin: 0 }}>No reviews submitted yet.</p>
                  ) : (
                    customerDetail.reviews.map(rev => (
                      <div key={rev._id} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, background: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <strong>Product: {rev.product?.name || 'Deleted Product'}</strong>
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            {new Date(rev.createdAt).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 4, color: '#f59e0b', marginBottom: 6 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i}>{i < rev.rating ? '★' : '☆'}</span>
                          ))}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, margin: '4px 0' }}>{rev.title}</div>
                        <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>"{rev.comment}"</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Support tickets tab */}
              {activeTab === 'tickets' && (
                <div>
                  {(!customerDetail.tickets || customerDetail.tickets.length === 0) ? (
                    <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 24, margin: 0 }}>No support tickets created.</p>
                  ) : (
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                          <th style={{ padding: '10px 14px' }}>Ticket #</th>
                          <th style={{ padding: '10px 14px' }}>Subject</th>
                          <th style={{ padding: '10px 14px' }}>Priority</th>
                          <th style={{ padding: '10px 14px' }}>Status</th>
                          <th style={{ padding: '10px 14px' }}>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerDetail.tickets.map(tix => (
                          <tr key={tix._id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '10px 14px', fontWeight: 'bold' }}>
                              <a href={`/admin/support/${tix._id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                                #{tix.ticketNumber}
                              </a>
                            </td>
                            <td style={{ padding: '10px 14px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tix.subject}</td>
                            <td style={{ padding: '10px 14px' }}><StatusBadge status={tix.priority} /></td>
                            <td style={{ padding: '10px 14px' }}><StatusBadge status={tix.status} /></td>
                            <td style={{ padding: '10px 14px' }}>{new Date(tix.createdAt).toLocaleDateString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              {customerDetail.customer?.role !== 'admin' && (
                <button
                  className={`btn ${customerDetail.customer?.isBlocked ? 'btn-ghost' : 'btn-danger'}`}
                  onClick={() => handleToggleBlock(customerDetail.customer?._id, customerDetail.customer?.name, customerDetail.customer?.isBlocked)}
                  style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <FiShieldAlert /> {customerDetail.customer?.isBlocked ? 'Unblock Account' : 'Block Account'}
                </button>
              )}
              <button className="btn btn-outline" onClick={handleCloseDetailModal}>
                Close Profile
              </button>
            </div>

          </div>
        ) : (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-error)' }}>Failed to load customer profile details.</div>
        )}
      </AdminModal>
    </AdminLayoutWrapper>
  );
}
