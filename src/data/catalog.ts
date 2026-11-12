import type { IconName, MaterialId, RequestStatus, Role, SectionId, SlotDefinition, ZoneId, ZoneSchedule } from "@/types";

export interface MaterialInfo {
  id: MaterialId;
  name: string;
  icon: IconName;
  color: string;
  soft: string;
  /** kg de CO₂ evitados por kg recuperado (valor referencial para la demo). */
  co2PerKg: number;
  /** Precio referencial pagado al reciclador por kg, en soles. */
  pricePerKg: number;
}

export const MATERIALS: Record<MaterialId, MaterialInfo> = {
  carton: { id: "carton", name: "Cartón", icon: "box", color: "#bd7a41", soft: "#f5e6d7", co2PerKg: 0.4, pricePerKg: 0.5 },
  plastico: { id: "plastico", name: "Plástico", icon: "bottle", color: "#407fc1", soft: "#e0edf8", co2PerKg: 0.6, pricePerKg: 1.2 },
  organico: { id: "organico", name: "Orgánico", icon: "apple", color: "#568c4d", soft: "#e5efdf", co2PerKg: 0.2, pricePerKg: 0.1 },
  vidrio: { id: "vidrio", name: "Vidrio y metal", icon: "glass", color: "#3e9290", soft: "#dcf0ed", co2PerKg: 0.3, pricePerKg: 0.4 },
};

export const MATERIAL_LIST = Object.values(MATERIALS);

export const STATUS_FLOW: RequestStatus[] = ["solicitado", "asignado", "recogido", "entregado"];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  solicitado: "Solicitado",
  asignado: "Asignado",
  recogido: "Recogido",
  entregado: "Entregado",
};

export const ZONES: Record<ZoneId, { name: string; area: string }> = {
  A: { name: "Zona A", area: "Av. Ejército" },
  B: { name: "Zona B", area: "Puente Santiago" },
  C: { name: "Zona C", area: "Zarzuela" },
  D: { name: "Zona D", area: "Margen derecha" },
};

export const ZONE_IDS = Object.keys(ZONES) as ZoneId[];

export const DEFAULT_SLOTS: SlotDefinition[] = [
  { id: "08-10", start: "08:00", end: "10:00" },
  { id: "10-12", start: "10:00", end: "12:00" },
  { id: "14-16", start: "14:00", end: "16:00" },
];

export const slotLabel = (slot: Pick<SlotDefinition, "start" | "end">) => `${slot.start} – ${slot.end}`;

export const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function defaultZoneSchedule(zone: ZoneId): ZoneSchedule {
  return { zone, weekdays: [1, 2, 3, 4, 5, 6], slots: DEFAULT_SLOTS, stopsPerCollector: 3, horizonDays: 14 };
}

export const MIN_KG = 1;
export const MAX_KG = 200;

/** Meta mensual de la red en Santiago, en kg. */
export const MONTHLY_GOAL_KG = 400;

export const ROLE_LABELS: Record<Role, string> = {
  comercio: "Comerciante",
  reciclador: "Reciclador",
  empresa: "Empresa",
  municipio: "Municipio",
};

export const ROLE_PLURALS: Record<Role, string> = {
  comercio: "Comercios",
  reciclador: "Recicladores",
  empresa: "Empresas",
  municipio: "Municipios",
};

export const ROLE_ICONS: Record<Role, IconName> = {
  comercio: "home",
  reciclador: "truck",
  empresa: "box",
  municipio: "map",
};

export const ACCOUNT_TYPES: { id: Role; label: string; description: string; icon: IconName }[] = [
  { id: "comercio", label: "Comerciante", description: "Solicito recojos", icon: "home" },
  { id: "reciclador", label: "Reciclador", description: "Recojo materiales", icon: "truck" },
  { id: "empresa", label: "Empresa", description: "Recibo y valorizo", icon: "box" },
  { id: "municipio", label: "Municipio", description: "Superviso la operación", icon: "chart" },
];

export const SECTION_TITLES: Record<SectionId, string> = {
  inicio: "Inicio",
  pedidos: "Pedidos",
  impacto: "Mi impacto",
  aprende: "Aprende",
  rutas: "Rutas",
  recojos: "Recojos",
  recepciones: "Recepciones",
  lotes: "Lotes",
  reportes: "Reportes",
  operacion: "Operación",
  indicadores: "Indicadores",
  actores: "Actores",
  perfil: "Perfil",
  disponibilidad: "Disponibilidad",
  calendario: "Calendario",
};

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  icon: IconName;
  steps: string[];
}

export const LESSONS: Lesson[] = [
  {
    id: "botellas",
    title: "Limpia, seca y aplasta",
    summary: "Prepara tus botellas y envases antes del recojo.",
    icon: "bottle",
    steps: [
      "Vacía por completo botellas y envases.",
      "Enjuágalos con poca agua y déjalos secar.",
      "Aplástalos para que ocupen menos espacio.",
      "Guarda las tapas aparte: también se reciclan.",
    ],
  },
  {
    id: "cajas",
    title: "Desarma tus cajas",
    summary: "El cartón plegado ocupa menos espacio y se transporta mejor.",
    icon: "box",
    steps: [
      "Retira cintas, grapas y plásticos adheridos.",
      "Desarma y aplana cada caja.",
      "Amarra el cartón en paquetes del mismo tamaño.",
      "Mantenlo seco: el cartón mojado pierde valor.",
    ],
  },
  {
    id: "organicos",
    title: "Separa los orgánicos",
    summary: "Evita mezclar restos de comida con materiales reciclables.",
    icon: "apple",
    steps: [
      "Usa un tacho exclusivo para restos de comida y cáscaras.",
      "No mezcles orgánicos con plástico ni cartón.",
      "Escurre los líquidos antes de entregar.",
      "Entrégalos en bolsas cerradas el día del recojo.",
    ],
  },
];
