import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { translateError, type ActionResult } from "@/lib/errors";

/** Call a database RPC as the signed-in owner and translate errors. */
export async function callRpc<T>(fn: string, args: Record<string, unknown>, revalidate: string[] = []): Promise<ActionResult<T>> {
  const supabase = await createClient();
  const { t } = await getI18n();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: t.errors.not_authenticated };
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (!/VM:/.test(error.message)) console.error(`[rpc:${fn}]`, error.code, error.message);
    return { ok: false, error: translateError(error, t) };
  }
  revalidate.forEach((p) => revalidatePath(p, "layout"));
  return { ok: true, data: data as T };
}

export async function validationError(): Promise<ActionResult<never>> {
  const { t } = await getI18n();
  return { ok: false, error: t.errors.validation };
}
