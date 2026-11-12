export type Role = "comercio" | "reciclador" | "empresa" | "municipio";

export type MaterialId = "carton" | "plastico" | "organico" | "vidrio";

export type RequestStatus = "solicitado" | "asignado" | "recogido" | "entregado";

export type ZoneId = "A" | "B" | "C" | "D";

export type IconName =
  | "home" | "plus" | "truck" | "chart" | "book" | "bell" | "user"
  | "calendar" | "clock" | "map" | "chevron" | "check" | "leaf"
  | "box" | "bottle" | "apple" | "glass" | "close" | "reset" | "spark"
  | "mail" | "lock" | "eye" | "phone" | "logout" | "share";

/** Cualquier participante de la red: comercio, reciclador, empresa o municipio. */
export interface Actor {
  id: string;
  role: Role;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  zone: ZoneId;
}

export interface PickupRequest {
  id: string;
  requesterId: string;
  material: MaterialId;
  kg: number;
  /** Fecha local en formato YYYY-MM-DD. */
  scheduledDate: string;
  /** Id de la franja (por ejemplo "08-10"); `slot` guarda su etiqueta legible. */
  slotId: string;
  slot: string;
  address: string;
  zone: ZoneId;
  status: RequestStatus;
  collectorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewPickupRequest = Pick<
  PickupRequest,
  "requesterId" | "material" | "kg" | "scheduledDate" | "slotId" | "slot" | "address" | "zone"
>;

export interface Session {
  actorId: string;
  role: Role;
  email: string;
}

export interface Lot {
  id: string;
  material: MaterialId;
  kg: number;
  capacityKg: number;
  status: "abierto" | "listo" | "despachado";
}

export type SectionId =
  | "inicio" | "pedidos" | "impacto" | "aprende" | "rutas" | "recojos"
  | "recepciones" | "lotes" | "reportes" | "operacion" | "indicadores"
  | "actores" | "perfil" | "disponibilidad" | "calendario";

export interface SlotDefinition {
  id: string;
  start: string; // "08:00"
  end: string;   // "10:00"
}

/** Horario de servicio de una zona; lo define el municipio. */
export interface ZoneSchedule {
  zone: ZoneId;
  /** 0 = domingo … 6 = sábado */
  weekdays: number[];
  slots: SlotDefinition[];
  /** Recojos que puede atender cada reciclador por franja. */
  stopsPerCollector: number;
  /** Cuántos días hacia adelante se puede reservar. */
  horizonDays: number;
}

/** Día sin servicio (feriado o cierre). `zone: null` aplica a todas las zonas. */
export interface ServiceClosure {
  id: string;
  date: string;
  zone: ZoneId | null;
  reason: string;
}

/** Plantilla semanal de un reciclador: día de la semana → ids de franja. */
export interface CollectorAvailability {
  collectorId: string;
  zone: ZoneId;
  weekly: Record<number, string[]>;
}

export interface CollectorTimeOff {
  id: string;
  collectorId: string;
  date: string;
  reason?: string;
}
