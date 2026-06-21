// hooks/usePagination.js
import { useState } from 'react';
export const usePagination = (initialPage = 1, initialLimit = 12) => {
  const [page, setPage] = useState(initialPage);
  const [limit] = useState(initialLimit);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const goToPage = (p) => setPage(Math.max(1, Math.min(p, totalPages)));
  const nextPage = () => goToPage(page + 1);
  const prevPage = () => goToPage(page - 1);
  const reset = () => setPage(1);
  return { page, limit, totalPages, totalCount, setTotalPages, setTotalCount, goToPage, nextPage, prevPage, reset, hasNext: page < totalPages, hasPrev: page > 1 };
};
