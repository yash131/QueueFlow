import { useEffect, useRef, useState } from "react";

/**
 * usePolling(fetchFn, intervalMs)
 * - Calls fetchFn immediately, then every intervalMs.
 * - Returns { data, loading, error, refetch }.
 * - Safe against unmount and overlapping calls.
 */
export function usePolling(fetchFn, intervalMs = 2500, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const inFlight = useRef(false);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const run = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetchRef.current();
      if (mountedRef.current) {
        setData(res);
        setError(null);
      }
    } catch (e) {
      if (mountedRef.current) setError(e);
    } finally {
      inFlight.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    run();
    const id = setInterval(run, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);

  return { data, loading, error, refetch: run };
}
