import { useState } from "react";
import { Link } from "react-router";
import { Icon } from "@/components/Icon";
import { ImpactView } from "@/components/ImpactView";
import { RequestActionButton } from "@/components/RequestActionButton";
import { RequestTable } from "@/components/RequestTable";
import { EmptyState, MaterialIcon, PageIntro, StatCard } from "@/components/ui";
import { MATERIALS, ZONES } from "@/data/catalog";
import { formatRelativeDay, toISODate } from "@/data/dates";
import { byDateAsc, byDateDesc, requestsForSession } from "@/data/requestActions";
import { earningsOf, formatKg, formatSoles, summarizeImpact } from "@/data/stats";
import { useAuthenticated, useRequestFlow, useRequests, useToast } from "@/state/contexts";
import type { PickupRequest } from "@/types";

function useRecicladorData() {
  const { session, actor, actorsById } = useAuthenticated();
  const { requests } = useRequests();
  const [today] = useState(() => new Date());
  const todayIso = toISODate(today);
  const mine = requestsForSession(requests, session);
  const todayStops = mine.filter((r) => r.scheduledDate === todayIso).sort(byDateAsc);
  const upcoming = mine.filter((r) => r.scheduledDate > todayIso && r.status === "asignado").sort(byDateAsc);
  const available = requests.filter((r) => r.status === "solicitado" && r.collectorId === null && r.zone === actor.zone).sort(byDateAsc);
  const deliveredThisMonth = mine.filter((r) => r.scheduledDate.slice(0, 7) === todayIso.slice(0, 7));
  return { actor, actorsById, today, mine, todayStops, upcoming, available, deliveredThisMonth };
}

const isDone = (r: PickupRequest) => r.status === "recogido" || r.status === "entregado";

function RouteList({ stops }: { stops: PickupRequest[] }) {
  const { actorsById } = useAuthenticated();
  const { openDetail } = useRequestFlow();
  const currentIndex = stops.findIndex((r) => !isDone(r));
  return (
    <ol className="route-list">
      {stops.map((stop, index) => (
        <li key={stop.id} className={isDone(stop) ? "complete" : index === currentIndex ? "current" : ""}>
          <i>{isDone(stop) ? <Icon name="check" size={11} /> : index + 1}</i>
          <button type="button" className="route-link" onClick={() => openDetail(stop.id)}>
            {actorsById.get(stop.requesterId)?.name ?? "Comercio"} · {isDone(stop) ? "Completado" : index === currentIndex ? "Siguiente" : stop.slot.slice(0, 5)}
          </button>
        </li>
      ))}
    </ol>
  );
}

function NextStop({ stop }: { stop: PickupRequest }) {
  const { actorsById } = useAuthenticated();
  const requester = actorsById.get(stop.requesterId);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${stop.address}, Santiago, Cusco`)}`;
  return (
    <>
      <div className="panel-heading">
        <div><p className="eyebrow">SIGUIENTE PARADA</p><h3>{requester?.name ?? "Comercio"}</h3></div>
        <span className="status assigned">{stop.slot}</span>
      </div>
      <div className="route-stop">
        <span className="route-number">{stop.id.slice(-2)}</span>
        <div><strong>{stop.address}</strong><small>{stop.kg} kg de {MATERIALS[stop.material].name.toLowerCase()} · Pedido {stop.id}</small></div>
        <div className="stop-actions">
          <a href={mapsUrl} target="_blank" rel="noreferrer"><Icon name="map" size={16} /> Iniciar ruta</a>
          <RequestActionButton request={stop} />
        </div>
      </div>
    </>
  );
}

