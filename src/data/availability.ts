import { slotLabel } from "./catalog";
import { addDays, parseISODate, toISODate } from "./dates";
import type { CollectorAvailability, CollectorTimeOff, PickupRequest, ServiceClosure, SlotDefinition, ZoneSchedule } from "@/types";

export interface ScheduleContext {
  schedule: ZoneSchedule;
  closures: ServiceClosure[];
  availability: CollectorAvailability[];
  timeOff: CollectorTimeOff[];
  requests: PickupRequest[];
}

export interface SlotAvailability {
  slot: SlotDefinition;
  label: string;
  collectorIds: string[];
  capacity: number;
  booked: number;
  remaining: number;
}

export interface DayAvailability {
  date: string;
  open: boolean;
  reason: string | null;
  slots: SlotAvailability[];
}

export type DayLevel = "closed" | "full" | "low" | "open";

export const NO_SERVICE = "Sin servicio este día";
export const NO_COLLECTORS = "Sin recicladores disponibles";

export const DAY_LEVEL_LABELS: Record<DayLevel, string> = {
  open: "Con cupos",
  low: "Pocos cupos",
  full: "Lleno",
  closed: "Sin servicio",
};

/** Recojos asignados a un reciclador en una fecha (y franja, si se indica), en cualquier zona. */
export function collectorLoad(requests: PickupRequest[], collectorId: string, date: string, slotId?: string): number {
  return requests.filter((r) => r.collectorId === collectorId && r.scheduledDate === date && (slotId === undefined || r.slotId === slotId)).length;
}

export function getDayAvailability(date: string, ctx: ScheduleContext): DayAvailability {
  const { schedule, closures, availability, timeOff, requests } = ctx;
  const zone = schedule.zone;
  const weekday = parseISODate(date).getDay();

  if (!schedule.weekdays.includes(weekday)) return { date, open: false, reason: NO_SERVICE, slots: [] };
  const closure = closures.find((c) => c.date === date && (c.zone === null || c.zone === zone));
  if (closure) return { date, open: false, reason: closure.reason, slots: [] };

  const off = new Set(timeOff.filter((t) => t.date === date).map((t) => t.collectorId));
  const collectors = availability.filter((a) => a.zone === zone && !off.has(a.collectorId));

  const slots = schedule.slots.map((slot): SlotAvailability => {
    const collectorIds = collectors.filter((c) => (c.weekly[weekday] ?? []).includes(slot.id)).map((c) => c.collectorId);
    const remaining = collectorIds.reduce((sum, id) => sum + Math.max(0, schedule.stopsPerCollector - collectorLoad(requests, id, date, slot.id)), 0);
    const booked = requests.filter((r) => r.zone === zone && r.scheduledDate === date && r.slotId === slot.id && r.collectorId !== null).length;
    return { slot, label: slotLabel(slot), collectorIds, capacity: collectorIds.length * schedule.stopsPerCollector, booked, remaining };
  });

  const staffed = slots.some((s) => s.collectorIds.length > 0);
  return { date, open: staffed, reason: staffed ? null : NO_COLLECTORS, slots };
}

/** Disponibilidad de los próximos días, empezando mañana. */
export function getAvailability(today: Date, ctx: ScheduleContext, days = ctx.schedule.horizonDays): DayAvailability[] {
  return Array.from({ length: days }, (_, i) => getDayAvailability(toISODate(addDays(today, i + 1)), ctx));
}

export const remainingOf = (day: DayAvailability) => day.slots.reduce((sum, s) => sum + s.remaining, 0);

export function dayLevel(day: DayAvailability): DayLevel {
  if (!day.open) return "closed";
  const remaining = remainingOf(day);
  if (remaining === 0) return "full";
  return remaining <= 2 ? "low" : "open";
}

/**
 * Reciclador con menos carga en la franja; si empatan, el de menos recojos ese día y,
 * después, por id. Devuelve null si no queda nadie con cupo.
 */
export function pickCollector(day: DayAvailability, slotId: string, requests: PickupRequest[], stopsPerCollector: number, exclude?: string | null): string | null {
  const slot = day.slots.find((s) => s.slot.id === slotId);
  if (!slot) return null;
  const candidates = slot.collectorIds
    .filter((id) => id !== exclude)
    .map((id) => ({ id, slotLoad: collectorLoad(requests, id, day.date, slotId), dayLoad: collectorLoad(requests, id, day.date) }))
    .filter((c) => c.slotLoad < stopsPerCollector)
    .sort((a, b) => a.slotLoad - b.slotLoad || a.dayLoad - b.dayLoad || a.id.localeCompare(b.id));
  return candidates[0]?.id ?? null;
}
