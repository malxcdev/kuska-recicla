import { useEffect, useState } from "react";

type IconName =
  | "home" | "plus" | "truck" | "chart" | "book" | "bell" | "user"
  | "calendar" | "clock" | "map" | "chevron" | "check" | "leaf"
  | "box" | "bottle" | "apple" | "glass" | "close" | "reset" | "spark"
  | "mail" | "lock" | "eye" | "phone";

const iconPaths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  truck: <><path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  book: <><path d="M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 2z"/><path d="M20 5a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 2z"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  map: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  leaf: <><path d="M20 4S9 3 5 9c-3 5 1 9 5 9 7 0 10-14 10-14Z"/><path d="M4 21c3-6 7-9 12-12"/></>,
  box: <><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></>,
  bottle: <><path d="M9 3h6v4l2 3v10H7V10l2-3z"/><path d="M9 13h8"/></>,
  apple: <><path d="M12 8c-4-3-8 0-8 5 0 5 4 8 8 8s8-3 8-8c0-5-4-8-8-5Z"/><path d="M12 8c0-3 2-5 5-5M12 8c-2-2-4-2-5-2"/></>,
  glass: <><path d="M6 3h12l-1 9a5 5 0 0 1-10 0L6 3ZM12 17v4M8 21h8"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  reset: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></>,
  spark: <><path d="m12 3 1.4 4.2L18 9l-4.6 1.8L12 15l-1.4-4.2L6 9l4.6-1.8L12 3Z"/><path d="m19 16 .7 2.1L22 19l-2.3.9L19 22l-.7-2.1L16 19l2.3-.9L19 16Z"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  phone: <path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-4-2-2 2c-3.5-1.5-6.5-4.5-8-8l2-2-2-4Z"/>,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{iconPaths[name]}</svg>;
}

const materials = [
  { id: "carton", name: "Cartón", icon: "box" as IconName, color: "#bd7a41", soft: "#f5e6d7" },
  { id: "plastico", name: "Plástico", icon: "bottle" as IconName, color: "#407fc1", soft: "#e0edf8" },
  { id: "organico", name: "Orgánico", icon: "apple" as IconName, color: "#568c4d", soft: "#e5efdf" },
  { id: "vidrio", name: "Vidrio y metal", icon: "glass" as IconName, color: "#3e9290", soft: "#dcf0ed" },
];

type Request = {
  id: string;
  material: string;
  kg: number;
  date: string;
  time: string;
  zone: string;
  status: "Solicitado" | "Asignado" | "Recogido" | "Entregado";
};

type Role = "comercio" | "reciclador" | "empresa" | "municipio";

const roleInfo: Record<Role, { label: string; name: string; subtitle: string; action: string; nav: [string, IconName][] }> = {
  comercio: { label: "Comerciante", name: "Bazar Ejército", subtitle: "Comercio · Zona A", action: "Solicitar recojo", nav: [["Inicio","home"],["Solicitar recojo","plus"],["Pedidos","truck"],["Mi impacto","chart"],["Aprende","book"]] },
  reciclador: { label: "Reciclador", name: "Rosa Quispe", subtitle: "Recicladora · Zona A", action: "Ver siguiente ruta", nav: [["Inicio","home"],["Rutas","map"],["Recojos","truck"],["Mi impacto","chart"],["Aprende","book"]] },
  empresa: { label: "Empresa", name: "Recicla Cusco SAC", subtitle: "Empresa valorizadora", action: "Registrar recepción", nav: [["Inicio","home"],["Recepciones","truck"],["Lotes","box"],["Reportes","chart"],["Perfil","user"]] },
  municipio: { label: "Municipio", name: "Municipalidad de Santiago", subtitle: "Gestión ambiental", action: "Ver operación", nav: [["Inicio","home"],["Operación","map"],["Indicadores","chart"],["Actores","user"],["Perfil","home"]] },
};

