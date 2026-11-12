/**
 * Siguiente código de pedido (KR-0001, KR-0002…). Toma el mayor número existente,
 * así nunca repite un código aunque se borren pedidos. Con Supabase, el código lo
 * generará la base de datos.
 */
export function nextRequestId(existing: { id: string }[]): string {
  const max = existing.reduce((highest, { id }) => {
    const value = Number.parseInt(id.replace(/^KR-/, ""), 10);
    return Number.isFinite(value) && value > highest ? value : highest;
  }, 0);
  return `KR-${String(max + 1).padStart(4, "0")}`;
}
