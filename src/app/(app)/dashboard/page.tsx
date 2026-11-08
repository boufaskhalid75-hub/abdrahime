import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle, Coins, FileText, HandCoins, Plus, Receipt, ShoppingCart, TrendingUp, Truck, Users, Wallet, CreditCard, Scale,
} from "lucide-react";
import { getContext } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PeriodFilter } from "@/components/shared/period-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { InvoiceStatus, MovementBadge, OrderStatus, PurchaseStatus } from "@/components/shared/status-badge";
import { ColumnChart, RankedBars, TrendChart } from "@/components/charts/charts";
import { Badge } from "@/components/ui/badge";
import { addMonths, resolvePeriod, startOfMonth, today } from "@/lib/dates";

export const metadata: Metadata = { title: "Tableau de bord" };
type SP = { period?: string; from?: string; to?: string };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { supabase, t, f } = await getContext();
  const sp = await searchParams;
  const p = resolvePeriod(sp, "today");
  const now = today();
  const yearFrom = addMonths(startOfMonth(now), -11);
  // For the trend chart, a single-day period still shows the last 14 days for context.
  const trendFrom = p.from === p.to ? new Date(Date.parse(`${p.to}T12:00:00Z`) - 13 * 864e5).toISOString().slice(0, 10) : p.from;

  const [
    { data: s }, { data: daily }, { data: monthly }, { data: prod }, { data: cust },
    { count: nCustomers }, { count: nSuppliers }, { data: lowStock },
    { data: rPurch }, { data: rSales }, { data: rPay }, { data: rInv }, { data: rMov },
  ] = await Promise.all([
    supabase.rpc("period_summary", { p_from: p.from, p_to: p.to }),
    supabase.rpc("sales_series", { p_from: trendFrom, p_to: p.to, p_granularity: "day" }),
    supabase.rpc("sales_series", { p_from: yearFrom, p_to: now, p_granularity: "month" }),
    supabase.rpc("product_performance", { p_from: p.from, p_to: p.to }),
    supabase.rpc("customer_performance", { p_from: p.from, p_to: p.to }),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("v_product_stock").select("id, name, stock_kg, min_stock_kg").eq("is_low_stock", true).limit(6),
    supabase.from("purchases").select("id, reference, purchase_date, total_amount, status, payment_status, suppliers(name)").order("created_at", { ascending: false }).limit(5),
    supabase.from("orders").select("id, reference, order_date, total_amount, status, customers(name)").order("created_at", { ascending: false }).limit(5),
    supabase.from("payments").select("id, reference, payment_date, paid_at, amount, method, status, customers(name)").order("paid_at", { ascending: false }).limit(5),
    supabase.from("invoices").select("id, invoice_number, invoice_date, total_amount, status, customers(name)").order("created_at", { ascending: false }).limit(5),
    supabase.from("stock_movements").select("id, movement_type, movement_date, quantity_kg, products(name)").order("created_at", { ascending: false }).limit(6),
  ]);

  const isEmpty = !rPurch?.length && !rSales?.length && (nCustomers ?? 0) === 0;
  const name = (x: unknown) => (x as { name?: string } | null)?.name ?? "";

  return (
    <>
      <PageHeader title={t.dashboard.title} subtitle={t.dashboard.subtitle}
        actions={<>
          <PeriodFilter preset={p.preset} from={p.from} to={p.to} />
          <Button asChild variant="secondary"><Link href="/purchases/new"><ShoppingCart />{t.dashboard.quickPurchase}</Link></Button>
          <Button asChild><Link href="/sales/new"><Plus />{t.dashboard.quickSale}</Link></Button>
          <Button asChild variant="success"><Link href="/payments/new"><HandCoins />{t.dashboard.quickPayment}</Link></Button>
        </>} />

      {isEmpty && (
        <Card className="mb-6">
          <EmptyState icon={TrendingUp} title={t.dashboard.emptyTitle} text={t.dashboard.emptyText}
            action={<div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="secondary"><Link href="/products">{t.products.new}</Link></Button>
              <Button asChild variant="secondary"><Link href="/suppliers">{t.suppliers.new}</Link></Button>
              <Button asChild variant="secondary"><Link href="/customers">{t.customers.new}</Link></Button>
            </div>} />
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label={t.dashboard.revenue} value={f.money(s?.revenue)} icon={Receipt} hint={`${f.int(s?.invoices_count)} ${t.dashboard.invoices.toLowerCase()}`} />
        <StatCard label={t.dashboard.collections} value={f.money(s?.collections_total)} icon={Wallet} tone="success" hint={`${f.int(s?.payments_count)} ${t.common.count.toLowerCase()}`} />
        <StatCard label={t.dashboard.receivables} value={f.money(s?.receivables_total)} icon={HandCoins} tone={Number(s?.receivables_total) > 0 ? "warning" : "success"}
          hint={`${f.int(s?.unpaid_invoices_count)} ${t.dashboard.unpaidInvoices.toLowerCase()}`} />
        <StatCard label={t.dashboard.purchases} value={f.money(s?.purchases_total)} icon={ShoppingCart} tone="navy" hint={f.kg(s?.purchases_kg)} />
        <StatCard label={t.dashboard.grossMargin} value={f.money(s?.gross_margin)} icon={TrendingUp} tone="success"
          hint={`${t.dashboard.cogs}: ${f.money(s?.cogs)}`} />
        <StatCard label={t.dashboard.expenses} value={f.money(s?.expenses)} icon={CreditCard} tone="danger"
          hint={Number(s?.stock_losses) ? `${t.dashboard.stockLosses}: ${f.money(s?.stock_losses)}` : undefined} />
        <StatCard label={t.dashboard.netResult} value={f.money(s?.net_result)} icon={Scale} tone={Number(s?.net_result) < 0 ? "danger" : "success"}
          valueClassName={Number(s?.net_result) < 0 ? "text-danger" : undefined} />
        <StatCard label={t.dashboard.stockValue} value={f.money(s?.stock_value)} icon={Coins} tone="brand" hint={f.kg(s?.stock_kg)} />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label={t.dashboard.customers} value={f.int(nCustomers)} icon={Users} tone="navy" />
        <StatCard label={t.dashboard.suppliers} value={f.int(nSuppliers)} icon={Truck} tone="navy" />
        <StatCard label={t.dashboard.sales} value={f.int(s?.sales_count)} icon={Receipt} tone="navy" hint={`${f.int(s?.deliveries_count)} ${t.nav.deliveries.toLowerCase()}`} />
        <StatCard label={t.dashboard.unpaidInvoices} value={f.int(s?.unpaid_invoices_count)} icon={FileText} tone={Number(s?.unpaid_invoices_count) ? "warning" : "success"} />
        <StatCard label={t.dashboard.lowStock} value={f.int(s?.low_stock_count)} icon={AlertTriangle} tone={Number(s?.low_stock_count) ? "warning" : "success"} />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>{t.dashboard.dailySales}</CardTitle></CardHeader>
          <CardContent>
            <TrendChart data={daily ?? []} xKey="period_start"
              series={[{ key: "revenue", label: t.dashboard.revenue }, { key: "collections", label: t.dashboard.collections }]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.dashboard.salesByProduct}</CardTitle></CardHeader>
          <CardContent><RankedBars data={prod ?? []} labelKey="product_name" valueKey="revenue" label={t.dashboard.salesByProduct} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.dashboard.monthlyRevenue}</CardTitle></CardHeader>
          <CardContent><ColumnChart data={monthly ?? []} xKey="period_start" yKey="revenue" label={t.dashboard.revenue} xFormat="month" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.dashboard.profitEvolution}</CardTitle></CardHeader>
          <CardContent>
            <TrendChart kind="line" data={monthly ?? []} xKey="period_start" xFormat="month"
              series={[{ key: "gross_margin", label: t.dashboard.margin }, { key: "net_result", label: t.dashboard.netResult }]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.dashboard.customerActivity}</CardTitle></CardHeader>
          <CardContent><RankedBars data={(cust ?? []).slice(0, 8)} labelKey="customer_name" valueKey="revenue" label={t.dashboard.customerActivity} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
        <Recent title={t.dashboard.recentSales} href="/sales" empty={t.common.noResults} items={(rSales ?? []).map((o) => ({
          id: o.id, href: `/sales/${o.id}`, ref: o.reference, sub: `${name(o.customers)} · ${f.date(o.order_date)}`, amount: f.money(o.total_amount), badge: <OrderStatus status={o.status} t={t} />,
        }))} />
        <Recent title={t.dashboard.recentInvoices} href="/invoices" empty={t.common.noResults} items={(rInv ?? []).map((i) => ({
          id: i.id, href: `/invoices/${i.id}`, ref: i.invoice_number, sub: `${name(i.customers)} · ${f.date(i.invoice_date)}`, amount: f.money(i.total_amount), badge: <InvoiceStatus status={i.status} t={t} />,
        }))} />
        <Recent title={t.dashboard.recentPayments} href="/payments" empty={t.common.noResults} items={(rPay ?? []).map((x) => ({
          id: x.id, href: `/payments/${x.id}`, ref: x.reference, sub: `${name(x.customers)} · ${f.dateTime(x.paid_at)} · ${t.methods[x.method as "cash"]}`, amount: f.money(x.amount),
          badge: x.status === "active" ? undefined : <Badge>{t.payments.status.reversed}</Badge>,
        }))} />
        <Recent title={t.dashboard.recentPurchases} href="/purchases" empty={t.common.noResults} items={(rPurch ?? []).map((x) => ({
          id: x.id, href: `/purchases/${x.id}`, ref: x.reference, sub: `${name(x.suppliers)} · ${f.date(x.purchase_date)}`, amount: f.money(x.total_amount),
          badge: <PurchaseStatus status={x.status} paymentStatus={x.payment_status} t={t} />,
        }))} />
        <Recent title={t.dashboard.recentMovements} href="/stock" empty={t.common.noResults} items={(rMov ?? []).map((m) => ({
          id: m.id, href: "/stock", ref: name(m.products), sub: f.date(m.movement_date),
          amount: `${Number(m.quantity_kg) > 0 ? "+" : ""}${f.kg(m.quantity_kg)}`, badge: <MovementBadge type={m.movement_type} t={t} />,
        }))} />
        <Recent title={t.dashboard.lowStock} href="/stock" empty={t.common.noResults} items={(lowStock ?? []).map((x) => ({
          id: x.id, href: `/products/${x.id}`, ref: x.name, sub: `${t.stock.minStock}: ${f.kg(x.min_stock_kg)}`, amount: f.kg(x.stock_kg), badge: <Badge tone="warning">{t.products.lowStock}</Badge>,
        }))} />
      </div>
    </>
  );
}

function Recent({ title, href, items, empty }: {
  title: string; href: string; empty: string;
  items: { id: string; href: string; ref: string; sub: string; amount: string; badge?: React.ReactNode }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <Link href={href} className="text-xs font-medium text-brand hover:underline">→</Link>
      </CardHeader>
      <ul className="divide-y divide-line">
        {items.length === 0 && <li className="px-5 py-6 text-center text-sm text-muted">{empty}</li>}
        {items.map((it) => (
          <li key={it.id}>
            <Link href={it.href} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-bg/60">
              <div className="min-w-0">
                <p className="ltr truncate text-sm font-medium">{it.ref}</p>
                <p className="truncate text-xs text-muted">{it.sub}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {it.badge}
                <span className="num ltr text-sm font-medium">{it.amount}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
