import { useState } from "react";
import { Icon } from "@/components/Icon";
import { RequestTable } from "@/components/RequestTable";
import { FilterChips, PageIntro } from "@/components/ui";
import { byDateDesc, requestsForSession } from "@/data/requestActions";
import { useAuthenticated, useRequestFlow, useRequests } from "@/state/contexts";

type Filter = "todos" | "curso" | "entregados";

export function ComercioPedidos() {
  const { session } = useAuthenticated();
  const { requests } = useRequests();
  const { openWizard } = useRequestFlow();
  const [filter, setFilter] = useState<Filter>("todos");

  const mine = requestsForSession(requests, session).sort(byDateDesc);
  const inProgress = mine.filter((r) => r.status !== "entregado");
  const delivered = mine.filter((r) => r.status === "entregado");
  const visible = filter === "curso" ? inProgress : filter === "entregados" ? delivered : mine;

  return (
    <section className="page-section">
      <PageIntro eyebrow="HISTORIAL Y SEGUIMIENTO" title="Mis pedidos" description="Revisa el estado de cada recojo, desde la solicitud hasta la entrega.">
        <button type="button" className="primary-button" onClick={() => openWizard()} aria-label="Nuevo recojo"><Icon name="plus" /> <span className="max-sm:hidden">Nuevo recojo</span></button>
      </PageIntro>
      <FilterChips
        label="Filtrar pedidos"
        value={filter}
        onChange={setFilter}
        options={[
          { id: "todos", label: "Todos", count: mine.length },
          { id: "curso", label: "En curso", count: inProgress.length },
          { id: "entregados", label: "Entregados", count: delivered.length },
        ]}
      />
      <article className="panel orders-panel">
        <RequestTable requests={visible} expanded emptyText={filter === "curso" ? "No tienes recojos en curso." : "Todavía no tienes pedidos."} />
      </article>
    </section>
  );
}
