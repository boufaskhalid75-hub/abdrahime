import type { Metadata } from "next";
import { CreditCard } from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Pager } from "@/components/shared/pager";
import { PeriodFilter } from "@/components/shared/period-filter";
import { FilterTabs } from "@/components/shared/filter-tabs";
import { NewExpenseDialog, CancelExpenseButton } from "./expense-dialogs";
import { pageRange } from "@/lib/query";
import { resolvePeriod, today } from "@/lib/dates";
import { categoryLabel } from "@/lib/labels";

export const metadata: Metadata = { title: "Dépenses" };
type SP = { page?: string; period?: string; from?: string; to?: string; category?: string };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const period = resolvePeriod(sp, "thisMonth");
  const { page, from, to } = pageRange(sp.page);
  const { data: cats } = await supabase.from("expense_categories").select("*").order("created_at");
  const categories = cats ?? [];
  let q = supabase.from("expenses").select("*, expense_categories(code, name)", { count: "exact" })
    .gte("expense_date", period.from).lte("expense_date", period.to)
    .order("expense_date", { ascending: false }).order("created_at", { ascending: false }).range(from, to);
  if (sp.category) q = q.eq("category_id", sp.category);
  const [{ data: rows, count }, { data: all }] = await Promise.all([
    q,
    supabase.from("expenses").select("amount, category_id").eq("status", "active").gte("expense_date", period.from).lte("expense_date", period.to),
  ]);
  const byCat = new Map<string, number>();
  (all ?? []).forEach((e) => byCat.set(e.category_id, (byCat.get(e.category_id) ?? 0) + Number(e.amount)));
  const total = [...byCat.values()].reduce((a, b) => a + b, 0);
  const activeCats = categories.filter((c) => c.is_active).map((c) => ({ id: c.id, label: categoryLabel(c, t) }));

  return (
    <>
      <PageHeader title={t.expenses.title} subtitle={t.expenses.subtitle} actions={<NewExpenseDialog categories={activeCats} today={today()} />} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PeriodFilter preset={period.preset} from={period.from} to={period.to} />
        <FilterTabs basePath="/expenses" param="category" current={sp.category ?? ""} searchParams={sp}
          items={[{ value: "", label: t.common.all }, ...categories.map((c) => ({ value: c.id, label: categoryLabel(c, t) }))]} />
      </div>
      <div className="grid gap-6 xl:grid-cols-4">
        <Card className="xl:col-span-3">
          {rows?.length ? (
            <>
              <Table>
                <THead><TR><TH>{t.common.date}</TH><TH>{t.expenses.category}</TH><TH>{t.common.description}</TH><TH>{t.common.method}</TH><TH className="text-end">{t.common.amount}</TH><TH>{t.common.status}</TH><TH /></TR></THead>
                <TBody>
                  {rows.map((e) => (
                    <TR key={e.id} className={e.status === "cancelled" ? "opacity-60" : undefined}>
                      <TD>{f.date(e.expense_date)}</TD>
                      <TD>{categoryLabel(e.expense_categories as { code: string | null; name: string }, t)}</TD>
                      <TD className="max-w-72"><p className="truncate">{e.description}</p>{e.cancel_reason && <p className="truncate text-xs text-muted">{e.cancel_reason}</p>}</TD>
                      <TD>{t.methods[e.payment_method as "cash"]}</TD>
                      <TD className="num text-end font-medium">{f.money(e.amount)}</TD>
                      <TD><Badge tone={e.status === "active" ? "success" : "neutral"}>{t.expenses.status[e.status as "active"]}</Badge></TD>
                      <TD className="text-end">{e.status === "active" && <CancelExpenseButton id={e.id} />}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              <Pager page={page} count={count ?? 0} basePath="/expenses" searchParams={sp} t={t} />
            </>
          ) : <EmptyState icon={CreditCard} title={t.expenses.emptyTitle} text={t.expenses.emptyText} />}
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.expenses.byCategory}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {categories.filter((c) => byCat.has(c.id)).map((c) => (
              <div key={c.id}>
                <div className="flex justify-between"><span>{categoryLabel(c, t)}</span><span className="num ltr">{f.money(byCat.get(c.id))}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-bg"><div className="h-1.5 rounded-full bg-brand" style={{ width: `${total ? ((byCat.get(c.id) ?? 0) / total) * 100 : 0}%` }} /></div>
              </div>
            ))}
            <div className="flex justify-between border-t border-line pt-3 font-semibold"><span>{t.common.total}</span><span className="num ltr">{f.money(total)}</span></div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
