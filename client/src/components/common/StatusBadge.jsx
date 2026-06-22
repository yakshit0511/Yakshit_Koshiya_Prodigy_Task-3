export default function StatusBadge({ status }) {
  if (!status) return null;

  const s = status.trim().toLowerCase();

  // Status mapping
  const styles = {
    // Order Status
    placed: { bg: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
    confirmed: { bg: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' },
    processing: { bg: '#faf5ff', color: '#6b21a8', border: '1px solid #e9d5ff' },
    shipped: { bg: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' },
    'out for delivery': { bg: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' },
    delivered: { bg: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
    cancelled: { bg: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' },
    'return requested': { bg: '#fefce8', color: '#a16207', border: '1px solid #fef08a' },
    returned: { bg: '#f9fafb', color: '#4b5563', border: '1px solid #e5e7eb' },

    // Payment Status
    paid: { bg: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
    unpaid: { bg: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' },
    refunded: { bg: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' },

    // Support Ticket Status
    open: { bg: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
    'in progress': { bg: '#faf5ff', color: '#6b21a8', border: '1px solid #e9d5ff' },
    resolved: { bg: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
    closed: { bg: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' },

    // Support Ticket Priority
    low: { bg: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' },
    medium: { bg: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
    high: { bg: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' },
    urgent: { bg: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' },

    // Product Status
    active: { bg: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' },
    inactive: { bg: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' },
  };

  const currentStyle = styles[s] || { bg: '#f3f4f6', color: '#1f2937', border: '1px solid #e5e7eb' };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      ...currentStyle,
    }}>
      {status}
    </span>
  );
}
