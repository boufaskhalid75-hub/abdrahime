-- =====================================================================
-- VOLAILLE MANAGER — 0003 : Views & reporting functions
-- All views use security_invoker so Row Level Security applies.
-- Accounting policy (see BUSINESS_RULES.md):
--   Chiffre d'affaires  = live (non-cancelled) invoices, by invoice date
--   CMV (COGS)          = stock cost of the invoiced order lines
--   Marge brute         = CA - CMV
--   Pertes de stock     = cost of 'damage_out' + net manual adjustments (out - in)
--   Résultat net estimé = Marge brute - Dépenses - Pertes de stock
--   Encaissements       = active customer payments, by payment date
--   Créances            = sum of live invoices minus their active allocations
-- =====================================================================

create or replace view public.v_invoice_balances with (security_invoker = true) as
select
  i.id, i.owner_id, i.invoice_number, i.order_id, i.delivery_id, i.customer_id,
  c.name as customer_name, i.invoice_date, i.status, i.total_amount,
  coalesce(a.paid_amount, 0)::numeric(14,2) as paid_amount,
  case when i.status = 'cancelled' then 0 else i.total_amount - coalesce(a.paid_amount, 0) end::numeric(14,2) as outstanding_amount,
  a.last_payment_date,
  ((now() at time zone 'Africa/Casablanca')::date - i.invoice_date) as age_days,
  i.paid_at, i.cancelled_at, i.cancel_reason, i.created_at
from public.invoices i
join public.customers c on c.id = i.customer_id
left join lateral (
  select sum(pa.amount) as paid_amount, max(p.payment_date) as last_payment_date
    from public.payment_allocations pa join public.payments p on p.id = pa.payment_id
   where pa.invoice_id = i.id and pa.is_active
) a on true;

create or replace view public.v_customer_balances with (security_invoker = true) as
select
  c.id, c.owner_id, c.name, c.contact_name, c.phone, c.address, c.is_active, c.created_at,
  coalesce(s.total_invoiced, 0)::numeric(14,2) as total_invoiced,
  coalesce(s.total_paid, 0)::numeric(14,2) as total_paid,
  coalesce(s.outstanding, 0)::numeric(14,2) as outstanding,
  coalesce(s.invoices_count, 0)::int as invoices_count,
  coalesce(s.unpaid_count, 0)::int as unpaid_count,
  s.oldest_unpaid_date,
  s.last_invoice_date,
  (select max(p.payment_date) from public.payments p where p.customer_id = c.id and p.status = 'active') as last_payment_date
from public.customers c
left join lateral (
  select sum(b.total_amount) filter (where b.status <> 'cancelled') as total_invoiced,
         sum(b.paid_amount) as total_paid,
         sum(b.outstanding_amount) as outstanding,
         count(*) filter (where b.status <> 'cancelled') as invoices_count,
         count(*) filter (where b.outstanding_amount > 0) as unpaid_count,
         min(b.invoice_date) filter (where b.outstanding_amount > 0) as oldest_unpaid_date,
         max(b.invoice_date) filter (where b.status <> 'cancelled') as last_invoice_date
    from public.v_invoice_balances b where b.customer_id = c.id
) s on true;

create or replace view public.v_product_stock with (security_invoker = true) as
select
  p.id, p.owner_id, p.name, p.reference, p.category, p.unit, p.is_active,
  p.purchase_price, p.sale_price, p.min_stock_kg, p.stock_kg, p.avg_cost,
  case when bs.valuation_method = 'FIFO'
       then coalesce((select round(sum(l.remaining_kg * l.unit_cost), 2) from public.stock_lots l
                       where l.product_id = p.id and l.remaining_kg > 0), 0)
       else round(p.stock_kg * p.avg_cost, 2) end::numeric(14,2) as stock_value,
  coalesce(m.purchased_kg, 0)::numeric(14,3) as purchased_kg,
  coalesce(m.sold_kg, 0)::numeric(14,3) as sold_kg,
  coalesce(m.damaged_kg, 0)::numeric(14,3) as damaged_kg,
  coalesce(m.adjusted_kg, 0)::numeric(14,3) as adjusted_kg,
  (p.stock_kg <= p.min_stock_kg and p.is_active) as is_low_stock
