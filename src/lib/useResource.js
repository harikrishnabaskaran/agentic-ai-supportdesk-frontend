import { useEffect, useState, useRef } from "react";
export default function useResource(loader, dependencies = []) {
  const [state, set] = useState({ data: null, loading: true, error: "" });
  const counter = useRef(0);
  useEffect(() => {
    const n = ++counter.current;
    set((s) => ({ ...s, loading: true, error: "" }));
    Promise.resolve()
      .then(loader)
      .then((data) => {
        if (n === counter.current) set({ data, loading: false, error: "" });
      })
      .catch((e) => {
        if (n === counter.current)
          set((s) => ({ ...s, loading: false, error: e.message }));
      });
    return () => {
      counter.current++;
    };
  }, dependencies);
  return state;
}
