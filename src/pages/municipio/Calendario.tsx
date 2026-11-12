import { useId, useState, type FormEvent } from "react";
import { PageIntro } from "@/components/ui";
import { ZONE_IDS, ZONES } from "@/data/catalog";
import { addDays, formatRelativeDay, toISODate } from "@/data/dates";
import { useRequests, useSchedule, useToast } from "@/state/contexts";
import type { ZoneId } from "@/types";

/** Feriados y cierres: días en que no hay recojo en una zona o en toda la red. */
export function Calendario() {
  const { closures, addClosure, removeClosure } = useSchedule();
  const { requests } = useRequests();
  const announce = useToast();
  const id = useId();
  const [today] = useState(() => new Date());
  const tomorrow = toISODate(addDays(today, 1));
  const upcoming = closures.filter((c) => c.date >= tomorrow).sort((a, b) => a.date.localeCompare(b.date));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const date = String(data.get("date"));
    const scope = String(data.get("scope"));
    const zone = scope === "todas" ? null : (scope as ZoneId);
    const affected = requests.filter((r) => r.scheduledDate === date && r.status === "asignado" && (zone === null || r.zone === zone)).length;
    await addClosure({ date, zone, reason: String(data.get("reason") ?? "").trim() });
    form.reset();
    announce(affected > 0 ? `Feriado registrado. Hay ${affected} recojos ya reservados ese día: coordínalos con los comercios.` : "Feriado registrado. Ese día ya no se ofrece a los comercios.");
  };

  return (
    <section className="page-section">
      <PageIntro eyebrow="RED DE RECOJO" title="Calendario" description="Registra feriados y cierres. Esos días no se ofrecen a los comercios al programar un recojo." />
      <div className="role-grid">
        <article className="panel profile-form">
          <div className="panel-heading"><div><h3>Agregar feriado o cierre</h3><p>Día sin recojo</p></div></div>
          <form className="profile-fields" onSubmit={submit}>
            <label htmlFor={`${id}-date`}><span>Fecha</span><input id={`${id}-date`} type="date" name="date" required min={tomorrow} /></label>
            <label htmlFor={`${id}-scope`}>
              <span>Aplica a</span>
              <select id={`${id}-scope`} name="scope" defaultValue="todas">
                <option value="todas">Todas las zonas</option>
                {ZONE_IDS.map((z) => <option key={z} value={z}>{ZONES[z].name} · {ZONES[z].area}</option>)}
              </select>
            </label>
            <label htmlFor={`${id}-reason`} className="sm:col-span-2">
              <span>Motivo</span>
              <input id={`${id}-reason`} name="reason" required maxLength={80} placeholder="Ej. Feriado: Día de la Independencia" />
            </label>
            <button type="submit" className="primary-button sm:col-span-2">Agregar</button>
          </form>
        </article>

        <article className="panel profile-form">
          <div className="panel-heading"><div><h3>Próximos feriados</h3><p>{upcoming.length === 1 ? "1 día sin recojo" : `${upcoming.length} días sin recojo`}</p></div></div>
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No hay feriados ni cierres programados.</p>
          ) : (
            <ul className="time-off-list">
              {upcoming.map((c) => (
                <li key={c.id}>
                  <span><strong>{formatRelativeDay(c.date, today)}</strong><small>{c.reason} · {c.zone ? ZONES[c.zone].name : "Todas las zonas"}</small></span>
                  <button type="button" className="text-button" aria-label={`Quitar feriado del ${formatRelativeDay(c.date, today)}`} onClick={async () => { await removeClosure(c.id); announce("Feriado eliminado."); }}>
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}
