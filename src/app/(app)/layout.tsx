import { getContext } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await getContext();
  let { data: settings } = await supabase.from("business_settings").select("business_name").maybeSingle();
  if (!settings) {
    await supabase.rpc("ensure_owner_setup");
    ({ data: settings } = await supabase.from("business_settings").select("business_name").maybeSingle());
  }
  return (
    <AppShell userEmail={user.email ?? ""} businessName={settings?.business_name ?? "Volaille Manager"}>
      {children}
    </AppShell>
  );
}
