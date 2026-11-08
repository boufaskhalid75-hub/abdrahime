import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { Column, Report } from "@/lib/data/reports";
import type { Formatters } from "@/lib/format";
import { cn } from "@/lib/utils";

export function formatCell(c: Column, v: unknown, f: Formatters) {
  if (v === null || v === undefined || v === "") return "—";
  switch (c.type) {
    case "money": return f.money(v);
    case "kg": return f.kg(v);
    case "int": return f.int(v);
    case "pct": return f.pct(v);
    case "date": return f.date(String(v));
    default: return String(v);
  }
}

export function ReportTable({ report, f, totalLabel }: { report: Report; f: Formatters; totalLabel: string }) {
  const num = (c: Column) => c.type !== "text" && c.type !== "date";
  return (
    <Table>
      <THead><TR>{report.columns.map((c) => <TH key={c.key} className={cn(num(c) && "text-end")}>{c.label}</TH>)}</TR></THead>
      <TBody>
        {report.rows.map((r, i) => (
          <TR key={i}>
            {report.columns.map((c) => (
              <TD key={c.key} className={cn(num(c) && "num text-end", c.key === "net_result" && Number(r[c.key]) < 0 && "text-danger")}>{formatCell(c, r[c.key], f)}</TD>
            ))}
          </TR>
        ))}
        {report.totals && report.rows.length > 0 && (
          <TR className="bg-bg/60 font-semibold">
            {report.columns.map((c, i) => (
              <TD key={c.key} className={cn(num(c) && "num text-end")}>
                {i === 0 ? totalLabel : report.totals![c.key] !== undefined ? formatCell(c, report.totals![c.key], f) : ""}
              </TD>
            ))}
          </TR>
        )}
      </TBody>
    </Table>
  );
}
