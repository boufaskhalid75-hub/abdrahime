import "server-only";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { fr } from "@/lib/i18n/fr";
import { makeFormatters } from "@/lib/format";

/** Authenticated Supabase client for route handlers (401 if not signed in). */
export async function routeContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  // Documents (PDF/Excel) are produced in French — the standard language of Moroccan business paperwork.
  return { supabase, user: data.user, t: fr, f: makeFormatters("fr", fr) };
}

export const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
export const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });

export async function pdfResponse(doc: ReactElement, filename: string) {
  const buf = await renderToBuffer(doc as ReactElement<DocumentProps>);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Plain-ASCII-safe number for PDFs (Helvetica lacks the narrow no-break space used by fr-MA). */
export const pdfSafe = (s: string) => s.replace(/[  ]/g, " ");
