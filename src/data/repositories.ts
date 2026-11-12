/**
 * Capa de acceso a datos. Hoy usa Web Storage como backend de demostración; cada función
 * es asíncrona y tiene la misma forma que tendrá con Supabase, así que la migración se
 * limita a reemplazar el cuerpo de estas funciones.
 */
import { MATERIALS, STATUS_FLOW, ZONES } from "./catalog";
import { nextRequestId } from "./ids";
import { createSeedRequests, DEMO_ACTOR_BY_ROLE, SEED_ACTORS, SEED_LOTS } from "./mock";
import { readJSON, removeKey, writeJSON } from "./storage";
import type { Actor, Lot, NewPickupRequest, PickupRequest, RequestStatus, Role, Session } from "@/types";

export const STORAGE_KEYS = {
  requests: "kuska:requests:v3",
  previousRequests: "kuska:requests:v2",
  actors: "kuska:actors:v1",
  session: "kuska:session:v1",
  legacyRequests: "kuska-requests",
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

export const requestsRepo = {
  async list(): Promise<PickupRequest[]> {
    return loadRequests();
  },

  async create(input: NewPickupRequest): Promise<PickupRequest> {
    const all = loadRequests();
    const now = new Date().toISOString();
    const request: PickupRequest = { ...input, id: nextRequestId(all), status: "solicitado", collectorId: null, createdAt: now, updatedAt: now };
    writeJSON(STORAGE_KEYS.requests, [request, ...all]);
    return request;
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

export const actorsRepo = {
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

export const lotsRepo = {
  async list(): Promise<Lot[]> {
    return SEED_LOTS;
  },
};

/* ---------- Autenticación de demostración ---------- */

export interface SignInInput {
  email: string;
  password: string;
  role: Role;
  remember: boolean;
}

export interface SignUpInput extends Omit<SignInInput, "remember"> {
  name: string;
  phone: string;
}

function storeSession(session: Session, remember: boolean) {
  removeKey(STORAGE_KEYS.session, localStorage);
  removeKey(STORAGE_KEYS.session, sessionStorage);
  writeJSON(STORAGE_KEYS.session, session, remember ? localStorage : sessionStorage);
}

export const authRepo = {
  getSession(): Session | null {
    const stored = readJSON(STORAGE_KEYS.session, localStorage) ?? readJSON(STORAGE_KEYS.session, sessionStorage);
    return isSession(stored) ? stored : null;
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

  async signUp({ email, role, name, phone }: SignUpInput): Promise<{ session: Session; actor: Actor }> {
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
    // Con Supabase: supabase.auth.resetPasswordForEmail(email)
    void email;
  },
};
