// hooks/useWindowSize.js
import { useState, useEffect } from 'react';
export const useWindowSize = () => {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return { ...size, isMobile: size.width < 640, isTablet: size.width < 1024, isDesktop: size.width >= 1024 };
};
