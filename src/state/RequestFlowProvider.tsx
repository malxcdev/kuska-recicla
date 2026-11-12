import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { RequestDetailDialog } from "@/components/RequestDetailDialog";
import { RequestWizard } from "@/components/RequestWizard";
import { getAvailability, getDayAvailability, pickCollector } from "@/data/availability";
import { UserFacingError } from "@/data/errors";
import { requestsRepo } from "@/data/repositories";
import { RequestFlowContext, useRequests, useScheduleInput, useSession, useToast, type RequestFlowValue } from "./contexts";
import { useRequestOperations } from "./useRequestOperations";
import type { MaterialId } from "@/types";

/** Monta el asistente "Solicitar recojo" y el detalle de pedido, accesibles desde cualquier pantalla. */
export function RequestFlowProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const announce = useToast();
  const { session, actor, actorsById } = useSession();
  const { requests, createRequest, refresh } = useRequests();
  const { run } = useRequestOperations();
  const contextFor = useScheduleInput();
  // `key` cambia en cada apertura para que el asistente empiece siempre en el paso 1;
  // `today` se fija al abrirlo para que el calendario no quede desfasado si la app pasa la medianoche.
  const [wizard, setWizard] = useState<{ key: number; material?: MaterialId; today: Date } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const openWizard = useCallback((material?: MaterialId) => setWizard({ key: Date.now(), material, today: new Date() }), []);
  const openDetail = useCallback((id: string) => setDetailId(id), []);
  const value = useMemo<RequestFlowValue>(() => ({ openWizard, openDetail }), [openWizard, openDetail]);

  const detail = detailId ? requests.find((r) => r.id === detailId) : undefined;
  const zone = actor?.zone;
  const days = useMemo(() => (wizard && zone ? getAvailability(wizard.today, contextFor(zone)) : []), [wizard, zone, contextFor]);

  return (
    <RequestFlowContext.Provider value={value}>
      {children}

      {wizard && actor && session?.role === "comercio" && (
        <RequestWizard
          key={wizard.key}
          actor={actor}
          days={days}
          today={wizard.today}
          initialMaterial={wizard.material}
          onClose={() => setWizard(null)}
          onEditAddress={() => {
            setWizard(null);
            navigate("/perfil");
          }}
          onSubmit={async (input) => {
            // Se recalcula con los pedidos guardados al confirmar: otro comercio pudo tomar el último cupo.
            const fresh = await requestsRepo.list();
            const ctx = contextFor(actor.zone, fresh);
            const collectorId = pickCollector(getDayAvailability(input.scheduledDate, ctx), input.slotId, ctx.requests, ctx.schedule.stopsPerCollector);
            if (!collectorId) {
              // Actualiza el calendario del formulario con los cupos reales antes de avisar.
              await refresh();
              throw new UserFacingError("Ese horario se acaba de llenar. Elige otro.");
            }
            const created = await createRequest(input, collectorId);
            setWizard(null);
            navigate("/pedidos");
            announce(`Recojo ${created.id} confirmado. Te visitará ${actorsById.get(collectorId)?.name ?? "un reciclador de tu zona"}.`);
          }}
        />
      )}

      {detail && session && (
        <RequestDetailDialog request={detail} session={session} actorsById={actorsById} onClose={() => setDetailId(null)} onAction={(action) => run(detail, action)} />
      )}
    </RequestFlowContext.Provider>
  );
}
