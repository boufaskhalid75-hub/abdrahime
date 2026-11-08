import { createElement } from "react";
import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { ReportPdf } from "@/lib/pdf/documents";
import { pdfResponse, pdfSafe, routeContext, unauthorized } from "@/lib/api";
import { buildReport, REPORT_TABS, type ReportTab } from "@/lib/data/reports";
import { formatCell } from "@/components/shared/report-table";
import { isIsoDate } from "@/lib/dates";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tab = sp.get("tab") as ReportTab;
  const from = sp.get("from");
  const to = sp.get("to");
  const g = (["day", "week", "month"].includes(sp.get("g") ?? "") ? sp.get("g") : "day") as "day" | "week" | "month";
  if (!(REPORT_TABS as readonly string[]).includes(tab) || !isIsoDate(from) || !isIsoDate(to)) {
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  }
  const { supabase, user, t, f } = await routeContext();
  if (!user) return unauthorized();
  const report = await buildReport(supabase, t, tab, from, to, g);
  const name = `rapport-${tab}-${from}_${to}`;

  if (sp.get("format") === "pdf") {
    const { data: settings } = await supabase.from("business_settings").select("*").maybeSingle();
    const w = Math.floor(100 / report.columns.length);
    const doc = createElement(ReportPdf, {
      b: settings ?? {}, title: report.title.toUpperCase(), subtitle: `${f.date(from)} — ${f.date(to)}`,
      cols: report.columns.map((c) => ({ label: c.label, width: w, align: c.type === "text" || c.type === "date" ? undefined : "right" as const })),
      rows: report.rows.map((r) => report.columns.map((c) => pdfSafe(formatCell(c, r[c.key], f)))),
      total: report.totals ? report.columns.map((c, i) => (i === 0 ? t.common.total : report.totals![c.key] !== undefined ? pdfSafe(formatCell(c, report.totals![c.key], f)) : "")) : undefined,
    });
    return pdfResponse(doc, `${name}.pdf`);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Volaille Manager";
  const ws = wb.addWorksheet(report.title.slice(0, 31));
  ws.addRow([`${report.title} — ${from} → ${to}`]).font = { bold: true, size: 13 };
  ws.addRow([]);
  const header = ws.addRow(report.columns.map((c) => c.label));
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF17324D" } }; });
  for (const r of report.rows) {
    ws.addRow(report.columns.map((c) => {
      const v = r[c.key];
      if (v === null || v === undefined) return null;
      if (c.type === "date") return new Date(`${v}T12:00:00Z`);
      return c.type === "text" ? String(v) : Number(v);
    }));
  }
  if (report.totals) {
    const tr = ws.addRow(report.columns.map((c, i) => (i === 0 ? t.common.total : report.totals![c.key] ?? null)));
    tr.font = { bold: true };
  }
  report.columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = c.type === "text" ? 28 : 16;
    col.numFmt = c.type === "money" ? "#,##0.00" : c.type === "kg" ? "#,##0.000" : c.type === "pct" ? "0.0%" : c.type === "date" ? "dd/mm/yyyy" : "";
  });
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
