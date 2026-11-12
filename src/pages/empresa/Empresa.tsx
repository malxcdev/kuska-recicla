import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Icon } from "@/components/Icon";
import { RequestActionButton } from "@/components/RequestActionButton";
import { RequestTable } from "@/components/RequestTable";
import { EmptyState, MaterialIcon, PageIntro, ProgressBar, StatCard } from "@/components/ui";
import { MATERIAL_LIST, MATERIALS } from "@/data/catalog";
import { formatRelativeDay, isInMonth, monthName } from "@/data/dates";
import { lotsRepo } from "@/data/repositories";
import { byDateAsc, byDateDesc } from "@/data/requestActions";
import { formatKg, monthlyTotals, summarizeImpact } from "@/data/stats";
import { useAuthenticated, useRequests, useToast } from "@/state/contexts";
import type { Lot, PickupRequest } from "@/types";

const LOT_STATUS: Record<Lot["status"], string> = { abierto: "En acopio", listo: "Listo para salida", despachado: "Despachado" };

function useLots() {
  const [lots, setLots] = useState<Lot[]>([]);
  useEffect(() => {
    let active = true;
    lotsRepo.list().then((list) => active && setLots(list));
    return () => {
      active = false;
    };
  }, []);
  return lots;
}

function useEmpresaData() {
  const { requests } = useRequests();
  const [today] = useState(() => new Date());
  const incoming = requests.filter((r) => r.status === "recogido").sort(byDateAsc);
  const received = requests.filter((r) => r.status === "entregado").sort(byDateDesc);
  const receivedThisMonth = received.filter((r) => isInMonth(r.scheduledDate, today));
  return { requests, today, incoming, received, receivedThisMonth };
}

function IncomingList({ incoming, limit }: { incoming: PickupRequest[]; limit?: number }) {
  const { actorsById } = useAuthenticated();
  const rows = limit ? incoming.slice(0, limit) : incoming;
  if (rows.length === 0) return <EmptyState icon="truck" title="Nada en camino" text="Cuando un reciclador recoja material, aparecerá aquí para que registres su recepción." />;
  return (
    <>
      {rows.map((r) => (
        <div className="delivery-row" key={r.id}>
          <MaterialIcon material={r.material} />
          <div><strong>{r.collectorId ? actorsById.get(r.collectorId)?.name : "Sin reciclador"}</strong><small>{MATERIALS[r.material].name} · {r.id}</small></div>
          <b>{r.kg} kg</b>
          <span>{formatRelativeDay(r.scheduledDate)}</span>
          <RequestActionButton request={r} />
        </div>
      ))}
    </>
  );
}

function LotCard({ lot }: { lot: Lot }) {
  const pct = Math.round((lot.kg / lot.capacityKg) * 100);
  return (
    <article className="panel lot-card">
      <p className="eyebrow">{LOT_STATUS[lot.status].toUpperCase()}</p>
      <span><Icon name={MATERIALS[lot.material].icon} size={31} /></span>
      <h3>{MATERIALS[lot.material].name} · {lot.id}</h3>
      <strong>{formatKg(lot.kg)}</strong>
      <p>Al {pct}% de capacidad ({formatKg(lot.capacityKg)})</p>
      <ProgressBar value={pct} color="var(--color-earth)" label={`Capacidad del lote ${lot.id}`} />
    </article>
  );
}

export function EmpresaInicio() {
  const { incoming, received, receivedThisMonth } = useEmpresaData();
  const lots = useLots();
  const active = lots.filter((l) => l.status !== "despachado");
  const featured = [...active].sort((a, b) => b.kg / b.capacityKg - a.kg / a.capacityKg)[0];

  return (
    <section className="page-section role-workspace">
      <PageIntro eyebrow="CENTRO DE VALORIZACIÓN" title="Recepciones y lotes" description="Controla el material recibido y mantén su trazabilidad.">
        <span className="live-badge"><i /> Datos actualizados</span>
      </PageIntro>
      <div className="role-stats">
        <StatCard icon="truck" label="Por recibir" value={formatKg(incoming.reduce((s, r) => s + r.kg, 0))} detail={`${incoming.length} ${incoming.length === 1 ? "entrega" : "entregas"} en camino`} />
        <StatCard icon="leaf" label="Material valorizado" value={formatKg(receivedThisMonth.reduce((s, r) => s + r.kg, 0))} detail="Este mes" />
        <StatCard icon="box" label="Lotes activos" value={active.length} detail={`${active.filter((l) => l.status === "listo").length} listos para salida`} />
      </div>
      <div className="role-grid">
        <article className="panel role-table">
          <div className="panel-heading"><div><h3>Entregas esperadas</h3><p>Material en camino al centro</p></div><Link className="text-button" to="/recepciones">Ver todas <Icon name="chevron" size={14} /></Link></div>
          <IncomingList incoming={incoming} limit={4} />
        </article>
        {featured ? <LotCard lot={featured} /> : <article className="panel lot-card"><EmptyState icon="box" title="Sin lotes" text="Aún no hay lotes activos." /></article>}
      </div>
      <article className="panel role-activity">
        <div className="panel-heading"><div><h3>Trazabilidad reciente</h3><p>Últimas recepciones registradas</p></div></div>
        <RequestTable requests={received.slice(0, 5)} showRequester />
      </article>
    </section>
  );
}

