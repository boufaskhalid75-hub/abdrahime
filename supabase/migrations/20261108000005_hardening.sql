-- =====================================================================
-- VOLAILLE MANAGER — 0005 : Hardening after Supabase advisors review
-- 1. Pin search_path on every internal helper (advisor 0011).
--    pg_temp stays last so the engine's session temp tables still resolve.
-- 2. Cover the foreign keys used by lookups/reversals with indexes (advisor 0001).
-- No behaviour change.
-- =====================================================================

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'app_private'
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('alter function %s set search_path = public, pg_temp', f.sig);
  end loop;
end $$;

create index if not exists cash_movements_payment_idx        on public.cash_movements (payment_id) where payment_id is not null;
create index if not exists cash_movements_expense_idx        on public.cash_movements (expense_id) where expense_id is not null;
create index if not exists cash_movements_purchase_idx       on public.cash_movements (purchase_id) where purchase_id is not null;
create index if not exists stock_movements_delivery_idx      on public.stock_movements (delivery_id) where delivery_id is not null;
create index if not exists stock_movements_order_item_idx    on public.stock_movements (order_item_id) where order_item_id is not null;
create index if not exists stock_movements_purchase_idx      on public.stock_movements (purchase_id) where purchase_id is not null;
create index if not exists stock_lots_purchase_item_idx      on public.stock_lots (purchase_item_id) where purchase_item_id is not null;
create index if not exists stock_lot_allocations_lot_idx     on public.stock_lot_allocations (lot_id);
create index if not exists invoices_delivery_idx             on public.invoices (delivery_id) where delivery_id is not null;
create index if not exists expenses_category_idx             on public.expenses (category_id);
create index if not exists deliveries_customer_idx           on public.deliveries (customer_id);
create index if not exists customer_product_prices_product_idx on public.customer_product_prices (product_id);
create index if not exists invoice_items_product_idx         on public.invoice_items (product_id);
