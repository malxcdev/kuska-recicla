import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { scheduleRepo } from "@/data/repositories";
import { freezeToday, renderApp } from "@/test/renderApp";

describe("calendario de disponibilidad", () => {
  it("el reciclador guarda una franja nueva en su semana tipo", async () => {
    freezeToday();
    const { user } = renderApp("/disponibilidad", "reciclador");
    const cell = await screen.findByRole("button", { name: "Mar 14:00 – 16:00" });
    expect(cell).toHaveAttribute("aria-pressed", "false");
    await user.click(cell);
    await user.click(screen.getByRole("button", { name: /guardar disponibilidad/i }));
    await waitFor(async () => {
      const rosa = (await scheduleRepo.listAvailability()).find((a) => a.collectorId === "rec-rosa");
      expect(rosa?.weekly[2]).toContain("14-16");
    });
  });

  it("el municipio registra un feriado para todas las zonas", async () => {
    freezeToday();
    const { user } = renderApp("/calendario", "municipio");
    fireEvent.change(await screen.findByLabelText("Fecha"), { target: { value: "2026-11-16" } });
    await user.type(screen.getByLabelText("Motivo"), "Paro de transporte");
    await user.click(screen.getByRole("button", { name: "Agregar" }));
    expect(await screen.findByText(/paro de transporte · todas las zonas/i)).toBeInTheDocument();
    expect(await scheduleRepo.listClosures()).toContainEqual(expect.objectContaining({ date: "2026-11-16", zone: null, reason: "Paro de transporte" }));
  });
});
