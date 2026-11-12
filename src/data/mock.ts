import { addDays, toISODate } from "./dates";
import type { Actor, Lot, MaterialId, PickupRequest, RequestStatus, Role } from "@/types";

/** Cuenta de demostración que se usa al iniciar sesión con cada tipo de cuenta. */
export const DEMO_ACTOR_BY_ROLE: Record<Role, string> = {
  comercio: "com-bazar",
  reciclador: "rec-rosa",
  empresa: "emp-recicla",
  municipio: "mun-santiago",
};

export const SEED_ACTORS: Actor[] = [
  { id: "com-bazar", role: "comercio", name: "Bazar Ejército", contactName: "María Condori", phone: "984 112 340", email: "bazar@ejemplo.pe", address: "Av. Ejército 1240", zone: "A" },
  { id: "com-inti", role: "comercio", name: "Abarrotes Inti", contactName: "Julio Mamani", phone: "984 220 118", email: "inti@ejemplo.pe", address: "Av. Ejército 980", zone: "A" },
  { id: "com-sanjose", role: "comercio", name: "Bodega San José", contactName: "Ana Huillca", phone: "984 330 476", email: "sanjose@ejemplo.pe", address: "Calle Belén 312", zone: "A" },
  { id: "com-mercado", role: "comercio", name: "Mercado Santiago", contactName: "Asociación de comerciantes", phone: "984 441 902", email: "mercado@ejemplo.pe", address: "Jr. Santiago s/n", zone: "B" },
  { id: "com-zarzuela", role: "comercio", name: "Minimarket Zarzuela", contactName: "Pedro Ccori", phone: "984 552 671", email: "zarzuela@ejemplo.pe", address: "Av. Zarzuela 455", zone: "C" },
  { id: "com-sol", role: "comercio", name: "Ferretería El Sol", contactName: "Elena Puma", phone: "984 663 015", email: "elsol@ejemplo.pe", address: "Av. Antonio Lorena 2210", zone: "D" },
  { id: "rec-rosa", role: "reciclador", name: "Rosa Quispe", contactName: "Rosa Quispe", phone: "984 551 207", email: "rosa@ejemplo.pe", address: "Zona A · Santiago", zone: "A" },
  { id: "rec-mario", role: "reciclador", name: "Mario Huamán", contactName: "Mario Huamán", phone: "984 774 330", email: "mario@ejemplo.pe", address: "Zona B · Santiago", zone: "B" },
  { id: "rec-kawsay", role: "reciclador", name: "Asociación Kawsay", contactName: "Lucía Ccahua", phone: "984 885 664", email: "kawsay@ejemplo.pe", address: "Zona C · Santiago", zone: "C" },
  { id: "emp-recicla", role: "empresa", name: "Recicla Cusco SAC", contactName: "Equipo de recepción", phone: "084 230 450", email: "recepcion@ejemplo.pe", address: "Parque industrial, Santiago", zone: "D" },
  { id: "mun-santiago", role: "municipio", name: "Municipalidad de Santiago", contactName: "Gestión ambiental", phone: "084 245 100", email: "ambiental@ejemplo.pe", address: "Plaza de Armas de Santiago", zone: "A" },
];

export const SEED_LOTS: Lot[] = [
  { id: "LC-018", material: "carton", kg: 386, capacityKg: 500, status: "abierto" },
  { id: "LP-007", material: "plastico", kg: 142, capacityKg: 300, status: "abierto" },
  { id: "LV-003", material: "vidrio", kg: 210, capacityKg: 250, status: "listo" },
  { id: "LO-011", material: "organico", kg: 95, capacityKg: 400, status: "abierto" },
  { id: "LP-006", material: "plastico", kg: 300, capacityKg: 300, status: "listo" },
  { id: "LC-017", material: "carton", kg: 500, capacityKg: 500, status: "despachado" },
];

type SeedRow = [offsetDays: number, requesterId: string, material: MaterialId, kg: number, slot: number, status: RequestStatus, collectorId: string | null];

const SEED_ROWS: SeedRow[] = [
  [-60, "com-bazar", "carton", 14, 1, "entregado", "rec-rosa"],
  [-52, "com-bazar", "vidrio", 5, 0, "entregado", "rec-rosa"],
  [-40, "com-bazar", "plastico", 15, 2, "entregado", "rec-rosa"],
  [-35, "com-mercado", "carton", 40, 0, "entregado", "rec-mario"],
  [-33, "com-bazar", "organico", 9, 1, "entregado", "rec-rosa"],
  [-21, "com-bazar", "carton", 15, 1, "entregado", "rec-rosa"],
  [-20, "com-sol", "carton", 22, 1, "entregado", "rec-mario"],
  [-15, "com-sanjose", "plastico", 7, 0, "entregado", "rec-rosa"],
  [-14, "com-bazar", "carton", 9, 2, "entregado", "rec-rosa"],
  [-10, "com-zarzuela", "carton", 25, 0, "entregado", "rec-kawsay"],
  [-8, "com-inti", "carton", 11, 1, "entregado", "rec-rosa"],
  [-5, "com-bazar", "plastico", 6, 0, "entregado", "rec-rosa"],
  [-3, "com-mercado", "organico", 30, 0, "entregado", "rec-mario"],
  [-2, "com-zarzuela", "plastico", 18, 1, "recogido", "rec-kawsay"],
  [-1, "com-sol", "vidrio", 12, 2, "recogido", "rec-mario"],
  [0, "com-inti", "carton", 10, 0, "recogido", "rec-rosa"],
  [0, "com-sanjose", "plastico", 8, 0, "recogido", "rec-rosa"],
  [0, "com-bazar", "carton", 12, 1, "asignado", "rec-rosa"],
  [0, "com-mercado", "carton", 20, 2, "asignado", "rec-rosa"],
  [1, "com-zarzuela", "carton", 16, 1, "asignado", "rec-kawsay"],
  [1, "com-inti", "plastico", 8, 1, "solicitado", null],
  [2, "com-sanjose", "carton", 20, 0, "solicitado", null],
  [2, "com-sol", "plastico", 9, 2, "solicitado", null],
];

const SLOTS = ["08:00 – 10:00", "10:00 – 12:00", "14:00 – 16:00"];

/** Pedidos de ejemplo con fechas relativas a hoy, para que la demo nunca quede desfasada. */
export function createSeedRequests(today: Date, actors: Actor[] = SEED_ACTORS): PickupRequest[] {
  const byId = new Map(actors.map((actor) => [actor.id, actor]));
  return SEED_ROWS.map(([offset, requesterId, material, kg, slot, status, collectorId], index) => {
    const requester = byId.get(requesterId);
    const scheduled = addDays(today, offset);
    const created = addDays(scheduled, -2).toISOString();
    return {
      id: `KR-${String(201 + index).padStart(4, "0")}`,
      requesterId,
      material,
      kg,
      scheduledDate: toISODate(scheduled),
      slot: SLOTS[slot],
      address: requester?.address ?? "",
      zone: requester?.zone ?? "A",
      status,
      collectorId,
      createdAt: created,
      updatedAt: created,
    };
  }).reverse();
}
