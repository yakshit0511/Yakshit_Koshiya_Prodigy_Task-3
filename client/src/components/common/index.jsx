import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/* Common reusable components — all in one file for brevity */

// LoadingSpinner
export const LoadingSpinner = ({ size = 'md', color = 'primary', fullPage = false }) => {
  const sizes = { sm: 20, md: 32, lg: 48, xl: 64 };
  const s = sizes[size] || 32;
  const spinner = (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
      <svg width={s} height={s} viewBox="0 0 50 50" style={{ animation: 'spin 0.8s linear infinite' }}>
        <circle cx="25" cy="25" r="20" fill="none" stroke={`var(--color-${color})`} strokeWidth="4" strokeLinecap="round" strokeDasharray="90 60" />
      </svg>
    </div>
  );
  if (fullPage) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {spinner}
    </div>
  );
  return spinner;
};

// SkeletonCard — product card placeholder
export const SkeletonCard = () => (
  <div className="product-card" style={{ cursor: 'default' }}>
    <div className="skeleton" style={{ paddingTop: '75%' }} />
    <div style={{ padding: '14px' }}>
      <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 16, width: '90%', marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 16, width: '70%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 20, width: '40%' }} />
    </div>
    <div style={{ padding: '0 14px 14px' }}>
      <div className="skeleton" style={{ height: 36, borderRadius: 8 }} />
    </div>
  </div>
);

// SkeletonTable
export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
  <div className="data-table-wrap">
    <table className="data-table" style={{ width: '100%' }}>
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i}><div className="skeleton" style={{ height: 12, borderRadius: 4 }} /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// EmptyState
export const EmptyState = ({ icon = '📭', title = 'Nothing here yet', description = '', action }) => (
  <div style={{ textAlign: 'center', padding: '60px 20px' }} className="animate-fade-in">
    <div style={{ fontSize: 64, marginBottom: 16 }}>{icon}</div>
    <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 8 }}>{title}</h3>
    {description && <p style={{ color: 'var(--color-text-secondary)', maxWidth: 400, margin: '0 auto 24px' }}>{description}</p>}
    {action}
  </div>
);

// Badge
export const Badge = ({ children, variant = 'neutral', dot = false }) => (
  <span className={`badge badge-${variant}`}>
    {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />}
    {children}
  </span>
);

// StarRating — display only
export const StarRating = ({ rating = 0, count, size = 14, showNumber = false }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {stars.map((s) => (
        <span key={s} style={{ color: s <= Math.round(rating) ? '#f59e0b' : '#d1d5db', fontSize: size, lineHeight: 1 }}>★</span>
      ))}
      {showNumber && <span style={{ fontSize: size - 2, color: 'var(--color-text-muted)', marginLeft: 2 }}>{rating.toFixed(1)}</span>}
      {count !== undefined && <span style={{ fontSize: size - 2, color: 'var(--color-text-muted)' }}>({count})</span>}
    </span>
  );
};

// StarRatingInput — interactive
export const StarRatingInput = ({ value = 0, onChange }) => {
  const [hovered, setHovered] = useState(0);
  return (
    <span style={{ display: 'inline-flex', gap: 4, cursor: 'pointer' }}>
      {[1,2,3,4,5].map((s) => (
        <span
          key={s}
          style={{ fontSize: 28, color: s <= (hovered || value) ? '#f59e0b' : '#d1d5db', transition: 'color 0.1s' }}
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
        >★</span>
      ))}
    </span>
  );
};

// Breadcrumb
export const Breadcrumb = ({ items }) => (
  <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
    {items.map((item, i) => (
      <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {i > 0 && <span>›</span>}
        {item.href ? (
          <a href={item.href} style={{ color: 'var(--color-text-secondary)', textDecoration: 'none' }}
            onMouseOver={(e) => e.target.style.color = 'var(--color-primary)'}
            onMouseOut={(e) => e.target.style.color = 'var(--color-text-secondary)'}
          >{item.label}</a>
        ) : (
          <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{item.label}</span>
        )}
      </span>
    ))}
  </nav>
);

// Pagination
export const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = [];
  const range = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - range && i <= page + range)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: 'var(--space-6) 0' }}>
      <button className="btn btn-ghost btn-sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>← Prev</button>
      {pages.map((p, i) => (
        <button key={i}
          className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => typeof p === 'number' && onPageChange(p)}
          disabled={p === '...'}
          style={{ minWidth: 36 }}
        >{p}</button>
      ))}
      <button className="btn btn-ghost btn-sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>Next →</button>
    </div>
  );
};

// Modal
export const Modal = ({ isOpen, onClose, title, children, width = 520 }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-4)',
    }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-scale-in"
        style={{
          position: 'relative', background: 'white', borderRadius: 'var(--radius-xl)',
          width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        {title && (
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--color-text-muted)', lineHeight: 1 }}>✕</button>
          </div>
        )}
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
};

// ConfirmModal
export const ConfirmModal = ({ isOpen, onClose, onConfirm, title = 'Are you sure?', message, confirmText = 'Confirm', danger = false, loading = false }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} width={420}>
    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 24 }}>{message}</p>
    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
      <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
      <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
        {loading ? 'Please wait...' : confirmText}
      </button>
    </div>
  </Modal>
);

// ScrollToTop
export const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

// BackButton
export const BackButton = () => {
  const navigate = useNavigate();
  return (
    <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-4)' }}>
      ← Back
    </button>
  );
};
