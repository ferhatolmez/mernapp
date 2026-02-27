import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

// ─── Genel amaçlı pagination hook'u ──────────────────────────────
const usePagination = (endpoint, initialParams = {}) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);

  const fetchData = useCallback(async () => {
    if (!endpoint) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get(endpoint, {
        params: { ...params, page: pagination.page, limit: pagination.limit },
      });

      const { data: responseData } = response.data;

      setData(responseData[Object.keys(responseData)[0]]); // ilk array alanı
      setPagination(responseData.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Veri yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, params, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goToPage = useCallback((page) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const nextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
    }
  }, [pagination.hasNextPage]);

  const prevPage = useCallback(() => {
    if (pagination.hasPrevPage) {
      setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
    }
  }, [pagination.hasPrevPage]);

  const updateParams = useCallback((newParams) => {
    setParams((prev) => ({ ...prev, ...newParams }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Filtre değişince 1. sayfaya dön
  }, []);

  return {
    data,
    pagination,
    isLoading,
    error,
    goToPage,
    nextPage,
    prevPage,
    updateParams,
    refresh: fetchData,
  };
};

export default usePagination;
