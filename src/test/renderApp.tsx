import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import App from "@/App";
import { DEMO_ACTOR_BY_ROLE } from "@/data/mock";
import { STORAGE_KEYS } from "@/data/repositories";
import { writeJSON } from "@/data/storage";
import type { Role } from "@/types";

/** Jueves 12 de noviembre de 2026, 09:00. */
export const TEST_TODAY = new Date(2026, 10, 12, 9);

/** Congela solo la fecha (los temporizadores siguen reales para user-event). */
export function freezeToday() {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(TEST_TODAY);
}

/** Renderiza la app completa con la cuenta de demostración del rol, en la ruta indicada. */
export function renderApp(path: string, role: Role) {
  writeJSON(STORAGE_KEYS.session, { actorId: DEMO_ACTOR_BY_ROLE[role], role, email: "demo@ejemplo.pe" });
  window.history.pushState({}, "", path);
  const user = userEvent.setup();
  return { user, ...render(<App />) };
}
