-- =====================================================================
-- VOLAILLE MANAGER — 0004 : Security (grants + Row Level Security)
-- Principle: deny by default.
--   * anon        : no access to anything.
--   * authenticated: read own rows; write only master data directly;
--                    every financial/stock write goes through RPC functions.
-- =====================================================================

-- 1. Remove the broad default grants Supabase gives on the public schema.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on schema app_private from public, anon, authenticated;
revoke all on all functions in schema app_private from public, anon, authenticated;

-- Future objects created in public should not be exposed automatically.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke execute on functions from public;

-- 2. Enable RLS on every table.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- 3. Read policies (owner only).
do $$
declare t text;
begin
  foreach t in array array['business_settings','document_sequences','products','product_price_history','suppliers',
                           'customers','customer_product_prices','purchases','purchase_items','stock_lots',
                           'stock_movements','stock_lot_allocations','orders','order_items','deliveries','invoices',
                           'invoice_items','payments','payment_allocations','expense_categories','expenses',
                           'cash_movements','daily_closings','audit_logs']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (owner_id = (select auth.uid()))',
                   t || '_select_own', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

create policy profiles_select_own on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
grant select on public.profiles to authenticated;
grant update (full_name, phone, locale) on public.profiles to authenticated;

-- 4. Direct writes on master data (no DELETE: archive with is_active instead).
create policy products_insert_own on public.products for insert to authenticated with check (owner_id = (select auth.uid()));
create policy products_update_own on public.products for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
-- stock_kg and avg_cost are intentionally NOT writable by clients.
grant insert (name, reference, category, unit, purchase_price, sale_price, min_stock_kg, description, is_active)
  on public.products to authenticated;
grant update (name, reference, category, purchase_price, sale_price, min_stock_kg, description, is_active)
  on public.products to authenticated;

create policy suppliers_insert_own on public.suppliers for insert to authenticated with check (owner_id = (select auth.uid()));
create policy suppliers_update_own on public.suppliers for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
grant insert (name, contact_name, phone, address, email, notes, is_active) on public.suppliers to authenticated;
grant update (name, contact_name, phone, address, email, notes, is_active) on public.suppliers to authenticated;

create policy customers_insert_own on public.customers for insert to authenticated with check (owner_id = (select auth.uid()));
create policy customers_update_own on public.customers for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
grant insert (name, contact_name, phone, address, notes, is_active) on public.customers to authenticated;
grant update (name, contact_name, phone, address, notes, is_active) on public.customers to authenticated;

-- Customer specific prices are preferences (not financial records): deletable.
create policy cpp_insert_own on public.customer_product_prices for insert to authenticated
  with check (owner_id = (select auth.uid())
              and exists (select 1 from public.customers c where c.id = customer_id and c.owner_id = (select auth.uid()))
              and exists (select 1 from public.products p where p.id = product_id and p.owner_id = (select auth.uid())));
create policy cpp_update_own on public.customer_product_prices for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy cpp_delete_own on public.customer_product_prices for delete to authenticated using (owner_id = (select auth.uid()));
grant insert (customer_id, product_id, sale_price) on public.customer_product_prices to authenticated;
grant update (sale_price) on public.customer_product_prices to authenticated;
grant delete on public.customer_product_prices to authenticated;

create policy categories_insert_own on public.expense_categories for insert to authenticated with check (owner_id = (select auth.uid()));
create policy categories_update_own on public.expense_categories for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
grant insert (name, is_active) on public.expense_categories to authenticated;
grant update (name, is_active) on public.expense_categories to authenticated;

create policy settings_update_own on public.business_settings for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
-- valuation_method is NOT directly writable (use set_valuation_method, which enforces the lock).
grant update (business_name, address, city, phone, email, ice, rc, if_number, patente, logo_url, invoice_footer,
              invoice_prefix, order_prefix, purchase_prefix, payment_prefix, auto_invoice_on_delivery,
              default_purchase_paid, low_stock_alerts)
  on public.business_settings to authenticated;

-- 5. Views (security_invoker => RLS of underlying tables applies).
grant select on public.v_invoice_balances, public.v_customer_balances, public.v_product_stock to authenticated;

-- 6. RPC functions callable by the authenticated owner.
grant execute on function
  public.ensure_owner_setup(),
  public.create_purchase(uuid, date, jsonb, text, boolean, text, boolean, text),
  public.pay_purchase(uuid, text, date),
  public.cancel_purchase(uuid, text),
  public.adjust_stock(uuid, text, numeric, date, text, numeric),
  public.set_valuation_method(text),
  public.create_order(uuid, date, jsonb, numeric, text, boolean, text),
  public.update_order(uuid, date, jsonb, numeric, text),
  public.cancel_order(uuid, text),
  public.confirm_delivery(uuid, date, text),
  public.issue_invoice(uuid),
  public.cancel_delivery(uuid, text),
  public.cancel_invoice(uuid, text),
  public.record_payment(uuid, uuid[], numeric, text, date, text, text, text),
  public.reverse_payment(uuid, text),
  public.create_expense(uuid, date, numeric, text, text, text),
  public.cancel_expense(uuid, text),
  public.record_cash_movement(date, text, text, numeric, text, text),
  public.period_summary(date, date),
  public.sales_series(date, date, text),
  public.product_performance(date, date),
  public.customer_performance(date, date),
  public.supplier_performance(date, date),
  public.save_daily_closing(date, text)
to authenticated;

-- Security-invoker report functions call auth.uid() and read views; they need usage only.
