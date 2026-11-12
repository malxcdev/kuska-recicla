import { useId, useState } from "react";
import { DAY_LEVEL_LABELS, dayLevel, type DayAvailability } from "@/data/availability";
import { MATERIAL_LIST, MATERIALS, MAX_KG, MIN_KG, ZONES } from "@/data/catalog";
import { UserFacingError } from "@/data/errors";
import { dayNumber, formatRelativeDay, monthShort, weekdayShort } from "@/data/dates";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { materialStyle } from "./materialStyle";
import type { Actor, MaterialId, NewPickupRequest } from "@/types";

interface RequestWizardProps {
  actor: Actor;
  /** Disponibilidad de los próximos días en la zona del comercio. */
  days: DayAvailability[];
  initialMaterial?: MaterialId;
  today?: Date;
  onClose: () => void;
  onSubmit: (input: NewPickupRequest) => Promise<void>;
  onEditAddress: () => void;
}

const LEGEND = ["open", "low", "full", "closed"] as const;

const isBookable = (day: DayAvailability) => {
  const level = dayLevel(day);
  return level !== "closed" && level !== "full";
};

export function RequestWizard({ actor, days, initialMaterial = "carton", today, onClose, onSubmit, onEditAddress }: RequestWizardProps) {
  const ids = { kg: useId(), materials: useId(), days: useId(), slots: useId(), kgHint: useId() };
  const [step, setStep] = useState<1 | 2>(1);
  const [material, setMaterial] = useState<MaterialId>(initialMaterial);
  const [kgText, setKgText] = useState("10");
  const [date, setDate] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const kg = Number(kgText);
  const kgValid = Number.isInteger(kg) && kg >= MIN_KG && kg <= MAX_KG;
  const setKg = (value: number) => setKgText(String(Math.min(MAX_KG, Math.max(MIN_KG, value))));

  // La disponibilidad puede cambiar con el formulario abierto: si el día elegido ya no tiene cupos, se pasa al primero que sí.
  const day = days.find((d) => d.date === date && isBookable(d)) ?? days.find(isBookable);
  const selected = day?.slots.find((s) => s.slot.id === slotId && s.remaining > 0) ?? day?.slots.find((s) => s.remaining > 0) ?? null;
  const hasAddress = actor.address.trim().length > 0;

  const submit = async () => {
    if (!day || !selected || !hasAddress) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({ requesterId: actor.id, material, kg, scheduledDate: day.date, slotId: selected.slot.id, slot: selected.label, address: actor.address, zone: actor.zone });
    } catch (caught) {
      setError(caught instanceof UserFacingError ? caught.message : "No pudimos registrar el recojo. Inténtalo otra vez.");
      setSubmitting(false);
    }
  };

  return (
    <Dialog title={step === 1 ? "¿Qué vamos a recoger?" : "Elige día y horario"} eyebrow={`PASO ${step} DE 2`} onClose={onClose}>
      <div className="modal-progress" aria-hidden="true"><i className="active" /><i className={step === 2 ? "active" : ""} /></div>

      {step === 1 ? (
        <>
          <p id={ids.materials} className="amount-label mt-0!">Material</p>
          <div className="select-materials" role="group" aria-labelledby={ids.materials}>
            {MATERIAL_LIST.map((item) => (
              <button key={item.id} type="button" aria-pressed={material === item.id} className={material === item.id ? "selected" : ""} onClick={() => setMaterial(item.id)} style={materialStyle(item.id)}>
                <span><Icon name={item.icon} /></span>
                {item.name}
                <i>{material === item.id && <Icon name="check" size={13} />}</i>
              </button>
            ))}
          </div>

          <label className="amount-label" htmlFor={ids.kg}>Cantidad aproximada (kg)</label>
          <div className="amount-control">
            <button type="button" onClick={() => setKg((kgValid ? kg : MIN_KG) - 1)} disabled={kgValid && kg <= MIN_KG} aria-label="Restar un kilo">−</button>
            <div>
              <input id={ids.kg} type="number" inputMode="numeric" min={MIN_KG} max={MAX_KG} step={1} value={kgText} aria-describedby={ids.kgHint} aria-invalid={!kgValid} onChange={(event) => setKgText(event.target.value)} onBlur={() => kgText !== "" && setKg(Math.round(kg) || MIN_KG)} />
              <span>kg</span>
            </div>
            <button type="button" onClick={() => setKg((kgValid ? kg : MIN_KG) + 1)} disabled={kgValid && kg >= MAX_KG} aria-label="Sumar un kilo">+</button>
          </div>
          <p id={ids.kgHint} className={`hint ${kgValid ? "" : "error"}`}>
            {kgValid ? `Entre ${MIN_KG} y ${MAX_KG} kg por recojo.` : `Ingresa un número entero entre ${MIN_KG} y ${MAX_KG} kg.`}
          </p>
          <button type="button" className="primary-button full" disabled={!kgValid} onClick={() => setStep(2)}>Continuar <Icon name="chevron" /></button>
        </>
      ) : (
        <>
          <div className="selected-summary">
            <span><Icon name="map" /></span>
            <div>
              <small>ZONA DE RECOJO</small>
              <strong>{hasAddress ? `${actor.address} · ${ZONES[actor.zone].name}` : "Aún no registras una dirección"}</strong>
            </div>
            <button type="button" onClick={onEditAddress}>{hasAddress ? "Cambiar" : "Agregar"}</button>
          </div>

          <p id={ids.days} className="amount-label">Día del recojo</p>
          <div className="day-strip" role="group" aria-labelledby={ids.days}>
            {days.map((d) => {
              const level = dayLevel(d);
              const status = d.reason ?? DAY_LEVEL_LABELS[level];
              return (
                <button key={d.date} type="button" disabled={!isBookable(d)} aria-pressed={day?.date === d.date} className={`day-chip ${day?.date === d.date ? "selected" : ""}`} onClick={() => { setDate(d.date); setSlotId(null); setError(""); }} aria-label={`${formatRelativeDay(d.date, today)} · ${status}`} title={status}>
                  <span>{weekdayShort(d.date)}</span>
                  <strong>{dayNumber(d.date)}</strong>
                  <small>{monthShort(d.date)}</small>
                  <i className={`level-dot ${level}`} aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <ul className="level-legend" aria-hidden="true">
            {LEGEND.map((level) => <li key={level}><i className={`level-dot ${level}`} />{DAY_LEVEL_LABELS[level]}</li>)}
          </ul>

          {day ? (
            <>
              <p id={ids.slots} className="amount-label">Horarios disponibles</p>
              <div className="slot-picker" role="group" aria-labelledby={ids.slots}>
                {day.slots.map((s) => (
                  <button key={s.slot.id} type="button" disabled={s.remaining <= 0} aria-pressed={selected?.slot.id === s.slot.id} className={selected?.slot.id === s.slot.id ? "selected" : ""} onClick={() => { setSlotId(s.slot.id); setError(""); }}>
                    <Icon name="clock" size={16} />
                    {s.label}
                    <span>{s.collectorIds.length === 0 ? "Sin reciclador" : s.remaining <= 0 ? "Sin cupos" : s.remaining === 1 ? "1 cupo" : `${s.remaining} cupos`}</span>
                  </button>
                ))}
              </div>
              <p className="hint">
                {selected ? `${kg} kg de ${MATERIALS[material].name.toLowerCase()} · ${formatRelativeDay(day.date, today)} · ${selected.label}` : "No quedan cupos este día. Elige otro."}
              </p>
            </>
          ) : (
            <p className="hint error">No hay cupos en los próximos {days.length} días en tu zona. Prueba más adelante.</p>
          )}
          {error && <p className="hint error" role="alert">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="back-button" onClick={() => setStep(1)}>Atrás</button>
            <button type="button" className="primary-button" onClick={submit} disabled={!selected || !hasAddress || submitting}>
              {submitting ? "Registrando…" : "Confirmar recojo"}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
