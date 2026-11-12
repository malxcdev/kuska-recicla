/**
 * Punto único de acceso a datos. Elige el backend según las variables de entorno:
 *
 * - Con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` usa Supabase (Postgres + Auth).
 * - Sin ellas usa la demo con Web Storage (útil para desarrollo y tests).
 */
import * as demo from "./repositories.demo";
import * as remote from "./repositories.supabase";
import type {
  ActorsRepository,
  AuthRepository,
  DataBackend,
  LotsRepository,
  RequestsRepository,
  ScheduleRepository,
} from "./repository-contracts";
import { isSupabaseConfigured } from "./supabaseClient";

export type { DataBackend, SignInInput, SignUpInput, SignUpResult } from "./repository-contracts";
export { EmailConfirmationRequired } from "./repository-contracts";
export { isPickupRequest, STORAGE_KEYS } from "./repositories.demo";

export const dataBackend: DataBackend = isSupabaseConfigured ? "supabase" : "demo";

export const requestsRepo: RequestsRepository = isSupabaseConfigured ? remote.requestsRepo : demo.requestsRepo;
export const actorsRepo: ActorsRepository = isSupabaseConfigured ? remote.actorsRepo : demo.actorsRepo;
export const lotsRepo: LotsRepository = isSupabaseConfigured ? remote.lotsRepo : demo.lotsRepo;
export const scheduleRepo: ScheduleRepository = isSupabaseConfigured ? remote.scheduleRepo : demo.scheduleRepo;
export const authRepo: AuthRepository = isSupabaseConfigured ? remote.authRepo : demo.authRepo;

/** El botón «Reiniciar demo» solo tiene sentido con datos locales. */
export const canResetDemo = dataBackend === "demo";
