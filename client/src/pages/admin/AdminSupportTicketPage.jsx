import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supportApi } from '../../api/supportApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { Breadcrumb, LoadingSpinner, EmptyState } from '../../components/common/index.jsx';
import StatusBadge from '../../components/common/StatusBadge';
import { FiArrowLeft, FiUser, FiMail, FiPhone, FiCalendar, FiPaperclip, FiSend, FiShoppingBag, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminSupportTicketPage() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Reply Form States
  const [replyText, setReplyText] = useState('');
  const [files, setFiles] = useState([]);
  const [replyLoading, setReplyLoading] = useState(false);

  // Status & Priority Selectors
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const messagesEndRef = useRef(null);

  // Quick Reply Templates list
  const templates = [
    { label: '-- Select a template response --', value: '' },
    { label: '🔎 Investigating Issue', value: 'Hello! Thank you for reaching out. We are currently looking into this issue and will update you shortly.' },
    { label: '📦 Delivery Delayed', value: 'Hello! We apologize for the delay. We have contacted our local courier team and your package is scheduled for delivery by tomorrow.' },
    { label: '💳 Refund Processed', value: 'Hello! We have initiated a full refund of the order amount to your original payment method. It should reflect in your account within 3-5 business days.' },
    { label: '✔️ Issue Resolved', value: 'Hello! We have successfully resolved your issue. Please let us know if there is anything else we can assist you with.' },
    { label: '❓ Requesting Details', value: 'Hello! Could you please share a photo or more details about the issue so we can assist you better?' },
  ];

  const fetchTicket = () => {
    setLoading(true);
    supportApi.adminGetTicket(ticketId)
      .then((res) => {
        const t = res.data.ticket;
        setTicket(t);
        if (t) {
          setStatus(t.status);
          setPriority(t.priority);
        }
      })
      .catch((err) => {
        toast.error('Failed to load support ticket details.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleTemplateSelect = (e) => {
    const val = e.target.value;
    if (val) {
      setReplyText(val);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 3) {
      toast.error('Maximum 3 files are allowed.');
      return;
    }
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && files.length === 0) return;

    setReplyLoading(true);
    
    const formData = new FormData();
    formData.append('message', replyText.trim());
    files.forEach((file) => {
      formData.append('attachments', file); // Multer expects attachments field
    });

    try {
      await supportApi.adminReply(ticketId, formData);
      toast.success('Reply message sent!');
      setReplyText('');
      setFiles([]);
      // Refresh chat logs
      const res = await supportApi.adminGetTicket(ticketId);
      setTicket(res.data.ticket);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await supportApi.adminUpdateStatus(ticketId, { status, priority });
      toast.success('Ticket configurations saved!');
      fetchTicket();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save changes');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <AdminLayoutWrapper title="Support Ticket">
        <LoadingSpinner fullPage />
      </AdminLayoutWrapper>
    );
  }

  if (!ticket) {
    return (
      <AdminLayoutWrapper title="Support Ticket">
        <EmptyState icon="😕" title="Ticket not found" />
      </AdminLayoutWrapper>
    );
  }

  return (
    <AdminLayoutWrapper title={`Ticket Details: #${ticket.ticketNumber}`}>
      <div style={{ marginBottom: 20 }}>
        <Link 
          to="/admin/support" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: 'var(--color-primary)', fontWeight: 600, fontSize: 14 }}
        >
          <FiArrowLeft /> Back to Support Tickets
        </Link>
      </div>

      <Breadcrumb
        items={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Support Queue', href: '/admin/support' },
          { label: 'Ticket Chat' },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: 24, alignItems: 'flex-start' }}>
        
        {/* Left Side: Chat Logs Thread & Reply Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Thread chat list */}
          <div 
            style={{ 
              background: 'var(--color-bg)', 
              border: '1px solid var(--color-border)',
              borderRadius: 12, 
              padding: 20, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 16, 
              minHeight: 350, 
              maxHeight: 520, 
              overflowY: 'auto' 
            }}
          >
            {ticket.messages?.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', margin: 'auto' }}>No messages in this ticket.</p>
            ) : (
              ticket.messages.map((msg, idx) => {
                const isAdmin = msg.senderRole === 'admin';
                return (
                  <div
                    key={msg._id || idx}
                    style={{
                      background: isAdmin ? '#4f46e5' : 'white',
                      color: isAdmin ? 'white' : 'var(--color-text)',
                      border: `1px solid ${isAdmin ? '#4338ca' : '#cbd5e1'}`,
                      borderRadius: 12,
                      padding: 14,
                      alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                      maxWidth: '75%',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ 
                      fontSize: 10, 
                      fontWeight: 700, 
                      color: isAdmin ? '#c7d2fe' : 'var(--color-text-secondary)', 
                      marginBottom: 6,
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 16
                    }}>
                      <span>{isAdmin ? 'YOU (ADMIN)' : (ticket.user?.name || 'Customer')}</span>
                      <span>{new Date(msg.sentAt).toLocaleString('en-IN')}</span>
                    </div>

                    <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {msg.message}
                    </p>

                    {/* Message Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div style={{ marginTop: 10, borderTop: `1px solid ${isAdmin ? '#6366f1' : '#f1f5f9'}`, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {msg.attachments.map((file, fidx) => (
                          <a 
                            key={fidx}
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ 
                              fontSize: 12, 
                              color: isAdmin ? '#e0e7ff' : 'var(--color-primary)', 
                              textDecoration: 'none', 
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            📎 {file.filename || `File Attachment ${fidx + 1}`}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Form */}
          {ticket.status !== 'Closed' ? (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 20 }}>
              
              {/* Quick Reply Templates selector */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>⚡ Quick Reply Templates</label>
                <select 
                  className="form-input form-select"
                  onChange={handleTemplateSelect}
                  style={{ fontSize: 13, background: 'var(--color-bg)' }}
                >
                  {templates.map((tpl, idx) => (
                    <option key={idx} value={tpl.value}>{tpl.label}</option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleSendReply}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>Reply Message</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type message to respond to customer support ticket..."
                    required={files.length === 0}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Selected File Previews */}
                {files.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    {files.map((file, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          background: 'var(--color-border)', 
                          border: '1px solid #cbd5e1', 
                          borderRadius: 6, 
                          padding: '6px 12px', 
                          fontSize: 12, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8 
                        }}
                      >
                        <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveFile(idx)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-error)', fontWeight: 'bold' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <input
                      type="file"
                      id="support-admin-reply-files"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                      disabled={files.length >= 3}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => document.getElementById('support-admin-reply-files').click()}
                      disabled={files.length >= 3}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--color-border)', fontSize: 13 }}
                    >
                      <FiPaperclip /> Attach Files ({files.length}/3)
                    </button>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={replyLoading || (!replyText.trim() && files.length === 0)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}
                  >
                    <FiSend /> {replyLoading ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </form>

            </div>
          ) : (
            <div style={{ background: 'var(--color-bg)', border: '1px dashed var(--color-border-hover)', borderRadius: 12, padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              🔒 This support ticket is Closed. Change status on the right sidebar to reopen the conversation.
            </div>
          )}

        </div>

        {/* Right Side: Ticket Details, Status controls, Customer info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Admin Controls Panel */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid #cbd5e1', paddingBottom: 10 }}>
              🛠️ Ticket Settings
            </h2>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Ticket Status</label>
              <select
                className="form-input form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ fontSize: 13 }}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ fontSize: 12, fontWeight: 600 }}>Priority Level</label>
              <select
                className="form-input form-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ fontSize: 13 }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', fontWeight: 700 }}
              onClick={handleSaveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Customer Profile card */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid #cbd5e1', paddingBottom: 10 }}>
              👤 Customer Account
            </h2>
            {ticket.user ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: '50%', 
                    background: 'var(--color-accent-light)', 
                    color: 'var(--color-accent)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 'bold' 
                  }}>
                    {ticket.user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{ticket.user.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Registered User</div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <FiMail style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ color: 'var(--color-text)' }}>{ticket.user.email}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <FiPhone style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ color: 'var(--color-text)' }}>{ticket.user.phone || 'No phone registered'}</span>
                  </div>
                </div>

                <Link 
                  to={`/admin/customers?search=${encodeURIComponent(ticket.user.email)}`}
                  className="btn btn-ghost"
                  style={{ width: '100%', textAlign: 'center', border: '1px solid var(--color-border)', fontSize: 12, display: 'block', textDecoration: 'none', padding: '6px 0' }}
                >
                  View Customer Record
                </Link>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-secondary)', margin: 0, fontSize: 13 }}>Deleted user account.</p>
            )}
          </div>

          {/* Related Order card if applicable */}
          {ticket.relatedOrder && (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0', borderBottom: '1px solid #cbd5e1', paddingBottom: 10 }}>
                🛒 Related Order Context
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Order Number:</span>
                  <Link 
                    to={`/admin/orders/${ticket.relatedOrder._id}`}
                    style={{ fontWeight: 'bold', fontFamily: 'monospace', textDecoration: 'none', color: 'var(--color-primary)' }}
                  >
                    #{ticket.relatedOrder.orderNumber}
                  </Link>
                </div>

                <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Order Status:</span>
                  <StatusBadge status={ticket.relatedOrder.orderStatus} />
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </AdminLayoutWrapper>
  );
}
