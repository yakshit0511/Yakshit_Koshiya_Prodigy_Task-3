import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productApi, categoryApi } from '../../api/productApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { Breadcrumb, LoadingSpinner } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';
import { FiX, FiPlus, FiUploadCloud, FiTag } from 'react-icons/fi';

export default function AdminEditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Left Column States (Main Info)
  const [name, setName] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tagList, setTagList] = useState([]);

  // Right Column States (Pricing & Inventory)
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [unit, setUnit] = useState('piece');
  const [sku, setSku] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Specifications
  const [specs, setSpecs] = useState([{ key: '', value: '' }]);

  // Images state
  const [existingImages, setExistingImages] = useState([]);
  const [removeImages, setRemoveImages] = useState([]); // publicIds to remove
  const [newImages, setNewImages] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);

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
      setSku(product.sku || '');
      setTagList(product.tags || []);
      setIsFeatured(product.isFeatured || false);
      setIsActive(product.isActive !== false);
      setExistingImages(product.images || []);

      // Specifications prefill
      if (product.specifications && Array.isArray(product.specifications) && product.specifications.length > 0) {
        setSpecs(product.specifications.map((s) => ({ key: s.key, value: s.value })));
      } else if (product.specifications && typeof product.specifications === 'object' && Object.keys(product.specifications).length > 0) {
        setSpecs(Object.entries(product.specifications).map(([k, v]) => ({ key: k, value: v })));
      } else {
        setSpecs([{ key: '', value: '' }]);
      }
    }).catch(() => {
      toast.error('Failed to load product data');
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = tagInput.trim();
      if (val && !tagList.includes(val)) {
        setTagList([...tagList, val]);
      }
      setTagInput('');
    }
  };

  const removeTag = (t) => {
    setTagList(tagList.filter(item => item !== t));
  };

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
    const files = Array.from(e.target.files);
    if (existingImages.length + newImages.length + files.length > 5) {
      toast.error('You can upload a maximum of 5 images in total');
      return;
    }
    const nextImages = [...newImages, ...files];
    setNewImages(nextImages);

    const previews = files.map(file => URL.createObjectURL(file));
    setNewPreviews([...newPreviews, ...previews]);
  };

  const handleRemoveNewImage = (index) => {
    setNewImages(newImages.filter((_, i) => i !== index));
    setNewPreviews(newPreviews.filter((_, i) => i !== index));
  };

  // Reorder existing images
  const moveExistingImage = (index, direction) => {
    const nextIdx = index + direction;
    if (nextIdx < 0 || nextIdx >= existingImages.length) return;

    const updated = [...existingImages];
    const temp = updated[index];
    updated[index] = updated[nextIdx];
    updated[nextIdx] = temp;
    setExistingImages(updated);
  };

  const handleSubmit = async (e, saveAsDraft = false) => {
    if (e) e.preventDefault();
    setSubmitLoading(true);

    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('description', description.trim());
      fd.append('shortDescription', shortDescription.trim());
      fd.append('category', category);
      fd.append('brand', brand.trim());
      fd.append('price', price);
      fd.append('discountPrice', discountPrice || '');
      fd.append('stock', stock);
      fd.append('lowStockThreshold', lowStockThreshold);
      fd.append('unit', unit);
      fd.append('sku', sku.trim());
      fd.append('isFeatured', isFeatured);
      fd.append('isActive', saveAsDraft ? false : isActive);

      fd.append('tags', JSON.stringify(tagList));

      // Existing images ordered list send or save
      fd.append('existingImages', JSON.stringify(existingImages));

      const formattedSpecs = [];
      specs.forEach((s) => {
        if (s.key.trim() && s.value.trim()) {
          formattedSpecs.push({ key: s.key.trim(), value: s.value.trim() });
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
      toast.success(saveAsDraft ? 'Product saved as draft!' : 'Product updated successfully! 📝');
      navigate('/admin/products');
    } catch (err) {
      toast.error(err.message || 'Failed to update product');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <AdminLayoutWrapper title="Edit Product"><LoadingSpinner /></AdminLayoutWrapper>;

  // Discount calculation
  const priceNum = parseFloat(price);
  const discNum = parseFloat(discountPrice);
  const discountPercent = (priceNum && discNum && discNum < priceNum)
    ? Math.round(((priceNum - discNum) / priceNum) * 100)
    : 0;

  return (
    <AdminLayoutWrapper title="Edit Product">
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Products', href: '/admin/products' },
          { label: 'Edit Product' },
        ]}
      />

      <form onSubmit={(e) => handleSubmit(e, false)} style={{ display: 'grid', gridTemplateColumns: '1fr', lgDirection: 'row', gridTemplateColumns: '1.8fr 1.2fr', gap: 32, alignItems: 'flex-start' }}>
        
        {/* Left Column: General & Specs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>General Details</h3>
            
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
                <label className="form-label">Brand</label>
                <input className="form-input" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Short Summary</label>
              <input className="form-input" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Full Description <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <textarea className="form-input" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} required />
            </div>

            {/* Chips tags input */}
            <div className="form-group">
              <label className="form-label">Tags (Type and press Enter)</label>
              <input
                className="form-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Type tag name and press enter..."
              />
              {tagList.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {tagList.map((tag) => (
                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                      <FiTag size={12} /> {tag}
                      <button type="button" onClick={() => removeTag(tag)} style={{ color: 'var(--color-primary-dark)', cursor: 'pointer', border: 'none', background: 'none', fontWeight: 'bold' }}>✕</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Specifications */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Specifications</h3>
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
        </div>

        {/* Right Column: Pricing, Inventory & Images */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Pricing & Stock Details */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Pricing & Inventory</h3>
            
            <div className="form-group">
              <label className="form-label">Original Price (₹) <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input type="number" className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} required min="0" />
            </div>

            <div className="form-group">
              <label className="form-label">Discount Price (₹, optional)</label>
              <input type="number" className="form-input" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} min="0" />
              {discountPercent > 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-success)', fontWeight: 700 }}>
                  Calculated Discount: {discountPercent}% OFF
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Stock <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input type="number" className="form-input" value={stock} onChange={(e) => setStock(e.target.value)} required min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Low Threshold</label>
                <input type="number" className="form-input" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} min="1" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">SKU</label>
              <input className="form-input" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Unit</label>
              <select className="form-input form-select" value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="piece">piece</option>
                <option value="kg">kg</option>
                <option value="packet">packet</option>
                <option value="dozen">dozen</option>
                <option value="box">box</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} style={{ width: 18, height: 18 }} />
                <label htmlFor="isActive" style={{ fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Active (Visible to customers)</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="isFeatured" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} style={{ width: 18, height: 18 }} />
                <label htmlFor="isFeatured" style={{ fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Feature on homepage banner</label>
              </div>
            </div>
          </div>

          {/* Product Images */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Product Images</h3>
            
            {/* Existing Images list */}
            {existingImages.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label className="form-label">Existing Images (first is main):</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {existingImages.map((img, idx) => (
                    <div key={img.publicId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, border: '1px solid var(--color-border)', borderRadius: 8, background: '#f8fafc' }}>
                      <img src={img.url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                      <div style={{ flex: 1, fontSize: 12, fontWeight: idx === 0 ? 800 : 500, color: idx === 0 ? 'var(--color-primary)' : 'var(--color-text)' }}>
                        {idx === 0 ? '🏆 Main Image' : `Image ${idx + 1}`}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button type="button" onClick={() => moveExistingImage(idx, -1)} disabled={idx === 0} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>▲</button>
                        <button type="button" onClick={() => moveExistingImage(idx, 1)} disabled={idx === existingImages.length - 1} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>▼</button>
                        <button type="button" onClick={() => handleRemoveExistingImage(img.publicId)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', padding: 4, fontWeight: 'bold' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dropzone for adding more */}
            <div
              onClick={() => document.getElementById('edit-images-input').click()}
              style={{
                border: '2px dashed var(--color-border)',
                borderRadius: 12,
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: '#f8fafc',
                transition: 'border-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            >
              <FiUploadCloud size={32} color="var(--color-text-secondary)" style={{ marginBottom: 10 }} />
              <div style={{ fontWeight: 700, fontSize: 13 }}>Click to upload more images</div>
              <input
                type="file"
                id="edit-images-input"
                style={{ display: 'none' }}
                multiple
                accept="image/*"
                onChange={handleNewImagesChange}
              />
            </div>

            {/* New Previews list */}
            {newPreviews.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <label className="form-label">Newly Selected Images:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {newPreviews.map((src, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, border: '1px solid var(--color-border)', borderRadius: 8, background: '#f8fafc' }}>
                      <img src={src} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                      <span style={{ flex: 1, fontSize: 12 }}>New Image {idx + 1}</span>
                      <button type="button" onClick={() => handleRemoveNewImage(idx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', padding: 4, fontWeight: 'bold' }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
            <Link to="/admin/products" className="btn btn-ghost" disabled={submitLoading}>
              Cancel
            </Link>
            <button type="button" onClick={() => handleSubmit(null, true)} className="btn btn-outline" disabled={submitLoading}>
              Save as Draft
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitLoading}>
              {submitLoading ? 'Saving...' : 'Update Product'}
            </button>
          </div>
        </div>
      </form>
    </AdminLayoutWrapper>
  );
}