const initialRequests: Request[] = [
  { id: "KR-0248", material: "Cartón", kg: 12, date: "Hoy, 12 jun", time: "10:00 – 12:00", zone: "Av. Ejército", status: "Asignado" },
  { id: "KR-0231", material: "Plástico", kg: 6, date: "7 jun", time: "08:00 – 10:00", zone: "Av. Ejército", status: "Entregado" },
  { id: "KR-0219", material: "Cartón", kg: 9, date: "29 may", time: "14:00 – 16:00", zone: "Av. Ejército", status: "Entregado" },
];

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState<Role>("comercio");
  const [active, setActive] = useState("Inicio");
  const [showRequest, setShowRequest] = useState(false);
  const [toast, setToast] = useState("");
  const [step, setStep] = useState(1);
  const [material, setMaterial] = useState("Cartón");
  const [kg, setKg] = useState(10);
  const [slot, setSlot] = useState("10:00 – 12:00");
  const [requests, setRequests] = useState<Request[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("kuska-requests") || "") || initialRequests;
    } catch {
      return initialRequests;
    }
  });

  useEffect(() => localStorage.setItem("kuska-requests", JSON.stringify(requests)), [requests]);

  const announce = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const submitRequest = () => {
    const next: Request = {
      id: `KR-0${250 + requests.length}`,
      material,
      kg,
      date: "Mié, 12 jun",
      time: slot,
      zone: "Av. Ejército",
      status: "Solicitado",
    };
    setRequests((current) => [next, ...current]);
    setShowRequest(false);
    setStep(1);
    setActive("Pedidos");
    announce("Recojo solicitado. Te avisaremos cuando sea asignado.");
  };

  const resetDemo = () => {
    setRequests(initialRequests);
    localStorage.removeItem("kuska-requests");
    announce("Datos de demostración restaurados.");
  };

  if (!authenticated) {
    return <AuthScreen onEnter={(selectedRole) => { setRole(selectedRole); setActive("Inicio"); setAuthenticated(true); }} />;
  }

  const currentRole = roleInfo[role];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav className="side-nav" aria-label="Navegación principal">
          {currentRole.nav.map(([label, icon]) => (
            <button
              key={label}
              className={active === label ? "nav-item active" : "nav-item"}
              onClick={() => role === "comercio" && label === "Solicitar recojo" ? setShowRequest(true) : setActive(label)}
            >
              <Icon name={icon as IconName} /><span>{label}</span>
              {(label === "Pedidos" || label === "Recojos" || label === "Recepciones") && <span className="nav-count">{requests.length}</span>}
            </button>
          ))}
        </nav>
        <div className="pilot-card">
          <span><Icon name="leaf" /></span>
          <strong>{role === "municipio" ? "Meta distrital" : "Juntos hacemos la diferencia"}</strong>
          <p>{role === "municipio" ? "La red alcanzó el 72% de la meta mensual." : "Ya recuperamos 1.2 toneladas de residuos en Santiago."}</p>
          <div><i style={{ width: "72%" }} /></div>
          <small>72% de la meta mensual</small>
        </div>
        <button className="profile-mini" onClick={() => setAuthenticated(false)} title="Cerrar sesión">
          <div className="avatar">{role === "comercio" ? "BE" : role === "reciclador" ? "RQ" : role === "empresa" ? "RC" : "MS"}</div>
          <div><strong>{currentRole.name}</strong><span>{currentRole.subtitle} · Cerrar sesión</span></div>
          <Icon name="chevron" size={16} />
        </button>
      </aside>

      <main className="main">
        <header className="mobile-header">
          <Brand />
          <button className="icon-button" aria-label="Notificaciones" onClick={() => announce("No tienes notificaciones nuevas.")}><Icon name="bell" /><i /></button>
        </header>

        <header className="topbar">
          <div><p className="eyebrow">{currentRole.label.toUpperCase()} · SANTIAGO, CUSCO</p><h1>{active === "Inicio" ? `Buenos días, ${role === "comercio" ? "María" : role === "reciclador" ? "Rosa" : role === "empresa" ? "equipo" : "gestión ambiental"}` : active}</h1></div>
          <div className="top-actions">
            <button className="reset-button" onClick={resetDemo}><Icon name="reset" size={16} /> Reiniciar demo</button>
            <button className="icon-button" aria-label="Notificaciones" onClick={() => announce("No tienes notificaciones nuevas.")}><Icon name="bell" /><i /></button>
            <button className="primary-button" onClick={() => role === "comercio" ? setShowRequest(true) : announce(`${currentRole.action}: vista preparada.`)}><Icon name={role === "comercio" ? "plus" : role === "reciclador" ? "map" : role === "empresa" ? "box" : "chart"} size={18} /> {currentRole.action}</button>
          </div>
        </header>

        {role === "comercio" && active === "Inicio" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <span className="hero-label"><Icon name="spark" size={15} /> RECICLAR NUNCA FUE TAN FÁCIL</span>
                <h2>Tú separas.<br /><em>Nosotros conectamos.</em></h2>
                <p>Programa el recojo de tus residuos aprovechables y genera un impacto positivo en tu comunidad.</p>
                <button className="hero-button" onClick={() => setShowRequest(true)}>Programar un recojo <Icon name="chevron" size={17} /></button>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="sun" />
                <div className="mountain one" /><div className="mountain two" />
                <div className="road" />
                <div className="truck-art"><span className="truck-box"><Icon name="leaf" size={22} /></span><span className="truck-cab" /><i /><i /></div>
                <span className="tree t1">♣</span><span className="tree t2">♣</span><span className="tree t3">♣</span>
              </div>
            </section>

            <section className="stats-grid">
              <article className="stat-card"><span className="stat-icon green"><Icon name="leaf" /></span><div><p>Residuos recuperados</p><strong>82.5 <small>kg</small></strong><span className="trend">↑ 12% este mes</span></div></article>
              <article className="stat-card"><span className="stat-icon ochre"><Icon name="truck" /></span><div><p>Recojos completados</p><strong>7</strong><span>Desde abril de 2026</span></div></article>
              <article className="stat-card"><span className="stat-icon teal"><Icon name="chart" /></span><div><p>CO₂ evitado</p><strong>34.8 <small>kg</small></strong><span>Equivale a plantar 2 árboles</span></div></article>
            </section>

            <section className="dashboard-grid">
              <article className="panel next-pickup">
                <div className="panel-heading"><div><p className="eyebrow">PRÓXIMO RECOJO</p><h3>Tu recicladora está en camino</h3></div><span className="status assigned">Asignado</span></div>
                <div className="pickup-body">
                  <div className="date-block"><span>MIÉ</span><strong>12</strong><small>JUN</small></div>
                  <div className="pickup-details">
                    <div><Icon name="clock" /><span><strong>10:00 – 12:00</strong><small>Horario estimado</small></span></div>
                    <div><Icon name="map" /><span><strong>Av. Ejército</strong><small>Zona A · Santiago</small></span></div>
                  </div>
                  <div className="collector"><div className="avatar rosa">RQ</div><span><small>RECICLADORA ASIGNADA</small><strong>Rosa Quispe</strong><button onClick={() => announce("Rosa ha sido notificada.")}>Ver contacto</button></span></div>
                </div>
                <div className="tracking">
                  {["Solicitado", "Asignado", "Recogido", "Entregado"].map((label, index) => <div className={index < 2 ? "done" : ""} key={label}><i>{index < 2 ? <Icon name="check" size={11} /> : index + 1}</i><span>{label}</span></div>)}
                </div>
              </article>

              <article className="panel quick-request">
                <div className="panel-heading"><div><h3>¿Qué tienes para reciclar?</h3><p>Selecciona un material para empezar</p></div></div>
                <div className="material-grid">
                  {materials.map((item) => <button key={item.id} onClick={() => { setMaterial(item.name); setShowRequest(true); }} style={{ "--mat": item.color, "--soft": item.soft } as React.CSSProperties}><span><Icon name={item.icon} /></span><strong>{item.name}</strong><Icon name="chevron" size={15} /></button>)}
                </div>
              </article>
            </section>

            <section className="panel recent">
              <div className="panel-heading"><div><h3>Actividad reciente</h3><p>Seguimiento de tus últimos recojos</p></div><button className="text-button" onClick={() => setActive("Pedidos")}>Ver todos <Icon name="chevron" size={15} /></button></div>
              <RequestTable requests={requests.slice(0, 3)} />
            </section>
          </>
        )}

        {role === "comercio" && active === "Pedidos" && (
          <section className="page-section">
            <div className="section-intro"><div><p className="eyebrow">HISTORIAL Y SEGUIMIENTO</p><h2>Mis pedidos</h2><p>Revisa el estado de cada recojo, desde la solicitud hasta la entrega.</p></div><button className="primary-button" onClick={() => setShowRequest(true)}><Icon name="plus" /> Nuevo recojo</button></div>
            <article className="panel orders-panel"><RequestTable requests={requests} expanded /></article>
          </section>
        )}

        {role === "comercio" && active === "Mi impacto" && (
          <section className="page-section">
            <div className="section-intro"><div><p className="eyebrow">TU HUELLA POSITIVA</p><h2>Mi impacto</h2><p>Cada kilo recuperado transforma tu comunidad.</p></div></div>
            <div className="impact-hero">
              <div><span>Impacto acumulado</span><strong>82.5 kg</strong><p>de residuos recuperados desde abril</p></div>
              <div className="impact-ring"><span><Icon name="leaf" size={29} /></span><strong>34.8 kg</strong><small>CO₂ evitado</small></div>
            </div>
            <div className="impact-grid">
              <article className="panel material-chart"><div className="panel-heading"><div><h3>Material recuperado</h3><p>Distribución por tipo</p></div></div>{[["Cartón", 48, "#bd7a41"],["Plástico", 21, "#407fc1"],["Orgánico", 9, "#568c4d"],["Vidrio y metal", 4.5, "#3e9290"]].map(([name, value, color]) => <div className="bar-row" key={String(name)}><span>{name}</span><div><i style={{ width: `${Number(value) * 2}%`, background: String(color) }} /></div><strong>{value} kg</strong></div>)}</article>
              <article className="panel achievement"><span className="medal"><Icon name="spark" size={32} /></span><p className="eyebrow">NUEVO LOGRO</p><h3>¡Comercio circular!</h3><p>Completaste 7 recojos responsables y evitaste que más de 80 kg lleguen al botadero.</p><button onClick={() => announce("Logro compartido con tu comunidad.")}>Compartir mi logro</button></article>
            </div>
          </section>
        )}

        {role === "comercio" && active === "Aprende" && (
          <section className="page-section">
            <div className="section-intro"><div><p className="eyebrow">APRENDE EN 1 MINUTO</p><h2>Recicla mejor</h2><p>Consejos prácticos para separar tus residuos correctamente.</p></div></div>
            <div className="lesson-grid">
              {[["Limpia, seca y aplasta", "Prepara tus botellas y envases antes del recojo.", "bottle"],["Desarma tus cajas", "El cartón plegado ocupa menos espacio y se transporta mejor.", "box"],["Separa los orgánicos", "Evita mezclar restos de comida con materiales reciclables.", "apple"]].map(([title, text, icon], index) => <article className="lesson-card" key={title}><div className={`lesson-art art-${index}`}><Icon name={icon as IconName} size={42} /><span>0{index + 1}</span></div><div><p>GUÍA RÁPIDA · 1 MIN</p><h3>{title}</h3><span>{text}</span><button onClick={() => announce(`Abriendo guía: ${title}.`)}>Leer guía <Icon name="chevron" size={15} /></button></div></article>)}
            </div>
          </section>
        )}

        {role !== "comercio" && <RoleWorkspace role={role} active={active} requests={requests} announce={announce} />}
      </main>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {(role === "comercio" ? [["Inicio","home"],["Pedidos","truck"],["Recojo","plus"],["Impacto","chart"]] as [string,string][] : currentRole.nav.slice(0,4)).map(([label, icon]) => <button key={label} className={active === (label === "Impacto" ? "Mi impacto" : label) ? "active" : ""} onClick={() => role === "comercio" && label === "Recojo" ? setShowRequest(true) : setActive(label === "Impacto" ? "Mi impacto" : label)}><Icon name={icon as IconName}/><span>{label}</span></button>)}
      </nav>

      {showRequest && (
        <div className="modal-backdrop" onMouseDown={() => setShowRequest(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="request-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head"><div><p className="eyebrow">PASO {step} DE 2</p><h2 id="request-title">{step === 1 ? "¿Qué vamos a recoger?" : "Elige día y horario"}</h2></div><button className="icon-button" onClick={() => setShowRequest(false)} aria-label="Cerrar"><Icon name="close" /></button></div>
            <div className="modal-progress"><i className="active" /><i className={step === 2 ? "active" : ""} /></div>
            {step === 1 ? (
              <>
                <div className="select-materials">{materials.map((item) => <button key={item.id} className={material === item.name ? "selected" : ""} onClick={() => setMaterial(item.name)} style={{ "--mat": item.color, "--soft": item.soft } as React.CSSProperties}><span><Icon name={item.icon} /></span>{item.name}<i>{material === item.name && <Icon name="check" size={13} />}</i></button>)}</div>
                <label className="amount-label">Cantidad aproximada</label>
                <div className="amount-control"><button onClick={() => setKg(Math.max(1, kg - 1))}>−</button><div><strong>{kg}</strong><span>kg</span></div><button onClick={() => setKg(kg + 1)}>+</button></div>
                <button className="primary-button full" onClick={() => setStep(2)}>Continuar <Icon name="chevron" /></button>
              </>
            ) : (
              <>
                <div className="selected-summary"><span><Icon name="map" /></span><div><small>ZONA DE RECOJO</small><strong>Av. Ejército · Zona A</strong></div><button onClick={() => announce("Puedes cambiar la dirección desde tu perfil.")}>Cambiar</button></div>
                <div className="day-picker">{[["Mié","12"],["Vie","14"],["Lun","17"]].map(([day, date], index) => <button key={date} className={index === 0 ? "selected" : ""}><span>{day}</span><strong>{date}</strong><small>jun</small></button>)}</div>
                <label className="amount-label">Horarios disponibles</label>
                <div className="slot-picker">{["08:00 – 10:00","10:00 – 12:00","14:00 – 16:00"].map((time) => <button key={time} className={slot === time ? "selected" : ""} onClick={() => setSlot(time)}><Icon name="clock" size={16}/>{time}<span>{time === "14:00 – 16:00" ? "1 cupo" : "Disponible"}</span></button>)}</div>
                <div className="modal-actions"><button className="back-button" onClick={() => setStep(1)}>Atrás</button><button className="primary-button" onClick={submitRequest}>Confirmar recojo</button></div>
              </>
            )}
          </div>
        </div>
      )}
      {toast && <div className="toast" role="status"><Icon name="check" />{toast}</div>}
    </div>
  );
}

