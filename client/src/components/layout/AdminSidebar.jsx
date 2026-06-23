import { Link, useLocation } from 'react-router-dom';
import { FiGrid, FiBox, FiTag, FiShoppingBag, FiUsers, FiStar, FiPercent, FiMessageSquare, FiArrowLeft } from 'react-icons/fi';

const menuItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: FiGrid },
  { path: '/admin/products', label: 'Products', icon: FiBox },
  { path: '/admin/categories', label: 'Categories', icon: FiTag },
  { path: '/admin/orders', label: 'Orders', icon: FiShoppingBag },
  { path: '/admin/customers', label: 'Customers', icon: FiUsers },
  { path: '/admin/reviews', label: 'Reviews', icon: FiStar },
  { path: '/admin/coupons', label: 'Coupons', icon: FiPercent },
  { path: '/admin/support', label: 'Support Tickets', icon: FiMessageSquare },
];

export default function AdminSidebar() {
  const location = useLocation();

  return (
    <div style={{
      width: 260,
      minWidth: 260,
      background: '#0f172a',
      color: '#f1f5f9',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      overflowY: 'hidden',
      flexShrink: 0,
      zIndex: 1000,
    }}>
      {/* Admin Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, paddingLeft: 8 }}>
        <span style={{ fontSize: 24 }}>⚙️</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: 'white' }}>Admin Portal</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>LocalStore Control Panel</div>
        </div>
      </div>

      {/* Nav Menu */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 8,
                color: isActive ? 'white' : '#94a3b8',
                background: isActive ? 'var(--color-primary)' : 'transparent',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: 14,
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.background = '#1e293b';
                }
              }}
              onMouseOut={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer link to store */}
      <div style={{ borderTop: '1px solid #1e293b', paddingTop: 16 }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            color: '#94a3b8',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <FiArrowLeft size={18} />
          <span>Exit Admin Portal</span>
        </Link>
      </div>
    </div>
  );
}
