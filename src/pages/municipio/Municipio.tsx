import { useState, type CSSProperties } from "react";
import { Icon } from "@/components/Icon";
import { RequestTable } from "@/components/RequestTable";
import { FilterChips, PageIntro, ProgressBar, StatCard } from "@/components/ui";
import { MATERIAL_LIST, ROLE_ICONS, ROLE_LABELS, ROLE_PLURALS, STATUS_FLOW, STATUS_LABELS, ZONE_IDS, ZONES } from "@/data/catalog";
import { isInMonth } from "@/data/dates";
import { byDateDesc } from "@/data/requestActions";
import { formatKg, monthlyTotals, monthProgress, summarizeImpact, zoneCoverage } from "@/data/stats";
import { useAuthenticated, useRequests } from "@/state/contexts";
import type { RequestStatus, Role, ZoneId } from "@/types";

const ROLES: Role[] = ["comercio", "reciclador", "empresa", "municipio"];
const ROLE_ICON_STYLE = { "--mat": "var(--color-green)", "--soft": "var(--color-green-soft)" } as CSSProperties;

function useMunicipioData() {
  const { requests } = useRequests();
  const { actors } = useAuthenticated();
  const [today] = useState(() => new Date());
  return { requests, actors, today };
}

function CoveragePanel() {
  const { requests, today } = useMunicipioData();
  return (
    <article className="panel zone-panel">
      <div className="panel-heading"><div><h3>Cobertura por zona</h3><p>Recojos completados en los últimos 7 días</p></div><span className="chart-key"><i /> Cobertura</span></div>
      {zoneCoverage(requests, today).map((z) => (
        <div className="zone-row" key={z.zone}>
          <span>{ZONES[z.zone].name} · {ZONES[z.zone].area}</span>
          <ProgressBar value={z.pct} label={`Cobertura ${ZONES[z.zone].name}`} />
          <strong>{z.total ? `${z.pct}%` : "—"}</strong>
        </div>
      ))}
    </article>
  );
}

function NetworkPanel() {
  const { actors } = useMunicipioData();
  return (
    <article className="panel network-card">
      <div className="panel-heading"><div><h3>Red activa</h3><p>Actores registrados</p></div></div>
      {ROLES.map((role) => (
        <div key={role}><span><Icon name={ROLE_ICONS[role]} /></span><strong>{actors.filter((a) => a.role === role).length}</strong><small>{ROLE_PLURALS[role]}</small></div>
      ))}
    </article>
  );
}

export function MunicipioInicio() {
  const { requests, actors, today } = useMunicipioData();
  const month = requests.filter((r) => isInMonth(r.scheduledDate, today));
  const progress = monthProgress(requests, today);
  const completed = month.filter((r) => r.status === "entregado").length;

  return (
    <section className="page-section role-workspace">
      <PageIntro eyebrow="OPERACIÓN DISTRITAL" title="Santiago recicla" description="Supervisa cobertura, capacidad e impacto de toda la red.">
        <span className="live-badge"><i /> Datos actualizados</span>
      </PageIntro>
      <div className="role-stats">
        <StatCard icon="leaf" label="Material recuperado" value={formatKg(progress.kg)} detail={`${progress.pct}% de la meta mensual`} />
        <StatCard icon="truck" label="Recojos completados" value={completed} detail={`De ${month.length} programados este mes`} />
        <StatCard icon="user" label="Actores activos" value={actors.length} detail={`${actors.filter((a) => a.role === "comercio").length} comercios`} />
      </div>
      <div className="role-grid municipality">
        <CoveragePanel />
        <NetworkPanel />
      </div>
      <article className="panel role-activity">
        <div className="panel-heading"><div><h3>Actividad de la red</h3><p>Últimos movimientos registrados</p></div></div>
        <RequestTable requests={[...requests].sort(byDateDesc).slice(0, 6)} expanded showRequester />
      </article>
    </section>
  );
}

