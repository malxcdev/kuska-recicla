import { useCallback, useMemo } from "react";
import { getDayAvailability, pickCollector } from "@/data/availability";
import type { RequestAction } from "@/data/requestActions";
import { useRequests, useScheduleInput, useSession, useToast } from "./contexts";
import type { PickupRequest } from "@/types";

export interface ReleaseResult {
  request: PickupRequest;
  next: string | null;
  error?: string;
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "No se pudo completar la acción.");

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
        // Se usa la versión más reciente del pedido; si ya cambió de estado, no se toca.
        const current = pool.find((r) => r.id === request.id);
        if (!current || current.status !== "asignado") {
          results.push({ request, next: null, error: `${request.id} ya no está asignado.` });
          continue;
        }
        const others = pool.filter((r) => r.id !== current.id);
        const ctx = contextFor(current.zone, others);
        const day = getDayAvailability(current.scheduledDate, ctx);
        const next = pickCollector(day, current.slotId, others, ctx.schedule.stopsPerCollector, current.collectorId);
        try {
          await reassign(current.id, next);
        } catch (error) {
          results.push({ request, next: null, error: errorMessage(error) });
          continue;
        }
        pool = pool.map((r): PickupRequest => (r.id === current.id ? { ...r, collectorId: next, status: next ? "asignado" : "solicitado" } : r));
        results.push({ request, next });
      }
      return results;
    },
    [requests, contextFor, reassign],
  );

  const describeRelease = useCallback(
    ({ request, next, error }: ReleaseResult) => {
      if (error) return error;
      return next ? `Reasignamos ${request.id} a ${actorsById.get(next)?.name ?? "otro reciclador"}.` : `${request.id} volvió a la lista de disponibles de la zona.`;
    },
    [actorsById],
  );

  const run = useCallback(
    async (request: PickupRequest, action: RequestAction) => {
      // Los errores se avisan al usuario y no se relanzan; quien llama libera su estado "ocupado".
      try {
        if (action.id === "liberar") {
          const [result] = await releaseMany([request]);
          announce(describeRelease(result));
          return;
        }
        await updateStatus(request.id, action.nextStatus, action.collectorId);
        announce(action.successMessage);
      } catch (error) {
        announce(errorMessage(error));
      }
    },
    [releaseMany, describeRelease, updateStatus, announce],
  );

  return useMemo(() => ({ run, releaseMany, describeRelease }), [run, releaseMany, describeRelease]);
}
