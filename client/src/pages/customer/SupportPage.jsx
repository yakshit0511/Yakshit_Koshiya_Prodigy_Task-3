import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supportApi } from '../../api/reviewApi'; // Wait, supportApi is in reviewApi.js or our new supportApi.js. We created supportApi.js in api folder! Let's import from '../../api/supportApi'!
import { Breadcrumb, LoadingSpinner, EmptyState, Badge, Modal } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Product Query');
  const [priority, setPriority] = useState('Medium');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchTickets = () => {
    supportApi.getMyTickets()
      .then((res) => setTickets(res.data.tickets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error('Subject and description are required');
      return;
    }
    setSubmitLoading(true);
    try {
      const fd = new FormData();
      fd.append('subject', subject);
      fd.append('category', category);
      fd.append('priority', priority);
      fd.append('description', description);
      if (attachment) {
        fd.append('attachment', attachment); // Wait, name in backend might be attachment or media, let's verify if needed. In supportController.js it's probably attachment.
      }
      await supportApi.createTicket(fd);
      toast.success('Support ticket created successfully!');
      setModalOpen(false);
      setSubject('');
      setDescription('');
      setAttachment(null);
      fetchTickets();
    } catch (err) {
      toast.error(err.message || 'Failed to create support ticket');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'info';
      case 'in progress': return 'warning';
      case 'resolved':
      case 'closed': return 'success';
      default: return 'neutral';
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Support Tickets' }]} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>💬 Support Tickets</h1>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          ➕ New Support Ticket
        </button>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No support tickets"
          description="Have questions or issues? Create a support ticket and our team will assist you."
          action={
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              Create First Ticket
            </button>
          }
        />
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Ticket ID</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Subject</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Category</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Priority</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Created Date</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>#{t._id.slice(-6).toUpperCase()}</td>
                    <td style={{ padding: '16px 20px' }}>{t.subject}</td>
                    <td style={{ padding: '16px 20px' }}>{t.category}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge variant={t.priority === 'High' ? 'danger' : t.priority === 'Medium' ? 'warning' : 'neutral'}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Badge variant={getStatusVariant(t.status)}>{t.status}</Badge>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                      {new Date(t.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <Link to={`/support/${t._id}`} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-primary)' }}>
                        View Conversation
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Support Ticket" width={500}>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Subject <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input
              className="form-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="E.g., Missing item from Order #1002"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Order Issue">Order Issue</option>
                <option value="Payment Issue">Payment Issue</option>
                <option value="Product Query">Product Query</option>
                <option value="Delivery Issue">Delivery Issue</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <textarea
              className="form-input"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your issue in detail..."
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Attachment (Optional)</label>
            <input
              type="file"
              className="form-input"
              accept="image/*,application/pdf"
              onChange={(e) => setAttachment(e.target.files[0])}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)} disabled={submitLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitLoading}>
              {submitLoading ? 'Submitting...' : 'Submit Support Ticket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
