import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';

// Helper function to track product view in localStorage
export function trackProductView(product) {
  if (!product || !product._id) return;
  try {
    const saved = localStorage.getItem('recently_viewed');
    let items = saved ? JSON.parse(saved) : [];
    
    // Filter out duplicates
    items = items.filter((p) => p._id !== product._id);
    
    // Add to front of the list
    items.unshift(product);
    
    // Limit to 10 items
    if (items.length > 10) items.pop();
    
    localStorage.setItem('recently_viewed', JSON.stringify(items));
  } catch (_) {}
}

export default function RecentlyViewed({ excludeId }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('recently_viewed');
      if (saved) {
        let parsed = JSON.parse(saved);
        if (excludeId) {
          parsed = parsed.filter((p) => p._id !== excludeId);
        }
        setItems(parsed);
      }
    } catch (_) {}
  }, [excludeId]);

  if (items.length === 0) return null;

  return (
    <section className="section" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 40, marginTop: 40 }}>
      <div className="section-header">
        <h2 className="section-title">⏱️ Recently Viewed</h2>
        <p className="section-subtitle">Products you looked at recently</p>
      </div>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
        {items.map((p) => (
          <div key={p._id} style={{ width: 220, flexShrink: 0 }}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
