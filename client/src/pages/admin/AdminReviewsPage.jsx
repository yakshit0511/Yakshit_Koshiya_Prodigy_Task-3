import { useState, useEffect } from 'react';
import { reviewApi } from '../../api/reviewApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import DataTable from '../../components/common/DataTable';
import StatusBadge from '../../components/common/StatusBadge';
import AdminModal from '../../components/common/AdminModal';
import { LoadingSpinner } from '../../components/common/index.jsx';
import { FiCheckCircle, FiXCircle, FiMessageSquare, FiTrash2, FiStar, FiShoppingBag, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // Tab State
  const [activeTab, setActiveTab] = useState('pending'); // pending | approved | all

  // Reply Modal States
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      // 1. Fetch reviews based on active tab
      const params = { limit: 1000 };
      if (activeTab === 'pending') params.isApproved = 'false';
      if (activeTab === 'approved') params.isApproved = 'true';

      const res = await reviewApi.adminGetReviews(params);
      setReviews(res.data.reviews || []);

      // 2. Fetch pending count for the badge
      const countRes = await reviewApi.adminGetReviews({ isApproved: 'false', limit: 1 });
      setPendingCount(countRes.data.totalCount || 0);
    } catch (err) {
      toast.error('Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [activeTab]);

  const handleApprove = async (id, isApproved) => {
    try {
      await reviewApi.adminApproveReview(id, isApproved);
      toast.success(isApproved ? 'Review approved! 👍' : 'Review unapproved.');
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update review status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review? This action cannot be undone.')) return;
    try {
      await reviewApi.deleteReview(id);
      toast.success('Review deleted successfully.');
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete review');
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
      await reviewApi.adminReplyReview(selectedReview._id, replyText.trim());
      toast.success('Admin reply saved!');
      setReplyModalOpen(false);
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save admin reply');
    } finally {
      setReplyLoading(false);
    }
  };

  // Bulk Approve Reviews
  const handleBulkApprove = async (selectedIds, resetSelection) => {
    if (!window.confirm(`Are you sure you want to approve the ${selectedIds.length} selected reviews?`)) return;
    try {
      await Promise.all(selectedIds.map(id => reviewApi.adminApproveReview(id, true)));
      toast.success('Selected reviews approved successfully!');
      resetSelection();
      fetchReviews();
    } catch (err) {
      toast.error('Failed to approve all selected reviews.');
    }
  };

  // Custom stars rendering
  const renderStars = (rating) => {
    return (
      <div style={{ display: 'flex', color: '#f59e0b', fontSize: 13, gap: 2 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <FiStar key={i} fill={i < rating ? '#f59e0b' : 'none'} />
        ))}
      </div>
    );
  };

  // Define columns for DataTable
  const columns = [
    {
      header: 'Product',
      key: 'product.name',
      render: (val, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 200 }}>
          {row.product?.images?.[0]?.url ? (
            <img 
              src={row.product.images[0].url} 
              alt={val} 
              style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: '1px solid #e2e8f0' }} 
            />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
              <FiShoppingBag size={16} />
            </div>
          )}
          <span style={{ fontWeight: 600, fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {val || 'Deleted Product'}
          </span>
        </div>
      ),
    },
    {
      header: 'Reviewer',
      key: 'user.name',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{val || 'Guest'}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{row.user?.email || 'N/A'}</div>
        </div>
      ),
    },
    {
      header: 'Rating',
      key: 'rating',
      render: (val) => renderStars(val),
    },
    {
      header: 'Review Details',
      key: 'comment',
      render: (val, row) => (
        <div style={{ maxWidth: 300 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{row.title}</div>
          <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.4 }}>"{val}"</p>
          
          {row.isVerifiedPurchase && (
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 4, 
              color: '#15803d', 
              background: '#f0fdf4', 
              fontSize: 10, 
              padding: '2px 6px', 
              borderRadius: 4, 
              marginTop: 6, 
              fontWeight: 700 
            }}>
              <FiCheckCircle size={10} /> Verified Purchase
            </span>
          )}

          {row.adminReply && (
            <div style={{ 
              background: '#f8fafc', 
              borderLeft: '3px solid var(--color-primary)', 
              padding: '6px 10px', 
              marginTop: 8, 
              fontSize: 11, 
              borderRadius: '0 6px 6px 0', 
              color: '#334155' 
            }}>
              <strong>Reply:</strong> {row.adminReply}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Submitted',
      key: 'createdAt',
      render: (val) => (
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          {new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      header: 'Status',
      key: 'isApproved',
      render: (val) => (
        <StatusBadge status={val ? 'active' : 'inactive'} />
      ),
    },
    {
      header: 'Actions',
      key: '_id',
      sortable: false,
      render: (val, row) => (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {!row.isApproved ? (
            <button 
              className="btn btn-sm" 
              onClick={() => handleApprove(val, true)}
              style={{ padding: '4px 8px', fontSize: 11, background: '#dcfce7', color: '#15803d', border: 'none' }}
            >
              Approve
            </button>
          ) : (
            <button 
              className="btn btn-sm btn-ghost" 
              onClick={() => handleApprove(val, false)}
              style={{ padding: '4px 8px', fontSize: 11, background: '#fee2e2', color: '#b91c1c' }}
            >
              Reject
            </button>
          )}
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={() => handleOpenReplyModal(row)}
            style={{ padding: '4px 8px', fontSize: 11, border: '1px solid var(--color-border)' }}
          >
            <FiMessageSquare size={12} /> Reply
          </button>
          <button 
            className="btn btn-ghost btn-sm danger" 
            onClick={() => handleDelete(val)}
            style={{ padding: '4px 8px', fontSize: 11 }}
          >
            <FiTrash2 size={12} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayoutWrapper title="Manage Product Reviews">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, margin: 0 }}>
          Read and reply to user product reviews. Approve them to make them visible in product listings.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 24 }}>
        <button
          className={`btn btn-sm ${activeTab === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('pending')}
          style={{ padding: '10px 20px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          Pending Reviews
          {pendingCount > 0 && (
            <span style={{ 
              background: '#ef4444', 
              color: 'white', 
              fontSize: 10, 
              fontWeight: 800, 
              padding: '2px 6px', 
              borderRadius: 10 
            }}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'approved' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('approved')}
          style={{ padding: '10px 20px', borderRadius: '8px 8px 0 0' }}
        >
          Approved Reviews
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('all')}
          style={{ padding: '10px 20px', borderRadius: '8px 8px 0 0' }}
        >
          All Reviews
        </button>
      </div>

      {/* Reviews Table */}
      <DataTable
        columns={columns}
        data={reviews}
        loading={loading}
        searchPlaceholder="Search in review comment or user name..."
        searchKey={['comment', 'title', 'user.name', 'product.name']}
        idKey="_id"
        onSelectionChange={() => {}}
        bulkActions={
          activeTab === 'pending' 
            ? (ids, reset) => (
                <button 
                  className="btn btn-sm" 
                  onClick={() => handleBulkApprove(ids, reset)}
                  style={{ background: '#16a34a', color: 'white', border: 'none', fontWeight: 600 }}
                >
                  Approve Selected ({ids.length})
                </button>
              )
            : null
        }
        exportFilename="product_reviews_export.csv"
      />

      {/* Reply Modal */}
      <AdminModal
        isOpen={replyModalOpen}
        onClose={() => setReplyModalOpen(false)}
        title="💬 Add Admin Reply"
        width={480}
      >
        <form onSubmit={handleSendReply}>
          <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 20, border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <strong>{selectedReview?.user?.name || 'Customer'}</strong>
              {renderStars(selectedReview?.rating)}
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, margin: '4px 0' }}>"{selectedReview?.title}"</div>
            <p style={{ margin: 0, fontSize: 13, color: '#475569', fontStyle: 'italic' }}>
              "{selectedReview?.comment}"
            </p>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label" style={{ fontWeight: 600 }}>Store Reply Message</label>
            <textarea
              className="form-input"
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your professional reply to the customer review..."
              required
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setReplyModalOpen(false)} disabled={replyLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={replyLoading || !replyText.trim()}>
              {replyLoading ? 'Submitting...' : 'Submit Reply'}
            </button>
          </div>
        </form>
      </AdminModal>
    </AdminLayoutWrapper>
  );
}
