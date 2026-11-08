import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl font-bold text-navy">404</p>
      <p className="mt-3 font-medium">{t.errors.notFoundTitle}</p>
      <p className="mt-1 text-sm text-muted">{t.errors.notFoundText}</p>
      <Link href="/dashboard" className="mt-5 text-sm font-medium text-brand hover:underline">{t.nav.dashboard}</Link>
    </div>
  );
}
