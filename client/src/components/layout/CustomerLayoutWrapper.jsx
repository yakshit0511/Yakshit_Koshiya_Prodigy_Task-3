import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiUser, FiPackage, FiStar, FiHeart, FiMapPin, FiMessageSquare, FiLogOut } from 'react-icons/fi';
import { Breadcrumb } from '../common/index.jsx';

const menuItems = [
  { path: '/profile', label: 'My Profile', icon: FiUser },
  { path: '/my-orders', label: 'My Orders', icon: FiPackage },
  { path: '/my-reviews', label: 'My Reviews', icon: FiStar },
  { path: '/wishlist', label: 'Wishlist', icon: FiHeart },
  { path: '/addresses', label: 'My Addresses', icon: FiMapPin },
  { path: '/support', label: 'Support Tickets', icon: FiMessageSquare },
];

export default function CustomerLayoutWrapper({ children, title }) {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <div>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Customer Dashboard' }]} />

      <div className="customer-dashboard-layout" style={{ display: 'flex', gap: 32, marginTop: 16 }}>
        {/* Left Sidebar */}
        <aside className="customer-sidebar" style={{ width: 260, flexShrink: 0 }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/profile' && location.pathname.startsWith(item.path));
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
                    color: isActive ? 'white' : 'var(--color-text-secondary)',
                    background: isActive ? 'var(--color-primary)' : 'transparent',
                    fontWeight: 600,
                    fontSize: 14,
                    transition: 'all var(--transition-fast)',
                    textDecoration: 'none'
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div style={{ borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />
            <button
              onClick={logout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderRadius: 8,
                color: 'var(--color-error)',
                fontWeight: 600,
                fontSize: 14,
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <FiLogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Right Main Content */}
        <main className="customer-content" style={{ flex: 1, minWidth: 0 }}>
          {title && <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>{title}</h1>}
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .customer-dashboard-layout {
            flex-direction: column !important;
            gap: 20px !important;
          }
          .customer-sidebar {
            width: 100% !important;
          }
          .customer-sidebar > div {
            flex-direction: row !important;
            overflow-x: auto !important;
            scrollbar-width: none !important;
            padding: 8px 12px !important;
          }
          .customer-sidebar > div::-webkit-scrollbar {
            display: none !important;
          }
          .customer-sidebar > div > a,
          .customer-sidebar > div > button {
            white-space: nowrap !important;
            padding: 8px 14px !important;
          }
          .customer-sidebar > div > div {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
