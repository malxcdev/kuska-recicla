import { MATERIALS, ZONES } from "@/data/catalog";
import { formatRelativeDay } from "@/data/dates";
import { useRequestFlow, useSession } from "@/state/contexts";
import { Icon } from "./Icon";
import { EmptyState, MaterialIcon, StatusBadge } from "./ui";
import type { PickupRequest } from "@/types";

interface RequestTableProps {
  requests: PickupRequest[];
  /** Muestra la columna de dirección y zona. */
  expanded?: boolean;
  /** Muestra quién pidió el recojo en lugar del código. */
  showRequester?: boolean;
  emptyText?: string;
}

export function RequestTable({ requests, expanded = false, showRequester = false, emptyText = "Todavía no hay recojos registrados." }: RequestTableProps) {
  const { openDetail } = useRequestFlow();
  const { actorsById } = useSession();

  if (requests.length === 0) {
    return <EmptyState icon="truck" title="Sin recojos" text={emptyText} />;
  }

  return (
    <ul className={`request-list ${expanded ? "expanded" : ""}`}>
      {requests.map((request) => (
        <li className="request-row" key={request.id}>
          <MaterialIcon material={request.material} />
          <div className="request-material">
            <strong>{request.kg} kg · {MATERIALS[request.material].name}</strong>
            <span>{showRequester ? `${actorsById.get(request.requesterId)?.name ?? "Comercio"} · ${request.id}` : request.id}</span>
          </div>
          <div className="request-meta">
            <Icon name="calendar" size={15} />
            <span>{formatRelativeDay(request.scheduledDate)}<small>{request.slot}</small></span>
          </div>
          {expanded && (
            <div className="request-meta zone">
              <Icon name="map" size={15} />
              <span>{request.address}<small>{ZONES[request.zone].name} · Santiago</small></span>
            </div>
          )}
          <StatusBadge status={request.status} />
          <button type="button" className="row-action" onClick={() => openDetail(request.id)} aria-label={`Ver detalle del pedido ${request.id}`}>
            <Icon name="chevron" />
          </button>
        </li>
      ))}
    </ul>
  );
}
