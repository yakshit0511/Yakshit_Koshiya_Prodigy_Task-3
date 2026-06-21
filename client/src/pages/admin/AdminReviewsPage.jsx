import { useState, useEffect } from 'react';
import { reviewApi } from '../../api/reviewApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { LoadingSpinner, EmptyState, Badge, StarRating, Modal } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);

  const fetchReviews = () => {
    setLoading(true);
    reviewApi.adminGetReviews()
      .then((res) => setReviews(res.data.reviews || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleApprove = async (id, isApproved) => {
    try {
      await reviewApi.adminApproveReview(id, isApproved);
      toast.success(isApproved ? 'Review approved! 👍' : 'Review status updated');
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to update review status');
    }
  };

  const handleOpenReplyModal = (review) => {
    setSelectedReview(review);
    setReplyText(review.adminReply || '');
    setReplyModalOpen(true);
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      await reviewApi.adminReplyReview(selectedReview._id, replyText);
      toast.success('Admin reply saved!');
      setReplyModalOpen(false);
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Failed to save admin reply');
    } finally {
      setReplyLoading(false);
    }
  };

  return (
    <AdminLayoutWrapper title="Manage Product Reviews">
      {loading ? (
        <LoadingSpinner fullPage />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="⭐"
          title="No reviews found"
          description="Customer product reviews will appear here for approval."
        />
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Product</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Customer</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Rating</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Comment</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>{r.product?.name || 'Deleted Product'}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700 }}>{r.user?.name || 'Customer'}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{r.user?.email}</div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <StarRating rating={r.rating} size={14} />
                    </td>
                    <td style={{ padding: '16px 20px', maxWidth: 300 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{r.title}</div>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                        {r.comment}
                      </p>
                      {r.adminReply && (
                        <div style={{ background: '#f1f5f9', borderLeft: '3px solid #64748b', padding: '6px 10px', marginTop: 8, fontSize: 12, borderRadius: '0 6px 6px 0' }}>
                          <strong>Your Reply:</strong> {r.adminReply}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge variant={r.isApproved ? 'success' : 'warning'}>
                        {r.isApproved ? 'Approved' : 'Pending'}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {!r.isApproved ? (
                          <button className="btn btn-outline btn-sm success" onClick={() => handleApprove(r._id, true)}>
                            Approve
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-sm danger" onClick={() => handleApprove(r._id, false)}>
                            Unapprove
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => handleOpenReplyModal(r)}>
                          💬 Reply
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      <Modal isOpen={replyModalOpen} onClose={() => setReplyModalOpen(false)} title="Reply to Customer Review" width={450}>
        <form onSubmit={handleSendReply}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20, fontSize: 14 }}>
            <strong>{selectedReview?.user?.name || 'Customer'}:</strong> "{selectedReview?.comment}"
          </div>
          <div className="form-group">
            <label className="form-label">Store Reply</label>
            <textarea
              className="form-input"
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a friendly reply to the customer's review..."
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setReplyModalOpen(false)} disabled={replyLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={replyLoading || !replyText.trim()}>
              {replyLoading ? 'Saving...' : 'Save Reply'}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayoutWrapper>
  );
}
