import { useState, useEffect, useRef } from 'react';
import { adminApi } from '../../api/adminApi';
import { orderApi } from '../../api/orderApi';
import { productApi } from '../../api/productApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import StatsCard from '../../components/common/StatsCard';
import { LoadingSpinner, ConfirmModal } from '../../components/common/index.jsx';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { FiTrendingUp, FiPlus, FiTag, FiFileText, FiStar, FiChevronRight, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [orderStats, setOrderStats] = useState(null);
  
  // Charts States
  const [dailyChart, setDailyChart] = useState([]);
  const [monthlyChart, setMonthlyChart] = useState([]);
  const [revenueTimeframe, setRevenueTimeframe] = useState('30d'); // 7d, 30d, 12m
  
  const [recent, setRecent] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Stock Edit States
  const [editStockProduct, setEditStockProduct] = useState(null);
  const [editStockVal, setEditStockVal] = useState(0);
  const [stockLoading, setStockLoading] = useState(false);

  // Ref guard: prevent duplicate toast in React Strict Mode (double useEffect calls)
  const hasShownError = useRef(false);

  const fetchDashboardData = async () => {
    // Use allSettled so one failed endpoint doesn't block the rest
    const [statsRes, chartRes, recentRes, orderStatsRes, productRes] = await Promise.allSettled([
      adminApi.getDashboardStats(),
      adminApi.getRevenueChart(),
      adminApi.getRecentActivity(),
      orderApi.adminGetStats(),
      productApi.adminGetProducts({ limit: 100 }),
    ]);

    let anyFailed = false;

    if (statsRes.status === 'fulfilled') {
      setStats(statsRes.value.data.stats || null);
    } else { anyFailed = true; }

    if (chartRes.status === 'fulfilled') {
      setDailyChart(chartRes.value.data.daily || []);
      setMonthlyChart(chartRes.value.data.monthly || []);
    } else { anyFailed = true; }

    if (recentRes.status === 'fulfilled') {
      setRecent(recentRes.value.data.activities || []);
    } else { anyFailed = true; }

    if (orderStatsRes.status === 'fulfilled') {
      setOrderStats(orderStatsRes.value.data.stats || null);
      setTopProducts(orderStatsRes.value.data.topProducts || []);
    } else { anyFailed = true; }

    if (productRes.status === 'fulfilled') {
      const allProd = productRes.value.data.products || [];
      const lowStock = allProd.filter(p => p.stock <= (p.lowStockThreshold || 5));
      setLowStockProducts(lowStock.slice(0, 8));
    } else { anyFailed = true; }

    // Show toast only once even if multiple endpoints fail
    if (anyFailed && !hasShownError.current) {
      hasShownError.current = true;
      toast.error('Some dashboard metrics failed to load. Please refresh.');
    }

    setLoading(false);
  };

  useEffect(() => {
    hasShownError.current = false; // reset on mount
    fetchDashboardData();
  }, []);

  const handleUpdateStockClick = (prod) => {
    setEditStockProduct(prod);
    setEditStockVal(prod.stock);
  };

  const handleConfirmStockUpdate = async () => {
    if (editStockVal < 0) {
      toast.error('Stock quantity cannot be negative');
      return;
    }
    setStockLoading(true);
    try {
      await productApi.updateProduct(editStockProduct._id, { stock: editStockVal });
      toast.success('Stock quantity updated successfully! 📦');
      setEditStockProduct(null);
      fetchDashboardData();
    } catch (err) {
      toast.error(err.message || 'Failed to update stock');
    } finally {
      setStockLoading(false);
    }
  };

  const handleExportOrdersCSV = async () => {
    try {
      const res = await orderApi.adminGetOrders({ limit: 1000 });
      const orders = res.data.orders || [];
      if (orders.length === 0) {
        toast.error('No orders available to export');
        return;
      }
      const headers = ['Order Number', 'Customer', 'Email', 'Date', 'Total Amount', 'Status', 'Payment Method', 'Payment Status'];
      const rows = orders.map(o => [
        o.orderNumber || o._id,
        o.user?.name || 'Guest',
        o.user?.email || 'N/A',
        new Date(o.createdAt).toLocaleDateString('en-IN'),
        o.totalAmount,
        o.orderStatus,
        o.paymentMethod,
        o.paymentStatus
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' 
        + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'orders_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Orders CSV exported! 📊');
    } catch (err) {
      toast.error('Failed to export orders to CSV');
    }
  };

  if (loading) return <AdminLayoutWrapper title="Dashboard"><LoadingSpinner /></AdminLayoutWrapper>;

  // Format stats cards values
  const totalRevenue = stats?.revenue?.allTime || 0;
  const revenueGrowth = stats?.revenue?.growthPercent || 0;
  const totalOrders = stats?.orders?.allTime || 0;
  const ordersGrowth = stats?.orders?.growthPercent || 0;
  const totalCustomers = stats?.customers?.total || 0;
  const newCustomersThisMonth = stats?.customers?.newThisMonth || 0;
  const activeProducts = stats?.products?.active || 0;
  const lowStockCount = stats?.products?.lowStock || 0;

  // Filter Chart Data based on selection
  const getActiveChartData = () => {
    if (revenueTimeframe === '7d') return dailyChart.slice(-7);
    if (revenueTimeframe === '30d') return dailyChart;
    return monthlyChart;
  };

  const activeChartData = getActiveChartData();

  // Donut Chart Segment Colors
  const COLORS = ['#16a34a', '#f97316', '#0ea5e9', '#a855f7', '#ef4444', '#64748b', '#cbd5e1'];

  // Donut Chart formatting
  const donutData = orderStats?.byStatus?.map((item) => ({
    name: item._id,
    value: item.count
  })) || [];

  const totalOrdersCount = donutData.reduce((sum, item) => sum + item.value, 0);

  return (
    <AdminLayoutWrapper title="Dashboard Overview">
      {/* Top Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
        <StatsCard
          icon="₹"
          value={`₹${totalRevenue}`}
          label="Total Revenue"
          trend={revenueGrowth}
          isPositive={revenueGrowth >= 0}
          color="#16a34a"
        />
        <StatsCard
          icon="🛍️"
          value={totalOrders}
          label="Total Orders"
          trend={ordersGrowth}
          isPositive={ordersGrowth >= 0}
          color="#0ea5e9"
        />
        <StatsCard
          icon="👥"
          value={totalCustomers}
          label="Total Customers"
          trend={newCustomersThisMonth > 0 ? `+${newCustomersThisMonth}` : null}
          isPositive={true}
          color="#8b5cf6"
        />
        <StatsCard
          icon="📦"
          value={activeProducts}
          label="Active Products"
          trend={lowStockCount > 0 ? `${lowStockCount} low stock` : null}
          isPositive={false}
          color="#f97316"
        />
      </div>

      {/* Second Row: Charts Side-by-Side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', lgDirection: 'row', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Revenue Line/Bar Chart (60% width) */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>📈 Sales & Revenue Statistics</h3>
            
            {/* Timeframe toggle buttons */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--color-bg)', padding: 4, borderRadius: 8 }}>
              {['7d', '30d', '12m'].map((time) => (
                <button
                  key={time}
                  onClick={() => setRevenueTimeframe(time)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    background: revenueTimeframe === time ? 'var(--color-surface)' : 'transparent',
                    color: revenueTimeframe === time ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    boxShadow: revenueTimeframe === time ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {time === '7d' ? 'Last 7 Days' : time === '30d' ? 'Last 30 Days' : 'Last 12 Months'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: '100%', height: 320 }}>
            {activeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {revenueTimeframe === '12m' ? (
                  /* Monthly Bar Chart */
                  <BarChart data={activeChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} stroke="#cbd5e1" />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} stroke="#cbd5e1" />
                    <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                ) : (
                  /* Daily Line/Area Chart */
                  <AreaChart data={activeChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} stroke="#cbd5e1" />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} stroke="#cbd5e1" />
                    <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#revenueGrad)" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                No statistics available for this period.
              </div>
            )}
          </div>
        </div>

        {/* Orders by Status Donut Chart (40% width) */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>📊 Orders by Status</h3>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 240, position: 'relative' }}>
            {donutData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center text for Donut total */}
                <div style={{ position: 'absolute', top: '42%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{totalOrdersCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>Total Orders</div>
                </div>
                {/* Custom list Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', justifyContent: 'center', marginTop: 12 }}>
                  {donutData.map((item, index) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[index % COLORS.length] }} />
                      <span>{item.name} ({item.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No order records yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Third Row: Top Selling, Recent Orders, Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', lgDirection: 'row', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Top Selling Products */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>🔥 Top Selling Products</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {topProducts.slice(0, 5).map((p, idx) => (
              <div key={p._id || idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', width: 16 }}>{idx + 1}</div>
                <img
                  src={p.image || 'https://via.placeholder.com/36x36?text=P'}
                  alt={p.name}
                  style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }}
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/36x36?text=P'; }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{p.unitsSold} units sold</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-primary)' }}>₹{p.revenue?.toLocaleString('en-IN')}</div>
              </div>
            ))}
            {topProducts.length === 0 && <div style={{ color: 'var(--color-text-muted)', fontSize: 12, padding: '24px 0', textAlign: 'center' }}>No sales data.</div>}
          </div>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 12, textAlign: 'center' }}>
            <Link to="/admin/products" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              View All Products <FiChevronRight />
            </Link>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>🛍️ Recent Orders</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {recent.filter(a => a.type === 'order').slice(0, 5).map((act, idx) => (
              <div key={idx} style={{ display: 'flex', justify: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Link to={act.link} style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)', textDecoration: 'none' }}>
                    {act.message.split(' by ')[0]}
                  </Link>
                  <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    by {act.message.split(' by ')[1] || 'Guest'}
                  </div>
                </div>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 700,
                  background: act.status === 'Delivered' ? '#dcfce7' : '#e0f2fe',
                  color: act.status === 'Delivered' ? '#16a34a' : '#0369a1',
                }}>
                  {act.status}
                </span>
              </div>
            ))}
            {recent.filter(a => a.type === 'order').length === 0 && <div style={{ color: 'var(--color-text-muted)', fontSize: 12, padding: '24px 0', textAlign: 'center' }}>No recent orders.</div>}
          </div>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, marginTop: 12, textAlign: 'center' }}>
            <Link to="/admin/orders" style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              View All Orders <FiChevronRight />
            </Link>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>⚡ Activity Logs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 270, overflowY: 'auto' }}>
            {recent.map((act, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, background: 'var(--color-bg)', padding: 6, borderRadius: '50%', display: 'inline-flex' }}>{act.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: 'var(--color-text)', margin: 0, lineHeight: 1.4 }}>{act.message}</p>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {recent.length === 0 && <div style={{ color: 'var(--color-text-muted)', fontSize: 12, padding: '24px 0', textAlign: 'center' }}>No activity records.</div>}
          </div>
        </div>
      </div>

      {/* Fourth Row: Low Stock Alerts & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', lgDirection: 'row', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        {/* Low Stock Alerts */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <FiAlertTriangle color="var(--color-error)" size={20} />
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>⚠️ Low Stock Restock Alerts</h3>
          </div>
          
          {lowStockProducts.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-success)', fontWeight: 600, fontSize: 13 }}>
              ✅ All product inventories are fully stocked!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: 12, fontWeight: 700 }}>Product Name</th>
                    <th style={{ padding: 12, fontWeight: 700, textAlign: 'center' }}>Current Stock</th>
                    <th style={{ padding: 12, fontWeight: 700, textAlign: 'center' }}>Threshold</th>
                    <th style={{ padding: 12, fontWeight: 700, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((p) => (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--color-border)', background: p.stock === 0 ? '#fee2e240' : 'transparent' }}>
                      <td style={{ padding: 12, fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: 12, textAlign: 'center', color: p.stock === 0 ? 'var(--color-error)' : 'var(--color-warning)', fontWeight: 700 }}>
                        {p.stock}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center', color: 'var(--color-text-secondary)' }}>{p.lowStockThreshold || 5}</td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <button onClick={() => handleUpdateStockClick(p)} className="btn btn-outline btn-sm" style={{ padding: '6px 12px' }}>
                          Update Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions Panel */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>⚡ Quick Operations Panel</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button onClick={() => navigate('/admin/products/add')} className="btn btn-primary" style={{ padding: '16px 12px', height: 80, flexDirection: 'column', gap: 6 }}>
              <FiPlus size={20} /> Add Product
            </button>
            <button onClick={() => navigate('/admin/coupons')} className="btn btn-secondary" style={{ padding: '16px 12px', height: 80, flexDirection: 'column', gap: 6 }}>
              <FiTag size={20} /> Create Coupon
            </button>
            <button onClick={handleExportOrdersCSV} className="btn btn-outline" style={{ padding: '16px 12px', height: 80, flexDirection: 'column', gap: 6 }}>
              <FiFileText size={20} /> Export Orders CSV
            </button>
            <button onClick={() => navigate('/admin/reviews')} className="btn btn-ghost" style={{ padding: '16px 12px', height: 80, flexDirection: 'column', gap: 6 }}>
              <FiStar size={20} /> Pending Reviews
            </button>
          </div>
        </div>
      </div>

      {/* Restock dialog Modal */}
      <ConfirmModal
        isOpen={!!editStockProduct}
        onClose={() => setEditStockProduct(null)}
        onConfirm={handleConfirmStockUpdate}
        title="Restock Product"
        confirmText="Update Stock Quantity"
        loading={stockLoading}
        message={
          <div className="form-group" style={{ marginTop: 12 }}>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
              Updating inventory for: <strong>"{editStockProduct?.name}"</strong>
            </p>
            <label className="form-label">New Stock Quantity:</label>
            <input
              type="number"
              className="form-input"
              value={editStockVal}
              onChange={(e) => setEditStockVal(parseInt(e.target.value, 10))}
              min="0"
              required
            />
          </div>
        }
      />

      <style>{`
        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
      `}</style>
    </AdminLayoutWrapper>
  );
}
