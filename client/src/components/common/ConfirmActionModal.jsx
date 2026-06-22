import AdminModal from './AdminModal';

export default function ConfirmActionModal({ isOpen, onClose, onConfirm, title = 'Confirm Action', message, confirmText = 'Confirm', danger = false, loading = false }) {
  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width={400}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Please wait...' : confirmText}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 32, lineHeight: 1 }}>{danger ? '⚠️' : '❓'}</span>
        <div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>
      </div>
    </AdminModal>
  );
}