function Brand() {
  return <div className="brand"><span className="brand-mark"><Icon name="leaf" size={23} /></span><div><strong>KUSKA</strong><b>RECICLA</b><small>Reciclemos juntos</small></div></div>;
}

type AuthView = "login" | "register" | "recover";

function AuthScreen({ onEnter }: { onEnter: (role: Role) => void }) {
  const [view, setView] = useState<AuthView>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<Role>("comercio");
  const [message, setMessage] = useState("");

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (view === "recover") {
      setMessage("Te enviamos un enlace para recuperar tu contraseña.");
      return;
    }
    onEnter(accountType);
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
        <p className="auth-community"><span>1.2 t</span> de residuos recuperados junto a comercios de Santiago</p>
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand"><Brand /></div>
        <div className="auth-card">
          {view !== "recover" && (
            <div className="auth-tabs" role="tablist">
              <button className={view === "login" ? "active" : ""} onClick={() => { setView("login"); setMessage(""); }}>Iniciar sesión</button>
              <button className={view === "register" ? "active" : ""} onClick={() => { setView("register"); setMessage(""); }}>Crear cuenta</button>
            </div>
          )}

          <div className="auth-heading">
            {view === "login" && <><p className="eyebrow">QUÉ BUENO VERTE</p><h2>Bienvenido de nuevo</h2><span>Ingresa para gestionar tus recojos y ver tu impacto.</span></>}
            {view === "register" && <><p className="eyebrow">ÚNETE A KUSKA</p><h2>Crea tu cuenta</h2><span>Empieza a reciclar con tu comunidad en pocos pasos.</span></>}
            {view === "recover" && <><button className="auth-back" onClick={() => setView("login")}>‹ Volver al inicio</button><p className="eyebrow">RECUPERAR ACCESO</p><h2>¿Olvidaste tu contraseña?</h2><span>Escribe tu correo y te enviaremos instrucciones para recuperarla.</span></>}
          </div>

          {view !== "recover" && (
            <div className="account-types">
              {([
                ["comercio","Comerciante","Solicito recojos","home"],
                ["reciclador","Reciclador","Recojo materiales","truck"],
                ["empresa","Empresa","Recibo y valorizo","box"],
                ["municipio","Municipio","Superviso la operación","chart"],
              ] as [Role,string,string,IconName][]).map(([id,label,description,icon]) => <button type="button" key={id} className={accountType === id ? "selected" : ""} onClick={() => setAccountType(id)}><span><Icon name={icon} /></span><strong>{label}</strong><small>{description}</small><i>{accountType === id && <Icon name="check" size={12} />}</i></button>)}
            </div>
          )}

          <form className="auth-form" onSubmit={submit}>
            {view === "register" && (
              <div className="auth-row">
                <label><span>{accountType === "reciclador" ? "Nombre completo" : accountType === "municipio" ? "Municipalidad" : "Nombre de la organización"}</span><div><Icon name="home" size={18} /><input required placeholder={accountType === "comercio" ? "Ej. Bazar Ejército" : accountType === "reciclador" ? "Ej. Rosa Quispe" : accountType === "empresa" ? "Ej. Recicla Cusco SAC" : "Ej. Municipalidad de Santiago"} /></div></label>
                <label><span>Celular</span><div><Icon name="phone" size={18} /><input required inputMode="tel" placeholder="984 123 456" /></div></label>
              </div>
            )}
            <label><span>Correo electrónico</span><div><Icon name="mail" size={18} /><input required type="email" placeholder="nombre@correo.com" /></div></label>
            {view !== "recover" && (
              <label><span>Contraseña</span><div><Icon name="lock" size={18} /><input required minLength={6} type={showPassword ? "text" : "password"} placeholder={view === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}><Icon name="eye" size={18} /></button></div></label>
            )}
            {view === "login" && <div className="auth-options"><label><input type="checkbox" /> <span>Recordarme</span></label><button type="button" onClick={() => { setView("recover"); setMessage(""); }}>Olvidé mi contraseña</button></div>}
            {view === "register" && <label className="terms"><input type="checkbox" required /><span>Acepto los <button type="button">términos y condiciones</button> y la política de privacidad.</span></label>}
            {message && <div className="auth-success"><Icon name="check" />{message}</div>}
            <button className="auth-submit" type="submit">{view === "login" ? "Ingresar a mi cuenta" : view === "register" ? "Crear mi cuenta" : "Enviar instrucciones"} <Icon name="chevron" size={17} /></button>
          </form>

          {view === "login" && <div className="demo-access"><Icon name="spark" size={16} /><span><strong>¿Solo quieres explorar?</strong> Usa cualquier correo y contraseña para entrar a la demo.</span></div>}
          <p className="auth-help">¿Necesitas ayuda? <button onClick={() => setMessage("Escríbenos al 984 000 123. Estamos para ayudarte.")}>Contáctanos</button></p>
        </div>
      </section>
    </main>
  );
}