from public.products p
left join public.business_settings bs on bs.owner_id = p.owner_id
left join lateral (
  select
    sum(quantity_kg) filter (where movement_type in ('purchase_in', 'purchase_cancel')) as purchased_kg,
    -sum(quantity_kg) filter (where movement_type in ('sale_out', 'sale_return')) as sold_kg,
    -sum(quantity_kg) filter (where movement_type = 'damage_out') as damaged_kg,
    sum(quantity_kg) filter (where movement_type in ('adjustment_in', 'adjustment_out')) as adjusted_kg
  from public.stock_movements sm where sm.product_id = p.id
) m on true;

-- ---------------------------------------------------------------------
-- Period summary : the single source of truth for KPIs.
-- ---------------------------------------------------------------------
create or replace function public.period_summary(p_from date, p_to date)
returns jsonb language plpgsql stable security invoker set search_path = public, pg_temp as $$
declare
  v_owner uuid := auth.uid();
  r jsonb;
  v_revenue numeric; v_inv_count int; v_cogs numeric; v_expenses numeric; v_losses numeric;
  v_purchases numeric; v_purch_count int; v_purch_kg numeric;
  v_coll numeric; v_coll_cash numeric; v_coll_bank numeric; v_coll_other numeric; v_pay_count int;
  v_sales_count int; v_sales_kg numeric; v_deliv_count int;
  v_recv numeric; v_unpaid_count int; v_period_unpaid numeric; v_period_unpaid_count int;
  v_cash jsonb; v_cash_period jsonb;
  v_stock_kg numeric; v_stock_value numeric; v_low int;
