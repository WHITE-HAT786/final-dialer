import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The single loader every data screen uses. It exposes the honest three states
 * the "no mock data" rule requires:
 *   loading      -> first fetch in flight (show a spinner)
 *   error        -> the request failed (show "… unavailable", never fake zeros)
 *   data === []  -> the backend returned an empty result (show an empty state)
 *
 * It NEVER converts a failure into a value. `refresh()` drives pull-to-refresh.
 */
export type ApiData<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
};

export function useApiData<T>(loader: () => Promise<T>, deps: unknown[] = []): ApiData<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const alive = useRef(true);

  const run = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const d = await loaderRef.current();
      if (alive.current) setData(d);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      if (alive.current) setError(msg);
    } finally {
      if (alive.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const refresh = useCallback(() => { void run(true); }, [run]);

  useEffect(() => {
    alive.current = true;
    void run(false);
    return () => { alive.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, refreshing, error, refresh };
}
