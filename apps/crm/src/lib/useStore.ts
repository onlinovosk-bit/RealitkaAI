import { useEffect, useState } from "react";

export function useStore<T>(store: { get: () => T | null; subscribe: (listener: () => void) => () => void; }) {
  const [data, setData] = useState<T | null>(store.get());

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setData(store.get());
    });
    return unsubscribe;
  }, [store]);

  return data;
}
