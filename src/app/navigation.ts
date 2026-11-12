import type { Actor, IconName, Role, SectionId } from "@/types";

export type NavTarget = { to: SectionId } | { action: "solicitar" };

export type NavItem = NavTarget & { label: string; icon: IconName };

export interface RoleConfig {
  label: string;
  nav: NavItem[];
  mobileNav: NavItem[];
  primaryAction: NavItem;
  /** Nombre con el que se saluda en la portada. */
  greetingName: (actor: Actor) => string;
  /** Pestañas que cuentan pendientes en el menú. */
  badgeSection?: SectionId;
}

const firstName = (actor: Actor) => actor.contactName.split(" ")[0] || actor.name;

export const ROLE_CONFIG: Record<Role, RoleConfig> = {
  comercio: {
    label: "Comerciante",
    nav: [
      { label: "Inicio", icon: "home", to: "inicio" },
      { label: "Solicitar recojo", icon: "plus", action: "solicitar" },
      { label: "Pedidos", icon: "truck", to: "pedidos" },
      { label: "Mi impacto", icon: "chart", to: "impacto" },
      { label: "Aprende", icon: "book", to: "aprende" },
    ],
    mobileNav: [
      { label: "Inicio", icon: "home", to: "inicio" },
      { label: "Pedidos", icon: "truck", to: "pedidos" },
      { label: "Recojo", icon: "plus", action: "solicitar" },
      { label: "Impacto", icon: "chart", to: "impacto" },
      { label: "Perfil", icon: "user", to: "perfil" },
    ],
    primaryAction: { label: "Solicitar recojo", icon: "plus", action: "solicitar" },
    greetingName: firstName,
    badgeSection: "pedidos",
  },
  reciclador: {
    label: "Reciclador",
    nav: [
      { label: "Inicio", icon: "home", to: "inicio" },
      { label: "Rutas", icon: "map", to: "rutas" },
      { label: "Recojos", icon: "truck", to: "recojos" },
      { label: "Mi impacto", icon: "chart", to: "impacto" },
      { label: "Aprende", icon: "book", to: "aprende" },
    ],
    mobileNav: [
      { label: "Inicio", icon: "home", to: "inicio" },
      { label: "Rutas", icon: "map", to: "rutas" },
      { label: "Recojos", icon: "truck", to: "recojos" },
      { label: "Impacto", icon: "chart", to: "impacto" },
      { label: "Perfil", icon: "user", to: "perfil" },
    ],
    primaryAction: { label: "Ver ruta de hoy", icon: "map", to: "rutas" },
    greetingName: firstName,
    badgeSection: "recojos",
  },
  empresa: {
    label: "Empresa",
    nav: [
      { label: "Inicio", icon: "home", to: "inicio" },
      { label: "Recepciones", icon: "truck", to: "recepciones" },
      { label: "Lotes", icon: "box", to: "lotes" },
      { label: "Reportes", icon: "chart", to: "reportes" },
      { label: "Perfil", icon: "user", to: "perfil" },
    ],
    mobileNav: [
      { label: "Inicio", icon: "home", to: "inicio" },
      { label: "Recepciones", icon: "truck", to: "recepciones" },
      { label: "Lotes", icon: "box", to: "lotes" },
      { label: "Reportes", icon: "chart", to: "reportes" },
      { label: "Perfil", icon: "user", to: "perfil" },
    ],
    primaryAction: { label: "Registrar recepción", icon: "box", to: "recepciones" },
    greetingName: () => "equipo",
    badgeSection: "recepciones",
  },
  municipio: {
    label: "Municipio",
    nav: [
      { label: "Inicio", icon: "home", to: "inicio" },
      { label: "Operación", icon: "map", to: "operacion" },
      { label: "Indicadores", icon: "chart", to: "indicadores" },
      { label: "Actores", icon: "user", to: "actores" },
      { label: "Perfil", icon: "user", to: "perfil" },
    ],
    mobileNav: [
      { label: "Inicio", icon: "home", to: "inicio" },
      { label: "Operación", icon: "map", to: "operacion" },
      { label: "Indicadores", icon: "chart", to: "indicadores" },
      { label: "Actores", icon: "user", to: "actores" },
      { label: "Perfil", icon: "user", to: "perfil" },
    ],
    primaryAction: { label: "Ver operación", icon: "chart", to: "operacion" },
    greetingName: () => "gestión ambiental",
  },
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => word.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(word))
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
