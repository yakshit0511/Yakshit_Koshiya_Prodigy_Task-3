import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productApi } from '../../api/productApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import { LoadingSpinner, EmptyState, Pagination } from '../../components/common/index.jsx';
import { FiPlus, FiSearch, FiEdit, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProducts = () => {
    setLoading(true);
    productApi.adminGetProducts({ page, limit: 10, q: search })
      .then((res) => {
        setProducts(res.data.products || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.totalCount || 0);
      }).catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await productApi.deleteProduct(id);
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  return (
    <AdminLayoutWrapper title="Manage Products">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: 1, maxWidth: 400 }}>
          <input
            className="form-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or SKU..."
          />
          <button type="submit" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiSearch /> Search
          </button>
        </form>

        <Link to="/admin/products/add" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiPlus /> Add Product
        </Link>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : products.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No products found"
          description="Click Add Product to start listing items in your store."
        />
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Image</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Name</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>SKU</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Category</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Price</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Stock</th>
                  <th style={{ padding: '16px 20px', fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <img
                        src={p.images?.[0]?.url || 'https://via.placeholder.com/50x50?text=P'}
                        alt={p.name}
                        style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8 }}
                      />
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--color-text-muted)' }}>{p.sku || 'N/A'}</td>
                    <td style={{ padding: '16px 20px' }}>{p.category?.name || 'N/A'}</td>
                    <td style={{ padding: '16px 20px', fontWeight: 700 }}>₹{p.price}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        color: p.stock === 0 ? 'var(--color-error)' : p.stock <= 5 ? '#d97706' : 'var(--color-success)',
                        fontWeight: 700
                      }}>
                        {p.stock === 0 ? 'Out of Stock' : `${p.stock} items`}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <Link to={`/admin/products/${p._id}/edit`} className="btn btn-ghost btn-sm" title="Edit Product">
                          <FiEdit size={16} />
                        </Link>
                        <button onClick={() => handleDelete(p._id)} className="btn btn-ghost btn-sm danger" title="Delete Product">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} />
        </div>
      )}
    </AdminLayoutWrapper>
  );
}
