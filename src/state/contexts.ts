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
  /** Vuelve a leer los pedidos del repositorio. */
  refresh: () => Promise<void>;
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
