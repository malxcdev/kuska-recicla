import { describe, expect, it } from "vitest";
import { defaultZoneSchedule } from "./catalog";
import { dayLevel, getAvailability, getDayAvailability, NO_COLLECTORS, NO_SERVICE, pickCollector, remainingOf, type ScheduleContext } from "./availability";
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

  it("cierra por un cierre de la propia zona", () => {
    expect(getDayAvailability(MONDAY, ctx({ closures: [{ id: "c3", date: MONDAY, zone: "A", reason: "Obras" }] }))).toMatchObject({ open: false, reason: "Obras", slots: [] });
  });

  it("cuenta la carga del reciclador en otras zonas, pero no como reserva de esta", () => {
    // rosa tiene un recojo en la zona B a la misma hora: le queda 1 de 2; mario sigue con 2
    const slot = slotOf(MONDAY, "10-12", ctx({ requests: [req({ zone: "B" })] }));
    expect(slot).toMatchObject({ remaining: 3, booked: 0 });
  });

  it("un pedido sin reciclador no cuenta como reservado ni ocupa cupo", () => {
    const slot = slotOf(MONDAY, "10-12", ctx({ requests: [req({ collectorId: null, status: "solicitado" })] }));
    expect(slot).toMatchObject({ booked: 0, remaining: 4 });
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

  it("2 cupos libres es 'low' y 3 es 'open'", () => {
    // capacidad total el lunes: 2 (08-10 rosa) + 4 (10-12 rosa+mario) = 6
    const three = ctx({ requests: [req({ id: "a" }), req({ id: "b" }), req({ id: "c", collectorId: "rec-mario" })] });
    expect(remainingOf(getDayAvailability(MONDAY, three))).toBe(3);
    expect(dayLevel(getDayAvailability(MONDAY, three))).toBe("open");
    const two = ctx({ requests: [...three.requests, req({ id: "d", collectorId: "rec-mario" })] });
    expect(remainingOf(getDayAvailability(MONDAY, two))).toBe(2);
    expect(dayLevel(getDayAvailability(MONDAY, two))).toBe("low");
  });
});

describe("pickCollector", () => {
  it("elige al de menor carga en la franja", () => {
    const c = ctx({ requests: [req({ collectorId: "rec-mario" })] });
    expect(pickCollector(getDayAvailability(MONDAY, c), "10-12", c.requests, 2)).toBe("rec-rosa");
  });

  it("desempata por la carga del día", () => {
    const c = ctx({ requests: [req({ collectorId: "rec-mario", slotId: "14-16", zone: "B" })] });
    expect(pickCollector(getDayAvailability(MONDAY, c), "10-12", c.requests, 2)).toBe("rec-rosa");
  });

  it("la carga de la franja pesa más que la del día", () => {
    // rosa: 2 recojos ese día pero 0 en 10-12; mario: 1 en el día, y es en 10-12
    const c = ctx({ requests: [req({ id: "a", slotId: "08-10" }), req({ id: "b", slotId: "14-16" }), req({ id: "c", collectorId: "rec-mario" })] });
    expect(pickCollector(getDayAvailability(MONDAY, c), "10-12", c.requests, 2)).toBe("rec-rosa");
  });

  it("en empate total desempata por id", () => {
    const c = ctx();
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
