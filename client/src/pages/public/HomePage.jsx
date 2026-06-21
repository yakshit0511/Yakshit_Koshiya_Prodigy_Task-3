/**
 * pages/public/HomePage.jsx
 * Landing page assembling all home sections.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiTruck, FiRefreshCw, FiLock, FiStar } from 'react-icons/fi';
import ProductCard from '../../components/product/ProductCard';
import { SkeletonCard } from '../../components/common/index.jsx';
import { productApi, categoryApi } from '../../api/productApi';

/* =========================================================
   HERO BANNER
   ========================================================= */
const slides = [
  {
    eyebrow: 'Fresh & Organic',
    title: 'Fresh Products\nDelivered Daily',
    subtitle: 'Quality you can taste, prices you can trust.',
    cta: 'Shop Now',
    link: '/products',
    bg: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)',
    emoji: '🥦',
  },
  {
    eyebrow: 'Weekend Special',
    title: 'Special Weekend\nOffers Await!',
    subtitle: 'Savings up to 40% on selected items every weekend.',
    cta: 'View Deals',
    link: '/products?sort=-discountPercent',
    bg: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 40%, #c2410c 100%)',
    emoji: '🎁',
  },
  {
    eyebrow: 'Free Delivery',
    title: 'Order Above ₹500\nGet Free Delivery!',
    subtitle: 'Fast delivery straight to your doorstep.',
    cta: 'Order Now',
    link: '/products',
    bg: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 40%, #2563eb 100%)',
    emoji: '🚚',
  },
];

