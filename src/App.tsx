import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router";
import { AppLayout } from "@/app/AppLayout";
import { SECTIONS } from "@/app/sections";
import { SECTION_TITLES } from "@/data/catalog";
import { AuthPage } from "@/pages/auth/AuthPage";
import { useSession } from "@/state/contexts";
import { RequestFlowProvider } from "@/state/RequestFlowProvider";
import { RequestsProvider } from "@/state/RequestsProvider";
import { SessionProvider } from "@/state/SessionProvider";
import { ToastProvider } from "@/state/ToastProvider";
import type { SectionId } from "@/types";

const APP_NAME = "KUSKA Recicla";

function LoadingScreen() {
  return <div className="grid min-h-dvh place-items-center text-muted" role="status">Cargando…</div>;
}

/** Área privada: exige sesión y monta los datos de la red. */
function RequireSession({ children }: { children: ReactNode }) {
  const { ready, session, actor } = useSession();
  const location = useLocation();
  if (!ready) return <LoadingScreen />;
  if (!session || !actor) return <Navigate to="/ingresar" replace state={{ from: location.pathname }} />;
  return (
    <RequestsProvider>
      <RequestFlowProvider>{children}</RequestFlowProvider>
    </RequestsProvider>
  );
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { ready, session, actor } = useSession();
  const location = useLocation();
  if (!ready) return <LoadingScreen />;
  // Tras iniciar sesión o registrarse, vuelve a la página que se intentó abrir.
  const from = (location.state as { from?: string } | null)?.from ?? "/inicio";
  return session && actor ? <Navigate to={from} replace /> : children;
}

function SectionRoute() {
  const { session } = useSession();
  const { section } = useParams();
  const Screen = session ? SECTIONS[session.role][section as SectionId] : undefined;

  useEffect(() => {
    if (Screen) document.title = `${SECTION_TITLES[section as SectionId]} · ${APP_NAME}`;
  }, [Screen, section]);

  return Screen ? <Screen /> : <Navigate to="/inicio" replace />;
}

function AuthRoute({ mode, title }: { mode: "login" | "register" | "recover"; title: string }) {
  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
  }, [title]);
  return (
    <GuestOnly>
      <AuthPage mode={mode} />
    </GuestOnly>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <SessionProvider>
        <ToastProvider>
          <Routes>
            <Route path="/ingresar" element={<AuthRoute mode="login" title="Iniciar sesión" />} />
            <Route path="/registro" element={<AuthRoute mode="register" title="Crear cuenta" />} />
            <Route path="/recuperar" element={<AuthRoute mode="recover" title="Recuperar acceso" />} />
            <Route element={<RequireSession><AppLayout /></RequireSession>}>
              <Route path="/:section" element={<SectionRoute />} />
            </Route>
            <Route path="*" element={<Navigate to="/inicio" replace />} />
          </Routes>
        </ToastProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}
