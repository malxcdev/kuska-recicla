// Comprueba la conexión con Supabase y que el esquema esté aplicado.
// Uso: pnpm supabase:check   (lee .env y .env.local)
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("✗ Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
  console.error("  Copia .env.example como .env.local y completa los datos del proyecto.");
  process.exit(1);
}

const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
console.log(`Conectando con ${new URL(url).host}…`);

// Tablas del esquema (supabase/migrations/20261112000000_kuska_init.sql).
const TABLES = [
  "profiles",
  "pickup_requests",
  "lots",
  "zone_schedules",
  "service_closures",
  "collector_availability",
  "collector_time_off",
];

let failures = 0;

for (const table of TABLES) {
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });

  if (error) {
    console.error(`✗ ${table}: ${error.message}`);
    failures += 1;
    continue;
  }

  // Sin sesión, las políticas RLS no deben mostrar ninguna fila.
  if (count && count > 0) {
    console.error(`✗ ${table}: un visitante sin sesión ve ${count} fila(s). Revisa las políticas RLS.`);
    failures += 1;
    continue;
  }

  console.log(`✓ ${table}: existe y está protegida por RLS.`);
}

if (failures > 0) {
  console.error("\nRevisa que el SQL se haya ejecutado completo en el SQL Editor de Supabase.");
  process.exit(1);
}

const { error: authError } = await supabase.auth.getSession();
if (authError) {
  console.error(`✗ Autenticación: ${authError.message}`);
  process.exit(1);
}

console.log("\n✓ Todo listo: la app puede conectarse a Supabase.");