function RoleWorkspace({ role, active, requests, announce }: { role: Exclude<Role, "comercio">; active: string; requests: Request[]; announce: (message: string) => void }) {
  const content = {
    reciclador: {
      eyebrow: "RUTA DE HOY",
      title: active === "Inicio" ? "Tu jornada de recolección" : active,
      description: active === "Inicio" ? "Organiza tus recojos y registra cada entrega de forma sencilla." : "Consulta y gestiona la información de tu operación.",
      metrics: [["Recojos de hoy","4","2 completados","truck"],["Material estimado","43 kg","En 2 zonas","box"],["Ingresos del mes","S/ 486","+8% vs. mayo","chart"]],
    },
    empresa: {
      eyebrow: "CENTRO DE VALORIZACIÓN",
      title: active === "Inicio" ? "Recepciones y lotes" : active,
      description: active === "Inicio" ? "Controla el material recibido y mantén su trazabilidad." : "Consulta y gestiona la información de tu operación.",
      metrics: [["Por recibir hoy","128 kg","3 entregas","truck"],["Material valorizado","1.4 t","Este mes","leaf"],["Lotes activos","6","2 listos para salida","box"]],
    },
    municipio: {
      eyebrow: "OPERACIÓN DISTRITAL",
      title: active === "Inicio" ? "Santiago recicla" : active,
      description: active === "Inicio" ? "Supervisa cobertura, capacidad e impacto de toda la red." : "Indicadores actualizados de la operación distrital.",
      metrics: [["Material recuperado","1.2 t","+14% este mes","leaf"],["Recojos completados","186","92% a tiempo","truck"],["Actores activos","48","32 comercios","user"]],
    },
  }[role];

  return (
    <section className="page-section role-workspace">
      <div className="section-intro">
        <div><p className="eyebrow">{content.eyebrow}</p><h2>{content.title}</h2><p>{content.description}</p></div>
        <span className="live-badge"><i /> Datos actualizados</span>
      </div>
      <div className="role-stats">
        {content.metrics.map(([label,value,detail,icon]) => <article className="panel role-stat" key={label}><span><Icon name={icon as IconName} /></span><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div></article>)}
      </div>

      {role === "reciclador" && (
        <div className="role-grid">
          <article className="panel route-panel">
            <div className="panel-heading"><div><p className="eyebrow">SIGUIENTE PARADA</p><h3>Bazar Ejército</h3></div><span className="status assigned">10:00 – 12:00</span></div>
            <div className="route-stop"><span className="route-number">03</span><div><strong>Av. Ejército 1240</strong><small>12 kg de cartón · Pedido KR-0248</small></div><button onClick={() => announce("Ruta abierta en el mapa.")}><Icon name="map" /> Iniciar ruta</button></div>
            <div className="route-list">{["Abarrotes Inti · Completado","Bodega San José · Completado","Bazar Ejército · Siguiente","Mercado Santiago · 14:00"].map((item,index) => <div className={index < 2 ? "complete" : index === 2 ? "current" : ""} key={item}><i>{index < 2 ? <Icon name="check" size={11}/> : index + 1}</i><span>{item}</span></div>)}</div>
          </article>
          <article className="panel availability-card"><span><Icon name="clock" size={25}/></span><h3>Tu disponibilidad</h3><p>Hoy estás disponible hasta las 16:00 en la Zona A.</p><button onClick={() => announce("Horario disponible para editar.")}>Editar horario</button></article>
        </div>
      )}

      {role === "empresa" && (
        <div className="role-grid">
          <article className="panel role-table">
            <div className="panel-heading"><div><h3>Entregas esperadas</h3><p>Material en camino al centro</p></div><button className="text-button">Ver todas <Icon name="chevron" size={14}/></button></div>
            {[["Rosa Quispe","42 kg","Cartón","10:45"],["Mario Huamán","36 kg","Plástico","12:20"],["Asociación Kawsay","50 kg","Mixto","15:10"]].map(([name,kg,material,time]) => <div className="delivery-row" key={name}><span className="material-icon" style={{"--mat":"#bd7a41","--soft":"#f5e6d7"} as React.CSSProperties}><Icon name="box"/></span><div><strong>{name}</strong><small>{material}</small></div><b>{kg}</b><span>{time}</span><button onClick={() => announce(`Recepción de ${name} preparada.`)}>Recibir</button></div>)}
          </article>
          <article className="panel lot-card"><p className="eyebrow">LOTE DESTACADO</p><span><Icon name="box" size={31}/></span><h3>Cartón · LC-018</h3><strong>386 kg</strong><p>Al 77% de capacidad</p><div><i style={{width:"77%"}} /></div><button onClick={() => announce("Detalle del lote abierto.")}>Ver trazabilidad</button></article>
        </div>
      )}

      {role === "municipio" && (
        <div className="role-grid municipality">
          <article className="panel zone-panel">
            <div className="panel-heading"><div><h3>Cobertura por zona</h3><p>Recojos completados esta semana</p></div><span className="chart-key"><i /> Cobertura</span></div>
            {[["Zona A · Av. Ejército",92],["Zona B · Puente Santiago",76],["Zona C · Zarzuela",58],["Zona D · Margen derecha",41]].map(([zone,value]) => <div className="zone-row" key={String(zone)}><span>{zone}</span><div><i style={{width:`${value}%`}} /></div><strong>{value}%</strong></div>)}
          </article>
          <article className="panel network-card"><div className="panel-heading"><div><h3>Red activa</h3><p>Actores registrados</p></div></div>{[["Comercios","32","home"],["Recicladores","10","truck"],["Empresas","4","box"],["Municipios","2","map"]].map(([label,count,icon]) => <div key={label}><span><Icon name={icon as IconName}/></span><strong>{count}</strong><small>{label}</small></div>)}</article>
        </div>
      )}

      <article className="panel role-activity">
        <div className="panel-heading"><div><h3>{role === "reciclador" ? "Recojos recientes" : role === "empresa" ? "Trazabilidad reciente" : "Actividad de la red"}</h3><p>Últimos movimientos registrados</p></div></div>
        <RequestTable requests={requests} expanded={role === "municipio"} />
      </article>
    </section>
  );
}

function RequestTable({ requests, expanded = false }: { requests: Request[]; expanded?: boolean }) {
  return <div className="request-list">{requests.map((request) => {
    const mat = materials.find((item) => item.name === request.material) || materials[0];
    return <div className="request-row" key={request.id}>
      <span className="material-icon" style={{ "--mat": mat.color, "--soft": mat.soft } as React.CSSProperties}><Icon name={mat.icon} /></span>
      <div className="request-material"><strong>{request.kg} kg · {request.material}</strong><span>{request.id}</span></div>
      <div className="request-meta"><Icon name="calendar" size={15}/><span>{request.date}<small>{request.time}</small></span></div>
      {expanded && <div className="request-meta zone"><Icon name="map" size={15}/><span>{request.zone}<small>Zona A · Santiago</small></span></div>}
      <span className={`status ${request.status.toLowerCase()}`}>{request.status === "Entregado" && <Icon name="check" size={13}/>} {request.status}</span>
      <button className="row-action" aria-label={`Ver pedido ${request.id}`}><Icon name="chevron" /></button>
    </div>;
  })}</div>;
}

export default App;
