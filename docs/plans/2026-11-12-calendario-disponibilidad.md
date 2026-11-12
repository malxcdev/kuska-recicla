# Calendario de disponibilidad — Plan de implementación

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Objetivo:** reemplazar las franjas fijas de recojo por un calendario real. El municipio define días y franjas por zona, cada reciclador publica su disponibilidad y el comercio reserva un cupo con asignación automática.

**Arquitectura:** el núcleo son funciones puras en `src/data/availability.ts` (`getDayAvailability`, `getAvailability`, `pickCollector`), alimentadas por un nuevo `scheduleRepo` (Web Storage, async, con la misma forma que tendrá en Supabase). Un `ScheduleProvider` expone los datos, y un hook `useRequestOperations` centraliza las acciones sobre pedidos, incluida la nueva "No puedo ir". Las pantallas nuevas son Disponibilidad (reciclador) y Calendario (municipio); el paso 2 del formulario de recojo pasa a ser un calendario de 14 días.

**Stack:** React 19, react-router 8, TypeScript, Tailwind v4 + CSS en `src/styles/`, Vitest + Testing Library.

**Diseño aprobado:** `docs/plans/2026-11-12-calendario-disponibilidad-design.md`

**Convenciones:**
- Comandos: `pnpm test` (vitest run), `pnpm typecheck`, `pnpm lint`, `pnpm check` (los tres juntos).
- Alias `@/` → `src/`.
- Fecha de referencia en los tests: **jueves 12 de noviembre de 2026**.
- Mensajes de commit en español, terminados con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Tarea 1: Tipos, franjas con id y datos de ejemplo

**Archivos:**
- Modificar: `src/types.ts`
- Modificar: `src/data/catalog.ts`
- Modificar: `src/data/mock.ts`
- Modificar: `src/data/repositories.ts`
- Modificar: `src/components/RequestWizard.tsx`
- Modificar: `src/data/data.test.ts`, `src/components/RequestWizard.test.tsx`

**Paso 1: Tipos nuevos.** En `src/types.ts`:

En `PickupRequest`, debajo de `scheduledDate`, agregar:
```ts
  /** Id de la franja (por ejemplo "08-10"); `slot` guarda su etiqueta legible. */
  slotId: string;
```
Reemplazar `NewPickupRequest` por:
```ts
export type NewPickupRequest = Pick<
  PickupRequest,
  "requesterId" | "material" | "kg" | "scheduledDate" | "slotId" | "slot" | "address" | "zone"
>;
```
En `SectionId`, agregar `| "disponibilidad" | "calendario"`.

Al final del archivo:
```ts
export interface SlotDefinition {
  id: string;
  start: string; // "08:00"
  end: string;   // "10:00"
}

/** Horario de servicio de una zona; lo define el municipio. */
export interface ZoneSchedule {
  zone: ZoneId;
  /** 0 = domingo … 6 = sábado */
  weekdays: number[];
  slots: SlotDefinition[];
  /** Recojos que puede atender cada reciclador por franja. */
  stopsPerCollector: number;
  /** Cuántos días hacia adelante se puede reservar. */
  horizonDays: number;
}

/** Día sin servicio (feriado o cierre). `zone: null` aplica a todas las zonas. */
export interface ServiceClosure {
  id: string;
  date: string;
  zone: ZoneId | null;
  reason: string;
}

/** Plantilla semanal de un reciclador: día de la semana → ids de franja. */
export interface CollectorAvailability {
  collectorId: string;
  zone: ZoneId;
  weekly: Record<number, string[]>;
}

export interface CollectorTimeOff {
  id: string;
  collectorId: string;
  date: string;
  reason?: string;
}
```

**Paso 2: Catálogo.** En `src/data/catalog.ts`:
- Cambiar la importación de tipos a `import type { IconName, MaterialId, RequestStatus, Role, SectionId, SlotDefinition, ZoneId, ZoneSchedule } from "@/types";`.
- Reemplazar la línea `export const SLOTS = [...]` por:
```ts
export const DEFAULT_SLOTS: SlotDefinition[] = [
  { id: "08-10", start: "08:00", end: "10:00" },
  { id: "10-12", start: "10:00", end: "12:00" },
  { id: "14-16", start: "14:00", end: "16:00" },
];

export const slotLabel = (slot: Pick<SlotDefinition, "start" | "end">) => `${slot.start} – ${slot.end}`;

export const SLOTS = DEFAULT_SLOTS.map(slotLabel);

export const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function defaultZoneSchedule(zone: ZoneId): ZoneSchedule {
  return { zone, weekdays: [1, 2, 3, 4, 5, 6], slots: DEFAULT_SLOTS, stopsPerCollector: 3, horizonDays: 14 };
}
```
- En `SECTION_TITLES`, agregar `disponibilidad: "Disponibilidad",` y `calendario: "Calendario",`.

**Paso 3: Semilla con id de franja.** En `src/data/mock.ts`:
- Agregar `import { DEFAULT_SLOTS, slotLabel } from "./catalog";`.
- Borrar la constante local `const SLOTS = [...]`.
- En `createSeedRequests`, reemplazar `slot: SLOTS[slot],` por:
```ts
      slotId: DEFAULT_SLOTS[slot].id,
      slot: slotLabel(DEFAULT_SLOTS[slot]),
```

**Paso 4: Repositorio.** En `src/data/repositories.ts`:
- En `STORAGE_KEYS`, cambiar `requests: "kuska:requests:v2"` por `requests: "kuska:requests:v3"` y agregar `previousRequests: "kuska:requests:v2",`.
- En `isPickupRequest`, agregar `typeof value.slotId === "string" &&` antes de `typeof value.slot === "string" &&`.
- En `loadRequests`, debajo de `removeKey(STORAGE_KEYS.legacyRequests);`, agregar `removeKey(STORAGE_KEYS.previousRequests);`.

**Paso 5: Formulario (ajuste temporal).** En `src/components/RequestWizard.tsx`, importar `DEFAULT_SLOTS, slotLabel` desde `@/data/catalog`. En `submit`, el objeto pasado a `onSubmit` agrega:
```ts
slotId: DEFAULT_SLOTS.find((s) => slotLabel(s) === selectedSlot)?.id ?? "",
```

**Paso 6: Actualizar los tests existentes.**
- `src/data/data.test.ts`: en el helper `request`, agregar `slotId: "10-12",` debajo de `scheduledDate`. En el test "crea pedidos con código único…", agregar `slotId: "08-10",` al input de `requestsRepo.create`.
- `src/components/RequestWizard.test.tsx`: en el `toHaveBeenCalledWith` agregar `slotId: "14-16",`; en el arreglo `full`, agregar `slotId: "08-10",`.

**Paso 7: Verificar.**
Ejecutar: `pnpm check`
Esperado: typecheck y lint sin errores, 18 tests en verde.

**Paso 8: Commit.**
```bash
git add src/types.ts src/data src/components/RequestWizard.tsx src/components/RequestWizard.test.tsx
git commit -m "Franjas con id y tipos del calendario de disponibilidad"
```

---

### Tarea 2: Cálculo de disponibilidad (TDD)

**Archivos:**
- Crear: `src/data/availability.ts`
- Test: `src/data/availability.test.ts`

**Paso 1: Escribir los tests que fallan.** Crear `src/data/availability.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { defaultZoneSchedule } from "./catalog";
import { dayLevel, getAvailability, getDayAvailability, NO_COLLECTORS, NO_SERVICE, pickCollector, type ScheduleContext } from "./availability";
import type { PickupRequest } from "@/types";

// 2026-11-15 domingo · 16 lunes · 17 martes · 20 viernes
const MONDAY = "2026-11-16";

const req = (o: Partial<PickupRequest>): PickupRequest => ({
  id: "KR-1", requesterId: "com-bazar", material: "carton", kg: 5, scheduledDate: MONDAY,
  slotId: "10-12", slot: "10:00 – 12:00", address: "", zone: "A", status: "asignado",
  collectorId: "rec-rosa", createdAt: "", updatedAt: "", ...o,
});

const ctx = (o: Partial<ScheduleContext> = {}): ScheduleContext => ({
  schedule: { ...defaultZoneSchedule("A"), stopsPerCollector: 2 },
  closures: [],
  availability: [
    { collectorId: "rec-rosa", zone: "A", weekly: { 1: ["08-10", "10-12"], 5: ["08-10"] } },
    { collectorId: "rec-mario", zone: "A", weekly: { 1: ["10-12"] } },
    { collectorId: "rec-kawsay", zone: "B", weekly: { 1: ["08-10", "10-12", "14-16"] } },
  ],
  timeOff: [],
  requests: [],
  ...o,
});

const slotOf = (date: string, slotId: string, c = ctx()) => getDayAvailability(date, c).slots.find((s) => s.slot.id === slotId)!;

describe("getDayAvailability", () => {
  it("cierra los días sin servicio de la zona", () => {
    expect(getDayAvailability("2026-11-15", ctx())).toMatchObject({ open: false, reason: NO_SERVICE, slots: [] });
  });

  it("cierra por feriado global y respeta los cierres de otra zona", () => {
    expect(getDayAvailability(MONDAY, ctx({ closures: [{ id: "c1", date: MONDAY, zone: null, reason: "Feriado" }] })).reason).toBe("Feriado");
    expect(getDayAvailability(MONDAY, ctx({ closures: [{ id: "c2", date: MONDAY, zone: "B", reason: "Obras" }] })).open).toBe(true);
  });

  it("suma la capacidad de los recicladores disponibles de la zona", () => {
    const slot = slotOf(MONDAY, "10-12");
    expect(slot.collectorIds).toEqual(["rec-rosa", "rec-mario"]);
    expect(slot).toMatchObject({ capacity: 4, remaining: 4, booked: 0 });
    expect(slotOf(MONDAY, "08-10").collectorIds).toEqual(["rec-rosa"]);
  });

  it("descuenta lo ya reservado por cada reciclador", () => {
    const slot = slotOf(MONDAY, "10-12", ctx({ requests: [req({})] }));
    expect(slot).toMatchObject({ booked: 1, remaining: 3 });
  });

  it("excluye a quien tiene el día libre", () => {
    const rosaOff = ctx({ timeOff: [{ id: "t1", collectorId: "rec-rosa", date: MONDAY }] });
    expect(slotOf(MONDAY, "08-10", rosaOff).collectorIds).toEqual([]);
    expect(slotOf(MONDAY, "10-12", rosaOff).collectorIds).toEqual(["rec-mario"]);
    const bothOff = ctx({ timeOff: [{ id: "t1", collectorId: "rec-rosa", date: MONDAY }, { id: "t2", collectorId: "rec-mario", date: MONDAY }] });
    expect(getDayAvailability(MONDAY, bothOff)).toMatchObject({ open: false, reason: NO_COLLECTORS });
  });
});

describe("getAvailability", () => {
  it("recorre los días desde mañana", () => {
    const days = getAvailability(new Date(2026, 10, 12), ctx(), 4);
    expect(days.map((d) => d.date)).toEqual(["2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16"]);
    expect(days.map((d) => d.open)).toEqual([true, false, false, true]);
    expect(days[1].reason).toBe(NO_COLLECTORS); // sábado 14: nadie trabaja
    expect(days[2].reason).toBe(NO_SERVICE);    // domingo 15
  });
});

describe("dayLevel", () => {
  it("clasifica por cupos libres", () => {
    expect(dayLevel(getDayAvailability(MONDAY, ctx()))).toBe("open");
    expect(dayLevel(getDayAvailability("2026-11-15", ctx()))).toBe("closed");
    const almostFull = ctx({ requests: [req({ id: "a" }), req({ id: "b" }), req({ id: "c", collectorId: "rec-mario" }), req({ id: "d", collectorId: "rec-mario" }), req({ id: "e", slotId: "08-10" })] });
    expect(dayLevel(getDayAvailability(MONDAY, almostFull))).toBe("low");
    const full = ctx({ requests: [...almostFull.requests, req({ id: "f", slotId: "08-10" })] });
    expect(dayLevel(getDayAvailability(MONDAY, full))).toBe("full");
  });
});

describe("pickCollector", () => {
  it("elige al de menor carga en la franja", () => {
    const c = ctx({ requests: [req({})] });
    expect(pickCollector(getDayAvailability(MONDAY, c), "10-12", c.requests, 2)).toBe("rec-mario");
  });

  it("desempata por la carga del día", () => {
    const c = ctx({ requests: [req({ slotId: "08-10" })] });
    expect(pickCollector(getDayAvailability(MONDAY, c), "10-12", c.requests, 2)).toBe("rec-mario");
  });

  it("devuelve null si la franja está llena o solo queda el excluido", () => {
    const full = ctx({ requests: [req({ id: "a" }), req({ id: "b" }), req({ id: "c", collectorId: "rec-mario" }), req({ id: "d", collectorId: "rec-mario" })] });
    expect(pickCollector(getDayAvailability(MONDAY, full), "10-12", full.requests, 2)).toBeNull();
    const c = ctx();
    expect(pickCollector(getDayAvailability(MONDAY, c), "08-10", c.requests, 2, "rec-rosa")).toBeNull();
    expect(pickCollector(getDayAvailability(MONDAY, c), "10-12", c.requests, 2, "rec-rosa")).toBe("rec-mario");
  });
});
```
**Paso 2: Correr y ver que fallan.**
Ejecutar: `pnpm vitest run src/data/availability.test.ts`
Esperado: FAIL, "Failed to resolve import ./availability".