export function MunicipioOperacion() {
  const { requests } = useMunicipioData();
  const [status, setStatus] = useState<RequestStatus | "todos">("todos");
  const [zone, setZone] = useState<ZoneId | "todas">("todas");
  const visible = requests
    .filter((r) => (status === "todos" || r.status === status) && (zone === "todas" || r.zone === zone))
    .sort(byDateDesc);

  return (
    <section className="page-section">
      <PageIntro eyebrow="TODOS LOS RECOJOS" title="Operación" description="Filtra por estado o zona para ubicar cuellos de botella.">
        <label className="select-field">
          <span className="sr-only">Zona</span>
          <select value={zone} onChange={(event) => setZone(event.target.value as ZoneId | "todas")}>
            <option value="todas">Todas las zonas</option>
            {ZONE_IDS.map((z) => <option key={z} value={z}>{ZONES[z].name} · {ZONES[z].area}</option>)}
          </select>
        </label>
      </PageIntro>
      <FilterChips
        label="Filtrar por estado"
        value={status}
        onChange={setStatus}
        options={[{ id: "todos" as const, label: "Todos", count: requests.length }, ...STATUS_FLOW.map((s) => ({ id: s, label: STATUS_LABELS[s], count: requests.filter((r) => r.status === s).length }))]}
      />
      <article className="panel orders-panel">
        <RequestTable requests={visible} expanded showRequester emptyText="No hay recojos con esos filtros." />
      </article>
    </section>
  );
}

export function MunicipioIndicadores() {
  const { requests, today } = useMunicipioData();
  const months = monthlyTotals(requests, today);
  const maxMonth = Math.max(...months.map((m) => m.kg), 1);
  const impact = summarizeImpact(requests, today);
  const maxMaterial = Math.max(...Object.values(impact.byMaterial), 1);

  return (
    <section className="page-section">
      <PageIntro eyebrow="INDICADORES DISTRITALES" title="Indicadores" description="Evolución mensual, composición del material y cobertura territorial." />
      <div className="role-stats">
        <StatCard icon="leaf" label="Recuperado en total" value={formatKg(impact.totalKg)} detail={`${impact.count} recojos entregados`} />
        <StatCard icon="chart" tone="teal" label="CO₂ evitado" value={`${impact.co2Kg} kg`} detail="Factores referenciales" />
        <StatCard icon="truck" tone="ochre" label="Variación mensual" value={impact.trendPct === null ? "—" : `${impact.trendPct >= 0 ? "+" : ""}${impact.trendPct}%`} detail="Frente al mes anterior" />
      </div>
      <div className="impact-grid">
        <article className="panel material-chart">
          <div className="panel-heading"><div><h3>Material recuperado por mes</h3><p>kg entregados a empresas valorizadoras</p></div></div>
          {months.map((m) => (
            <div className="bar-row" key={m.key}><span>{m.label}</span><ProgressBar value={(m.kg / maxMonth) * 100} label={`${m.label}: ${m.kg} kg`} /><strong>{formatKg(m.kg)}</strong></div>
          ))}
          <div className="panel-heading mt-8"><div><h3>Composición</h3><p>Por tipo de material</p></div></div>
          {MATERIAL_LIST.map((m) => (
            <div className="bar-row" key={m.id}><span>{m.name}</span><ProgressBar value={(impact.byMaterial[m.id] / maxMaterial) * 100} color={m.color} label={`${m.name}: ${impact.byMaterial[m.id]} kg`} /><strong>{formatKg(impact.byMaterial[m.id])}</strong></div>
          ))}
        </article>
        <CoveragePanel />
      </div>
    </section>
  );
}

export function MunicipioActores() {
  const { actors } = useMunicipioData();
  const [role, setRole] = useState<Role | "todos">("todos");
  const visible = actors.filter((a) => role === "todos" || a.role === role);

  return (
    <section className="page-section">
      <PageIntro eyebrow="RED KUSKA" title="Actores" description="Comercios, recicladores, empresas y municipios registrados en la red." />
      <FilterChips
        label="Filtrar por tipo"
        value={role}
        onChange={setRole}
        options={[{ id: "todos" as const, label: "Todos", count: actors.length }, ...ROLES.map((r) => ({ id: r, label: ROLE_PLURALS[r], count: actors.filter((a) => a.role === r).length }))]}
      />
      <article className="panel orders-panel">
        <ul className="request-list">
          {visible.map((actor) => (
            <li className="actor-row" key={actor.id}>
              <span className="material-icon" style={ROLE_ICON_STYLE}><Icon name={ROLE_ICONS[actor.role]} /></span>
              <div className="request-material"><strong>{actor.name}</strong><span>{ROLE_LABELS[actor.role]} · {actor.contactName}</span></div>
              <div className="request-meta"><Icon name="map" size={15} /><span>{actor.address || "Sin dirección"}<small>{ZONES[actor.zone].name}</small></span></div>
              <a className="text-button" href={`tel:${actor.phone.replace(/\s/g, "")}`}><Icon name="phone" size={15} /> <span className="max-sm:sr-only">{actor.phone}</span></a>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
