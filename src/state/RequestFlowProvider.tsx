import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { RequestDetailDialog } from "@/components/RequestDetailDialog";
import { RequestWizard } from "@/components/RequestWizard";
import { getAvailability, getDayAvailability, pickCollector } from "@/data/availability";
import { RequestFlowContext, useRequests, useScheduleInput, useSession, useToast, type RequestFlowValue } from "./contexts";
import { useRequestOperations } from "./useRequestOperations";
import type { MaterialId } from "@/types";

/** Monta el asistente "Solicitar recojo" y el detalle de pedido, accesibles desde cualquier pantalla. */
export function RequestFlowProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const announce = useToast();
  const { session, actor, actorsById } = useSession();
  const { requests, createRequest } = useRequests();
  const { run } = useRequestOperations();
  const contextFor = useScheduleInput();
  const [today] = useState(() => new Date());
  // `key` cambia en cada apertura para que el asistente empiece siempre en el paso 1.
  const [wizard, setWizard] = useState<{ key: number; material?: MaterialId } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const openWizard = useCallback((material?: MaterialId) => setWizard({ key: Date.now(), material }), []);
  const openDetail = useCallback((id: string) => setDetailId(id), []);
  const value = useMemo<RequestFlowValue>(() => ({ openWizard, openDetail }), [openWizard, openDetail]);

  const detail = detailId ? requests.find((r) => r.id === detailId) : undefined;

  return (
    <RequestFlowContext.Provider value={value}>
      {children}

      {wizard && actor && session?.role === "comercio" && (
        <RequestWizard
          key={wizard.key}
          actor={actor}
          days={getAvailability(today, contextFor(actor.zone))}
          today={today}
          initialMaterial={wizard.material}
          onClose={() => setWizard(null)}
          onEditAddress={() => {
            setWizard(null);
            navigate("/perfil");
          }}
          onSubmit={async (input) => {
            // Se recalcula al confirmar: otro comercio pudo tomar el último cupo.
            const ctx = contextFor(actor.zone);
            const collectorId = pickCollector(getDayAvailability(input.scheduledDate, ctx), input.slotId, ctx.requests, ctx.schedule.stopsPerCollector);
            if (!collectorId) throw new Error("Ese horario se acaba de llenar. Elige otro.");
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
