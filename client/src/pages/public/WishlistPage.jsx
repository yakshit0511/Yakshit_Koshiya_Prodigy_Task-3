import { Link } from 'react-router-dom';
import { useWishlist } from '../../context/WishlistContext';
import ProductCard from '../../components/product/ProductCard';
import { Breadcrumb, EmptyState } from '../../components/common/index.jsx';

export default function WishlistPage() {
  const { wishlist, removeFromWishlist, moveToCart } = useWishlist();

  return (
    <div>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Wishlist' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>❤️ My Wishlist</h1>
        <span style={{ fontSize: 14, color: 'var(--color-text-secondary)', fontWeight: 600 }}>
          {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved
        </span>
      </div>

      {wishlist.length === 0 ? (
        <EmptyState
          icon="❤️"
          title="Your wishlist is empty"
          description="Save items you like here to purchase them later."
          action={
            <Link to="/products" className="btn btn-primary btn-lg">
              Explore Products 🏪
            </Link>
          }
        />
      ) : (
        <div className="products-grid">
          {wishlist.map((product) => (
            <div key={product._id} className="product-card-container" style={{ position: 'relative' }}>
              <ProductCard product={product} />
              <div style={{ display: 'flex', gap: 8, padding: '0 14px 14px', marginTop: -6 }}>
                <button
                  onClick={() => moveToCart(product._id)}
                  disabled={!product.isInStock || product.stock === 0}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  🛒 Move to Cart
                </button>
                <button
                  onClick={() => removeFromWishlist(product._id)}
                  className="btn btn-danger btn-sm"
                  style={{ flexShrink: 0, padding: '0 12px' }}
                  title="Remove from Wishlist"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
