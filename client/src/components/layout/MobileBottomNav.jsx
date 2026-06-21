/** Mobile bottom navigation bar — shown only on screens < 1024px */
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiGrid, FiShoppingCart, FiHeart, FiUser } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

export default function MobileBottomNav() {
  const location = useLocation();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const isActive = (path) => location.pathname === path;

  const items = [
    { to: '/', icon: <FiHome size={22} />, label: 'Home' },
    { to: '/products', icon: <FiGrid size={22} />, label: 'Browse' },
    { to: '/cart', icon: <FiShoppingCart size={22} />, label: 'Cart', badge: cartCount },
    { to: '/wishlist', icon: <FiHeart size={22} />, label: 'Wishlist', badge: wishlistCount },
    { to: '/profile', icon: <FiUser size={22} />, label: 'Account' },
  ];

  return (
    <nav className="mobile-bottom-nav">
      {items.map((item) => (
        <Link key={item.to} to={item.to} className={`mobile-nav-item ${isActive(item.to) ? 'active' : ''}`}>
          <span className="mobile-nav-icon">{item.icon}</span>
          {item.badge > 0 && <span className="mobile-nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>}
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
