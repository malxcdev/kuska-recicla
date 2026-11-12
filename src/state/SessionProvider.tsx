import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { actorsRepo, authRepo, type SignInInput, type SignUpInput } from "@/data/repositories";
import { SessionContext, type SessionValue } from "./contexts";
import type { Actor, Session } from "@/types";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [actors, setActors] = useState<Actor[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const loadActors = async () => {
      try {
        const list = await actorsRepo.list();
        if (active) setActors(list);
      } catch {
        if (active) setActors([]);
      }
    };

    // Restaurar la sesión es asíncrono: con Supabase hay que validar el token guardado.
    const hydrate = async () => {
      try {
        const current = await authRepo.getSession();
        if (!active) return;
        setSession(current);
        if (current) await loadActors();
      } catch {
        if (active) setSession(null);
      } finally {
        if (active) setReady(true);
      }
    };

    void hydrate();

    // Cierre de sesión en otra pestaña, token vencido sin refresco, etc.
    const unsubscribe = authRepo.onSessionChange((next) => {
      if (!active) return;
      setSession(next);
      if (next) void loadActors();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const actorsById = useMemo(() => new Map(actors.map((actor) => [actor.id, actor])), [actors]);
  const actor = session ? (actorsById.get(session.actorId) ?? null) : null;

  const signIn = useCallback(async (input: SignInInput) => {
    const created = await authRepo.signIn(input);
    setSession(created);
    try {
      setActors(await actorsRepo.list());
    } catch {
      // El perfil ya llegó con la sesión; la lista completa puede esperar.
    }
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const { session: created } = await authRepo.signUp(input);
    // Con confirmación de correo pendiente no hay sesión todavía.
    if (created) setSession(created);
    try {
      setActors(await actorsRepo.list());
    } catch {
      // Sin sesión, RLS no deja listar perfiles: se recarga al ingresar.
    }
  }, []);

  const signOut = useCallback(async () => {
    await authRepo.signOut();
    setSession(null);
  }, []);

  const updateProfile = useCallback<SessionValue["updateProfile"]>(
    async (patch) => {
      if (!session) return;
      const updated = await actorsRepo.update(session.actorId, patch);
      setActors((current) => current.map((a) => (a.id === updated.id ? updated : a)));
    },
    [session],
  );

  const value = useMemo<SessionValue>(
    () => ({ ready, session, actor, actors, actorsById, signIn, signUp, signOut, updateProfile }),
    [ready, session, actor, actors, actorsById, signIn, signUp, signOut, updateProfile],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
