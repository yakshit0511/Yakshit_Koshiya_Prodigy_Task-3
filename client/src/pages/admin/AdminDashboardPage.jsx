import { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { LoadingSpinner } from '../../components/common/index.jsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recent, setRecent] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getDashboardStats(),
      adminApi.getRevenueChart(),
      adminApi.getRecentActivity(),
      adminApi.getTopProducts(),
    ]).then(([statsRes, chartRes, recentRes, topRes]) => {
      setStats(statsRes.data.stats || {
        totalSales: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalProducts: 0,
      });
      setChartData(chartRes.data.chartData || []);
      setRecent(recentRes.data.activity || []);
      setTopProducts(topRes.data.products || []);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayoutWrapper title="Dashboard"><LoadingSpinner fullPage /></AdminLayoutWrapper>;

  const statCards = [
    { label: 'Total Revenue', value: `₹${stats?.totalSales?.toLocaleString('en-IN')}`, icon: '💰', color: '#10b981' },
    { label: 'Total Orders', value: stats?.totalOrders, icon: '📦', color: '#3b82f6' },
    { label: 'Customers', value: stats?.totalCustomers, icon: '👥', color: '#8b5cf6' },
    { label: 'Total Products', value: stats?.totalProducts, icon: '🏷️', color: '#f59e0b' },
  ];

  return (
    <AdminLayoutWrapper title="Admin Dashboard">
      {/* Stat Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
        {statCards.map((c) => (
          <div key={c.label} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--color-border)', padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 32, background: `${c.color}15`, width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {c.icon}
            </div>
            <div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Graphs */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
        {/* Revenue Chart */}
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>📈 Monthly Revenue Overview</h3>
          <div style={{ width: '100%', height: 300 }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} stroke="#cbd5e1" />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} stroke="#cbd5e1" />
                  <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']} />
                  <Area type="monotone" dataKey="sales" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                No sales data available yet
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>🔥 Top Selling Products</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {topProducts.slice(0, 5).map((p) => (
              <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img
                  src={p.images?.[0]?.url || 'https://via.placeholder.com/40x40?text=P'}
                  alt={p.name}
                  style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{p.soldCount || 0} sold</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  ₹{(p.discountPrice || p.price)?.toLocaleString('en-IN')}
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No products sold yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>⚡ Recent Actions & Logs</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recent.map((log, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: idx < recent.length - 1 ? '1px solid var(--color-bg)' : 'none', paddingBottom: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ fontSize: 16 }}>📝</span>
                <span style={{ fontSize: 14 }}>{log.message}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{new Date(log.timestamp).toLocaleDateString('en-IN')}</span>
            </div>
          ))}
          {recent.length === 0 && (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No recent logs found
            </div>
          )}
        </div>
      </div>
    </AdminLayoutWrapper>
  );
}
