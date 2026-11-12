import type { ComponentType } from "react";
import { ComercioImpacto } from "@/pages/comercio/ComercioImpacto";
import { ComercioInicio } from "@/pages/comercio/ComercioInicio";
import { ComercioPedidos } from "@/pages/comercio/ComercioPedidos";
import { EmpresaInicio, EmpresaLotes, EmpresaRecepciones, EmpresaReportes } from "@/pages/empresa/Empresa";
import { Calendario } from "@/pages/municipio/Calendario";
import { MunicipioActores, MunicipioIndicadores, MunicipioInicio, MunicipioOperacion } from "@/pages/municipio/Municipio";
import { Disponibilidad } from "@/pages/reciclador/Disponibilidad";
import { RecicladorImpacto, RecicladorInicio, RecicladorRecojos, RecicladorRutas } from "@/pages/reciclador/Reciclador";
import { Aprende } from "@/pages/shared/Aprende";
import { Perfil } from "@/pages/shared/Perfil";
import type { Role, SectionId } from "@/types";

/** Pantalla de cada sección según el rol. Una sección que el rol no tiene redirige a Inicio. */
export const SECTIONS: Record<Role, Partial<Record<SectionId, ComponentType>>> = {
  comercio: { inicio: ComercioInicio, pedidos: ComercioPedidos, impacto: ComercioImpacto, aprende: Aprende, perfil: Perfil },
  reciclador: { inicio: RecicladorInicio, rutas: RecicladorRutas, recojos: RecicladorRecojos, disponibilidad: Disponibilidad, impacto: RecicladorImpacto, aprende: Aprende, perfil: Perfil },
  empresa: { inicio: EmpresaInicio, recepciones: EmpresaRecepciones, lotes: EmpresaLotes, reportes: EmpresaReportes, perfil: Perfil },
  municipio: { inicio: MunicipioInicio, operacion: MunicipioOperacion, calendario: Calendario, indicadores: MunicipioIndicadores, actores: MunicipioActores, perfil: Perfil },
};
