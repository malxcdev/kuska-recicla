import { createContext, useContext } from "react";
import type { SignInInput, SignUpInput } from "@/data/repositories";
import type { Actor, MaterialId, NewPickupRequest, PickupRequest, RequestStatus, Session } from "@/types";

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
  createRequest: (input: NewPickupRequest) => Promise<PickupRequest>;
  updateStatus: (id: string, status: RequestStatus, collectorId?: string) => Promise<void>;
  resetDemo: () => Promise<void>;
}
export const RequestsContext = createContext<RequestsValue | null>(null);
export const useRequests = () => useRequired(RequestsContext, "useRequests");

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
