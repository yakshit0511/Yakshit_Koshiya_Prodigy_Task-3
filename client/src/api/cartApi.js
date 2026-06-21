import api from './axios';

export const cartApi = {
  getCart: () => api.get('/cart'),
  addToCart: (productId, quantity) => api.post('/cart/add', { productId, quantity }),
  updateItem: (productId, quantity) => api.put(`/cart/update/${productId}`, { quantity }),
  removeItem: (productId) => api.delete(`/cart/remove/${productId}`),
  clearCart: () => api.delete('/cart/clear'),
  applyCoupon: (couponCode) => api.post('/cart/apply-coupon', { couponCode }),
  removeCoupon: () => api.delete('/cart/remove-coupon'),
};