begin
  if v_owner is null then raise exception 'VM:not_authenticated'; end if;

  select coalesce(sum(total_amount), 0), count(*) into v_revenue, v_inv_count
    from public.invoices where owner_id = v_owner and status <> 'cancelled' and invoice_date between p_from and p_to;

  select coalesce(sum(oi.cost_total), 0) into v_cogs
    from public.invoices i join public.order_items oi on oi.order_id = i.order_id
   where i.owner_id = v_owner and i.status <> 'cancelled' and i.invoice_date between p_from and p_to;

  select coalesce(sum(amount), 0) into v_expenses
    from public.expenses where owner_id = v_owner and status = 'active' and expense_date between p_from and p_to;

  select coalesce(-sum(total_cost), 0) into v_losses
    from public.stock_movements where owner_id = v_owner
     and movement_type in ('damage_out', 'adjustment_out', 'adjustment_in') and movement_date between p_from and p_to;

  select coalesce(sum(total_amount), 0), count(*) into v_purchases, v_purch_count
    from public.purchases where owner_id = v_owner and status = 'confirmed' and purchase_date between p_from and p_to;
  select coalesce(sum(pi.quantity_kg), 0) into v_purch_kg
    from public.purchase_items pi join public.purchases p on p.id = pi.purchase_id
   where p.owner_id = v_owner and p.status = 'confirmed' and p.purchase_date between p_from and p_to;

  select coalesce(sum(amount), 0),
         coalesce(sum(amount) filter (where method = 'cash'), 0),
         coalesce(sum(amount) filter (where method = 'bank_transfer'), 0),
         coalesce(sum(amount) filter (where method = 'other'), 0),
         count(*)
    into v_coll, v_coll_cash, v_coll_bank, v_coll_other, v_pay_count
    from public.payments where owner_id = v_owner and status = 'active' and payment_date between p_from and p_to;

  select count(*) into v_sales_count
    from public.orders where owner_id = v_owner and status <> 'cancelled' and order_date between p_from and p_to;
  select coalesce(sum(oi.quantity_kg), 0) into v_sales_kg
    from public.deliveries d join public.order_items oi on oi.order_id = d.order_id
   where d.owner_id = v_owner and d.status = 'delivered' and d.delivery_date between p_from and p_to;
  select count(*) into v_deliv_count
    from public.deliveries where owner_id = v_owner and status = 'delivered' and delivery_date between p_from and p_to;

  select coalesce(sum(outstanding_amount), 0), count(*) filter (where outstanding_amount > 0)
    into v_recv, v_unpaid_count
    from public.v_invoice_balances where owner_id = v_owner and status <> 'cancelled';
  select coalesce(sum(outstanding_amount), 0), count(*) filter (where outstanding_amount > 0)
    into v_period_unpaid, v_period_unpaid_count
    from public.v_invoice_balances where owner_id = v_owner and status <> 'cancelled' and invoice_date between p_from and p_to;

  select jsonb_object_agg(a.account, coalesce(b.balance, 0)) into v_cash
    from (values ('cash'), ('bank'), ('other')) a(account)
    left join (select account, sum(case when direction = 'in' then amount else -amount end) as balance
                 from public.cash_movements where owner_id = v_owner and movement_date <= p_to group by account) b
      on b.account = a.account;

  select jsonb_object_agg(a.account, jsonb_build_object('in', coalesce(b.cin, 0), 'out', coalesce(b.cout, 0))) into v_cash_period
    from (values ('cash'), ('bank'), ('other')) a(account)
    left join (select account,
                      sum(amount) filter (where direction = 'in') as cin,
                      sum(amount) filter (where direction = 'out') as cout
                 from public.cash_movements where owner_id = v_owner and movement_date between p_from and p_to group by account) b
      on b.account = a.account;

  select coalesce(sum(stock_kg), 0), coalesce(sum(stock_value), 0), count(*) filter (where is_low_stock)
    into v_stock_kg, v_stock_value, v_low
    from public.v_product_stock where owner_id = v_owner;

  r := jsonb_build_object(
    'from', p_from, 'to', p_to,
    'revenue', v_revenue, 'invoices_count', v_inv_count,
    'cogs', v_cogs, 'gross_margin', v_revenue - v_cogs,
    'expenses', v_expenses, 'stock_losses', v_losses,
    'net_result', v_revenue - v_cogs - v_expenses - v_losses,
    'purchases_total', v_purchases, 'purchases_count', v_purch_count, 'purchases_kg', v_purch_kg,
    'collections_total', v_coll, 'collections_cash', v_coll_cash, 'collections_bank', v_coll_bank,
    'collections_other', v_coll_other, 'payments_count', v_pay_count,
    'sales_count', v_sales_count, 'deliveries_count', v_deliv_count, 'delivered_kg', v_sales_kg,
    'receivables_total', v_recv, 'unpaid_invoices_count', v_unpaid_count,
    'period_unpaid_amount', v_period_unpaid, 'period_unpaid_count', v_period_unpaid_count,
    'cash_balance', v_cash, 'cash_period', v_cash_period,
    'stock_kg', v_stock_kg, 'stock_value', v_stock_value, 'low_stock_count', v_low
  );
  return r;
end $$;

-- Time series for charts and periodic reports.
create or replace function public.sales_series(p_from date, p_to date, p_granularity text default 'day')
returns table (period_start date, revenue numeric, cogs numeric, gross_margin numeric, expenses numeric,
               stock_losses numeric, net_result numeric, collections numeric, purchases numeric, invoices_count int)