export function EmpresaRecepciones() {
  const { incoming, received } = useEmpresaData();
  return (
    <section className="page-section">
      <PageIntro eyebrow="ENTRADA AL CENTRO" title="Recepciones" description="Registra el material que llega y consulta todo lo recibido." />
      <article className="panel role-table">
        <div className="panel-heading"><div><h3>En camino</h3><p>Recogido por recicladores, pendiente de recepción</p></div></div>
        <IncomingList incoming={incoming} />
      </article>
      <article className="panel role-activity">
        <div className="panel-heading"><div><h3>Recibido</h3><p>Historial de recepciones</p></div></div>
        <RequestTable requests={received} showRequester expanded />
      </article>
    </section>
  );
}

export function EmpresaLotes() {
  const lots = useLots();
  const announce = useToast();
  return (
    <section className="page-section">
      <PageIntro eyebrow="ACOPIO Y SALIDA" title="Lotes" description="Agrupa el material por tipo hasta completar la capacidad de cada lote.">
        <button type="button" className="primary-button" onClick={() => announce("La creación de lotes llegará con la conexión a la base de datos.")}><Icon name="plus" /> Nuevo lote</button>
      </PageIntro>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lots.map((lot) => <LotCard lot={lot} key={lot.id} />)}
      </div>
    </section>
  );
}

export function EmpresaReportes() {
  const { requests, today, received } = useEmpresaData();
  const { actorsById } = useAuthenticated();
  const impact = summarizeImpact(requests, today);
  const months = monthlyTotals(requests, today);
  const maxMonth = Math.max(...months.map((m) => m.kg), 1);
  const byCollector = [...received.reduce((map, r) => map.set(r.collectorId ?? "", (map.get(r.collectorId ?? "") ?? 0) + r.kg), new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const maxMaterial = Math.max(...Object.values(impact.byMaterial), 1);

  return (
    <section className="page-section">
      <PageIntro eyebrow="RESUMEN DE VALORIZACIÓN" title="Reportes" description={`Material recibido hasta ${monthName(today).toLowerCase()}.`} />
      <div className="impact-grid">
        <article className="panel material-chart">
          <div className="panel-heading"><div><h3>Recibido por mes</h3><p>Últimos {months.length} meses</p></div></div>
          {months.map((m) => (
            <div className="bar-row" key={m.key}><span>{m.label}</span><ProgressBar value={(m.kg / maxMonth) * 100} label={`${m.label}: ${m.kg} kg`} /><strong>{formatKg(m.kg)}</strong></div>
          ))}
          <div className="panel-heading mt-8"><div><h3>Por material</h3><p>Total histórico</p></div></div>
          {MATERIAL_LIST.map((m) => (
            <div className="bar-row" key={m.id}><span>{m.name}</span><ProgressBar value={(impact.byMaterial[m.id] / maxMaterial) * 100} color={m.color} label={`${m.name}: ${impact.byMaterial[m.id]} kg`} /><strong>{formatKg(impact.byMaterial[m.id])}</strong></div>
          ))}
        </article>
        <article className="panel network-card">
          <div className="panel-heading"><div><h3>Por reciclador</h3><p>kg entregados al centro</p></div></div>
          {byCollector.map(([id, kg]) => (
            <div key={id}><span><Icon name="truck" /></span><strong>{formatKg(kg)}</strong><small>{actorsById.get(id)?.name ?? "Sin asignar"}</small></div>
          ))}
        </article>
      </div>
    </section>
  );
}
