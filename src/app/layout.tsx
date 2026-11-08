import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/noto-sans-arabic/400.css";
import "@fontsource/noto-sans-arabic/500.css";
import "@fontsource/noto-sans-arabic/600.css";
import "@fontsource/noto-sans-arabic/700.css";
import "./globals.css";
import { Toaster } from "sonner";
import { getI18n } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";

export const metadata: Metadata = {
  title: { default: "Volaille Manager", template: "%s · Volaille Manager" },
  description: "Gestion de distribution de volaille — achats, stock, ventes, factures, encaissements.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#17324D", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getI18n();
  return (
    <html lang={locale} dir={t.meta.dir}>
      <body className="min-h-dvh">
        <I18nProvider locale={locale}>
          {children}
          <Toaster position={t.meta.dir === "rtl" ? "top-left" : "top-right"} richColors closeButton dir={t.meta.dir as "ltr" | "rtl"} />
        </I18nProvider>
      </body>
    </html>
  );
}