language sql stable security invoker set search_path = public, pg_temp as $$
  with g as (
    select case when p_granularity in ('week', 'month') then p_granularity else 'day' end as unit
  ),
  periods as (
    select generate_series(date_trunc((select unit from g), p_from::timestamp),
                           date_trunc((select unit from g), p_to::timestamp),
                           ('1 ' || (select unit from g))::interval)::date as period_start
  ),
  inv as (
    select date_trunc((select unit from g), i.invoice_date::timestamp)::date as ps,
           sum(i.total_amount) as revenue, count(*) as n,
           sum((select coalesce(sum(oi.cost_total), 0) from public.order_items oi where oi.order_id = i.order_id)) as cogs
      from public.invoices i
     where i.owner_id = auth.uid() and i.status <> 'cancelled' and i.invoice_date between p_from and p_to
     group by 1
  ),
  exp as (
    select date_trunc((select unit from g), expense_date::timestamp)::date as ps, sum(amount) as amount
      from public.expenses where owner_id = auth.uid() and status = 'active' and expense_date between p_from and p_to group by 1
  ),
  loss as (
    select date_trunc((select unit from g), movement_date::timestamp)::date as ps, -sum(total_cost) as amount
      from public.stock_movements where owner_id = auth.uid()
       and movement_type in ('damage_out', 'adjustment_out', 'adjustment_in') and movement_date between p_from and p_to group by 1
  ),
  pay as (
    select date_trunc((select unit from g), payment_date::timestamp)::date as ps, sum(amount) as amount
      from public.payments where owner_id = auth.uid() and status = 'active' and payment_date between p_from and p_to group by 1
  ),
  pur as (
    select date_trunc((select unit from g), purchase_date::timestamp)::date as ps, sum(total_amount) as amount
      from public.purchases where owner_id = auth.uid() and status = 'confirmed' and purchase_date between p_from and p_to group by 1
  )
  select p.period_start,
         coalesce(inv.revenue, 0), coalesce(inv.cogs, 0), coalesce(inv.revenue, 0) - coalesce(inv.cogs, 0),
         coalesce(exp.amount, 0), coalesce(loss.amount, 0),
         coalesce(inv.revenue, 0) - coalesce(inv.cogs, 0) - coalesce(exp.amount, 0) - coalesce(loss.amount, 0),
         coalesce(pay.amount, 0), coalesce(pur.amount, 0), coalesce(inv.n, 0)::int
    from periods p
    left join inv on inv.ps = p.period_start
    left join exp on exp.ps = p.period_start
    left join loss on loss.ps = p.period_start
    left join pay on pay.ps = p.period_start
    left join pur on pur.ps = p.period_start
   order by p.period_start
$$;

create or replace function public.product_performance(p_from date, p_to date)
returns table (product_id uuid, product_name text, quantity_kg numeric, revenue numeric, cogs numeric,
               gross_margin numeric, purchased_kg numeric, purchased_amount numeric)
language sql stable security invoker set search_path = public, pg_temp as $$
  select p.id, p.name,
         coalesce(s.qty, 0), coalesce(s.revenue, 0), coalesce(s.cogs, 0), coalesce(s.revenue, 0) - coalesce(s.cogs, 0),
         coalesce(b.qty, 0), coalesce(b.amount, 0)
    from public.products p
    left join (
      select oi.product_id, sum(oi.quantity_kg) as qty, sum(oi.line_total) as revenue, sum(oi.cost_total) as cogs
        from public.invoices i join public.order_items oi on oi.order_id = i.order_id
       where i.owner_id = auth.uid() and i.status <> 'cancelled' and i.invoice_date between p_from and p_to
       group by oi.product_id
    ) s on s.product_id = p.id
    left join (
      select pi.product_id, sum(pi.quantity_kg) as qty, sum(pi.line_total) as amount
        from public.purchases pu join public.purchase_items pi on pi.purchase_id = pu.id
       where pu.owner_id = auth.uid() and pu.status = 'confirmed' and pu.purchase_date between p_from and p_to
       group by pi.product_id
    ) b on b.product_id = p.id
   where p.owner_id = auth.uid()
   order by coalesce(s.revenue, 0) desc, p.name
$$;

