import { useState, type FormEvent } from "react";
import { Link, NavLink } from "react-router";
import { Icon } from "@/components/Icon";
import { TermsDialog } from "@/components/InfoDialogs";
import { Brand } from "@/components/ui";
import { ACCOUNT_TYPES } from "@/data/catalog";
import { authRepo, dataBackend, EmailConfirmationRequired } from "@/data/repositories";
import { useSession } from "@/state/contexts";
import type { Role } from "@/types";

export type AuthMode = "login" | "register" | "recover";

const PLACEHOLDERS: Record<Role, { label: string; example: string }> = {
  comercio: { label: "Nombre del comercio", example: "Ej. Bazar Ejército" },
  reciclador: { label: "Nombre completo", example: "Ej. Rosa Quispe" },
  empresa: { label: "Nombre de la organización", example: "Ej. Recicla Cusco SAC" },
  municipio: { label: "Municipalidad", example: "Ej. Municipalidad de Santiago" },
};

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { signIn, signUp } = useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<Role>("comercio");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    setError("");
    setSubmitting(true);
    try {
      if (mode === "recover") {
        await authRepo.requestPasswordReset(email);
        setMessage(`Si ${email} tiene una cuenta, te enviamos un enlace para recuperar tu contraseña.`);
        return;
      }
      // Al quedar con sesión, GuestOnly redirige a la página solicitada (o a Inicio).
      if (mode === "register") {
        await signUp({ email, password, role: accountType, name: String(data.get("name") ?? "").trim(), phone: String(data.get("phone") ?? "").trim() });
      } else {
        await signIn({ email, password, role: accountType, remember: data.get("remember") === "on" });
      }
    } catch (caught) {
      // Cuenta creada, pero Supabase exige confirmar el correo antes de entrar.
      if (caught instanceof EmailConfirmationRequired) {
        setMessage(caught.message);
        return;
      }
      setError(caught instanceof Error ? caught.message : "No pudimos completar la operación. Inténtalo otra vez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-story-top"><Brand /><span>SANTIAGO · CUSCO</span></div>
        <div className="auth-story-copy">
          <span className="auth-kicker"><Icon name="spark" size={15} /> RECICLEMOS JUNTOS</span>
          <h1>Convierte tus residuos<br />en <em>impacto positivo.</em></h1>
          <p>Conectamos comercios con recicladores de su zona para construir una comunidad más limpia y circular.</p>
          <div className="auth-benefits">
            <div><span><Icon name="calendar" /></span><p><strong>Programa fácilmente</strong><small>Elige el día y horario que mejor te conviene.</small></p></div>
            <div><span><Icon name="truck" /></span><p><strong>Sigue cada recojo</strong><small>Conoce quién recoge y a dónde llegan tus residuos.</small></p></div>
            <div><span><Icon name="chart" /></span><p><strong>Mide tu impacto</strong><small>Descubre cuánto aportas al cuidado de Santiago.</small></p></div>
          </div>
        </div>
        <div className="auth-landscape" aria-hidden="true">
          <i className="auth-sun" /><i className="auth-mountain m1" /><i className="auth-mountain m2" />
          <span className="auth-tree tree-one">♣</span><span className="auth-tree tree-two">♣</span>
          <div className="auth-truck"><span><Icon name="leaf" size={18} /></span><b /><i /><i /></div>
        </div>
        <p className="auth-community">Comercios y recicladores de Santiago, conectados.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand"><Brand /></div>
        <div className="auth-card">
          {mode !== "recover" && (
            <nav className="auth-tabs" aria-label="Acceso">
              <NavLink to="/ingresar" replace className={({ isActive }) => (isActive ? "active" : "")}>Iniciar sesión</NavLink>
              <NavLink to="/registro" replace className={({ isActive }) => (isActive ? "active" : "")}>Crear cuenta</NavLink>
            </nav>
          )}

          <div className="auth-heading">
            {mode === "login" && <><p className="eyebrow">QUÉ BUENO VERTE</p><h2>Bienvenido de nuevo</h2><span>Ingresa para gestionar tus recojos y ver tu impacto.</span></>}
            {mode === "register" && <><p className="eyebrow">ÚNETE A KUSKA</p><h2>Crea tu cuenta</h2><span>Empieza a reciclar con tu comunidad en pocos pasos.</span></>}
            {mode === "recover" && <><Link className="auth-back" to="/ingresar">‹ Volver al inicio</Link><p className="eyebrow">RECUPERAR ACCESO</p><h2>¿Olvidaste tu contraseña?</h2><span>Escribe tu correo y te enviaremos instrucciones para recuperarla.</span></>}
          </div>

          {mode !== "recover" && (
            <fieldset className="account-types">
              <legend className="sr-only">Tipo de cuenta</legend>
              {ACCOUNT_TYPES.map(({ id, label, description, icon }) => (
                <button type="button" key={id} aria-pressed={accountType === id} className={accountType === id ? "selected" : ""} onClick={() => setAccountType(id)}>
                  <span><Icon name={icon} /></span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                  <i>{accountType === id && <Icon name="check" size={12} />}</i>
                </button>
              ))}
            </fieldset>
          )}

          <form className="auth-form" onSubmit={submit}>
            {mode === "register" && (
              <div className="auth-row">
                <label><span>{PLACEHOLDERS[accountType].label}</span><div><Icon name="home" size={18} /><input name="name" required autoComplete="organization" placeholder={PLACEHOLDERS[accountType].example} /></div></label>
                <label><span>Celular</span><div><Icon name="phone" size={18} /><input name="phone" required inputMode="tel" autoComplete="tel" pattern="[0-9 ]{6,15}" title="Solo números, entre 6 y 15 dígitos" placeholder="984 123 456" /></div></label>
              </div>
            )}
            <label><span>Correo electrónico</span><div><Icon name="mail" size={18} /><input name="email" required type="email" autoComplete="email" placeholder="nombre@correo.com" /></div></label>
            {mode !== "recover" && (
              <label>
                <span>Contraseña</span>
                <div>
                  <Icon name="lock" size={18} />
                  <input name="password" required minLength={6} type={showPassword ? "text" : "password"} autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder={mode === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"} />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword}><Icon name="eye" size={18} /></button>
                </div>
              </label>
            )}
            {mode === "login" && (
              <div className="auth-options">
                <label><input type="checkbox" name="remember" defaultChecked /> <span>Recordarme</span></label>
                <Link to="/recuperar">Olvidé mi contraseña</Link>
              </div>
            )}
            {mode === "register" && (
              <div className="terms">
                <input id="terms" type="checkbox" required />
                <span><label htmlFor="terms">Acepto los </label><button type="button" onClick={() => setShowTerms(true)}>términos y condiciones</button><label htmlFor="terms"> y la política de privacidad.</label></span>
              </div>
            )}
            {message && <div className="auth-success" role="status"><Icon name="check" />{message}</div>}
            {error && <div className="auth-error" role="alert">{error}</div>}
            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting ? "Un momento…" : mode === "login" ? "Ingresar a mi cuenta" : mode === "register" ? "Crear mi cuenta" : "Enviar instrucciones"} <Icon name="chevron" size={17} />
            </button>
          </form>

          {mode === "login" && dataBackend === "demo" && <div className="demo-access"><Icon name="spark" size={16} /><span><strong>¿Solo quieres explorar?</strong> Usa cualquier correo y una contraseña de 6 caracteres o más para entrar a la demo.</span></div>}
          <p className="auth-help">¿Necesitas ayuda? <a href="tel:984000123">Llámanos al 984 000 123</a></p>
        </div>
      </section>
      {showTerms && <TermsDialog onClose={() => setShowTerms(false)} />}
    </main>
  );
}
