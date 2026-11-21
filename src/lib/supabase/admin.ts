import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a service role: ignora o RLS. Só pode rodar no servidor
 * (o import de "server-only" faz o build falhar se vazar para o client) e
 * toda consulta deve filtrar pela conta da sessão.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
