import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reviewApi } from '../../api/reviewApi';
import CustomerLayoutWrapper from '../../components/layout/CustomerLayoutWrapper';
import { LoadingSpinner, EmptyState, ConfirmModal } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';
import { FiEdit, FiTrash2, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';

export default function MyReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Review Modal States
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editTitle, setEditTitle] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editImages, setEditImages] = useState([]);
  const [editLoading, setEditLoading] = useState(false);

  // Delete Confirm State
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchReviews = () => {
    setLoading(true);
    reviewApi.getMyReviews()
      .then((res) => setReviews(res.data.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const getStatusBadge = (review) => {
    if (review.isRejected) {
      return { text: 'Rejected', bg: '#fee2e2', color: '#ef4444', icon: FiXCircle };
    }
    if (review.isApproved) {
      return { text: 'Approved', bg: '#dcfce7', color: '#16a34a', icon: FiCheckCircle };
    }
    return { text: 'Pending Approval', bg: '#fef3c7', color: '#d97706', icon: FiClock };
  };

  const handleEditClick = (review) => {
    setEditingReview(review);
    setEditRating(review.rating);
    setEditTitle(review.title || '');
    setEditComment(review.comment || '');
    setEditImages([]);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editComment.trim()) {
      toast.error('Title and comment are required');
      return;
    }
    setEditLoading(true);
    try {
      const fd = new FormData();
      fd.append('rating', editRating);
      fd.append('title', editTitle);
      fd.append('comment', editComment);
      editImages.forEach(file => {
        fd.append('images', file);
      });

      await reviewApi.updateReview(editingReview._id, fd);
      toast.success('Review updated successfully! ⭐');
      setEditingReview(null);
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to update review');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClick = (id) => {
    setDeletingReviewId(id);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await reviewApi.deleteReview(deletingReviewId);
      toast.success('Review deleted.');
      setDeletingReviewId(null);
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to delete review');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <CustomerLayoutWrapper title="⭐ My Reviews">
      {loading ? (
        <LoadingSpinner />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="⭐"
          title="No reviews submitted yet"
          description="Share your experiences with items you have purchased from us!"
          action={
            <Link to="/my-orders" className="btn btn-primary">
              View My Orders 📦
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reviews.map((review) => {
            const status = getStatusBadge(review);
            const StatusIcon = status.icon;
            return (
              <div
                key={review._id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', mdWrap: 'nowrap' }}>
                  {/* Product Thumbnail (clickable) */}
                  {review.product && (
                    <Link to={`/products/${review.product.slug}`} style={{ flexShrink: 0 }}>
                      <img
                        src={review.product.images?.[0]?.url || 'https://via.placeholder.com/64x64?text=Product'}
                        alt={review.product.name}
                        style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #f1f5f9' }}
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/64x64?text=P'; }}
                      />
                    </Link>
                  )}

                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                      {/* Product Name (clickable) */}
                      {review.product && (
                        <Link to={`/products/${review.product.slug}`} style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-text)', textDecoration: 'none' }}>
                          {review.product.name}
                        </Link>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {new Date(review.createdAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      {/* Star Display */}
                      <div style={{ display: 'flex', gap: 2 }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} style={{ color: i < review.rating ? '#f59e0b' : '#cbd5e1', fontSize: 14 }}>
                            ★
                          </span>
                        ))}
                      </div>

                      {/* Status Badge */}
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 700,
                        background: status.bg,
                        color: status.color,
                      }}>
                        <StatusIcon size={10} /> {status.text}
                      </span>
                    </div>

                    <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{review.title || 'Product Review'}</h4>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {review.comment}
                    </p>

                    {review.images && review.images.length > 0 && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {review.images.map((img, index) => (
                          <img
                            key={index}
                            src={img.url}
                            alt="Review preview"
                            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }}
                          />
                        ))}
                      </div>
                    )}

                    {review.adminReply && (
                      <div style={{
                        background: 'var(--color-primary-light)',
                        borderLeft: '3px solid var(--color-primary)',
                        padding: '10px 14px',
                        borderRadius: '0 8px 8px 0',
                        marginTop: 12,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 2 }}>
                          Store Response:
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--color-text)', margin: 0 }}>
                          {review.adminReply}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions buttons */}
                  <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
                    <button onClick={() => handleEditClick(review)} className="btn btn-ghost btn-sm" style={{ padding: 8 }}>
                      <FiEdit /> Edit
                    </button>
                    <button onClick={() => handleDeleteClick(review._id)} className="btn btn-ghost btn-sm danger" style={{ padding: 8, color: 'var(--color-error)' }}>
                      <FiTrash2 /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Review Modal */}
      <ConfirmModal
        isOpen={!!editingReview}
        onClose={() => setEditingReview(null)}
        title="Edit My Review"
        confirmText="Save Changes"
        onConfirm={handleEditSubmit}
        loading={editLoading}
        message={
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">Rating</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setEditRating(star)}
                    style={{ fontSize: 24, color: star <= editRating ? '#f59e0b' : '#cbd5e1', cursor: 'pointer' }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Review Title</label>
              <input
                className="form-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Review Comment</label>
              <textarea
                className="form-input"
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Add More Images (optional)</label>
              <input
                type="file"
                className="form-input"
                multiple
                accept="image/*"
                onChange={(e) => setEditImages(Array.from(e.target.files))}
              />
              {editImages.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  {editImages.length} images selected
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* Delete Review ConfirmModal */}
      <ConfirmModal
        isOpen={!!deletingReviewId}
        onClose={() => setDeletingReviewId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Review"
        confirmText="Yes, Delete Review"
        danger
        loading={deleteLoading}
        message="Are you sure you want to permanently delete this review? This action cannot be undone."
      />
    </CustomerLayoutWrapper>
  );
}
