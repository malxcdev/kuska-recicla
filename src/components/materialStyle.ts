import type { CSSProperties } from "react";
import { MATERIALS } from "@/data/catalog";
import type { MaterialId } from "@/types";

/** Variables CSS --mat y --soft con los colores del material. */
export const materialStyle = (material: MaterialId) =>
  ({ "--mat": MATERIALS[material].color, "--soft": MATERIALS[material].soft }) as CSSProperties;
