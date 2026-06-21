import { useState, useEffect } from 'react';
import { categoryApi } from '../../api/productApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { LoadingSpinner, ConfirmModal } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null); // null means adding
  const [formLoading, setFormLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentCategory, setParentCategory] = useState('');

  const fetchCategories = () => {
    setLoading(true);
    categoryApi.getCategories()
      .then((res) => setCategories(res.data.categories || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEditClick = (cat) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setDescription(cat.description || '');
    setParentCategory(cat.parentCategory?._id || cat.parentCategory || '');
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setParentCategory('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setFormLoading(true);

    const payload = {
      name: name.trim(),
      description: description.trim(),
      parentCategory: parentCategory || null,
    };

    try {
      if (editingCategory) {
        await categoryApi.updateCategory(editingCategory._id, payload);
        toast.success('Category updated successfully');
      } else {
        await categoryApi.createCategory(payload);
        toast.success('Category created successfully');
      }
      handleCancelEdit();
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category? All subcategories will be updated.')) return;
    try {
      await categoryApi.deleteCategory(id);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to delete category');
    }
  };

  return (
    <AdminLayoutWrapper title="Manage Categories">
      {loading ? (
        <LoadingSpinner fullPage />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 32, alignItems: 'flex-start' }}>
          {/* Categories List */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Name</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Description</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Parent Category</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{c.description || '—'}</td>
                    <td style={{ padding: '16px 20px' }}>{c.parentCategory?.name || '—'}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleEditClick(c)}>
                          ✏️ Edit
                        </button>
                        <button className="btn btn-ghost btn-sm danger" onClick={() => handleDelete(c._id)}>
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Create/Edit Form */}
          <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
              {editingCategory ? '✏️ Edit Category' : '➕ Add Category'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Category Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="E.g., Fresh Fruits" />
              </div>

              <div className="form-group">
                <label className="form-label">Parent Category</label>
                <select className="form-input form-select" value={parentCategory} onChange={(e) => setParentCategory(e.target.value)}>
                  <option value="">None (Top Level Category)</option>
                  {categories.filter(c => c._id !== editingCategory?._id).map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="E.g., Farm fresh citrus fruits and apples" />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                {editingCategory && (
                  <button type="button" className="btn btn-ghost" onClick={handleCancelEdit} disabled={formLoading}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn btn-primary" disabled={formLoading || !name.trim()}>
                  {formLoading ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayoutWrapper>
  );
}