**Paso 3: Implementación mínima.** Crear `src/data/availability.ts`:
```ts
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
```

**Paso 4: Correr y ver que pasan.**
Ejecutar: `pnpm vitest run src/data/availability.test.ts`
Esperado: PASS (10 tests).

**Paso 5: Commit.**
```bash
git add src/data/availability.ts src/data/availability.test.ts
git commit -m "Cálculo de disponibilidad por zona y asignación automática"
```

---

### Tarea 3: Semillas y repositorio del calendario (TDD)

**Archivos:**
- Modificar: `src/data/mock.ts`
- Modificar: `src/data/repositories.ts`
- Test: `src/data/schedule.test.ts`

**Paso 1: Escribir los tests que fallan.** Crear `src/data/schedule.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseISODate } from "./dates";
import { createSeedClosures, createSeedTimeOff } from "./mock";
import { requestsRepo, scheduleRepo, STORAGE_KEYS } from "./repositories";

const TODAY = new Date(2026, 10, 12);

describe("semillas del calendario", () => {
  it("el feriado de ejemplo es el próximo 8 de diciembre", () => {
    expect(createSeedClosures(TODAY)[0]).toMatchObject({ date: "2026-12-08", zone: null });
    expect(createSeedClosures(new Date(2026, 11, 20))[0].date).toBe("2027-12-08");
  });

  it("el día libre de Rosa cae en un miércoles posterior a mañana", () => {
    const [off] = createSeedTimeOff(TODAY);
    expect(off.collectorId).toBe("rec-rosa");
    expect(parseISODate(off.date).getDay()).toBe(3);
    expect(off.date > "2026-11-13").toBe(true);
  });
});

describe("scheduleRepo", () => {
  it("siembra un horario por zona y guarda cambios solo de esa zona", async () => {
    const initial = await scheduleRepo.listZoneSchedules();
    expect(initial.map((s) => s.zone).sort()).toEqual(["A", "B", "C", "D"]);
    const next = await scheduleRepo.saveZoneSchedule({ ...initial.find((s) => s.zone === "B")!, stopsPerCollector: 5 });
    expect(next.find((s) => s.zone === "B")?.stopsPerCollector).toBe(5);
    expect(next.find((s) => s.zone === "A")?.stopsPerCollector).toBe(3);
  });

  it("agrega y quita cierres", async () => {
    const created = await scheduleRepo.addClosure({ date: "2026-11-20", zone: "A", reason: "Obras" });
    expect((await scheduleRepo.listClosures()).some((c) => c.id === created.id)).toBe(true);
    await scheduleRepo.removeClosure(created.id);
    expect((await scheduleRepo.listClosures()).some((c) => c.id === created.id)).toBe(false);
  });

  it("reemplaza la disponibilidad de un reciclador", async () => {
    await scheduleRepo.saveAvailability({ collectorId: "rec-rosa", zone: "A", weekly: { 2: ["14-16"] } });
    const rosa = (await scheduleRepo.listAvailability()).filter((a) => a.collectorId === "rec-rosa");
    expect(rosa).toEqual([{ collectorId: "rec-rosa", zone: "A", weekly: { 2: ["14-16"] } }]);
  });

  it("descarta disponibilidad corrupta y vuelve a la semilla", async () => {
    localStorage.setItem(STORAGE_KEYS.availability, JSON.stringify([{ collectorId: 1 }]));
    expect((await scheduleRepo.listAvailability()).length).toBe(3);
  });

  it("agrega y quita días libres", async () => {
    const off = await scheduleRepo.addTimeOff({ collectorId: "rec-mario", date: "2026-11-20" });
    expect((await scheduleRepo.listTimeOff()).some((t) => t.id === off.id)).toBe(true);
    await scheduleRepo.removeTimeOff(off.id);
    expect((await scheduleRepo.listTimeOff()).some((t) => t.id === off.id)).toBe(false);
  });
});

describe("requestsRepo con asignación", () => {
  const input = { requesterId: "com-bazar", material: "carton" as const, kg: 5, scheduledDate: "2026-11-16", slotId: "08-10", slot: "08:00 – 10:00", address: "Av. Ejército 1240", zone: "A" as const };

  it("crea el pedido asignado cuando recibe reciclador", async () => {
    const created = await requestsRepo.create(input, "rec-rosa");
    expect(created).toMatchObject({ status: "asignado", collectorId: "rec-rosa" });
  });

  it("reasigna o devuelve a solicitado", async () => {
    const created = await requestsRepo.create(input, "rec-rosa");
    expect(await requestsRepo.reassign(created.id, "rec-mario")).toMatchObject({ status: "asignado", collectorId: "rec-mario" });
    expect(await requestsRepo.reassign(created.id, null)).toMatchObject({ status: "solicitado", collectorId: null });
  });
});
```

**Paso 2: Correr y ver que fallan.**
Ejecutar: `pnpm vitest run src/data/schedule.test.ts`
Esperado: FAIL ("createSeedClosures is not exported", "scheduleRepo is not exported").

**Paso 3: Semillas.** En `src/data/mock.ts`:
- Cambiar la importación del catálogo a `import { DEFAULT_SLOTS, defaultZoneSchedule, slotLabel, ZONE_IDS } from "./catalog";`.
- Cambiar la importación de tipos a `import type { Actor, CollectorAvailability, CollectorTimeOff, Lot, MaterialId, PickupRequest, RequestStatus, Role, ServiceClosure, ZoneSchedule } from "@/types";`.
- Agregar al final:
```ts
export const SEED_ZONE_SCHEDULES: ZoneSchedule[] = ZONE_IDS.map(defaultZoneSchedule);

const MORNING = ["08-10", "10-12"];
const MIDDAY = ["10-12", "14-16"];
const ALL_SLOTS = DEFAULT_SLOTS.map((s) => s.id);

/** La zona D queda a propósito sin recicladores, para ver el caso en la demo. */
export const SEED_AVAILABILITY: CollectorAvailability[] = [
  { collectorId: "rec-rosa", zone: "A", weekly: { 1: MORNING, 3: MORNING, 5: MORNING, 6: ["08-10"] } },
  { collectorId: "rec-mario", zone: "B", weekly: { 2: MIDDAY, 3: MIDDAY, 4: MIDDAY, 5: MIDDAY, 6: MIDDAY } },
  { collectorId: "rec-kawsay", zone: "C", weekly: { 1: ALL_SLOTS, 2: ALL_SLOTS, 3: ALL_SLOTS, 4: ALL_SLOTS, 5: ALL_SLOTS, 6: ALL_SLOTS } },
];

function nextWeekday(from: Date, weekday: number): Date {
  let cursor = addDays(from, 1);
  while (cursor.getDay() !== weekday) cursor = addDays(cursor, 1);
  return cursor;
}

export function createSeedClosures(today: Date): ServiceClosure[] {
  const passed = today.getMonth() === 11 && today.getDate() > 8;
  const year = passed ? today.getFullYear() + 1 : today.getFullYear();
  return [{ id: "cl-inmaculada", date: `${year}-12-08`, zone: null, reason: "Feriado: Inmaculada Concepción" }];
}

export function createSeedTimeOff(today: Date): CollectorTimeOff[] {
  return [{ id: "to-rosa-1", collectorId: "rec-rosa", date: toISODate(nextWeekday(addDays(today, 1), 3)), reason: "Cita médica" }];
}
```

