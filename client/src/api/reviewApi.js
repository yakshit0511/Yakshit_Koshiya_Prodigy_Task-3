import api from './axios';

export const reviewApi = {
  getProductReviews: (productId, params) => api.get(`/reviews/product/${productId}`, { params }),
  getMyReviews: () => api.get('/reviews/my-reviews'),
  createReview: (formData) => api.post('/reviews', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateReview: (id, formData) => api.put(`/reviews/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteReview: (id) => api.delete(`/reviews/${id}`),
  toggleLike: (id) => api.post(`/reviews/${id}/like`),
  // Admin
  adminGetReviews: (params) => api.get('/admin/reviews', { params }),
  adminApproveReview: (id, isApproved) => api.put(`/admin/reviews/${id}/approve`, { isApproved }),
  adminReplyReview: (id, adminReply) => api.put(`/admin/reviews/${id}/reply`, { adminReply }),
};

export const wishlistApi = {
  getWishlist: () => api.get('/wishlist'),
  addToWishlist: (productId) => api.post(`/wishlist/add/${productId}`),
  removeFromWishlist: (productId) => api.delete(`/wishlist/remove/${productId}`),
  moveToCart: (productId) => api.post(`/wishlist/move-to-cart/${productId}`),
};

export const couponApi = {
  validateCoupon: (code, orderAmount) => api.get(`/coupons/validate/${code}`, { params: { orderAmount } }),
  // Admin
  getCoupons: (params) => api.get('/coupons', { params }),
  getCoupon: (id) => api.get(`/coupons/${id}`),
  createCoupon: (data) => api.post('/coupons', data),
  updateCoupon: (id, data) => api.put(`/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/coupons/${id}`),
};

export const supportApi = {
  createTicket: (formData) => api.post('/support/tickets', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMyTickets: (params) => api.get('/support/tickets', { params }),
  getTicket: (id) => api.get(`/support/tickets/${id}`),
  replyToTicket: (id, formData) => api.post(`/support/tickets/${id}/reply`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  closeTicket: (id) => api.put(`/support/tickets/${id}/close`),
  // Admin
  adminGetTickets: (params) => api.get('/admin/support/tickets', { params }),
  adminGetTicket: (id) => api.get(`/admin/support/tickets/${id}`),
  adminUpdateStatus: (id, status) => api.put(`/admin/support/tickets/${id}/status`, { status }),
  adminReply: (id, message) => api.post(`/admin/support/tickets/${id}/reply`, { message }),
};

export const adminApi = {
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  getRevenueChart: () => api.get('/admin/dashboard/revenue-chart'),
  getTopProducts: () => api.get('/admin/dashboard/top-products'),
  getRecentActivity: () => api.get('/admin/dashboard/recent-activity'),
  getCustomers: (params) => api.get('/admin/customers', { params }),
  getCustomer: (id) => api.get(`/admin/customers/${id}`),
  toggleBlockCustomer: (id) => api.put(`/admin/customers/${id}/block`),
};
