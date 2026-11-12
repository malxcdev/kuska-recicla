import { useState } from "react";
import { Icon } from "@/components/Icon";
import { PageIntro } from "@/components/ui";
import { slotLabel, WEEKDAY_LABELS, ZONES } from "@/data/catalog";
import { useAuthenticated, useSchedule, useToast } from "@/state/contexts";

/** Semana tipo del reciclador: en qué días y franjas puede recoger. Con esto se calculan los cupos. */
export function Disponibilidad() {
  const { actor } = useAuthenticated();
  const { scheduleFor, availability, saveAvailability } = useSchedule();
  const announce = useToast();
  const schedule = scheduleFor(actor.zone);
  const [weekly, setWeekly] = useState<Record<number, string[]>>(() => availability.find((a) => a.collectorId === actor.id)?.weekly ?? {});
  const [saving, setSaving] = useState(false);

  const isOn = (weekday: number, slotId: string) => (weekly[weekday] ?? []).includes(slotId);
  const toggle = (weekday: number, slotId: string) =>
    setWeekly((current) => {
      const day = current[weekday] ?? [];
      return { ...current, [weekday]: day.includes(slotId) ? day.filter((id) => id !== slotId) : [...day, slotId] };
    });

  const save = async () => {
    setSaving(true);
    try {
      await saveAvailability({ collectorId: actor.id, zone: actor.zone, weekly });
      announce("Disponibilidad guardada. Tus recojos ya asignados se mantienen.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-section">
      <PageIntro
        eyebrow={`${ZONES[actor.zone].name} · ${ZONES[actor.zone].area}`.toUpperCase()}
        title="Disponibilidad"
        description="Marca los días y horarios en que puedes recoger. Con esto se calculan los cupos que ven los comercios."
      />
      <article className="panel route-panel">
        <div className="panel-heading">
          <div><h3>Semana tipo</h3><p>Hasta {schedule.stopsPerCollector} recojos por franja</p></div>
        </div>
        <div className="overflow-x-auto">
          <table className="availability-grid">
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Franja</span></th>
                {schedule.weekdays.map((d) => <th scope="col" key={d}>{WEEKDAY_LABELS[d]}</th>)}
              </tr>
            </thead>
            <tbody>
              {schedule.slots.map((slot) => (
                <tr key={slot.id}>
                  <th scope="row">{slotLabel(slot)}</th>
                  {schedule.weekdays.map((d) => (
                    <td key={d}>
                      <button type="button" aria-pressed={isOn(d, slot.id)} aria-label={`${WEEKDAY_LABELS[d]} ${slotLabel(slot)}`} className={isOn(d, slot.id) ? "on" : ""} onClick={() => toggle(d, slot.id)}>
                        {isOn(d, slot.id) && <Icon name="check" size={14} />}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">Si un día no puedes ir a un recojo ya asignado, ábrelo y usa "No puedo ir": se reasigna solo.</p>
        <button type="button" className="primary-button mt-5" disabled={saving} onClick={save}>{saving ? "Guardando…" : "Guardar disponibilidad"}</button>
      </article>
    </section>
  );
}
