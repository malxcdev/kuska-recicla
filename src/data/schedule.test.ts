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
