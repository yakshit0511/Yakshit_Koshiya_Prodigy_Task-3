import api from './axios';

export const couponApi = {
  validateCoupon: (code, orderAmount) => api.get(`/coupons/validate/${code}`, { params: { orderAmount } }),
  // Admin
  getCoupons: (params) => api.get('/coupons', { params }),
  getCoupon: (id) => api.get(`/coupons/${id}`),
  createCoupon: (data) => api.post('/coupons', data),
  updateCoupon: (id, data) => api.put(`/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/coupons/${id}`),
};

export default couponApi;
