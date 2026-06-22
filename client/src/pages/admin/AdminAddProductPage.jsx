import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { productApi, categoryApi } from '../../api/productApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { Breadcrumb } from '../../components/common/index.jsx';
import toast from 'react-hot-toast';
import { FiX, FiPlus, FiUploadCloud, FiTag } from 'react-icons/fi';

export default function AdminAddProductPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // Upload Images
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  useEffect(() => {
    categoryApi.getCategories()
      .then((res) => {
        const list = res.data.categories || [];
        setCategories(list);
        if (list.length > 0) setCategory(list[0]._id);
      }).catch(() => {});
  }, []);

  // Auto-generate SKU based on product name
  useEffect(() => {
    if (name.trim()) {
      const code = name.toUpperCase().slice(0, 3).replace(/[^A-Z]/g, 'PRD');
      const random = Math.floor(1000 + Math.random() * 9000);
      setSku(`${code}-${random}`);
    } else {
      setSku('');
    }
  }, [name]);

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

  // Image Selection and Previews
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 5) {
      toast.error('You can upload a maximum of 5 images');
      return;
    }
    const nextImages = [...images, ...files];
    setImages(nextImages);

    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...previews]);
  };

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const moveImage = (index, direction) => {
    const nextIdx = index + direction;
    if (nextIdx < 0 || nextIdx >= images.length) return;

    const updatedImgs = [...images];
    const tempImg = updatedImgs[index];
    updatedImgs[index] = updatedImgs[nextIdx];
    updatedImgs[nextIdx] = tempImg;
    setImages(updatedImgs);

    const updatedPrevs = [...imagePreviews];
    const tempPrev = updatedPrevs[index];
    updatedPrevs[index] = updatedPrevs[nextIdx];
    updatedPrevs[nextIdx] = tempPrev;
    setImagePreviews(updatedPrevs);
  };

  const handleSubmit = async (e, saveAsDraft = false) => {
    if (e) e.preventDefault();
    if (!category) {
      toast.error('Please select a category');
      return;
    }
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('description', description.trim());
      fd.append('shortDescription', shortDescription.trim());
      fd.append('category', category);
      fd.append('brand', brand.trim());
      fd.append('price', price);
      if (discountPrice) fd.append('discountPrice', discountPrice);
      fd.append('stock', stock);
      fd.append('lowStockThreshold', lowStockThreshold);
      fd.append('unit', unit);
      fd.append('sku', sku.trim());
      fd.append('isFeatured', isFeatured);
      fd.append('isActive', saveAsDraft ? false : isActive);

      fd.append('tags', JSON.stringify(tagList));

      const formattedSpecs = [];
      specs.forEach((s) => {
        if (s.key.trim() && s.value.trim()) {
          formattedSpecs.push({ key: s.key.trim(), value: s.value.trim() });
        }
      });
      fd.append('specifications', JSON.stringify(formattedSpecs));

      images.forEach((file) => {
        fd.append('images', file);
      });

      await productApi.createProduct(fd);
      toast.success(saveAsDraft ? 'Product saved as draft!' : 'Product published successfully! 🚀');
      navigate('/admin/products');
    } catch (err) {
      toast.error(err.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  // Discount calculation
  const priceNum = parseFloat(price);
  const discNum = parseFloat(discountPrice);
  const discountPercent = (priceNum && discNum && discNum < priceNum)
    ? Math.round(((priceNum - discNum) / priceNum) * 100)
    : 0;

  return (
    <AdminLayoutWrapper title="Add New Product">
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Products', href: '/admin/products' },
          { label: 'Add Product' },
        ]}
      />

      <form onSubmit={(e) => handleSubmit(e, false)} style={{ display: 'grid', gridTemplateColumns: '1fr', lgDirection: 'row', gridTemplateColumns: '1.8fr 1.2fr', gap: 32, alignItems: 'flex-start' }}>
        
        {/* Left Column: Main Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>General Details</h3>
            
            <div className="form-group">
              <label className="form-label">Product Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Organic Gala Apples" />
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
                <input className="form-input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Farm Fresh" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Short Summary</label>
              <input className="form-input" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="A one-line preview of the item details" />
            </div>

            <div className="form-group">
              <label className="form-label">Full Description <span style={{ color: 'var(--color-error)' }}>*</span></label>
              <textarea className="form-input" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="Describe product details, source location, health benefits etc." />
            </div>

            {/* Enter Key Chip tags creator */}
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

          {/* Specifications Card */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Specifications</h3>
            {specs.map((s, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'center' }}>
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  value={s.key}
                  onChange={(e) => handleSpecChange(idx, 'key', e.target.value)}
                  placeholder="Key (e.g. Weight, Pack Size)"
                />
                <input
                  className="form-input"
                  style={{ flex: 1 }}
                  value={s.value}
                  onChange={(e) => handleSpecChange(idx, 'value', e.target.value)}
                  placeholder="Value (e.g. 1 kg, Pack of 4)"
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

        {/* Right Column: Pricing, Inventory & Upload */}
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
              <label className="form-label">SKU (Auto generated)</label>
              <input className="form-input" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Auto generated SKU" />
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

          {/* Drag & Drop File Upload Card */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>Product Images</h3>
            
            <div
              onClick={() => document.getElementById('product-images-input').click()}
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
              <div style={{ fontWeight: 700, fontSize: 13 }}>Click to select images</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>Maximum 5 images, JPG/PNG/WEBP only</div>
              <input
                type="file"
                id="product-images-input"
                style={{ display: 'none' }}
                multiple
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>

            {/* Image Previews with Ordering & Removal */}
            {imagePreviews.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--color-text-secondary)' }}>Selected Previews (first image is main):</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, border: '1px solid var(--color-border)', borderRadius: 8, background: '#f8fafc' }}>
                      <img src={src} alt="Preview" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4 }} />
                      <div style={{ flex: 1, fontSize: 12, fontWeight: idx === 0 ? 800 : 500, color: idx === 0 ? 'var(--color-primary)' : 'var(--color-text)' }}>
                        {idx === 0 ? '🏆 Main Image' : `Image ${idx + 1}`}
                      </div>
                      
                      {/* Control buttons */}
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button type="button" onClick={() => moveImage(idx, -1)} disabled={idx === 0} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>▲</button>
                        <button type="button" onClick={() => moveImage(idx, 1)} disabled={idx === images.length - 1} className="btn btn-ghost btn-sm" style={{ padding: 6 }}>▼</button>
                        <button type="button" onClick={() => handleRemoveImage(idx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer', padding: 6, fontWeight: 'bold' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
            <Link to="/admin/products" className="btn btn-ghost" disabled={loading}>
              Cancel
            </Link>
            <button type="button" onClick={() => handleSubmit(null, true)} className="btn btn-outline" disabled={loading}>
              Save as Draft
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Publishing...' : 'Publish Product'}
            </button>
          </div>
        </div>
      </form>
    </AdminLayoutWrapper>
  );
}
