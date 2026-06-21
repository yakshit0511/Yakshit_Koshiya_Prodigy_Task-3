import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { productApi, categoryApi } from '../../api/productApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { Breadcrumb } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

export default function AdminAddProductPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [unit, setUnit] = useState('piece');
  const [tags, setTags] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [images, setImages] = useState([]);

  // Specifications state: list of key-value objects
  const [specs, setSpecs] = useState([{ key: '', value: '' }]);

  useEffect(() => {
    categoryApi.getCategories()
      .then((res) => {
        const list = res.data.categories || [];
        setCategories(list);
        if (list.length > 0) setCategory(list[0]._id);
      }).catch(() => {});
  }, []);

  const handleAddSpec = () => {
    setSpecs([...specs, { key: '', value: '' }]);
  };

  const handleSpecChange = (index, field, val) => {
    const updated = [...specs];
    updated[index][field] = val;
    setSpecs(updated);
  };

  const handleRemoveSpec = (index) => {
    setSpecs(specs.filter((_, i) => i !== index));
  };

  const handleImageChange = (e) => {
    setImages(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category) {
      toast.error('Please select a category');
      return;
    }
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('description', description);
      fd.append('shortDescription', shortDescription);
      fd.append('category', category);
      fd.append('brand', brand);
      fd.append('price', price);
      if (discountPrice) fd.append('discountPrice', discountPrice);
      fd.append('stock', stock);
      fd.append('lowStockThreshold', lowStockThreshold);
      fd.append('unit', unit);
      fd.append('isFeatured', isFeatured);

      // Format tags as json string or array
      const parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
      fd.append('tags', JSON.stringify(parsedTags));

      // Filter empty specs & format as object
      const formattedSpecs = {};
      specs.forEach((s) => {
        if (s.key.trim() && s.value.trim()) {
          formattedSpecs[s.key.trim()] = s.value.trim();
        }
      });
      fd.append('specifications', JSON.stringify(formattedSpecs));

      // Append files
      images.forEach((file) => {
        fd.append('images', file);
      });

      await productApi.createProduct(fd);
      toast.success('Product created successfully! 📦');
      navigate('/admin/products');
    } catch (err) {
      toast.error(err.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayoutWrapper title="Add New Product">
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Products', href: '/admin/products' },
          { label: 'Add Product' },
        ]}
      />

      <form onSubmit={handleSubmit} style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24, maxWidth: 800 }}>
        <div className="form-group">
          <label className="form-label">Product Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="E.g., Organic Bananas" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Category <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <select className="form-input form-select" value={category} onChange={(e) => setCategory(e.target.value)} required>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Brand / Manufacturer</label>
            <input className="form-input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="E.g., FarmFresh" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Price (₹) <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input type="number" className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} required min="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Discount Price (₹)</label>
            <input type="number" className="form-input" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} min="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Unit of Measure</label>
            <input className="form-input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="E.g., kg, piece, packet" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Stock Quantity <span style={{ color: 'var(--color-error)' }}>*</span></label>
            <input type="number" className="form-input" value={stock} onChange={(e) => setStock(e.target.value)} required min="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Low Stock Threshold</label>
            <input type="number" className="form-input" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} min="1" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Short Description</label>
          <input className="form-input" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="A quick summary of the product" />
        </div>

        <div className="form-group">
          <label className="form-label">Full Description <span style={{ color: 'var(--color-error)' }}>*</span></label>
          <textarea className="form-input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Provide details about freshness, source, shelf life..." />
        </div>

        <div className="form-group">
          <label className="form-label">Tags (comma-separated)</label>
          <input className="form-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="E.g., organic, fresh, fruit" />
        </div>

        <div className="form-group">
          <label className="form-label">Product Images</label>
          <input type="file" className="form-input" multiple accept="image/*" onChange={handleImageChange} />
          {images.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
              {images.length} files selected
            </div>
          )}
        </div>

        {/* Specifications Section */}
        <div style={{ marginBottom: 24 }}>
          <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: 12 }}>Specifications</label>
          {specs.map((s, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                value={s.key}
                onChange={(e) => handleSpecChange(idx, 'key', e.target.value)}
                placeholder="Spec Key (e.g., Weight)"
              />
              <input
                className="form-input"
                style={{ flex: 1 }}
                value={s.value}
                onChange={(e) => handleSpecChange(idx, 'value', e.target.value)}
                placeholder="Spec Value (e.g., 500g)"
              />
              <button type="button" className="btn btn-ghost danger" onClick={() => handleRemoveSpec(idx)} style={{ padding: '8px 12px' }}>
                ✕
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm" onClick={handleAddSpec} style={{ marginTop: 8 }}>
            ➕ Add Spec Row
          </button>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            id="isFeatured"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <label htmlFor="isFeatured" style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Feature this product on homepage banner</label>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 32 }}>
          <Link to="/admin/products" className="btn btn-ghost" disabled={loading}>
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Product 🚀'}
          </button>
        </div>
      </form>
    </AdminLayoutWrapper>
  );
}
