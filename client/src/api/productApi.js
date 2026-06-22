import api from './axios';

export const productApi = {
  getProducts: (params) => api.get('/products', { params }),
  getProductBySlug: (slug) => api.get(`/products/${slug}`),
  searchProducts: (query, params) => api.get('/products/search', { params: { q: query, ...params } }),
  getFeatured: () => api.get('/products?featured=true&limit=8'),
  getRelated: (productId, category) => api.get(`/products?category=${category}&limit=8&exclude=${productId}`),
  // Admin
  adminGetProducts: (params) => api.get('/products/admin/all', { params }),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  uploadProductImages: (id, formData) => api.post(`/products/${id}/images`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const categoryApi = {
  getCategories: () => api.get('/categories'),
  adminGetCategories: () => api.get('/categories/admin/all'),
  getCategoryBySlug: (slug) => api.get(`/categories/${slug}`),
  createCategory: (data) => api.post('/categories', data),
  updateCategory: (id, data) => api.put(`/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/categories/${id}`),
};
