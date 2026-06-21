/**
 * pages/public/CheckoutPage.jsx
 * 3-step checkout: Address → Payment → Review & Place Order
 * Includes Razorpay integration.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiPlus } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { orderApi } from '../../api/orderApi';
import { authApi } from '../../api/authApi';
import toast from 'react-hot-toast';

const STEP_LABELS = ['Delivery Address', 'Payment Method', 'Review & Place Order'];

/* ---- Load Razorpay script ---- */
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, cartItems, setCartDirect } = useCart();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddr, setSelectedAddr] = useState(null);
  const [payment, setPayment] = useState('COD');
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [showNewAddr, setShowNewAddr] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: 'Home', name: user?.name || '', phone: user?.phone || '', street: '', city: '', state: 'Gujarat', pincode: '', saveAddress: true });

  useEffect(() => {
    authApi.getMe().then((r) => {
      const addrs = r.data.user?.addresses || [];
      setAddresses(addrs);
      const def = addrs.find(a => a.isDefault) || addrs[0];
      if (def) setSelectedAddr(def._id);
    });
  }, []);

  const handleAddAddress = async () => {
    if (!newAddr.street || !newAddr.city || !newAddr.pincode) { toast.error('Please fill all address fields'); return; }
    try {
      const res = await authApi.addAddress(newAddr);
      const updated = res.data.addresses || [];
      setAddresses(updated);
      const newest = updated[updated.length - 1];
      setSelectedAddr(newest?._id);
      setShowNewAddr(false);
      toast.success('Address added!');
    } catch (err) { toast.error(err.message || 'Failed to add address'); }
  };

  const placeOrder = async () => {
    if (!selectedAddr) { toast.error('Please select a delivery address'); return; }
    setPlacing(true);
    try {
      const addr = addresses.find(a => a._id === selectedAddr);
      const orderData = { shippingAddressId: selectedAddr, paymentMethod: payment, deliveryNote: note, couponCode: cart?.couponApplied?.code };

      if (payment === 'Razorpay') {
        const loaded = await loadRazorpay();
        if (!loaded) { toast.error('Payment gateway failed to load. Please try COD.'); setPlacing(false); return; }
        // Create order first
        const res = await orderApi.placeOrder(orderData);
        const { razorpayOrder, order } = res.data;
        if (!razorpayOrder) { toast.error('Failed to create payment order'); setPlacing(false); return; }

        const rzpOptions = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
          amount: razorpayOrder.amount,
          currency: 'INR',
          name: 'LocalStore',
          description: `Order ${order.orderNumber}`,
          order_id: razorpayOrder.id,
          prefill: { name: user?.name, email: user?.email, contact: user?.phone },
          theme: { color: '#16a34a' },
          handler: async (response) => {
            try {
              await orderApi.verifyPayment({ ...response, orderId: order._id });
              setCartDirect(null);
              navigate('/order-success', { state: { order } });
            } catch (err) { toast.error('Payment verification failed. Contact support.'); }
          },
          modal: { ondismiss: () => { setPlacing(false); toast.error('Payment was cancelled'); } },
        };
        const rzp = new window.Razorpay(rzpOptions);
        rzp.open();
      } else {
        const res = await orderApi.placeOrder(orderData);
        setCartDirect(null);
        navigate('/order-success', { state: { order: res.data.order } });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to place order. Please try again.');
      setPlacing(false);
    }
  };

  const NA = (f) => <input className="form-input" placeholder={f} value={newAddr[f.toLowerCase().replace(/ /g, '')] || ''} onChange={(e) => setNewAddr(a => ({ ...a, [f.toLowerCase().replace(/ /g, '')]: e.target.value }))} />;

  const OrderSummary = () => (
    <div className="card" style={{ position: 'sticky', top: 120 }}>
      <div className="card-header"><h3 className="card-title">Order Summary</h3></div>
      <div className="card-body">
        {cartItems.map((i) => (
          <div key={i._id} style={{ display: 'flex', gap: 10, marginBottom: 12, fontSize: 13 }}>
            <img src={i.product?.images?.[0]?.url || 'https://via.placeholder.com/40'} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{i.productName || i.product?.name}</div>
              <div style={{ color: 'var(--color-text-muted)' }}>Qty: {i.quantity} × ₹{i.discountPrice || i.price}</div>
            </div>
            <div style={{ fontWeight: 700 }}>₹{i.totalPrice?.toLocaleString('en-IN')}</div>
          </div>
        ))}
        <div className="divider" />
        {[
          ['Subtotal', `₹${cart?.subtotal?.toLocaleString('en-IN') || 0}`],
          cart?.discountAmount > 0 && ['Discount', `- ₹${cart.discountAmount?.toLocaleString('en-IN')}`],
          ['Shipping', cart?.shippingCharge === 0 ? 'FREE' : `₹${cart?.shippingCharge}`],
        ].filter(Boolean).map(([l, v]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>{l}</span>
            <span style={{ color: l === 'Discount' ? 'var(--color-success)' : undefined, fontWeight: 500 }}>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, borderTop: '2px solid var(--color-border)', paddingTop: 12, marginTop: 4 }}>
          <span>Total</span>
          <span style={{ color: 'var(--color-primary)' }}>₹{cart?.totalAmount?.toLocaleString('en-IN') || 0}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 24 }}>Checkout</h1>

      {/* Step indicator */}
      <div className="steps" style={{ marginBottom: 32 }}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} className={`step ${step > i + 1 ? 'completed' : ''} ${step === i + 1 ? 'active' : ''}`}>
            <div className="step-circle">{step > i + 1 ? <FiCheck size={14} /> : i + 1}</div>
            <div className="step-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'flex-start' }}>
        <div>
          {/* Step 1 — Address */}
          {step === 1 && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">📍 Select Delivery Address</h3></div>
              <div className="card-body">
                {addresses.map((addr) => (
                  <div key={addr._id} onClick={() => setSelectedAddr(addr._id)} style={{ border: `2px solid ${selectedAddr === addr._id ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 10, padding: 16, marginBottom: 12, cursor: 'pointer', transition: 'all 0.2s', background: selectedAddr === addr._id ? 'var(--color-primary-light)' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, background: selectedAddr === addr._id ? 'var(--color-primary)' : 'var(--color-border)', color: selectedAddr === addr._id ? 'white' : 'var(--color-text-secondary)', padding: '2px 8px', borderRadius: 4 }}>{addr.label}</span>
                      {selectedAddr === addr._id && <FiCheck color="var(--color-primary)" />}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 14, color: 'var(--color-text)' }}>
                      <strong>{addr.name}</strong> · {addr.phone}<br />
                      {addr.street}, {addr.city}, {addr.state} — {addr.pincode}
                    </div>
                  </div>
                ))}

                {/* Add new address */}
                {!showNewAddr ? (
                  <button className="btn btn-ghost" onClick={() => setShowNewAddr(true)} style={{ width: '100%', border: '2px dashed var(--color-border)' }}>
                    <FiPlus /> Add New Address
                  </button>
                ) : (
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 16 }}>
                    <h4 style={{ marginBottom: 14, fontWeight: 700 }}>New Address</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group"><label className="form-label">Label</label>
                        <select className="form-input form-select" value={newAddr.label} onChange={(e) => setNewAddr(a => ({ ...a, label: e.target.value }))}>
                          {['Home', 'Work', 'Other'].map(l => <option key={l}>{l}</option>)}
                        </select>
                      </div>
                      <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={newAddr.name} onChange={(e) => setNewAddr(a => ({ ...a, name: e.target.value }))} placeholder="Recipient name" /></div>
                      <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={newAddr.phone} onChange={(e) => setNewAddr(a => ({ ...a, phone: e.target.value }))} placeholder="Mobile number" /></div>
                      <div className="form-group"><label className="form-label">Pincode</label><input className="form-input" value={newAddr.pincode} onChange={(e) => setNewAddr(a => ({ ...a, pincode: e.target.value }))} placeholder="380001" /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Street Address</label><input className="form-input" value={newAddr.street} onChange={(e) => setNewAddr(a => ({ ...a, street: e.target.value }))} placeholder="House no., Street, Area" /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group"><label className="form-label">City</label><input className="form-input" value={newAddr.city} onChange={(e) => setNewAddr(a => ({ ...a, city: e.target.value }))} placeholder="Ahmedabad" /></div>
                      <div className="form-group"><label className="form-label">State</label><input className="form-input" value={newAddr.state} onChange={(e) => setNewAddr(a => ({ ...a, state: e.target.value }))} placeholder="Gujarat" /></div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button className="btn btn-primary" onClick={handleAddAddress}>Save Address</button>
                      <button className="btn btn-ghost" onClick={() => setShowNewAddr(false)}>Cancel</button>
                    </div>
                  </div>
                )}

                <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: 20 }} onClick={() => { if (!selectedAddr) { toast.error('Select an address'); return; } setStep(2); }} disabled={!selectedAddr}>
                  Continue to Payment →
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Payment */}
          {step === 2 && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">💳 Select Payment Method</h3></div>
              <div className="card-body">
                {[
                  { id: 'COD', icon: '💵', title: 'Cash on Delivery', desc: 'Pay when your order arrives. No extra charges.' },
                  { id: 'Razorpay', icon: '💳', title: 'Online Payment', desc: 'Pay securely using UPI, Cards or Net Banking via Razorpay.' },
                ].map((p) => (
                  <div key={p.id} onClick={() => setPayment(p.id)} style={{ border: `2px solid ${payment === p.id ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 10, padding: 16, marginBottom: 12, cursor: 'pointer', display: 'flex', gap: 14, alignItems: 'flex-start', background: payment === p.id ? 'var(--color-primary-light)' : 'white', transition: 'all 0.2s' }}>
                    <span style={{ fontSize: 28 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{p.desc}</div>
                    </div>
                    {payment === p.id && <FiCheck color="var(--color-primary)" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                  <button className="btn btn-primary btn-full btn-lg" onClick={() => setStep(3)}>Continue →</button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">📋 Review Your Order</h3></div>
              <div className="card-body">
                {/* Selected address */}
                {(() => { const a = addresses.find(ad => ad._id === selectedAddr); return a ? (
                  <div style={{ background: 'var(--color-bg)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      📍 Delivery to: {a.label}
                      <button onClick={() => setStep(1)} style={{ fontSize: 12, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Change</button>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{a.name} · {a.phone}<br />{a.street}, {a.city}, {a.state} — {a.pincode}</div>
                  </div>
                ) : null; })()}

                {/* Payment method */}
                <div style={{ background: 'var(--color-bg)', borderRadius: 8, padding: 14, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>💳 Payment: {payment === 'COD' ? 'Cash on Delivery' : 'Online Payment (Razorpay)'}</span>
                  <button onClick={() => setStep(2)} style={{ fontSize: 12, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Change</button>
                </div>

                {/* Delivery note */}
                <div className="form-group">
                  <label className="form-label">Delivery Instructions (optional)</label>
                  <textarea className="form-input" rows={3} placeholder="Leave at door, call on arrival, etc." value={note} onChange={(e) => setNote(e.target.value)} />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                  <button className="btn btn-primary btn-full btn-xl" onClick={placeOrder} disabled={placing}>
                    {placing ? '⏳ Placing Order…' : payment === 'COD' ? '✅ Place Order (COD)' : '💳 Pay & Place Order'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <OrderSummary />
      </div>
    </div>
  );
}
