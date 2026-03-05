import React, { useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

// ─── Pagination bileşeni ──────────────────────────────────────────
// useMemo kullanımı örneği: sayfa numaralarını hesaplamak için

const Pagination = ({ pagination, onPageChange }) => {
  const { total, page, limit, totalPages, hasNextPage, hasPrevPage } = pagination;

  // Sayfa numaralarını hesapla — useMemo ile gereksiz hesaplamayı önle
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Elipsis mantığı: [1, ..., 4, 5, 6, ..., 10]
    const pages = [];
    if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
    }
    return pages;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <span className="pagination-info">
        {start}–{end} / {total} kayıt
      </span>

      <div className="pagination-controls">
        <button
          className="page-btn"
          onClick={() => onPageChange(1)}
          disabled={!hasPrevPage}
          title="İlk sayfa"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          className="page-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
          title="Önceki sayfa"
        >
          <ChevronLeft size={16} />
        </button>

        {pageNumbers.map((num, idx) =>
          num === '...' ? (
            <span key={`ellipsis-${idx}`} className="page-ellipsis">…</span>
          ) : (
            <button
              key={num}
              className={`page-btn ${page === num ? 'active' : ''}`}
              onClick={() => onPageChange(num)}
            >
              {num}
            </button>
          )
        )}

        <button
          className="page-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          title="Sonraki sayfa"
        >
          <ChevronRight size={16} />
        </button>
        <button
          className="page-btn"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage}
          title="Son sayfa"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
