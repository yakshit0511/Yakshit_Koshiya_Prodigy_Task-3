import { useState, useEffect } from 'react';
import { categoryApi, productApi } from '../../api/productApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { LoadingSpinner, StatusBadge } from '../../components/common/index.jsx';
import AdminModal from '../../components/common/AdminModal';
import { FiPlus, FiEdit, FiTrash2, FiChevronDown, FiChevronRight, FiFolder, FiImage, FiSettings } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null); // null = Add Mode
  const [formLoading, setFormLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentCategory, setParentCategory] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  // Expandable tree state
  const [expandedIds, setExpandedIds] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const catRes = await categoryApi.adminGetCategories();
      setCategories(catRes.data.categories || []);

      const prodRes = await productApi.adminGetProducts({ limit: 1000 });
      setProducts(prodRes.data.products || []);
    } catch (err) {
      toast.error('Failed to load categories or products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper to toggle expand/collapse state
  const toggleExpand = (id) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to slugify name
  const slugify = (text) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w-]+/g, '') // Remove all non-word chars
      .replace(/--+/g, '-'); // Replace multiple - with single -
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setName(value);
    setSlug(slugify(value));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setParentCategory('');
    setSortOrder('0');
    setIsActive(true);
    setImageFile(null);
    setImagePreview('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setSlug(cat.slug || '');
    setDescription(cat.description || '');
    setParentCategory(cat.parentCategory?._id || cat.parentCategory || '');
    setSortOrder(cat.sortOrder !== undefined ? cat.sortOrder.toString() : '0');
    setIsActive(cat.isActive !== false);
    setImageFile(null);
    setImagePreview(cat.image?.url || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setFormLoading(true);

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('description', description.trim());
    formData.append('parentCategory', parentCategory || '');
    formData.append('sortOrder', sortOrder);
    formData.append('isActive', isActive);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      if (editingCategory) {
        await categoryApi.updateCategory(editingCategory._id, formData);
        toast.success('Category updated successfully');
      } else {
        await categoryApi.createCategory(formData);
        toast.success('Category created successfully');
      }
      handleCloseModal();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save category');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteClick = async (cat) => {
    const catProductsCount = products.filter(p => p.category?._id === cat._id || p.category === cat._id).length;
    if (catProductsCount > 0) {
      toast.error(`Cannot delete category "${cat.name}". It contains ${catProductsCount} product(s).`);
      return;
    }

    const hasSubcategories = categories.some(c => (c.parentCategory?._id || c.parentCategory) === cat._id);
    if (hasSubcategories) {
      toast.error(`Cannot delete category "${cat.name}". It has subcategories.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;

    try {
      await categoryApi.deleteCategory(cat._id);
      toast.success('Category deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete category');
    }
  };

  // Group into tree
  const topLevelCategories = categories.filter(c => !c.parentCategory);
  
  const getSubcategories = (parentId) => {
    return categories.filter(c => {
      const pId = c.parentCategory?._id || c.parentCategory;
      return pId === parentId;
    });
  };

  return (
    <AdminLayoutWrapper title="Manage Categories">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Organize products into hierarchical departments and subcategories
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiPlus /> Add Category
        </button>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : (
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px 20px', fontWeight: 700, width: '40%' }}>Category Name</th>
                <th style={{ padding: '16px 20px', fontWeight: 700 }}>Description</th>
                <th style={{ padding: '16px 20px', fontWeight: 700, width: 120 }}>Product Count</th>
                <th style={{ padding: '16px 20px', fontWeight: 700, width: 100 }}>Sort Order</th>
                <th style={{ padding: '16px 20px', fontWeight: 700, width: 120 }}>Status</th>
                <th style={{ padding: '16px 20px', fontWeight: 700, width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {topLevelCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    No categories found. Click "Add Category" to create one.
                  </td>
                </tr>
              ) : (
                topLevelCategories.map(parent => {
                  const subCats = getSubcategories(parent._id);
                  const isExpanded = !!expandedIds[parent._id];
                  const parentProdCount = products.filter(p => p.category?._id === parent._id || p.category === parent._id).length;

                  return (
                    <span key={parent._id} style={{ display: 'table-row-group' }}>
                      {/* Parent Row */}
                      <tr style={{ borderBottom: '1px solid var(--color-border)', hover: { background: '#f8fafc' } }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {subCats.length > 0 ? (
                              <button 
                                onClick={() => toggleExpand(parent._id)} 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                              >
                                {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                              </button>
                            ) : (
                              <span style={{ width: 24 }} />
                            )}
                            {parent.image?.url ? (
                              <img src={parent.image.url} alt={parent.name} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                                <FiFolder size={18} />
                              </div>
                            )}
                            <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{parent.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                          {parent.description || 'No description'}
                        </td>
                        <td style={{ padding: '16px 20px', fontWeight: 600 }}>
                          {parentProdCount}
                        </td>
                        <td style={{ padding: '16px 20px' }}>{parent.sortOrder || 0}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <StatusBadge status={parent.isActive !== false ? 'active' : 'inactive'} />
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEditModal(parent)} title="Edit Category">
                              <FiEdit size={14} />
                            </button>
                            <button className="btn btn-ghost btn-sm danger" onClick={() => handleDeleteClick(parent)} title="Delete Category">
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Subcategories */}
                      {isExpanded && subCats.map(sub => {
                        const subProdCount = products.filter(p => p.category?._id === sub._id || p.category === sub._id).length;

                        return (
                          <tr key={sub._id} style={{ borderBottom: '1px solid var(--color-border)', background: '#fafafc' }}>
                            <td style={{ padding: '16px 20px 16px 48px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 16, height: 1, borderBottom: '2px dashed #cbd5e1', marginRight: 4 }} />
                                {sub.image?.url ? (
                                  <img src={sub.image.url} alt={sub.name} style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: 28, height: 28, borderRadius: 4, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                    <FiFolder size={14} />
                                  </div>
                                )}
                                <span style={{ fontSize: 14, fontWeight: 500 }}>{sub.name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)', fontSize: 13 }}>
                              {sub.description || 'No description'}
                            </td>
                            <td style={{ padding: '16px 20px', fontSize: 14 }}>
                              {subProdCount}
                            </td>
                            <td style={{ padding: '16px 20px', fontSize: 14 }}>{sub.sortOrder || 0}</td>
                            <td style={{ padding: '16px 20px' }}>
                              <StatusBadge status={sub.isActive !== false ? 'active' : 'inactive'} />
                            </td>
                            <td style={{ padding: '16px 20px' }}>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleOpenEditModal(sub)}>
                                  <FiEdit size={13} />
                                </button>
                                <button className="btn btn-ghost btn-sm danger" onClick={() => handleDeleteClick(sub)}>
                                  <FiTrash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </span>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCategory ? '✏️ Edit Category' : '➕ Add Category'}
        width={550}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Category Name <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={handleNameChange}
              required
              placeholder="e.g. Fresh Fruits"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Slug (Auto-generated)
            </label>
            <input
              type="text"
              className="form-input"
              value={slug}
              readOnly
              disabled
              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--color-bg)', cursor: 'not-allowed', opacity: 0.7 }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Parent Category
            </label>
            <select
              className="form-input form-select"
              value={parentCategory}
              onChange={(e) => setParentCategory(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              <option value="">None (Top Level Category)</option>
              {topLevelCategories
                .filter(c => c._id !== editingCategory?._id)
                .map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
            </select>
            <small style={{ color: 'var(--color-text-secondary)', display: 'block', marginTop: 4 }}>
              Select a parent category if you are creating a subcategory.
            </small>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Description
            </label>
            <textarea
              className="form-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of category items..."
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Category Banner Image
            </label>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div 
                style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: 8, 
                  border: '2px dashed var(--color-border)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'var(--color-bg)',
                  overflow: 'hidden'
                }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <FiImage size={24} style={{ color: 'var(--color-text-muted)' }} />
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="category-image-file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => document.getElementById('category-image-file').click()}
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  Upload File
                </button>
                <small style={{ display: 'block', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                  Maximum 2MB file size (JPG, PNG, WebP)
                </small>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Sort Order
              </label>
              <input
                type="number"
                className="form-input"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                min="0"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label className="form-label" style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', marginTop: 18 }}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--color-primary)' }}
                />
                Is Category Active
              </label>
              <small style={{ color: 'var(--color-text-secondary)', display: 'block', paddingLeft: 26 }}>
                Inactive categories hide from the frontend shop completely.
              </small>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={handleCloseModal} disabled={formLoading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={formLoading || !name.trim()}>
              {formLoading ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </AdminModal>
    </AdminLayoutWrapper>
  );
}
