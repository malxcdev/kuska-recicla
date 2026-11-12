import { useCallback } from "react";
import { getDayAvailability, pickCollector } from "@/data/availability";
import type { RequestAction } from "@/data/requestActions";
import { useRequests, useScheduleInput, useSession, useToast } from "./contexts";
import type { PickupRequest } from "@/types";

export interface ReleaseResult {
  request: PickupRequest;
  next: string | null;
}

/** Ejecuta acciones sobre pedidos, incluida la liberación con reasignación automática. */
export function useRequestOperations() {
  const { actorsById } = useSession();
  const { requests, updateStatus, reassign } = useRequests();
  const contextFor = useScheduleInput();
  const announce = useToast();

  /** Libera pedidos uno por uno, contando las reasignaciones previas para no sobrecargar a nadie. */
  const releaseMany = useCallback(
    async (list: PickupRequest[]): Promise<ReleaseResult[]> => {
      let pool = requests;
      const results: ReleaseResult[] = [];
      for (const request of list) {
        const others = pool.filter((r) => r.id !== request.id);
        const ctx = contextFor(request.zone, others);
        const day = getDayAvailability(request.scheduledDate, ctx);
        const next = pickCollector(day, request.slotId, others, ctx.schedule.stopsPerCollector, request.collectorId);
        await reassign(request.id, next);
        pool = pool.map((r): PickupRequest => (r.id === request.id ? { ...r, collectorId: next, status: next ? "asignado" : "solicitado" } : r));
        results.push({ request, next });
      }
      return results;
    },
    [requests, contextFor, reassign],
  );

  const describeRelease = useCallback(
    ({ request, next }: ReleaseResult) =>
      next ? `Reasignamos ${request.id} a ${actorsById.get(next)?.name ?? "otro reciclador"}.` : `${request.id} volvió a la lista de disponibles de la zona.`,
    [actorsById],
  );

  const run = useCallback(
    async (request: PickupRequest, action: RequestAction) => {
      if (action.id === "liberar") {
        const [result] = await releaseMany([request]);
        announce(describeRelease(result));
        return;
      }
      await updateStatus(request.id, action.nextStatus, action.collectorId);
      announce(action.successMessage);
    },
    [releaseMany, describeRelease, updateStatus, announce],
  );

  return { run, releaseMany, describeRelease };
}
