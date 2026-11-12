/**
 * Contratos de la capa de datos. Hay dos implementaciones intercambiables:
 *
 * - `repositories.demo.ts`: Web Storage, con datos de ejemplo y acceso sin contraseña real.
 * - `repositories.supabase.ts`: Supabase (Postgres + Auth) para el entorno real.
 *
 * `repositories.ts` elige una según las variables de entorno de Vite.
 */
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
  ZoneSchedule,
} from "@/types";

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

export interface SignUpResult {
  /** `null` cuando Supabase pide confirmar el correo antes de abrir sesión. */
  session: Session | null;
  actor: Actor | null;
}

/** El registro se completó, pero falta confirmar el correo para poder ingresar. */
export class EmailConfirmationRequired extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfirmationRequired";
  }
}

export interface RequestsRepository {
  list(): Promise<PickupRequest[]>;
  create(input: NewPickupRequest, collectorId?: string | null): Promise<PickupRequest>;
  reassign(id: string, collectorId: string | null): Promise<PickupRequest>;
  updateStatus(id: string, status: RequestStatus, collectorId?: string): Promise<PickupRequest>;
  /** Solo tiene sentido en modo demo; en Supabase devuelve la lista actual. */
  reset(): Promise<PickupRequest[]>;
}

export interface ActorsRepository {
  list(): Promise<Actor[]>;
  create(actor: Omit<Actor, "id">): Promise<Actor>;
  update(id: string, patch: Partial<Omit<Actor, "id" | "role">>): Promise<Actor>;
}

export interface LotsRepository {
  list(): Promise<Lot[]>;
}

export interface ScheduleRepository {
  listZoneSchedules(): Promise<ZoneSchedule[]>;
  saveZoneSchedule(schedule: ZoneSchedule): Promise<ZoneSchedule[]>;
  listClosures(): Promise<ServiceClosure[]>;
  addClosure(input: Omit<ServiceClosure, "id">): Promise<ServiceClosure>;
  removeClosure(id: string): Promise<void>;
  listAvailability(): Promise<CollectorAvailability[]>;
  saveAvailability(entry: CollectorAvailability): Promise<CollectorAvailability[]>;
  listTimeOff(): Promise<CollectorTimeOff[]>;
  addTimeOff(input: Omit<CollectorTimeOff, "id">): Promise<CollectorTimeOff>;
  removeTimeOff(id: string): Promise<void>;
  reset(): Promise<void>;
}

export interface AuthRepository {
  getSession(): Promise<Session | null>;
  signIn(input: SignInInput): Promise<Session>;
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  /** Avisa cuando la sesión cambia (expiración del token, cierre en otra pestaña…). */
  onSessionChange(handler: (session: Session | null) => void): () => void;
}

export type DataBackend = "demo" | "supabase";
