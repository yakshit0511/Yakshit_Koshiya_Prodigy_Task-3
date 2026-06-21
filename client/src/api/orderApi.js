import api from './axios';

export const orderApi = {
  placeOrder: (data) => api.post('/orders/place', data),
  verifyPayment: (data) => api.post('/orders/verify-payment', data),
  getMyOrders: (params) => api.get('/orders/my-orders', { params }),
  getOrderById: (id) => api.get(`/orders/my-orders/${id}`),
  cancelOrder: (id, cancelReason) => api.post(`/orders/${id}/cancel`, { cancelReason }),
  requestReturn: (id, returnReason) => api.post(`/orders/${id}/return-request`, { returnReason }),
  downloadInvoice: (id) => api.get(`/orders/${id}/invoice`, { responseType: 'blob' }),
  // Admin
  adminGetOrders: (params) => api.get('/admin/orders', { params }),
  adminGetOrder: (id) => api.get(`/admin/orders/${id}`),
  adminUpdateStatus: (id, data) => api.put(`/admin/orders/${id}/status`, data),
  adminUpdatePayment: (id, data) => api.put(`/admin/orders/${id}/payment-status`, data),
  adminGetStats: () => api.get('/admin/orders/stats'),
};
