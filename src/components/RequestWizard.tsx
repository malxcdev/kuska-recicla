import { useId, useState } from "react";
import { MATERIAL_LIST, MATERIALS, MAX_KG, MIN_KG, SLOT_CAPACITY, SLOTS, ZONES } from "@/data/catalog";
import { dayNumber, formatRelativeDay, getPickupDays, monthShort, weekdayShort } from "@/data/dates";
import { Dialog } from "./Dialog";
import { Icon } from "./Icon";
import { materialStyle } from "./materialStyle";
import type { Actor, MaterialId, NewPickupRequest, PickupRequest } from "@/types";

interface RequestWizardProps {
  actor: Actor;
  /** Pedidos existentes, para calcular los cupos libres de cada franja. */
  requests: PickupRequest[];
  initialMaterial?: MaterialId;
  today?: Date;
  onClose: () => void;
  onSubmit: (input: NewPickupRequest) => Promise<void>;
  onEditAddress: () => void;
}

export function RequestWizard({ actor, requests, initialMaterial = "carton", today, onClose, onSubmit, onEditAddress }: RequestWizardProps) {
  const ids = { kg: useId(), materials: useId(), days: useId(), slots: useId(), kgHint: useId() };
  const [days] = useState(() => getPickupDays(today ?? new Date()));
  const [step, setStep] = useState<1 | 2>(1);
  const [material, setMaterial] = useState<MaterialId>(initialMaterial);
  const [kgText, setKgText] = useState("10");
  const [day, setDay] = useState(days[0]);
  const [slot, setSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const kg = Number(kgText);
  const kgValid = Number.isInteger(kg) && kg >= MIN_KG && kg <= MAX_KG;
  const setKg = (value: number) => setKgText(String(Math.min(MAX_KG, Math.max(MIN_KG, value))));

  const remaining = (date: string, time: string) =>
    SLOT_CAPACITY - requests.filter((r) => r.zone === actor.zone && r.scheduledDate === date && r.slot === time).length;

  const firstFreeSlot = (date: string) => SLOTS.find((time) => remaining(date, time) > 0) ?? null;
  const selectedSlot = slot && remaining(day, slot) > 0 ? slot : firstFreeSlot(day);
  const hasAddress = actor.address.trim().length > 0;

  const submit = async () => {
    if (!selectedSlot || !hasAddress) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({ requesterId: actor.id, material, kg, scheduledDate: day, slot: selectedSlot, address: actor.address, zone: actor.zone });
    } catch {
      setError("No pudimos registrar el recojo. Inténtalo otra vez.");
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
          <div className="day-picker" role="group" aria-labelledby={ids.days}>
            {days.map((date) => (
              <button key={date} type="button" aria-pressed={day === date} className={day === date ? "selected" : ""} onClick={() => setDay(date)} aria-label={formatRelativeDay(date, today)}>
                <span>{weekdayShort(date)}</span>
                <strong>{dayNumber(date)}</strong>
                <small>{monthShort(date)}</small>
              </button>
            ))}
          </div>

          <p id={ids.slots} className="amount-label">Horarios disponibles</p>
          <div className="slot-picker" role="group" aria-labelledby={ids.slots}>
            {SLOTS.map((time) => {
              const free = remaining(day, time);
              return (
                <button key={time} type="button" disabled={free <= 0} aria-pressed={selectedSlot === time} className={selectedSlot === time ? "selected" : ""} onClick={() => setSlot(time)}>
                  <Icon name="clock" size={16} />
                  {time}
                  <span>{free <= 0 ? "Sin cupos" : free === 1 ? "1 cupo" : "Disponible"}</span>
                </button>
              );
            })}
          </div>

          <p className="hint">
            {selectedSlot
              ? `${kg} kg de ${MATERIALS[material].name.toLowerCase()} · ${formatRelativeDay(day, today)} · ${selectedSlot}`
              : "No quedan cupos este día. Elige otro."}
          </p>
          {error && <p className="hint error" role="alert">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="back-button" onClick={() => setStep(1)}>Atrás</button>
            <button type="button" className="primary-button" onClick={submit} disabled={!selectedSlot || !hasAddress || submitting}>
              {submitting ? "Registrando…" : "Confirmar recojo"}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
