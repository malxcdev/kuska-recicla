// Comprueba la conexión con Supabase usando las variables de .env.
// Uso: pnpm supabase:check
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("✗ Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env (copia .env.example).");
  process.exit(1);
}

const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
console.log(`Conectando con ${new URL(url).host}…`);

// 1. La tabla "zones" debe existir (sin sesión no se ven filas por las reglas de acceso, y está bien).
const zones = await supabase.from("zones").select("id", { count: "exact", head: true });
if (zones.error) {
  console.error(`✗ No se pudo leer la tabla "zones": ${zones.error.message}`);
  console.error("  ¿Ejecutaste supabase/migrations/20261112000000_kuska_inicial.sql en el SQL Editor?");
  process.exit(1);
}
console.log('✓ La base responde y la tabla "zones" existe.');

// 2. Las funciones de reserva deben existir y estar cerradas para visitantes sin sesión.
const booking = await supabase.rpc("book_pickup", { p_material: "carton", p_kg: 1, p_date: "2030-01-01", p_slot_id: "08-10" });
if (booking.error?.code === "PGRST202") {
  console.error("✗ No existe la función book_pickup: el SQL no se ejecutó completo.");
  process.exit(1);
}
if (!booking.error) {
  console.error("✗ book_pickup respondió sin sesión: revisa los permisos (la sección 5 del SQL).");
  process.exit(1);
}
console.log("✓ Las funciones de reserva existen y no se pueden usar sin iniciar sesión.");
console.log("\nTodo listo: la app puede conectarse a Supabase.");
