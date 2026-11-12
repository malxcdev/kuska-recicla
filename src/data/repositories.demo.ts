/**
 * Implementación de demostración: Web Storage (localStorage/sessionStorage).
 * No requiere backend y funciona sin conexión; es la que usan los tests.
 */
import { MATERIALS, STATUS_FLOW, ZONES } from "./catalog";
import { nextRequestId } from "./ids";
import {
  createSeedClosures,
  createSeedRequests,
  createSeedTimeOff,
  DEMO_ACTOR_BY_ROLE,
  SEED_ACTORS,
  SEED_AVAILABILITY,
  SEED_LOTS,
  SEED_ZONE_SCHEDULES,
} from "./mock";
import type {
  ActorsRepository,
  AuthRepository,
  LotsRepository,
  RequestsRepository,
  ScheduleRepository,
  SignInInput,
  SignUpInput,
  SignUpResult,
} from "./repository-contracts";
import { readJSON, removeKey, writeJSON } from "./storage";
import type {
  Actor,
  CollectorAvailability,
  CollectorTimeOff,
  Lot,
  NewPickupRequest,
  PickupRequest,
  RequestStatus,
  Role,
  ServiceClosure,
  Session,
  SlotDefinition,
  ZoneId,
  ZoneSchedule,
} from "@/types";

export const STORAGE_KEYS = {
  requests: "kuska:requests:v3",
  previousRequests: "kuska:requests:v2",
  actors: "kuska:actors:v1",
  session: "kuska:session:v1",
  legacyRequests: "kuska-requests",
  schedules: "kuska:schedules:v1",
  closures: "kuska:closures:v1",
  availability: "kuska:availability:v1",
  timeOff: "kuska:timeoff:v1",
} as const;

const ROLES: Role[] = ["comercio", "reciclador", "empresa", "municipio"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isPickupRequest(value: unknown): value is PickupRequest {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.requesterId === "string" &&
    typeof value.material === "string" && value.material in MATERIALS &&
    typeof value.kg === "number" && value.kg > 0 &&
    typeof value.scheduledDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.scheduledDate) &&
    typeof value.slotId === "string" &&
    typeof value.slot === "string" &&
    typeof value.zone === "string" && value.zone in ZONES &&
    typeof value.status === "string" && STATUS_FLOW.includes(value.status as RequestStatus) &&
    (value.collectorId === null || typeof value.collectorId === "string")
  );
}

function isActor(value: unknown): value is Actor {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    ROLES.includes(value.role as Role) &&
    typeof value.zone === "string" && value.zone in ZONES
  );
}

function isSession(value: unknown): value is Session {
  return isRecord(value) && typeof value.actorId === "string" && ROLES.includes(value.role as Role) && typeof value.email === "string";
}

/* ---------- Pedidos de recojo ---------- */

function loadRequests(): PickupRequest[] {
  const stored = readJSON(STORAGE_KEYS.requests);
  if (Array.isArray(stored) && stored.every(isPickupRequest)) return stored;
  removeKey(STORAGE_KEYS.legacyRequests);
  removeKey(STORAGE_KEYS.previousRequests);
  const seed = createSeedRequests(new Date(), loadActors());
  writeJSON(STORAGE_KEYS.requests, seed);
  return seed;
}

export const requestsRepo: RequestsRepository = {
  async list(): Promise<PickupRequest[]> {
    return loadRequests();
  },

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
    if (current.status !== "solicitado" && current.status !== "asignado") {
      throw new Error(`El pedido ${id} ya fue recogido; no se puede reasignar.`);
    }
    const updated: PickupRequest = { ...current, collectorId, status: collectorId ? "asignado" : "solicitado", updatedAt: new Date().toISOString() };
    writeJSON(STORAGE_KEYS.requests, all.map((r) => (r.id === id ? updated : r)));
    return updated;
  },

  async updateStatus(id: string, status: RequestStatus, collectorId?: string): Promise<PickupRequest> {
    const all = loadRequests();
    const current = all.find((r) => r.id === id);
    if (!current) throw new Error(`No existe el pedido ${id}.`);
    const updated: PickupRequest = {
      ...current,
      status,
      collectorId: collectorId ?? current.collectorId,
      updatedAt: new Date().toISOString(),
    };
    writeJSON(STORAGE_KEYS.requests, all.map((r) => (r.id === id ? updated : r)));
    return updated;
  },

  async reset(): Promise<PickupRequest[]> {
    const seed = createSeedRequests(new Date(), loadActors());
    writeJSON(STORAGE_KEYS.requests, seed);
    return seed;
  },
};

/* ---------- Actores (perfiles) ---------- */

