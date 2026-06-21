import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productApi, categoryApi } from '../../api/productApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { Breadcrumb, LoadingSpinner } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';

export default function AdminEditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

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
  const [isActive, setIsActive] = useState(true);
  const [existingImages, setExistingImages] = useState([]);
  const [removeImages, setRemoveImages] = useState([]); // publicIds to remove
  const [newImages, setNewImages] = useState([]);

  // Specifications
  const [specs, setSpecs] = useState([{ key: '', value: '' }]);

  useEffect(() => {
    Promise.all([
      categoryApi.getCategories(),
      productApi.adminGetProducts({ _id: id }),
    ]).then(([catRes, prodRes]) => {
      setCategories(catRes.data.categories || []);
      const product = prodRes.data.products?.[0];
      if (!product) {
        toast.error('Product not found');
        navigate('/admin/products');
        return;
      }
      setName(product.name || '');
      setDescription(product.description || '');
      setShortDescription(product.shortDescription || '');
      setCategory(product.category?._id || product.category || '');
      setBrand(product.brand || '');
      setPrice(product.price || '');
      setDiscountPrice(product.discountPrice || '');
      setStock(product.stock || '');
      setLowStockThreshold(product.lowStockThreshold || '5');
      setUnit(product.unit || 'piece');
      setTags(product.tags ? product.tags.join(', ') : '');
      setIsFeatured(product.isFeatured || false);
      setIsActive(product.isActive !== false);
      setExistingImages(product.images || []);

      // Specifications prefill
      if (product.specifications && Object.keys(product.specifications).length > 0) {
        setSpecs(Object.entries(product.specifications).map(([k, v]) => ({ key: k, value: v })));
      } else {
        setSpecs([{ key: '', value: '' }]);
      }
    }).catch(() => {
      toast.error('Failed to load data');
    }).finally(() => setLoading(false));
  }, [id, navigate]);

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

  const handleRemoveExistingImage = (publicId) => {
    setRemoveImages([...removeImages, publicId]);
    setExistingImages(existingImages.filter((img) => img.publicId !== publicId));
  };

  const handleNewImagesChange = (e) => {
    setNewImages(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('description', description);
      fd.append('shortDescription', shortDescription);
      fd.append('category', category);
      fd.append('brand', brand);
      fd.append('price', price);
      fd.append('discountPrice', discountPrice || '');
      fd.append('stock', stock);
      fd.append('lowStockThreshold', lowStockThreshold);
      fd.append('unit', unit);
      fd.append('isFeatured', isFeatured);
      fd.append('isActive', isActive);

      const parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
      fd.append('tags', JSON.stringify(parsedTags));

      const formattedSpecs = {};
      specs.forEach((s) => {
        if (s.key.trim() && s.value.trim()) {
          formattedSpecs[s.key.trim()] = s.value.trim();
        }
      });
      fd.append('specifications', JSON.stringify(formattedSpecs));

      // Append image removals
      if (removeImages.length > 0) {
        fd.append('removeImages', JSON.stringify(removeImages));
      }

      // Append new files
      newImages.forEach((file) => {
        fd.append('images', file);
      });

      await productApi.updateProduct(id, fd);
      toast.success('Product updated successfully! 📝');
      navigate('/admin/products');
    } catch (err) {
      toast.error(err.message || 'Failed to update product');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <AdminLayoutWrapper title="Edit Product"><LoadingSpinner fullPage /></AdminLayoutWrapper>;

  return (
    <AdminLayoutWrapper title="Edit Product">
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Products', href: '/admin/products' },
          { label: 'Edit Product' },
        ]}
      />

      <form onSubmit={handleSubmit} style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, padding: 24, maxWidth: 800 }}>
        <div className="form-group">
          <label className="form-label">Product Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
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
            <input className="form-input" value={brand} onChange={(e) => setBrand(e.target.value)} />
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
            <input className="form-input" value={unit} onChange={(e) => setUnit(e.target.value)} />
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
          <input className="form-input" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Full Description <span style={{ color: 'var(--color-error)' }}>*</span></label>
          <textarea className="form-input" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>

        <div className="form-group">
          <label className="form-label">Tags (comma-separated)</label>
          <input className="form-input" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>

        {/* Existing Images */}
        {existingImages.length > 0 && (
          <div className="form-group">
            <label className="form-label">Existing Images</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
              {existingImages.map((img) => (
                <div key={img.publicId} style={{ position: 'relative', width: 80, height: 80, border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                  <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(img.publicId)}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Add More Images</label>
          <input type="file" className="form-input" multiple accept="image/*" onChange={handleNewImagesChange} />
        </div>

        {/* Specifications */}
        <div style={{ marginBottom: 24 }}>
          <label className="form-label" style={{ fontWeight: 700, display: 'block', marginBottom: 12 }}>Specifications</label>
          {specs.map((s, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                value={s.key}
                onChange={(e) => handleSpecChange(idx, 'key', e.target.value)}
                placeholder="Key"
              />
              <input
                className="form-input"
                style={{ flex: 1 }}
                value={s.value}
                onChange={(e) => handleSpecChange(idx, 'value', e.target.value)}
                placeholder="Value"
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

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              id="isFeatured"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="isFeatured" style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Feature on homepage</label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="isActive" style={{ fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Active (Visible to customers)</label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 32 }}>
          <Link to="/admin/products" className="btn btn-ghost" disabled={submitLoading}>
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={submitLoading}>
            {submitLoading ? 'Updating...' : 'Save Product changes'}
          </button>
        </div>
      </form>
    </AdminLayoutWrapper>
  );
}
