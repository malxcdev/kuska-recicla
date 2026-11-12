import { describe, expect, it } from "vitest";
import { addDays, formatRelativeDay, getPickupDays, parseISODate, toISODate } from "./dates";
import { nextRequestId } from "./ids";
import { createSeedRequests } from "./mock";
import { getAvailableActions, requestsForSession } from "./requestActions";
import { requestsRepo, STORAGE_KEYS } from "./repositories";
import { monthlyTotals, summarizeImpact } from "./stats";
import type { PickupRequest } from "@/types";

// Jueves 12 de noviembre de 2026, 10:00 hora local.
const TODAY = new Date(2026, 10, 12, 10, 0);

describe("nextRequestId", () => {
  it("continúa desde el mayor código existente", () => {
    expect(nextRequestId([{ id: "KR-0248" }, { id: "KR-0231" }])).toBe("KR-0249");
  });

  it("no repite códigos aunque se hayan borrado pedidos intermedios", () => {
    const ids = [{ id: "KR-0001" }, { id: "KR-0007" }];
    expect(nextRequestId(ids)).toBe("KR-0008");
  });

  it("empieza en KR-0001 sin pedidos", () => {
    expect(nextRequestId([])).toBe("KR-0001");
  });
});

describe("fechas", () => {
  it("convierte a ISO local sin desfase", () => {
    expect(toISODate(TODAY)).toBe("2026-11-12");
    expect(toISODate(parseISODate("2026-01-31"))).toBe("2026-01-31");
  });

  it("ofrece días a partir de mañana y salta los domingos", () => {
    // Sábado 14 → el domingo 15 no se ofrece.
    const days = getPickupDays(new Date(2026, 10, 13), 3);
    expect(days).toEqual(["2026-11-14", "2026-11-16", "2026-11-17"]);
    expect(days.every((d) => parseISODate(d).getDay() !== 0)).toBe(true);
  });

  it("describe hoy, mañana y ayer", () => {
    expect(formatRelativeDay("2026-11-12", TODAY)).toMatch(/^Hoy, 12 /);
    expect(formatRelativeDay("2026-11-13", TODAY)).toMatch(/^Mañana, 13 /);
    expect(formatRelativeDay("2026-11-11", TODAY)).toMatch(/^Ayer, 11 /);
    expect(formatRelativeDay("2026-11-20", TODAY)).toMatch(/^\p{Lu}\p{Ll}+, 20 /u);
  });
});

const request = (overrides: Partial<PickupRequest>): PickupRequest => ({
  id: "KR-0001",
  requesterId: "com-bazar",
  material: "carton",
  kg: 10,
  scheduledDate: toISODate(TODAY),
  slot: "10:00 – 12:00",
  address: "Av. Ejército 1240",
  zone: "A",
  status: "entregado",
  collectorId: "rec-rosa",
  createdAt: TODAY.toISOString(),
  updatedAt: TODAY.toISOString(),
  ...overrides,
});

describe("summarizeImpact", () => {
  it("solo cuenta recojos entregados", () => {
    const impact = summarizeImpact(
      [request({ kg: 10 }), request({ id: "KR-0002", kg: 5, material: "plastico" }), request({ id: "KR-0003", kg: 50, status: "asignado" })],
      TODAY,
    );
    expect(impact.totalKg).toBe(15);
    expect(impact.count).toBe(2);
    expect(impact.byMaterial).toEqual({ carton: 10, plastico: 5, organico: 0, vidrio: 0 });
    expect(impact.co2Kg).toBe(7); // 10 × 0.4 + 5 × 0.6
  });

  it("calcula la variación contra el mes anterior", () => {
    const lastMonth = toISODate(addDays(TODAY, -30));
    const impact = summarizeImpact([request({ kg: 30 }), request({ id: "KR-0002", kg: 20, scheduledDate: lastMonth })], TODAY);
    expect(impact.trendPct).toBe(50);
  });

  it("agrupa por mes del más antiguo al actual", () => {
    const totals = monthlyTotals([request({ kg: 12 })], TODAY, 3);
    expect(totals.map((t) => t.key)).toEqual(["2026-09", "2026-10", "2026-11"]);
    expect(totals.at(-1)?.kg).toBe(12);
  });
});

describe("acciones por rol", () => {
  const seed = createSeedRequests(TODAY);

  it("el comercio solo ve sus pedidos", () => {
    const mine = requestsForSession(seed, { actorId: "com-bazar", role: "comercio", email: "x@y.pe" });
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((r) => r.requesterId === "com-bazar")).toBe(true);
  });

  it("el reciclador acepta pedidos libres y marca como recogidos los suyos", () => {
    const session = { actorId: "rec-rosa", role: "reciclador" as const, email: "x@y.pe" };
    expect(getAvailableActions(request({ status: "solicitado", collectorId: null }), session)[0]?.nextStatus).toBe("asignado");
    expect(getAvailableActions(request({ status: "asignado" }), session)[0]?.nextStatus).toBe("recogido");
    expect(getAvailableActions(request({ status: "asignado", collectorId: "rec-mario" }), session)).toEqual([]);
  });

  it("la empresa registra la recepción de lo recogido", () => {
    const session = { actorId: "emp-recicla", role: "empresa" as const, email: "x@y.pe" };
    expect(getAvailableActions(request({ status: "recogido" }), session)[0]?.nextStatus).toBe("entregado");
    expect(getAvailableActions(request({ status: "entregado" }), session)).toEqual([]);
  });
});

describe("requestsRepo", () => {
  it("crea pedidos con código único y estado solicitado", async () => {
    const before = await requestsRepo.list();
    const created = await requestsRepo.create({ requesterId: "com-bazar", material: "vidrio", kg: 4, scheduledDate: "2026-11-14", slot: "08:00 – 10:00", address: "Av. Ejército 1240", zone: "A" });
    const after = await requestsRepo.list();
    expect(created.status).toBe("solicitado");
    expect(before.some((r) => r.id === created.id)).toBe(false);
    expect(after[0].id).toBe(created.id);
    expect(new Set(after.map((r) => r.id)).size).toBe(after.length);
  });

  it("descarta datos guardados corruptos y vuelve a los de ejemplo", async () => {
    localStorage.setItem(STORAGE_KEYS.requests, JSON.stringify([{ id: 1, material: "uranio" }]));
    const list = await requestsRepo.list();
    expect(list.length).toBeGreaterThan(5);
    expect(list.every((r) => typeof r.id === "string")).toBe(true);
  });
});
