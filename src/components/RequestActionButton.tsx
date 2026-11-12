import { useState } from "react";
import { getAvailableActions } from "@/data/requestActions";
import { useAuthenticated, useRequests, useToast } from "@/state/contexts";
import type { PickupRequest } from "@/types";

/** Botón con la siguiente acción posible del pedido (aceptar, marcar recogido, recibir). */
export function RequestActionButton({ request, className = "inline-action" }: { request: PickupRequest; className?: string }) {
  const { session } = useAuthenticated();
  const { updateStatus } = useRequests();
  const announce = useToast();
  const [busy, setBusy] = useState(false);
  const [action] = getAvailableActions(request, session);
  if (!action) return null;

  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await updateStatus(request.id, action.nextStatus, action.collectorId);
          announce(action.successMessage);
        } finally {
          setBusy(false);
        }
      }}
    >
      {action.label}
    </button>
  );
}
