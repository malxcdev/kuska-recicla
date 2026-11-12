import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DayAvailability, SlotAvailability } from "@/data/availability";
import { UserFacingError } from "@/data/errors";
import { SEED_ACTORS } from "@/data/mock";
import { RequestWizard } from "./RequestWizard";

const actor = SEED_ACTORS[0];
const TODAY = new Date(2026, 10, 12, 9); // jueves

const slot = (id: string, start: string, end: string, remaining: number, collectorIds = remaining > 0 ? ["rec-rosa"] : []): SlotAvailability => ({
  slot: { id, start, end }, label: `${start} – ${end}`, collectorIds, capacity: collectorIds.length * 3, booked: collectorIds.length * 3 - remaining, remaining,
});

const DAYS: DayAvailability[] = [
  { date: "2026-11-13", open: true, reason: null, slots: [slot("08-10", "08:00", "10:00", 0, ["rec-rosa"]), slot("10-12", "10:00", "12:00", 3), slot("14-16", "14:00", "16:00", 1)] },
  { date: "2026-11-14", open: true, reason: null, slots: [slot("08-10", "08:00", "10:00", 2), slot("10-12", "10:00", "12:00", 0), slot("14-16", "14:00", "16:00", 0)] },
  { date: "2026-11-15", open: false, reason: "Sin servicio este día", slots: [] },
  { date: "2026-11-16", open: true, reason: null, slots: [slot("08-10", "08:00", "10:00", 0, ["rec-rosa"]), slot("10-12", "10:00", "12:00", 0, ["rec-rosa"]), slot("14-16", "14:00", "16:00", 0, ["rec-rosa"])] },
];

function setup(days = DAYS, onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  const wizard = (current: DayAvailability[]) => <RequestWizard actor={actor} days={current} today={TODAY} onSubmit={onSubmit} onClose={onClose} onEditAddress={vi.fn()} />;
  const { rerender } = render(wizard(days));
  return { onSubmit, onClose, user: userEvent.setup(), rerenderWith: (next: DayAvailability[]) => rerender(wizard(next)) };
}

describe("RequestWizard", () => {
  it("envía material, kilos, día y franja elegidos", async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole("button", { name: /plástico/i }));
    await user.click(screen.getByRole("button", { name: "Sumar un kilo" }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /^sáb, 14/i }));
    await user.click(screen.getByRole("button", { name: /confirmar recojo/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      requesterId: actor.id, material: "plastico", kg: 11, scheduledDate: "2026-11-14",
      slotId: "08-10", slot: "08:00 – 10:00", address: actor.address, zone: actor.zone,
    });
  });

  it("no deja continuar con una cantidad fuera de rango", async () => {
    const { user } = setup();
    const input = screen.getByLabelText(/cantidad aproximada/i);
    await user.clear(input);
    await user.type(input, "500");
    expect(screen.getByRole("button", { name: /continuar/i })).toBeDisabled();
    expect(screen.getByText(/ingresa un número entero/i)).toBeInTheDocument();
  });

  it("deshabilita días cerrados o llenos y franjas sin cupo", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    expect(screen.getByRole("button", { name: /^dom, 15/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^lun, 16/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /08:00 – 10:00/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /10:00 – 12:00/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /14:00 – 16:00/ })).toHaveTextContent("1 cupo");
  });

  it("avisa cuando no hay cupos en todo el horizonte", async () => {
    const { user } = setup([DAYS[2]]);
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    expect(screen.getByText(/no hay cupos en los próximos/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar recojo/i })).toBeDisabled();
  });

  it("muestra el error si la reserva falla", async () => {
    const { user } = setup(DAYS, vi.fn().mockRejectedValue(new UserFacingError("Ese horario se acaba de llenar. Elige otro.")));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /confirmar recojo/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ese horario se acaba de llenar");
  });

  it("oculta los errores internos tras un mensaje genérico", async () => {
    const { user } = setup(DAYS, vi.fn().mockRejectedValue(new Error("boom")));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /confirmar recojo/i }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos registrar el recojo. Inténtalo otra vez.");
    expect(alert).not.toHaveTextContent("boom");
  });

  it("envía la franja elegida", async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /14:00 – 16:00/ }));
    await user.click(screen.getByRole("button", { name: /confirmar recojo/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ scheduledDate: "2026-11-13", slotId: "14-16", slot: "14:00 – 16:00" }));
  });

  it("cambiar de día reinicia la franja", async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /14:00 – 16:00/ }));
    await user.click(screen.getByRole("button", { name: /^sáb, 14/i }));
    await user.click(screen.getByRole("button", { name: /^mañana, 13/i }));
    await user.click(screen.getByRole("button", { name: /confirmar recojo/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ scheduledDate: "2026-11-13", slotId: "10-12" }));
  });

  it("limpia el error al elegir otro día o franja", async () => {
    const { user } = setup(DAYS, vi.fn().mockRejectedValue(new UserFacingError("Ese horario se acaba de llenar. Elige otro.")));
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /confirmar recojo/i }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: /14:00 – 16:00/ }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /confirmar recojo/i }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: /^sáb, 14/i }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("si el día elegido se llena, pasa al primer día con cupos", async () => {
    const { onSubmit, user, rerenderWith } = setup();
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    await user.click(screen.getByRole("button", { name: /^sáb, 14/i }));
    // El sábado se llena mientras el formulario está abierto.
    rerenderWith(DAYS.map((d) => (d.date === "2026-11-14" ? { ...d, slots: d.slots.map((s) => ({ ...s, remaining: 0 })) } : d)));
    expect(screen.getByRole("button", { name: /^mañana, 13/i })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /confirmar recojo/i }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ scheduledDate: "2026-11-13", slotId: "10-12" }));
  });

  it("se cierra con Escape", async () => {
    const { onClose, user } = setup();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
