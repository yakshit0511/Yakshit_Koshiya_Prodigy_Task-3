/**
 * components/product/ProductCard.jsx
 * Product card with hover zoom, wishlist toggle,
 * discount badge, add-to-cart and quick view.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiEye } from 'react-icons/fi';
import { StarRating } from '../common/index.jsx';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';

export default function ProductCard({ product, onQuickView }) {
  const { addToCart, cartItems } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  if (!product) return null;

  const {
    _id, name, slug, images, price, discountPrice, discountPercent,
    stock, isInStock, ratings, numReviews, category,
  } = product;

  const effectivePrice = discountPrice && discountPrice < price ? discountPrice : price;
  const hasDiscount = discountPrice && discountPrice < price;
  const inCart = cartItems.some((i) => i.product?._id === _id || i.product === _id);
  const inWishlist = isInWishlist(_id);
  const outOfStock = !isInStock || stock === 0;
  const lowStock = isInStock && stock > 0 && stock <= 5;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/login'); return; }
    if (inCart) { navigate('/cart'); return; }
    setAdding(true);
    await addToCart(_id, 1, name);
    setAdding(false);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { navigate('/login'); return; }
    toggleWishlist(_id, name);
  };

  const img = images?.[0]?.url || `https://via.placeholder.com/300x225?text=${encodeURIComponent(name)}`;

  return (
    <div className="product-card animate-fade-in">
      {/* Image */}
      <Link to={`/products/${slug}`} style={{ textDecoration: 'none' }}>
        <div className="product-card__image-wrap">
          <img className="product-card__image" src={img} alt={name}
            onError={(e) => { e.target.src = `https://via.placeholder.com/300x225?text=Product`; }}
          />
          <div className="product-card__overlay">
            <button
              className="product-card__quick-view"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickView && onQuickView(product); }}
            >
              <FiEye size={14} style={{ marginRight: 4 }} /> Quick View
            </button>
          </div>

          {/* Discount badge */}
          {hasDiscount && discountPercent && (
            <span className="product-card__discount-badge">{Math.round(discountPercent)}% OFF</span>
          )}

          {/* Wishlist button */}
          <button className={`product-card__wishlist-btn ${inWishlist ? 'active' : ''}`} onClick={handleWishlist} aria-label="Toggle wishlist">
            <FiHeart size={16} fill={inWishlist ? 'currentColor' : 'none'} />
          </button>
        </div>
      </Link>

      {/* Body */}
      <div className="product-card__body">
        <div className="product-card__category">{category?.name || ''}</div>
        <Link to={`/products/${slug}`} style={{ textDecoration: 'none' }}>
          <div className="product-card__name">{name}</div>
        </Link>
        <StarRating rating={ratings || 0} count={numReviews || 0} size={12} />
        <div className="product-card__price">
          <span className="product-card__price-current">₹{effectivePrice?.toLocaleString('en-IN')}</span>
          {hasDiscount && <span className="product-card__price-original">₹{price?.toLocaleString('en-IN')}</span>}
        </div>
        {/* Stock status */}
        {outOfStock ? (
          <span style={{ fontSize: 11, color: 'var(--color-error)', fontWeight: 600, background: '#fee2e2', padding: '2px 8px', borderRadius: 4 }}>Out of Stock</span>
        ) : lowStock ? (
          <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600, background: '#fef3c7', padding: '2px 8px', borderRadius: 4 }}>Only {stock} left!</span>
        ) : (
          <span style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600, background: '#dcfce7', padding: '2px 8px', borderRadius: 4 }}>✓ In Stock</span>
        )}
      </div>

      {/* Footer */}
      <div className="product-card__footer">
        <button
          className={`product-card__add-btn ${outOfStock ? 'btn-ghost' : inCart ? 'btn-outline' : 'btn-primary'}`}
          style={{ border: `2px solid ${outOfStock ? 'var(--color-border)' : inCart ? 'var(--color-primary)' : 'transparent'}`, background: outOfStock ? 'transparent' : inCart ? 'transparent' : 'var(--color-primary)', color: outOfStock ? 'var(--color-text-muted)' : inCart ? 'var(--color-primary)' : 'white', cursor: outOfStock ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px', borderRadius: 8, fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}
          onClick={handleAddToCart}
          disabled={outOfStock || adding}
        >
          {outOfStock ? '🔔 Notify Me' : adding ? 'Adding…' : inCart ? '✓ Go to Cart' : <><FiShoppingCart size={14} /> Add to Cart</>}
        </button>
      </div>
    </div>
  );
}