**Paso 4: Repositorio.** En `src/data/repositories.ts`:
- Ampliar importaciones:
```ts
import { createSeedClosures, createSeedRequests, createSeedTimeOff, DEMO_ACTOR_BY_ROLE, SEED_ACTORS, SEED_AVAILABILITY, SEED_LOTS, SEED_ZONE_SCHEDULES } from "./mock";
import type { Actor, CollectorAvailability, CollectorTimeOff, Lot, NewPickupRequest, PickupRequest, RequestStatus, Role, ServiceClosure, Session, SlotDefinition, ZoneId, ZoneSchedule } from "@/types";
```
- En `STORAGE_KEYS`, agregar:
```ts
  schedules: "kuska:schedules:v1",
  closures: "kuska:closures:v1",
  availability: "kuska:availability:v1",
  timeOff: "kuska:timeoff:v1",
```
- Reemplazar `requestsRepo.create` por:
```ts
  /** Con reciclador nace asignado; sin reciclador queda solicitado. */
  async create(input: NewPickupRequest, collectorId: string | null = null): Promise<PickupRequest> {
    const all = loadRequests();
    const now = new Date().toISOString();
    const request: PickupRequest = { ...input, id: nextRequestId(all), status: collectorId ? "asignado" : "solicitado", collectorId, createdAt: now, updatedAt: now };
    writeJSON(STORAGE_KEYS.requests, [request, ...all]);
    return request;
  },

  /** Cambia el reciclador; con null el pedido vuelve a la lista de disponibles. */
  async reassign(id: string, collectorId: string | null): Promise<PickupRequest> {
    const all = loadRequests();
    const current = all.find((r) => r.id === id);
    if (!current) throw new Error(`No existe el pedido ${id}.`);
    const updated: PickupRequest = { ...current, collectorId, status: collectorId ? "asignado" : "solicitado", updatedAt: new Date().toISOString() };
    writeJSON(STORAGE_KEYS.requests, all.map((r) => (r.id === id ? updated : r)));
    return updated;
  },
```
- Agregar antes de `/* ---------- Autenticación de demostración ---------- */`:
```ts
/* ---------- Calendario de disponibilidad ---------- */

const isString = (v: unknown): v is string => typeof v === "string";
const isISODate = (v: unknown): v is string => isString(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isZone = (v: unknown): v is ZoneId => isString(v) && v in ZONES;

const isSlot = (v: unknown): v is SlotDefinition => isRecord(v) && isString(v.id) && isString(v.start) && isString(v.end);

const isZoneSchedule = (v: unknown): v is ZoneSchedule =>
  isRecord(v) && isZone(v.zone) &&
  Array.isArray(v.weekdays) && v.weekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
  Array.isArray(v.slots) && v.slots.every(isSlot) &&
  typeof v.stopsPerCollector === "number" && typeof v.horizonDays === "number";

const isClosure = (v: unknown): v is ServiceClosure =>
  isRecord(v) && isString(v.id) && isISODate(v.date) && (v.zone === null || isZone(v.zone)) && isString(v.reason);

const isCollectorAvailability = (v: unknown): v is CollectorAvailability =>
  isRecord(v) && isString(v.collectorId) && isZone(v.zone) && isRecord(v.weekly) &&
  Object.values(v.weekly).every((ids) => Array.isArray(ids) && ids.every(isString));

const isTimeOff = (v: unknown): v is CollectorTimeOff => isRecord(v) && isString(v.id) && isString(v.collectorId) && isISODate(v.date);

function loadList<T>(key: string, guard: (v: unknown) => v is T, seed: () => T[]): T[] {
  const stored = readJSON(key);
  if (Array.isArray(stored) && stored.every(guard)) return stored;
  const fresh = seed();
  writeJSON(key, fresh);
  return fresh;
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const loadSchedules = () => loadList(STORAGE_KEYS.schedules, isZoneSchedule, () => SEED_ZONE_SCHEDULES);
const loadClosures = () => loadList(STORAGE_KEYS.closures, isClosure, () => createSeedClosures(new Date()));
const loadAvailability = () => loadList(STORAGE_KEYS.availability, isCollectorAvailability, () => SEED_AVAILABILITY);
const loadTimeOff = () => loadList(STORAGE_KEYS.timeOff, isTimeOff, () => createSeedTimeOff(new Date()));

export const scheduleRepo = {
  async listZoneSchedules(): Promise<ZoneSchedule[]> {
    return loadSchedules();
  },
  async saveZoneSchedule(schedule: ZoneSchedule): Promise<ZoneSchedule[]> {
    const next = [...loadSchedules().filter((s) => s.zone !== schedule.zone), schedule];
    writeJSON(STORAGE_KEYS.schedules, next);
    return next;
  },
  async listClosures(): Promise<ServiceClosure[]> {
    return loadClosures();
  },
  async addClosure(input: Omit<ServiceClosure, "id">): Promise<ServiceClosure> {
    const closure = { ...input, id: newId("cl") };
    writeJSON(STORAGE_KEYS.closures, [...loadClosures(), closure]);
    return closure;
  },
  async removeClosure(id: string): Promise<void> {
    writeJSON(STORAGE_KEYS.closures, loadClosures().filter((c) => c.id !== id));
  },
  async listAvailability(): Promise<CollectorAvailability[]> {
    return loadAvailability();
  },
  async saveAvailability(entry: CollectorAvailability): Promise<CollectorAvailability[]> {
    const next = [...loadAvailability().filter((a) => a.collectorId !== entry.collectorId), entry];
    writeJSON(STORAGE_KEYS.availability, next);
    return next;
  },
  async listTimeOff(): Promise<CollectorTimeOff[]> {
    return loadTimeOff();
  },
  async addTimeOff(input: Omit<CollectorTimeOff, "id">): Promise<CollectorTimeOff> {
    const entry = { ...input, id: newId("to") };
    writeJSON(STORAGE_KEYS.timeOff, [...loadTimeOff(), entry]);
    return entry;
  },
  async removeTimeOff(id: string): Promise<void> {
    writeJSON(STORAGE_KEYS.timeOff, loadTimeOff().filter((t) => t.id !== id));
  },
  /** Borra lo guardado; la próxima lectura vuelve a sembrar. */
  async reset(): Promise<void> {
    [STORAGE_KEYS.schedules, STORAGE_KEYS.closures, STORAGE_KEYS.availability, STORAGE_KEYS.timeOff].forEach((key) => removeKey(key));
  },
};
```

**Paso 5: Correr y ver que pasan.**
Ejecutar: `pnpm vitest run src/data`
Esperado: PASS (todos los tests de `src/data`).

**Paso 6: Commit.**
```bash
git add src/data
git commit -m "Repositorio y semillas del calendario de disponibilidad"
```

---

### Tarea 4: Estado del calendario y operaciones sobre pedidos ("No puedo ir")

**Archivos:**
- Modificar: `src/data/requestActions.ts`, `src/data/data.test.ts`
- Reemplazar: `src/state/contexts.ts`, `src/state/RequestsProvider.tsx`, `src/components/RequestActionButton.tsx`
- Crear: `src/state/ScheduleProvider.tsx`, `src/state/useRequestOperations.ts`
- Modificar: `src/state/RequestFlowProvider.tsx`, `src/components/RequestDetailDialog.tsx`, `src/App.tsx`, `src/app/AppLayout.tsx`, `src/pages/shared/Perfil.tsx`

**Paso 1: Test que falla para la nueva acción.** En `src/data/data.test.ts`, reemplazar el bloque `describe("acciones por rol", …)` desde el test del reciclador hasta el final del bloque por:
```ts
  it("el reciclador acepta pedidos libres, marca como recogidos los suyos o los libera", () => {
    const session = { actorId: "rec-rosa", role: "reciclador" as const, email: "x@y.pe" };
    const ids = (r: PickupRequest) => getAvailableActions(r, session).map((a) => a.id);
    expect(ids(request({ status: "solicitado", collectorId: null }))).toEqual(["aceptar"]);
    expect(ids(request({ status: "asignado" }))).toEqual(["recoger", "liberar"]);
    expect(ids(request({ status: "asignado", collectorId: "rec-mario" }))).toEqual([]);
  });

  it("la empresa registra la recepción de lo recogido", () => {
    const session = { actorId: "emp-recicla", role: "empresa" as const, email: "x@y.pe" };
    const ids = (r: PickupRequest) => getAvailableActions(r, session).map((a) => a.id);
    expect(ids(request({ status: "recogido" }))).toEqual(["recibir"]);
    expect(ids(request({ status: "entregado" }))).toEqual([]);
  });
});
```
Ejecutar: `pnpm vitest run src/data/data.test.ts`
Esperado: FAIL (`["recoger"]` en lugar de `["recoger", "liberar"]`).

**Paso 2: Acción "liberar".** En `src/data/requestActions.ts`, reemplazar `RequestAction` y `getAvailableActions` por:
```ts
export type RequestAction =
  | { id: "aceptar" | "recoger" | "recibir"; label: string; nextStatus: RequestStatus; collectorId?: string; successMessage: string }
  | { id: "liberar"; label: string };

/** Acciones que la sesión actual puede hacer sobre un pedido, según su rol y el estado. */
export function getAvailableActions(request: PickupRequest, session: Session): RequestAction[] {
  if (session.role === "reciclador") {
    if (request.status === "solicitado" && request.collectorId === null) {
      return [{ id: "aceptar", label: "Aceptar recojo", nextStatus: "asignado", collectorId: session.actorId, successMessage: `Aceptaste el recojo ${request.id}.` }];
    }
    if (request.status === "asignado" && request.collectorId === session.actorId) {
      return [
        { id: "recoger", label: "Marcar como recogido", nextStatus: "recogido", successMessage: `Registraste el recojo ${request.id}.` },
        { id: "liberar", label: "No puedo ir" },
      ];
    }
  }
  if (session.role === "empresa" && request.status === "recogido") {
    return [{ id: "recibir", label: "Registrar recepción", nextStatus: "entregado", successMessage: `Recepción de ${request.id} registrada.` }];
  }
  return [];
}
```
Ejecutar: `pnpm vitest run src/data/data.test.ts` → PASS.

**Paso 3: Contextos.** Reemplazar `src/state/contexts.ts` completo por:
```ts
import { createContext, useCallback, useContext } from "react";
import type { SignInInput, SignUpInput } from "@/data/repositories";
import type { Actor, CollectorAvailability, CollectorTimeOff, MaterialId, NewPickupRequest, PickupRequest, RequestStatus, ServiceClosure, Session, ZoneId, ZoneSchedule } from "@/types";

function useRequired<T>(context: React.Context<T | null>, name: string): T {
  const value = useContext(context);
  if (value === null) throw new Error(`${name} debe usarse dentro de su proveedor.`);
  return value;
}

/* Sesión y perfiles */
export interface SessionValue {
  ready: boolean;
  session: Session | null;
  actor: Actor | null;
  actors: Actor[];
  actorsById: Map<string, Actor>;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Omit<Actor, "id" | "role">>) => Promise<void>;
}
export const SessionContext = createContext<SessionValue | null>(null);
export const useSession = () => useRequired(SessionContext, "useSession");

/** Para pantallas dentro del área privada, donde la sesión ya está garantizada. */
export function useAuthenticated() {
  const value = useSession();
  if (!value.session || !value.actor) throw new Error("Se requiere una sesión activa.");
  return { ...value, session: value.session, actor: value.actor };
}

/* Pedidos */
export interface RequestsValue {
  requests: PickupRequest[];
  loading: boolean;
  createRequest: (input: NewPickupRequest, collectorId: string | null) => Promise<PickupRequest>;
  updateStatus: (id: string, status: RequestStatus, collectorId?: string) => Promise<void>;
  reassign: (id: string, collectorId: string | null) => Promise<void>;
  resetDemo: () => Promise<void>;
}
export const RequestsContext = createContext<RequestsValue | null>(null);
export const useRequests = () => useRequired(RequestsContext, "useRequests");

/* Calendario de disponibilidad */
export interface ScheduleValue {
  schedules: ZoneSchedule[];
  closures: ServiceClosure[];
  availability: CollectorAvailability[];
  timeOff: CollectorTimeOff[];
  scheduleFor: (zone: ZoneId) => ZoneSchedule;
  saveZoneSchedule: (schedule: ZoneSchedule) => Promise<void>;
  addClosure: (closure: Omit<ServiceClosure, "id">) => Promise<void>;
  removeClosure: (id: string) => Promise<void>;
  saveAvailability: (entry: CollectorAvailability) => Promise<void>;
  addTimeOff: (entry: Omit<CollectorTimeOff, "id">) => Promise<void>;
  removeTimeOff: (id: string) => Promise<void>;
  reset: () => Promise<void>;
}
export const ScheduleStateContext = createContext<ScheduleValue | null>(null);
export const useSchedule = () => useRequired(ScheduleStateContext, "useSchedule");

/** Contexto de cálculo de disponibilidad para una zona (ver `@/data/availability`). */
export function useScheduleInput() {
  const schedule = useSchedule();
  const { requests } = useRequests();
  return useCallback(
    (zone: ZoneId, pool: PickupRequest[] = requests) => ({
      schedule: schedule.scheduleFor(zone),
      closures: schedule.closures,
      availability: schedule.availability,
      timeOff: schedule.timeOff,
      requests: pool,
    }),
    [schedule, requests],
  );
}

/** Restaura pedidos y calendario de demostración. */
export function useResetDemo() {
  const { resetDemo } = useRequests();
  const { reset } = useSchedule();
  return useCallback(async () => {
    await Promise.all([resetDemo(), reset()]);
  }, [resetDemo, reset]);
}

/* Avisos */
export const ToastContext = createContext<((message: string) => void) | null>(null);
export const useToast = () => useRequired(ToastContext, "useToast");

/* Flujos de pedido: asistente de solicitud y detalle */
export interface RequestFlowValue {
  openWizard: (material?: MaterialId) => void;
  openDetail: (requestId: string) => void;
}
export const RequestFlowContext = createContext<RequestFlowValue | null>(null);
export const useRequestFlow = () => useRequired(RequestFlowContext, "useRequestFlow");
```

