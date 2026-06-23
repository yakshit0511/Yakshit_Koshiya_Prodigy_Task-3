import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import ProductCard from '../../components/product/ProductCard';
import { Breadcrumb, EmptyState } from '../../components/common/index.jsx';

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, moveToCart } = useWishlist();
  const [sortBy, setSortBy] = useState('date-desc');

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const getSortedWishlist = () => {
    const list = [...wishlist];
    switch (sortBy) {
      case 'price-asc':
        return list.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
      case 'price-desc':
        return list.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
      case 'name-asc':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'name-desc':
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case 'date-asc':
        return list.sort((a, b) => new Date(a.createdAt || a._id) - new Date(b.createdAt || b._id));
      case 'date-desc':
      default:
        return list.sort((a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id));
    }
  };

  const sortedWishlist = getSortedWishlist();

  return (
    <div>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Wishlist' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>❤️ My Wishlist</h1>
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved
          </span>
        </div>

        {wishlist.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label htmlFor="wishlist-sort" style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Sort by:</label>
            <select
              id="wishlist-sort"
              className="form-input form-select"
              style={{ width: 160, padding: '6px 12px', fontSize: 13 }}
              value={sortBy}
              onChange={handleSortChange}
            >
              <option value="date-desc">Date Added (Newest)</option>
              <option value="date-asc">Date Added (Oldest)</option>
              <option value="price-asc">Price (Low to High)</option>
              <option value="price-desc">Price (High to Low)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
        )}
      </div>

      {wishlist.length === 0 ? (
        <EmptyState
          icon="❤️"
          title="Your wishlist is empty"
          description="Save items you like here to purchase them later."
          action={
            <Link to="/products" className="btn btn-primary btn-lg">
              Go Shopping 🏪
            </Link>
          }
        />
      ) : (
        <div className="products-grid">
          {sortedWishlist.map((product) => {
            const isOutOfStock = product.stock === 0 || !product.isInStock;
            return (
              <div key={product._id} className="product-card-container" style={{
                position: 'relative',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div style={{ position: 'relative' }}>
                  <ProductCard product={product} />
                  
                  {isOutOfStock && (
                    <div style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      background: 'rgba(239, 68, 68, 0.9)',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 12,
                      zIndex: 10,
                    }}>
                      Out of Stock 🚫
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, padding: '0 14px 14px', marginTop: -6, zIndex: 5 }}>
                  <button
                    onClick={() => moveToCart(product._id)}
                    disabled={isOutOfStock}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                  >
                    🛒 Move to Cart
                  </button>
                  <button
                    onClick={() => removeFromWishlist(product._id)}
                    className="btn btn-outline btn-danger btn-sm"
                    style={{ flexShrink: 0, padding: '0 12px', border: '1px solid var(--color-error)', color: 'var(--color-error)' }}
                    title="Remove from Wishlist"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
