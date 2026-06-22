import { useState, useEffect } from 'react';
import { FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';

// Custom hook to count up from 0 to value
function useCountUp(target, duration = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(target, 10);
    if (isNaN(end) || end === 0) {
      setCount(target);
      return;
    }
    const totalMiliseconds = duration;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 15);
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / totalMiliseconds, 1);
      const currentVal = Math.floor(progress * end);
      setCount(currentVal);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  return count;
}

export default function StatsCard({ icon, value, label, trend, isPositive, color }) {
  // Extract number from value string if it contains formatting (like rupee or commas)
  const numericValue = typeof value === 'string' ? value.replace(/[^0-9]/g, '') : value;
  const animatedNumber = useCountUp(numericValue || 0, 800);

  // Format animated value back to currency or commas if original was formatted
  const displayValue = typeof value === 'string' && value.includes('₹')
    ? `₹${Number(animatedNumber).toLocaleString('en-IN')}`
    : typeof value === 'number'
      ? value.toLocaleString('en-IN')
      : animatedNumber;

  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      border: '1px solid var(--color-border)',
      padding: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      boxShadow: 'var(--shadow-sm)',
      transition: 'transform 0.2s',
      cursor: 'default',
    }}
      onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
    >
      <div style={{
        fontSize: 28,
        background: `${color}15`,
        color: color,
        width: 56,
        height: 56,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: 'var(--color-text)' }}>{displayValue}</div>
        {trend && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, fontWeight: 700, color: isPositive ? '#10b981' : '#ef4444' }}>
            {isPositive ? <FiArrowUpRight /> : <FiArrowDownRight />}
            <span>{trend}% vs last month</span>
          </div>
        )}
      </div>
    </div>
  );
}