function HeroBanner() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % slides.length), 4000);
    return () => clearInterval(t);
  }, []);

  const prev = () => setActive((a) => (a - 1 + slides.length) % slides.length);
  const next = () => setActive((a) => (a + 1) % slides.length);

  return (
    <div className="hero-banner" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: 'var(--space-12)' }}>
      {slides.map((slide, i) => (
        <div key={i} className={`hero-slide ${i === active ? 'active' : ''}`}>
          <div className="hero-slide-bg" style={{ background: slide.bg }} />
          <div className="hero-slide-overlay" />
          <div className="container hero-slide-content" style={{ padding: '0 48px' }}>
            <div className="hero-slide-eyebrow">✨ {slide.eyebrow}</div>
            <h1 className="hero-slide-title" style={{ whiteSpace: 'pre-line' }}>{slide.title}</h1>
            <p className="hero-slide-subtitle">{slide.subtitle}</p>
            <Link to={slide.link} className="btn btn-xl" style={{ background: 'white', color: 'var(--color-text)', fontWeight: 700, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              {slide.cta} →
            </Link>
          </div>
          {/* Decorative emoji */}
          <div style={{ position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)', fontSize: 120, opacity: 0.3, pointerEvents: 'none' }}>
            {slide.emoji}
          </div>
        </div>
      ))}

      {/* Arrows */}
      <button className="hero-arrow hero-arrow-left" onClick={prev}><FiChevronLeft /></button>
      <button className="hero-arrow hero-arrow-right" onClick={next}><FiChevronRight /></button>

      {/* Dots */}
      <div className="hero-controls">
        {slides.map((_, i) => (
          <button key={i} className={`hero-dot ${i === active ? 'active' : ''}`} onClick={() => setActive(i)} />
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   CATEGORY GRID
   ========================================================= */
function CategoryGrid({ categories }) {
  if (!categories.length) return null;
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">🛒 Shop by Category</h2>
        <p className="section-subtitle">Find exactly what you're looking for</p>
      </div>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
        {categories.map((cat) => (
          <Link
            key={cat._id}
            to={`/category/${cat.slug}`}
            style={{ textDecoration: 'none', flexShrink: 0 }}
          >
            <div style={{
              background: 'white',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--color-border)',
              padding: '20px 24px',
              textAlign: 'center',
              width: 140,
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {cat.image?.url ? (
                <img src={cat.image.url} alt={cat.name} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '50%', margin: '0 auto 10px' }} />
              ) : (
                <div style={{ width: 64, height: 64, background: 'var(--color-primary-light)', borderRadius: '50%', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🏷️</div>
              )}
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)', marginBottom: 3 }}>{cat.name}</div>
              {cat.productCount !== undefined && (
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{cat.productCount} items</div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   OFFER BANNER with countdown
   ========================================================= */
function OfferBanner() {
  const [time, setTime] = useState({ h: 4, m: 23, s: 59 });
  useEffect(() => {
    const t = setInterval(() => setTime((prev) => {
      let { h, m, s } = prev;
      s -= 1;
      if (s < 0) { s = 59; m -= 1; }
      if (m < 0) { m = 59; h = Math.max(0, h - 1); }
      return { h, m, s };
    }), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f97316, #dc2626)',
      borderRadius: 'var(--radius-xl)',
      padding: '40px 48px',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24,
      flexWrap: 'wrap',
      margin: 'var(--space-8) 0',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.85, marginBottom: 8 }}>🔥 Limited Time Offer</div>
        <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Get 20% OFF on your first order!</h2>
        <p style={{ fontSize: 16, opacity: 0.9, marginBottom: 16 }}>Use coupon code at checkout</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '10px 20px', backdropFilter: 'blur(8px)' }}>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: 4 }}>WELCOME20</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 12, fontWeight: 600 }}>⏰ Offer expires in:</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {[[pad(time.h), 'Hours'], [pad(time.m), 'Mins'], [pad(time.s), 'Secs']].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '12px 16px', fontSize: 32, fontWeight: 800, minWidth: 70, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        <Link to="/products" className="btn btn-xl" style={{ background: 'white', color: '#dc2626', fontWeight: 800, marginTop: 20, display: 'inline-block' }}>
          Shop Now →
        </Link>
      </div>
    </div>
  );
}

/* =========================================================
   WHY CHOOSE US
   ========================================================= */
function WhyChooseUs() {
  const features = [
    { icon: '🌿', title: 'Fresh Products', desc: 'Sourced daily from trusted local farms and suppliers. Guaranteed freshness.' },
    { icon: '🚚', title: 'Fast Delivery', desc: 'Same-day delivery available. Free shipping on orders above ₹500.' },
    { icon: '↩️', title: 'Easy Returns', desc: '7-day hassle-free return policy. No questions asked.' },
    { icon: '🔐', title: 'Secure Payment', desc: 'SSL encrypted payments. UPI, Cards, Net Banking and COD accepted.' },
  ];
  return (
    <section className="section">
      <div className="section-header" style={{ textAlign: 'center' }}>
        <h2 className="section-title">Why Choose LocalStore?</h2>
        <p className="section-subtitle">We're committed to making your shopping experience exceptional</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
        {features.map((f) => (
          <div key={f.title} style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 28, textAlign: 'center', border: '1px solid var(--color-border)', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
          >
            <div style={{ fontSize: 40, marginBottom: 14 }}>{f.icon}</div>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{f.title}</h3>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   TESTIMONIALS
   ========================================================= */
const testimonials = [
  { name: 'Priya Sharma', text: 'Absolutely love this store! Super fresh vegetables, delivery was on time and the prices are very fair. Will order again!', rating: 5, location: 'Ahmedabad' },
  { name: 'Ravi Patel', text: 'Best local store online! I love that I can get everything delivered at home. The cashew nuts are amazing!', rating: 5, location: 'Surat' },
  { name: 'Deepa Mehta', text: 'Excellent customer service. Had an issue with my order and it was resolved within hours. Highly recommend!', rating: 5, location: 'Vadodara' },
  { name: 'Amit Shah', text: 'Great variety of products. The organic section is especially impressive. Packaging is also very good.', rating: 4, location: 'Mumbai' },
];

function Testimonials() {
  const [start, setStart] = useState(0);
  const count = typeof window !== 'undefined' && window.innerWidth < 768 ? 1 : 3;
  const visible = testimonials.slice(start, start + count);
  useEffect(() => {
    const t = setInterval(() => setStart((s) => (s + 1) % testimonials.length), 5000);
    return () => clearInterval(t);
  }, [count]);
  return (
    <section className="section">
      <div className="section-header" style={{ textAlign: 'center' }}>
        <h2 className="section-title">💬 What Our Customers Say</h2>
        <p className="section-subtitle">Real reviews from happy customers</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 20 }}>
        {visible.map((t, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 'var(--radius-lg)', padding: 24, border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[1,2,3,4,5].map((s) => <span key={s} style={{ color: s <= t.rating ? '#f59e0b' : '#e5e7eb' }}>★</span>)}
            </div>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>"{t.text}"</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>
                {t.name[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{t.location}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   NEWSLETTER
   ========================================================= */
function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const submit = (e) => { e.preventDefault(); if (email) setDone(true); };
  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
      borderRadius: 'var(--radius-xl)',
      padding: '48px 40px',
      textAlign: 'center',
      color: 'white',
      margin: 'var(--space-8) 0',
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📩</div>
      <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Subscribe & Save 10%</h2>
      <p style={{ opacity: 0.9, fontSize: 16, marginBottom: 28 }}>
        Join 10,000+ happy subscribers and get exclusive deals, recipes, and more — right in your inbox!
      </p>
      {done ? (
        <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '14px 24px', display: 'inline-block', fontWeight: 700, fontSize: 16 }}>
          🎉 Thank you! Check your email for your 10% discount code.
        </div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', gap: 12, maxWidth: 480, margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            style={{ flex: 1, minWidth: 240, padding: '13px 18px', borderRadius: 10, border: 'none', fontSize: 15, outline: 'none' }}
          />
          <button type="submit" className="btn btn-secondary btn-lg" style={{ flexShrink: 0 }}>Subscribe 🎁</button>
        </form>
      )}
      <p style={{ opacity: 0.7, fontSize: 12, marginTop: 12 }}>No spam, unsubscribe any time. We respect your privacy.</p>
    </div>
  );
}

/* =========================================================
   HOME PAGE — assembles all sections
   ========================================================= */
export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      categoryApi.getCategories(),
      productApi.getProducts({ limit: 8, featured: true }),
    ]).then(([catRes, prodRes]) => {
      setCategories(catRes.data.categories || []);
      setProducts(prodRes.data.products || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ marginTop: '-48px' /* pull hero under category bar */ }}>
      <HeroBanner />

      <CategoryGrid categories={categories} />

      {/* Best Sellers */}
      <section className="section">
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="section-title">⭐ Best Sellers</h2>
            <p className="section-subtitle">Our most popular products this week</p>
          </div>
          <Link to="/products" className="btn btn-outline">View All →</Link>
        </div>
        <div className="products-grid">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : products.map((p) => <ProductCard key={p._id} product={p} />)
          }
        </div>
      </section>

      <OfferBanner />
      <WhyChooseUs />
      <Testimonials />
      <NewsletterSignup />
    </div>
  );
}