**Paso 4: Proveedor de pedidos.** En `src/state/RequestsProvider.tsx`:
- Reemplazar `createRequest` por:
```ts
  const createRequest = useCallback(async (input: NewPickupRequest, collectorId: string | null) => {
    const created = await requestsRepo.create(input, collectorId);
    setRequests((current) => [created, ...current]);
    return created;
  }, []);
```
- Agregar debajo de `updateStatus`:
```ts
  const reassign = useCallback(async (id: string, collectorId: string | null) => {
    const updated = await requestsRepo.reassign(id, collectorId);
    setRequests((current) => current.map((r) => (r.id === id ? updated : r)));
  }, []);
```
- En el `useMemo` del valor, agregar `reassign` al objeto y a las dependencias.

**Paso 5: Proveedor del calendario.** Crear `src/state/ScheduleProvider.tsx`:
```tsx
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultZoneSchedule } from "@/data/catalog";
import { scheduleRepo } from "@/data/repositories";
import { ScheduleStateContext, type ScheduleValue } from "./contexts";
import type { CollectorAvailability, CollectorTimeOff, ServiceClosure, ZoneSchedule } from "@/types";

interface ScheduleData {
  schedules: ZoneSchedule[];
  closures: ServiceClosure[];
  availability: CollectorAvailability[];
  timeOff: CollectorTimeOff[];
}

async function loadAll(): Promise<ScheduleData> {
  const [schedules, closures, availability, timeOff] = await Promise.all([
    scheduleRepo.listZoneSchedules(),
    scheduleRepo.listClosures(),
    scheduleRepo.listAvailability(),
    scheduleRepo.listTimeOff(),
  ]);
  return { schedules, closures, availability, timeOff };
}

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ScheduleData | null>(null);

  useEffect(() => {
    let active = true;
    loadAll().then((loaded) => active && setData(loaded));
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => setData(await loadAll()), []);

  const value = useMemo<ScheduleValue | null>(() => {
    if (!data) return null;
    return {
      ...data,
      scheduleFor: (zone) => data.schedules.find((s) => s.zone === zone) ?? defaultZoneSchedule(zone),
      saveZoneSchedule: async (schedule) => { await scheduleRepo.saveZoneSchedule(schedule); await refresh(); },
      addClosure: async (closure) => { await scheduleRepo.addClosure(closure); await refresh(); },
      removeClosure: async (id) => { await scheduleRepo.removeClosure(id); await refresh(); },
      saveAvailability: async (entry) => { await scheduleRepo.saveAvailability(entry); await refresh(); },
      addTimeOff: async (entry) => { await scheduleRepo.addTimeOff(entry); await refresh(); },
      removeTimeOff: async (id) => { await scheduleRepo.removeTimeOff(id); await refresh(); },
      reset: async () => { await scheduleRepo.reset(); await refresh(); },
    };
  }, [data, refresh]);

  // Web Storage responde al instante; no hace falta una pantalla de carga.
  if (!value) return null;
  return <ScheduleStateContext.Provider value={value}>{children}</ScheduleStateContext.Provider>;
}
```

**Paso 6: Operaciones sobre pedidos.** Crear `src/state/useRequestOperations.ts`:
```ts
import { useCallback } from "react";
import { getDayAvailability, pickCollector } from "@/data/availability";
import type { RequestAction } from "@/data/requestActions";
import { useRequests, useScheduleInput, useSession, useToast } from "./contexts";
import type { PickupRequest } from "@/types";

export interface ReleaseResult {
  request: PickupRequest;
  next: string | null;
}

/** Ejecuta acciones sobre pedidos, incluida la liberación con reasignación automática. */
export function useRequestOperations() {
  const { actorsById } = useSession();
  const { requests, updateStatus, reassign } = useRequests();
  const contextFor = useScheduleInput();
  const announce = useToast();

  /** Libera pedidos uno por uno, contando las reasignaciones previas para no sobrecargar a nadie. */
  const releaseMany = useCallback(
    async (list: PickupRequest[]): Promise<ReleaseResult[]> => {
      let pool = requests;
      const results: ReleaseResult[] = [];
      for (const request of list) {
        const others = pool.filter((r) => r.id !== request.id);
        const ctx = contextFor(request.zone, others);
        const day = getDayAvailability(request.scheduledDate, ctx);
        const next = pickCollector(day, request.slotId, others, ctx.schedule.stopsPerCollector, request.collectorId);
        await reassign(request.id, next);
        pool = pool.map((r): PickupRequest => (r.id === request.id ? { ...r, collectorId: next, status: next ? "asignado" : "solicitado" } : r));
        results.push({ request, next });
      }
      return results;
    },
    [requests, contextFor, reassign],
  );

  const describeRelease = useCallback(
    ({ request, next }: ReleaseResult) =>
      next ? `Reasignamos ${request.id} a ${actorsById.get(next)?.name ?? "otro reciclador"}.` : `${request.id} volvió a la lista de disponibles de la zona.`,
    [actorsById],
  );

  const run = useCallback(
    async (request: PickupRequest, action: RequestAction) => {
      if (action.id === "liberar") {
        const [result] = await releaseMany([request]);
        announce(describeRelease(result));
        return;
      }
      await updateStatus(request.id, action.nextStatus, action.collectorId);
      announce(action.successMessage);
    },
    [releaseMany, describeRelease, updateStatus, announce],
  );

  return { run, releaseMany, describeRelease };
}
```

**Paso 7: Botón de acción.** Reemplazar `src/components/RequestActionButton.tsx` completo por:
```tsx
import { useState } from "react";
import { getAvailableActions } from "@/data/requestActions";
import { useAuthenticated } from "@/state/contexts";
import { useRequestOperations } from "@/state/useRequestOperations";
import type { PickupRequest } from "@/types";

/** Botón con la acción principal del pedido (aceptar, marcar recogido, recibir). */
export function RequestActionButton({ request, className = "inline-action" }: { request: PickupRequest; className?: string }) {
  const { session } = useAuthenticated();
  const { run } = useRequestOperations();
  const [busy, setBusy] = useState(false);
  const [action] = getAvailableActions(request, session);
  if (!action) return null;

  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await run(request, action);
        } finally {
          setBusy(false);
        }
      }}
    >
      {action.label}
    </button>
  );
}
```

**Paso 8: Detalle del pedido.** En `src/components/RequestDetailDialog.tsx`, reemplazar el `actions.map(...)` por:
```tsx
        {actions.map((action) => (
          <button key={action.id} type="button" className={action.id === "liberar" ? "back-button" : "primary-button"} disabled={busy} onClick={() => run(action)}>{action.label}</button>
        ))}
```

**Paso 9: Flujo de pedidos.** En `src/state/RequestFlowProvider.tsx`:
- Importar `import { useRequestOperations } from "./useRequestOperations";`.
- Cambiar `const { requests, createRequest, updateStatus } = useRequests();` por `const { requests, createRequest } = useRequests();` y agregar `const { run } = useRequestOperations();`.
- En `onSubmit`, cambiar `await createRequest(input)` por `await createRequest(input, null)` (la Tarea 5 lo reemplaza por la asignación).
- Reemplazar el `onAction` del detalle por `onAction={(action) => run(detail, action)}`.

**Paso 10: Montar el proveedor.** En `src/App.tsx`, importar `ScheduleProvider` y, dentro de `RequireSession`, reemplazar:
```tsx
    <RequestsProvider>
      <RequestFlowProvider>{children}</RequestFlowProvider>
    </RequestsProvider>
```
por:
```tsx
    <RequestsProvider>
      <ScheduleProvider>
        <RequestFlowProvider>{children}</RequestFlowProvider>
      </ScheduleProvider>
    </RequestsProvider>
```

**Paso 11: Reiniciar la demo completa.**
- `src/app/AppLayout.tsx`: cambiar `const { requests, resetDemo } = useRequests();` por `const { requests } = useRequests();` y `const resetDemo = useResetDemo();`, y agregar `useResetDemo` a la importación de `@/state/contexts`.
- `src/pages/shared/Perfil.tsx`: cambiar `const { resetDemo } = useRequests();` por `const resetDemo = useResetDemo();` y en la importación cambiar `useRequests` por `useResetDemo`.

**Paso 12: Verificar.**
Ejecutar: `pnpm check`
Esperado: sin errores y todos los tests en verde.

**Paso 13: Commit.**
```bash
git add src
git commit -m "Estado del calendario y acción 'No puedo ir' con reasignación"
```

---

### Tarea 5: Calendario de 14 días en el formulario del comercio

**Archivos:**
- Reemplazar: `src/components/RequestWizard.tsx`, `src/components/RequestWizard.test.tsx`, `src/state/RequestFlowProvider.tsx`
- Modificar: `src/data/catalog.ts` (quitar `SLOTS` y `SLOT_CAPACITY`)
- Crear: `src/test/renderApp.tsx`, `src/state/booking.test.tsx`
- Modificar: `src/test/setup.ts`

**Paso 1: Tests del formulario.** Reemplazar `src/components/RequestWizard.test.tsx` por:
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DayAvailability, SlotAvailability } from "@/data/availability";
import { SEED_ACTORS } from "@/data/mock";
import { RequestWizard } from "./RequestWizard";

const actor = SEED_ACTORS[0];
const TODAY = new Date(2026, 10, 12, 9); // jueves

const slot = (id: string, start: string, end: string, remaining: number, collectorIds = remaining > 0 ? ["rec-rosa"] : []): SlotAvailability => ({
  slot: { id, start, end }, label: `${start} – ${end}`, collectorIds, capacity: collectorIds.length * 3, booked: 3 - remaining, remaining,
});

const DAYS: DayAvailability[] = [
  { date: "2026-11-13", open: true, reason: null, slots: [slot("08-10", "08:00", "10:00", 0, ["rec-rosa"]), slot("10-12", "10:00", "12:00", 3), slot("14-16", "14:00", "16:00", 1)] },
  { date: "2026-11-14", open: true, reason: null, slots: [slot("08-10", "08:00", "10:00", 2), slot("10-12", "10:00", "12:00", 0), slot("14-16", "14:00", "16:00", 0)] },
  { date: "2026-11-15", open: false, reason: "Sin servicio este día", slots: [] },
  { date: "2026-11-16", open: true, reason: null, slots: [slot("08-10", "08:00", "10:00", 0, ["rec-rosa"]), slot("10-12", "10:00", "12:00", 0, ["rec-rosa"]), slot("14-16", "14:00", "16:00", 0, ["rec-rosa"])] },
];

