"use client";

import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchSalesPersons,
  fetchSalesBatches,
  isPersonsCacheFresh,
  isSalesBatchesCacheFresh,
  invalidatePersons,
  invalidateSalesBatches,
} from "@/redux/features/salesData/salesDataSlice";

/** Module-level dedup: prevent double fetch when React Strict Mode remounts */
let personsLastFetchAt = 0;
let batchesLastFetchAt = 0;
const PERSONS_DEDUP_MS = 5000;
const BATCHES_DEDUP_MS = 5000;

/**
 * Hook to get sales persons (counselors) with caching.
 * Only fetches when cache is stale or empty. Use when user can see all persons (manager/super_admin).
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to fetch (e.g. false for non-manager)
 * @param {boolean} options.forceRefresh - Skip cache and refetch
 * @returns {{ persons: Array, loading: boolean, error: string|null, refetch: Function }}
 */
export function useSalesPersons({ enabled = true, forceRefresh = false } = {}) {
  const dispatch = useDispatch();
  const { persons, personsFetchedAt, personsError } = useSelector((state) => state.salesData);
  const cacheFresh = useSelector(isPersonsCacheFresh);
  const loading = useSelector((state) => state.salesData.personsLoading);

  const refetch = useCallback(() => {
    if (enabled) dispatch(fetchSalesPersons());
  }, [dispatch, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const shouldFetch = forceRefresh || !cacheFresh || (persons.length === 0 && !personsError);
    if (shouldFetch && !loading && (forceRefresh || Date.now() - personsLastFetchAt > PERSONS_DEDUP_MS)) {
      personsLastFetchAt = Date.now();
      dispatch(fetchSalesPersons());
    }
  }, [enabled, forceRefresh, cacheFresh, persons.length, personsError, loading, dispatch]);

  return {
    persons,
    loading: loading ?? false,
    error: personsError,
    refetch,
    invalidate: () => dispatch(invalidatePersons()),
  };
}

/**
 * Hook to get sales batches with caching.
 * Only fetches when cache is stale or empty.
 * @param {Object} options
 * @param {boolean} options.forceRefresh - Skip cache and refetch
 * @returns {{ salesBatches: Array, loading: boolean, error: string|null, refetch: Function }}
 */
export function useSalesBatches({ forceRefresh = false } = {}) {
  const dispatch = useDispatch();
  const { salesBatches, salesBatchesFetchedAt, salesBatchesError } = useSelector((state) => state.salesData);
  const cacheFresh = useSelector(isSalesBatchesCacheFresh);
  const loading = useSelector((state) => state.salesData.salesBatchesLoading);

  const refetch = useCallback(() => dispatch(fetchSalesBatches()), [dispatch]);

  useEffect(() => {
    const shouldFetch = forceRefresh || !cacheFresh || (salesBatches.length === 0 && !salesBatchesError);
    if (shouldFetch && !loading && (forceRefresh || Date.now() - batchesLastFetchAt > BATCHES_DEDUP_MS)) {
      batchesLastFetchAt = Date.now();
      dispatch(fetchSalesBatches());
    }
  }, [forceRefresh, cacheFresh, salesBatches.length, salesBatchesError, loading, dispatch]);

  return {
    salesBatches,
    loading: loading ?? false,
    error: salesBatchesError,
    refetch,
    invalidate: () => dispatch(invalidateSalesBatches()),
  };
}
