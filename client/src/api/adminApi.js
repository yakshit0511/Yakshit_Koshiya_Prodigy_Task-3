import api from './axios';

export const adminApi = {
  getDashboardStats: () => api.get('/admin/dashboard/stats'),
  getRevenueChart: () => api.get('/admin/dashboard/revenue-chart'),
  getTopProducts: () => api.get('/admin/dashboard/top-products'),
  getRecentActivity: () => api.get('/admin/dashboard/recent-activity'),
  getCustomers: (params) => api.get('/admin/customers', { params }),
  getCustomer: (id) => api.get(`/admin/customers/${id}`),
  toggleBlockCustomer: (id) => api.put(`/admin/customers/${id}/block`),
};

export default adminApi;
