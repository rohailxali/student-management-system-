import { useCallback } from "react";
import { useSearch } from "wouter";

/**
 * URL-query-persisted state: search/filter/sort/page values live in the URL
 * so they survive navigation and bookmarking (e.g. ?q=anna&grade=7B&sort=name&order=asc&page=2).
 */
export function useQueryState<T extends string | number>(
  key: string,
  initial: T,
): [T, (value: T) => void] {
  const search = useSearch();

  const current = useCallback((): T => {
    const params = new URLSearchParams(search);
    const raw = params.get(key);
    if (raw === null) return initial;
    if (typeof initial === "number") {
      const n = Number(raw);
      return (Number.isFinite(n) ? n : initial) as T;
    }
    return (raw || initial) as T;
  }, [key, initial, search]);

  const set = useCallback(
    (value: T) => {
      const params = new URLSearchParams(search);
      if (value === "" || value === initial) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
      const next = params.toString();
      window.history.replaceState(
        window.history.state,
        "",
        next ? `${window.location.pathname}?${next}` : window.location.pathname,
      );
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [key, initial, search],
  );

  return [current(), set];
}
