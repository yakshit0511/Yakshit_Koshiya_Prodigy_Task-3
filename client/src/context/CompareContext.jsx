import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const CompareContext = createContext(null);

export const CompareProvider = ({ children }) => {
  const [compareItems, setCompareItems] = useState([]);

  // Load comparison list on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('compare_items');
      if (saved) setCompareItems(JSON.parse(saved));
    } catch (_) {}
  }, []);

  const addToCompare = useCallback((product) => {
    setCompareItems((prev) => {
      if (prev.some((p) => p._id === product._id)) {
        toast.error('Product already added to comparison');
        return prev;
      }
      if (prev.length >= 3) {
        toast.error('You can compare a maximum of 3 products');
        return prev;
      }
      const updated = [...prev, product];
      localStorage.setItem('compare_items', JSON.stringify(updated));
      toast.success(`"${product.name}" added to comparison ⚖️`);
      return updated;
    });
  }, []);

  const removeFromCompare = useCallback((productId) => {
    setCompareItems((prev) => {
      const updated = prev.filter((p) => p._id !== productId);
      localStorage.setItem('compare_items', JSON.stringify(updated));
      toast.success('Removed from comparison');
      return updated;
    });
  }, []);

  const clearCompare = useCallback(() => {
    setCompareItems([]);
    localStorage.removeItem('compare_items');
  }, []);

  const isInCompare = useCallback((productId) => {
    return compareItems.some((p) => p._id === productId);
  }, [compareItems]);

  return (
    <CompareContext.Provider value={{
      compareItems,
      addToCompare,
      removeFromCompare,
      clearCompare,
      isInCompare,
    }}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
};

export default CompareContext;
