/**
 * context/WishlistContext.jsx
 * Global wishlist state synced with backend.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { wishlistApi } from '../api/reviewApi';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';

const WishlistContext = createContext(null);

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { fetchCart } = useCart();
  const [wishlist, setWishlist] = useState([]);  // array of product objects
  const [wishlistIds, setWishlistIds] = useState(new Set());

  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist();
    } else {
      setWishlist([]);
      setWishlistIds(new Set());
    }
  }, [isAuthenticated]);

  const fetchWishlist = async () => {
    try {
      const res = await wishlistApi.getWishlist();
      const items = res.data.wishlist || [];
      setWishlist(items);
      setWishlistIds(new Set(items.map((p) => p._id)));
    } catch (_) {}
  };

  const addToWishlist = useCallback(async (productId, productName = 'Item') => {
    try {
      await wishlistApi.addToWishlist(productId);
      setWishlistIds((prev) => new Set([...prev, productId]));
      toast.success(`"${productName}" added to wishlist ❤️`);
      fetchWishlist();
    } catch (err) {
      toast.error(err.message || 'Failed to add to wishlist');
    }
  }, []);

  const removeFromWishlist = useCallback(async (productId) => {
    try {
      await wishlistApi.removeFromWishlist(productId);
      setWishlistIds((prev) => { const s = new Set(prev); s.delete(productId); return s; });
      setWishlist((prev) => prev.filter((p) => p._id !== productId));
      toast.success('Removed from wishlist');
    } catch (err) {
      toast.error(err.message || 'Failed to remove from wishlist');
    }
  }, []);

  const toggleWishlist = useCallback(async (productId, productName) => {
    if (wishlistIds.has(productId)) {
      await removeFromWishlist(productId);
    } else {
      await addToWishlist(productId, productName);
    }
  }, [wishlistIds, addToWishlist, removeFromWishlist]);

  const isInWishlist = useCallback((productId) => wishlistIds.has(productId), [wishlistIds]);

  const moveToCart = useCallback(async (productId) => {
    try {
      await wishlistApi.moveToCart(productId);
      setWishlistIds((prev) => { const s = new Set(prev); s.delete(productId); return s; });
      setWishlist((prev) => prev.filter((p) => p._id !== productId));
      await fetchCart();
      toast.success('Moved to cart! 🛒');
    } catch (err) {
      toast.error(err.message || 'Failed to move to cart');
    }
  }, [fetchCart]);

  return (
    <WishlistContext.Provider value={{
      wishlist,
      wishlistCount: wishlistIds.size,
      isInWishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      moveToCart,
      fetchWishlist,
    }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
};

export default WishlistContext;