export function RecicladorInicio() {
  const { actor, todayStops, deliveredThisMonth, mine } = useRecicladorData();
  const announce = useToast();
  const next = todayStops.find((r) => !isDone(r));
  const zonesToday = new Set(todayStops.map((r) => r.zone)).size;

  return (
    <section className="page-section role-workspace">
      <PageIntro eyebrow="RUTA DE HOY" title="Tu jornada de recolección" description="Organiza tus recojos y registra cada entrega de forma sencilla.">
        <span className="live-badge"><i /> Datos actualizados</span>
      </PageIntro>
      <div className="role-stats">
        <StatCard icon="truck" label="Recojos de hoy" value={todayStops.length} detail={`${todayStops.filter(isDone).length} completados`} />
        <StatCard icon="box" label="Material estimado" value={formatKg(todayStops.reduce((s, r) => s + r.kg, 0))} detail={`En ${zonesToday} ${zonesToday === 1 ? "zona" : "zonas"}`} />
        <StatCard icon="chart" label="Ingresos del mes" value={formatSoles(earningsOf(deliveredThisMonth))} detail="Referencial, por material entregado" />
      </div>
      <div className="role-grid">
        <article className="panel route-panel">
          {next ? <NextStop stop={next} /> : <EmptyState icon="check" title="Ruta de hoy completa" text="No te quedan paradas pendientes. Revisa los recojos disponibles en tu zona."><Link className="primary-button" to="/recojos">Ver disponibles</Link></EmptyState>}
          {todayStops.length > 0 && <RouteList stops={todayStops} />}
        </article>
        <article className="panel availability-card">
          <span><Icon name="clock" size={25} /></span>
          <h3>Tu disponibilidad</h3>
          <p>Hoy estás disponible hasta las 16:00 en la {ZONES[actor.zone].name}.</p>
          <button type="button" onClick={() => announce("La edición de horarios llegará con la conexión a la base de datos.")}>Editar horario</button>
        </article>
      </div>
      <article className="panel role-activity">
        <div className="panel-heading"><div><h3>Recojos recientes</h3><p>Últimos movimientos registrados</p></div><Link className="text-button" to="/recojos">Ver todos <Icon name="chevron" size={14} /></Link></div>
        <RequestTable requests={[...mine].sort(byDateDesc).slice(0, 5)} showRequester />
      </article>
    </section>
  );
}

export function RecicladorRutas() {
  const { todayStops, upcoming, today } = useRecicladorData();
  const next = todayStops.find((r) => !isDone(r));
  return (
    <section className="page-section">
      <PageIntro eyebrow={formatRelativeDay(toISODate(today), today).toUpperCase()} title="Ruta del día" description="Sigue el orden sugerido y marca cada recojo al completarlo." />
      <div className="role-grid">
        <article className="panel route-panel">
          {next && <NextStop stop={next} />}
          {todayStops.length > 0 ? <RouteList stops={todayStops} /> : <EmptyState icon="map" title="Sin paradas hoy" text="Acepta recojos disponibles para armar tu ruta." />}
        </article>
        <article className="panel route-panel">
          <div className="panel-heading"><div><h3>Próximos días</h3><p>Recojos que ya aceptaste</p></div></div>
          <RequestTable requests={upcoming} showRequester emptyText="No tienes recojos aceptados para los próximos días." />
        </article>
      </div>
    </section>
  );
}

export function RecicladorRecojos() {
  const { available, mine } = useRecicladorData();
  const { actorsById } = useAuthenticated();
  return (
    <section className="page-section">
      <PageIntro eyebrow="EN TU ZONA" title="Recojos" description="Acepta nuevos pedidos y revisa el historial de los que atendiste." />
      <article className="panel role-table">
        <div className="panel-heading"><div><h3>Disponibles para aceptar</h3><p>Pedidos sin reciclador asignado</p></div></div>
        {available.length === 0 ? (
          <EmptyState icon="truck" title="Nada pendiente" text="No hay pedidos nuevos en tu zona por ahora." />
        ) : (
          available.map((r) => (
            <div className="delivery-row" key={r.id}>
              <MaterialIcon material={r.material} />
              <div><strong>{actorsById.get(r.requesterId)?.name}</strong><small>{r.kg} kg · {MATERIALS[r.material].name}</small></div>
              <span>{formatRelativeDay(r.scheduledDate)}</span>
              <span>{r.slot.slice(0, 5)}</span>
              <RequestActionButton request={r} />
            </div>
          ))
        )}
      </article>
      <article className="panel role-activity">
        <div className="panel-heading"><div><h3>Mis recojos</h3><p>Todo lo que aceptaste o entregaste</p></div></div>
        <RequestTable requests={[...mine].sort(byDateDesc)} showRequester expanded />
      </article>
    </section>
  );
}

export function RecicladorImpacto() {
  const { mine, today } = useRecicladorData();
  const impact = summarizeImpact(mine, today);
  return (
    <section className="page-section">
      <PageIntro eyebrow="TU APORTE A SANTIAGO" title="Mi impacto" description="Todo el material que recuperaste y llegó a una empresa valorizadora." />
      <ImpactView
        impact={impact}
        label="entregados a empresas valorizadoras"
        aside={
          <article className="panel achievement">
            <span className="medal"><Icon name="chart" size={30} /></span>
            <p className="eyebrow">INGRESOS REFERENCIALES</p>
            <h3>{formatSoles(earningsOf(mine))}</h3>
            <p>Por {impact.count} {impact.count === 1 ? "recojo entregado" : "recojos entregados"}. Este mes llevas {formatKg(impact.thisMonthKg)}.</p>
          </article>
        }
      />
    </section>
  );
}
