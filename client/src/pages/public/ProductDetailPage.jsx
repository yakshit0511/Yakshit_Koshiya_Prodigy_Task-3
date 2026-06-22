/**
 * pages/public/ProductDetailPage.jsx
 * Full product detail with image gallery, info, reviews tabs.
 */
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiShare2, FiMinus, FiPlus, FiStar, FiThumbsUp, FiCheck } from 'react-icons/fi';
import { StarRating, Breadcrumb, LoadingSpinner, EmptyState, SEO } from '../../components/common/index.jsx';
import ProductCard from '../../components/product/ProductCard';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { productApi } from '../../api/productApi';
import { reviewApi } from '../../api/reviewApi';
import toast from 'react-hot-toast';
import RecentlyViewed, { trackProductView } from '../../components/product/RecentlyViewed';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartItems } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { isAuthenticated, user } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [tab, setTab] = useState('description');
  // Review form
  const [reviewData, setReviewData] = useState({ rating: 0, title: '', comment: '' });
  const [reviewLoading, setReviewLoading] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  useEffect(() => {
    setLoading(true);
    productApi.getProductBySlug(slug)
      .then((r) => {
        const p = r.data.product;
        setProduct(p);
        // Fetch related & reviews
        if (p) {
          trackProductView(p);
          productApi.getProducts({ category: p.category?._id, limit: 6, exclude: p._id })
            .then((rr) => setRelated(rr.data.products?.filter(pr => pr._id !== p._id) || []));
          setReviewsLoading(true);
          reviewApi.getProductReviews(p._id)
            .then((rv) => setReviews(rv.data.reviews || []))
            .finally(() => setReviewsLoading(false));
        }
      })
      .catch(() => navigate('/404'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingSpinner fullPage />;
  if (!product) return <EmptyState icon="😕" title="Product not found" />;

  const { name, images, price, discountPrice, discountPercent, stock, isInStock, ratings, numReviews, category, description, specifications, tags, sku } = product;
  const effectivePrice = discountPrice && discountPrice < price ? discountPrice : price;
  const hasDiscount = discountPrice && discountPrice < price;
  const inCart = cartItems.some((i) => (i.product?._id || i.product) === product._id);
  const inWishlist = isInWishlist(product._id);

  const handleAdd = async () => {
    if (!isAuthenticated) { navigate('/login'); return; }
    if (inCart) { navigate('/cart'); return; }
    setAdding(true);
    await addToCart(product._id, qty, name);
    setAdding(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const submitReview = async () => {
    if (!reviewData.rating) { toast.error('Please select a star rating'); return; }
    if (!reviewData.comment) { toast.error('Please write a review comment'); return; }
    setReviewLoading(true);
    try {
      const fd = new FormData();
      fd.append('product', product._id);
      fd.append('rating', reviewData.rating);
      fd.append('title', reviewData.title);
      fd.append('comment', reviewData.comment);
      await reviewApi.createReview(fd);
      toast.success('Review submitted for approval!');
      setReviewData({ rating: 0, title: '', comment: '' });
      // Refresh reviews
      reviewApi.getProductReviews(product._id).then((rv) => setReviews(rv.data.reviews || []));
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": name,
    "image": images?.map((i) => i.url) || [],
    "description": description,
    "sku": sku || undefined,
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "INR",
      "price": effectivePrice,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": isInStock && stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    },
    "aggregateRating": ratings ? {
      "@type": "AggregateRating",
      "ratingValue": ratings,
      "reviewCount": numReviews || 1
    } : undefined
  };

  return (
    <div>
      <SEO 
        title={name}
        description={description || `${name} - Shop at Local Store.`}
        ogImage={images?.[0]?.url}
        ogType="product"
        keywords={tags || [name, category?.name]}
        schemaJson={productSchema}
      />
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: category?.name || 'Products', href: `/category/${category?.slug}` },
        { label: name },
      ]} />

      {/* Main product section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 48 }}>
        {/* Image Gallery */}
        <div>
          <div style={{ background: '#f8fafc', borderRadius: 'var(--radius-xl)', overflow: 'hidden', marginBottom: 12, aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={images?.[activeImage]?.url || `https://via.placeholder.com/500x375?text=${encodeURIComponent(name)}`}
              alt={name}
              style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform 0.3s' }}
              onError={(e) => { e.target.src = `https://via.placeholder.com/500x375?text=Product`; }}
            />
          </div>
          {/* Thumbnails */}
          {images && images.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {images.map((img, i) => (
                <img key={i} src={img.url} alt="" onClick={() => setActiveImage(i)}
                  style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: `2px solid ${i === activeImage ? 'var(--color-primary)' : 'var(--color-border)'}`, flexShrink: 0 }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          {category && <Link to={`/category/${category.slug}`} style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: 1 }}>{category.name}</Link>}
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 12px', lineHeight: 1.25 }}>{name}</h1>
          {sku && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 12 }}>SKU: {sku}</p>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <StarRating rating={ratings || 0} size={16} showNumber />
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>({numReviews || 0} reviews)</span>
          </div>

          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-primary)' }}>₹{effectivePrice?.toLocaleString('en-IN')}</span>
            {hasDiscount && (
              <>
                <span style={{ fontSize: 18, color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>₹{price?.toLocaleString('en-IN')}</span>
                <span style={{ background: '#dcfce7', color: 'var(--color-primary)', fontWeight: 700, padding: '2px 8px', borderRadius: 20, fontSize: 13 }}>{Math.round(discountPercent)}% OFF</span>
              </>
            )}
          </div>
          {hasDiscount && <p style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600, marginBottom: 16 }}>You save ₹{(price - effectivePrice).toLocaleString('en-IN')}!</p>}

          {/* Stock status */}
          <div style={{ marginBottom: 20 }}>
            {!isInStock || stock === 0 ? (
              <span style={{ color: 'var(--color-error)', fontWeight: 700, fontSize: 14 }}>❌ Out of Stock</span>
            ) : stock <= 5 ? (
              <span style={{ color: '#d97706', fontWeight: 700, fontSize: 14 }}>⚠️ Only {stock} left in stock!</span>
            ) : (
              <span style={{ color: 'var(--color-success)', fontWeight: 700, fontSize: 14 }}>✅ In Stock ({stock} available)</span>
            )}
          </div>

          {/* Quantity + buttons */}
          {isInStock && stock > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Qty:</span>
              <div style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--color-border)', borderRadius: 8 }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}><FiMinus size={14} /></button>
                <span style={{ padding: '8px 16px', fontWeight: 700, minWidth: 40, textAlign: 'center' }}>{qty}</span>
                <button onClick={() => setQty(Math.min(stock, qty + 1))} style={{ padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}><FiPlus size={14} /></button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button className={`btn btn-xl ${inCart ? 'btn-outline' : 'btn-primary'}`} style={{ flex: 1 }} onClick={handleAdd} disabled={adding || (!isInStock || stock === 0)}>
              {adding ? 'Adding…' : inCart ? '✓ Go to Cart' : !isInStock || stock === 0 ? '🔔 Notify Me' : '🛒 Add to Cart'}
            </button>
            <button onClick={() => { if (!isAuthenticated) { navigate('/login'); return; } toggleWishlist(product._id, name); }} className="btn btn-ghost btn-xl" style={{ borderColor: inWishlist ? 'var(--color-error)' : undefined, color: inWishlist ? 'var(--color-error)' : undefined }}>
              <FiHeart size={18} fill={inWishlist ? 'currentColor' : 'none'} />
            </button>
            <button onClick={handleShare} className="btn btn-ghost btn-xl"><FiShare2 size={18} /></button>
          </div>

          {/* Delivery info */}
          <div style={{ background: 'var(--color-bg)', borderRadius: 10, padding: 16, fontSize: 13 }}>
            {[
              { icon: '🚚', text: 'Estimated delivery: 2-3 business days' },
              { icon: '💝', text: 'Free delivery on orders above ₹500' },
              { icon: '💵', text: 'Cash on Delivery available' },
              { icon: '↩️', text: '7-day easy returns' },
            ].map((d) => (
              <div key={d.text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', color: 'var(--color-text-secondary)' }}>
                <span>{d.icon}</span><span>{d.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '2px solid var(--color-border)', marginBottom: 24 }}>
        {['description', 'specifications', 'reviews'].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '12px 24px', background: 'none', border: 'none', cursor: 'pointer',
            fontWeight: tab === t ? 700 : 400, fontSize: 15,
            borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: tab === t ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            textTransform: 'capitalize', marginBottom: -2,
          }}>{t} {t === 'reviews' && `(${numReviews || 0})`}</button>
        ))}
      </div>

      {tab === 'description' && (
        <div style={{ lineHeight: 1.8, color: 'var(--color-text-secondary)', fontSize: 15, maxWidth: 700 }}>
          {description || 'No description available.'}
          {tags?.length > 0 && (
            <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {tags.map((tag) => <span key={tag} style={{ background: 'var(--color-border)', padding: '4px 12px', borderRadius: 20, fontSize: 12, color: 'var(--color-text-secondary)' }}>#{tag}</span>)}
            </div>
          )}
        </div>
      )}

      {tab === 'specifications' && (
        <div style={{ maxWidth: 500 }}>
          {specifications && Object.keys(specifications).length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {Object.entries(specifications).map(([k, v]) => (
                  <tr key={k} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 0', fontWeight: 600, fontSize: 14, width: '40%', color: 'var(--color-text-secondary)' }}>{k}</td>
                    <td style={{ padding: '10px 0', fontSize: 14 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: 'var(--color-text-muted)' }}>No specifications available.</p>}
        </div>
      )}

      {tab === 'reviews' && (
        <div>
          {reviewsLoading ? <LoadingSpinner /> : reviews.length === 0 ? (
            <EmptyState icon="⭐" title="No reviews yet" description="Be the first to review this product!" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
              {reviews.map((r) => (
                <div key={r._id} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--color-border)', padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{r.user?.name?.[0] || 'U'}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.user?.name || 'Customer'}</div>
                        {r.verifiedPurchase && <span style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}><FiCheck size={10} /> Verified Purchase</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{new Date(r.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  <StarRating rating={r.rating} size={14} />
                  {r.title && <p style={{ fontWeight: 700, marginTop: 8, marginBottom: 4 }}>{r.title}</p>}
                  <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{r.comment}</p>
                  {r.adminReply && (
                    <div style={{ background: 'var(--color-primary-light)', borderLeft: '3px solid var(--color-primary)', padding: '10px 14px', borderRadius: '0 8px 8px 0', marginTop: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>Reply from Store:</p>
                      <p style={{ fontSize: 13, color: 'var(--color-text)' }}>{r.adminReply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Review form */}
          {isAuthenticated && (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--color-border)', padding: 24, maxWidth: 600 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Write a Review</h3>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 8 }}>Your Rating <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1,2,3,4,5].map((s) => (
                    <span key={s} style={{ fontSize: 30, cursor: 'pointer', color: s <= (hoveredStar || reviewData.rating) ? '#f59e0b' : '#d1d5db', transition: 'color 0.1s' }}
                      onClick={() => setReviewData(d => ({ ...d, rating: s }))}
                      onMouseEnter={() => setHoveredStar(s)}
                      onMouseLeave={() => setHoveredStar(0)}
                    >★</span>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" placeholder="Summarize your review" value={reviewData.title} onChange={(e) => setReviewData(d => ({ ...d, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Review <span className="required">*</span></label>
                <textarea className="form-input" rows={4} placeholder="Share your experience with this product..." value={reviewData.comment} onChange={(e) => setReviewData(d => ({ ...d, comment: e.target.value }))} />
              </div>
              <button className="btn btn-primary" onClick={submitReview} disabled={reviewLoading}>
                {reviewLoading ? 'Submitting…' : 'Submit Review ⭐'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Related products */}
      {related.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>🛍️ You May Also Like</h2>
          <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 8 }}>
            {related.slice(0, 6).map((p) => (
              <div key={p._id} style={{ width: 220, flexShrink: 0 }}><ProductCard product={p} /></div>
            ))}
          </div>
        </div>
      )}
      
      {product && <RecentlyViewed excludeId={product._id} />}
    </div>
  );
}
