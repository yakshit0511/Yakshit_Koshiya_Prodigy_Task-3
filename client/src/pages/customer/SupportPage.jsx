import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supportApi } from '../../api/supportApi';
import { orderApi } from '../../api/orderApi';
import CustomerLayoutWrapper from '../../components/layout/CustomerLayoutWrapper';
import { LoadingSpinner, EmptyState, StatusBadge } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';
import { FiPlus, FiPaperclip, FiArrowRight, FiFileText } from 'react-icons/fi';

export default function SupportPage() {
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('General Inquiry');
  const [priority, setPriority] = useState('Medium');
  const [relatedOrderId, setRelatedOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchTicketsAndOrders = async () => {
    try {
      const ticketRes = await supportApi.getMyTickets();
      setTickets(ticketRes.data.tickets || []);
      
      const orderRes = await orderApi.getMyOrders();
      setOrders(orderRes.data.orders || []);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketsAndOrders();
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + attachments.length > 3) {
      toast.error('You can upload a maximum of 3 attachments');
      return;
    }
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (idx) => {
    setAttachments(attachments.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setSubmitLoading(true);

    try {
      const fd = new FormData();
      fd.append('subject', subject.trim());
      fd.append('category', category);
      fd.append('priority', priority);
      fd.append('message', message.trim());
      if (relatedOrderId) {
        fd.append('relatedOrderId', relatedOrderId);
      }
      attachments.forEach((file) => {
        fd.append('attachments', file);
      });

      await supportApi.createTicket(fd);
      toast.success('Ticket submitted successfully! 🎟️');
      
      // Reset form
      setSubject('');
      setCategory('General Inquiry');
      setPriority('Medium');
      setRelatedOrderId('');
      setMessage('');
      setAttachments([]);

      fetchTicketsAndOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to submit support ticket');
    } finally {
      setSubmitLoading(false);
    }
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case 'Low': return { bg: '#f3f4f6', color: '#4b5563' };
      case 'Medium': return { bg: '#dbeafe', color: '#1d4ed8' };
      case 'High': return { bg: '#ffedd5', color: '#ea580c' };
      case 'Urgent': return { bg: '#fee2e2', color: '#dc2626' };
      default: return { bg: '#f3f4f6', color: '#4b5563' };
    }
  };

  return (
    <CustomerLayoutWrapper title="💬 Support Tickets">
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', lgDirection: 'row', gridTemplateColumns: '1fr 1.2fr', gap: 32 }}>
          {/* Left Side: Create Ticket Form */}
          <div className="card" style={{ padding: 24, alignSelf: 'flex-start' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Create New Ticket</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Subject <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  className="form-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Summarise your issue briefly..."
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-input form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Order Issue">Order Issue</option>
                    <option value="Payment Issue">Payment Issue</option>
                    <option value="Product Issue">Product Issue</option>
                    <option value="Delivery Issue">Delivery Issue</option>
                    <option value="Return Request">Return Request</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-input form-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Related Order (if any) */}
              <div className="form-group">
                <label className="form-label">Related Order (optional)</label>
                <select
                  className="form-input form-select"
                  value={relatedOrderId}
                  onChange={(e) => setRelatedOrderId(e.target.value)}
                >
                  <option value="">None / Not Applicable</option>
                  {orders.map((o) => (
                    <option key={o._id} value={o._id}>
                      Order #{o.orderNumber || o._id.slice(-8).toUpperCase()} (₹{o.totalAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Message / Description <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide all details, order details, issue description..."
                  required
                />
              </div>

              {/* Attachments */}
              <div className="form-group">
                <label className="form-label">Attach Files (optional, max 3)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => document.getElementById('ticket-files').click()}
                    className="btn btn-outline btn-sm"
                    disabled={attachments.length >= 3}
                  >
                    <FiPaperclip /> Attach Files
                  </button>
                  <input
                    type="file"
                    id="ticket-files"
                    style={{ display: 'none' }}
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                  />
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Images & PDFs only (Max 5MB)
                  </span>
                </div>

                {attachments.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {attachments.map((file, idx) => (
                      <div key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#f1f5f9', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12 }}>
                        <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                        <button type="button" onClick={() => removeAttachment(idx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" className="btn btn-primary btn-full" disabled={submitLoading}>
                {submitLoading ? 'Submitting ticket...' : 'Submit Ticket 🎟️'}
              </button>
            </form>
          </div>

          {/* Right Side: My Tickets List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 -4px 0' }}>My Support History</h2>
            {tickets.length === 0 ? (
              <EmptyState
                icon="💬"
                title="No support tickets found"
                description="Your submitted tickets will appear here for review."
              />
            ) : (
              tickets.map((t) => {
                const priorityColor = getPriorityColor(t.priority);
                return (
                  <div
                    key={t._id}
                    className="card"
                    style={{
                      padding: 20,
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 15 }}>Ticket #{t.ticketNumber || t._id.slice(-6).toUpperCase()}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: priorityColor.bg, color: priorityColor.color }}>
                          {t.priority}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>
                    </div>

                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                      {t.subject}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      <div>
                        Category: <strong>{t.category}</strong>
                        {t.relatedOrder && (
                          <span style={{ marginLeft: 8 }}>
                            • Order: <strong>#{t.relatedOrder?.orderNumber || t.relatedOrder?._id?.slice(-8).toUpperCase()}</strong>
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        Updated: {new Date(t.updatedAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <Link to={`/support/${t._id}`} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        View Conversation <FiArrowRight />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </CustomerLayoutWrapper>
  );
}
