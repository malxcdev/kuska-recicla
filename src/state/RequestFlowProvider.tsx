import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { RequestDetailDialog } from "@/components/RequestDetailDialog";
import { RequestWizard } from "@/components/RequestWizard";
import { RequestFlowContext, useRequests, useSession, useToast, type RequestFlowValue } from "./contexts";
import type { MaterialId } from "@/types";

/** Monta el asistente "Solicitar recojo" y el detalle de pedido, accesibles desde cualquier pantalla. */
export function RequestFlowProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const announce = useToast();
  const { session, actor, actorsById } = useSession();
  const { requests, createRequest, updateStatus } = useRequests();
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
          requests={requests}
          initialMaterial={wizard.material}
          onClose={() => setWizard(null)}
          onEditAddress={() => {
            setWizard(null);
            navigate("/perfil");
          }}
          onSubmit={async (input) => {
            const created = await createRequest(input);
            setWizard(null);
            navigate("/pedidos");
            announce(`Recojo ${created.id} solicitado. Te avisaremos cuando sea asignado.`);
          }}
        />
      )}

      {detail && session && (
        <RequestDetailDialog
          request={detail}
          session={session}
          actorsById={actorsById}
          onClose={() => setDetailId(null)}
          onAction={async (action) => {
            await updateStatus(detail.id, action.nextStatus, action.collectorId);
            announce(action.successMessage);
          }}
        />
      )}
    </RequestFlowContext.Provider>
  );
}
