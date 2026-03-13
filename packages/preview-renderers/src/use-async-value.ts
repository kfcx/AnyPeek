import { useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  loading: boolean;
  error: string | null;
  value: T | null;
}

export function useAsyncValue<T>(key: string, loader: () => Promise<T>): AsyncState<T> {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const [state, setState] = useState<AsyncState<T>>({
    loading: true,
    error: null,
    value: null
  });

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: null, value: null });

    void loaderRef.current()
      .then((value) => {
        if (active) {
          setState({ loading: false, error: null, value });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : '预览失败。',
            value: null
          });
        }
      });

    return () => {
      active = false;
    };
  }, [key]);

  return state;
}
