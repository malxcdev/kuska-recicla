const LOCALE = "es-PE";

const weekdayFormat = new Intl.DateTimeFormat(LOCALE, { weekday: "short" });
const monthFormat = new Intl.DateTimeFormat(LOCALE, { month: "short" });
const monthLongFormat = new Intl.DateTimeFormat(LOCALE, { month: "long" });

const clean = (value: string) => value.replace(/\./g, "").trim();
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** Fecha local en formato YYYY-MM-DD (sin desfases de zona horaria). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function weekdayShort(iso: string): string {
  return capitalize(clean(weekdayFormat.format(parseISODate(iso))));
}

export function monthShort(iso: string): string {
  return clean(monthFormat.format(parseISODate(iso)));
}

export function monthName(date: Date): string {
  return capitalize(monthLongFormat.format(date));
}

export function dayNumber(iso: string): string {
  return String(parseISODate(iso).getDate());
}

/** "Hoy, 12 nov", "Mañana, 13 nov", "Ayer, 11 nov" o "Vie, 14 nov". */
export function formatRelativeDay(iso: string, today: Date = new Date()): string {
  const todayIso = toISODate(today);
  const tail = `${dayNumber(iso)} ${monthShort(iso)}`;
  if (iso === todayIso) return `Hoy, ${tail}`;
  if (iso === toISODate(addDays(today, 1))) return `Mañana, ${tail}`;
  if (iso === toISODate(addDays(today, -1))) return `Ayer, ${tail}`;
  return `${weekdayShort(iso)}, ${tail}`;
}

/** Próximos días con recojo a partir de mañana; los domingos no hay servicio. */
export function getPickupDays(today: Date, count = 3): string[] {
  const days: string[] = [];
  let cursor = addDays(today, 1);
  while (days.length < count) {
    if (cursor.getDay() !== 0) days.push(toISODate(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function monthKey(date: Date): string {
  return toISODate(date).slice(0, 7);
}

export function isInMonth(iso: string, reference: Date): boolean {
  return iso.slice(0, 7) === monthKey(reference);
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}
