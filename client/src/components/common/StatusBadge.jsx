/**
 * StatusBadge — Theme-aware status/priority badge.
 * Uses CSS variable groups so colors adapt in dark mode.
 */

// Color groups that map to CSS variables defined in index.css
const GROUP = {
  blue:   { bg: 'var(--badge-info-bg, #eff6ff)',     color: 'var(--badge-info-color, #1d4ed8)',  border: '1px solid rgba(59,130,246,0.3)' },
  indigo: { bg: 'var(--badge-info-bg, #e0e7ff)',     color: 'var(--badge-info-color, #4338ca)',  border: '1px solid rgba(99,102,241,0.3)' },
  purple: { bg: 'var(--badge-info-bg, #faf5ff)',     color: 'var(--badge-info-color, #6b21a8)',  border: '1px solid rgba(139,92,246,0.3)' },
  orange: { bg: 'var(--badge-secondary-bg, #fff7ed)',color: 'var(--badge-secondary-color, #c2410c)', border: '1px solid rgba(249,115,22,0.3)' },
  yellow: { bg: 'var(--badge-warning-bg, #fffbeb)',  color: 'var(--badge-warning-color, #b45309)',border: '1px solid rgba(245,158,11,0.3)' },
  green:  { bg: 'var(--badge-success-bg, #f0fdf4)',  color: 'var(--badge-success-color, #15803d)',border: '1px solid rgba(34,197,94,0.3)' },
  red:    { bg: 'var(--badge-error-bg, #fef2f2)',    color: 'var(--badge-error-color, #b91c1c)', border: '1px solid rgba(239,68,68,0.3)' },
  amber:  { bg: 'var(--badge-warning-bg, #fefce8)',  color: 'var(--badge-warning-color, #a16207)',border: '1px solid rgba(234,179,8,0.3)' },
  gray:   { bg: 'var(--color-bg)',                   color: 'var(--color-text-secondary)',        border: '1px solid var(--color-border)' },
};

// Status → color group mapping
const STATUS_MAP = {
  // Order Status
  placed:               'blue',
  confirmed:            'indigo',
  processing:           'purple',
  shipped:              'orange',
  'out for delivery':   'yellow',
  delivered:            'green',
  cancelled:            'red',
  'return requested':   'amber',
  returned:             'gray',

  // Payment Status
  paid:                 'green',
  unpaid:               'red',
  refunded:             'gray',
  pending:              'yellow',

  // Support Ticket Status
  open:                 'blue',
  'in progress':        'purple',
  resolved:             'green',
  closed:               'gray',

  // Support Ticket Priority
  low:                  'gray',
  medium:               'blue',
  high:                 'orange',
  urgent:               'red',

  // Product / Review Status
  active:               'green',
  approved:             'green',
  inactive:             'gray',
  rejected:             'red',
  flagged:              'amber',
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const key = status.trim().toLowerCase();
  const groupKey = STATUS_MAP[key] || 'gray';
  const style = GROUP[groupKey];

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
      background: style.bg,
      color: style.color,
      border: style.border,
    }}>
      {status}
    </span>
  );
}
