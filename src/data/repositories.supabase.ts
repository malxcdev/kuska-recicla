/**
 * Implementación real sobre Supabase (Postgres + Auth).
 * Las tablas y políticas viven en `supabase/migrations/20261112000000_kuska_init.sql`.
 */
import { ROLE_LABELS } from "./catalog";
import {
  EmailConfirmationRequired,
  type ActorsRepository,
  type AuthRepository,
  type LotsRepository,
  type RequestsRepository,
  type ScheduleRepository,
  type SignInInput,
  type SignUpInput,
  type SignUpResult,
} from "./repository-contracts";
import { getSupabase } from "./supabaseClient";
import type {
  Actor,
  CollectorAvailability,
  CollectorTimeOff,
  Lot,
  MaterialId,
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

const db = () => getSupabase();

/* ---------- Filas tal como las devuelve PostgREST ---------- */

interface ProfileRow {
  id: string;
  role: Role;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  zone: ZoneId;
}

interface RequestRow {
  id: string;
  requester_id: string;
  material: MaterialId;
  kg: number | string;
  scheduled_date: string;
  slot_id: string;
  slot: string;
  address: string;
  zone: ZoneId;
  status: RequestStatus;
  collector_id: string | null;
  created_at: string;
  updated_at: string;
}

interface LotRow {
  id: string;
  material: MaterialId;
  kg: number | string;
  capacity_kg: number | string;
  status: Lot["status"];
}

interface ScheduleRow {
  zone: ZoneId;
  weekdays: number[];
  slots: SlotDefinition[];
  stops_per_collector: number;
  horizon_days: number;
}

interface ClosureRow {
  id: string;
  date: string;
  zone: ZoneId | null;
  reason: string;
}

interface AvailabilityRow {
  collector_id: string;
  zone: ZoneId;
  weekly: Record<number, string[]>;
}

interface TimeOffRow {
  id: string;
  collector_id: string;
  date: string;
  reason: string | null;
}

/* ---------- Traducciones ---------- */

const MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, "Correo o contraseña incorrectos."],
  [/email not confirmed/i, "Confirma tu correo antes de ingresar. Revisa tu bandeja de entrada."],
  [/user already registered/i, "Ya existe una cuenta con ese correo. Inicia sesión."],
  [/password should be at least|weak password/i, "La contraseña debe tener al menos 6 caracteres."],
  [/unable to validate email|invalid email/i, "Escribe un correo válido."],
  [/rate limit|too many requests|email rate limit/i, "Demasiados intentos seguidos. Espera un momento e inténtalo otra vez."],
  [/duplicate key value/i, "Ese registro ya existe."],
  [/permission denied|row-level security|new row violates/i, "No tienes permiso para hacer eso con tu cuenta."],
  [/failed to fetch|networkerror|fetch failed/i, "No pudimos conectar con el servidor. Revisa tu conexión."],
];

function translate(message: string): string {
  const found = MESSAGES.find(([pattern]) => pattern.test(message));
  return found ? found[1] : "";
}

function fail(error: { message?: string } | null, fallback: string): never {
  const friendly = error?.message ? translate(error.message) : "";
  throw new Error(friendly || fallback);
}

const asNumber = (value: number | string): number => (typeof value === "number" ? value : Number(value));

/* ---------- Mapeos ---------- */

const toActor = (row: ProfileRow): Actor => ({
  id: row.id,
  role: row.role,
  name: row.name,
  contactName: row.contact_name,
  phone: row.phone,
  email: row.email,
  address: row.address,
  zone: row.zone,
});