function loadActors(): Actor[] {
  const stored = readJSON(STORAGE_KEYS.actors);
  if (Array.isArray(stored) && stored.every(isActor)) return stored;
  writeJSON(STORAGE_KEYS.actors, SEED_ACTORS);
  return SEED_ACTORS;
}

export const actorsRepo: ActorsRepository = {
  async list(): Promise<Actor[]> {
    return loadActors();
  },

  async create(actor: Omit<Actor, "id">): Promise<Actor> {
    const all = loadActors();
    if (all.some((a) => a.email.toLowerCase() === actor.email.toLowerCase())) {
      throw new Error("Ya existe una cuenta con ese correo. Inicia sesión.");
    }
    const created: Actor = { ...actor, id: `${actor.role.slice(0, 3)}-${Date.now().toString(36)}` };
    writeJSON(STORAGE_KEYS.actors, [...all, created]);
    return created;
  },

  async update(id: string, patch: Partial<Omit<Actor, "id" | "role">>): Promise<Actor> {
    const all = loadActors();
    const current = all.find((a) => a.id === id);
    if (!current) throw new Error("No encontramos tu perfil.");
    const updated = { ...current, ...patch };
    writeJSON(STORAGE_KEYS.actors, all.map((a) => (a.id === id ? updated : a)));
    return updated;
  },
};

/* ---------- Lotes ---------- */

export const lotsRepo: LotsRepository = {
  async list(): Promise<Lot[]> {
    return SEED_LOTS;
  },
};

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

const isTimeOff = (v: unknown): v is CollectorTimeOff =>
  isRecord(v) && isString(v.id) && isString(v.collectorId) && isISODate(v.date) && (v.reason === undefined || isString(v.reason));

function loadList<T>(key: string, guard: (v: unknown) => v is T, seed: () => T[]): T[] {
  const stored = readJSON(key);
  if (Array.isArray(stored) && stored.every(guard)) return stored;
  const fresh = structuredClone(seed());
  writeJSON(key, fresh);
  return fresh;
}

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const loadSchedules = () => loadList(STORAGE_KEYS.schedules, isZoneSchedule, () => SEED_ZONE_SCHEDULES);
const loadClosures = () => loadList(STORAGE_KEYS.closures, isClosure, () => createSeedClosures(new Date()));
const loadAvailability = () => loadList(STORAGE_KEYS.availability, isCollectorAvailability, () => SEED_AVAILABILITY);
const loadTimeOff = () => loadList(STORAGE_KEYS.timeOff, isTimeOff, () => createSeedTimeOff(new Date()));

export const scheduleRepo: ScheduleRepository = {
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

/* ---------- Autenticación de demostración ---------- */

function readSession(): Session | null {
  const stored = readJSON(STORAGE_KEYS.session, localStorage) ?? readJSON(STORAGE_KEYS.session, sessionStorage);
  return isSession(stored) ? stored : null;
}

function storeSession(session: Session, remember: boolean) {
  removeKey(STORAGE_KEYS.session, localStorage);
  removeKey(STORAGE_KEYS.session, sessionStorage);
  writeJSON(STORAGE_KEYS.session, session, remember ? localStorage : sessionStorage);
}

export const authRepo: AuthRepository = {
  async getSession(): Promise<Session | null> {
    return readSession();
  },

  /**
   * Demo: acepta cualquier correo y contraseña. Si el correo pertenece a una cuenta
   * registrada de ese tipo, entra con ella; si no, usa la cuenta de ejemplo del rol.
   */
  async signIn({ email, role, remember }: SignInInput): Promise<Session> {
    const actors = loadActors();
    const own = actors.find((a) => a.email.toLowerCase() === email.toLowerCase() && a.role === role);
    const session: Session = { actorId: own?.id ?? DEMO_ACTOR_BY_ROLE[role], role, email };
    storeSession(session, remember);
    return session;
  },

  async signUp({ email, role, name, phone }: SignUpInput): Promise<SignUpResult> {
    const actor = await actorsRepo.create({ role, name, contactName: name, phone, email, address: "", zone: "A" });
    const session: Session = { actorId: actor.id, role, email };
    storeSession(session, true);
    return { session, actor };
  },

  async signOut(): Promise<void> {
    removeKey(STORAGE_KEYS.session, localStorage);
    removeKey(STORAGE_KEYS.session, sessionStorage);
  },

  async requestPasswordReset(email: string): Promise<void> {
    // En modo demo no hay correo que enviar.
    void email;
  },

  onSessionChange(): () => void {
    // La sesión de demostración solo cambia a través de este módulo.
    return () => {};
  },
};
