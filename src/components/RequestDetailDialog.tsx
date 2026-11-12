import { useState } from "react";
import { MATERIALS, ZONES } from "@/data/catalog";
import { formatRelativeDay } from "@/data/dates";
import { getAvailableActions, type RequestAction } from "@/data/requestActions";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { Avatar, MaterialIcon, StatusBadge, StatusTracker } from "./ui";
import type { Actor, PickupRequest, Session } from "@/types";

interface RequestDetailDialogProps {
  request: PickupRequest;
  session: Session;
  actorsById: Map<string, Actor>;
  onClose: () => void;
  onAction: (action: RequestAction) => Promise<void>;
}

export function RequestDetailDialog({ request, session, actorsById, onClose, onAction }: RequestDetailDialogProps) {
  const [busy, setBusy] = useState(false);
  const requester = actorsById.get(request.requesterId);
  const collector = request.collectorId ? actorsById.get(request.collectorId) : undefined;
  const actions = getAvailableActions(request, session);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${request.address}, Santiago, Cusco`)}`;

  const run = async (action: RequestAction) => {
    setBusy(true);
    try {
      await onAction(action);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog title={`${request.kg} kg de ${MATERIALS[request.material].name.toLowerCase()}`} eyebrow={`PEDIDO ${request.id}`} onClose={onClose}>
      <div className="mt-4 flex items-center gap-3">
        <MaterialIcon material={request.material} />
        <StatusBadge status={request.status} />
      </div>
      <StatusTracker status={request.status} />

      <dl className="detail-grid">
        <div><dt>Fecha</dt><dd>{formatRelativeDay(request.scheduledDate)}</dd></div>
        <div><dt>Horario</dt><dd>{request.slot}</dd></div>
        <div className="col-span-2"><dt>Dirección</dt><dd>{request.address} · {ZONES[request.zone].name} ({ZONES[request.zone].area})</dd></div>
        {session.role !== "comercio" && requester && (
          <div className="col-span-2"><dt>Comercio</dt><dd>{requester.name} · <a href={`tel:${requester.phone.replace(/\s/g, "")}`}>{requester.phone}</a></dd></div>
        )}
      </dl>

      <div className="collector-card">
        {collector ? (
          <>
            <Avatar name={collector.name} tone="sage" />
            <div>
              <small>{session.actorId === collector.id ? "TÚ RECOGES ESTE PEDIDO" : "RECICLADOR ASIGNADO"}</small>
              <strong>{collector.name}</strong>
            </div>
            {session.actorId !== collector.id && (
              <a className="text-button" href={`tel:${collector.phone.replace(/\s/g, "")}`}><Icon name="phone" size={16} /> {collector.phone}</a>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">Aún no hay un reciclador asignado. Te avisaremos cuando alguien acepte el recojo.</p>
        )}
      </div>

      <div className="detail-actions">
        {session.role === "reciclador" && (
          <a className="back-button" href={mapsUrl} target="_blank" rel="noreferrer"><Icon name="map" size={16} /> Cómo llegar</a>
        )}
        {actions.map((action) => (
          <button key={action.id} type="button" className={action.id === "liberar" ? "back-button" : "primary-button"} disabled={busy} onClick={() => run(action)}>{action.label}</button>
        ))}
      </div>
    </Dialog>
  );
}
