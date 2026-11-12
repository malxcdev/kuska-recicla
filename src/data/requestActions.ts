import type { PickupRequest, RequestStatus, Session } from "@/types";

export type RequestAction =
  | { id: "aceptar" | "recoger" | "recibir"; label: string; nextStatus: RequestStatus; collectorId?: string; successMessage: string }
  | { id: "liberar"; label: string };

/** Acciones que la sesión actual puede hacer sobre un pedido, según su rol y el estado. */
export function getAvailableActions(request: PickupRequest, session: Session): RequestAction[] {
  if (session.role === "reciclador") {
    if (request.status === "solicitado" && request.collectorId === null) {
      return [{ id: "aceptar", label: "Aceptar recojo", nextStatus: "asignado", collectorId: session.actorId, successMessage: `Aceptaste el recojo ${request.id}.` }];
    }
    if (request.status === "asignado" && request.collectorId === session.actorId) {
      return [
        { id: "recoger", label: "Marcar como recogido", nextStatus: "recogido", successMessage: `Registraste el recojo ${request.id}.` },
        { id: "liberar", label: "No puedo ir" },
      ];
    }
  }
  if (session.role === "empresa" && request.status === "recogido") {
    return [{ id: "recibir", label: "Registrar recepción", nextStatus: "entregado", successMessage: `Recepción de ${request.id} registrada.` }];
  }
  return [];
}

/** Pedidos visibles para cada rol. */
export function requestsForSession(requests: PickupRequest[], session: Session): PickupRequest[] {
  switch (session.role) {
    case "comercio":
      return requests.filter((r) => r.requesterId === session.actorId);
    case "reciclador":
      return requests.filter((r) => r.collectorId === session.actorId);
    case "empresa":
      return requests.filter((r) => r.status === "recogido" || r.status === "entregado");
    case "municipio":
      return requests;
  }
}

export const byDateDesc = (a: PickupRequest, b: PickupRequest) =>
  b.scheduledDate.localeCompare(a.scheduledDate) || b.slot.localeCompare(a.slot) || b.id.localeCompare(a.id);

export const byDateAsc = (a: PickupRequest, b: PickupRequest) =>
  a.scheduledDate.localeCompare(b.scheduledDate) || a.slot.localeCompare(b.slot) || a.id.localeCompare(b.id);
