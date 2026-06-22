import { useState, useMemo } from 'react';
import { FiSearch, FiDownload, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { SkeletonTable, EmptyState } from './index.jsx';

export default function DataTable({
  columns,
  data = [],
  loading = false,
  searchPlaceholder = 'Search records...',
  searchKey, // key or keys array to filter locally
  bulkActions, // component or function returning bulk options when items are selected
  onSelectionChange, // passes list of selected IDs
  idKey = '_id', // primary key field
  exportFilename = 'export_data.csv',
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('');
  const [sortOrder, setSortOrder] = useState('asc'); // asc | desc
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Clear selections when data changes
  const resetSelection = () => {
    setSelectedIds(new Set());
    if (onSelectionChange) onSelectionChange([]);
  };

  // 1. Local Search Filter
  const filteredData = useMemo(() => {
    if (!searchQuery.trim() || !searchKey) return data;
    const query = searchQuery.toLowerCase();
    const searchKeys = Array.isArray(searchKey) ? searchKey : [searchKey];

    return data.filter((row) => {
      return searchKeys.some((k) => {
        // Resolve nested keys e.g., 'user.name'
        const val = k.split('.').reduce((obj, prop) => obj?.[prop], row);
        return String(val || '').toLowerCase().includes(query);
      });
    });
  }, [data, searchQuery, searchKey]);

  // 2. Local Sort Filter
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aVal = sortKey.split('.').reduce((obj, prop) => obj?.[prop], a);
      const bVal = sortKey.split('.').reduce((obj, prop) => obj?.[prop], b);

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortOrder === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return sorted;
  }, [filteredData, sortKey, sortOrder]);

  // 3. Local Pagination
  const totalPages = Math.ceil(sortedData.length / limit);
  const paginatedData = useMemo(() => {
    const offset = (page - 1) * limit;
    return sortedData.slice(offset, offset + limit);
  }, [sortedData, page, limit]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const visibleIds = paginatedData.map((row) => row[idKey]);
      const next = new Set([...selectedIds, ...visibleIds]);
      setSelectedIds(next);
      if (onSelectionChange) onSelectionChange(Array.from(next));
    } else {
      const visibleIds = paginatedData.map((row) => row[idKey]);
      const next = new Set(selectedIds);
      visibleIds.forEach((id) => next.delete(id));
      setSelectedIds(next);
      if (onSelectionChange) onSelectionChange(Array.from(next));
    }
  };

  const handleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
    if (onSelectionChange) onSelectionChange(Array.from(next));
  };

  // CSV Export Trigger
  const handleExportCSV = () => {
    if (sortedData.length === 0) return;
    const headers = columns.map((col) => col.header).join(',');
    const rows = sortedData.map((row) => {
      return columns.map((col) => {
        const val = col.key.split('.').reduce((obj, prop) => obj?.[prop], row);
        const cell = val === undefined || val === null ? '' : String(val).replace(/"/g, '""');
        return `"${cell}"`;
      }).join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', exportFilename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const allVisibleSelected = paginatedData.length > 0 && paginatedData.every((row) => selectedIds.has(row[idKey]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Search & Export Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        {searchKey && (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', maxWidth: 360 }}>
            <span style={{ position: 'absolute', left: 14, color: 'var(--color-text-muted)', display: 'flex' }}>
              <FiSearch size={16} />
            </span>
            <input
              className="form-input"
              style={{ paddingLeft: 40 }}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); resetSelection(); }}
              placeholder={searchPlaceholder}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={handleExportCSV} disabled={sortedData.length === 0}>
            <FiDownload /> Export CSV
          </button>
        </div>
      </div>

      {/* Bulk actions status panel */}
      {selectedIds.size > 0 && bulkActions && (
        <div style={{
          background: 'var(--color-primary-light)',
          border: '1px solid var(--color-primary)',
          borderRadius: 8,
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
            {selectedIds.size} {selectedIds.size === 1 ? 'item' : 'items'} selected
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {bulkActions(Array.from(selectedIds), resetSelection)}
          </div>
        </div>
      )}

      {/* Main Data Table */}
      {loading ? (
        <SkeletonTable rows={limit} cols={columns.length + (onSelectionChange ? 1 : 0)} />
      ) : sortedData.length === 0 ? (
        <EmptyState icon="🔍" title="No matching records" description="Try clearing search query or filter parameters." />
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                  {onSelectionChange && (
                    <th style={{ padding: '16px 20px', width: 40 }}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer', width: 16, height: 16 }}
                      />
                    </th>
                  )}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => col.sortable !== false && handleSort(col.key)}
                      style={{
                        padding: '16px 20px',
                        fontWeight: 700,
                        cursor: col.sortable !== false ? 'pointer' : 'default',
                        userSelect: 'none',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{col.header}</span>
                        {col.sortable !== false && sortKey === col.key && (
                          sortOrder === 'asc' ? <FiChevronUp /> : <FiChevronDown />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row) => {
                  const id = row[idKey];
                  const isRowSelected = selectedIds.has(id);

                  return (
                    <tr
                      key={id}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: isRowSelected ? '#f8fafc' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      {onSelectionChange && (
                        <td style={{ padding: '16px 20px' }}>
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => handleSelectRow(id)}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key} style={{ padding: '16px 20px', fontSize: 14 }}>
                          {col.render
                            ? col.render(col.key.split('.').reduce((obj, prop) => obj?.[prop], row), row)
                            : col.key.split('.').reduce((obj, prop) => obj?.[prop], row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          {totalPages > 1 && (
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, sortedData.length)} of {sortedData.length} entries
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setPage(i + 1)}
                    style={{ minWidth: 32 }}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
