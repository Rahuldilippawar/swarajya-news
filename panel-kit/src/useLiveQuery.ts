"use client";

import { onSnapshot, type DocumentReference, type Query } from "firebase/firestore";
import { useEffect, useState, type DependencyList } from "react";
import { errorMessage } from "./functions";

export interface LiveResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Subscribes to a Firestore query and returns its documents, re-subscribing
 * when `deps` change. Return `null` from `build` to skip (e.g. while a parent
 * selection is empty).
 */
export function useLiveQuery<T>(build: () => Query | null, deps: DependencyList): LiveResult<T[]> {
  const [state, setState] = useState<LiveResult<T[]>>({ data: null, error: null });

  useEffect(() => {
    const q = build();
    if (!q) {
      setState({ data: [], error: null });
      return;
    }
    setState((s) => ({ data: s.data, error: null }));
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => d.data() as T), error: null }),
      (err) => setState({ data: null, error: errorMessage(err) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

/** Subscribes to a single document; `data` is null while loading or if it does not exist. */
export function useLiveDoc<T>(build: () => DocumentReference | null, deps: DependencyList): LiveResult<T> & { exists: boolean | null } {
  const [state, setState] = useState<LiveResult<T> & { exists: boolean | null }>({ data: null, error: null, exists: null });

  useEffect(() => {
    const ref = build();
    if (!ref) return;
    return onSnapshot(
      ref,
      (snap) => setState({ data: snap.exists() ? (snap.data() as T) : null, error: null, exists: snap.exists() }),
      (err) => setState({ data: null, error: errorMessage(err), exists: null }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
