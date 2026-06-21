/** pages/public/SearchPage.jsx */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../../components/product/ProductCard';
import { SkeletonCard, EmptyState, Pagination } from '../../components/common/index.jsx';
import { productApi } from '../../api/productApi';
import { useDebounce } from '../../hooks/useDebounce';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const [inputVal, setInputVal] = useState(query);
  const debouncedInput = useDebounce(inputVal, 400);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (debouncedInput !== query) { setSearchParams({ q: debouncedInput, page: '1' }); }
  }, [debouncedInput]);

  useEffect(() => {
    if (!query) { setProducts([]); return; }
    setLoading(true);
    productApi.getProducts({ q: query, page, limit: 12 })
      .then((r) => { setProducts(r.data.products || []); setTotalPages(r.data.totalPages || 1); setTotalCount(r.data.totalCount || 0); })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [query, page]);

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Search Products</h1>
      <div style={{ position: 'relative', maxWidth: 520, marginBottom: 24 }}>
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>🔍</span>
        <input className="form-input" style={{ paddingLeft: 44, fontSize: 16 }} placeholder="Search for products…" value={inputVal} onChange={(e) => setInputVal(e.target.value)} autoFocus />
      </div>
      {query && <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 20 }}>{totalCount} results for "<strong>{query}</strong>"</p>}
      {loading ? (
        <div className="products-grid">{Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : !query ? (
        <EmptyState icon="🔍" title="Start typing to search" description="Find products by name, category or brand" />
      ) : products.length === 0 ? (
        <EmptyState icon="😕" title={`No results for "${query}"`} description="Try different keywords or browse all products" action={<a href="/products" className="btn btn-primary">Browse All Products</a>} />
      ) : (
        <>
          <div className="products-grid">{products.map((p) => <ProductCard key={p._id} product={p} />)}</div>
          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setSearchParams({ q: query, page: p })} />
        </>
      )}
    </div>
  );
}
