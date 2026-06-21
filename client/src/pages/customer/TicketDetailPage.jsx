import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supportApi } from '../../api/supportApi';
import { Breadcrumb, LoadingSpinner, EmptyState, Badge } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

export default function TicketDetailPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const fetchTicket = () => {
    setLoading(true);
    supportApi.getTicket(ticketId)
      .then((res) => setTicket(res.data.ticket))
      .catch(() => {})
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
      const fd = new FormData();
      fd.append('message', replyText);
      await supportApi.replyToTicket(ticketId, fd);
      toast.success('Reply sent!');
      setReplyText('');
      // Refresh ticket details
      supportApi.getTicket(ticketId).then((res) => setTicket(res.data.ticket));
    } catch (err) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!window.confirm('Are you sure you want to close this ticket?')) return;
    try {
      await supportApi.closeTicket(ticketId);
      toast.success('Ticket closed successfully');
      fetchTicket();
    } catch (err) {
      toast.error(err.message || 'Failed to close ticket');
    }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (!ticket) return <EmptyState icon="😕" title="Ticket not found" />;

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
      <Breadcrumb
        items={[
          { label: 'Home', href: '/' },
          { label: 'Support', href: '/support' },
          { label: `Ticket #${ticket._id.slice(-6).toUpperCase()}` },
        ]}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Support Ticket: {ticket.subject}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Category: {ticket.category}</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>•</span>
            <Badge variant={ticket.priority === 'High' ? 'danger' : ticket.priority === 'Medium' ? 'warning' : 'neutral'}>
              {ticket.priority} Priority
            </Badge>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>•</span>
            <Badge variant={getStatusVariant(ticket.status)}>{ticket.status}</Badge>
          </div>
        </div>
        {ticket.status !== 'Closed' && ticket.status !== 'Resolved' && (
          <button className="btn btn-outline btn-sm danger" onClick={handleCloseTicket}>
            🔒 Close Ticket
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        {/* Messages Chat Flow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: '#f8fafc', padding: 24, borderRadius: 'var(--radius-xl)', minHeight: 300, maxHeight: 500, overflowY: 'auto' }}>
          {/* Main Description */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, alignSelf: 'flex-start', maxWidth: '75%' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 4 }}>
              CUSTOMER (YOU) • {new Date(ticket.createdAt).toLocaleString('en-IN')}
            </div>
            <p style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6 }}>{ticket.description}</p>
            {ticket.attachment?.url && (
              <div style={{ marginTop: 10 }}>
                <a href={ticket.attachment.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                  📎 View Attachment
                </a>
              </div>
            )}
          </div>

          {/* Replied messages list */}
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
                  {isAdmin ? 'SUPPORT AGENT' : 'YOU'} • {new Date(msg.createdAt).toLocaleString('en-IN')}
                </div>
                <p style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6 }}>{msg.message}</p>
                {msg.media?.url && (
                  <div style={{ marginTop: 10 }}>
                    <a href={msg.media.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                      📎 View Attachment
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Reply Form */}
        {ticket.status !== 'Closed' && ticket.status !== 'Resolved' ? (
          <form onSubmit={handleSendReply} style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 20 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 700 }}>Reply Message</label>
              <textarea
                className="form-input"
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your message here..."
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
          <div style={{ background: '#f1f5f9', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-xl)', padding: 20, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            This support ticket has been closed. Re-open or create a new ticket if you still need help.
          </div>
        )}
      </div>
    </div>
  );
}
