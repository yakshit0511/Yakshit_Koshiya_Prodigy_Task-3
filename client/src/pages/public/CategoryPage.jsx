import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FiFilter, FiX, FiChevronDown, FiChevronUp, FiGrid, FiList } from 'react-icons/fi';
import ProductCard from '../../components/product/ProductCard';
import { SkeletonCard, EmptyState, Pagination, Modal, Breadcrumb } from '../../components/common/index.jsx';
import { productApi, categoryApi } from '../../api/productApi';
import { useDebounce } from '../../hooks/useDebounce';

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Newest First' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
  { value: '-ratings', label: 'Best Rating' },
  { value: '-numReviews', label: 'Most Popular' },
];

export default function CategoryPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [view, setView] = useState('grid');
  const [sections, setSections] = useState({ price: true, rating: true, stock: true });

  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || '-createdAt';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const rating = searchParams.get('rating') || '';
  const inStock = searchParams.get('inStock') === 'true';

  const [priceMin, setPriceMin] = useState(minPrice);
  const [priceMax, setPriceMax] = useState(maxPrice);
  const debouncedMin = useDebounce(priceMin, 600);
  const debouncedMax = useDebounce(priceMax, 600);

  // Fetch category details
  useEffect(() => {
    setCategoryLoading(true);
    categoryApi.getCategoryBySlug(slug)
      .then((res) => setCategory(res.data.category))
      .catch(() => setCategory(null))
      .finally(() => setCategoryLoading(false));
  }, [slug]);

  const fetchProducts = useCallback(async () => {
    if (!category) return;
    setLoading(true);
    try {
      const params = { page, limit: 12, sort, category: category._id };
      if (debouncedMin) params.minPrice = debouncedMin;
      if (debouncedMax) params.maxPrice = debouncedMax;
      if (rating) params.ratings = { gte: rating };
      if (inStock) params.isInStock = true;
      const res = await productApi.getProducts(params);
      setProducts(res.data.products || []);
      setTotalCount(res.data.totalCount || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (_) {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort, category, debouncedMin, debouncedMax, rating, inStock]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const update = (key, val) => {
    const p = new URLSearchParams(searchParams);
    if (val) p.set(key, val); else p.delete(key);
    p.set('page', '1');
    setSearchParams(p);
  };

  const clearAll = () => {
    setSearchParams({ page: '1', sort });
    setPriceMin('');
    setPriceMax('');
  };

  const activeFilters = [
    minPrice && { key: 'minPrice', label: `Min ₹${minPrice}` },
    maxPrice && { key: 'maxPrice', label: `Max ₹${maxPrice}` },
    rating && { key: 'rating', label: `${rating}+ Stars` },
    inStock && { key: 'inStock', label: 'In Stock' },
  ].filter(Boolean);

  if (categoryLoading) return <SkeletonCard />;
  if (!category) return <EmptyState icon="🏷️" title="Category not found" />;

  const Filters = () => (
    <div className="filter-sidebar">
      <div className="filter-header">
        <h3><FiFilter /> Filters {activeFilters.length > 0 && <span className="badge badge-info">{activeFilters.length}</span>}</h3>
        {activeFilters.length > 0 && (
          <button onClick={clearAll} style={{ fontSize: 12, color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Clear All
          </button>
        )}
      </div>

      {/* Price Range */}
      <div className="filter-section">
        <button className="filter-section-header" onClick={() => setSections(s => ({ ...s, price: !s.price }))}>
          Price Range {sections.price ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {sections.price && (
          <div className="filter-section-body">
            <div className="filter-price-inputs">
              <input className="filter-price-input" placeholder="Min ₹" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} type="number" min="0" />
              <span style={{ color: 'var(--color-text-muted)' }}>–</span>
              <input className="filter-price-input" placeholder="Max ₹" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} type="number" min="0" />
            </div>
          </div>
        )}
      </div>

      {/* Rating */}
      <div className="filter-section">
        <button className="filter-section-header" onClick={() => setSections(s => ({ ...s, rating: !s.rating }))}>
          Rating {sections.rating ? <FiChevronUp /> : <FiChevronDown />}
        </button>
        {sections.rating && (
          <div className="filter-section-body">
            {[4, 3, 2, 1].map((r) => (
              <div key={r} className={`filter-star-row ${rating == r ? 'active' : ''}`} onClick={() => update('rating', rating == r ? '' : r)}>
                {[1, 2, 3, 4, 5].map((s) => <span key={s} style={{ color: s <= r ? '#f59e0b' : '#d1d5db', fontSize: 14 }}>★</span>)}
                <span style={{ fontSize: 12 }}>& above</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In Stock */}
      <div className="filter-section" style={{ border: 'none' }}>
        <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>In Stock Only</span>
          <label style={{ cursor: 'pointer', position: 'relative', display: 'inline-block', width: 40, height: 22 }}>
            <input type="checkbox" checked={inStock} onChange={(e) => update('inStock', e.target.checked ? 'true' : '')} style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{
              position: 'absolute', inset: 0, background: inStock ? 'var(--color-primary)' : '#cbd5e1',
              borderRadius: 11, transition: '0.2s', cursor: 'pointer',
            }}>
              <span style={{ position: 'absolute', left: inStock ? 20 : 2, top: 2, width: 18, height: 18, background: 'white', borderRadius: '50%', transition: '0.2s' }} />
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: category.name }]} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>🏷️ {category.name}</h1>
          {category.description && <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 4, marginBottom: 12 }}>{category.description}</p>}
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{totalCount} products found in this category</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost mobile-only" onClick={() => setFilterOpen(true)}>
            <FiFilter /> Filters {activeFilters.length > 0 && `(${activeFilters.length})`}
          </button>
          <select className="form-input form-select" value={sort} onChange={(e) => update('sort', e.target.value)} style={{ width: 180, padding: '8px 36px 8px 12px' }}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setView('grid')} style={{ padding: '8px 10px', background: view === 'grid' ? 'var(--color-primary)' : 'white', color: view === 'grid' ? 'white' : 'var(--color-text-muted)', border: 'none', cursor: 'pointer' }}><FiGrid /></button>
            <button onClick={() => setView('list')} style={{ padding: '8px 10px', background: view === 'list' ? 'var(--color-primary)' : 'white', color: view === 'list' ? 'white' : 'var(--color-text-muted)', border: 'none', cursor: 'pointer' }}><FiList /></button>
          </div>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {activeFilters.map((f) => (
            <span key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
              {f.label}
              <FiX size={12} onClick={() => update(f.key, '')} style={{ cursor: 'pointer' }} />
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div className="desktop-only" style={{ width: 280, flexShrink: 0, position: 'sticky', top: 120 }}>
          <Filters />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div className="products-grid">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No products found in this category"
              description="Try adjusting your filters or checking other categories."
              action={<button onClick={clearAll} className="btn btn-primary">Clear Filters</button>}
            />
          ) : (
            <div className={view === 'grid' ? 'products-grid' : ''} style={view === 'list' ? { display: 'flex', flexDirection: 'column', gap: 16 } : {}}>
              {products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => update('page', p)} />
        </div>
      </div>

      <Modal isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filters" width={360}>
        <Filters />
      </Modal>
    </div>
  );
}
