import type { Metadata } from "next";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm, PasswordForm } from "./profile-forms";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const { supabase, user, t, f } = await getContext();
  const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (
    <>
      <PageHeader title={t.profile.title} subtitle={t.profile.subtitle} />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader><CardTitle>{t.profile.account}</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><span className="text-muted">{t.common.email}: </span><span className="ltr">{user.email}</span></p>
            <p><span className="text-muted">{t.common.createdAt}: </span>{f.dateTime(user.created_at)}</p>
            {user.last_sign_in_at && <p className="text-muted">{f.dateTime(user.last_sign_in_at)}</p>}
          </CardContent>
        </Card>
        <Card><CardContent><ProfileForm fullName={p?.full_name ?? ""} phone={p?.phone ?? ""} /></CardContent></Card>
        <Card><CardHeader><CardTitle>{t.profile.changePassword}</CardTitle></CardHeader><CardContent><PasswordForm /></CardContent></Card>
      </div>
    </>
  );
}
