import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { makeFormatters } from "@/lib/format";

/**
 * Per-request context for server components and actions.
 * Verifies the user with Supabase Auth (server-side) and redirects to /login otherwise.
 * Authorization is ultimately enforced by Row Level Security in the database.
 */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  const { locale, t } = await getI18n();
  return { supabase, user: data.user, locale, t, f: makeFormatters(locale, t) };
});

export type AppContext = Awaited<ReturnType<typeof getContext>>;
