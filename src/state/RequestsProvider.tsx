import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { requestsRepo } from "@/data/repositories";
import { RequestsContext, type RequestsValue } from "./contexts";
import type { NewPickupRequest, PickupRequest, RequestStatus } from "@/types";

export function RequestsProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    requestsRepo.list().then((list) => {
      if (!active) return;
      setRequests(list);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const createRequest = useCallback(async (input: NewPickupRequest, collectorId: string | null) => {
    const created = await requestsRepo.create(input, collectorId);
    setRequests((current) => [created, ...current]);
    return created;
  }, []);

  const updateStatus = useCallback(async (id: string, status: RequestStatus, collectorId?: string) => {
    const updated = await requestsRepo.updateStatus(id, status, collectorId);
    setRequests((current) => current.map((r) => (r.id === id ? updated : r)));
  }, []);

  const reassign = useCallback(async (id: string, collectorId: string | null) => {
    const updated = await requestsRepo.reassign(id, collectorId);
    setRequests((current) => current.map((r) => (r.id === id ? updated : r)));
  }, []);

  const resetDemo = useCallback(async () => {
    setRequests(await requestsRepo.reset());
  }, []);

  const refresh = useCallback(async () => {
    setRequests(await requestsRepo.list());
  }, []);

  const value = useMemo<RequestsValue>(
    () => ({ requests, loading, createRequest, updateStatus, reassign, resetDemo, refresh }),
    [requests, loading, createRequest, updateStatus, reassign, resetDemo, refresh],
  );

  return <RequestsContext.Provider value={value}>{children}</RequestsContext.Provider>;
}
