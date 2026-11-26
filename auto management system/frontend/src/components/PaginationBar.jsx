import React from 'react';

const PaginationBar = ({
  page = 1,
  setPage,
  total = 0,
  limit = 10,
  setLimit,
  label = 'records',
  pageSizeOptions = [10, 25, 50, 100]
}) => {
  const totalPages = Math.ceil(total / limit) || 1;
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
      padding: '14px 20px',
      borderTop: '1px solid var(--border)',
      background: 'rgba(255, 255, 255, 0.01)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{total}</strong> {label}
        </span>
        {setLimit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <span>Rows:</span>
            <select
              value={limit}
              onChange={e => {
                const newLimit = Number(e.target.value);
                setLimit(newLimit);
                setPage(1);
              }}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '4px 8px',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginRight: 4 }}>
          Page {page} of {totalPages}
        </span>
        <button
          className="btn btn-sm btn-outline"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1}
          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
        >
          ← Prev
        </button>
        <button
          className="btn btn-sm btn-outline"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default PaginationBar;
