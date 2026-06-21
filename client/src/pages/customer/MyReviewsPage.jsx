import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reviewApi } from '../../api/reviewApi';
import { Breadcrumb, LoadingSpinner, EmptyState, StarRating } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = () => {
    reviewApi.getMyReviews()
      .then((res) => setReviews(res.data.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await reviewApi.deleteReview(id);
      toast.success('Review deleted');
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to delete review');
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'My Reviews' }]} />

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>⭐ My Reviews</h1>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="⭐"
          title="No reviews submitted yet"
          description="Purchase products and share your experience with others!"
          action={
            <Link to="/my-orders" className="btn btn-primary">
              View My Orders 📦
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reviews.map((review) => (
            <div
              key={review._id}
              style={{
                background: 'white',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                padding: 20,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <StarRating rating={review.rating} size={16} />
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      • {new Date(review.createdAt).toLocaleDateString('en-IN')}
                    </span>
                    {!review.isApproved && (
                      <span style={{ background: '#fef3c7', color: '#d97706', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                        Pending Approval
                      </span>
                    )}
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{review.title || 'Product Review'}</h3>
                  <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{review.comment}</p>
                  
                  {review.product && (
                    <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
                      Product: <Link to={`/products/${review.product.slug}`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                        {review.product.name}
                      </Link>
                    </div>
                  )}

                  {review.adminReply && (
                    <div style={{ background: 'var(--color-primary-light)', borderLeft: '3px solid var(--color-primary)', padding: '10px 14px', borderRadius: '0 8px 8px 0', marginTop: 12 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>Store Reply:</p>
                      <p style={{ fontSize: 13, color: 'var(--color-text)' }}>{review.adminReply}</p>
                    </div>
                  )}
                </div>

                <button onClick={() => handleDelete(review._id)} className="btn btn-ghost btn-sm danger" style={{ padding: '6px 12px' }}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
