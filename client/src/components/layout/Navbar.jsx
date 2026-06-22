/**
 * components/layout/Navbar.jsx
 * Full-featured navbar with:
 * - Live search with dropdown suggestions
 * - Cart / Wishlist badges
 * - User menu with role-based items
 * - Announcement scrolling bar
 * - Category navigation bar
 * - Sticky + shadow on scroll
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiSearch, FiShoppingCart, FiHeart, FiUser, FiLogOut, FiPackage, FiMessageSquare, FiSettings, FiHome, FiGrid, FiBell } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useNotifications } from '../../context/NotificationContext';
import { useDebounce } from '../../hooks/useDebounce';
import { productApi, categoryApi } from '../../api/productApi';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 400);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);

  /* ---- Sticky shadow ---- */
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  /* ---- Fetch categories for nav bar ---- */
  useEffect(() => {
    categoryApi.getCategories()
      .then((r) => setCategories(r.data.categories || []))
      .catch(() => {});
  }, []);

  /* ---- Live search ---- */
  useEffect(() => {
    if (debouncedSearch.length < 2) { setSearchResults([]); setSearchOpen(false); return; }
    setSearchLoading(true);
    productApi.getProducts({ q: debouncedSearch, limit: 6 })
      .then((r) => { setSearchResults(r.data.products || []); setSearchOpen(true); })
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, [debouncedSearch]);

  /* ---- Close dropdowns on outside click ---- */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(e.target)) setNotificationOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ---- Close menu on route change ---- */
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setNotificationOpen(false);
  }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleSuggestionClick = (slug) => {
    navigate(`/products/${slug}`);
    setSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <>
      {/* ---- Announcement Bar ---- */}
      <div className="announcement-bar">
        <div style={{ animation: 'marquee 25s linear infinite', whiteSpace: 'nowrap' }}>
          🚚 FREE delivery on orders above ₹500 &nbsp;|&nbsp; 🌿 Fresh products daily &nbsp;|&nbsp; 💳 Cash on delivery available &nbsp;|&nbsp; 🎁 Use code WELCOME20 for 20% off your first order!
          &nbsp;&nbsp;&nbsp;&nbsp;🚚 FREE delivery on orders above ₹500 &nbsp;|&nbsp; 🌿 Fresh products daily &nbsp;|&nbsp; 💳 Cash on delivery available
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>

      {/* ---- Main Navbar ---- */}
      <header className={`navbar${scrolled ? ' scrolled' : ''}`}>
        <div className="container navbar-inner">

          {/* Logo */}
          <Link to="/" className="navbar-logo">
            <div className="navbar-logo-icon">🛍️</div>
            <div>
              <div className="navbar-logo-text">LocalStore</div>
              <div className="navbar-logo-sub">Your neighbourhood shop</div>
            </div>
          </Link>

          {/* Search */}
          <form className="navbar-search desktop-only" onSubmit={handleSearch} ref={searchRef}>
            <span className="navbar-search-icon"><FiSearch /></span>
            <input
              className="navbar-search-input"
              placeholder="Search for products…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            />
            {searchOpen && searchResults.length > 0 && (
              <div className="navbar-search-dropdown">
                {searchLoading && <div style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: 13 }}>Searching…</div>}
                {searchResults.map((p) => (
                  <div key={p._id} className="search-suggestion" onClick={() => handleSuggestionClick(p.slug)}>
                    <img
                      src={p.images?.[0]?.url || '/placeholder-product.png'}
                      alt={p.name}
                      className="search-suggestion-img"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/40x40?text=P'; }}
                    />
                    <div className="search-suggestion-info">
                      <div className="search-suggestion-name">{p.name}</div>
                      <div className="search-suggestion-price">
                        ₹{(p.discountPrice || p.price)?.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
                <div
                  style={{ padding: '10px 16px', borderTop: '1px solid var(--color-border)', fontSize: 13, color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={handleSearch}
                >
                  View all results for "{searchQuery}" →
                </div>
              </div>
            )}
          </form>

          {/* Actions */}
          <div className="navbar-actions">
            {/* Mobile search */}
            <button className="navbar-action-btn mobile-only" onClick={() => navigate('/search')}>
              <FiSearch />
            </button>

            {/* Wishlist */}
            {isAuthenticated && (
              <Link to="/wishlist" className="navbar-action-btn desktop-only" style={{ textDecoration: 'none' }}>
                <FiHeart />
                {wishlistCount > 0 && <span className="navbar-badge">{wishlistCount}</span>}
              </Link>
            )}

            {/* Cart */}
            <Link to="/cart" className="navbar-action-btn" style={{ textDecoration: 'none' }}>
              <FiShoppingCart />
              {cartCount > 0 && <span className="navbar-badge">{cartCount > 99 ? '99+' : cartCount}</span>}
            </Link>

            {/* Notification Center */}
            {isAuthenticated && (
              <div className="user-dropdown" ref={notificationRef} style={{ position: 'relative' }}>
                <button className="navbar-action-btn" onClick={() => setNotificationOpen((o) => !o)}>
                  <FiBell />
                  {unreadCount > 0 && <span className="navbar-badge">{unreadCount}</span>}
                </button>
                {notificationOpen && (
                  <div className="user-dropdown-menu" style={{ width: 320, maxHeight: 420, overflowY: 'auto' }}>
                    <div className="user-dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          style={{ color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              markAsRead(n.id);
                              if (n.type === 'order') {
                                navigate(`/my-orders`);
                              } else {
                                navigate(`/support`);
                              }
                              setNotificationOpen(false);
                            }}
                            style={{
                              padding: '12px 16px',
                              borderBottom: '1px solid var(--color-border)',
                              cursor: 'pointer',
                              background: n.isRead ? 'transparent' : '#f0fdf4',
                              transition: 'background var(--transition-fast)',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = n.isRead ? 'transparent' : '#f0fdf4'; }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: n.isRead ? 'var(--color-text)' : 'var(--color-primary)' }}>
                                {n.title}
                              </span>
                              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                                {new Date(n.date).toLocaleDateString()}
                              </span>
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                              {n.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User menu */}
            <div className="user-dropdown" ref={userMenuRef}>
              <button className="navbar-action-btn" onClick={() => setUserMenuOpen((o) => !o)}>
                <FiUser />
              </button>
              {userMenuOpen && (
                <div className="user-dropdown-menu">
                  {isAuthenticated ? (
                    <>
                      <div className="user-dropdown-header">
                        <div className="user-dropdown-name">{user?.name}</div>
                        <div className="user-dropdown-email">{user?.email}</div>
                      </div>
                      {isAdmin ? (
                        <>
                          <Link to="/admin/dashboard" className="user-dropdown-item">
                            <FiGrid size={15} /> Admin Dashboard
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link to="/profile" className="user-dropdown-item"><FiUser size={15} /> My Profile</Link>
                          <Link to="/my-orders" className="user-dropdown-item"><FiPackage size={15} /> My Orders</Link>
                          <Link to="/wishlist" className="user-dropdown-item"><FiHeart size={15} /> Wishlist</Link>
                          <Link to="/support" className="user-dropdown-item"><FiMessageSquare size={15} /> Support</Link>
                          <Link to="/addresses" className="user-dropdown-item"><FiSettings size={15} /> Addresses</Link>
                        </>
                      )}
                      <div className="user-dropdown-divider" />
                      <button onClick={logout} className="user-dropdown-item danger">
                        <FiLogOut size={15} /> Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="user-dropdown-item">🔑 Login</Link>
                      <Link to="/register" className="user-dropdown-item">📝 Register</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ---- Category Bar ---- */}
      <div className="category-bar">
        <div className="container category-bar-inner">
          <Link to="/products" className={`category-bar-item ${location.pathname === '/products' && !location.search ? 'active' : ''}`}>
            🏪 All Products
          </Link>
          {categories.slice(0, 10).map((cat) => (
            <Link
              key={cat._id}
              to={`/category/${cat.slug}`}
              className={`category-bar-item ${location.pathname === `/category/${cat.slug}` ? 'active' : ''}`}
            >
              {cat.name}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
