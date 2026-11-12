import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { requestsRepo } from "@/data/repositories";
import { freezeToday, renderApp } from "@/test/renderApp";

describe("reserva de un comercio", () => {
  it("asigna automáticamente a la recicladora disponible", async () => {
    freezeToday();
    const { user } = renderApp("/inicio", "comercio");
    await user.click((await screen.findAllByRole("button", { name: /solicitar recojo/i }))[0]);
    await user.click(screen.getByRole("button", { name: /continuar/i }));

    // Rosa no trabaja martes; el miércoles 18 tiene el día libre; el domingo no hay servicio.
    expect(screen.getByRole("button", { name: /^dom, 15/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^mar, 17/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^mié, 18/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /confirmar recojo/i }));
    expect(await screen.findByText(/te visitará rosa quispe/i)).toBeInTheDocument();

    await waitFor(async () => {
      const [latest] = await requestsRepo.list();
      expect(latest).toMatchObject({ requesterId: "com-bazar", scheduledDate: "2026-11-13", slotId: "08-10", status: "asignado", collectorId: "rec-rosa" });
    });
  });
});
