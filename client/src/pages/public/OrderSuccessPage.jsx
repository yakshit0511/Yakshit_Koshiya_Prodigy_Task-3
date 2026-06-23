/** pages/public/OrderSuccessPage.jsx */
import { useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const order = state?.order;
  const checkRef = useRef(null);

  useEffect(() => {
    // Animate checkmark
    if (checkRef.current) { checkRef.current.style.animation = 'successPop 0.5s ease forwards'; }
  }, []);

  const delivery = new Date();
  delivery.setDate(delivery.getDate() + 3);

  return (
    <div style={{ textAlign: 'center', maxWidth: 500, margin: '40px auto', padding: '0 20px' }}>
      <div ref={checkRef} style={{ width: 96, height: 96, background: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 48 }}>
        ✅
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8, color: 'var(--color-text)' }}>Order Placed! 🎉</h1>
      {order && <p style={{ fontSize: 18, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Order #{order.orderNumber}</p>}
      <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', marginBottom: 24 }}>
        Thank you for shopping with LocalStore! Your order has been confirmed and is being prepared.
      </p>

      <div style={{ background: 'var(--color-primary-light)', borderRadius: 12, padding: '16px 24px', marginBottom: 28 }}>
        <p style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 14 }}>🚚 Estimated Delivery</p>
        <p style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-text)', marginTop: 4 }}>
          {delivery.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        {order?.paymentMethod === 'COD' && (
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>Payment: Cash on Delivery</p>
        )}
      </div>

      {/* Brief item summary */}
      {order?.items?.length > 0 && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', padding: 20, marginBottom: 28, textAlign: 'left' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 15 }}>Your Order:</h3>
          {order.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>{item.productName} × {item.quantity}</span>
              <span style={{ fontWeight: 600 }}>₹{item.totalPrice?.toLocaleString('en-IN')}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
            <span>Total</span>
            <span style={{ color: 'var(--color-primary)' }}>₹{order.totalAmount?.toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to={`/my-orders/${order?._id}`} className="btn btn-primary btn-lg">📦 Track Order</Link>
        <Link to="/" className="btn btn-outline btn-lg">🛍️ Continue Shopping</Link>
      </div>

      <p style={{ marginTop: 24, fontSize: 13, color: 'var(--color-text-muted)' }}>
        A confirmation email has been sent to your registered email address.
      </p>
    </div>
  );
}
