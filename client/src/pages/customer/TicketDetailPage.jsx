import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supportApi } from '../../api/supportApi';
import CustomerLayoutWrapper from '../../components/layout/CustomerLayoutWrapper';
import { LoadingSpinner, EmptyState, StatusBadge } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiSend, FiPaperclip, FiLock, FiUnlock, FiDownload } from 'react-icons/fi';

export default function TicketDetailPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reply States
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [replyLoading, setReplyLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const fetchTicket = () => {
    setLoading(true);
    supportApi.getTicket(ticketId)
      .then((res) => {
        setTicket(res.data.ticket);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && replyFiles.length === 0) return;
    setReplyLoading(true);
    try {
      const fd = new FormData();
      fd.append('message', replyText.trim());
      replyFiles.forEach((file) => {
        fd.append('attachments', file);
      });

      await supportApi.replyToTicket(ticketId, fd);
      toast.success('Message sent! ✉️');
      setReplyText('');
      setReplyFiles([]);
      
      // Refresh ticket details
      const res = await supportApi.getTicket(ticketId);
      setTicket(res.data.ticket);
    } catch (err) {
      toast.error(err.message || 'Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!window.confirm('Are you sure you want to close this ticket?')) return;
    setActionLoading(true);
    try {
      await supportApi.closeTicket(ticketId);
      toast.success('Ticket closed.');
      fetchTicket();
    } catch (err) {
      toast.error(err.message || 'Failed to close ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenTicket = async () => {
    setActionLoading(true);
    try {
      await supportApi.reopenTicket(ticketId);
      toast.success('Ticket reopened! 🔓');
      fetchTicket();
    } catch (err) {
      toast.error(err.message || 'Failed to reopen ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + replyFiles.length > 3) {
      toast.error('You can upload a maximum of 3 attachments');
      return;
    }
    setReplyFiles([...replyFiles, ...files]);
  };

  if (loading) return <LoadingSpinner />;
  if (!ticket) return <EmptyState icon="😕" title="Ticket not found" />;

  const isClosed = ticket.status === 'Closed';

  return (
    <CustomerLayoutWrapper>
      {/* Header & Back Buttons */}
      <div style={{ marginBottom: 20 }}>
        <Link to="/support" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
          <FiArrowLeft /> Back to Support History
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Ticket #{ticket.ticketNumber || ticketId.slice(-6).toUpperCase()}</h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>Subject: <strong>{ticket.subject}</strong></p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, background: ticket.priority === 'Urgent' ? '#fee2e2' : '#f3f4f6', color: ticket.priority === 'Urgent' ? '#dc2626' : '#4b5563' }}>
              {ticket.priority} Priority
            </span>
            <StatusBadge status={ticket.status} />
            {!isClosed ? (
              <button className="btn btn-outline btn-sm danger" onClick={handleCloseTicket} disabled={actionLoading}>
                <FiLock /> Close Ticket
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={handleReopenTicket} disabled={actionLoading}>
                <FiUnlock /> Reopen Ticket
              </button>
            )}
          </div>
        </div>

        {ticket.relatedOrder && (
          <div style={{ marginTop: 12, fontSize: 13, background: 'var(--color-bg)', padding: '8px 16px', borderRadius: 8, display: 'inline-block' }}>
            🔗 <strong>Related Order:</strong>{' '}
            <Link to={`/my-orders/${ticket.relatedOrder._id}`} style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
              #{ticket.relatedOrder.orderNumber || ticket.relatedOrder._id.slice(-8).toUpperCase()} ({ticket.relatedOrder.orderStatus})
            </Link>
          </div>
        )}
      </div>

      {/* Messaging Flow Interface */}
      <div style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 16, display: 'flex', flexDirection: 'column', height: 500, overflow: 'hidden' }}>
        {/* Messages Body */}
        <div style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Loop messages */}
          {ticket.messages && ticket.messages.map((msg) => {
            const isUser = msg.senderRole === 'customer';
            return (
              <div
                key={msg._id}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  background: isUser ? 'var(--color-accent-light)' : 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  maxWidth: '75%',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 11, color: isUser ? 'var(--color-accent)' : 'var(--color-primary)' }}>
                    {isUser ? 'You' : msg.sender?.name || 'Support Agent'}
                  </span>
                  <span style={{ fontSize: 9, color: 'var(--color-text-muted)' }}>
                    {new Date(msg.sentAt || msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {msg.message}
                </p>

                {/* Attachments inside message */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--color-border)', paddingTop: 6 }}>
                    {msg.attachments.map((file, fIdx) => (
                      <a
                        key={fIdx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        <FiDownload size={12} /> {file.filename || `Attachment ${fIdx + 1}`}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Section */}
        <div style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', padding: 12 }}>
          {!isClosed ? (
            <form onSubmit={handleSendReply} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <textarea
                  className="form-input"
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply here..."
                  style={{ resize: 'none', padding: '8px 12px' }}
                  required
                />
                
                {/* Upload attachment row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => document.getElementById('reply-files-input').click()}
                    style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-text-secondary)', cursor: 'pointer' }}
                    disabled={replyFiles.length >= 3}
                  >
                    <FiPaperclip /> Attach ({replyFiles.length}/3)
                  </button>
                  <input
                    type="file"
                    id="reply-files-input"
                    multiple
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <div style={{ display: 'flex', gap: 4 }}>
                    {replyFiles.map((file, idx) => (
                      <span key={idx} style={{ fontSize: 11, background: 'var(--color-bg)', padding: '2px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {file.name.slice(0, 10)}...
                        <button type="button" onClick={() => setReplyFiles(replyFiles.filter((_, i) => i !== idx))} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 16px' }} disabled={replyLoading || (!replyText.trim() && replyFiles.length === 0)}>
                {replyLoading ? 'Sending...' : <><FiSend /> Send</>}
              </button>
            </form>
          ) : (
            <div style={{ padding: '8px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <FiLock /> This ticket is closed. Click Reopen Ticket in the header to continue.
            </div>
          )}
        </div>
      </div>
    </CustomerLayoutWrapper>
  );
}