-- Note: order-level discounts are attributed to revenue at invoice level;
-- product_performance uses line totals (before discount).
create or replace function public.customer_performance(p_from date, p_to date)
returns table (customer_id uuid, customer_name text, invoices_count int, quantity_kg numeric, revenue numeric,
               cogs numeric, gross_margin numeric, collected numeric, outstanding numeric, last_invoice_date date)
language sql stable security invoker set search_path = public, pg_temp as $$
  with inv as (
    select i.id, i.customer_id, i.total_amount, i.order_id
      from public.invoices i
     where i.owner_id = auth.uid() and i.status <> 'cancelled' and i.invoice_date between p_from and p_to
  ),
  rev as (select customer_id, count(*) as n, sum(total_amount) as revenue from inv group by customer_id),
  lines as (
    select inv.customer_id, sum(oi.quantity_kg) as qty, sum(oi.cost_total) as cogs
      from inv join public.order_items oi on oi.order_id = inv.order_id group by inv.customer_id
  ),
  pay as (
    select customer_id, sum(amount) as amount from public.payments
     where owner_id = auth.uid() and status = 'active' and payment_date between p_from and p_to group by customer_id
  )
  select c.id, c.name, coalesce(rev.n, 0)::int, coalesce(lines.qty, 0), coalesce(rev.revenue, 0), coalesce(lines.cogs, 0),
         coalesce(rev.revenue, 0) - coalesce(lines.cogs, 0), coalesce(pay.amount, 0), cb.outstanding, cb.last_invoice_date
    from public.customers c
    join public.v_customer_balances cb on cb.id = c.id
    left join rev on rev.customer_id = c.id
    left join lines on lines.customer_id = c.id
    left join pay on pay.customer_id = c.id
   where c.owner_id = auth.uid()
   order by coalesce(rev.revenue, 0) desc, c.name
$$;

create or replace function public.supplier_performance(p_from date, p_to date)
returns table (supplier_id uuid, supplier_name text, purchases_count int, quantity_kg numeric, amount numeric,
               unpaid_amount numeric, last_purchase_date date)
language sql stable security invoker set search_path = public, pg_temp as $$
  with pur as (
    select pu.id, pu.supplier_id, pu.total_amount from public.purchases pu
     where pu.owner_id = auth.uid() and pu.status = 'confirmed' and pu.purchase_date between p_from and p_to
  ),
  agg as (select supplier_id, count(*) as n, sum(total_amount) as amount from pur group by supplier_id),
  qty as (
    select pur.supplier_id, sum(pi.quantity_kg) as qty from pur join public.purchase_items pi on pi.purchase_id = pur.id
     group by pur.supplier_id
  )
  select s.id, s.name, coalesce(agg.n, 0)::int, coalesce(qty.qty, 0), coalesce(agg.amount, 0),
         coalesce((select sum(total_amount) from public.purchases pu
                    where pu.supplier_id = s.id and pu.status = 'confirmed' and pu.payment_status = 'unpaid'), 0),
         (select max(purchase_date) from public.purchases pu where pu.supplier_id = s.id and pu.status = 'confirmed')
    from public.suppliers s
    left join agg on agg.supplier_id = s.id
    left join qty on qty.supplier_id = s.id
   where s.owner_id = auth.uid()
   order by coalesce(agg.amount, 0) desc, s.name
$$;

create or replace function public.save_daily_closing(p_date date, p_notes text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_owner uuid := app_private.require_owner();
  v_id uuid;
  v_snap jsonb := public.period_summary(p_date, p_date);
begin
  insert into public.daily_closings (owner_id, closing_date, snapshot, notes)
  values (v_owner, p_date, v_snap, nullif(btrim(p_notes), ''))
  on conflict (owner_id, closing_date) do update set snapshot = excluded.snapshot, notes = excluded.notes, closed_at = now()
  returning id into v_id;
  perform app_private.log(v_owner, 'close_day', 'daily_closing', v_id, jsonb_build_object('date', p_date));
  return v_id;
end $$;
