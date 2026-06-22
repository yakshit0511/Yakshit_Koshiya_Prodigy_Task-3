import api from './axios';

export const supportApi = {
  createTicket: (formData) => api.post('/support/tickets', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMyTickets: (params) => api.get('/support/tickets', { params }),
  getTicket: (id) => api.get(`/support/tickets/${id}`),
  replyToTicket: (id, formData) => api.post(`/support/tickets/${id}/reply`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  closeTicket: (id) => api.put(`/support/tickets/${id}/close`),
  reopenTicket: (id) => api.put(`/support/tickets/${id}/reopen`),
  // Admin
  adminGetTickets: (params) => api.get('/admin/support/tickets', { params }),
  adminGetTicket: (id) => api.get(`/admin/support/tickets/${id}`),
  adminUpdateStatus: (id, data) => api.put(`/admin/support/tickets/${id}/status`, data),
  adminReply: (id, data) => api.post(`/admin/support/tickets/${id}/reply`, data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}),
};

export default supportApi;
