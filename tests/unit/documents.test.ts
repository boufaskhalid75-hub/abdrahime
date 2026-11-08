import { describe, expect, it } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { InvoicePdf, ReportPdf } from "@/lib/pdf/documents";
import { makeFormatters } from "@/lib/format";
import { fr } from "@/lib/i18n/fr";
import { ar } from "@/lib/i18n/ar";

const f = makeFormatters("fr", fr);

describe("PDF documents", () => {
  it("renders an invoice PDF", async () => {
    const doc = createElement(InvoicePdf, {
      b: { business_name: "Entreprise Test", city: "Casablanca" }, number: "FAC-2026-00001", date: "02/11/2026", status: "Non payée",
      customer: { name: "Boucherie Test" }, items: [["Produit A", "12,345", "26,00", "320,97"]],
      subtotal: "320,97 DH", discount: null, total: "320,97 DH", paid: "0,00 DH", due: "320,97 DH", cancelled: null, footer: "Merci",
    });
    const buf = await renderToBuffer(doc as unknown as ReactElement<DocumentProps>);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(1000);
  });
  it("renders a multi-page report PDF", async () => {
    const rows = Array.from({ length: 120 }, (_, i) => [`Ligne ${i}`, "1", "2,00"]);
    const doc = createElement(ReportPdf, { b: {}, title: "RAPPORT", subtitle: "x", cols: [{ label: "A", width: 50 }, { label: "B", width: 25 }, { label: "C", width: 25, align: "right" }], rows, total: ["Total", "", "240,00"] });
    const buf = await renderToBuffer(doc as unknown as ReactElement<DocumentProps>);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("formatting (Moroccan conventions)", () => {
  it("formats money, kg and dates in French", () => {
    expect(f.money(1234.5)).toBe("1.234,50 DH"); // CLDR fr-MA grouping
    expect(f.kg(12.345)).toBe("12,345 kg");
    expect(f.date("2026-11-02")).toBe("02/11/2026");
  });
  it("uses Latin digits and Arabic currency label in Arabic", () => {
    const fa = makeFormatters("ar", ar);
    const m = fa.money(1500);
    expect(m).toMatch(/1.?500[.,]00/);
    expect(m).toContain("درهم");
    expect(/[٠-٩]/.test(m)).toBe(false);
  });
});
