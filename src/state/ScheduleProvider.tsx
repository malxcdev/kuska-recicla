import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultZoneSchedule } from "@/data/catalog";
import { scheduleRepo } from "@/data/repositories";
import { ScheduleStateContext, type ScheduleValue } from "./contexts";
import type { CollectorAvailability, CollectorTimeOff, ServiceClosure, ZoneSchedule } from "@/types";

interface ScheduleData {
  schedules: ZoneSchedule[];
  closures: ServiceClosure[];
  availability: CollectorAvailability[];
  timeOff: CollectorTimeOff[];
}

async function loadAll(): Promise<ScheduleData> {
  const [schedules, closures, availability, timeOff] = await Promise.all([
    scheduleRepo.listZoneSchedules(),
    scheduleRepo.listClosures(),
    scheduleRepo.listAvailability(),
    scheduleRepo.listTimeOff(),
  ]);
  return { schedules, closures, availability, timeOff };
}

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ScheduleData | null>(null);

  useEffect(() => {
    let active = true;
    loadAll().then((loaded) => active && setData(loaded));
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => setData(await loadAll()), []);

  const value = useMemo<ScheduleValue | null>(() => {
    if (!data) return null;
    return {
      ...data,
      scheduleFor: (zone) => data.schedules.find((s) => s.zone === zone) ?? defaultZoneSchedule(zone),
      saveZoneSchedule: async (schedule) => { await scheduleRepo.saveZoneSchedule(schedule); await refresh(); },
      addClosure: async (closure) => { await scheduleRepo.addClosure(closure); await refresh(); },
      removeClosure: async (id) => { await scheduleRepo.removeClosure(id); await refresh(); },
      saveAvailability: async (entry) => { await scheduleRepo.saveAvailability(entry); await refresh(); },
      addTimeOff: async (entry) => { await scheduleRepo.addTimeOff(entry); await refresh(); },
      removeTimeOff: async (id) => { await scheduleRepo.removeTimeOff(id); await refresh(); },
      reset: async () => { await scheduleRepo.reset(); await refresh(); },
    };
  }, [data, refresh]);

  // Web Storage responde al instante; no hace falta una pantalla de carga.
  if (!value) return null;
  return <ScheduleStateContext.Provider value={value}>{children}</ScheduleStateContext.Provider>;
}
