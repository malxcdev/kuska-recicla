import { useId, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Icon } from "@/components/Icon";
import { Avatar, PageIntro } from "@/components/ui";
import { ROLE_LABELS, ZONE_IDS, ZONES } from "@/data/catalog";
import { canResetDemo } from "@/data/repositories";
import { useAuthenticated, useResetDemo, useToast } from "@/state/contexts";
import type { ZoneId } from "@/types";

export function Perfil() {
  const { actor, session, updateProfile, signOut } = useAuthenticated();
  const resetDemo = useResetDemo();
  const announce = useToast();
  const navigate = useNavigate();
  const id = useId();
  const [saving, setSaving] = useState(false);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await updateProfile({
        contactName: String(data.get("contactName") ?? "").trim(),
        phone: String(data.get("phone") ?? "").trim(),
        address: String(data.get("address") ?? "").trim(),
        zone: String(data.get("zone")) as ZoneId,
      });
      announce("Perfil actualizado.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-section">
      <PageIntro eyebrow="TU CUENTA" title="Perfil" description="Mantén tus datos al día para coordinar los recojos sin contratiempos." />
      <div className="role-grid">
        <form className="panel profile-form" onSubmit={save}>
          <div className="panel-heading"><div><h3>Datos de contacto</h3><p>Los ve solo quien coordina contigo un recojo.</p></div></div>
          <div className="profile-fields">
            <label htmlFor={`${id}-contact`}>
              <span>Persona de contacto</span>
              <input id={`${id}-contact`} name="contactName" defaultValue={actor.contactName} required autoComplete="name" />
            </label>
            <label htmlFor={`${id}-phone`}>
              <span>Celular</span>
              <input id={`${id}-phone`} name="phone" defaultValue={actor.phone} required inputMode="tel" autoComplete="tel" pattern="[0-9 ]{6,15}" title="Solo números, entre 6 y 15 dígitos" />
            </label>
            <label htmlFor={`${id}-address`} className="sm:col-span-2">
              <span>Dirección de recojo</span>
              <input id={`${id}-address`} name="address" defaultValue={actor.address} required={session.role === "comercio"} placeholder="Ej. Av. Ejército 1240" autoComplete="street-address" />
            </label>
            <label htmlFor={`${id}-zone`}>
              <span>Zona</span>
              <select id={`${id}-zone`} name="zone" defaultValue={actor.zone}>
                {ZONE_IDS.map((zone) => <option key={zone} value={zone}>{ZONES[zone].name} · {ZONES[zone].area}</option>)}
              </select>
            </label>
            <label htmlFor={`${id}-email`}>
              <span>Correo</span>
              <input id={`${id}-email`} value={session.email} readOnly aria-readonly="true" />
            </label>
          </div>
          <button type="submit" className="primary-button mt-5" disabled={saving}>{saving ? "Guardando…" : "Guardar cambios"}</button>
        </form>

        <article className="panel availability-card">
          <Avatar name={actor.name} />
          <h3>{actor.name}</h3>
          <p>{ROLE_LABELS[session.role]} · {ZONES[actor.zone].name}</p>
          <div className="mt-4 grid w-full gap-2">
            {canResetDemo && (
              <button type="button" className="back-button min-h-11" onClick={async () => { await resetDemo(); announce("Datos de demostración restaurados."); }}>
                <Icon name="reset" size={16} /> Reiniciar demo
              </button>
            )}
            <button type="button" className="primary-button" onClick={async () => { await signOut(); navigate("/ingresar"); }}>
              <Icon name="logout" size={16} /> Cerrar sesión
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
