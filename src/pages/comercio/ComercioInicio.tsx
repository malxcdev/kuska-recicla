import { useState } from "react";
import { Link } from "react-router";
import { Icon } from "@/components/Icon";
import { materialStyle } from "@/components/materialStyle";
import { RequestTable } from "@/components/RequestTable";
import { Avatar, EmptyState, StatCard, StatusBadge, StatusTracker } from "@/components/ui";
import { MATERIAL_LIST, MATERIALS, ZONES } from "@/data/catalog";
import { dayNumber, monthShort, weekdayShort } from "@/data/dates";
import { byDateAsc, byDateDesc, requestsForSession } from "@/data/requestActions";
import { formatKg, summarizeImpact } from "@/data/stats";
import { useAuthenticated, useRequestFlow, useRequests } from "@/state/contexts";
import type { RequestStatus } from "@/types";

const HEADLINES: Record<Exclude<RequestStatus, "entregado">, string> = {
  solicitado: "Estamos buscando quién recoja",
  asignado: "Tu recojo ya tiene reciclador",
  recogido: "Tu material va camino al centro",
};

export function ComercioInicio() {
  const { session, actorsById } = useAuthenticated();
  const { requests } = useRequests();
  const { openWizard, openDetail } = useRequestFlow();
  const [today] = useState(() => new Date());

  const mine = requestsForSession(requests, session);
  const impact = summarizeImpact(mine, today);
  const next = mine.filter((r) => r.status !== "entregado").sort(byDateAsc)[0];
  const collector = next?.collectorId ? actorsById.get(next.collectorId) : undefined;
  const recent = [...mine].sort(byDateDesc).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-label"><Icon name="spark" size={15} /> RECICLAR NUNCA FUE TAN FÁCIL</span>
          <h2>Tú separas.<br /><em>Nosotros conectamos.</em></h2>
          <p>Programa el recojo de tus residuos aprovechables y genera un impacto positivo en tu comunidad.</p>
          <button type="button" className="hero-button" onClick={() => openWizard()}>Programar un recojo <Icon name="chevron" size={17} /></button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun" />
          <div className="mountain one" /><div className="mountain two" />
          <div className="road" />
          <div className="truck-art"><span className="truck-box"><Icon name="leaf" size={22} /></span><span className="truck-cab" /><i /><i /></div>
          <span className="tree t1">♣</span><span className="tree t2">♣</span><span className="tree t3">♣</span>
        </div>
      </section>

      <section className="stats-grid" aria-label="Resumen de impacto">
        <StatCard icon="leaf" label="Residuos recuperados" value={formatKg(impact.totalKg)} trend={impact.trendPct !== null && impact.trendPct >= 0}
          detail={impact.trendPct === null ? `${formatKg(impact.thisMonthKg)} este mes` : `${impact.trendPct >= 0 ? "↑" : "↓"} ${Math.abs(impact.trendPct)}% vs. el mes pasado`} />
        <StatCard icon="truck" tone="ochre" label="Recojos completados" value={impact.count} detail={impact.firstDate ? `Desde ${monthShort(impact.firstDate)} de ${impact.firstDate.slice(0, 4)}` : "Aún sin entregas"} />
        <StatCard icon="chart" tone="teal" label="CO₂ evitado" value={`${impact.co2Kg} kg`} detail={impact.trees > 0 ? `Equivale a ${impact.trees} ${impact.trees === 1 ? "árbol" : "árboles"} en un año` : "Cada kilo cuenta"} />
      </section>

      <section className="dashboard-grid">
        <article className="panel next-pickup">
          {next ? (
            <>
              <div className="panel-heading">
                <div><p className="eyebrow">PRÓXIMO RECOJO</p><h3>{HEADLINES[next.status as keyof typeof HEADLINES]}</h3></div>
                <StatusBadge status={next.status} />
              </div>
              <div className="pickup-body">
                <div className="date-block"><span>{weekdayShort(next.scheduledDate).toUpperCase()}</span><strong>{dayNumber(next.scheduledDate)}</strong><small>{monthShort(next.scheduledDate).toUpperCase()}</small></div>
                <div className="pickup-details">
                  <div><Icon name="clock" /><span><strong>{next.slot}</strong><small>{next.kg} kg de {MATERIALS[next.material].name.toLowerCase()}</small></span></div>
                  <div><Icon name="map" /><span><strong>{next.address}</strong><small>{ZONES[next.zone].name} · Santiago</small></span></div>
                </div>
                <div className="collector">
                  {collector ? <Avatar name={collector.name} tone="sage" /> : <span className="avatar bg-line! text-muted!"><Icon name="user" size={18} /></span>}
                  <span>
                    <small>{collector ? "RECICLADOR ASIGNADO" : "SIN ASIGNAR AÚN"}</small>
                    <strong>{collector?.name ?? "Buscando en tu zona"}</strong>
                    <button type="button" onClick={() => openDetail(next.id)}>{collector ? "Ver contacto" : "Ver detalle"}</button>
                  </span>
                </div>
              </div>
              <StatusTracker status={next.status} />
            </>
          ) : (
            <EmptyState icon="calendar" title="No tienes recojos programados" text="Programa uno y te avisaremos cuando un reciclador de tu zona lo acepte.">
              <button type="button" className="primary-button" onClick={() => openWizard()}><Icon name="plus" size={18} /> Programar recojo</button>
            </EmptyState>
          )}
        </article>

        <article className="panel quick-request">
          <div className="panel-heading"><div><h3>¿Qué tienes para reciclar?</h3><p>Selecciona un material para empezar</p></div></div>
          <div className="material-grid">
            {MATERIAL_LIST.map((item) => (
              <button key={item.id} type="button" onClick={() => openWizard(item.id)} style={materialStyle(item.id)}>
                <span><Icon name={item.icon} /></span><strong>{item.name}</strong><Icon name="chevron" size={15} />
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="panel recent">
        <div className="panel-heading">
          <div><h3>Actividad reciente</h3><p>Seguimiento de tus últimos recojos</p></div>
          <Link className="text-button" to="/pedidos">Ver todos <Icon name="chevron" size={15} /></Link>
        </div>
        <RequestTable requests={recent} emptyText="Cuando programes tu primer recojo, lo verás aquí." />
      </section>
    </>
  );
}
