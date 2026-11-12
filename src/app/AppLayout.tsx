import { useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router";
import { Icon } from "@/components/Icon";
import { Avatar, Brand, ProgressBar } from "@/components/ui";
import { SECTION_TITLES } from "@/data/catalog";
import { greeting } from "@/data/dates";
import { requestsForSession } from "@/data/requestActions";
import { formatKg, monthProgress, summarizeImpact } from "@/data/stats";
import { useAuthenticated, useRequestFlow, useRequests, useResetDemo, useToast } from "@/state/contexts";
import { ROLE_CONFIG, type NavItem } from "./navigation";
import type { SectionId } from "@/types";

const PENDING = new Set(["solicitado", "asignado", "recogido"]);

export function AppLayout() {
  const { session, actor } = useAuthenticated();
  const { requests } = useRequests();
  const resetDemo = useResetDemo();
  const { openWizard } = useRequestFlow();
  const announce = useToast();
  const navigate = useNavigate();
  const { section = "inicio" } = useParams();
  const [today] = useState(() => new Date());
  const config = ROLE_CONFIG[session.role];

  const mine = requestsForSession(requests, session);
  const pendingCount =
    session.role === "empresa"
      ? mine.filter((r) => r.status === "recogido").length
      : session.role === "reciclador"
        ? requests.filter((r) => (r.collectorId === session.actorId && r.status === "asignado") || (r.status === "solicitado" && r.collectorId === null && r.zone === actor.zone)).length
        : mine.filter((r) => PENDING.has(r.status)).length;
  const progress = monthProgress(requests, today);
  const networkKg = summarizeImpact(requests, today).totalKg;

  const title = section === "inicio" ? `${greeting()}, ${config.greetingName(actor)}` : SECTION_TITLES[section as SectionId] ?? "";

  const activate = (item: NavItem) => {
    if ("action" in item) openWizard();
    else navigate(`/${item.to}`);
  };

  const renderNavItem = (item: NavItem, className: string) =>
    "action" in item ? (
      <button key={item.label} type="button" className={className} onClick={() => activate(item)}>
        <Icon name={item.icon} /><span>{item.label}</span>
      </button>
    ) : (
      <NavLink key={item.label} to={`/${item.to}`} className={({ isActive }) => `${className} ${isActive ? "active" : ""}`}>
        <Icon name={item.icon} /><span>{item.label}</span>
        {className === "nav-item" && item.to === config.badgeSection && pendingCount > 0 && (
          <span className="nav-count" aria-label={`${pendingCount} pendientes`}>{pendingCount}</span>
        )}
      </NavLink>
    );

  const handleReset = async () => {
    await resetDemo();
    announce("Datos de demostración restaurados.");
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <aside className="sidebar">
        <Brand />
        <nav className="side-nav" aria-label="Navegación principal">
          {config.nav.map((item) => renderNavItem(item, "nav-item"))}
        </nav>
        <div className="pilot-card">
          <span><Icon name="leaf" /></span>
          <strong>{session.role === "municipio" ? "Meta distrital" : "Juntos hacemos la diferencia"}</strong>
          <p>
            {session.role === "municipio"
              ? `La red alcanzó el ${progress.pct}% de la meta mensual.`
              : `Ya recuperamos ${formatKg(networkKg)} de residuos en Santiago.`}
          </p>
          <ProgressBar value={progress.pct} label="Avance de la meta mensual" />
          <small>{formatKg(progress.kg)} de {formatKg(progress.goalKg)} este mes</small>
        </div>
        <NavLink to="/perfil" className="profile-mini">
          <Avatar name={actor.name} />
          <div><strong>{actor.name}</strong><span>{config.label} · Ver perfil</span></div>
          <Icon name="chevron" size={16} />
        </NavLink>
      </aside>

      <main className="main" id="contenido" tabIndex={-1}>
        <header className="mobile-header">
          <Brand />
          <div className="flex items-center gap-2">
            <button type="button" className="icon-button" aria-label="Notificaciones" onClick={() => announce("No tienes notificaciones nuevas.")}><Icon name="bell" /></button>
          </div>
        </header>

        <header className="topbar">
          <div>
            <p className="eyebrow">{config.label.toUpperCase()} · SANTIAGO, CUSCO</p>
            <h1>{title}</h1>
          </div>
          <div className="top-actions">
            <button type="button" className="reset-button" onClick={handleReset}><Icon name="reset" size={16} /> Reiniciar demo</button>
            <button type="button" className="icon-button" aria-label="Notificaciones" onClick={() => announce("No tienes notificaciones nuevas.")}><Icon name="bell" /></button>
            <button type="button" className="primary-button" onClick={() => activate(config.primaryAction)}>
              <Icon name={config.primaryAction.icon} size={18} /> {config.primaryAction.label}
            </button>
          </div>
        </header>

        {session.role === "comercio" && !actor.address && (
          <div className="profile-notice" role="note">
            <Icon name="map" size={18} />
            <span>Agrega la dirección de tu comercio para poder programar recojos.</span>
            <NavLink to="/perfil">Completar perfil</NavLink>
          </div>
        )}

        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {config.mobileNav.map((item) => renderNavItem(item, "bottom-item"))}
      </nav>
    </div>
  );
}
