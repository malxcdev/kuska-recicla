import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { actorsRepo, authRepo, type SignInInput, type SignUpInput } from "@/data/repositories";
import { SessionContext, type SessionValue } from "./contexts";
import type { Actor, Session } from "@/types";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => authRepo.getSession());
  const [actors, setActors] = useState<Actor[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    actorsRepo.list().then((list) => {
      if (!active) return;
      setActors(list);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const actorsById = useMemo(() => new Map(actors.map((actor) => [actor.id, actor])), [actors]);
  const actor = session ? (actorsById.get(session.actorId) ?? null) : null;

  const signIn = useCallback(async (input: SignInInput) => {
    setSession(await authRepo.signIn(input));
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const { session: created } = await authRepo.signUp(input);
    setActors(await actorsRepo.list());
    setSession(created);
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
