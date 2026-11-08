import type { Metadata } from "next";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { PeriodFilter } from "@/components/shared/period-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { ReportTable } from "@/components/shared/report-table";
import { TrendChart } from "@/components/charts/charts";
import { buildReport, REPORT_TABS, type ReportTab } from "@/lib/data/reports";
import { resolvePeriod } from "@/lib/dates";

export const metadata: Metadata = { title: "Rapports" };
type SP = { tab?: string; g?: string; period?: string; from?: string; to?: string };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const tab = ((REPORT_TABS as readonly string[]).includes(sp.tab ?? "") ? sp.tab : "sales") as ReportTab;
  const g = (["day", "week", "month"].includes(sp.g ?? "") ? sp.g : "day") as "day" | "week" | "month";
  const period = resolvePeriod(sp, "thisMonth");
  const report = await buildReport(supabase, t, tab, period.from, period.to, g);
  const qs = new URLSearchParams({ tab, g, from: period.from, to: period.to }).toString();
  const series = tab === "sales"
    ? [{ key: "revenue", label: t.dashboard.revenue }, { key: "collections", label: t.dashboard.collections }]
    : [{ key: "gross_margin", label: t.dashboard.margin }, { key: "net_result", label: t.dashboard.netResult }];

  return (
    <>
      <PageHeader title={t.reports.title} subtitle={t.reports.subtitle}
        actions={<>
          <Button asChild variant="secondary"><a href={`/api/export/report?${qs}&format=xlsx`}><FileSpreadsheet />{t.common.exportExcel}</a></Button>
          <Button asChild variant="secondary"><a href={`/api/export/report?${qs}&format=pdf`}><FileDown />{t.common.exportPdf}</a></Button>
        </>} />
      <div className="mb-4 overflow-x-auto">
        <FilterTabs basePath="/reports" param="tab" current={tab} searchParams={sp} items={REPORT_TABS.map((x) => ({ value: x, label: t.reports.tabs[x] }))} />
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PeriodFilter preset={period.preset} from={period.from} to={period.to} />
        {(tab === "sales" || tab === "profitability") && (
          <FilterTabs basePath="/reports" param="g" current={g} searchParams={sp}
            items={(["day", "week", "month"] as const).map((x) => ({ value: x, label: t.reports.granularity[x] }))} />
        )}
      </div>
      {(tab === "sales" || tab === "profitability") && (
        <Card className="mb-6"><CardContent>
          <TrendChart kind={tab === "sales" ? "area" : "line"} data={report.rows as Record<string, number | string>[]} xKey="period_start"
            xFormat={g === "month" ? "month" : "short"} series={series} />
        </CardContent></Card>
      )}
      <Card>
        {report.rows.length ? <ReportTable report={report} f={f} totalLabel={t.common.total} /> : <EmptyState title={t.dashboard.noData} />}
      </Card>
    </>
  );
}
