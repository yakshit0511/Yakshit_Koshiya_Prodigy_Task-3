import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supportApi } from '../../api/supportApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { Breadcrumb, LoadingSpinner, EmptyState, Badge } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

export default function AdminSupportTicketPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchTicket = () => {
    setLoading(true);
    supportApi.adminGetTicket(ticketId)
      .then((res) => {
        const t = res.data.ticket;
        setTicket(t);
        if (t) setStatus(t.status);
      }).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplyLoading(true);
    try {
      await supportApi.adminReply(ticketId, replyText);
      toast.success('Reply message sent!');
      setReplyText('');
      // Refresh conversation
      supportApi.adminGetTicket(ticketId).then((res) => setTicket(res.data.ticket));
    } catch (err) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus);
    setStatusLoading(true);
    try {
      await supportApi.adminUpdateStatus(ticketId, newStatus);
      toast.success('Ticket status updated!');
      fetchTicket();
    } catch (err) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setStatusLoading(false);
    }
  };

  if (loading) return <AdminLayoutWrapper title="Support Ticket"><LoadingSpinner fullPage /></AdminLayoutWrapper>;
  if (!ticket) return <AdminLayoutWrapper title="Support Ticket"><EmptyState icon="😕" title="Ticket not found" /></AdminLayoutWrapper>;

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
    <AdminLayoutWrapper title={`Ticket #${ticket._id.slice(-6).toUpperCase()}`}>
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Support Tickets', href: '/admin/support' },
          { label: 'Conversation' },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'flex-start' }}>
        {/* Messages / Chat timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#f8fafc', padding: 24, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 16, minHeight: 300, maxHeight: 500, overflowY: 'auto' }}>
            {/* Original message */}
            <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, alignSelf: 'flex-start', maxWidth: '75%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                CUSTOMER ({ticket.user?.name || 'User'}) • {new Date(ticket.createdAt).toLocaleString('en-IN')}
              </div>
              <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>{ticket.description}</p>
              {ticket.attachment?.url && (
                <div style={{ marginTop: 10 }}>
                  <a href={ticket.attachment.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                    📎 View Attachment
                  </a>
                </div>
              )}
            </div>

            {/* Replies timeline */}
            {ticket.messages?.map((msg) => {
              const isAdmin = msg.senderType === 'admin';
              return (
                <div
                  key={msg._id}
                  style={{
                    background: isAdmin ? 'var(--color-primary-light)' : 'white',
                    border: `1px solid ${isAdmin ? 'var(--color-primary-light)' : 'var(--color-border)'}`,
                    borderRadius: 12,
                    padding: 16,
                    alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: isAdmin ? 'var(--color-primary)' : 'var(--color-text-muted)', marginBottom: 4 }}>
                    {isAdmin ? 'YOUR REPLY (ADMIN)' : `CUSTOMER (${ticket.user?.name || 'User'})`} • {new Date(msg.createdAt).toLocaleString('en-IN')}
                  </div>
                  <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>{msg.message}</p>
                </div>
              );
            })}
          </div>

          {/* Chat input box */}
          {ticket.status !== 'Closed' && ticket.status !== 'Resolved' ? (
            <form onSubmit={handleSendReply} style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Reply Message</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type message to send to customer..."
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={replyLoading || !replyText.trim()}>
                  {replyLoading ? 'Sending...' : 'Send Message ✉️'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ background: '#f1f5f9', border: '1px dashed var(--color-border)', borderRadius: 12, padding: 20, textAlign: 'center', color: 'var(--color-text-muted)' }}>
              This support ticket has been closed. Change status on the sidebar to reopen it.
            </div>
          )}
        </div>

        {/* Sidebar settings */}
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Subject</h3>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{ticket.subject}</p>
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Customer Account</h3>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              <div><strong>Name:</strong> {ticket.user?.name}</div>
              <div><strong>Email:</strong> {ticket.user?.email}</div>
              <div><strong>Registered:</strong> {new Date(ticket.user?.createdAt).toLocaleDateString('en-IN')}</div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>Category & Priority</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge variant="neutral">{ticket.category}</Badge>
              <Badge variant={ticket.priority === 'High' ? 'danger' : ticket.priority === 'Medium' ? 'warning' : 'neutral'}>
                {ticket.priority} Priority
              </Badge>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
            <label className="form-label" style={{ fontWeight: 700, marginBottom: 8, display: 'block' }}>Ticket Status</label>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <select className="form-input form-select" value={status} onChange={(e) => handleStatusChange(e.target.value)} disabled={statusLoading}>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </AdminLayoutWrapper>
  );
}
