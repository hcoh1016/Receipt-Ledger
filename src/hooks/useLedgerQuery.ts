import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../errors';
export function useLedgerQuery<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0), generation = useRef(0);
  useEffect(() => {
    const id = ++generation.current; setLoading(true); setError(''); fetcher().then(value => {
      if (generation.current === id)
        setData(value);
    }, e => {
      if (generation.current === id)
        setError(errorMessage(e));
    }).finally(() => {
      if (generation.current === id)
        setLoading(false);
    }); return () => { generation.current++; };
  }, [fetcher, revision]);
  const retry = useCallback(() => setRevision(r => r + 1), []);
  return { data, error, loading, retry };
}
