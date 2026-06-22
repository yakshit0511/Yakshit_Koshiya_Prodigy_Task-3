import { useCompare } from '../../context/CompareContext';
import { useCart } from '../../context/CartContext';
import { Breadcrumb, EmptyState } from '../../components/common/index.jsx';
import { Link } from 'react-router-dom';

export default function ComparePage() {
  const { compareItems, removeFromCompare } = useCompare();
  const { addToCart } = useCart();

  // Consolidate all spec keys across all compare products
  const allSpecKeys = Array.from(new Set(
    compareItems.flatMap(p => p.specifications ? Object.keys(p.specifications) : [])
  ));

  return (
    <div>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Compare Products' }]} />

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>⚖️ Product Comparison</h1>

      {compareItems.length === 0 ? (
        <EmptyState
          icon="⚖️"
          title="No products to compare"
          description="Add up to 3 products from their listings to compare specifications side by side."
          action={
            <Link to="/products" className="btn btn-primary">
              Browse Products
            </Link>
          }
        />
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)', background: '#f8fafc' }}>
                <th style={{ padding: '24px 20px', width: '25%', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                  Attributes
                </th>
                {compareItems.map((p) => (
                  <th key={p._id} style={{ padding: '24px 20px', textAlign: 'center', position: 'relative' }}>
                    <button
                      onClick={() => removeFromCompare(p._id)}
                      style={{ position: 'absolute', top: 12, right: 12, background: '#ef444415', color: '#ef4444', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Remove Product"
                    >
                      ✕
                    </button>
                    <img
                      src={p.images?.[0]?.url || 'https://via.placeholder.com/120x90?text=Product'}
                      alt={p.name}
                      style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, margin: '0 auto 12px' }}
                    />
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-text)' }}>{p.name}</div>
                  </th>
                ))}
                {Array.from({ length: 3 - compareItems.length }).map((_, i) => (
                  <th key={i} style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                    Empty Slot
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Price row */}
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '16px 20px', fontWeight: 700 }}>Price</td>
                {compareItems.map((p) => (
                  <td key={p._id} style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 800, fontSize: 16, color: 'var(--color-primary)' }}>
                    ₹{(p.discountPrice || p.price).toLocaleString('en-IN')}
                    {p.discountPrice && p.discountPrice < p.price && (
                      <span style={{ fontSize: 12, textDecoration: 'line-through', color: 'var(--color-text-muted)', marginLeft: 8 }}>
                        ₹{p.price.toLocaleString('en-IN')}
                      </span>
                    )}
                  </td>
                ))}
                {Array.from({ length: 3 - compareItems.length }).map((_, i) => <td key={i} />)}
              </tr>

              {/* Category row */}
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '16px 20px', fontWeight: 700 }}>Category</td>
                {compareItems.map((p) => (
                  <td key={p._id} style={{ padding: '16px 20px', textAlign: 'center' }}>
                    {p.category?.name || 'N/A'}
                  </td>
                ))}
                {Array.from({ length: 3 - compareItems.length }).map((_, i) => <td key={i} />)}
              </tr>

              {/* Stock status */}
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '16px 20px', fontWeight: 700 }}>Availability</td>
                {compareItems.map((p) => (
                  <td key={p._id} style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 700 }}>
                    {p.stock === 0 ? (
                      <span style={{ color: 'var(--color-error)' }}>Out of Stock</span>
                    ) : (
                      <span style={{ color: 'var(--color-success)' }}>In Stock ({p.stock})</span>
                    )}
                  </td>
                ))}
                {Array.from({ length: 3 - compareItems.length }).map((_, i) => <td key={i} />)}
              </tr>

              {/* Ratings row */}
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '16px 20px', fontWeight: 700 }}>Customer Ratings</td>
                {compareItems.map((p) => (
                  <td key={p._id} style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <span style={{ color: '#f59e0b', fontSize: 16 }}>★</span> {p.ratings?.toFixed(1) || '0.0'} ({p.numReviews || 0} reviews)
                  </td>
                ))}
                {Array.from({ length: 3 - compareItems.length }).map((_, i) => <td key={i} />)}
              </tr>

              {/* Specs Rows */}
              {allSpecKeys.map((key) => (
                <tr key={key} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{key}</td>
                  {compareItems.map((p) => {
                    const val = p.specifications ? p.specifications[key] : null;
                    return (
                      <td key={p._id} style={{ padding: '16px 20px', textAlign: 'center' }}>
                        {val || '—'}
                      </td>
                    );
                  })}
                  {Array.from({ length: 3 - compareItems.length }).map((_, i) => <td key={i} />)}
                </tr>
              ))}

              {/* Action/Buy Buttons row */}
              <tr>
                <td style={{ padding: '24px 20px' }} />
                {compareItems.map((p) => (
                  <td key={p._id} style={{ padding: '24px 20px', textAlign: 'center' }}>
                    <button
                      onClick={() => addToCart(p._id, 1, p.name)}
                      disabled={p.stock === 0}
                      className="btn btn-primary"
                      style={{ width: '100%', maxWidth: 140 }}
                    >
                      🛒 Add to Cart
                    </button>
                  </td>
                ))}
                {Array.from({ length: 3 - compareItems.length }).map((_, i) => <td key={i} />)}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