const toRequest = (row: RequestRow): PickupRequest => ({
  id: row.id,
  requesterId: row.requester_id,
  material: row.material,
  kg: asNumber(row.kg),
  scheduledDate: row.scheduled_date,
  slotId: row.slot_id,
  slot: row.slot,
  address: row.address,
  zone: row.zone,
  status: row.status,
  collectorId: row.collector_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toLot = (row: LotRow): Lot => ({
  id: row.id,
  material: row.material,
  kg: asNumber(row.kg),
  capacityKg: asNumber(row.capacity_kg),
  status: row.status,
});

const toSchedule = (row: ScheduleRow): ZoneSchedule => ({
  zone: row.zone,
  weekdays: row.weekdays ?? [],
  slots: row.slots ?? [],
  stopsPerCollector: row.stops_per_collector,
  horizonDays: row.horizon_days,
});

const toClosure = (row: ClosureRow): ServiceClosure => ({ id: row.id, date: row.date, zone: row.zone, reason: row.reason });

const toAvailability = (row: AvailabilityRow): CollectorAvailability => ({
  collectorId: row.collector_id,
  zone: row.zone,
  weekly: row.weekly ?? {},
});

const toTimeOff = (row: TimeOffRow): CollectorTimeOff => ({
  id: row.id,
  collectorId: row.collector_id,
  date: row.date,
  ...(row.reason ? { reason: row.reason } : {}),
});

const ROLES: Role[] = ["comercio", "reciclador", "empresa", "municipio"];
const isRole = (value: unknown): value is Role => typeof value === "string" && ROLES.includes(value as Role);
const text = (value: unknown): string => (typeof value === "string" ? value : "");

/* ---------- Perfil del usuario autenticado ---------- */

async function profileFor(userId: string): Promise<Actor | null> {
  const { data, error } = await db().from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) fail(error, "No pudimos leer tu perfil.");
  return data ? toActor(data as ProfileRow) : null;
}

/** Crea el perfil si el trigger de la base de datos no llegó a hacerlo. */
async function requireProfile(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): Promise<Actor> {
  const existing = await profileFor(user.id);
  if (existing) return existing;

  const meta = user.user_metadata ?? {};
  const role = isRole(meta.role) ? meta.role : "comercio";
  const name = text(meta.name);
  const { data, error } = await db()
    .from("profiles")
    .insert({ id: user.id, role, name, contact_name: name, phone: text(meta.phone), email: user.email ?? "" })
    .select("*")
    .single();
  if (error) fail(error, "No pudimos crear tu perfil.");
  return toActor(data as ProfileRow);
}

const toSession = (actor: Actor): Session => ({ actorId: actor.id, role: actor.role, email: actor.email });

/* ---------- Autenticación ---------- */

export const authRepo: AuthRepository = {
  async getSession(): Promise<Session | null> {
    const { data } = await db().auth.getSession();
    if (!data.session) return null;
    const actor = await profileFor(data.session.user.id);
    if (!actor) return null;
    return toSession(actor);
  },

  async signIn({ email, password, role }: SignInInput): Promise<Session> {
    const { data, error } = await db().auth.signInWithPassword({ email, password });
    if (error) fail(error, "No pudimos iniciar sesión.");
    if (!data.user) throw new Error("No pudimos iniciar sesión. Inténtalo otra vez.");

    const actor = await requireProfile(data.user);
    if (actor.role !== role) {
      await db().auth.signOut();
      throw new Error(`Esta cuenta es de tipo ${ROLE_LABELS[actor.role]}. Elige «${ROLE_LABELS[actor.role]}» como tipo de cuenta para ingresar.`);
    }
    return toSession(actor);
  },

  async signUp({ email, password, role, name, phone }: SignUpInput): Promise<SignUpResult> {
    const { data, error } = await db().auth.signUp({
      email,
      password,
      options: { data: { role, name, phone } },
    });
    if (error) fail(error, "No pudimos crear tu cuenta.");
    if (!data.user) throw new Error("No pudimos crear tu cuenta. Inténtalo otra vez.");

    // Con la confirmación de correo activa, Supabase no abre sesión todavía.
    if (!data.session) {
      throw new EmailConfirmationRequired(`Te enviamos un correo a ${email}. Confirma tu cuenta y luego inicia sesión.`);
    }

    const actor = await requireProfile(data.user);
    return { session: toSession(actor), actor };
  },

  async signOut(): Promise<void> {
    await db().auth.signOut();
  },

  async requestPasswordReset(email: string): Promise<void> {
    const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}/recuperar`;
    const { error } = await db().auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error) fail(error, "No pudimos enviar el correo de recuperación.");
  },

  onSessionChange(handler: (session: Session | null) => void): () => void {
    const { data } = db().auth.onAuthStateChange((_event, session) => {
      // Nunca llamar a Supabase dentro del callback: se difiere al siguiente tick.
      setTimeout(() => {
        void (async () => {
          if (!session) {
            handler(null);
            return;
          }
          try {
            const actor = await profileFor(session.user.id);
            handler(actor ? toSession(actor) : null);
          } catch {
            handler(null);
          }
        })();
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  },
};

/* ---------- Pedidos de recojo ---------- */

async function findRequest(id: string): Promise<PickupRequest | null> {
  const { data, error } = await db().from("pickup_requests").select("*").eq("id", id).maybeSingle();
  if (error) fail(error, "No pudimos leer el pedido.");
  return data ? toRequest(data as RequestRow) : null;
}

export const requestsRepo: RequestsRepository = {
  async list(): Promise<PickupRequest[]> {
    const { data, error } = await db().from("pickup_requests").select("*").order("created_at", { ascending: false });
    if (error) fail(error, "No pudimos cargar los pedidos.");
    return (data ?? []).map((row) => toRequest(row as RequestRow));
  },

  async create(input: NewPickupRequest, collectorId: string | null = null): Promise<PickupRequest> {
    const { data, error } = await db()
      .from("pickup_requests")
      .insert({
        requester_id: input.requesterId,
        material: input.material,
        kg: input.kg,
        scheduled_date: input.scheduledDate,
        slot_id: input.slotId,
        slot: input.slot,
        address: input.address,
        zone: input.zone,
        status: collectorId ? "asignado" : "solicitado",
        collector_id: collectorId,
      })
      .select("*")
      .single();
    if (error) fail(error, "No pudimos crear el pedido.");
    return toRequest(data as RequestRow);
  },

  async reassign(id: string, collectorId: string | null): Promise<PickupRequest> {
    const current = await findRequest(id);
    if (!current) throw new Error(`No existe el pedido ${id}.`);
    if (current.status !== "solicitado" && current.status !== "asignado") {
      throw new Error(`El pedido ${id} ya fue recogido; no se puede reasignar.`);
    }
    const { data, error } = await db()
      .from("pickup_requests")
      .update({ collector_id: collectorId, status: collectorId ? "asignado" : "solicitado" })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) fail(error, "No pudimos reasignar el pedido.");
    if (!data) throw new Error(`No existe el pedido ${id}.`);
    return toRequest(data as RequestRow);
  },

  async updateStatus(id: string, status: RequestStatus, collectorId?: string): Promise<PickupRequest> {
    const patch: Record<string, unknown> = { status };
    if (collectorId !== undefined) patch.collector_id = collectorId;
    const { data, error } = await db().from("pickup_requests").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) fail(error, "No pudimos actualizar el pedido.");
    if (!data) throw new Error(`No existe el pedido ${id}.`);
    return toRequest(data as RequestRow);
  },

  /** En producción no se borran datos: devuelve la lista tal como está. */
  async reset(): Promise<PickupRequest[]> {
    return requestsRepo.list();
  },
};

/* ---------- Actores ---------- */

export const actorsRepo: ActorsRepository = {
  async list(): Promise<Actor[]> {
    const { data, error } = await db().from("profiles").select("*").order("name", { ascending: true });
    if (error) fail(error, "No pudimos cargar los actores.");
    return (data ?? []).map((row) => toActor(row as ProfileRow));
  },

  async create(): Promise<Actor> {
    throw new Error("Con Supabase las cuentas se crean desde «Crear cuenta» (correo y contraseña).");
  },

  async update(id: string, patch: Partial<Omit<Actor, "id" | "role">>): Promise<Actor> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.contactName !== undefined) row.contact_name = patch.contactName;
    if (patch.phone !== undefined) row.phone = patch.phone;
    if (patch.email !== undefined) row.email = patch.email;
    if (patch.address !== undefined) row.address = patch.address;
    if (patch.zone !== undefined) row.zone = patch.zone;

    const { data, error } = await db().from("profiles").update(row).eq("id", id).select("*").maybeSingle();
    if (error) fail(error, "No pudimos guardar tu perfil.");
    if (!data) throw new Error("No encontramos tu perfil.");
    return toActor(data as ProfileRow);
  },
};

/* ---------- Lotes ---------- */

export const lotsRepo: LotsRepository = {
  async list(): Promise<Lot[]> {
    const { data, error } = await db().from("lots").select("*").order("id", { ascending: true });
    if (error) fail(error, "No pudimos cargar los lotes.");
    return (data ?? []).map((row) => toLot(row as LotRow));
  },
};

/* ---------- Calendario y disponibilidad ---------- */

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const scheduleRepo: ScheduleRepository = {
  async listZoneSchedules(): Promise<ZoneSchedule[]> {
    const { data, error } = await db().from("zone_schedules").select("*").order("zone", { ascending: true });
    if (error) fail(error, "No pudimos cargar los horarios.");
    return (data ?? []).map((row) => toSchedule(row as ScheduleRow));
  },

  async saveZoneSchedule(schedule: ZoneSchedule): Promise<ZoneSchedule[]> {
    const { error } = await db().from("zone_schedules").upsert({
      zone: schedule.zone,
      weekdays: schedule.weekdays,
      slots: schedule.slots,
      stops_per_collector: schedule.stopsPerCollector,
      horizon_days: schedule.horizonDays,
    });
    if (error) fail(error, "No pudimos guardar el horario.");
    return scheduleRepo.listZoneSchedules();
  },

  async listClosures(): Promise<ServiceClosure[]> {
    const { data, error } = await db().from("service_closures").select("*").order("date", { ascending: true });
    if (error) fail(error, "No pudimos cargar los cierres.");
    return (data ?? []).map((row) => toClosure(row as ClosureRow));
  },

  async addClosure(input: Omit<ServiceClosure, "id">): Promise<ServiceClosure> {
    const { data, error } = await db()
      .from("service_closures")
      .insert({ id: newId("cl"), date: input.date, zone: input.zone, reason: input.reason })
      .select("*")
      .single();
    if (error) fail(error, "No pudimos agregar el cierre.");
    return toClosure(data as ClosureRow);
  },

  async removeClosure(id: string): Promise<void> {
    const { error } = await db().from("service_closures").delete().eq("id", id);
    if (error) fail(error, "No pudimos quitar el cierre.");
  },

  async listAvailability(): Promise<CollectorAvailability[]> {
    const { data, error } = await db().from("collector_availability").select("*");
    if (error) fail(error, "No pudimos cargar la disponibilidad.");
    return (data ?? []).map((row) => toAvailability(row as AvailabilityRow));
  },

  async saveAvailability(entry: CollectorAvailability): Promise<CollectorAvailability[]> {
    const { error } = await db()
      .from("collector_availability")
      .upsert({ collector_id: entry.collectorId, zone: entry.zone, weekly: entry.weekly });
    if (error) fail(error, "No pudimos guardar la disponibilidad.");
    return scheduleRepo.listAvailability();
  },

  async listTimeOff(): Promise<CollectorTimeOff[]> {
    const { data, error } = await db().from("collector_time_off").select("*").order("date", { ascending: true });
    if (error) fail(error, "No pudimos cargar los días libres.");
    return (data ?? []).map((row) => toTimeOff(row as TimeOffRow));
  },

  async addTimeOff(input: Omit<CollectorTimeOff, "id">): Promise<CollectorTimeOff> {
    const { data, error } = await db()
      .from("collector_time_off")
      .insert({ id: newId("to"), collector_id: input.collectorId, date: input.date, reason: input.reason ?? null })
      .select("*")
      .single();
    if (error) fail(error, "No pudimos guardar el día libre.");
    return toTimeOff(data as TimeOffRow);
  },

  async removeTimeOff(id: string): Promise<void> {
    const { error } = await db().from("collector_time_off").delete().eq("id", id);
    if (error) fail(error, "No pudimos quitar el día libre.");
  },

  /** En producción no se restablecen datos desde la app. */
  async reset(): Promise<void> {
    return;
  },
};
