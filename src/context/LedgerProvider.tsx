import React, { createContext, useContext, useEffect, useState } from "react";
import { initializeLedger, type LedgerServices } from "../bootstrap";
const Context = createContext<LedgerServices | null>(null);
export function LedgerProvider({
  children,
  loading,
  error,
}: {
  children: React.ReactNode;
  loading: React.ReactNode;
  error: (e: unknown, retry: () => void) => React.ReactNode;
}) {
  const [service, setService] = useState<LedgerServices | null>(null),
    [failure, setFailure] = useState<unknown>(null),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setFailure(null);
    initializeLedger().then(
      (s) => {
        if (active) setService(s);
      },
      (e) => {
        if (active) setFailure(e);
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);
  if (failure) return <>{error(failure, () => setAttempt((x) => x + 1))}</>;
  if (!service) return <>{loading}</>;
  return <Context.Provider value={service}>{children}</Context.Provider>;
}
export function useLedger() {
  const service = useContext(Context);
  if (!service) throw new Error("LedgerProvider 내부에서 사용해 주세요.");
  return service;
}
