import { useState } from "react";
import { getAvailableActions } from "@/data/requestActions";
import { useAuthenticated } from "@/state/contexts";
import { useRequestOperations } from "@/state/useRequestOperations";
import type { PickupRequest } from "@/types";

/** Botón con la acción principal del pedido (aceptar, marcar recogido, recibir). "No puedo ir" solo se ofrece en el detalle. */
export function RequestActionButton({ request, className = "inline-action" }: { request: PickupRequest; className?: string }) {
  const { session } = useAuthenticated();
  const { run } = useRequestOperations();
  const [busy, setBusy] = useState(false);
  const action = getAvailableActions(request, session).find((a) => a.id !== "liberar");
  if (!action) return null;

  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await run(request, action);
        } finally {
          setBusy(false);
        }
      }}
    >
      {action.label}
    </button>
  );
}
