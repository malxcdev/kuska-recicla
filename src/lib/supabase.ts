import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Cliente de Supabase. Es `null` si faltan las variables de entorno: en ese caso la app
 * sigue funcionando en modo demo con los datos del navegador.
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
