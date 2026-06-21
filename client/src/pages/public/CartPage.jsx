/**
 * pages/public/CartPage.jsx
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiMinus, FiPlus, FiTrash2, FiTag, FiX, FiShoppingBag } from 'react-icons/fi';
import { ConfirmModal, EmptyState, LoadingSpinner } from '../../components/common/index.jsx';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export default function CartPage() {
  const { cart, cartItems, loading, removeFromCart, updateQuantity, applyCoupon, removeCoupon } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [removeId, setRemoveId] = useState(null);

  if (loading) return <LoadingSpinner fullPage />;
  if (!cartItems || cartItems.length === 0) return (
    <EmptyState icon="🛒" title="Your cart is empty" description="Add some products to get started with your order."
      action={<Link to="/products" className="btn btn-primary btn-lg">Start Shopping →</Link>}
    />
  );

  const handleCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true); setCouponError('');
    try {
      await applyCoupon(couponCode.trim().toUpperCase());
      setCouponCode('');
    } catch (err) { setCouponError(err.message || 'Invalid coupon'); }
    finally { setCouponLoading(false); }
  };

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 24 }}>🛒 Your Cart ({cartItems.length} items)</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'flex-start' }}>

        {/* Cart items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {cartItems.map((item) => {
            const p = item.product || {};
            const img = p.images?.[0]?.url || `https://via.placeholder.com/80x80?text=P`;
            const unitPrice = item.discountPrice && item.discountPrice < item.price ? item.discountPrice : item.price;
            return (
              <div key={item._id || p._id} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--color-border)', padding: 16, display: 'flex', gap: 16, alignItems: 'flex-start', boxShadow: 'var(--shadow-sm)' }}>
                <Link to={`/products/${p.slug}`}>
                  <img src={img} alt={p.name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} onError={(e) => { e.target.src = 'https://via.placeholder.com/80x80?text=P'; }} />
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/products/${p.slug}`} style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', textDecoration: 'none' }}>{item.productName || p.name}</Link>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>Category: {p.category?.name || '–'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    {/* Qty controls */}
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                      <button onClick={() => updateQuantity(p._id, Math.max(1, item.quantity - 1))} style={{ padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer' }}><FiMinus size={12} /></button>
                      <span style={{ padding: '6px 12px', fontWeight: 700, minWidth: 32, textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(p._id, Math.min(p.stock || 99, item.quantity + 1))} style={{ padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer' }}><FiPlus size={12} /></button>
                    </div>
                    <div>
                      <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--color-primary)' }}>₹{(unitPrice * item.quantity)?.toLocaleString('en-IN')}</span>
                      {item.price !== unitPrice && <span style={{ fontSize: 12, color: 'var(--color-text-muted)', textDecoration: 'line-through', marginLeft: 6 }}>₹{(item.price * item.quantity)?.toLocaleString('en-IN')}</span>}
                    </div>
                  </div>
                  {(!p.isInStock || p.stock === 0) && <p style={{ fontSize: 12, color: 'var(--color-error)', marginTop: 6 }}>⚠️ This item is out of stock. Please remove it.</p>}
                </div>
                <button onClick={() => setRemoveId(p._id)} style={{ color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><FiTrash2 /></button>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--color-border)', padding: 24, boxShadow: 'var(--shadow-sm)', position: 'sticky', top: 120 }}>
          <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 20 }}>Order Summary</h3>

          {/* Coupon */}
          {!cart?.couponApplied ? (
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'block' }}><FiTag style={{ marginRight: 6 }} />Have a coupon?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" placeholder="Enter coupon code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && handleCoupon()} style={{ flex: 1 }} />
                <button className="btn btn-outline" onClick={handleCoupon} disabled={couponLoading}>{couponLoading ? '…' : 'Apply'}</button>
              </div>
              {couponError && <p style={{ fontSize: 12, color: 'var(--color-error)', marginTop: 6 }}>{couponError}</p>}
            </div>
          ) : (
            <div style={{ background: '#dcfce7', border: '1px solid #16a34a', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>🎉 Coupon: {cart.couponApplied.code}</p>
                <p style={{ fontSize: 12, color: 'var(--color-primary)' }}>Saving ₹{cart.discountAmount?.toLocaleString('en-IN')}</p>
              </div>
              <button onClick={removeCoupon} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}><FiX /></button>
            </div>
          )}

          {/* Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Subtotal', val: `₹${cart?.subtotal?.toLocaleString('en-IN') || 0}` },
              cart?.discountAmount > 0 && { label: 'Discount', val: `- ₹${cart.discountAmount?.toLocaleString('en-IN')}`, green: true },
              { label: `Shipping${cart?.shippingCharge === 0 ? ' (FREE!)' : ''}`, val: cart?.shippingCharge === 0 ? 'Free' : `₹${cart?.shippingCharge}` },
            ].filter(Boolean).map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{row.label}</span>
                <span style={{ fontWeight: 600, color: row.green ? 'var(--color-success)' : 'var(--color-text)' }}>{row.val}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontWeight: 800, fontSize: 16 }}>Total</span>
            <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--color-primary)' }}>₹{cart?.totalAmount?.toLocaleString('en-IN') || 0}</span>
          </div>

          <button className="btn btn-primary btn-full btn-xl" onClick={() => { if (!isAuthenticated) navigate('/login', { state: { from: { pathname: '/checkout' } } }); else navigate('/checkout'); }}>
            Proceed to Checkout →
          </button>
          <Link to="/products" className="btn btn-ghost btn-full" style={{ marginTop: 12, textAlign: 'center', display: 'block' }}>← Continue Shopping</Link>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            {['💳 Cards', '📱 UPI', '💵 COD'].map((m) => (
              <span key={m} style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-border)', padding: '3px 8px', borderRadius: 4 }}>{m}</span>
            ))}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!removeId} onClose={() => setRemoveId(null)}
        onConfirm={() => { removeFromCart(removeId); setRemoveId(null); }}
        title="Remove Item" message="Remove this item from your cart?"
        confirmText="Remove" danger
      />
    </div>
  );
}
