/**
 * context/CartContext.jsx
 * Global cart state synced with backend.
 * Provides real-time cart count for navbar badge.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { cartApi } from '../api/cartApi';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

const EMPTY_CART = { items: [], subtotal: 0, discountAmount: 0, shippingCharge: 0, totalAmount: 0, couponApplied: null, itemCount: 0 };

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(EMPTY_CART);
  const [loading, setLoading] = useState(false);

  /* ---- Fetch cart when user logs in ---- */
  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      setCart(EMPTY_CART);
    }
  }, [isAuthenticated]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await cartApi.getCart();
      setCart(res.data.cart || EMPTY_CART);
    } catch (_) {
      setCart(EMPTY_CART);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = useCallback(async (productId, quantity = 1, productName = 'Item') => {
    try {
      const res = await cartApi.addToCart(productId, quantity);
      setCart(res.data.cart);
      toast.success(`"${productName}" added to cart! 🛒`);
      return true;
    } catch (err) {
      toast.error(err.message || 'Failed to add to cart');
      return false;
    }
  }, []);

  const removeFromCart = useCallback(async (productId) => {
    try {
      const res = await cartApi.removeItem(productId);
      setCart(res.data.cart);
      toast.success('Item removed from cart');
    } catch (err) {
      toast.error(err.message || 'Failed to remove item');
    }
  }, []);

  const updateQuantity = useCallback(async (productId, quantity) => {
    try {
      const res = await cartApi.updateItem(productId, quantity);
      setCart(res.data.cart);
    } catch (err) {
      toast.error(err.message || 'Failed to update quantity');
    }
  }, []);

  const clearCart = useCallback(async () => {
    try {
      await cartApi.clearCart();
      setCart(EMPTY_CART);
    } catch (err) {
      toast.error('Failed to clear cart');
    }
  }, []);

  const applyCoupon = useCallback(async (couponCode) => {
    const res = await cartApi.applyCoupon(couponCode);
    setCart(res.data.cart);
    toast.success(res.data.message || 'Coupon applied!');
    return res.data;
  }, []);

  const removeCoupon = useCallback(async () => {
    const res = await cartApi.removeCoupon();
    setCart(res.data.cart);
    toast.success('Coupon removed');
  }, []);

  // Set cart directly (used after order placement)
  const setCartDirect = useCallback((c) => setCart(c || EMPTY_CART), []);

  const cartCount = cart?.itemCount || cart?.items?.reduce((s, i) => s + i.quantity, 0) || 0;
  const cartItems = cart?.items || [];

  return (
    <CartContext.Provider value={{
      cart, cartItems, cartCount,
      cartTotal: cart?.totalAmount || 0,
      loading,
      addToCart, removeFromCart, updateQuantity,
      clearCart, applyCoupon, removeCoupon,
      fetchCart, setCartDirect,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

export default CartContext;
