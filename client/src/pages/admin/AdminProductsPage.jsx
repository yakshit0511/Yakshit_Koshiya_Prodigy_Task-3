import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productApi, categoryApi } from '../../api/productApi';
import AdminLayoutWrapper from '../../components/layout/AdminLayoutWrapper';
import DataTable from '../../components/common/DataTable';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';
import { LoadingSpinner } from '../../components/common/index.jsx';
import { FiPlus, FiEdit, FiTrash2, FiToggleLeft, FiToggleRight, FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminProductsPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  const [filterStock, setFilterStock] = useState('all'); // all, ok, low, out

  // Confirm delete states
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = async () => {
    try {
      const prodRes = await productApi.adminGetProducts({ limit: 1000 });
      setAllProducts(prodRes.data.products || []);

      const catRes = await categoryApi.getCategories();
      setCategories(catRes.data.categories || []);
    } catch (err) {
      toast.error('Failed to load products list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleActive = async (product) => {
    try {
      const nextActive = !product.isActive;
      await productApi.updateProduct(product._id, { isActive: nextActive });
      toast.success(`"${product.name}" is now ${nextActive ? 'Active' : 'Inactive'}`);
      
      // Update local state
      setAllProducts(prev => prev.map(p => p._id === product._id ? { ...p, isActive: nextActive } : p));
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  const handleToggleFeatured = async (product) => {
    try {
      const nextFeatured = !product.isFeatured;
      await productApi.updateProduct(product._id, { isFeatured: nextFeatured });
      toast.success(`"${product.name}" featured state updated!`);
      
      // Update local state
      setAllProducts(prev => prev.map(p => p._id === product._id ? { ...p, isFeatured: nextFeatured } : p));
    } catch (err) {
      toast.error('Failed to toggle featured banner');
    }
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await productApi.deleteProduct(deleteId);
      toast.success('Product deleted successfully! 🗑️');
      setDeleteId(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete product');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkAction = async (ids, action, resetSelection) => {
    const actionText = action === 'delete' ? 'delete' : action === 'activate' ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${actionText} the ${ids.length} selected products?`)) return;

    try {
      if (action === 'delete') {
        await Promise.all(ids.map(id => productApi.deleteProduct(id)));
        toast.success('Selected products deleted successfully!');
      } else if (action === 'activate') {
        await Promise.all(ids.map(id => productApi.updateProduct(id, { isActive: true })));
        toast.success('Selected products activated!');
      } else {
        await Promise.all(ids.map(id => productApi.updateProduct(id, { isActive: false })));
        toast.success('Selected products deactivated!');
      }
      resetSelection();
      fetchData();
    } catch (err) {
      toast.error(`Failed to execute bulk ${actionText} operation`);
    }
  };

  // Stats Counters
  const totalCount = allProducts.length;
  const activeCount = allProducts.filter(p => p.isActive).length;
  const inactiveCount = totalCount - activeCount;
  const lowStockCount = allProducts.filter(p => p.stock <= (p.lowStockThreshold || 5) && p.stock > 0).length;
  const outOfStockCount = allProducts.filter(p => p.stock === 0).length;

  // Filtered Products for Table
  const getFilteredProducts = () => {
    let list = [...allProducts];

    // Category filter
    if (filterCategory !== 'all') {
      list = list.filter(p => p.category?._id === filterCategory);
    }

    // Status filter
    if (filterStatus === 'active') {
      list = list.filter(p => p.isActive);
    } else if (filterStatus === 'inactive') {
      list = list.filter(p => !p.isActive);
    }

    // Stock filter
    if (filterStock === 'out') {
      list = list.filter(p => p.stock === 0);
    } else if (filterStock === 'low') {
      list = list.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5));
    } else if (filterStock === 'ok') {
      list = list.filter(p => p.stock > (p.lowStockThreshold || 5));
    }

    return list;
  };

  const filteredProducts = getFilteredProducts();

  // Columns definition for DataTable
  const columns = [
    {
      key: 'images',
      header: 'Product Image',
      sortable: false,
      render: (val, row) => (
        <img
          src={row.images?.[0]?.url || 'https://via.placeholder.com/48x48?text=Product'}
          alt={row.name}
          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid #f1f5f9' }}
          onError={(e) => { e.target.src = 'https://via.placeholder.com/48x48?text=P'; }}
        />
      )
    },
    {
      key: 'name',
      header: 'Name & SKU',
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{row.name}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
            SKU: {row.sku || 'N/A'}
          </div>
        </div>
      )
    },
    {
      key: 'category.name',
      header: 'Category',
      sortable: true,
      render: (val, row) => row.category?.name || 'N/A'
    },
    {
      key: 'price',
      header: 'Price',
      sortable: true,
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
            ₹{(row.discountPrice || row.price).toLocaleString('en-IN')}
          </div>
          {row.discountPrice && row.discountPrice < row.price && (
            <div style={{ fontSize: 11, textDecoration: 'line-through', color: 'var(--color-text-muted)' }}>
              ₹{row.price.toLocaleString('en-IN')}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'stock',
      header: 'Stock',
      sortable: true,
      render: (val, row) => {
        const isOut = row.stock === 0;
        const isLow = row.stock > 0 && row.stock <= (row.lowStockThreshold || 5);
        return (
          <span style={{
            display: 'inline-flex',
            padding: '4px 10px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            background: isOut ? '#fee2e2' : isLow ? '#fef3c7' : '#dcfce7',
            color: isOut ? '#ef4444' : isLow ? '#d97706' : '#16a34a'
          }}>
            {isOut ? 'Out of Stock' : isLow ? `${row.stock} items (Low)` : `${row.stock} items`}
          </span>
        );
      }
    },
    {
      key: 'isActive',
      header: 'Active',
      sortable: false,
      render: (val, row) => (
        <button onClick={() => handleToggleActive(row)} style={{ fontSize: 22, color: row.isActive ? 'var(--color-primary)' : 'var(--color-text-muted)', cursor: 'pointer' }}>
          {row.isActive ? <FiToggleRight /> : <FiToggleLeft />}
        </button>
      )
    },
    {
      key: 'isFeatured',
      header: 'Featured',
      sortable: false,
      render: (val, row) => (
        <button onClick={() => handleToggleFeatured(row)} style={{ fontSize: 18, color: row.isFeatured ? '#f59e0b' : 'var(--color-text-muted)', cursor: 'pointer' }}>
          <FiStar fill={row.isFeatured ? '#f59e0b' : 'transparent'} />
        </button>
      )
    },
    {
      key: '_id',
      header: 'Actions',
      sortable: false,
      render: (val, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Link to={`/admin/products/${row._id}/edit`} className="btn btn-ghost btn-sm" title="Edit Product">
            <FiEdit size={14} />
          </Link>
          <button onClick={() => handleDeleteClick(row._id)} className="btn btn-ghost btn-sm danger" style={{ color: 'var(--color-error)' }} title="Delete Product">
            <FiTrash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <AdminLayoutWrapper title="Manage Products">
      {/* Header and Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <Link to="/admin/products/add" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <FiPlus /> Add Product
        </Link>
      </div>

      {/* Stats Counters Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Total items</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{totalCount}</div>
        </div>
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase' }}>Active</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{activeCount}</div>
        </div>
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Inactive</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{inactiveCount}</div>
        </div>
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase' }}>Low Stock</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{lowStockCount}</div>
        </div>
        <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-error)', textTransform: 'uppercase' }}>Out of Stock</div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{outOfStockCount}</div>
        </div>
      </div>

      {/* Query Filters Bar */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20
      }}>
        {/* Category Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Category</label>
          <select className="form-input form-select" style={{ padding: '6px 12px', fontSize: 13 }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Status</label>
          <select className="form-input form-select" style={{ padding: '6px 12px', fontSize: 13 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Stock Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>Stock Status</label>
          <select className="form-input form-select" style={{ padding: '6px 12px', fontSize: 13 }} value={filterStock} onChange={(e) => setFilterStock(e.target.value)}>
            <option value="all">All Inventory</option>
            <option value="ok">Well Stocked</option>
            <option value="low">Low Stock Alerts</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Main Table component */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          columns={columns}
          data={filteredProducts}
          loading={loading}
          searchPlaceholder="Search product name, SKU or brand..."
          searchKey={['name', 'sku', 'brand']}
          idKey="_id"
          exportFilename="products_inventory_report.csv"
          bulkActions={(selectedIds, resetSelection) => (
            <>
              <button
                onClick={() => handleBulkAction(selectedIds, 'activate', resetSelection)}
                className="btn btn-outline btn-sm"
                style={{ background: 'transparent', color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
              >
                Activate Selected
              </button>
              <button
                onClick={() => handleBulkAction(selectedIds, 'deactivate', resetSelection)}
                className="btn btn-outline btn-sm"
                style={{ background: 'transparent', color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
              >
                Deactivate Selected
              </button>
              <button
                onClick={() => handleBulkAction(selectedIds, 'delete', resetSelection)}
                className="btn btn-danger btn-sm"
              >
                Delete Selected
              </button>
            </>
          )}
          onSelectionChange={() => {}}
        />
      )}

      {/* Confirm deletion action modal */}
      <ConfirmActionModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action will permanently remove it from catalog and cannot be undone."
        confirmText="Yes, Delete Product"
        loading={deleteLoading}
      />
    </AdminLayoutWrapper>
  );
}
