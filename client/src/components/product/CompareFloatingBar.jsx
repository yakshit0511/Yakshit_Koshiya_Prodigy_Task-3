import { Link } from 'react-router-dom';
import { useCompare } from '../../context/CompareContext';

export default function CompareFloatingBar() {
  const { compareItems, removeFromCompare, clearCompare } = useCompare();

  if (compareItems.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: 'white',
      border: '1px solid var(--color-border)',
      borderRadius: 16,
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.04)',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 24,
      width: '90%',
      maxWidth: 680,
    }}>
      <div style={{ display: 'flex', gap: 12, flex: 1, overflowX: 'auto' }}>
        {compareItems.map((p) => (
          <div key={p._id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#f8fafc',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: '6px 12px 6px 8px',
            flexShrink: 0,
            position: 'relative',
          }}>
            <img
              src={p.images?.[0]?.url || 'https://via.placeholder.com/32x32?text=P'}
              alt={p.name}
              style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}
            </span>
            <button
              onClick={() => removeFromCompare(p._id)}
              style={{
                border: 'none',
                background: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: 16,
                height: 16,
                fontSize: 9,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        ))}
        {Array.from({ length: 3 - compareItems.length }).map((_, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed var(--color-border)',
            borderRadius: 8,
            width: 140,
            height: 46,
            fontSize: 11,
            color: 'var(--color-text-muted)',
            flexShrink: 0,
          }}>
            ＋ Add Product
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button onClick={clearCompare} className="btn btn-ghost btn-sm" style={{ padding: '8px 12px' }}>
          Clear
        </button>
        <Link to="/compare" className="btn btn-primary btn-sm" style={{ padding: '8px 16px', textDecoration: 'none' }}>
          Compare Now ⚖️
        </Link>
      </div>
    </div>
  );
}