function setup(days = DAYS, onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  render(<RequestWizard actor={actor} days={days} today={TODAY} onSubmit={onSubmit} onClose={onClose} onEditAddress={vi.fn()} />);
  return { onSubmit, onClose, user: userEvent.setup() };
}

describe("RequestWizard", () => {
  it("envía material, kilos, día y franja elegidos", async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole("button", { name: /plástico/i }));
    await user.click(screen.getByRole("button", { name: "Sumar un kilo" }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /^sáb, 14/i }));
    await user.click(screen.getByRole("button", { name: /confirmar recojo/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      requesterId: actor.id, material: "plastico", kg: 11, scheduledDate: "2026-11-14",
      slotId: "08-10", slot: "08:00 – 10:00", address: actor.address, zone: actor.zone,
    });
  });

  it("no deja continuar con una cantidad fuera de rango", async () => {
    const { user } = setup();
    const input = screen.getByLabelText(/cantidad aproximada/i);
    await user.clear(input);
    await user.type(input, "500");
    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
    expect(screen.getByText(/ingresa un número entero/i)).toBeInTheDocument();
  });

  it("deshabilita días cerrados o llenos y franjas sin cupo", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    expect(screen.getByRole("button", { name: /^dom, 15/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^lun, 16/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /08:00 – 10:00/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /10:00 – 12:00/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /14:00 – 16:00/ })).toHaveTextContent("1 cupo");
  });

  it("avisa cuando no hay cupos en todo el horizonte", async () => {
    const { user } = setup([DAYS[2]]);
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    expect(screen.getByText(/no hay cupos en los próximos/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar recojo/i })).toBeDisabled();
  });

  it("muestra el error si la reserva falla", async () => {
    const { user } = setup(DAYS, vi.fn().mockRejectedValue(new Error("Ese horario se acaba de llenar. Elige otro.")));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /confirmar recojo/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ese horario se acaba de llenar");
  });

  it("se cierra con Escape", async () => {
    const { onClose, user } = setup();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

**Paso 2: Correr y ver que fallan.**
Ejecutar: `pnpm vitest run src/components/RequestWizard.test.tsx`
Esperado: FAIL (falla el typecheck del prop `days` y no existen los botones de día).

**Paso 3: Nuevo formulario.** Reemplazar `src/components/RequestWizard.tsx` por:
```tsx
import { useId, useState } from "react";
import { DAY_LEVEL_LABELS, dayLevel, remainingOf, type DayAvailability } from "@/data/availability";
import { MATERIAL_LIST, MATERIALS, MAX_KG, MIN_KG, ZONES } from "@/data/catalog";
import { dayNumber, formatRelativeDay, monthShort, weekdayShort } from "@/data/dates";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { materialStyle } from "./materialStyle";
import type { Actor, MaterialId, NewPickupRequest } from "@/types";

interface RequestWizardProps {
  actor: Actor;
  /** Disponibilidad de los próximos días en la zona del comercio. */
  days: DayAvailability[];
  initialMaterial?: MaterialId;
  today?: Date;
  onClose: () => void;
  onSubmit: (input: NewPickupRequest) => Promise<void>;
  onEditAddress: () => void;
}

const LEGEND = ["open", "low", "full", "closed"] as const;

export function RequestWizard({ actor, days, initialMaterial = "carton", today, onClose, onSubmit, onEditAddress }: RequestWizardProps) {
  const ids = { kg: useId(), materials: useId(), days: useId(), slots: useId(), kgHint: useId() };
  const [step, setStep] = useState<1 | 2>(1);
  const [material, setMaterial] = useState<MaterialId>(initialMaterial);
  const [kgText, setKgText] = useState("10");
  const [date, setDate] = useState<string | null>(() => days.find((d) => d.open && remainingOf(d) > 0)?.date ?? null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const kg = Number(kgText);
  const kgValid = Number.isInteger(kg) && kg >= MIN_KG && kg <= MAX_KG;
  const setKg = (value: number) => setKgText(String(Math.min(MAX_KG, Math.max(MIN_KG, value))));

  const day = days.find((d) => d.date === date);
  const selected = day?.slots.find((s) => s.slot.id === slotId && s.remaining > 0) ?? day?.slots.find((s) => s.remaining > 0) ?? null;
  const hasAddress = actor.address.trim().length > 0;

  const submit = async () => {
    if (!day || !selected || !hasAddress) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({ requesterId: actor.id, material, kg, scheduledDate: day.date, slotId: selected.slot.id, slot: selected.label, address: actor.address, zone: actor.zone });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos registrar el recojo. Inténtalo otra vez.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog title={step === 1 ? "¿Qué vamos a recoger?" : "Elige día y horario"} eyebrow={`PASO ${step} DE 2`} onClose={onClose}>
      <div className="modal-progress" aria-hidden="true"><i className="active" /><i className={step === 2 ? "active" : ""} /></div>

      {step === 1 ? (
        <>
          <p id={ids.materials} className="amount-label mt-0!">Material</p>
          <div className="select-materials" role="group" aria-labelledby={ids.materials}>
            {MATERIAL_LIST.map((item) => (
              <button key={item.id} type="button" aria-pressed={material === item.id} className={material === item.id ? "selected" : ""} onClick={() => setMaterial(item.id)} style={materialStyle(item.id)}>
                <span><Icon name={item.icon} /></span>
                {item.name}
                <i>{material === item.id && <Icon name="check" size={13} />}</i>
              </button>
            ))}
          </div>

          <label className="amount-label" htmlFor={ids.kg}>Cantidad aproximada (kg)</label>
          <div className="amount-control">
            <button type="button" onClick={() => setKg((kgValid ? kg : MIN_KG) - 1)} disabled={kgValid && kg <= MIN_KG} aria-label="Restar un kilo">−</button>
            <div>
              <input id={ids.kg} type="number" inputMode="numeric" min={MIN_KG} max={MAX_KG} step={1} value={kgText} aria-describedby={ids.kgHint} aria-invalid={!kgValid} onChange={(event) => setKgText(event.target.value)} onBlur={() => kgText !== "" && setKg(Math.round(kg) || MIN_KG)} />
              <span>kg</span>
            </div>
            <button type="button" onClick={() => setKg((kgValid ? kg : MIN_KG) + 1)} disabled={kgValid && kg >= MAX_KG} aria-label="Sumar un kilo">+</button>
          </div>
          <p id={ids.kgHint} className={`hint ${kgValid ? "" : "error"}`}>
            {kgValid ? `Entre ${MIN_KG} y ${MAX_KG} kg por recojo.` : `Ingresa un número entero entre ${MIN_KG} y ${MAX_KG} kg.`}
          </p>
          <button type="button" className="primary-button full" disabled={!kgValid} onClick={() => setStep(2)}>Continuar <Icon name="chevron" /></button>
        </>
      ) : (
        <>
          <div className="selected-summary">
            <span><Icon name="map" /></span>
            <div>
              <small>ZONA DE RECOJO</small>
              <strong>{hasAddress ? `${actor.address} · ${ZONES[actor.zone].name}` : "Aún no registras una dirección"}</strong>
            </div>
            <button type="button" onClick={onEditAddress}>{hasAddress ? "Cambiar" : "Agregar"}</button>
          </div>

          <p id={ids.days} className="amount-label">Día del recojo</p>
          <div className="day-strip" role="group" aria-labelledby={ids.days}>
            {days.map((d) => {
              const level = dayLevel(d);
              const status = d.reason ?? DAY_LEVEL_LABELS[level];
              return (
                <button key={d.date} type="button" disabled={level === "closed" || level === "full"} aria-pressed={date === d.date} className={`day-chip ${date === d.date ? "selected" : ""}`} onClick={() => { setDate(d.date); setSlotId(null); }} aria-label={`${formatRelativeDay(d.date, today)} · ${status}`} title={status}>
                  <span>{weekdayShort(d.date)}</span>
                  <strong>{dayNumber(d.date)}</strong>
                  <small>{monthShort(d.date)}</small>
                  <i className={`level-dot ${level}`} aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <ul className="level-legend" aria-hidden="true">
            {LEGEND.map((level) => <li key={level}><i className={`level-dot ${level}`} />{DAY_LEVEL_LABELS[level]}</li>)}
          </ul>

          {day ? (
            <>
              <p id={ids.slots} className="amount-label">Horarios disponibles</p>
              <div className="slot-picker" role="group" aria-labelledby={ids.slots}>
                {day.slots.map((s) => (
                  <button key={s.slot.id} type="button" disabled={s.remaining <= 0} aria-pressed={selected?.slot.id === s.slot.id} className={selected?.slot.id === s.slot.id ? "selected" : ""} onClick={() => setSlotId(s.slot.id)}>
                    <Icon name="clock" size={16} />
                    {s.label}
                    <span>{s.collectorIds.length === 0 ? "Sin reciclador" : s.remaining <= 0 ? "Sin cupos" : s.remaining === 1 ? "1 cupo" : `${s.remaining} cupos`}</span>
                  </button>
                ))}
              </div>
              <p className="hint">
                {selected ? `${kg} kg de ${MATERIALS[material].name.toLowerCase()} · ${formatRelativeDay(day.date, today)} · ${selected.label}` : "No quedan cupos este día. Elige otro."}
              </p>
            </>
          ) : (
            <p className="hint error">No hay cupos en los próximos {days.length} días en tu zona. Prueba más adelante.</p>
          )}
          {error && <p className="hint error" role="alert">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="back-button" onClick={() => setStep(1)}>Atrás</button>
            <button type="button" className="primary-button" onClick={submit} disabled={!selected || !hasAddress || submitting}>
              {submitting ? "Registrando…" : "Confirmar recojo"}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
```

**Paso 4: Quitar las constantes viejas.** En `src/data/catalog.ts`, borrar `export const SLOTS = …` y `export const SLOT_CAPACITY = 3;` (con su comentario).
Ejecutar: `pnpm typecheck`. Esperado: sin errores (nadie más las usa).

**Paso 5: Asignación al reservar.** Reemplazar `src/state/RequestFlowProvider.tsx` por:
```tsx
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { RequestDetailDialog } from "@/components/RequestDetailDialog";
import { RequestWizard } from "@/components/RequestWizard";
import { getAvailability, getDayAvailability, pickCollector } from "@/data/availability";
import { RequestFlowContext, useRequests, useScheduleInput, useSession, useToast, type RequestFlowValue } from "./contexts";
import { useRequestOperations } from "./useRequestOperations";
import type { MaterialId } from "@/types";

/** Monta el asistente "Solicitar recojo" y el detalle de pedido, accesibles desde cualquier pantalla. */
export function RequestFlowProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const announce = useToast();
  const { session, actor, actorsById } = useSession();
  const { requests, createRequest } = useRequests();
  const { run } = useRequestOperations();
  const contextFor = useScheduleInput();
  const [today] = useState(() => new Date());
  // `key` cambia en cada apertura para que el asistente empiece siempre en el paso 1.
  const [wizard, setWizard] = useState<{ key: number; material?: MaterialId } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const openWizard = useCallback((material?: MaterialId) => setWizard({ key: Date.now(), material }), []);
  const openDetail = useCallback((id: string) => setDetailId(id), []);
  const value = useMemo<RequestFlowValue>(() => ({ openWizard, openDetail }), [openWizard, openDetail]);

  const detail = detailId ? requests.find((r) => r.id === detailId) : undefined;

  return (
    <RequestFlowContext.Provider value={value}>
      {children}

      {wizard && actor && session?.role === "comercio" && (
        <RequestWizard
          key={wizard.key}
          actor={actor}
          days={getAvailability(today, contextFor(actor.zone))}
          today={today}
          initialMaterial={wizard.material}
          onClose={() => setWizard(null)}
          onEditAddress={() => {
            setWizard(null);
            navigate("/perfil");
          }}
          onSubmit={async (input) => {
            // Se recalcula al confirmar: otro comercio pudo tomar el último cupo.
            const ctx = contextFor(actor.zone);
            const collectorId = pickCollector(getDayAvailability(input.scheduledDate, ctx), input.slotId, ctx.requests, ctx.schedule.stopsPerCollector);
            if (!collectorId) throw new Error("Ese horario se acaba de llenar. Elige otro.");
            const created = await createRequest(input, collectorId);
            setWizard(null);
            navigate("/pedidos");
            announce(`Recojo ${created.id} confirmado. Te visitará ${actorsById.get(collectorId)?.name ?? "un reciclador de tu zona"}.`);
          }}
        />
      )}

      {detail && session && (
        <RequestDetailDialog request={detail} session={session} actorsById={actorsById} onClose={() => setDetailId(null)} onAction={(action) => run(detail, action)} />
      )}
    </RequestFlowContext.Provider>
  );
}
```

**Paso 6: Ayudante de pruebas de integración.** Crear `src/test/renderApp.tsx`:
```tsx
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import App from "@/App";
import { DEMO_ACTOR_BY_ROLE } from "@/data/mock";
import { STORAGE_KEYS } from "@/data/repositories";
import { writeJSON } from "@/data/storage";
import type { Role } from "@/types";

/** Jueves 12 de noviembre de 2026, 09:00. */
export const TEST_TODAY = new Date(2026, 10, 12, 9);

/** Congela solo la fecha (los temporizadores siguen reales para user-event). */
export function freezeToday() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_TODAY);
}

/** Renderiza la app completa con la cuenta de demostración del rol, en la ruta indicada. */
export function renderApp(path: string, role: Role) {
  writeJSON(STORAGE_KEYS.session, { actorId: DEMO_ACTOR_BY_ROLE[role], role, email: "demo@ejemplo.pe" });
  window.history.pushState({}, "", path);
  const user = userEvent.setup();
  return { user, ...render(<App />) };
}
```
En `src/test/setup.ts`, importar `vi` desde `vitest` y agregar `vi.useRealTimers();` dentro del `afterEach`.

**Paso 7: Test de integración de la reserva.** Crear `src/state/booking.test.tsx`:
```tsx
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { requestsRepo } from "@/data/repositories";
import { freezeToday, renderApp } from "@/test/renderApp";

describe("reserva de un comercio", () => {
  it("asigna automáticamente a la recicladora disponible", async () => {
    freezeToday();
    const { user } = renderApp("/inicio", "comercio");
    await user.click((await screen.findAllByRole("button", { name: /solicitar recojo/i }))[0]);
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    // Rosa no trabaja martes; el miércoles 18 tiene el día libre; el domingo no hay servicio.
    expect(screen.getByRole("button", { name: /^dom, 15/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^mar, 17/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^mié, 18/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /confirmar recojo/i }));
    expect(await screen.findByText(/te visitará rosa quispe/i)).toBeInTheDocument();

    await waitFor(async () => {
      const [latest] = await requestsRepo.list();
      expect(latest).toMatchObject({ requesterId: "com-bazar", scheduledDate: "2026-11-13", slotId: "08-10", status: "asignado", collectorId: "rec-rosa" });
    });
  });
});
```

**Paso 8: Correr y ver que pasan.**
Ejecutar: `pnpm check`
Esperado: sin errores y todos los tests en verde.

**Paso 9: Commit.**
```bash
git add src
git commit -m "Calendario de 14 días con asignación automática al reservar"
```

---

### Tarea 6: Sección "Disponibilidad" del reciclador

**Archivos:**
- Crear: `src/pages/reciclador/Disponibilidad.tsx`
- Test: `src/pages/reciclador/Disponibilidad.test.tsx`
- Modificar: `src/app/navigation.ts`, `src/app/sections.ts`, `src/pages/reciclador/Reciclador.tsx`

**Paso 1: Test que falla.** Crear `src/pages/reciclador/Disponibilidad.test.tsx`:
```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { requestsRepo, scheduleRepo } from "@/data/repositories";
import { freezeToday, renderApp } from "@/test/renderApp";

describe("Disponibilidad del reciclador", () => {
  it("guarda una franja nueva en la semana tipo", async () => {
    freezeToday();
    const { user } = renderApp("/disponibilidad", "reciclador");
    const cell = await screen.findByRole("button", { name: "Mar 14:00 – 16:00" });
    expect(cell).toHaveAttribute("aria-pressed", "false");
    await user.click(cell);
    await user.click(screen.getByRole("button", { name: /guardar disponibilidad/i }));
    await waitFor(async () => {
      const rosa = (await scheduleRepo.listAvailability()).find((a) => a.collectorId === "rec-rosa");
      expect(rosa?.weekly[2]).toContain("14-16");
    });
  });

  it("al marcar libre un día con recojos, los libera", async () => {
    freezeToday();
    const created = await requestsRepo.create(
      { requesterId: "com-bazar", material: "carton", kg: 5, scheduledDate: "2026-11-13", slotId: "10-12", slot: "10:00 – 12:00", address: "Av. Ejército 1240", zone: "A" },
      "rec-rosa",
    );
    const { user } = renderApp("/disponibilidad", "reciclador");
    fireEvent.change(await screen.findByLabelText("Fecha"), { target: { value: "2026-11-13" } });
    await user.click(screen.getByRole("button", { name: /marcar libre/i }));
    await screen.findByRole("dialog", { name: /tienes recojos ese día/i });
    await user.click(screen.getByRole("button", { name: /liberar y marcar libre/i }));

    expect(await screen.findByText(new RegExp(`${created.id} volvió a la lista de disponibles`))).toBeInTheDocument();
    const updated = (await requestsRepo.list()).find((r) => r.id === created.id);
    expect(updated).toMatchObject({ status: "solicitado", collectorId: null });
    expect((await scheduleRepo.listTimeOff()).some((t) => t.collectorId === "rec-rosa" && t.date === "2026-11-13")).toBe(true);
  });
});
```
Ejecutar: `pnpm vitest run src/pages/reciclador` → FAIL (la ruta `/disponibilidad` redirige a Inicio).

**Paso 2: Página.** Crear `src/pages/reciclador/Disponibilidad.tsx`:
```tsx
import { useId, useState, type FormEvent } from "react";
import { Dialog } from "@/components/Dialog";
import { Icon } from "@/components/Icon";
import { PageIntro } from "@/components/ui";
import { slotLabel, WEEKDAY_LABELS, ZONES } from "@/data/catalog";
import { addDays, formatRelativeDay, toISODate } from "@/data/dates";
import { useAuthenticated, useRequests, useSchedule, useToast } from "@/state/contexts";
import { useRequestOperations } from "@/state/useRequestOperations";
import type { PickupRequest } from "@/types";

interface PendingTimeOff {
  date: string;
  reason: string;
  affected: PickupRequest[];
}

export function Disponibilidad() {
  const { actor } = useAuthenticated();
  const { requests } = useRequests();
  const { scheduleFor, availability, timeOff, saveAvailability, addTimeOff, removeTimeOff } = useSchedule();
  const { releaseMany, describeRelease } = useRequestOperations();
  const announce = useToast();
  const id = useId();
  const [today] = useState(() => new Date());
  const schedule = scheduleFor(actor.zone);
  const [weekly, setWeekly] = useState<Record<number, string[]>>(() => availability.find((a) => a.collectorId === actor.id)?.weekly ?? {});
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<PendingTimeOff | null>(null);

  const tomorrow = toISODate(addDays(today, 1));
  const myTimeOff = timeOff.filter((t) => t.collectorId === actor.id && t.date >= tomorrow).sort((a, b) => a.date.localeCompare(b.date));

  const isOn = (weekday: number, slotId: string) => (weekly[weekday] ?? []).includes(slotId);
  const toggle = (weekday: number, slotId: string) =>
    setWeekly((current) => {
      const set = new Set(current[weekday] ?? []);
      if (set.has(slotId)) set.delete(slotId);
      else set.add(slotId);
      return { ...current, [weekday]: [...set] };
    });

  const save = async () => {
    setSaving(true);
    try {
      await saveAvailability({ collectorId: actor.id, zone: actor.zone, weekly });
      announce("Disponibilidad guardada. Tus recojos ya asignados se mantienen.");
    } finally {
      setSaving(false);
    }
  };

  const confirmTimeOff = async ({ date, reason, affected }: PendingTimeOff) => {
    await addTimeOff({ collectorId: actor.id, date, reason: reason || undefined });
    if (affected.length > 0) {
      const results = await releaseMany(affected);
      announce(results.map(describeRelease).join(" "));
    } else {
      announce(`Marcaste libre el ${formatRelativeDay(date, today)}.`);
    }
    setPending(null);
  };

  const submitTimeOff = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const date = String(data.get("date"));
    const reason = String(data.get("reason") ?? "").trim();
    if (myTimeOff.some((t) => t.date === date)) {
      announce("Ese día ya está marcado como libre.");
      return;
    }
    const affected = requests.filter((r) => r.collectorId === actor.id && r.scheduledDate === date && r.status === "asignado");
    form.reset();
    if (affected.length > 0) setPending({ date, reason, affected });
    else void confirmTimeOff({ date, reason, affected });
  };

  return (
    <section className="page-section">
      <PageIntro eyebrow={`${ZONES[actor.zone].name} · ${ZONES[actor.zone].area}`.toUpperCase()} title="Disponibilidad" description="Marca los días y horarios en que puedes recoger. Con esto se calculan los cupos que ven los comercios." />
      <div className="role-grid">
        <article className="panel route-panel">
          <div className="panel-heading"><div><h3>Semana tipo</h3><p>Hasta {schedule.stopsPerCollector} recojos por franja</p></div></div>
          <div className="overflow-x-auto">
            <table className="availability-grid">
              <thead>
                <tr>
                  <th scope="col"><span className="sr-only">Franja</span></th>
                  {schedule.weekdays.map((d) => <th scope="col" key={d}>{WEEKDAY_LABELS[d]}</th>)}
                </tr>
              </thead>
              <tbody>
                {schedule.slots.map((slot) => (
                  <tr key={slot.id}>
                    <th scope="row">{slotLabel(slot)}</th>
                    {schedule.weekdays.map((d) => (
                      <td key={d}>
                        <button type="button" aria-pressed={isOn(d, slot.id)} aria-label={`${WEEKDAY_LABELS[d]} ${slotLabel(slot)}`} className={isOn(d, slot.id) ? "on" : ""} onClick={() => toggle(d, slot.id)}>
                          {isOn(d, slot.id) && <Icon name="check" size={14} />}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="primary-button mt-5" disabled={saving} onClick={save}>{saving ? "Guardando…" : "Guardar disponibilidad"}</button>
        </article>

        <article className="panel route-panel">
          <div className="panel-heading"><div><h3>Días libres</h3><p>No recibirás recojos esos días</p></div></div>
          <form className="profile-fields" onSubmit={submitTimeOff}>
            <label htmlFor={`${id}-date`}><span>Fecha</span><input id={`${id}-date`} type="date" name="date" required min={tomorrow} /></label>
            <label htmlFor={`${id}-reason`}><span>Motivo (opcional)</span><input id={`${id}-reason`} name="reason" maxLength={60} placeholder="Ej. Cita médica" /></label>
            <button type="submit" className="back-button sm:col-span-2">Marcar libre</button>
          </form>
          {myTimeOff.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No tienes días libres programados.</p>
          ) : (
            <ul className="time-off-list">
              {myTimeOff.map((t) => (
                <li key={t.id}>
                  <span><strong>{formatRelativeDay(t.date, today)}</strong>{t.reason && <small>{t.reason}</small>}</span>
                  <button type="button" className="text-button" aria-label={`Quitar día libre ${formatRelativeDay(t.date, today)}`} onClick={() => removeTimeOff(t.id)}>Quitar</button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>

      {pending && (
        <Dialog title="Tienes recojos ese día" eyebrow={formatRelativeDay(pending.date, today).toUpperCase()} onClose={() => setPending(null)}>
          <p className="mt-3 text-sm text-muted">
            Si marcas libre este día, liberaremos {pending.affected.length === 1 ? "este recojo" : `estos ${pending.affected.length} recojos`} para reasignarlos a otro reciclador de tu zona.
          </p>
          <ul className="lesson-steps">
            {pending.affected.map((r) => <li key={r.id}><span><Icon name="truck" size={13} /></span>{r.id} · {r.slot}</li>)}
          </ul>
          <div className="modal-actions">
            <button type="button" className="back-button" onClick={() => setPending(null)}>Cancelar</button>
            <button type="button" className="primary-button" onClick={() => confirmTimeOff(pending)}>Liberar y marcar libre</button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
```

**Paso 3: Navegación y ruta.**
- `src/app/navigation.ts`: en `reciclador.nav`, debajo de `Recojos`, agregar `{ label: "Disponibilidad", icon: "calendar", to: "disponibilidad" },`.
- `src/app/sections.ts`: importar `Disponibilidad` desde `@/pages/reciclador/Disponibilidad` y agregar `disponibilidad: Disponibilidad` al objeto `reciclador`.

**Paso 4: Tarjeta de Inicio con datos reales.** En `src/pages/reciclador/Reciclador.tsx`:
- Cambiar la importación de contextos a `import { useAuthenticated, useRequestFlow, useRequests, useSchedule } from "@/state/contexts";` (se va `useToast`) y agregar `slotLabel` a la importación de `@/data/catalog`.
- En `RecicladorInicio`, reemplazar `const announce = useToast();` por:
```ts
  const { scheduleFor, availability } = useSchedule();
  const [now] = useState(() => new Date());
  const todaySlots = (availability.find((a) => a.collectorId === actor.id)?.weekly[now.getDay()] ?? [])
    .map((slotId) => scheduleFor(actor.zone).slots.find((s) => s.id === slotId))
    .filter((slot) => slot !== undefined);
```
- Reemplazar el `<article className="panel availability-card">…</article>` de `RecicladorInicio` por:
```tsx
        <article className="panel availability-card">
          <span><Icon name="clock" size={25} /></span>
          <h3>Tu disponibilidad</h3>
          <p>{todaySlots.length > 0 ? `Hoy trabajas ${todaySlots.map(slotLabel).join(", ")} en la ${ZONES[actor.zone].name}.` : `Hoy no tienes franjas activas en la ${ZONES[actor.zone].name}.`}</p>
          <Link className="text-button mt-3" to="/disponibilidad">Editar disponibilidad</Link>
        </article>
```

**Paso 5: Correr y ver que pasan.**
Ejecutar: `pnpm check`
Esperado: sin errores y todos los tests en verde.

**Paso 6: Commit.**
```bash
git add src
git commit -m "Sección Disponibilidad del reciclador con días libres"
```

---

### Tarea 7: Sección "Calendario" del municipio

**Archivos:**
- Crear: `src/pages/municipio/Calendario.tsx`
- Test: `src/pages/municipio/Calendario.test.tsx`
- Modificar: `src/app/navigation.ts`, `src/app/sections.ts`

**Paso 1: Test que falla.** Crear `src/pages/municipio/Calendario.test.tsx`:
```tsx
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { scheduleRepo } from "@/data/repositories";
import { freezeToday, renderApp } from "@/test/renderApp";

describe("Calendario del municipio", () => {
  it("registra un cierre para todas las zonas", async () => {
    freezeToday();
    const { user } = renderApp("/calendario", "municipio");
    fireEvent.change(await screen.findByLabelText("Fecha"), { target: { value: "2026-11-16" } });
    await user.selectOptions(screen.getByLabelText("Aplica a"), "todas");
    await user.type(screen.getByLabelText("Motivo"), "Paro de transporte");
    await user.click(screen.getByRole("button", { name: /agregar cierre/i }));
    expect(await screen.findByText(/paro de transporte · todas las zonas/i)).toBeInTheDocument();
    await waitFor(async () => {
      expect(await scheduleRepo.listClosures()).toContainEqual(expect.objectContaining({ date: "2026-11-16", zone: null, reason: "Paro de transporte" }));
    });
  });

  it("no guarda un horario sin días", async () => {
    freezeToday();
    const { user } = renderApp("/calendario", "municipio");
    for (const day of ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]) {
      await user.click(await screen.findByRole("button", { name: day }));
    }
    await user.click(screen.getByRole("button", { name: /guardar horario/i }));
    expect(screen.getByRole("alert")).toHaveTextContent("Activa al menos un día y una franja.");
  });

  it("muestra la zona sin recicladores en el mapa de ocupación", async () => {
    freezeToday();
    renderApp("/calendario", "municipio");
    expect((await screen.findAllByTitle(/zona d, .*sin recicladores disponibles/i)).length).toBeGreaterThan(0);
  });
});
```
Ejecutar: `pnpm vitest run src/pages/municipio` → FAIL (la ruta redirige a Inicio).

**Paso 2: Página.** Crear `src/pages/municipio/Calendario.tsx`:
```tsx
import { useId, useState, type FormEvent } from "react";
import { Icon } from "@/components/Icon";
import { FilterChips, PageIntro } from "@/components/ui";
import { DAY_LEVEL_LABELS, dayLevel, getAvailability } from "@/data/availability";
import { slotLabel, WEEKDAY_LABELS, ZONE_IDS, ZONES } from "@/data/catalog";
import { addDays, dayNumber, formatRelativeDay, parseISODate, toISODate, weekdayShort } from "@/data/dates";
import { useRequests, useSchedule, useScheduleInput, useToast } from "@/state/contexts";
import type { SlotDefinition, ZoneId } from "@/types";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const LEGEND = ["open", "low", "full", "closed"] as const;

function OccupancyGrid({ today }: { today: Date }) {
  const contextFor = useScheduleInput();
  const rows = ZONE_IDS.map((zone) => ({ zone, days: getAvailability(today, contextFor(zone), 14) }));
  const dates = rows[0].days.map((d) => d.date);

  return (
    <>
      <div className="mt-4 overflow-x-auto">
        <table className="occupancy-grid">
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Zona</span></th>
              {dates.map((date) => <th scope="col" key={date}><span>{weekdayShort(date)}</span>{dayNumber(date)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ zone, days }) => (
              <tr key={zone}>
                <th scope="row">{ZONES[zone].name}</th>
                {days.map((day) => {
                  const capacity = day.slots.reduce((sum, s) => sum + s.capacity, 0);
                  const booked = day.slots.reduce((sum, s) => sum + s.booked, 0);
                  return (
                    <td key={day.date} className={`occ ${dayLevel(day)}`} title={`${ZONES[zone].name}, ${formatRelativeDay(day.date, today)}: ${day.reason ?? `${booked} de ${capacity} cupos reservados`}`}>
                      {day.open ? `${booked}/${capacity}` : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="level-legend" aria-hidden="true">
        {LEGEND.map((level) => <li key={level}><i className={`level-dot ${level}`} />{DAY_LEVEL_LABELS[level]}</li>)}
      </ul>
    </>
  );
}

function ZoneScheduleForm({ zone }: { zone: ZoneId }) {
  const { scheduleFor, saveZoneSchedule } = useSchedule();
  const { requests } = useRequests();
  const announce = useToast();
  const id = useId();
  const [today] = useState(() => new Date());
  const initial = scheduleFor(zone);
  const [weekdays, setWeekdays] = useState<number[]>(initial.weekdays);
  const [slots, setSlots] = useState<SlotDefinition[]>(initial.slots);
  const [stops, setStops] = useState(String(initial.stopsPerCollector));
  const [horizon, setHorizon] = useState(String(initial.horizonDays));
  const [newStart, setNewStart] = useState("16:00");
  const [newEnd, setNewEnd] = useState("18:00");
  const [error, setError] = useState("");

  const toggleDay = (day: number) => setWeekdays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()));

  const addSlot = () => {
    const slotId = `${newStart}-${newEnd}`.replace(/:/g, "");
    if (newStart >= newEnd) setError("La hora de fin debe ser posterior a la de inicio.");
    else if (slots.some((s) => s.id === slotId)) setError("Esa franja ya existe.");
    else {
      setSlots((current) => [...current, { id: slotId, start: newStart, end: newEnd }].sort((a, b) => a.start.localeCompare(b.start)));
      setError("");
    }
  };

  const save = async () => {
    const stopsN = Number(stops);
    const horizonN = Number(horizon);
    if (weekdays.length === 0 || slots.length === 0) return setError("Activa al menos un día y una franja.");
    if (!Number.isInteger(stopsN) || stopsN < 1 || stopsN > 10) return setError("Los recojos por reciclador deben estar entre 1 y 10.");
    if (!Number.isInteger(horizonN) || horizonN < 7 || horizonN > 30) return setError("Los días para reservar deben estar entre 7 y 30.");
    setError("");
    const todayIso = toISODate(today);
    const slotIds = new Set(slots.map((s) => s.id));
    const orphaned = requests.filter(
      (r) => r.zone === zone && r.status === "asignado" && r.scheduledDate > todayIso && (!weekdays.includes(parseISODate(r.scheduledDate).getDay()) || !slotIds.has(r.slotId)),
    ).length;
    await saveZoneSchedule({ zone, weekdays, slots, stopsPerCollector: stopsN, horizonDays: horizonN });
    announce(
      orphaned > 0
        ? `Horario de la ${ZONES[zone].name} guardado. ${orphaned} recojos ya reservados quedan fuera del nuevo horario: coordínalos con los comercios.`
        : `Horario de la ${ZONES[zone].name} guardado.`,
    );
  };

  return (
    <article className="panel profile-form">
      <div className="panel-heading"><div><h3>Horario de la {ZONES[zone].name}</h3><p>{ZONES[zone].area}</p></div></div>

      <p className="amount-label" id={`${id}-days`}>Días con servicio</p>
      <div className="filter-chips mt-2" role="group" aria-labelledby={`${id}-days`}>
        {WEEK_ORDER.map((d) => (
          <button key={d} type="button" aria-pressed={weekdays.includes(d)} className={weekdays.includes(d) ? "active" : ""} onClick={() => toggleDay(d)}>{WEEKDAY_LABELS[d]}</button>
        ))}
      </div>

      <p className="amount-label">Franjas</p>
      <ul className="time-off-list">
        {slots.map((s) => (
          <li key={s.id}>
            <span><strong>{slotLabel(s)}</strong></span>
            <button type="button" className="text-button" aria-label={`Quitar franja ${slotLabel(s)}`} onClick={() => setSlots((current) => current.filter((x) => x.id !== s.id))}>Quitar</button>
          </li>
        ))}
      </ul>

      <div className="profile-fields">
        <label htmlFor={`${id}-start`}><span>Desde</span><input id={`${id}-start`} type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} /></label>
        <label htmlFor={`${id}-end`}><span>Hasta</span><input id={`${id}-end`} type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} /></label>
        <button type="button" className="back-button sm:col-span-2" onClick={addSlot}><Icon name="plus" size={16} /> Agregar franja</button>
        <label htmlFor={`${id}-stops`}><span>Recojos por reciclador y franja</span><input id={`${id}-stops`} type="number" min={1} max={10} value={stops} onChange={(e) => setStops(e.target.value)} /></label>
        <label htmlFor={`${id}-horizon`}><span>Días para reservar</span><input id={`${id}-horizon`} type="number" min={7} max={30} value={horizon} onChange={(e) => setHorizon(e.target.value)} /></label>
      </div>
      {error && <p className="hint error" role="alert">{error}</p>}
      <button type="button" className="primary-button mt-5" onClick={save}>Guardar horario</button>
    </article>
  );
}

function ClosuresPanel({ zone }: { zone: ZoneId }) {
  const { closures, addClosure, removeClosure } = useSchedule();
  const { requests } = useRequests();
  const announce = useToast();
  const id = useId();
  const [today] = useState(() => new Date());
  const tomorrow = toISODate(addDays(today, 1));
  const upcoming = closures.filter((c) => c.date >= tomorrow).sort((a, b) => a.date.localeCompare(b.date));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const date = String(data.get("date"));
    const closureZone = data.get("scope") === "todas" ? null : zone;
    const affected = requests.filter((r) => r.scheduledDate === date && r.status === "asignado" && (closureZone === null || r.zone === closureZone)).length;
    await addClosure({ date, zone: closureZone, reason: String(data.get("reason") ?? "").trim() });
    form.reset();
    announce(affected > 0 ? `Cierre registrado. ${affected} recojos ya reservados ese día: coordínalos con los comercios.` : "Cierre registrado.");
  };

  return (
    <article className="panel profile-form">
      <div className="panel-heading"><div><h3>Feriados y cierres</h3><p>Días sin recojo</p></div></div>
      <form className="profile-fields" onSubmit={submit}>
        <label htmlFor={`${id}-date`}><span>Fecha</span><input id={`${id}-date`} type="date" name="date" required min={tomorrow} /></label>
        <label htmlFor={`${id}-scope`}>
          <span>Aplica a</span>
          <select id={`${id}-scope`} name="scope" defaultValue="zona">
            <option value="zona">Solo {ZONES[zone].name}</option>
            <option value="todas">Todas las zonas</option>
          </select>
        </label>
        <label htmlFor={`${id}-reason`} className="sm:col-span-2"><span>Motivo</span><input id={`${id}-reason`} name="reason" required maxLength={80} placeholder="Ej. Feriado: Día de la Independencia" /></label>
        <button type="submit" className="back-button sm:col-span-2">Agregar cierre</button>
      </form>
      {upcoming.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No hay cierres programados.</p>
      ) : (
        <ul className="time-off-list">
          {upcoming.map((c) => (
            <li key={c.id}>
              <span><strong>{formatRelativeDay(c.date, today)}</strong><small>{c.reason} · {c.zone ? ZONES[c.zone].name : "Todas las zonas"}</small></span>
              <button type="button" className="text-button" aria-label={`Quitar cierre del ${formatRelativeDay(c.date, today)}`} onClick={async () => { await removeClosure(c.id); announce("Cierre eliminado."); }}>Quitar</button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function Calendario() {
  const [today] = useState(() => new Date());
  const [zone, setZone] = useState<ZoneId>("A");

  return (
    <section className="page-section">
      <PageIntro eyebrow="RED DE RECOJO" title="Calendario" description="Define cuándo hay servicio en cada zona y revisa la ocupación de los próximos días." />
      <article className="panel role-table">
        <div className="panel-heading"><div><h3>Ocupación de los próximos 14 días</h3><p>Recojos reservados sobre capacidad, por zona</p></div></div>
        <OccupancyGrid today={today} />
      </article>
      <div className="mt-6">
        <FilterChips label="Zona a configurar" value={zone} onChange={setZone} options={ZONE_IDS.map((z) => ({ id: z, label: `${ZONES[z].name} · ${ZONES[z].area}` }))} />
      </div>
      <div className="role-grid">
        <ZoneScheduleForm key={zone} zone={zone} />
        <ClosuresPanel zone={zone} />
      </div>
    </section>
  );
}
```

**Paso 3: Navegación y ruta.**
- `src/app/navigation.ts`: en `municipio.nav`, debajo de `Operación`, agregar `{ label: "Calendario", icon: "calendar", to: "calendario" },`. En `municipio.mobileNav`, reemplazar el ítem `Indicadores` por `{ label: "Calendario", icon: "calendar", to: "calendario" }` (Indicadores sigue en la barra lateral).
- `src/app/sections.ts`: importar `Calendario` desde `@/pages/municipio/Calendario` y agregar `calendario: Calendario` al objeto `municipio`.

**Paso 4: Correr y ver que pasan.**
Ejecutar: `pnpm check`
Esperado: sin errores y todos los tests en verde.

**Paso 5: Commit.**
```bash
git add src
git commit -m "Sección Calendario del municipio: horarios, cierres y ocupación"
```

---

### Tarea 8: Estilos del calendario

**Archivos:**
- Modificar: `src/styles/components.css`, `src/styles/pages.css`

**Paso 1: Componentes.** En `src/styles/components.css`, borrar las cuatro reglas `.day-picker …` (ya no se usan) y agregar en su lugar:
```css
  .day-strip { margin-top: 8px; padding-bottom: 6px; display: grid; grid-auto-flow: column; grid-auto-columns: 66px; gap: 8px; overflow-x: auto; scroll-snap-type: x proximity; }
  .day-chip { min-height: 80px; display: grid; justify-items: center; align-content: center; gap: 1px; border: 1px solid var(--color-line); border-radius: 10px; color: var(--color-ink); background: white; scroll-snap-align: start; }
  .day-chip span, .day-chip small { font-size: 12px; font-weight: 700; }
  .day-chip strong { font: 700 19px/1.2 var(--font-display); }
  .day-chip.selected { border-color: var(--color-green); color: var(--color-green-dark); background: var(--color-green-soft); }
  .day-chip:disabled { color: #8f9a93; background: #f5f7f5; }
  .level-dot { width: 8px; height: 8px; margin-top: 3px; display: inline-block; border-radius: 50%; }
  .level-dot.open { background: var(--color-green); }
  .level-dot.low { background: #d39a3a; }
  .level-dot.full { background: var(--color-danger); }
  .level-dot.closed { background: #c4ccc6; }
  .level-legend { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 12px; color: var(--color-muted); font-size: 12px; }
  .level-legend li { display: flex; align-items: center; gap: 5px; }
  .level-legend .level-dot { margin: 0; }
```

**Paso 2: Páginas.** En `src/styles/pages.css`, antes de `/* Perfil */`, agregar:
```css
  /* Calendario: disponibilidad del reciclador y ocupación del municipio */
  .availability-grid { width: 100%; margin-top: 16px; border-collapse: separate; border-spacing: 6px; }
  .availability-grid th { color: var(--color-muted); font-size: 12px; font-weight: 800; text-align: center; }
  .availability-grid th[scope="row"] { color: var(--color-ink); font-size: 13px; text-align: left; white-space: nowrap; }
  .availability-grid button { width: 100%; min-width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid var(--color-line); border-radius: 9px; color: white; background: #f5f7f5; }
  .availability-grid button.on { border-color: var(--color-green); background: var(--color-green); }

  .time-off-list { margin-top: 14px; display: grid; gap: 8px; }
  .time-off-list li { padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-radius: 10px; background: #f5f8f5; }
  .time-off-list strong, .time-off-list small { display: block; }
  .time-off-list strong { font-size: 14px; }
  .time-off-list small { color: var(--color-muted); font-size: 12px; }

  .occupancy-grid { width: 100%; min-width: 720px; border-collapse: separate; border-spacing: 4px; font-size: 12px; }
  .occupancy-grid thead th { color: var(--color-muted); font-weight: 700; text-align: center; }
  .occupancy-grid thead th span { display: block; }
  .occupancy-grid th[scope="row"] { padding-right: 8px; font-size: 13px; text-align: left; white-space: nowrap; }
  .occ { height: 40px; border-radius: 8px; font-weight: 800; text-align: center; }
  .occ.open { color: #24553a; background: #d9ead6; }
  .occ.low { color: #7a4d12; background: #f6e2bd; }
  .occ.full { color: #8c2c1a; background: #f6d3ca; }
  .occ.closed { color: #6f7a73; background: #eef1ee; }
```

**Paso 3: Verificar el build.**
Ejecutar: `pnpm build`
Esperado: `✓ built`.

**Paso 4: Commit.**
```bash
git add src/styles
git commit -m "Estilos del calendario de disponibilidad"
```

---

### Tarea 9: Verificación final en el navegador

**Paso 1:** Ejecutar `pnpm check && pnpm build`. Esperado: todo en verde.

**Paso 2:** Abrir la vista previa (`kuska-dev` en `.claude/launch.json`) y, con **Reiniciar demo** primero, comprobar:
1. **Comercio** → Solicitar recojo → paso 2: hay 14 días; domingo, martes y el miércoles libre de Rosa aparecen deshabilitados; al confirmar, el aviso dice "Te visitará Rosa Quispe" y el pedido figura como Asignado.
2. **Reciclador** → Disponibilidad: activar "Mar 14:00 – 16:00" y guardar; como comercio, el martes ya aparece disponible.
3. **Reciclador** → abrir un pedido asignado → "No puedo ir": el pedido vuelve a Solicitado (zona A no tiene otro reciclador).
4. **Municipio** → Calendario: la zona D aparece "Sin recicladores"; agregar un cierre para todas las zonas y comprobar que el comercio ya no puede elegir ese día.
5. Vista móvil (375 px): sin scroll horizontal de la página; la grilla de ocupación se desplaza dentro de su panel.
6. Consola del navegador sin errores.

**Paso 3:** Si algo falla, usar @superpowers:systematic-debugging antes de tocar código.

**Paso 4:** Commit de cualquier ajuste y resumen al usuario.
