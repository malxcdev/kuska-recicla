import { MATERIALS, MONTHLY_GOAL_KG, ZONE_IDS } from "./catalog";
import { addDays, isInMonth, monthKey, monthName, toISODate } from "./dates";
import type { MaterialId, PickupRequest, ZoneId } from "@/types";

export const round1 = (value: number) => Math.round(value * 10) / 10;

/** Formatea kg: "82.5 kg" o "1.2 t" desde una tonelada. */
export function formatKg(kg: number): string {
  return kg >= 1000 ? `${round1(kg / 1000)} t` : `${round1(kg)} kg`;
}

export function formatSoles(amount: number): string {
  return `S/ ${Math.round(amount).toLocaleString("es-PE")}`;
}

const delivered = (requests: PickupRequest[]) => requests.filter((r) => r.status === "entregado");

export interface ImpactSummary {
  totalKg: number;
  count: number;
  co2Kg: number;
  trees: number;
  byMaterial: Record<MaterialId, number>;
  thisMonthKg: number;
  lastMonthKg: number;
  /** Variación porcentual contra el mes anterior; null si el mes anterior fue 0. */
  trendPct: number | null;
  firstDate: string | null;
}

/** Impacto de los recojos entregados (los únicos que cuentan como recuperados). */
export function summarizeImpact(requests: PickupRequest[], today: Date): ImpactSummary {
  const done = delivered(requests);
  const byMaterial: Record<MaterialId, number> = { carton: 0, plastico: 0, organico: 0, vidrio: 0 };
  let co2Kg = 0;
  for (const request of done) {
    byMaterial[request.material] += request.kg;
    co2Kg += request.kg * MATERIALS[request.material].co2PerKg;
  }
  const lastMonthRef = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const thisMonthKg = done.filter((r) => isInMonth(r.scheduledDate, today)).reduce((sum, r) => sum + r.kg, 0);
  const lastMonthKg = done.filter((r) => isInMonth(r.scheduledDate, lastMonthRef)).reduce((sum, r) => sum + r.kg, 0);
  const firstDate = done.map((r) => r.scheduledDate).sort()[0] ?? null;

  return {
    totalKg: round1(done.reduce((sum, r) => sum + r.kg, 0)),
    count: done.length,
    co2Kg: round1(co2Kg),
    // Un árbol absorbe alrededor de 20 kg de CO₂ al año (referencial).
    trees: Math.round(co2Kg / 20),
    byMaterial,
    thisMonthKg: round1(thisMonthKg),
    lastMonthKg: round1(lastMonthKg),
    trendPct: lastMonthKg > 0 ? Math.round(((thisMonthKg - lastMonthKg) / lastMonthKg) * 100) : null,
    firstDate,
  };
}

/** Ingresos referenciales de un reciclador por los recojos entregados. */
export function earningsOf(requests: PickupRequest[]): number {
  return delivered(requests).reduce((sum, r) => sum + r.kg * MATERIALS[r.material].pricePerKg, 0);
}

export interface ZoneCoverage {
  zone: ZoneId;
  total: number;
  completed: number;
  pct: number;
}

/** Porcentaje de recojos programados en los últimos 7 días que ya se completaron, por zona. */
export function zoneCoverage(requests: PickupRequest[], today: Date): ZoneCoverage[] {
  const fromIso = toISODate(addDays(today, -6));
  const toIso = toISODate(today);
  return ZONE_IDS.map((zone) => {
    const week = requests.filter((r) => r.zone === zone && r.scheduledDate >= fromIso && r.scheduledDate <= toIso);
    const completed = week.filter((r) => r.status === "recogido" || r.status === "entregado").length;
    return { zone, total: week.length, completed, pct: week.length ? Math.round((completed / week.length) * 100) : 0 };
  });
}

export interface MonthTotal {
  key: string;
  label: string;
  kg: number;
}

/** kg entregados en cada uno de los últimos meses, del más antiguo al actual. */
export function monthlyTotals(requests: PickupRequest[], today: Date, months = 4): MonthTotal[] {
  const done = delivered(requests);
  return Array.from({ length: months }, (_, index) => {
    const ref = new Date(today.getFullYear(), today.getMonth() - (months - 1 - index), 1);
    const kg = done.filter((r) => isInMonth(r.scheduledDate, ref)).reduce((sum, r) => sum + r.kg, 0);
    return { key: monthKey(ref), label: monthName(ref), kg: round1(kg) };
  });
}

export function monthProgress(requests: PickupRequest[], today: Date, goalKg = MONTHLY_GOAL_KG) {
  const kg = delivered(requests).filter((r) => isInMonth(r.scheduledDate, today)).reduce((sum, r) => sum + r.kg, 0);
  return { kg: round1(kg), goalKg, pct: Math.min(100, Math.round((kg / goalKg) * 100)) };
}
