import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SEED_ACTORS } from "@/data/mock";
import { RequestWizard } from "./RequestWizard";
import type { PickupRequest } from "@/types";

const actor = SEED_ACTORS[0];
// Jueves 12 de noviembre de 2026 → primeros días ofrecidos: vie 13, sáb 14, lun 16.
const TODAY = new Date(2026, 10, 12, 9);

function setup(requests: PickupRequest[] = []) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<RequestWizard actor={actor} requests={requests} today={TODAY} onSubmit={onSubmit} onClose={onClose} onEditAddress={vi.fn()} />);
  return { onSubmit, onClose, user: userEvent.setup() };
}

describe("RequestWizard", () => {
  it("envía material, kilos, día y horario elegidos", async () => {
    const { onSubmit, user } = setup();

    await user.click(screen.getByRole("button", { name: /plástico/i }));
    await user.click(screen.getByRole("button", { name: "Sumar un kilo" }));
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    await user.click(screen.getByRole("button", { name: /^sáb, 14/i }));
    await user.click(screen.getByRole("button", { name: /14:00 – 16:00/ }));
    await user.click(screen.getByRole("button", { name: /confirmar recojo/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      requesterId: actor.id,
      material: "plastico",
      kg: 11,
      scheduledDate: "2026-11-14",
      slot: "14:00 – 16:00",
      address: actor.address,
      zone: actor.zone,
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

  it("deshabilita las franjas sin cupos", async () => {
    const full = Array.from({ length: 3 }, (_, i) => ({
      id: `KR-00${i}`, requesterId: "com-inti", material: "carton", kg: 5, scheduledDate: "2026-11-13", slot: "08:00 – 10:00",
      address: "", zone: "A", status: "solicitado", collectorId: null, createdAt: "", updatedAt: "",
    }) satisfies PickupRequest);
    const { user } = setup(full);
    await user.click(screen.getByRole("button", { name: /continuar/i }));
    expect(screen.getByRole("button", { name: /08:00 – 10:00/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /10:00 – 12:00/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("se cierra con Escape", async () => {
    const { onClose, user } = setup();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
