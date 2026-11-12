import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { ProgressBar } from "./ui";
import { MATERIAL_LIST } from "@/data/catalog";
import { monthShort } from "@/data/dates";
import { formatKg, type ImpactSummary } from "@/data/stats";

/** Portada de impacto + distribución por material; `aside` ocupa la columna derecha. */
export function ImpactView({ impact, label, aside }: { impact: ImpactSummary; label: string; aside: ReactNode }) {
  const max = Math.max(...Object.values(impact.byMaterial), 1);
  return (
    <>
      <div className="impact-hero">
        <div>
          <span>Impacto acumulado</span>
          <strong>{formatKg(impact.totalKg)}</strong>
          <p>{impact.firstDate ? `${label} desde ${monthShort(impact.firstDate)} de ${impact.firstDate.slice(0, 4)}` : "Aún no hay recojos entregados."}</p>
        </div>
        <div className="impact-ring"><span><Icon name="leaf" size={29} /></span><strong>{impact.co2Kg} kg</strong><small>CO₂ evitado</small></div>
      </div>
      <div className="impact-grid">
        <article className="panel material-chart">
          <div className="panel-heading"><div><h3>Material recuperado</h3><p>Distribución por tipo</p></div></div>
          {MATERIAL_LIST.map((material) => (
            <div className="bar-row" key={material.id}>
              <span>{material.name}</span>
              <ProgressBar value={(impact.byMaterial[material.id] / max) * 100} color={material.color} label={`${material.name}: ${impact.byMaterial[material.id]} kg`} />
              <strong>{formatKg(impact.byMaterial[material.id])}</strong>
            </div>
          ))}
        </article>
        {aside}
      </div>
    </>
  );
}
